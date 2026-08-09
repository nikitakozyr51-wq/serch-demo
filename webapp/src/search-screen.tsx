import { useNavigate, useSearch } from "@tanstack/react-router"
import { motion } from "motion/react"
import { useMemo, useState } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { SPRING, useExit, useExitValue } from "@/platform/motion"
import { notifyDone, notifyError } from "@/platform/notify"

import { rentalRows } from "@/data/rental-rows"
import { ALL_ROWS, DISTRICTS, MEASURED_ROWS, type SearchRow } from "@/data/search-rows"
import { DISCLOSURE_PRICE, initialsOf, useOwnAgency, useSession, useSessionActions } from "@/features/auth"
import {
  CollectionPicker,
  csv,
  disclosureOf,
  download,
  fileName,
  lastCall,
  assignListings,
  saveSearch,
  setListingStatus,
  useNow,
  useWorkspace,
  type SavedSearch,
  type Workspace,
} from "@/features/workspace"
import { BalanceStoppedBar, CabinetShell, useHotkeys } from "@/features/cabinet"
import { useDensity } from "@/platform/density"
import {
  AssignAgentDialog,
  BulkStatusDialog,
  ChipPickerDialog,
  FilterBar,
  FilterPanel,
  ListingRow,
  SelectionBar,
  ResultsHeader,
  NearAddressDialog,
  ResultTabs,
  groupDigits,
  plural,
  photoFor,
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
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Остаются только факты о СОБСТВЕННИКЕ: телефона нет, согласие отозвано.
 * Всё остальное — «взят в работу», «прозвонен», «раскрыт», «отказ» —
 * принадлежит агентству, которое это сделало, и новому не переходит.
 *
 * **Стоп-лист отсюда убран.** Он был в этом наборе как «факт о собственнике»,
 * и из-за этого агентство, заведённое минуту назад, видело в выдаче три
 * строки «Просил не звонить». Но стоп-лист — реестр агентства: экран
 * `/agency/refusals` называет его «Собственный реестр отказов», и запись
 * в него делает сотрудник в панели звонка. Чужая отметка о чужом отказе —
 * ровно та «чужая работа», которую эта функция и должна снимать.
 */
const OWNER_FACTS = new Set(["no-phone", "revoked"])

/**
 * Что стоит в колонке действия у факта о собственнике.
 *
 * Подпись берётся из статуса, а не из данных строки. У «Товарищеского пр., 22»
 * в базе стоит `no-phone` с подписью «Возврат оформлен» — и она уезжала
 * в новое агентство вместе со статусом. Возврат оформляет агентство: это
 * его работа, а не свойство объекта, и в чужой выдаче ей делать нечего.
 */
const OWNER_FACT_ACTION: Record<string, Row["action"]> = {
  "no-phone": { kind: "blocked", label: "Номера нет", quiet: true },
  revoked: { kind: "blocked", label: "Контакт отозван", quiet: true },
}

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
 * Факты о собственнике не трогаются: отсутствие телефона и отзыв согласия
 * верны для всех агентств одинаково. Стоп-лист к ним не относится — он
 * приходит из журнала СВОЕГО агентства, см. `OWNER_FACTS`.
 */
function withAgencyWork(row: SearchRow, workspace: Workspace): SearchRow {
  if (row.status !== undefined && OWNER_FACTS.has(row.status)) {
    // Статус остаётся, подпись действия пересобирается: в данных рядом
    // с фактом о собственнике могла лежать чужая работа («Возврат оформлен»).
    return {
      ...row,
      takenBy: undefined,
      selected: undefined,
      action: OWNER_FACT_ACTION[row.status] ?? row.action,
    }
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
      // Ручной статус работает и до раскрытия: «отказ» ставят по объекту,
      // за который ещё не платили, и это обычный случай.
      status: (workspace.statuses[row.address] as SearchRow["status"]) ?? "new",
      action: { kind: "disclose", price: DISCLOSURE_PRICE },
    }
  }

  /*
    Поставленный рукой статус перебивает считанный.

    Обычно статус считается из журналов, и это честнее вписанного: считанный
    не может разойтись с работой. Но у агентства бывает знание, которого
    в журналах нет — объект ушёл с рынка, собственник передумал, коллега
    договорился по другому каналу. Тогда человек знает больше журнала,
    и его отметка старше.

    Факты о собственнике этим не перебиваются: они отсечены выше и сюда
    не доходят.
  */
  const manual = workspace.statuses[row.address]
  const assigned = workspace.assignments[row.address]
  const person = assigned === undefined
    ? undefined
    : workspace.people.find((item) => item.id === assigned)

  return {
    ...row,
    // Инициалы того, кто раскрыл, — или того, кому объект назначили:
    // назначение отвечает на тот же вопрос «кто взял» и оно свежее.
    takenBy: initialsOf(person?.name ?? paid.by) || undefined,
    selected: undefined,
    status: (manual as SearchRow["status"]) ??
      (call ? (OUTCOME_STATUS[call.outcome] ?? "called") : "disclosed"),
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
   * Условия, которые до этого были нарисованы и не работали.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * «Этаж» и «Метро» уходили в колонку с `selected: true` КОНСТАНТОЙ, а их
   * группы не были подключены к `onToggle` вовсе. Итог человек видел такой:
   * три условия стоят применёнными, снять их нельзя, нажатие по остальным
   * не меняет ни строки, а «Сбросить 4» оставляет их тёмными.
   *
   * Диапазоны цены и площади живут ДВУМЯ значениями: текстом, который человек
   * печатает, и числом, по которому идёт отбор. Одного не хватает: пока
   * в поле «6 00», числа ещё нет, а текст уже есть, и превращать его в ноль
   * на каждом нажатии значило бы обнулять выдачу посреди ввода.
   */
  const [ranges, setRanges] = useState({
    priceFrom: opened?.query.priceFrom === undefined ? "" : String(opened.query.priceFrom),
    priceTo: opened?.query.priceTo === undefined ? "" : String(opened.query.priceTo),
    areaFrom: opened?.query.areaFrom === undefined ? "" : String(opened.query.areaFrom),
    areaTo: opened?.query.areaTo === undefined ? "" : String(opened.query.areaTo),
  })
  const [floor, setFloor] = useState<("not-first" | "not-last")[]>(opened?.query.floor ?? [])
  const [metro, setMetro] = useState<string[]>(opened?.query.metro ?? [])
  const [walk, setWalk] = useState<number | undefined>(opened?.query.walk)

  /** Число из напечатанного. Пусто и мусор — «условие не задано». */
  const numberOf = (text: string) => {
    const digits = text.replace(/\D/g, "")
    return digits === "" ? undefined : Number(digits)
  }

  const conditions = {
    priceFrom: numberOf(ranges.priceFrom),
    priceTo: numberOf(ranges.priceTo),
    areaFrom: numberOf(ranges.areaFrom),
    areaTo: numberOf(ranges.areaTo),
    ...(floor.length > 0 ? { floor } : {}),
    ...(metro.length > 0 ? { metro } : {}),
    ...(walk === undefined ? {} : { walk }),
  }
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
  /** Какое окно выбора открыто: районы, станции или ничего. */
  const [picking, setPicking] = useState<"district" | "metro" | null>(null)

  /**
   * Что можно выбрать и сколько за каждым объектов.
   *
   * Счётчик считается по ТЕКУЩЕЙ базе режима, а не по всей: в аренде и продаже
   * это разные списки, и «Пионерская · 9» в аренде обещала бы девять квартир,
   * которых в аренде нет.
   */
  const districtOptions = DISTRICTS.map((item) => ({
    id: item.id,
    label: item.label,
    count: rows.filter((row) => row.district === item.id).length,
  }))

  const metroOptions = [...new Set(rows.map((row) => row.metro))]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((name) => ({
      id: name,
      label: name,
      count: rows.filter((row) => row.metro === name).length,
    }))

  /**
   * Три ряда районов: выбранное впереди, «+ район» последним.
   *
   * Ряды заданы явно, а не автопереносом, — это правило колонки из файла.
   * В первые два ряда встаёт то, что выбрано (а пока не выбрано ничего —
   * первые районы базы, как нарисовано в кадре), третий ряд занимает плюс.
   */
  const shownDistricts = (districts.length > 0 ? districts : DISTRICTS.slice(0, 3).map((d) => d.id))
    .map((id) => districtOptions.find((item) => item.id === id))
    .filter((item): item is (typeof districtOptions)[number] => item !== undefined)

  const districtChip = (item: (typeof districtOptions)[number]) => ({
    id: item.id,
    label: item.label,
    selected: districts.includes(item.id),
  })

  /**
   * Плюс несёт число невлезшего, а не молчит.
   *
   * В колонке три ряда, и выбранных районов может быть больше трёх. Первая
   * сборка молча их прятала: человек выбирал «Приморский», выдача сужалась
   * до 91 объекта, а в колонке его не было — то есть условие работало
   * невидимо. У чипа файла (`Eym57`) для этого есть отдельный узел
   * «Счётчик», и он ровно про такой случай.
   */
  const hiddenDistricts = Math.max(0, districts.length - 3)
  const hiddenMetro = Math.max(0, metro.length - 2)

  const districtRows = [
    shownDistricts.slice(0, 1).map(districtChip),
    shownDistricts.slice(1, 3).map(districtChip),
    [
      {
        id: "add-district",
        label: hiddenDistricts === 0 ? "+ район" : `+ район · ещё ${hiddenDistricts}`,
        muted: true,
      },
    ],
  ].filter((row) => row.length > 0)

  /** Метро: выбранные станции, «+ станция» и ступени пешей доступности. */
  const metroRows = [
    ...(metro.length === 0
      ? [[{ id: "Лиговский проспект", label: "Лиговский проспект", selected: false }]]
      : [metro.slice(0, 2).map((name) => ({ id: name, label: name, selected: true }))]),
    [
      {
        id: "add-station",
        label: hiddenMetro === 0 ? "+ станция" : `+ станция · ещё ${hiddenMetro}`,
        muted: true,
      },
    ],
    [
      { id: "walk-10", label: "до 10 мин", selected: walk === 10 },
      { id: "walk-20", label: "до 20 мин", selected: walk === 20 },
    ],
  ]

  // Сотрудники агентства нужны окну назначения: кому назначать.
  const workspace = useWorkspace()
  const [open, setOpen] = useState(false)
  /** Какое окно панели выбранного открыто. Их два, и разом не бывает. */
  const [bulkDialog, setBulkDialog] = useState<"status" | "assign" | null>(null)

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
    // Цена, площадь, этаж и метро. До этой правки четыре поля и семь чипов
    // колонки не участвовали в отборе вовсе: список не менялся ни на строку.
    .filter((row) => conditions.priceFrom === undefined || row.priceValue >= conditions.priceFrom)
    .filter((row) => conditions.priceTo === undefined || row.priceValue <= conditions.priceTo)
    .filter((row) => conditions.areaFrom === undefined || row.area >= conditions.areaFrom)
    .filter((row) => conditions.areaTo === undefined || row.area <= conditions.areaTo)
    .filter((row) => !floor.includes("not-first") || row.floor > 1)
    .filter((row) => !floor.includes("not-last") || row.floor < row.floors)
    .filter((row) => metro.length === 0 || metro.includes(row.metro))
    .filter((row) => walk === undefined || row.metroMinutes <= walk)
    .filter(
      (row) =>
        nearAddress === "" ||
        row.address.toLowerCase().includes(nearAddress.toLowerCase()),
    )
    .sort(SORTS[sort].compare)

  /**
   * Сколько объектов в каждом табе — числом, а не на глаз.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * В кадре `ZOB5K` у каждого таба стоит счётчик: 12 · 31 · 18 · 9 · 5.
   * Продукт их не рисовал вовсе — сверка геометрии нашла это как расхождение
   * позиций на 18–71 пиксель, но дело было не в позициях: таб без счётчика
   * не отвечает на вопрос, ради которого на него смотрят, — «а там вообще
   * что-нибудь есть».
   *
   * Считается ПО ТЕМ ЖЕ условиям, что и выдача, но без таба: иначе «Новые»
   * обещали бы двенадцать объектов, а по нажатию показывали два — остальные
   * десять отсекал бы район, выбранный в фильтрах. Счётчик, который врёт
   * после нажатия, хуже отсутствующего.
   *
   * У «Все» счётчика нет: он повторил бы число из строки результата выше.
   */
  const withoutTab = rows
    .filter((row) => districts.length === 0 || districts.includes(row.district))
    .filter((row) => priceCap === 0 || row.priceValue <= priceCap * PRICE_UNIT[mode ?? "sale"])
    .filter((row) => rooms.length === 0 || rooms.includes(row.rooms))
    .filter((row) => conditions.priceFrom === undefined || row.priceValue >= conditions.priceFrom)
    .filter((row) => conditions.priceTo === undefined || row.priceValue <= conditions.priceTo)
    .filter((row) => conditions.areaFrom === undefined || row.area >= conditions.areaFrom)
    .filter((row) => conditions.areaTo === undefined || row.area <= conditions.areaTo)
    .filter((row) => !floor.includes("not-first") || row.floor > 1)
    .filter((row) => !floor.includes("not-last") || row.floor < row.floors)
    .filter((row) => metro.length === 0 || metro.includes(row.metro))
    .filter((row) => walk === undefined || row.metroMinutes <= walk)
    .filter(
      (row) =>
        nearAddress === "" ||
        row.address.toLowerCase().includes(nearAddress.toLowerCase()),
    )

  const tabCount = (id: string) =>
    withoutTab.filter((row) => (TAB_FILTER[id] ?? TAB_FILTER.all!)(row)).length

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
  const session = useSession()

  /**
   * Раскрытие правда остановлено.
   *
   * Условие снято с самого списания (`disclose` в слое сеанса): пробные
   * кончились И на счету меньше цены раскрытия. Считать его здесь заново
   * другим способом значило бы завести второй источник правды о деньгах,
   * который разъедется с первым при первой же правке цены.
   */
  const stopped = session !== null && session.trial === 0 && session.balance < DISCLOSURE_PRICE

  /**
   * Отмеченные объекты — состояние СПИСКА, а не строки.
   *
   * До кадра `SUsxy` выделения в продукте не было вовсе, и три собранных
   * окна — массовое раскрытие, панель выбранного и выгрузка — лежали
   * карточками на стенде `/dialogs`, потому что вызвать их было нечем.
   * Множество адресов, а не индексов: список пересобирается фильтрами,
   * и индекс третьей строки завтра означает другой объект.
   */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())

  const togglePicked = (address: string, next: boolean) => {
    setPicked((current) => {
      const copy = new Set(current)
      if (next) copy.add(address)
      else copy.delete(address)
      return copy
    })
  }

  /**
   * Выбор живёт только среди видимых строк.
   *
   * Сменил человек фильтр — объекты, ушедшие из выдачи, уходят и из выбора:
   * иначе он нажал бы «Раскрыть 12 контактов», а списалось бы за объекты,
   * которых он уже не видит.
   */
  const pickedVisible = visible.filter((row) => picked.has(row.address))
  const payable = pickedVisible.filter((row) => row.action.kind === "disclose")

  /** Открыто ли окно «положить выбранное в подборку». */
  const [bulkCollection, setBulkCollection] = useState(false)
  const now = useNow()

  /**
   * Выгрузка выбранного — файлом, а не окном.
   *
   * Окно `hS4nq` с выбором XLSX/CSV собрано карточкой на стенде `/dialogs`
   * и настоящим наложением пока не стало. Отдавать вместо файла картинку
   * выбора формата значило бы оборвать дело на последнем шаге, поэтому
   * выгрузка идёт тем же способом, каким уже выгружается журнал доступа.
   *
   * **Раскрытых контактов в файле нет** — это условие согласия собственников,
   * и оно записано прямо в кадре. Телефон в выгрузке был бы утечкой.
   */
  const exportPicked = () => {
    const content = csv(
      ["Адрес", "Цена", "Отклонение", "Метро", "Комнат", "Площадь", "Статус", "Взял"],
      pickedVisible.map((row) => [
        row.address,
        row.price,
        `${row.deviation} %`,
        row.metro,
        row.rooms,
        row.area,
        row.status ?? "новый",
        row.takenBy ?? "",
      ]),
    )
    download(fileName("выбранные-объекты", now), content)
    notifyDone(`Выгружено ${pickedVisible.length} в файл`)
  }

  /**
   * Раскрыть всё отмеченное разом.
   *
   * Идёт по одному через ту же дверь, что и одиночное раскрытие: второй
   * способ списывать деньги завёл бы второй набор правил — про пробные,
   * про уже раскрытое, про нехватку счёта — и они разъехались бы.
   *
   * Останавливается, как только деньги кончились: списать половину и молча
   * бросить остальное — худший из возможных исходов для кнопки, на которой
   * написана сумма.
   */
  const disclosePicked = () => {
    let paid = 0
    let free = 0
    for (const row of payable) {
      const result = actions.disclose(row.address)
      if (result === "no-money") {
        notifyError(
          paid + free === 0
            ? "На счету агентства не хватает денег"
            : `Раскрыто ${paid + free}, дальше денег не хватило`,
        )
        setPicked(new Set())
        return
      }
      if (result === "trial") free += 1
      if (result === "paid") paid += 1
    }
    notifyDone(
      free === 0
        ? `Раскрыто ${paid}, списано ${paid * DISCLOSURE_PRICE} ₽`
        : `Раскрыто ${paid + free}, из них ${free} пробных`,
    )
    setPicked(new Set())
  }

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
    /**
     * Esc снимает выбор — так написано в самой панели выбранного и в подписи
     * кадра `aT2KC`. Сначала выбор, потом курсор: пока отмечены объекты,
     * человек ждёт от Esc именно снятия отметок, а не сброса подсветки.
     */
    Escape: () => {
      if (picked.size > 0) {
        setPicked(new Set())
        return
      }
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
    conditions.priceFrom === undefined ? null : `от ${groupDigits(conditions.priceFrom)} ₽`,
    conditions.priceTo === undefined ? null : `до ${groupDigits(conditions.priceTo)} ₽`,
    conditions.areaFrom === undefined ? null : `от ${conditions.areaFrom} м²`,
    conditions.areaTo === undefined ? null : `до ${conditions.areaTo} м²`,
    ...floor.map((item) => (item === "not-first" ? "не первый" : "не последний")),
    ...metro,
    walk === undefined ? null : `до ${walk} мин`,
    activeTab === "all" ? null : "вкладка сужена",
  ]
    .filter((part): part is string => part !== null)
    .join(" · ")

  /**
   * Сколько условий сейчас сужают выдачу.
   *
   * Считает ВСЕ условия, а не четыре из одиннадцати. До этого тёмных чипов
   * в колонке было семь, а кнопка говорила «Сбросить 4»: три чипа рисовались
   * выбранными константой и в счёт не попадали, потому что их не было
   * в состоянии вовсе.
   */
  const activeCount =
    districts.length
    + rooms.length
    + (priceCap === 0 ? 0 : 1)
    + [conditions.priceFrom, conditions.priceTo, conditions.areaFrom, conditions.areaTo].filter(
      (value) => value !== undefined,
    ).length
    + floor.length
    + metro.length
    + (walk === undefined ? 0 : 1)
    + (activeTab === "all" ? 0 : 1)

  const resetFilters = () => {
    setDistricts([])
    setRooms([])
    setPriceCap(0)
    setActiveTab("all")
    // Сброс обязан снимать ВСЁ, что показано применённым. Раньше три условия
    // оставались тёмными после «Сбросить», потому что жили константой,
    // а не состоянием: колонка утверждала «не первый · Лиговский проспект ·
    // до 10 мин» при выдаче из всей базы.
    setRanges({ priceFrom: "", priceTo: "", areaFrom: "", areaTo: "" })
    setFloor([])
    setMetro([])
    setWalk(undefined)
  }

  /**
   * Три слоя выдачи уходят не мгновенно, а за своё время.
   *
   * ═════════════════════════════════════════════════════════════════════════
   *
   * Колонка фильтров, окно адреса и окно подборки закрывались подменой кадра:
   * нажал мимо — и слоя нет. Появление у всех трёх было, исчезновения не было
   * ни у одного. Теперь узел живёт ещё 120 мс (200 у колонки — она проходит
   * всю свою ширину) и всё это время рисует уход.
   *
   * Адрес окно переживает само: `nearAddress` при закрытии не меняется.
   * А вот подборке нужен адрес объекта, и `collecting` в момент закрытия
   * уже пуст — для этого случая в `platform/motion` лежит `useExitValue`:
   * он придерживает последнее непустое значение ровно на время ухода.
   */
  const filters = useExit(open, 200)
  const address = useExit(addressOpen)
  const picker = useExitValue(picking)
  const collectPicker = useExitValue(collecting)

  const panel = (
        <FilterPanel
          mode={mode}
          onChangeMode={onChangeMode}
          overlay
          leaving={filters.leaving}
          activeCount={activeCount}
          onToggle={(group, id) => {
            if (group === "district") {
              // «+ район» — не условие, а дверь к остальным районам.
              if (id === "add-district") setPicking("district")
              else toggleDistrict(id)
            }
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
            // Две группы, которых в этом обработчике не было вовсе, — из-за
            // чего семь чипов колонки нажимались и не делали ничего.
            if (group === "floor") {
              const rule = id as "not-first" | "not-last"
              setFloor((current) =>
                current.includes(rule)
                  ? current.filter((item) => item !== rule)
                  : [...current, rule],
              )
            }
            if (group === "metro") {
              if (id === "add-station") {
                setPicking("metro")
                return
              }
              // Пешая доступность — одно значение, а не набор: «до 10 мин»
              // и «до 20 мин» вместе означали бы «до 20», то есть первое
              // условие молча пропадало бы.
              const minutes = id.startsWith("walk-") ? Number(id.slice(5)) : undefined
              if (minutes !== undefined) {
                setWalk((current) => (current === minutes ? undefined : minutes))
                return
              }
              setMetro((current) =>
                current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
              )
            }
          }}
          onChangeRange={(edge, value) => {
            const key =
              edge === "price-from"
                ? "priceFrom"
                : edge === "price-to"
                  ? "priceTo"
                  : edge === "area-from"
                    ? "areaFrom"
                    : "areaTo"
            setRanges((current) => ({ ...current, [key]: value }))
          }}
          onReset={resetFilters}
          onChangeAddress={() => setAddressOpen(true)}
          /*
            ТРИ РЯДА И «+ РАЙОН» — как в кадре `I55fb`.

            Здесь выводились все восемь районов базы подряд. В кадре в группе
            четыре чипа, и четвёртый — «+ район»: колонка показывает выбранное
            и даёт способ добавить остальное, а не перечисляет город. Восемь
            чипов переносились, и ритм колонки ломался — шаг между явными
            рядами 44, между перенесёнными строками 36.

            Первые три ряда держат выбранное (и первые районы базы, пока
            не выбрано ничего), остальное живёт за «+ район».
          */
          districts={districtRows}
          price={[ranges.priceFrom, ranges.priceTo]}
          area={[ranges.areaFrom, ranges.areaTo]}
          floor={[
            [
              { id: "not-first", label: "не первый", selected: floor.includes("not-first") },
              { id: "not-last", label: "не последний", selected: floor.includes("not-last") },
            ],
          ]}
          // Станции названы так, как они лежат в базе: чип «Лиговский
          // проспект» отбирает объекты у Лиговского проспекта, а не
          // подсвечивается сам по себе. Три ряда — из кадра `I55fb`.
          //
          // «+ станция» ОТКРЫВАЕТ ВЫБОР. Раньше это был чип без действия,
          // а станций в колонке стояло две из тридцати одной, что есть
          // в базе, — то есть фильтр по метро существовал для двух станций
          // города. Теперь за плюсом лежат все.
          metro={metroRows}
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
            // Новые условия уносятся вместе с остальными: сохранить поиск
            // и потерять половину условий хуже, чем не сохранить.
            saveSearch(
              name,
              { districts, rooms, priceCap, tab: activeTab, sort, ...conditions },
              authorName,
            )
            void navigate({ to: "/searches" })
          }}
        />
  )

  return (
    <CabinetShell activeId="search">
        {/*
          Колонки фильтров нет ни на одной ширине — решение владельца
          от 9 августа, кадры `aoguG`, `C4zkJ`, `E5kwP`.

          Прежде их было две модели: при 1360 и шире колонка 260 стояла
          в раскладке, уже — сворачивалась в полоску. Модель выбирало окно,
          и продукт вёл себя по-разному на ноутбуке и на мониторе. Теперь
          модель одна: полоска над списком, панель наложением по нажатию.

          Выдача от этого выросла с 940 до 1200, а строка — с 916 до 1176.
          Именно на эти 260 пикселей и встала фотография объекта: платить
          за неё ничем не пришлось.
        */}
        {filters.mounted ? (
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
              // Затемнение проявляется и гаснет за 120 мс — быстрее колонки.
              // Прежде оно возникало одним кадром: панель приезжала мягко,
              // а полэкрана темнело рывком, и рывок перебивал мягкость.
              className={cn(
                "fixed top-(--height-header) right-0 bottom-0 left-0 z-30 bg-[#1e1e1e59]",
                filters.leaving ? "scrim-out" : "scrim-in",
              )}
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
          <FilterBar
            activeCount={activeCount}
            summary={summary}
            onOpen={() => setOpen(true)}
            onReset={resetFilters}
          />

          {/*
            Плашка стоит НАД шапкой результатов и появляется ровно тогда,
            когда раскрытие правда остановилось: пробные кончились и денег
            меньше цены раскрытия. Условие то же самое, по которому отказывает
            само списание, — иначе плашка и деньги разъедутся, и человек
            прочитает «остановлено» там, где всё работает.
          */}
          {stopped ? (
            <BalanceStoppedBar
              onNotify={() => {
                notifyDone("Руководителю показано, что деньги кончились")
                setTrace("руководителю сообщено о нулевом балансе")
              }}
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
              { id: "new", label: "Новые, 24 ч", count: tabCount("new") },
              { id: "not-called", label: "Не прозвонены", count: tabCount("not-called") },
              { id: "taken", label: "Взяли коллеги", count: tabCount("taken") },
              { id: "mine", label: "Мои в работе", count: tabCount("mine") },
              { id: "cheaper", label: "Снизили цену", count: tabCount("cheaper") },
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
            // Ключ перечисляет ВСЕ условия: список обязан переигрывать
            // появление на каждую смену условий, а не только на четыре
            // из одиннадцати.
            key={`${activeTab}|${sort}|${districts.join()}|${rooms.join()}|${priceCap}|${nearAddress}|${mode}|${ranges.priceFrom}|${ranges.priceTo}|${ranges.areaFrom}|${ranges.areaTo}|${floor.join()}|${metro.join()}|${walk ?? ""}`}
            /*
              Список прокручивается сам, а не режет содержимое.

              Стояло `overflow-hidden`: пятьдесят три строки в панели на
              836 пикселей — пятнадцать видно, тридцать восемь недоступны
              ничем, ни колесом, ни клавишей. Скругление панели требует
              обрезки, но обрезка без прокрутки — это потеря данных.

              `overscroll-contain` не даёт прокрутке перескочить на страницу,
              когда список кончился: иначе колесо у нижней строки уводит
              весь кабинет.
            */
            data-slot="results-list"
            /*
              Затухания всей панели здесь больше нет — появление несут строки.

              Раньше `.list-in` гасил и проявлял панель целиком. Когда строки
              стали приезжать волной, панель поверх них давала второе движение
              на то же событие: список ехал и одновременно проявлялся, и это
              читалось как подтормаживание, а не как плавность. Одно событие —
              одно движение.
            */
            className="flex flex-1 flex-col overflow-y-auto overscroll-contain rounded-2xl bg-surface"
          >
            {visible.length === 0 ? (
              // Пустота приезжает тем же движением, что приехала бы первая
              // строка: иначе «Ничего не найдено» возникает рывком ровно там,
              // где только что была живая волна.
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING.enter}
                className="flex flex-1 flex-col items-center justify-center gap-2 px-20"
              >
                <Typography variant="panelTitle" tone="default" align="center">
                  Ничего не найдено
                </Typography>
                <Typography variant="uiText" tone="secondary" align="center">
                  Условия сошлись в ноль. Снимите район или выберите другой таб.
                </Typography>
              </motion.div>
            ) : (
              visible.map((row, order) => (
                <ListingRow
                  key={row.address}
                  photo={photoFor(row.address)}
                  {...row}
                  // Номер задаёт очередь появления. Он есть только в продукте:
                  // стенды сверки строку показывают неподвижной, чтобы снимок
                  // был одинаковым сегодня и через месяц.
                  index={order}
                  /*
                    Колонка выбора стоит только в ПРОДУКТЕ, не на стенде.

                    Кадр `SUsxy` рисует её включённой, базовый кадр выдачи
                    `ghwPj` — нет, и оба правы: слот в файле включён ровно
                    на одном кадре. Стенд обязан совпадать с базовым кадром
                    до пикселя, а продукту нужен вход в выбор — иначе первую
                    отметку поставить нечем и три собранных окна остаются
                    недостижимы. `mode` здесь и означает «это продукт»:
                    у стенда режима нет.
                  */
                  selectable={mode !== undefined}
                  checked={picked.has(row.address)}
                  onCheckedChange={(next) => togglePicked(row.address, next)}
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

          {/*
            Панель выбранного стоит ПОД списком, а не поверх него: список
            ужимается ровно на её высоту, и выбранные строки остаются видны.
            Так требует подпись кадра `aT2KC` и так нарисовано в `SUsxy`.
          */}
          {pickedVisible.length > 0 ? (
            <SelectionBar
              count={pickedVisible.length}
              payable={payable.length}
              price={payable.length * DISCLOSURE_PRICE}
              onClear={() => setPicked(new Set())}
              onDisclose={disclosePicked}
              onCollection={() => setBulkCollection(true)}
              onExport={exportPicked}
              onStatus={() => setBulkDialog("status")}
              onAssign={() => setBulkDialog("assign")}
            />
          ) : null}
        </main>
      {/*
        Два окна панели выбранного. Оба были нарисованы (`a9lIk`, `jUJgJ`)
        и оба не открывались: у кнопок стоял только атрибут `data-action` —
        намерение вместо исполнения. Человек выделял двенадцать объектов,
        нажимал «Сменить статус» и не получал ничего.
      */}
      {bulkDialog === "status" ? (
        <BulkStatusDialog
          count={pickedVisible.length}
          onApply={(status, label) => {
            setListingStatus(pickedVisible.map((row) => row.address), status)
            setBulkDialog(null)
            setPicked(new Set())
            notifyDone(
              `Статус «${label}» поставлен ${pickedVisible.length} ${plural(pickedVisible.length, "объекту", "объектам", "объектам")}`,
            )
          }}
          onClose={() => setBulkDialog(null)}
        />
      ) : null}

      {bulkDialog === "assign" ? (
        <AssignAgentDialog
          count={pickedVisible.length}
          people={workspace.people.map((person) => ({
            id: person.id,
            name: person.name,
            note:
              person.role === "owner"
                ? "руководитель · без лимита"
                : `агент · ${person.limit === null ? "без лимита" : `до ${person.limit} в день`}`,
          }))}
          onAssign={(personId, name) => {
            assignListings(pickedVisible.map((row) => row.address), personId)
            setBulkDialog(null)
            setPicked(new Set())
            notifyDone(
              `${pickedVisible.length} ${plural(pickedVisible.length, "объект", "объекта", "объектов")} у ${name}`,
            )
          }}
          onClose={() => setBulkDialog(null)}
        />
      ) : null}

      {/* Окно выбора подборки: клавиша `B` и кнопка в строке ведут сюда.
          Живёт на уровне экрана, а не строки: строк на экране полсотни,
          и полсотни окон в дереве — это полсотни лишних узлов. */}
      {address.mounted ? (
        <NearAddressDialog
          address={nearAddress}
          found={visible.length}
          onApply={setNearAddress}
          onClear={() => setNearAddress("")}
          onClose={() => setAddressOpen(false)}
          leaving={address.leaving}
        />
      ) : null}

      {/*
        Выбор района и станции — за плюсами в колонке.

        Окно одно на две группы: вопрос у них один — «добавить из полного
        списка», — и второе окно разошлось бы с первым на первой же правке.
        Уход рисуется тем же `useExit`, что у окна адреса.
      */}
      {picker.mounted ? (
        <ChipPickerDialog
          key={picker.value ?? "picker"}
          title={picker.value === "metro" ? "Станции метро" : "Районы"}
          lead={
            picker.value === "metro"
              ? "Станции, у которых в базе есть объекты. Число рядом — сколько их сейчас."
              : "Районы Петербурга, по которым в базе есть объекты. Число рядом — сколько их сейчас."
          }
          label={picker.value === "metro" ? "НАЙТИ СТАНЦИЮ" : "НАЙТИ РАЙОН"}
          placeholder={picker.value === "metro" ? "Пионерская" : "Приморский"}
          options={picker.value === "metro" ? metroOptions : districtOptions}
          selected={picker.value === "metro" ? metro : districts}
          onApply={(next: string[]) => {
            if (picker.value === "metro") setMetro(next)
            else setDistricts(next)
          }}
          onClose={() => setPicking(null)}
          leaving={picker.leaving}
        />
      ) : null}

      {/* Та же дверь, что и для одного объекта: окно одно и умеет оба случая.
          Второе окно «положить двенадцать» разошлось бы с первым на первой же
          правке списка подборок. */}
      {bulkCollection ? (
        <CollectionPicker
          address={pickedVisible.map((row) => row.address)}
          by={authorName}
          onClose={() => {
            setBulkCollection(false)
            setPicked(new Set())
          }}
        />
      ) : null}

      {collectPicker.mounted ? (
        <CollectionPicker
          address={collectPicker.value ?? ""}
          by={authorName}
          onClose={() => setCollecting(null)}
          leaving={collectPicker.leaving}
        />
      ) : null}
    </CabinetShell>
  )
}
