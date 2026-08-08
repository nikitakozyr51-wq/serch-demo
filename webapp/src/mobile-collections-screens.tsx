import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { useId, useState } from "react"
import { Bookmark, Plus, Share2 } from "lucide-react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { useSession } from "@/features/auth"
import { MobileEmptyState, MobileScreen, MobileSectionHeader, MobileSheet } from "@/features/cabinet"
import { ListingPhoto, plural } from "@/features/listings"
import {
  createCollection,
  formatDay,
  setCollectionLink,
  useNow,
  useWorkspace,
  type Collection,
} from "@/features/workspace"
import { cn } from "@/lib/utils"

/**
 * ПОДБОРКИ на телефоне: список, подборка изнутри, создание и публичная
 * страница для клиента.
 *
 * Снято с кадров `sFBTe`, `L10Ikr`, `nVXGr`, `MHLlO`.
 *
 * **Вся экономика подборок держится на одном правиле: на публичной странице
 * телефона собственника нет ни в каком виде.** Иначе цена контакта обнулялась
 * бы первой же пересылкой — агент отдал ссылку, клиент переслал знакомому,
 * знакомый позвонил собственнику сам. Поэтому правило сказано трижды и в трёх
 * разных местах: агенту — в сводке подборки, агенту при создании — текстом,
 * который нельзя снять галочкой, и клиенту — внизу публичной страницы.
 *
 * Три первых экрана живут в кабинете и стоят на нижней навигации. Четвёртый
 * не кабинет вовсе: у него своя шапка, нет вкладок, и телефон на нём ровно
 * один — агента.
 *
 * **Подборки здесь свои, а не показанные.** Раньше все четыре экрана были
 * набиты образцами текста из Pencil — «Расселение, Лиговка», шесть комнат,
 * «открыта 124 раза», агентство «Невский проспект», агент «Смирнова Ирина».
 * Дизайнер писал их, чтобы кадр не был пустым, а живому человеку они
 * показывались как его работа. Теперь всё берётся из того, что наработало
 * вошедшее агентство: подборки — из `features/workspace`, имя и агентство —
 * из сеанса, объекты — из базы выдачи по адресам, которые агент в подборку
 * положил.
 */

/**
 * Какая именно подборка — приходит в адресе параметром `id`.
 *
 * Читается строкой адреса, а не разобранными параметрами: мобильные маршруты
 * в `routes.tsx` их не объявляют, и типизированный `useSearch` о параметре
 * `id` не знает. Строка адреса — то же самое значение, только без объявления,
 * которому здесь не место: маршруты заводит файл маршрутов, а не экран.
 */
function useCollectionId(): string | null {
  const searchStr = useRouterState({ select: (state) => state.location.searchStr })
  return new URLSearchParams(searchStr).get("id")
}

/**
 * Подпись числом объектов: «1 объект», «2 объекта», «6 объектов».
 *
 * Объекты в подборку добавляют и убирают, число меняется на глазах — значит
 * слово обязано меняться вместе с ним. Подпись «1 объектов» читается как
 * поломка продукта.
 */
function objectsNote(count: number): string {
  return `${count} ${plural(count, "объект", "объекта", "объектов")}`
}

/**
 * Объект подборки: подборка хранит адреса, всё остальное лежит в базе выдачи.
 *
 * Мета собирается дважды и по-разному. Агенту — как в выдаче, вместе с
 * площадкой: он по ней узнаёт объявление. Клиенту — без площадки: подборка
 * существует ровно для того, чтобы клиент шёл к агенту, а не искал объект
 * сам на «Авито».
 */
type CollectionObject = {
  address: string
  price: string
  agentMeta: string
  clientMeta: string
  metro: string
}

function objectsOf(collection: Collection | undefined): CollectionObject[] {
  if (collection === undefined) return []

  return collection.items.map((address) => {
    const row = ALL_ROWS.find((item) => item.address === address)

    return {
      address,
      // Прочерк, а не выдуманная цена: объект мог уйти из базы, и подборка
      // обязана честно показать, что о нём больше ничего не известно.
      price: row?.price ?? "—",
      // Ведущая «·» принадлежит мете строки выдачи, где перед ней стоит
      // свежесть. Здесь мета стоит сама по себе, и точка в начале лишняя.
      agentMeta: row === undefined ? "" : row.meta.replace(/^·\s*/, ""),
      clientMeta: row === undefined ? "" : `${row.rooms}-к · ${row.area} м²`,
      metro: row?.metro ?? "",
    }
  })
}

/**
 * Чип «Открыта» (`mrzcW`): 32, поля [0, 8], радиус 8, зелёная плашка.
 *
 * Свой, а не `StatusChip`: тот несёт восемь состояний объекта — «В работе»,
 * «Раскрыт», «Стоп-лист». Здесь речь не об объекте, а о ссылке подборки,
 * и набор у неё другой. Геометрия совпадает с телефонным `StatusChip`
 * один в один, потому что она общая для чипов на телефоне, а не потому,
 * что это тот же чип.
 */
function CollectionLinkChip({ label }: { label: string }) {
  return (
    <span
      data-slot="collection-link-chip"
      className="inline-flex h-8 shrink-0 items-center rounded-md bg-ok-tint px-2 text-ok-text"
    >
      <Typography variant="chipLabel" tone="current">
        {label}
      </Typography>
    </span>
  )
}

/**
 * Значок-действие в шапке раздела: «плюс» и «поделиться».
 *
 * **Расхождение с полом касания.** В файле значок нарисован 24 × 24 и стоит
 * впритык к правому полю шапки; пол касания на телефоне — 44. Воспроизведено
 * как в файле: менять размер значит менять раскладку шапки, а это решение
 * владельца, а не вёрстки.
 *
 * **Два значка ведут себя по-разному, и это не небрежность.** За «плюсом»
 * нарисован экран — лист «Новая подборка», — и «плюс» ссылка. За «поделиться»
 * экрана нет: на десктопе это кнопка «Скопировать публичную ссылку», то есть
 * действие без окна. Значок поэтому называет, что случится, и ничего
 * не рисует.
 */

/** Общий вид обоих значков: ссылка и кнопка обязаны выглядеть одинаково. */
const HEADER_ICON_CLASS =
  "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent text-fg transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"

/** «Плюс»: ведёт на лист «Новая подборка». */
function HeaderIconLink({
  label,
  icon,
  to,
}: {
  label: string
  icon: React.ReactNode
  to: "/m/collections/new"
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      data-slot="mobile-header-action"
      className={HEADER_ICON_CLASS}
    >
      <>{icon}</>
    </Link>
  )
}

/** «Поделиться»: копирует ссылку, окна для этого нет. */
function HeaderIconAction({
  label,
  icon,
  action,
}: {
  label: string
  icon: React.ReactNode
  /** Что произойдёт при нажатии. Окна для этого в файле нет. */
  action: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-action={action}
      data-slot="mobile-header-action"
      className={HEADER_ICON_CLASS}
    >
      <>{icon}</>
    </button>
  )
}

/**
 * МОБАЙЛ · Подборки (`sFBTe`).
 *
 * Шапка 56 с заголовком и «плюсом», тело с полями [8, 16, 0, 16], строки
 * по 88 с волосяной линией снизу, нижняя навигация 72.
 *
 * **Список отвечает на один вопрос: работает ли ссылка.** Поэтому вторая
 * строка каждой подборки — не описание и не автор, а состав и судьба ссылки.
 * Для агента это единственная разница между подборкой, которая продаёт,
 * и папкой, про которую забыли.
 *
 * **Чип «Открыта» стоит там, где ссылка создана.** Раньше он обещал больше —
 * «клиент заходил 124 раза», — но заходов продукт не считает: страницу
 * открывают вне кабинета, и записать это некому, пока нет сервера. Обещать
 * счётчик, которого нет, хуже, чем не обещать ничего.
 *
 * На десктопе это таблица с шестью колонками — автор, обновлена, просмотров,
 * ссылка. На 390 колонок нет вовсе, и всё, кроме имени и судьбы ссылки,
 * ушло внутрь подборки.
 */
export function MobileCollectionsPage() {
  const workspace = useWorkspace()
  const now = useNow()

  return (
    <MobileScreen
      activeTab="collections"
      padded={false}
      header={
        <MobileSectionHeader
          title="Подборки"
          action={
            <HeaderIconLink
              label="Новая подборка"
              to="/m/collections/new"
              icon={<Plus aria-hidden className="size-6" strokeWidth={2} />}
            />
          }
        />
      }
    >
      <div className="flex w-full flex-col px-4 pt-2">
        {workspace.collections.length === 0 ? (
          <MobileEmptyState
            icon={Bookmark}
            title="Подборок пока нет"
            text="Подборка — это ссылка клиенту на отобранные объекты: телефон собственника в ней скрыт всегда. Заведите первую значком «плюс» вверху, объекты в неё добавляются из выдачи."
          />
        ) : (
          workspace.collections.map((collection) => {
            const when = formatDay(collection.updatedAt, now)

            return (
              // Строка — ссылка внутрь подборки, и адрес несёт, в какую именно.
              // Без этого все строки вели бы в одну и ту же: так и было, пока
              // подборки были образцами текста.
              <Link
                key={collection.id}
                to="/m/collections/inside"
                search={{ id: collection.id }}
                data-slot="mobile-collection-row"
                // Линия снизу нарисована внутренней тенью, а не рамкой: в файле
                // обводка идёт внутрь и высоту строки не меняет.
                className="row-tap flex w-full cursor-pointer items-center gap-3 bg-transparent py-4 text-left shadow-[inset_0_-1px_0_var(--line-2)] outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg"
              >
                {/* Обложка 56 — кадр первого объекта. Кадра может не быть,
                    и это обычное состояние слота, а не сбой. */}
                <div className="size-14 shrink-0 overflow-hidden rounded-md">
                  <ListingPhoto alt={collection.name} size="small" reason="no-photos" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex w-full items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Typography variant="rowPrice" tone="default">
                        {collection.name}
                      </Typography>
                    </div>
                    {collection.linked ? <CollectionLinkChip label="Открыта" /> : null}
                  </div>
                  <Typography variant="denseText" tone="secondary">
                    {collection.linked
                      ? `${objectsNote(collection.items.length)} · ${when}`
                      : `${objectsNote(collection.items.length)} · ссылки нет, ${when}`}
                  </Typography>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </MobileScreen>
  )
}

/**
 * МОБАЙЛ · Подборка изнутри (`L10Ikr`).
 *
 * Шапка 56 со стрелкой назад и значком «поделиться», сводка, строки по 80
 * с волосяной линией снизу, кроме последней.
 *
 * **Сводка объясняет клиентскую страницу до того, как агент нажмёт «поделиться».**
 * Две строки: что со ссылкой и что увидит клиент («фото, цену и адрес; телефон
 * собственника не показывается»). Второе важнее первого: агент отдаёт ссылку
 * человеку со стороны и обязан знать, что именно он отдаёт.
 *
 * **Перетаскивания здесь нет.** На десктопе у каждой строки слева ручка
 * захвата — порядок объектов агент задаёт сам, и клиент видит тот же порядок.
 * На телефоне ручки нет: в файле её не нарисовали, и порядок на 390
 * не меняют. Это осознанная потеря, а не забытая деталь.
 */
export function MobileCollectionInsidePage() {
  const workspace = useWorkspace()
  const id = useCollectionId()
  const collection = workspace.collections.find((item) => item.id === id)
  const objects = objectsOf(collection)

  return (
    <MobileScreen
      activeTab="collections"
      padded={false}
      header={
        <MobileSectionHeader
          // Заголовок — имя подборки. Пока подборка не найдена, разговаривать
          // не о чем, и шапка называет раздел, а не выдуманную подборку.
          title={collection?.name ?? "Подборка"}
          back
          action={
            collection === undefined ? undefined : (
              <HeaderIconAction
                label="Поделиться ссылкой"
                action="Копирует публичную ссылку подборки"
                icon={<Share2 aria-hidden className="size-6" strokeWidth={2} />}
              />
            )
          }
        />
      }
    >
      <div className="flex w-full flex-1 flex-col px-4 pt-2">
        {collection === undefined ? (
          <MobileEmptyState
            icon={Bookmark}
            title="Подборка не открылась"
            text="Ссылка привела в подборку, которой больше нет: её могли удалить. Вернитесь к списку и выберите другую."
          />
        ) : (
          <>
            <div className="flex w-full flex-col gap-1 pt-3 pb-4 shadow-[inset_0_-1px_0_var(--line-2)]">
              <Typography variant="denseText" tone="secondary">
                {collection.linked
                  ? `${objectsNote(objects.length)} · ссылка открыта`
                  : `${objectsNote(objects.length)} · ссылки нет`}
              </Typography>
              <Typography variant="metaText" tone="dense">
                Клиент видит фото, цену и адрес. Телефон собственника на публичной
                странице не показывается.
              </Typography>
            </div>

            {objects.length === 0 ? (
              <MobileEmptyState
                icon={Bookmark}
                title="Объектов пока нет"
                text="Подборка названа, но пуста. Объекты попадают сюда из выдачи: отбирайте те, которые покажете клиенту."
              />
            ) : (
              objects.map((object, index) => (
                <div
                  key={object.address}
                  data-slot="mobile-collection-object"
                  className={cn(
                    "flex w-full items-center gap-3 py-3",
                    // Под последней строкой линии нет: список кончился, и делить
                    // больше нечего.
                    index < objects.length - 1 && "shadow-[inset_0_-1px_0_var(--line-2)]",
                  )}
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-md">
                    <ListingPhoto alt={object.address} size="small" reason="no-photos" />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Typography variant="strongText" tone="default">
                      {object.address}
                    </Typography>
                    <Typography variant="metaText" tone="dense">
                      {object.agentMeta}
                    </Typography>
                  </div>

                  {/* Цена держит колонку 88 и выключена вправо: цены подряд
                      читаются столбиком, а не вразнобой за концом адреса. */}
                  <div className="w-22 shrink-0">
                    <Typography variant="strongText" tone="default" align="end">
                      {object.price}
                    </Typography>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </MobileScreen>
  )
}

/** Кому открыта подборка. Набор закрыт двумя значениями — третьего в файле нет. */
type CollectionAccess = "link" | "agency"

const ACCESS_OPTIONS: { id: CollectionAccess; label: string }[] = [
  { id: "link", label: "Ссылка для клиента" },
  { id: "agency", label: "Только внутри агентства" },
]

/**
 * МОБАЙЛ · Новая подборка (`nVXGr`).
 *
 * Лист снизу: скрим, радиус 24 сверху, поля [12, 20, 32, 20], зазор 20.
 * Внутри три группы с зазором 8 — название, доступ, действия.
 *
 * **Главное правило подборок стоит вторым абзацем и не имеет переключателя:**
 * «Клиент увидит объекты без контактов собственников. Это правило снять
 * нельзя». Галочки «показать телефон» здесь нет и не будет — на ней держится
 * цена контакта. Выбор ниже совсем о другом: кому вообще открыта подборка,
 * клиенту по ссылке или только своим.
 *
 * Подсказка под названием говорит, что название увидит клиент. Без неё агент
 * пишет служебное «Ковалёвы, торг до 6», и это уходит человеку.
 *
 * **Кнопка «Создать подборку» действительно создаёт.** Раньше в поле стояло
 * готовое имя из макета, а кнопка просто переносила на соседний экран: агент
 * нажимал «Создать» и не создавал ничего. Поле теперь пустое с примером
 * в подсказке, а нажатие заводит подборку в работе агентства и открывает её.
 */
export function MobileNewCollectionPage() {
  const [access, setAccess] = useState<CollectionAccess>("link")
  const [name, setName] = useState("")
  const nameFieldId = useId()
  const session = useSession()
  // Кнопки листа переносят на нарисованные экраны, но ссылками стать не могут:
  // `Button` закрыт для className, а его `asChild` заворачивает ссылку внутрь
  // подписи, и вид кнопки достаётся не ссылке. Поэтому переход здесь через
  // маршрутизатор — это по-прежнему настоящий переход, только без открытия
  // в новой вкладке.
  const navigate = useNavigate()

  const create = () => {
    const clean = name.trim()
    if (clean === "") return

    const collection = createCollection(clean, session?.name ?? "")
    // «Ссылка для клиента» — это и есть публикация: подборка сразу получает
    // работающий адрес. «Только внутри агентства» оставляет её без ссылки,
    // и на списке она стоит без чипа.
    if (access === "link") setCollectionLink(collection.id, true)

    // Создали — и оказались внутри подборки, а не вернулись в список:
    // дальше агент собирает в неё объекты, а не смотрит на папку.
    void navigate({ to: "/m/collections/inside", search: { id: collection.id } })
  }

  return (
    <MobileSheet
      title="Новая подборка"
      text="Клиент увидит объекты без контактов собственников. Это правило снять нельзя."
    >
      {/* Одна обёртка с зазором 20: лист даёт своим детям зазор 8, а между
          группами в файле стоит 20 — тот же шаг, что между хватом,
          заголовком и содержимым. */}
      <div className="flex w-full flex-col gap-5">
        <div className="flex w-full flex-col gap-2">
          <Typography
            as="label"
            variant="columnHeader"
            tone="dense"
            htmlFor={nameFieldId}
          >
            НАЗВАНИЕ ПОДБОРКИ
          </Typography>

          {/*
            Поле 48 с радиусом 12 на фоне `bg` — не `TextField`: тот 40,
            с радиусом 10, белый и с границей контрола. Другая высота, другой
            радиус, другая заливка — значит другой контрол, а не настройка
            существующего.
          */}
          <Typography asChild variant="controlLabelLg">
            <input
              id={nameFieldId}
              value={name}
              // Подсказка, а не значение: пример показывает, как называют
              // подборку — по клиенту или по задаче, — и исчезает от первой
              // буквы. Тот же пример стоит в окне выбора подборки на компьютере.
              placeholder="Например: Расселение, Лиговка"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") create()
              }}
              className="h-ctl-lg w-full rounded-xl bg-bg px-4 text-fg outline-solid outline-1 -outline-offset-1 outline-line-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            />
          </Typography>

          <Typography variant="metaText" tone="dense">
            клиент увидит это название на странице подборки
          </Typography>
        </div>

        <div
          role="radiogroup"
          aria-label="Кому открыта подборка"
          className="flex w-full flex-col gap-2"
        >
          {ACCESS_OPTIONS.map((option) => {
            const selected = option.id === access
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-slot="collection-access"
                // Отклик на нажатие пальцем, а не на отпускание: выбор
                // должен подсветиться в тот момент, когда палец коснулся.
                onPointerDown={() => setAccess(option.id)}
                onClick={() => setAccess(option.id)}
                className={cn(
                  "flex h-ctl-lg w-full cursor-pointer items-center gap-3 rounded-xl px-4",
                  "outline-solid outline-1 -outline-offset-1 outline-border-control",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                  // Действие уже приходит по `pointerdown` (см. выше). Здесь —
                  // то, что человек при этом видит: без заливки нажатие
                  // оставалось обещанием в коде, а не откликом на экране.
                  "transition-colors duration-120",
                  selected ? "bg-warm active:bg-warm-press" : "bg-transparent active:bg-warm-hover",
                )}
              >
                {/* Выбранный кружок в файле залит графитом целиком, без белого
                    просвета внутри. Так и воспроизведено. */}
                <span
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 rounded-full",
                    selected
                      ? "bg-fg"
                      : "bg-transparent outline-solid outline-1 -outline-offset-1 outline-border-control",
                  )}
                />
                <Typography variant="uiText" tone="default">
                  {option.label}
                </Typography>
              </button>
            )
          })}
        </div>

        <div className="flex w-full flex-col gap-2">
          {/* Без названия создавать нечего: подборка без имени не найдётся
              в списке ни у агента, ни в окне выбора. */}
          <Button
            variant="primary"
            size="lg"
            block
            disabled={name.trim() === ""}
            onClick={create}
          >
            Создать подборку
          </Button>
          {/* Лист закрывается возвратом к списку: под ним нарисован он. */}
          <Button
            variant="quiet"
            size="lg"
            block
            onClick={() => void navigate({ to: "/m/collections" })}
          >
            Отмена
          </Button>
        </div>
      </div>
    </MobileSheet>
  )
}

/**
 * МОБАЙЛ · Подборка для клиента (`MHLlO`).
 *
 * Публичная страница вне кабинета: шапка 56 с логотипом и именем агентства,
 * тело с полями [24, 16] и зазором 28, липкая полоса снизу с агентом и одной
 * кнопкой.
 *
 * **Это единственный экран продукта, который видит не агент, а его клиент**, —
 * и он собран по другим правилам. Фотография во всю ширину и 240 в высоту
 * вместо кадра 56, адрес и цена одной ступенью 20, между объектами 28 вместо
 * волосяной линии. Клиент не сравнивает шесть строк глазами по колонке, он
 * листает и смотрит.
 *
 * **Телефона собственника здесь нет ни у одного объекта, и это сказано вслух
 * внизу страницы.** Телефона агента здесь тоже нет — и не потому, что его
 * спрятали: профиль в продукте номер не хранит, взять его неоткуда, а
 * подставить правдоподобный значило бы дать клиенту номер, по которому никто
 * не ответит. Поэтому внизу стоят имя агента и кнопка, а строка с номером
 * появится здесь в тот день, когда номер появится в профиле.
 *
 * **Какую подборку показывать.** Настоящий адрес страницы — `serch.ru/p/<хвост>`,
 * и подборку выбирает он. Демонстрационный адрес хвоста не несёт, поэтому
 * страница берёт подборку из параметра `id`, а без него — последнюю, у которой
 * ссылка открыта. Подборка без ссылки не открывается вовсе: ровно это и значит
 * «ссылку можно отключить».
 */
export function MobileClientCollectionPage() {
  const workspace = useWorkspace()
  const session = useSession()
  const id = useCollectionId()
  const asked = workspace.collections.find((item) => item.id === id)
  const collection =
    asked ?? (id === null ? workspace.collections.find((item) => item.linked) : undefined)
  const objects = objectsOf(collection)
  // Имя агентства и имя агента — из сеанса того, кто подборку собрал. Чужих
  // имён на этой странице быть не может: показывать нечего, если сеанса нет.
  const agency = session?.agency ?? ""
  const agent = session?.name ?? ""

  return (
    <div
      data-slot="mobile-client-collection"
      className="flex min-h-svh w-full flex-col bg-bg"
    >
      <header
        data-slot="client-collection-header"
        className="flex h-header w-full shrink-0 items-center gap-3 bg-surface px-4 shadow-[inset_0_-1px_0_var(--line-2)]"
      >
        <div className="flex items-center gap-1.5">
          <Typography variant="panelTitle" tone="default">
            Сёрчь
          </Typography>
          <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
        </div>
        <div className="h-px flex-1" />
        {/* Имя агентства, а не агента: клиент пришёл по ссылке и должен
            понимать, чья это страница, ещё до того, как долистает до подписи. */}
        {agency === "" ? null : (
          <Typography variant="metaText" tone="dense">
            {agency}
          </Typography>
        )}
      </header>

      {collection === undefined || !collection.linked ? (
        // Ссылку выключили или её никогда не было. Человек на том конце
        // не виноват, что она устарела, и видит объяснение, а не пустую
        // страницу и не ошибку. Тот же ответ, что на компьютере.
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
          <Typography variant="panelTitle" tone="default" as="h1" align="center">
            Подборка не открывается
          </Typography>
          <Typography variant="uiText" tone="secondary" align="center">
            Доступ по этой ссылке закрыт. Если подборка нужна, напишите агенту —
            он откроет её заново или пришлёт новую.
          </Typography>
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col gap-7 px-4 py-6">
          <div className="flex w-full flex-col gap-2">
            <Typography variant="cardPrice" tone="default" as="h1">
              {collection.name}
            </Typography>
            <Typography variant="uiText" tone="secondary">
              {`${objectsNote(objects.length)}, отобранных для вас`}
            </Typography>
          </div>

          <div className="flex w-full flex-col gap-7">
            {objects.map((object) => (
              <div
                key={object.address}
                data-slot="client-collection-object"
                className="flex w-full flex-col gap-3"
              >
                <div className="h-60 w-full overflow-hidden rounded-2xl">
                  <ListingPhoto alt={object.address} size="large" reason="no-photos" />
                </div>

                <div className="flex w-full flex-col gap-1">
                  <div className="flex w-full items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Typography variant="panelTitle" tone="default" as="h2">
                        {object.address}
                      </Typography>
                    </div>
                    {/* Цена той же ступенью, что адрес: клиенту они равны,
                        и ни одна не важнее другой. */}
                    <Typography variant="panelTitle" tone="default" as="span" align="end">
                      {object.price}
                    </Typography>
                  </div>
                  <Typography variant="denseText" tone="dense">
                    {object.clientMeta}
                  </Typography>
                  <Typography variant="denseText" tone="dense">
                    {object.metro}
                  </Typography>
                </div>
              </div>
            ))}
          </div>

          <Typography variant="metaText" tone="dense">
            Телефон собственника на этой странице не показывается. По любому объекту
            звоните своему агенту.
          </Typography>

          {/* Адрес страницы напечатан текстом: ссылка живёт своей жизнью после
              пересылки, и человек, которому её переслали, видит, где он. */}
          <Typography variant="metaText" tone="dense">
            {`serch.ru/p/${collection.slug}`}
          </Typography>
        </div>
      )}

      {/* Полоса липкая, а не прижатая: страница длинная, и агент с кнопкой
          обязаны быть под пальцем на любом объекте, а не только в конце. */}
      <div
        data-slot="client-collection-agent"
        className="sticky bottom-0 flex w-full items-center gap-3 bg-surface px-4 pt-3 pb-6 shadow-[inset_0_1px_0_var(--line-2)]"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Typography variant="panelTitle" tone="default" as="span">
            {agent === "" ? agency : agent}
          </Typography>
          <Typography variant="denseText" tone="dense">
            {agent === "" ? "ваш агент" : `агентство ${agency}`}
          </Typography>
        </div>
        {/* Кнопка названа и молчит: клиент уходит из продукта в свой мессенджер
            или в звонок, и экрана для этого у нас нет и быть не может. */}
        <Button
          variant="primary"
          size="lg"
          data-action="Пишет агенту: клиент уходит в свой мессенджер"
        >
          Написать
        </Button>
      </div>
    </div>
  )
}
