import { useNavigate, useSearch } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { Typography } from "@/components/typography"

import { rentalRows } from "@/data/rental-rows"
import { ALL_ROWS, DISTRICTS, MEASURED_ROWS, type SearchRow } from "@/data/search-rows"
import { initialsOf, useOwnAgency, useSession, useSessionActions } from "@/features/auth"
import {
  CollectionPicker,
  disclosureOf,
  lastCall,
  saveSearch,
  useNow,
  useWorkspace,
  type SavedSearch,
  type Workspace,
} from "@/features/workspace"
import { CabinetShell, useHotkeys } from "@/features/cabinet"
import { useDensity } from "@/platform/density"
import {
  FilterBar,
  FilterPanel,
  ListingRow,
  ResultsHeader,
  NearAddressDialog,
  ResultTabs,
  useFilterCollapse,
  type SearchMode,
} from "@/features/listings"

/**
 * КАБИНЕТ · Поиск → Выдача.
 *
 * Первый настоящий экран продукта, собранный из готовых частей:
 * шапка `Vr9uG`, сайдбар `C6b6DX`, колонка фильтров `I55fb`, шапка выдачи,
 * табы и строки `jsW77`.
 *
 * Сетка снята с `ghwPj`: экран 1440, шапка 56, сайдбар 240, столбец фильтров
 * 260, остальное — выдача с полями 16 и зазором 12.
 *
 * **Все числа и адреса взяты из `DEMO-DATA.md`** и нигде не выдуманы:
 * запрос «Красногвардейский, Невский, Калининский · 6–15 млн», девять строк,
 * арифметика 892 − 431 − 214 = 247, баланс 8 610 ₽.
 *
 * Страница живёт только в режиме разработки: настоящий маршрут появится,
 * когда за экраном будут данные, а не заглушки.
 */

/**
 * Какие строки показывает каждый таб.
 *
 * **Фильтрация настоящая, а не нарисованная.** Табы и чипы районов реально
 * сужают список, счётчик в шапке пересчитывается, и «Сбросить N» показывает,
 * сколько условий сейчас работает. Данные пока демонстрационные, но поведение
 * то самое: когда за экраном появится сеть, поменяется источник строк,
 * а не логика.
 */
const TAB_FILTER: Record<string, (row: SearchRow) => boolean> = {
  all: () => true,
  new: (row) => row.freshnessMinutes <= 60 * 24,
  "not-called": (row) => row.status !== "called" && row.status !== "disclosed",
  taken: (row) => row.takenBy !== undefined,
  mine: (row) => row.takenBy === "ИС",
  cheaper: (row) => row.deviation < -5,
}

/**
 * Как сортируется выдача.
 *
 * По свежести — по умолчанию: продукт обещает, что объявление собственника
 * живёт час-два до того, как его найдут все, и порядок обязан это отражать.
 * Остальные три — про деньги, и все три нужны разным людям: агент ищет,
 * что дешевле рынка, руководитель смотрит на дорогое.
 */
const SORTS = {
  fresh: { label: "по свежести", compare: (a: SearchRow, b: SearchRow) => a.freshnessMinutes - b.freshnessMinutes },
  cheap: { label: "сначала дешёвые", compare: (a: SearchRow, b: SearchRow) => a.priceValue - b.priceValue },
  expensive: { label: "сначала дорогие", compare: (a: SearchRow, b: SearchRow) => b.priceValue - a.priceValue },
  deviation: { label: "ниже рынка", compare: (a: SearchRow, b: SearchRow) => a.deviation - b.deviation },
} as const

type SortId = keyof typeof SORTS

/**
 * Ступени потолка цены — свои у каждого режима.
 *
 * У продажи миллионы, у аренды тысячи рублей в месяц: «до 15 млн» в аренде
 * не сужает ничего, потому что дороже пятнадцати миллионов в месяц квартир
 * не бывает. Общий набор означал бы, что в одном из режимов фильтр цены
 * просто не работает — и работал бы вид, а не фильтр.
 *
 * Значения аренды взяты из колонки, описанной в `АРЕНДА-v1.md`:
 * «от 40 000 · до 90 000». Единица хранится числом рублей, а подпись
 * собирается из режима.
 */
const PRICE_CAPS: Record<SearchMode, readonly number[]> = {
  sale: [8, 15, 25, 0],
  rent: [40_000, 60_000, 90_000, 0],
}

/** Потолок по умолчанию: то, с чем открывается выдача в этом режиме. */
const PRICE_CAP_DEFAULT: Record<SearchMode, number> = { sale: 15, rent: 90_000 }

/** Во сколько раз ступень больше рубля. Продажа считается в миллионах. */
const PRICE_UNIT: Record<SearchMode, number> = { sale: 1_000_000, rent: 1 }

/** Как ступень называется: «до 15 млн» или «до 90 000». */
function capLabel(mode: SearchMode, cap: number): string {
  if (cap === 0) return "без потолка"
  return mode === "sale" ? `до ${cap} млн` : `до ${cap.toLocaleString("ru-RU")}`
}

type Row = SearchRow

/**
 * Снять с объекта следы чужой работы.
 *
 * Остаются только факты о собственнике: он в стоп-листе, телефона нет, согласие
 * отозвано. Всё остальное — «взят в работу», «прозвонен», «раскрыт», «отказ» —
 * принадлежит агентству, которое это сделало, и новому агентству не переходит.
 */
const OWNER_FACTS = new Set(["stop-list", "no-phone", "revoked"])

/**
 * Как исход разговора выглядит в строке выдачи.
 *
 * Словарь один, и он здесь: два перевода — в панели звонка и в строке —
 * разъехались бы на первом же новом исходе, и объект показывал бы «в работе»
 * там, где агент отметил отказ.
 */
const OUTCOME_STATUS: Record<string, SearchRow["status"]> = {
  "в работе": "in-progress",
  дозвонился: "called",
  "не дозвонился": "called",
  отказ: "refused",
  посредник: "refused",
  отложен: "in-progress",
}

/**
 * Наложить на объект работу СВОЕГО агентства.
 *
 * Раньше здесь просто стиралось всё чужое, и строка навсегда оставалась
 * «новой»: человек платил 199 ₽, деньги списывались, счётчик отсчитывал —
 * а кнопка по-прежнему предлагала раскрыть за 199 ₽. Продукт не помнил, что
 * вы заплатили, и это первое, обо что спотыкались.
 *
 * Теперь состояние строки собирается из журналов: раскрыт — «Открыть · 0 ₽»,
 * прозвонен — исход последнего звонка, в стоп-листе — не звонить.
 *
 * Факты о собственнике не трогаются: стоп-лист, отсутствие телефона и отзыв
 * согласия верны для всех агентств одинаково.
 */
function withAgencyWork(row: SearchRow, workspace: Workspace): SearchRow {
  if (row.status !== undefined && OWNER_FACTS.has(row.status)) {
    return { ...row, takenBy: undefined, selected: undefined }
  }

  if (workspace.stopList.includes(row.address)) {
    return {
      ...row,
      takenBy: undefined,
      selected: undefined,
      status: "stop-list",
      action: { kind: "blocked", label: "Просил не звонить" },
    }
  }

  const paid = disclosureOf(workspace, row.address)
  const call = lastCall(workspace, row.address)

  if (paid === undefined) {
    return {
      ...row,
      takenBy: undefined,
      selected: undefined,
      status: "new",
      action: { kind: "disclose", price: 199 },
    }
  }

  return {
    ...row,
    // Инициалы того, кто раскрыл. Пока агентство одно — свои, но поле уже
    // отвечает на вопрос «кто взял», а не показывает выдуманного коллегу.
    takenBy: initialsOf(paid.by) || undefined,
    selected: undefined,
    status: call ? (OUTCOME_STATUS[call.outcome] ?? "called") : "disclosed",
    // Второй раз агентство не платит — и кнопка обязана это говорить.
    action: { kind: "open" },
  }
}

/**
 * КАБИНЕТ · Поиск → Выдача.
 *
 * `dataset="measured"` показывает девять замеренных строк — это стенд для
 * сверки с макетом, и меняться он не должен. `dataset="all"` показывает всю
 * базу: двести шестьдесят объектов, по которым фильтры действительно сужают,
 * а счётчик в шапке действительно считает.
 */
export function SearchScreenPage({ dataset = "all" }: { dataset?: "all" | "measured" }) {
  /**
   * База — общая, работа по ней — своя.
   *
   * Объекты одни и те же у всех агентств: это рынок, а не имущество агентства.
   * А вот «в работе у АТ», «раскрыт», «прозвонен» — это работа конкретного
   * агентства, и в только что созданном её нет. Раньше новичок открывал выдачу
   * и видел, что половина объектов уже разобрана его несуществующими
   * коллегами.
   *
   * Три состояния при этом остаются: стоп-лист, отсутствие телефона и отзыв
   * согласия — это факты о собственнике, а не о работе агентства, и они верны
   * для всех одинаково.
   */
  const own = useOwnAgency()
  const session = useSession()
  const navigate = useNavigate()
  const workspace = useWorkspace()
  /**
   * Режим: продажа или аренда.
   *
   * Живёт выше фильтров, потому что меняет саму базу, а не сужает найденное.
   * На стенде сверки режима нет вовсе — там девять замеренных строк продажи,
   * и подставлять туда обойму значило бы дорисовать в замеренный кадр то,
   * чего в нём не было.
   */
  const [mode, setMode] = useState<SearchMode>("sale")
  const now = useNow()

  const base = useMemo(() => {
    if (dataset === "measured") return MEASURED_ROWS
    // Аренда пересобирается от «сейчас»: свежесть считается от даты
    // объявления, и постоянный список к вечеру начал бы врать на часы.
    // Час — достаточная точность и не заставляет пересобирать 211 строк
    // на каждой отрисовке.
    return mode === "rent" ? rentalRows(now) : ALL_ROWS
  }, [dataset, mode, now])

  const rows = useMemo(
    () => (own ? base.map((row) => withAgencyWork(row, workspace)) : base),
    [own, base, workspace],
  )
  /**
   * Открыли сохранённый поиск — условия приезжают из журнала.
   *
   * Ключ у состояния фильтров — идентификатор поиска. Это не приём ради
   * приёма: без него человек, перешедший с одного сохранённого поиска на
   * другой, оставался бы с условиями первого. React пересоздаёт состояние
   * при смене ключа, и условия встают те, которые открыли.
   *
   * Условия НЕ едут в адресе. Они уже лежат в журнале, и второй источник
   * правды разъехался бы с первым при первой же правке.
   */
  const { at, saved } = useSearch({ from: '/search', shouldThrow: false }) ?? {}
  const openedSearch = workspace.savedSearches.find((item) => item.id === saved)

  return (
    <SearchScreenBody
      key={openedSearch?.id ?? "free"}
      rows={rows}
      at={at}
      opened={openedSearch}
      authorName={session?.name ?? ""}
      navigate={navigate}
      mode={dataset === "measured" ? undefined : mode}
      onChangeMode={setMode}
    />
  )
}

function SearchScreenBody({
  rows,
  at,
  opened,
  authorName,
  navigate,
  mode,
  onChangeMode,
}: {
  rows: SearchRow[]
  at?: string
  opened?: SavedSearch
  /** Кто заводит поиск: имя из сеанса. Пусто — сеанса нет, но сюда без него не попасть. */
  authorName: string
  navigate: ReturnType<typeof useNavigate>
  /** Режим выдачи. `undefined` — стенд сверки, там режима нет. */
  mode?: SearchMode
  onChangeMode: (next: SearchMode) => void
}) {
  const [activeTab, setActiveTab] = useState(opened?.query.tab ?? "all")
  /**
   * Плотность — общая настройка человека, а не состояние этого экрана.
   *
   * Раньше она жила здесь в `useState` и снималась при уходе с выдачи:
   * агент включал плотный режим, шёл в подборки и возвращался в просторный.
   * Теперь выбор помнится между заходами и действует на все таблицы сразу
   * (`@/platform/density`).
   */
  const [dense, setDense] = useDensity()
  const [sort, setSort] = useState<SortId>((opened?.query.sort as SortId | undefined) ?? "fresh")
  /** Потолок цены в миллионах. 0 — без потолка. */
  const [priceCap, setPriceCap] = useState(
    opened?.query.priceCap ?? PRICE_CAP_DEFAULT[mode ?? "sale"],
  )

  /**
   * Сменили режим — потолок цены встаёт на свой.
   *
   * «До 15 млн» в аренде не сужает ничего: дороже пятнадцати миллионов
   * в месяц квартир не бывает. Оставить чужой потолок значило бы показать
   * работающий на вид фильтр, который ничего не делает.
   *
   * Правится в рендере, а не эффектом: состояние зависит от изменившегося
   * входного значения, и это тот случай, для которого React такую правку
   * и разрешает.
   */
  const [wasMode, setWasMode] = useState(mode)
  if (wasMode !== mode) {
    setWasMode(mode)
    setPriceCap(PRICE_CAP_DEFAULT[mode ?? "sale"])
  }
  const [rooms, setRooms] = useState<number[]>(opened?.query.rooms ?? [])
  const [districts, setDistricts] = useState<string[]>(
    opened?.query.districts ?? ["krasnogvardeisky", "nevsky", "kalininsky"],
  )
  /**
   * Строка под курсором.
   *
   * Начальное значение берётся из данных, а не из нуля: в файле выбрана
   * четвёртая строка — «Новочеркасский пр., 47», та, у которой действие
   * «Раскрыть». Экран открывается с курсором на первом объекте, за который
   * ещё не платили, и клавиша Enter сразу осмысленна.
   */
  /**
   * Курсор держится за адрес, а не за номер строки.
   *
   * Номер строки врёт при первой же смене условий: сменил сортировку —
   * и под курсором оказался другой объект, хотя человек ничего не выбирал.
   * Адрес переживает и фильтр, и сортировку; если объект ушёл из выдачи,
   * курсор честно пропадает, а не показывает на соседа.
   */
  const [chosen, setChosen] = useState<string | null>(null)

  /**
   * Колонка фильтров: стоит в раскладке или прячется за полоску.
   *
   * Решает ширина окна, а не человек. Открытое наложение закрывается само,
   * когда окно снова стало широким: иначе панель осталась бы висеть поверх
   * выдачи рядом с такой же колонкой в раскладке.
   */
  /**
   * Ограничение по адресу.
   *
   * Сужает по совпадению в адресе: «Лиговский» оставит весь Лиговский
   * проспект. Радиус пока не сужает — координат у объектов нет, — и окно
   * говорит об этом прямо, а не делает вид.
   */
  const [nearAddress, setNearAddress] = useState("")
  const [addressOpen, setAddressOpen] = useState(false)

  const collapsed = useFilterCollapse()
  const [open, setOpen] = useState(false)

  // Правка состояния прямо в рендере, а не эффектом: эффект здесь дал бы
  // лишний проход отрисовки, и правило `react-hooks` запрещает его прямо.
  // Это тот самый случай, для которого React такую правку и разрешает —
  // состояние зависит от изменившегося входного значения.
  const [wasCollapsed, setWasCollapsed] = useState(collapsed)
  if (wasCollapsed !== collapsed) {
    setWasCollapsed(collapsed)
    setOpen(false)
  }

  /**
   * Escape закрывает панель фильтров.
   *
   * Второй способ закрытия после нажатия мимо. Всплывающий слой без Escape
   * ловит человека, который привык закрывать так всё остальное, — и он
   * решает, что слой не закрывается вовсе.
   */
  useHotkeys({ Escape: () => setOpen(false) })

  /**
   * Курсор: сначала выбранный человеком, потом пришедший адресом, потом
   * строка из макета.
   *
   * Считается прямо в рендере, а не переносится в состояние эффектом.
   * Эффект здесь означал бы лишний проход отрисовки и — что хуже — терял бы
   * адрес, если человек вернулся из прозвона на уже открытую выдачу.
   */

  const setCursorAddress = setChosen

  /**
   * Открыть карточку объекта.
   *
   * Адрес уезжает параметром: карточка обязана показывать ТОТ объект, на
   * который нажали. До этого карточка была одна на всю базу — адрес стоял
   * в ней константой, и все 260 строк вели в одну и ту же квартиру.
   */
  const openCard = (address: string) => {
    void navigate({ to: "/object", search: { at: address } })
  }
  /**
   * След последнего нажатия.
   *
   * **Он не рисуется на экране.** В файле для «B — в подборку» и «S — статус»
   * нет ни плашки, ни тоста, а придумывать их я не имею права: клавиши
   * обязаны открывать те же окна, что и мышь, и эти окна ещё не нарисованы.
   * До тех пор след живёт атрибутом `data-last-action` — его видит проверка
   * и увидит следующий разработчик, а человеку ничего лишнего не показано.
   */
  const [trace, setTrace] = useState<string | null>(null)

  /**
   * Объект, который кладут в подборку. Адрес, а не флаг: окно должно знать,
   * что именно добавляет, и подпись в нём это называет.
   */
  const [collecting, setCollecting] = useState<string | null>(null)

  /**
   * Что видно после всех условий.
   *
   * **Условия складываются, а не спорят.** Таб, район, потолок цены
   * и комнатность сужают список каждый по-своему, и «Сбросить N» считает,
   * сколько их сейчас работает. Это и есть ответ на вопрос «почему нашлось
   * так мало» — без него человек решает, что сломался поиск.
   */
  const visible = rows
    .filter((row) => (TAB_FILTER[activeTab] ?? TAB_FILTER.all!)(row))
    .filter((row) => districts.length === 0 || districts.includes(row.district))
    .filter((row) => priceCap === 0 || row.priceValue <= priceCap * PRICE_UNIT[mode ?? "sale"])
    .filter((row) => rooms.length === 0 || rooms.includes(row.rooms))
    .filter(
      (row) =>
        nearAddress === "" ||
        row.address.toLowerCase().includes(nearAddress.toLowerCase()),
    )
    .sort(SORTS[sort].compare)

  /**
   * Курсор по умолчанию — первая видимая строка, за которую ещё не платили.
   *
   * Раньше он брался из данных: в замеренных строках одна помечена выбранной.
   * После того как состояние строки стало собираться из работы агентства,
   * помеченных строк не осталось вовсе, и выдача открывалась без курсора —
   * клавиатура не работала до первого щелчка мышью.
   *
   * Считается ПОСЛЕ фильтров, а не до: курсор на строке, которую отфильтровали,
   * — это курсор в никуда.
   */
  const cursorAddress =
    chosen ??
    at ??
    rows.find((row) => row.selected)?.address ??
    visible.find((row) => row.action.kind === "disclose")?.address ??
    visible[0]?.address ??
    null

  const cursor = cursorAddress === null ? -1 : visible.findIndex((row) => row.address === cursorAddress)

  const toggleDistrict = (id: string) =>
    setDistricts((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )

  /**
   * Раскрытие контакта: 199 ₽ уходят со счёта агентства.
   *
   * **Списание видно в шапке, а не тостом.** Так записано в спеке движения:
   * деньги оставляют постоянный след — в балансе, в таймлайне объекта
   * и в журнале доступа, — а тост исчезает через четыре секунды и следом
   * не является. Счётчик в шапке идёт 600 мс: это и есть подтверждение.
   *
   * Второй раз за тот же объект агентство не платит — правило продукта,
   * а не защита от двойного нажатия.
   */
  const actions = useSessionActions()

  const disclose = (row: Row) => {
    if (row.action.kind !== "disclose") return

    // Курсор прибивается к оплаченной строке.
    //
    // Без этого он уезжал: по умолчанию курсор стоит на первой строке, за
    // которую ещё не платили, а оплаченная перестаёт быть такой — и подсветка
    // сама собой перепрыгивала на соседний объект сразу после списания.
    // Человек платил за один объект и оказывался с курсором на другом.
    setCursorAddress(row.address)

    const result = actions.disclose(row.address)
    if (result === "already") {
      setTrace(`${row.address} · контакт уже раскрыт, второй раз не списываем`)
    } else if (result === "trial") {
      setTrace(`${row.address} · раскрыт, пробное раскрытие`)
    } else if (result === "paid") {
      setTrace(`${row.address} · раскрыт, списано 199 ₽`)
    } else {
      setTrace(`${row.address} · не хватает денег на счету`)
    }
  }

  /**
   * Клавиши строки выдачи: ↑ ↓ ходят, B в подборку, S статус, H напомнить,
   * N заметка. Карта из спеки движения — она же нарисована в `L0qKK`.
   *
   * **Курсор один на мышь и клавиатуру.** Щелчок по строке переносит его
   * туда же, куда его привели бы стрелки: две подсветки сразу — мышиная
   * и клавиатурная — заставляют гадать, к чему относится следующее нажатие.
   * Escape убирает курсор совсем.
   */
  const step = (delta: number) => {
    if (visible.length === 0) return
    const next =
      cursor < 0
        ? delta > 0
          ? 0
          : visible.length - 1
        : (cursor + delta + visible.length) % visible.length
    setCursorAddress(visible[next]?.address ?? null)
  }

  const act = (label: string) => {
    const row = visible[cursor]
    if (!row) {
      setTrace("нужна строка")
      return
    }
    setTrace(`${row.address} · ${label}`)
  }

  useHotkeys({
    ArrowDown: () => step(1),
    ArrowUp: () => step(-1),
    j: () => step(1),
    k: () => step(-1),
    s: () => act("сменить статус"),
    h: () => act("напомнить"),
    n: () => act("заметка"),
    /**
     * `Enter` открывает карточку объекта под курсором.
     *
     * Раньше он сразу раскрывал контакт — то есть списывал 199 ₽ одним
     * нажатием, без экрана, на котором видно, за что платишь. Это опасно и
     * это не то, чего ждут: `Enter` в списке значит «открыть».
     *
     * Платное действие осталось у кнопки в строке и у кнопки в карточке —
     * там, где рядом написана цена.
     */
    Enter: () => {
      const row = visible[cursor]
      if (row) openCard(row.address)
    },
    ArrowRight: () => {
      const row = visible[cursor]
      if (row) openCard(row.address)
    },
    b: () => {
      const row = visible[cursor]
      if (row) setCollecting(row.address)
    },
    Escape: () => {
      setCursorAddress(null)
      setTrace(null)
    },
  })

  /**
   * Условия одной строкой — для свёрнутой полоски.
   *
   * Считается из того же состояния, что и сама колонка: второго описания
   * условий в продукте быть не должно, иначе полоска и колонка разойдутся
   * молча, и человек будет читать в полоске одно, а видеть другое.
   */
  const summary = [
    districts.length === 0
      ? "все районы"
      : districts.map((id) => DISTRICTS.find((item) => item.id === id)?.label ?? id).join(" · "),
    ...rooms.map((room) => `${room}-к`),
    priceCap === 0 ? null : capLabel(mode ?? "sale", priceCap),
    activeTab === "all" ? null : "вкладка сужена",
  ]
    .filter((part): part is string => part !== null)
    .join(" · ")

  const activeCount =
    districts.length + rooms.length + (priceCap === 0 ? 0 : 1) + (activeTab === "all" ? 0 : 1)

  const resetFilters = () => {
    setDistricts([])
    setRooms([])
    setPriceCap(0)
    setActiveTab("all")
  }

  const panel = (
        <FilterPanel
          mode={mode}
          onChangeMode={onChangeMode}
          overlay={collapsed}
          activeCount={activeCount}
          onToggle={(group, id) => {
            if (group === "district") toggleDistrict(id)
            if (group === "price") setPriceCap(Number.parseInt(id, 10))
            if (group === "more") {
              const room = Number.parseInt(id, 10)
              if (Number.isFinite(room)) {
                setRooms((current) =>
                  current.includes(room)
                    ? current.filter((item) => item !== room)
                    : [...current, room],
                )
              }
            }
          }}
          onReset={resetFilters}
          onChangeAddress={() => setAddressOpen(true)}
          districts={[
            DISTRICTS.slice(0, 1).map((item) => ({
              id: item.id,
              label: item.label,
              selected: districts.includes(item.id),
            })),
            DISTRICTS.slice(1, 3).map((item) => ({
              id: item.id,
              label: item.label,
              selected: districts.includes(item.id),
            })),
            DISTRICTS.slice(3).map((item) => ({
              id: item.id,
              label: item.label,
              selected: districts.includes(item.id),
            })),
          ]}
          price={[
            mode === "rent" ? "от 40 000" : "6 000 000",
            capLabel(mode ?? "sale", priceCap),
          ]}
          area={["от 40", "до 80"]}
          floor={[
            [
              { id: "not-first", label: "не первый", selected: true },
              { id: "not-last", label: "не последний" },
            ],
          ]}
          metro={[
            [{ id: "ligovsky", label: "Лиговский проспект", selected: true }],
            [
              { id: "obvodny", label: "Обводный канал", muted: true },
              { id: "add-station", label: "+ станция", muted: true },
            ],
            [
              { id: "walk-10", label: "до 10 мин", selected: true },
              { id: "walk-20", label: "до 20 мин" },
            ],
          ]}
          nearAddress={nearAddress === "" ? undefined : nearAddress}
          more={[
            [1, 2, 3, 4].map((room) => ({
              id: String(room),
              label: `${room}-к`,
              selected: rooms.includes(room),
            })),
            PRICE_CAPS[mode ?? "sale"].map((cap) => ({
              id: String(cap),
              label: capLabel(mode ?? "sale", cap),
              selected: priceCap === cap,
            })),
          ]}
          onSaveSearch={() => {
            const name = summary === "" ? "Новый поиск" : summary
            saveSearch(name, { districts, rooms, priceCap, tab: activeTab, sort }, authorName)
            void navigate({ to: "/searches" })
          }}
        />
  )

  return (
    <CabinetShell activeId="search">
        {/* На широком окне колонка стоит в раскладке и всегда видна.
            На узком — уходит в полоску над выдачей и открывается наложением
            поверх неё. Решает окно, а не человек: см. `useFilterCollapse`. */}
        {collapsed ? null : panel}

        {collapsed && open ? (
          <>
            {/*
              Затемнение накрывает ВСЁ тело, включая сайдбар, — так в кадре
              `C4zkJ`: слой 1280 × 968 от левого края.
              
              Первая сборка начинала его от края сайдбара, «чтобы можно было
              уйти в другой раздел не закрывая фильтры». Звучит разумно, но
              на деле давало обратное: нажатие слева не закрывало панель,
              и владелец сказал «фильтр не убирается». Закрывать обязано
              нажатие в любом месте вне панели — это единственная отмена,
              которая есть у всплывающего слоя по умолчанию.

              Выдача при этом остаётся видна справа: панель 260 не закрывает
              её, а лежит поверх левого края. Видеть результат во время
              настройки принципиально — это первая претензия к конкуренту.
            */}
            <div
              data-slot="filter-scrim"
              className="fixed top-(--height-header) right-0 bottom-0 left-0 z-30 bg-[#1e1e1e26]"
              onPointerDown={() => setOpen(false)}
            />
            {panel}
          </>
        ) : null}

        <main
          data-slot="results"
          data-last-action={trace ?? undefined}
          className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-cell compact:gap-2.5"
        >
          {/* Число в шапке считается от того, что реально видно. Раньше оно
              было константой, и фильтр мог сузить список, не изменив цифру —
              это ровно то место, где интерфейс начинает врать. */}
          {/*
            Числа считаются от найденного, а не стоят константой.

            Доли взяты из `DEMO-DATA.md`: на 1 240 объявлений приходится
            630 дублей и 419 посредников, то есть на каждый оставшийся объект
            примерно 3,3 склеенных дубля и 2,2 отсеянных посредника. Иначе
            шапка обещала бы 892 объявления там, где показано двенадцать строк,
            и первый же внимательный человек поймал бы продукт на вранье.
          */}
          {collapsed ? (
            <FilterBar
              activeCount={activeCount}
              summary={summary}
              onOpen={() => setOpen(true)}
              onReset={resetFilters}
            />
          ) : null}

          <ResultsHeader
            listings={visible.length + Math.round(visible.length * 3.3) + Math.round(visible.length * 2.2)}
            duplicates={Math.round(visible.length * 3.3)}
            intermediaries={Math.round(visible.length * 2.2)}
            dense={dense}
            unit={mode === "rent" ? "₽/мес" : undefined}
          />

          <ResultTabs
            tabs={[
              { id: "all", label: "Все" },
              { id: "new", label: "Новые, 24 ч" },
              { id: "not-called", label: "Не прозвонены" },
              { id: "taken", label: "Взяли коллеги" },
              { id: "mine", label: "Мои в работе" },
              { id: "cheaper", label: "Снизили цену" },
            ]}
            activeId={activeTab}
            onSelect={setActiveTab}
            sortLabel={SORTS[sort].label}
            onToggleSort={() => {
              const ids = Object.keys(SORTS) as SortId[]
              setSort(ids[(ids.indexOf(sort) + 1) % ids.length]!)
            }}
            dense={dense}
            onToggleDensity={() => setDense(!dense)}
          />

          {/* Панель обрезает содержимое своим скруглением 16 и тянется на всю
              высоту колонки: в макете под последней строкой остаётся белое поле,
              а не серый фон страницы. */}
          {/*
            Список проявляется при смене условий — 120 мс, весь разом.

            Раньше он менялся мгновенно: человек трогал чип, и на месте
            двухсот строк оказывались тридцать без единого признака, что
            что-то произошло. Владелец описал это как «каталог выглядит
            мёртво».

            Ключ — подпись условий. Меняются условия — React перерисовывает
            панель заново, и затухание идёт с начала. Прокрутка и раскрытие
            в ключ НЕ входят: список, вспыхивающий на каждое нажатие внутри
            строки, раздражает сильнее, чем молчащий.

            Каскада по строкам нет и не будет — спека запрещает прямо.
            Тридцать строк, загорающихся по очереди, превращают смену
            фильтра в представление, а агент делает это по сто раз за смену.
          */}
          <div
            key={`${activeTab}|${sort}|${districts.join()}|${rooms.join()}|${priceCap}|${nearAddress}|${mode}`}
            className="list-in flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface"
          >
            {visible.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-20">
                <Typography variant="panelTitle" tone="default" align="center">
                  Ничего не найдено
                </Typography>
                <Typography variant="uiText" tone="secondary" align="center">
                  Условия сошлись в ноль. Снимите район или выберите другой таб.
                </Typography>
              </div>
            ) : (
              visible.map((row) => (
                <ListingRow
                  key={row.address}
                  {...row}
                  selected={row.address === cursorAddress}
                  // Первое нажатие ставит курсор, второе — открывает карточку.
                  // Так строка отвечает и на «выбрать», и на «посмотреть», а
                  // человек не открывает объект случайным касанием списка.
                  onOpen={() => {
                    if (row.address === cursorAddress) openCard(row.address)
                    else setCursorAddress(row.address)
                  }}
                  onAction={() => disclose(row)}
                />
              ))
            )}
          </div>
        </main>
      {/* Окно выбора подборки: клавиша `B` и кнопка в строке ведут сюда.
          Живёт на уровне экрана, а не строки: строк на экране полсотни,
          и полсотни окон в дереве — это полсотни лишних узлов. */}
      {addressOpen ? (
        <NearAddressDialog
          address={nearAddress}
          found={visible.length}
          onApply={setNearAddress}
          onClear={() => setNearAddress("")}
          onClose={() => setAddressOpen(false)}
        />
      ) : null}

      {collecting === null ? null : (
        <CollectionPicker
          address={collecting}
          by={authorName}
          onClose={() => setCollecting(null)}
        />
      )}
    </CabinetShell>
  )
}
