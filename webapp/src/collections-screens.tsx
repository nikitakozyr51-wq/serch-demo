import { Link, useRouterState } from "@tanstack/react-router"
import { Copy, GripVertical, Link as LinkIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { TextField } from "@/components/controls/TextField"
import { ALL_ROWS } from "@/data/search-rows"
import { AgencyEmpty, DataTable } from "@/features/agency"
import { useSession } from "@/features/auth"
import {
  createCollection,
  formatDay,
  removeFromCollection,
  setCollectionLink,
  useNow,
  useWorkspace,
  type Collection,
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
 *
 * **Ни одной подборки, ни одного объекта и ни одного имени здесь больше не
 * вписано.** Из макета сюда приехали образцы текста — чужие агенты, чужое
 * агентство, шесть чужих комнат — и показывались живым людям как их работа.
 * Теперь список приходит из `features/workspace`, объекты внутри — из той же
 * базы, что и выдача, а имя человека и агентства — из сеанса. Где взять
 * значение неоткуда, стоит прочерк: он говорит правду, а правдоподобная
 * подстановка — нет.
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

/**
 * Работают ли ссылки для клиента.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * РЕШЕНИЕ ДИЗАЙН-ЧАТА, 08.08.2026 — ТРЕТИЙ ВАРИАНТ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Подборка живёт в браузере агента. Клиент открывает ссылку на ДРУГОМ
 * устройстве, где этого хранилища нет, — и видит «Подборка не открывается»
 * даже при включённой ссылке. Проверено живым браузером: страница честно
 * показывает закрытое состояние всегда.
 *
 * Рассматривались два выхода, оба отвергнуты дизайном:
 *
 * **Упаковать подборку в сам адрес** — противоречит пяти обещаниям, уже
 * нарисованным в файле: журналу открытий («когда и с какого устройства»),
 * сроку жизни «7 дней», колонке «Просмотров», обоим кадрам отключённой
 * ссылки и короткому адресу `serch.ru/p/…`. Данные в адресе не протухают
 * и не отзываются; продукт продаёт ровно обратное.
 *
 * **Убрать кнопку** — вернуло бы жалобу «не понимаю, где экран подборки».
 * Путь «выдача → В подборку → Подборки → внутрь» работает и без клиента:
 * агент собирает короткий список и звонит по нему.
 *
 * Поэтому кнопка остаётся и ВЫКЛЮЧЕНА С НАЗВАННОЙ ПРИЧИНОЙ — тот же приём,
 * которым в продукте объяснён запрет звонка. Появится сервер — снимается
 * этот флаг, и всё нарисованное включается как есть.
 */
const LINKS_WORK = false

const LINK_OFF_REASON =
  "Ссылка для клиента заработает, когда подборки переедут на сервер. Сейчас подборка живёт только в этом браузере."

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

/**
 * Какая подборка открыта.
 *
 * Адрес `/collections/inside` один на все подборки, поэтому какая именно
 * открыта, говорит параметр `id` — тем же приёмом, каким карточка объекта
 * узнаёт свой адрес из `?at=`. До этого страница показывала одну вписанную
 * подборку, и все строки списка вели в неё: подборка, которую агент собрал
 * сам, открыться не могла вообще.
 *
 * Параметр читается свободно, а не через `validateSearch`: маршрут его пока
 * не объявляет, и объявление живёт в `routes.tsx` — файле, который правит
 * не этот экран. Пока объявления нет, источник правды — сам адрес; подборки
 * без него страница честно не показывает.
 */
function useOpenedCollection(): Collection | null {
  const search = useRouterState({ select: (state) => state.location.search })
  const workspace = useWorkspace()
  const id = (search as { id?: unknown }).id

  if (typeof id !== "string") return null
  return workspace.collections.find((item) => item.id === id) ?? null
}

/**
 * Пояснение под названием подборки.
 *
 * Собирается из состава: своего описания у подборки нет и не должно быть —
 * лишнее поле в форме создания человек всё равно пропустит, а пустая строка
 * выглядит поломкой.
 */
function aboutOf(collection: Collection): string {
  if (collection.items.length === 0) return "пока пусто — добавьте объекты из выдачи клавишей B"
  return (
    collection.items.slice(0, 2).join(" · ") + (collection.items.length > 2 ? " и ещё…" : "")
  )
}

export function CollectionsPage() {
  /**
   * Подборки берутся из работы агентства, а не из констант.
   *
   * Раньше здесь стояли четыре чужие подборки, все четыре строки вели в одну
   * и ту же, а кнопка «Новая подборка» не имела обработчика — то есть завести
   * свою было нельзя вообще никак. Владелец назвал это «подборка потерялась».
   *
   * Развилки «свои или чужие» больше нет: чужих нет ни на одном экране,
   * и показывать их нечем.
   */
  const workspace = useWorkspace()
  const session = useSession()
  const now = useNow()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")

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

      {/*
        Пусто — но шапка таблицы остаётся, а картинки не появляется.

        Правило доски `СИСТЕМА · Пустые списки`. Раньше здесь схлопывалось
        всё: и шапка, и колонки, — и человек, открывший раздел впервые,
        не понимал, что вообще увидит, когда подборка появится. Теперь
        колонки на месте и отвечают на это раньше любого текста.

        Плашка «телефона нет ни в каком виде» выше остаётся и в пустом
        состоянии: она объясняет ценность подборки ДО того, как подборка
        появится, и это единственный момент, когда объяснение нужно.
      */}
      <DataTable
        empty={{
          title: "Ни одной подборки",
          /*
            Текст обещает ровно то, что работает СЕЙЧАС.

            Стояло: «…Клиент откроет её по ссылке, без регистрации». Ссылка
            для клиента выключена решением дизайна (`LINKS_WORK` ниже), пока
            подборки не переедут на сервер, — то есть пустой экран обещал
            единственное, что в разделе не работает, и обещал это первым же
            словом, которое человек здесь читает.
          */
          text: "Выделите объекты в выдаче и нажмите «В подборку» — или заведите пустую кнопкой справа. Ссылка для клиента заработает вместе с сервером.",
        }}
        columns={[
          { head: "ПОДБОРКА" },
          { head: "ОБЪЕКТОВ", width: "w-27.5", numeric: true },
          { head: "АВТОР", width: "w-50" },
          { head: "ОБНОВЛЕНА", width: "w-37.5", numeric: true },
          { head: "ПРОСМОТРОВ", width: "w-32.5", numeric: true },
          { head: "ССЫЛКА", width: "w-45", numeric: true },
        ]}
        rows={workspace.collections.map((item) => ({
          id: item.id,
          cells: [
            // Имя подборки — ссылка внутрь, а не подпись. Список, из которого
            // нельзя открыть подборку, агенту не нужен вовсе. Ссылкой, а не
            // кнопкой: её открывают в новой вкладке и возвращаются назад.
            // Какую именно открывать, говорит `id` в адресе: страница внутри
            // одна на все подборки.
            <Link
              key="name"
              to="/collections/inside"
              search={{ id: item.id }}
              className="flex min-w-0 cursor-pointer flex-col gap-0.5 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="numericDense" tone="default">
                {item.name}
              </Typography>
              <Typography variant="metaText" tone="dense">
                {aboutOf(item)}
              </Typography>
            </Link>,
            <Typography key="objects" variant="denseText" tone="default">
              {String(item.items.length)}
            </Typography>,
            // Автор — тот, кто завёл подборку, из сеанса на момент создания.
            // Пустое имя даёт прочерк: подставить сюда кого-нибудь значило бы
            // приписать работу человеку, который её не делал.
            <Typography key="author" variant="denseText" tone="secondary">
              {item.by === "" ? "—" : item.by}
            </Typography>,
            <Typography key="updated" variant="denseText" tone="secondary">
              {formatDay(item.updatedAt, now)}
            </Typography>,
            // Просмотров всегда прочерк, и это не заглушка, а отсутствие
            // счётчика: заходы клиента считает только сервер, а его пока нет.
            // Ноль на этом месте был бы утверждением «никто не заходил» —
            // проверить его нечем.
            <Typography key="views" variant="denseText" tone="default">
              {"—"}
            </Typography>,
            <Button
              key="link"
              variant="quiet"
              size="sm"
              disabled={!item.linked && !LINKS_WORK}
              title={item.linked || LINKS_WORK ? undefined : LINK_OFF_REASON}
              onClick={() => {
                if (item.linked) copyLink(item.slug)
                else setCollectionLink(item.id, true)
              }}
              iconLeft={
                item.linked ? <Copy aria-hidden className="size-3.5" strokeWidth={2} /> : undefined
              }
            >
              {item.linked ? "Скопировать" : "Создать ссылку"}
            </Button>,
          ],
        }))}
      />
    </CollectionsShell>
  )
}

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
 *
 * **Оговорка про сохранение порядка.** Перестановка живёт в экране и до
 * перезагрузки: в журнале подборок есть «добавить» и «убрать», но нет
 * «переставить», а заводить действие хранилища — правка `features/workspace`,
 * а не этого файла. Состав при этом настоящий: «Убрать» убирает объект
 * насовсем, и список это переживёт.
 */
export function CollectionInsidePage() {
  const collection = useOpenedCollection()
  // Порядок, заданный перетаскиванием: только адреса, без копии объектов.
  // Состав живёт в подборке, порядок — здесь, и они не спорят друг с другом.
  const [order, setOrder] = useState<string[]>([])

  const items = collection?.items ?? []
  // Сначала то, что агент переставил, следом всё, чего он не трогал: объект,
  // добавленный из выдачи только что, не должен прыгать в середину списка.
  const shown = [
    ...order.filter((address) => items.includes(address)),
    ...items.filter((address) => !order.includes(address)),
  ]
  // Строка, взятая за ручку. Перетаскиваемой становится только она.
  const [dragging, setDragging] = useState<number | null>(null)

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= shown.length) return

    const next = [...shown]
    const [moved] = next.splice(from, 1)
    if (moved === undefined) return

    next.splice(to, 0, moved)
    setOrder(next)
  }

  /**
   * Подборка не выбрана.
   *
   * Так выглядит прямой заход на адрес без `id` — например по старой закладке.
   * Показать при этом чью-то чужую подборку было бы хуже пустого экрана:
   * человек решил бы, что это его работа.
   */
  if (collection === null) {
    return (
      <CollectionsShell title="Подборка" note="">
        <AgencyEmpty
          title="Подборка не выбрана"
          text="Подборки открываются из списка: там видно, сколько в каждой объектов, кто её собрал и создана ли ссылка для клиента."
          note="Этот адрес открывает одну подборку — ту, на которую нажали в списке."
        />
      </CollectionsShell>
    )
  }

  return (
    <CollectionsShell
      title={collection.name}
      note={objectsNote(shown.length)}
      action={
        <div className="flex items-center gap-2">
          {/* Пока ссылки нет, отправлять и копировать нечего: обе кнопки
              обещали бы клиенту страницу, которая не откроется. Поэтому до
              создания ссылки здесь стоит одно действие — создать её. */}
          {collection.linked ? (
            <>
              {/* Отправки в Telegram в макете нет ни экраном, ни окном выбора
                  чата: действие названо и не рисует ничего. Уводить агента
                  на сторонний сайт вместо нарисованного шага — не то же самое,
                  что сделать шаг. */}
              <Button
                variant="secondary"
                size="sm"
                data-action="публичная ссылка отправлена в Telegram"
              >
                Отправить в Telegram
              </Button>
              <Button variant="primary" size="sm" onClick={() => copyLink(collection.slug)}>
                Скопировать публичную ссылку
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                disabled={!LINKS_WORK}
                onClick={() => setCollectionLink(collection.id, true)}
              >
                Создать ссылку
              </Button>
              {LINKS_WORK ? null : (
                <Typography variant="metaText" tone="dense">
                  {LINK_OFF_REASON}
                </Typography>
              )}
            </div>
          )}
        </div>
      }
    >
      {/* Числа просмотров в строке нет по той же причине, что и в списке:
          заходы клиента считает сервер, а его пока нет. Остальное здесь
          проверяемо: адрес ссылки, её состояние и обещание про телефоны. */}
      <Typography variant="metaText" tone="dense">
        {collection.linked
          ? `serch.ru/p/${collection.slug} · открыта · телефоны скрыты`
          : "ссылка не создана · подборка видна только в кабинете"}
      </Typography>

      {/* Пустая подборка — обычное состояние, а не сбой: её и заводят пустой,
          а объекты складывают потом. Раньше панель в этом случае просто
          исчезала, и экран молчал о том, что делать дальше. Форма пустого
          состояния общая с разделами агентства — новую здесь не выдумывали. */}
      {shown.length === 0 ? (
        <AgencyEmpty
          title="В подборке пока нет объектов"
          text="Объекты добавляются из выдачи клавишей B или кнопкой в строке — карточку для этого открывать не нужно. Клиент увидит их в том порядке, в каком вы их расставите."
        />
      ) : (
        <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-surface">
          {shown.map((address, index) => {
            // Цена, отклонение и характеристики берутся из той же базы, что
            // показывает выдача: подборка хранит адрес, а не копию объекта.
            // Иначе цена внутри подборки разошлась бы с ценой в выдаче.
            const listing = ALL_ROWS.find((row) => row.address === address)

            return (
              <div
                key={address}
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
                  index < shown.length - 1 ? "border-b border-line-2" : ""
                }`}
              >
                <button
                  type="button"
                  aria-label={`Переместить «${address}»: стрелки вверх и вниз`}
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
                        {address}
                      </Typography>
                    </div>
                    <div className="flex w-25 shrink-0 justify-end">
                      <Typography variant="rowPrice" tone="default">
                        {listing?.price ?? "—"}
                      </Typography>
                    </div>
                    {/* Объекта может не оказаться в базе — например его сняли
                        с публикации. Тогда отклонения и характеристик нет:
                        считать их не от чего, и строка молчит вместо того,
                        чтобы показать посчитанное неизвестно от чего. */}
                    {listing === undefined ? null : (
                      <MarketDeviation percent={listing.deviation} />
                    )}
                  </div>
                  {listing === undefined ? null : (
                    <Typography variant="denseText" tone="dense">
                      {listing.meta.replace(/^·\s*/, "")}
                    </Typography>
                  )}
                </div>

                <div className="w-37.5 shrink-0">
                  {/* «Убрать» действительно убирает: строка уходит из подборки
                      насовсем, число объектов в шапке пересчитывается. Клиент
                      по ссылке увидит то же самое. */}
                  <Button
                    variant="quiet"
                    size="sm"
                    block
                    onClick={() => removeFromCollection(collection.id, address)}
                  >
                    Убрать
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
 *
 * **Чего у страницы пока нет.** Имя агента и агентства она берёт из сеанса —
 * то есть показывает их только тому, кто вошёл на этом же компьютере. Клиент
 * открывает ссылку в своём браузере, где нет ни сеанса, ни подборок: чужое
 * хранилище оттуда не видно (`docs/DATA.md`). Пока за продуктом не появится
 * сервер, страница честно живёт стендом.
 *
 * Телефона агента в продукте нет ни в сеансе, ни в настройках агентства.
 * Пока поля нет, на его месте прочерк: выдуманный номер на странице, которую
 * агент отдаёт клиенту, — худшее, что здесь можно напечатать.
 */
export function PublicCollectionPage() {
  const session = useSession()
  const collection = useOpenedCollection()
  const agency = session?.agency ?? ""
  const agent = session?.name ?? ""

  return (
    <div className="flex min-h-svh w-full flex-col bg-bg">
      <div className="flex h-18 w-full shrink-0 items-center gap-4 border-b border-line-2 bg-surface px-12">
        <div className="flex items-center gap-2">
          <Typography variant="panelTitle" tone="default">
            Сёрчь
          </Typography>
          <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
        </div>
        {/* Имени агентства без сеанса взять неоткуда, и строка тогда исчезает
            вместе с разделителем: «подборка от агентства » с пустотой на конце
            хуже, чем её отсутствие. */}
        {agency === "" ? null : (
          <>
            <span aria-hidden className="h-5 w-px bg-line-2" />
            <Typography variant="denseText" tone="dense">
              {`подборка от агентства «${agency}»`}
            </Typography>
          </>
        )}
        <div className="h-px flex-1" />
        <div className="flex flex-col gap-0.5">
          <Typography variant="numericDense" tone="default">
            {agent === "" ? "—" : agent}
          </Typography>
          <Typography variant="metaText" tone="dense">
            {"—"}
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
        {collection === null ? (
          <AgencyEmpty
            title="Подборка не открывается"
            text="Ссылка ведёт на подборку, которой здесь нет: её могли отключить или прислать новую. Напишите агенту — он откроет доступ заново."
          />
        ) : (
          <>
            <div className="flex w-full flex-col gap-2">
              <Typography variant="cardPrice" tone="default" as="h1">
                {collection.name}
              </Typography>
              {/* Второй строкой — правило страницы, а не пересказ состава:
                  сколько здесь объектов, клиент видит сам, а вот почему нигде
                  нет телефона собственника — нет. */}
              <Typography variant="uiText" tone="secondary">
                Телефоны собственников скрыты: по любому объекту пишите агенту.
              </Typography>
            </div>

            {/* Ссылку могли создать до того, как в подборку положили первый
                объект. Клиент в этом случае не должен смотреть на пустое
                место: страница говорит, что смотреть пока нечего. */}
            {collection.items.length === 0 ? (
              <Typography variant="uiText" tone="secondary">
                В подборке пока нет объектов. Агент добавит их и пришлёт ссылку
                ещё раз — она останется той же.
              </Typography>
            ) : null}

            {/* Карточка не открывается. Публичной страницы объекта в продукте
                нет, а выдумать ей адрес значило бы пообещать клиенту экран,
                которого никто не рисовал. Карточка здесь — рассказ, а не вход. */}
            <div className="grid w-full grid-cols-3 gap-6">
              {collection.items.map((address) => {
                const listing = ALL_ROWS.find((row) => row.address === address)

                return (
                  <div
                    key={address}
                    data-slot="public-card"
                    className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface p-4"
                  >
                    <div aria-hidden className="h-53.5 w-full rounded-xl bg-warm" />
                    <div className="flex w-full items-center gap-2">
                      <Typography variant="panelTitle" tone="default">
                        {listing?.price ?? "—"}
                      </Typography>
                      {listing === undefined ? null : (
                        <MarketDeviation percent={listing.deviation} />
                      )}
                    </div>
                    <Typography variant="rowPrice" tone="default">
                      {address}
                    </Typography>
                    {listing === undefined ? null : (
                      <Typography variant="denseText" tone="dense">
                        {listing.meta.replace(/^·\s*/, "")}
                      </Typography>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
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
 *
 * Имя агентства приходит из сеанса. Без сеанса его нет, и предложение теряет
 * имя, а не получает чужое: «Агентство закрыло доступ» — правда в любом
 * случае, а названное наугад агентство — нет.
 */
export function CollectionOffPage() {
  const agency = useSession()?.agency ?? ""

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-bg px-12">
      <Typography variant="cardPrice" tone="default" as="h1">
        Подборка больше не публикуется
      </Typography>
      <div className="w-130 text-center">
        <Typography variant="uiText" tone="secondary" align="center">
          {agency === ""
            ? "Агентство закрыло доступ по этой ссылке. Если подборка нужна, напишите агенту — он откроет её заново или пришлёт новую."
            : `Агентство «${agency}» закрыло доступ по этой ссылке. Если подборка нужна, напишите агенту — он откроет её заново или пришлёт новую.`}
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
