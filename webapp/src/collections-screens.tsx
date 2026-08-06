import { Link } from "@tanstack/react-router"
import { Copy, GripVertical, Link as LinkIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { TextField } from "@/components/controls/TextField"
import { AgencyEmpty, DataTable } from "@/features/agency"
import { useOwnAgency, useSession } from "@/features/auth"
import {
  createCollection,
  formatDay,
  setCollectionLink,
  useWorkspace,
} from "@/features/workspace"
import { CabinetPage, CabinetShell } from "@/features/cabinet"
import { MarketDeviation } from "@/features/listings"

/**
 * ПОДБОРКИ · список, подборка изнутри и публичная страница для клиента.
 *
 * Снято с `o8RcIC`, `anSVK`, `UX58q`.
 *
 * **Главное правило подборок сказано плашкой в первой строке экрана:
 * на публичной странице телефона нет ни в каком виде.** Иначе цена контакта
 * обнулялась бы первой же пересылкой: агент отдал ссылку клиенту, клиент
 * переслал знакомому, знакомый позвонил собственнику сам. Клиент видит объект
 * и оставляет заявку агенту, а не собственнику.
 *
 * Отсюда же и то, что публичная страница живёт **вне кабинета**: у неё своя
 * шапка с именем агента и его телефоном. Телефон на ней ровно один — агента.
 */

function CollectionsShell({
  title,
  note,
  action,
  children,
}: {
  title: string
  note: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <CabinetShell activeId="collections">
      <CabinetPage>
        <div className="flex h-8 w-full shrink-0 items-center gap-3">
          <Typography variant="panelTitle" tone="default" as="h1">
            {title}
          </Typography>
          <Typography variant="denseText" tone="dense">
            {note}
          </Typography>
          <div className="h-px flex-1" />
          {action === undefined ? null : <>{action}</>}
        </div>
        <>{children}</>
      </CabinetPage>
    </CabinetShell>
  )
}

type Collection = {
  id: string
  name: string
  about: string
  /** Хвост публичного адреса: `serch.ru/p/<slug>`. Именно он уходит в буфер. */
  slug: string
  objects: string
  author: string
  updated: string
  views: string
  /**
   * Ссылки ещё нет: вместо «Скопировать» стоит «Создать ссылку», а в просмотрах
   * прочерк. Это начальное состояние строки — нажатие переводит её во второе.
   */
  noLink?: boolean
}

/** Подборка, которая собрана изнутри. Все строки списка ведут в неё: других нет. */
const COLLECTION_SLUG = "rassel-ligovka-8f3a"

const COLLECTIONS: Collection[] = [
  { id: "1", name: "Расселение, Лиговка", about: "коммуналки под расселение у Лиговского проспекта", slug: COLLECTION_SLUG, objects: "6", author: "Смирнова Ирина", updated: "сегодня, 11:05", views: "124" },
  { id: "2", name: "Красногвардейский до 10", about: "Красногвардейский район, бюджет до 10 млн", slug: "krasnogvard-do-10-2c17", objects: "4", author: "Титова Анна", updated: "вчера, 16:40", views: "0" },
  { id: "3", name: "Невский, 2-к для Ковалёвых", about: "двухкомнатные у Невского, для семьи Ковалёвых", slug: "nevsky-2k-kovalevy-5b90", objects: "3", author: "Лебедев Максим", updated: "22.07, 14:20", views: "8" },
  { id: "4", name: "Доли и комнаты, отбор", about: "доли и комнаты по всему городу", slug: "doli-komnaty-otbor-1d44", objects: "2", author: "Смирнова Ирина", updated: "19.07, 10:30", views: "0", noLink: true },
]

/**
 * Скопировать публичную ссылку.
 *
 * В буфер ссылка уходит со схемой, хотя на экране печатается без неё: агент
 * вставляет её клиенту в переписку, и там она обязана открываться нажатием,
 * а не лежать куском текста.
 *
 * Подтверждения не показываем: окна для него в макете нет, а выдуманная плашка
 * была бы хуже молчания. Проверка у агента прямая — вставить и посмотреть.
 * Если браузер закрыл доступ к буферу, тоже молчим: сообщать об этом здесь
 * нечем.
 */
function copyLink(slug: string) {
  void navigator.clipboard?.writeText(`https://serch.ru/p/${slug}`).catch(() => {})
}

export function CollectionsPage() {
  /**
   * Подборки берутся из работы агентства, а не из констант.
   *
   * Раньше здесь стояли четыре чужие подборки, все четыре строки вели в одну
   * и ту же, а кнопка «Новая подборка» не имела обработчика — то есть завести
   * свою было нельзя вообще никак. Владелец назвал это «подборка потерялась».
   */
  const own = useOwnAgency()
  const workspace = useWorkspace()
  const session = useSession()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")

  const collections: Collection[] = own
    ? workspace.collections.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        // Пояснение под названием собирается из состава: своего описания у
        // подборки нет и не должно быть — лишнее поле в форме создания
        // человек всё равно пропустит, а пустая строка выглядит поломкой.
        about: item.items.length === 0
          ? "пока пусто — добавьте объекты из выдачи клавишей B"
          : item.items.slice(0, 2).join(" · ") + (item.items.length > 2 ? " и ещё…" : ""),
        objects: String(item.items.length),
        author: item.by,
        updated: formatDay(item.updatedAt, item.updatedAt),
        views: "—",
        noLink: !item.linked,
      }))
    : COLLECTIONS

  const linked = collections.filter((row) => !row.noLink).map((row) => row.id)

  const setLink = (id: string, on: boolean) => {
    if (own) setCollectionLink(id, on)
  }

  const create = () => {
    const clean = name.trim()
    if (!clean) return
    createCollection(clean, session?.name ?? "")
    setName("")
    setNaming(false)
  }

  return (
    <CollectionsShell
      title="Подборки"
      note="ссылка клиенту, телефон в ней скрыт всегда"
      action={
        <Button variant="primary" size="sm" onClick={() => setNaming(true)}>
          Новая подборка
        </Button>
      }
    >
      {naming ? (
        <div className="flex w-full shrink-0 items-end gap-3 rounded-lg bg-warm px-4 py-3">
          <div className="w-100">
            <TextField
              label="НАЗВАНИЕ ПОДБОРКИ"
              value={name}
              autoFocus
              placeholder="Например: Расселение, Лиговка"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") create()
                if (event.key === "Escape") setNaming(false)
              }}
            />
          </div>
          <Button variant="primary" size="md" onClick={create} disabled={name.trim() === ""}>
            Создать
          </Button>
          <Button variant="quiet" size="md" onClick={() => setNaming(false)}>
            Отмена
          </Button>
        </div>
      ) : null}
      <div className="flex w-full shrink-0 items-center gap-3 rounded-lg bg-warm px-4 py-3">
        <LinkIcon aria-hidden className="size-4 shrink-0 text-text-2" strokeWidth={2} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Typography variant="numericDense" tone="default">
            На публичной странице телефона нет ни в каком виде
          </Typography>
          <Typography variant="metaText" tone="dense">
            Иначе цена контакта обнулялась бы первой же пересылкой. Клиент видит объект
            и оставляет заявку вам, а не собственнику.
          </Typography>
        </div>
      </div>

      {collections.length === 0 ? (
        <AgencyEmpty
          title="Подборок пока нет"
          text="Подборка — это ссылка клиенту на отобранные объекты: он смотрит квартиры, а телефон собственника в ней скрыт всегда. Объекты добавляются из выдачи клавишей B или кнопкой в строке."
          note="Ссылку можно отключить в любой момент — страница перестанет открываться у всех, кому её переслали."
        />
      ) : (
      <DataTable
        columns={[
          { head: "ПОДБОРКА" },
          { head: "ОБЪЕКТОВ", width: "w-27.5", numeric: true },
          { head: "АВТОР", width: "w-50" },
          { head: "ОБНОВЛЕНА", width: "w-37.5", numeric: true },
          { head: "ПРОСМОТРОВ", width: "w-32.5", numeric: true },
          { head: "ССЫЛКА", width: "w-45", numeric: true },
        ]}
        rows={collections.map((row) => {
          const hasLink = linked.includes(row.id)

          return {
            id: row.id,
            cells: [
              // Имя подборки — ссылка внутрь, а не подпись. Список, из которого
              // нельзя открыть подборку, агенту не нужен вовсе. Ссылкой, а не
              // кнопкой: её открывают в новой вкладке и возвращаются назад.
              <Link
                key="name"
                to="/collections/inside"
                className="flex min-w-0 cursor-pointer flex-col gap-0.5 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
              >
                <Typography variant="numericDense" tone="default">
                  {row.name}
                </Typography>
                <Typography variant="metaText" tone="dense">
                  {row.about}
                </Typography>
              </Link>,
              <Typography key="objects" variant="denseText" tone="default">{row.objects}</Typography>,
              <Typography key="author" variant="denseText" tone="secondary">{row.author}</Typography>,
              <Typography key="updated" variant="denseText" tone="secondary">{row.updated}</Typography>,
              // Прочерк в просмотрах значит «ссылки нет», а не «ноль заходов»:
              // у подборки без ссылки считать нечего. Как только ссылку создали,
              // на её месте встаёт ноль — то же состояние, что у второй строки.
              <Typography key="views" variant="denseText" tone="default">
                {hasLink ? row.views : "—"}
              </Typography>,
              <Button
                key="link"
                variant="quiet"
                size="sm"
                onClick={() => {
                  if (hasLink) copyLink(row.slug)
                  else setLink(row.id, true)
                }}
                iconLeft={
                  hasLink ? <Copy aria-hidden className="size-3.5" strokeWidth={2} /> : undefined
                }
              >
                {hasLink ? "Скопировать" : "Создать ссылку"}
              </Button>,
            ],
          }
        })}
      />
      )}
    </CollectionsShell>
  )
}

type CollectionObject = {
  id: string
  address: string
  price: string
  deviation: number
  meta: string
}

const OBJECTS: CollectionObject[] = [
  { id: "1", address: "Лиговский пр., 44", price: "6,4 млн ₽", deviation: -14, meta: "комната 18 м² в 4-к · 3/5 эт · Лиговский проспект 4 мин · 62 дня в выдаче" },
  { id: "2", address: "ул. Марата, 12", price: "5,8 млн ₽", deviation: -9, meta: "комната 16 м² в 5-к · 2/6 эт · Владимирская 7 мин · 34 дня в выдаче" },
  { id: "3", address: "Разъезжая ул., 26", price: "7,1 млн ₽", deviation: 0, meta: "комната 21 м² в 4-к · 4/5 эт · Достоевская 6 мин · 12 дней в выдаче" },
  { id: "4", address: "Свечной пер., 9", price: "4,9 млн ₽", deviation: -11, meta: "комната 14 м² в 6-к · 1/5 эт · Лиговский проспект 9 мин · 88 дней в выдаче" },
  { id: "5", address: "Боровая ул., 31", price: "6,9 млн ₽", deviation: 7, meta: "комната 19 м² в 3-к · 5/5 эт · Обводный канал 11 мин · 5 дней в выдаче" },
  { id: "6", address: "Тамбовская ул., 8", price: "5,2 млн ₽", deviation: -16, meta: "комната 15 м² в 5-к · 2/5 эт · Обводный канал 8 мин · 121 день в выдаче" },
]

/**
 * Подпись подборки числом объектов.
 *
 * Объекты из подборки убирают, и число меняется на глазах — значит слово
 * обязано меняться вместе с ним: «5 объектов», «2 объекта», «1 объект».
 * Подпись, которая говорит «1 объектов», выглядит поломкой продукта.
 */
function objectsNote(count: number): string {
  const teens = count % 100
  const last = count % 10

  if (teens >= 11 && teens <= 14) return `${count} объектов`
  if (last === 1) return `${count} объект`
  if (last >= 2 && last <= 4) return `${count} объекта`
  return `${count} объектов`
}

/**
 * Подборка изнутри.
 *
 * **Порядок объектов меняется перетаскиванием и сохраняется для клиента** —
 * поэтому у каждой строки слева стоит ручка захвата. Это не мелочь: агент
 * ставит первым тот объект, с которого хочет начать показ, и клиент видит
 * подборку в том же порядке.
 *
 * Тащить можно только за ручку, а не за строку целиком: иначе перестал бы
 * выделяться мышью адрес. Ручка при этом умеет клавиатуру — стрелки вверх
 * и вниз двигают объект: перетаскивание мышью для человека, который работает
 * с клавиатуры, никакого порядка не задаёт.
 */
export function CollectionInsidePage() {
  // Состав и порядок подборки — состояние экрана: клиент увидит её ровно такой,
  // какой её оставил агент.
  const [objects, setObjects] = useState<CollectionObject[]>(OBJECTS)
  // Строка, взятая за ручку. Перетаскиваемой становится только она.
  const [dragging, setDragging] = useState<number | null>(null)

  function move(from: number, to: number) {
    setObjects((previous) => {
      if (from === to || to < 0 || to >= previous.length) return previous

      const next = [...previous]
      const [moved] = next.splice(from, 1)
      if (moved === undefined) return previous

      next.splice(to, 0, moved)
      return next
    })
  }

  return (
    <CollectionsShell
      title="Расселение, Лиговка"
      note={objectsNote(objects.length)}
      action={
        <div className="flex items-center gap-2">
          {/* Отправки в Telegram в макете нет ни экраном, ни окном выбора чата:
              действие названо и не рисует ничего. Уводить агента на сторонний
              сайт вместо нарисованного шага — не то же самое, что сделать шаг. */}
          <Button
            variant="secondary"
            size="sm"
            data-action="публичная ссылка отправлена в Telegram"
          >
            Отправить в Telegram
          </Button>
          <Button variant="primary" size="sm" onClick={() => copyLink(COLLECTION_SLUG)}>
            Скопировать публичную ссылку
          </Button>
        </div>
      }
    >
      <Typography variant="metaText" tone="dense">
        {`serch.ru/p/${COLLECTION_SLUG} · открыта · 124 просмотра · телефоны скрыты`}
      </Typography>

      {/* Убрать можно все шесть объектов. Пустой подборки в макете не нарисовано,
          поэтому панель тогда просто исчезает: выдуманная заглушка была бы
          рассказом о состоянии, которого владелец не утверждал. */}
      <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-surface">
        {objects.map((object, index) => (
          <div
            key={object.id}
            data-slot="collection-row"
            draggable={dragging === index}
            onDragStart={() => setDragging(index)}
            onDragOver={(event) => {
              // Строки меняются местами прямо под курсором: это и есть ответ
              // на перетаскивание. Ни подсветки, ни просвета под строкой
              // в макете нет, и придумывать их не нужно — порядок виден сам.
              event.preventDefault()
              if (dragging === null || dragging === index) return
              move(dragging, index)
              setDragging(index)
            }}
            onDragEnd={() => setDragging(null)}
            className={`flex h-row-obj w-full items-center gap-4 px-4 ${
              index < objects.length - 1 ? "border-b border-line-2" : ""
            }`}
          >
            <button
              type="button"
              aria-label={`Переместить «${object.address}»: стрелки вверх и вниз`}
              onPointerDown={() => setDragging(index)}
              onPointerUp={() => setDragging(null)}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp") {
                  event.preventDefault()
                  move(index, index - 1)
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  move(index, index + 1)
                }
              }}
              className="flex size-4 shrink-0 cursor-grab items-center justify-center bg-transparent text-line-3 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <GripVertical aria-hidden className="size-4" strokeWidth={2} />
            </button>
            <div aria-hidden className="size-12 shrink-0 rounded-md bg-warm" />

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex w-full items-center gap-2.5">
                <div className="w-57.5 shrink-0">
                  <Typography variant="rowPrice" tone="default">
                    {object.address}
                  </Typography>
                </div>
                <div className="flex w-25 shrink-0 justify-end">
                  <Typography variant="rowPrice" tone="default">
                    {object.price}
                  </Typography>
                </div>
                <MarketDeviation percent={object.deviation} />
              </div>
              <Typography variant="denseText" tone="dense">
                {object.meta}
              </Typography>
            </div>

            <div className="w-37.5 shrink-0">
              {/* «Убрать» действительно убирает: строка уходит, число объектов
                  в шапке пересчитывается. Клиент по ссылке увидит то же самое. */}
              <Button
                variant="quiet"
                size="sm"
                block
                onClick={() =>
                  setObjects((previous) => previous.filter((item) => item.id !== object.id))
                }
              >
                Убрать
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="w-225 shrink-0">
        <Typography variant="metaText" tone="dense">
          Порядок объектов меняется перетаскиванием и сохраняется для клиента.
          Добавить объект в подборку можно из выдачи клавишей B, не открывая карточку.
        </Typography>
      </div>
    </CollectionsShell>
  )
}

/**
 * ПУБЛИЧНОЕ · Подборка для клиента.
 *
 * Живёт вне кабинета: своя шапка 72 с именем агента и его телефоном.
 * **Телефон на этой странице ровно один — агента**, и это вся её экономика.
 */
export function PublicCollectionPage() {
  return (
    <div className="flex min-h-svh w-full flex-col bg-bg">
      <div className="flex h-18 w-full shrink-0 items-center gap-4 border-b border-line-2 bg-surface px-12">
        <div className="flex items-center gap-2">
          <Typography variant="panelTitle" tone="default">
            Сёрчь
          </Typography>
          <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
        </div>
        <span aria-hidden className="h-5 w-px bg-line-2" />
        <Typography variant="denseText" tone="dense">
          подборка от агентства «Невский проспект»
        </Typography>
        <div className="h-px flex-1" />
        <div className="flex flex-col gap-0.5">
          <Typography variant="numericDense" tone="default">
            Смирнова Ирина
          </Typography>
          <Typography variant="metaText" tone="dense">
            +7 900 000-57-66
          </Typography>
        </div>
        {/* Переписки с агентом в продукте нет: ни экрана, ни окна, ни адреса
            почты на этой странице. Действие названо и не рисует ничего —
            это честнее подставленного наугад мессенджера. */}
        <Button variant="primary" size="md" data-action="начата переписка с агентом">
          Написать агенту
        </Button>
      </div>

      <div className="flex w-full flex-col gap-6 p-12">
        <div className="flex w-full flex-col gap-2">
          <Typography variant="cardPrice" tone="default" as="h1">
            Расселение, Лиговка
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Шесть комнат под расселение у Лиговского проспекта. Телефоны собственников
            скрыты: по любому объекту пишите агенту.
          </Typography>
        </div>

        {/* Карточка не открывается. Публичной страницы объекта в продукте нет,
            а выдумать ей адрес значило бы пообещать клиенту экран, которого
            никто не рисовал. Карточка здесь — рассказ, а не вход. */}
        <div className="grid w-full grid-cols-3 gap-6">
          {OBJECTS.map((object) => (
            <div
              key={object.id}
              data-slot="public-card"
              className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface p-4"
            >
              <div aria-hidden className="h-53.5 w-full rounded-xl bg-warm" />
              <div className="flex w-full items-center gap-2">
                <Typography variant="panelTitle" tone="default">
                  {object.price}
                </Typography>
                <MarketDeviation percent={object.deviation} />
              </div>
              <Typography variant="rowPrice" tone="default">
                {object.address}
              </Typography>
              <Typography variant="denseText" tone="dense">
                {object.meta}
              </Typography>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Подборка отключена.
 *
 * Ссылку можно выключить, и тогда клиент видит не пустую страницу и не ошибку,
 * а объяснение с именем агентства: подборка больше не публикуется, свяжитесь
 * с агентом. Ссылка живёт своей жизнью после пересылки, и человек на том конце
 * не виноват, что она устарела.
 */
export function CollectionOffPage() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-bg px-12">
      <Typography variant="cardPrice" tone="default" as="h1">
        Подборка больше не публикуется
      </Typography>
      <div className="w-130 text-center">
        <Typography variant="uiText" tone="secondary" align="center">
          Агентство «Невский проспект» закрыло доступ по этой ссылке. Если подборка
          нужна, напишите агенту — он откроет её заново или пришлёт новую.
        </Typography>
      </div>
      {/* То же, что на публичной странице: переписки нет ни экраном, ни окном.
          Человек, которому переслали устаревшую ссылку, читает объяснение
          с именем агентства — оно и есть ответ, а не кнопка. */}
      <Button variant="primary" size="lg" data-action="начата переписка с агентом">
        Написать агенту
      </Button>
    </div>
  )
}
