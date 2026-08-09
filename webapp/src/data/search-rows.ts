import type { ListingAction } from "@/features/listings"
import type { ListingStatus } from "@/features/listings"
import { LISTINGS, type Listing } from "./listings"

/**
 * Строки выдачи: девять замеренных плюс вся база.
 *
 * **Девять первых — не данные, а образцы.** Они сняты с экрана `ghwPj`
 * до последнего слова и несут все восемь состояний объекта разом: в работе,
 * стоп-лист, отказ, нет телефона, контакт отозван, прозвонен, раскрыт, новый.
 * Такого набора в живой базе может не оказаться неделями, а сверять
 * с макетом надо каждый день — поэтому они стоят отдельно и не генерируются.
 *
 * **Остальные двести пятьдесят один — база.** Без них поиску нечего сужать:
 * на девяти строках фильтр по району либо оставляет всё, либо не оставляет
 * ничего, и проверить, что он работает, невозможно.
 *
 * Стенд показывает только замеренные, продукт — всё. Один компонент, два
 * набора: иначе снимок для сверки менялся бы каждый раз, когда в базе
 * появляется новый объект.
 */

export type SearchRow = {
  address: string
  price: string
  deviation: number
  freshness: string
  meta: string
  strength: "strong" | "medium" | "weak"
  publications: number
  platforms: number
  phones: number
  takenBy?: string
  status?: ListingStatus
  action: ListingAction
  selected?: boolean
  /** Поля для фильтрации: в разметку не попадают. */
  district: string
  districtName: string
  metro: string
  rooms: number
  area: number
  priceValue: number
  freshnessMinutes: number
  /**
   * Этаж и этажность — для группы фильтров «Этаж».
   *
   * До этого они существовали ТОЛЬКО внутри строки `meta` («4/9»), то есть
   * как текст для глаза. Из-за этого чипы «не первый» и «не последний»
   * нечем было применить, и они висели в колонке нажимаемыми и мёртвыми:
   * пятьдесят три строки до нажатия, пятьдесят три после.
   */
  floor: number
  floors: number
  /** Минут пешком до метро — для группы «Метро». Та же причина. */
  metroMinutes: number
  /**
   * Сколько сопоставимых объектов дали медиану, от которой считается
   * отклонение.
   *
   * Есть только у аренды: в продаже медиана района считается по сотням
   * объектов и всегда набирается. В аренде объявление живёт дни, и у каждого
   * десятого объекта аналогов меньше восьми — тогда отклонение показывать
   * нельзя вовсе. `undefined` означает «вопрос не стоит».
   */
  comparables?: number
  /**
   * Что за объект: квартира, комната, доля, апартаменты.
   *
   * Отдельным полем, а не выводом из комнатности: у комнаты и доли тоже
   * есть площадь и этаж, но это не квартиры, и человек ищет их иначе.
   * В продаже поля в выгрузке нет — там всё квартиры, и «flat» стоит
   * по умолчанию честно, а не для галочки.
   */
  kind?: "flat" | "room" | "share" | "apartments"
}

/**
 * Девять строк рабочего фильтра кабинета — дословно с экрана `ghwPj`.
 *
 * Адреса, цены и отклонения сходятся с `DEMO-DATA.md`. Свежесть и мета —
 * нет, и здесь закон файл: он даёт «14 минут» и «· Ладожская 6 мин · 2-к ·
 * 58 м² · 4/9 · Авито», то есть единый формат «сколько прошло», сокращение
 * «2-к» и этаж, которого в документе не было вовсе.
 *
 * Ведущая «·» принадлежит мете, а не разделителю: в файле это два текстовых
 * узла, и точка стоит в начале второго.
 */
export const MEASURED_ROWS: SearchRow[] = [
  {
    address: "Ленская ул., 10",
    price: "8,6 млн ₽",
    deviation: -12,
    freshness: "14 минут",
    meta: "· Ладожская 6 мин · 2-к · 58 м² · 4/9 · Авито",
    strength: "medium",
    publications: 3,
    platforms: 2,
    phones: 1,
    takenBy: "ИС",
    status: "in-progress",
    action: { kind: "open" },
    district: "krasnogvardeisky",
    districtName: "Красногвардейский",
    metro: "Ладожская",
    rooms: 2,
    area: 58,
    priceValue: 8_600_000,
    floor: 4,
    floors: 9,
    metroMinutes: 6,
    freshnessMinutes: 14,
  },
  {
    address: "Гражданский пр., 114",
    price: "12,8 млн ₽",
    deviation: -12,
    freshness: "38 минут",
    meta: "· Академическая 8 мин · 3-к · 71 м² · 6/9 · Циан",
    strength: "medium",
    publications: 2,
    platforms: 1,
    phones: 1,
    takenBy: "АТ",
    status: "in-progress",
    action: { kind: "open" },
    district: "kalininsky",
    districtName: "Калининский",
    metro: "Академическая",
    rooms: 3,
    area: 71,
    priceValue: 12_800_000,
    floor: 6,
    floors: 9,
    metroMinutes: 8,
    freshnessMinutes: 38,
  },
  {
    address: "Стахановцев ул., 14",
    price: "12,4 млн ₽",
    deviation: 0,
    freshness: "1 час",
    meta: "· Новочеркасская 8 мин · 3-к · 74 м² · 2/5 · Домклик",
    strength: "strong",
    publications: 1,
    platforms: 1,
    phones: 1,
    status: "stop-list",
    action: { kind: "blocked", label: "Просил не звонить" },
    district: "krasnogvardeisky",
    districtName: "Красногвардейский",
    metro: "Новочеркасская",
    rooms: 3,
    area: 74,
    priceValue: 12_400_000,
    floor: 2,
    floors: 5,
    metroMinutes: 8,
    freshnessMinutes: 60,
  },
  {
    address: "Новочеркасский пр., 47",
    price: "9,9 млн ₽",
    deviation: 18,
    freshness: "2 часа",
    meta: "· Новочеркасская 6 мин · 2-к · 61 м² · 7/9 · Авито",
    strength: "medium",
    publications: 2,
    platforms: 2,
    phones: 1,
    status: "called",
    selected: true,
    action: { kind: "disclose", price: 199 },
    district: "krasnogvardeisky",
    districtName: "Красногвардейский",
    metro: "Новочеркасская",
    rooms: 2,
    area: 61,
    priceValue: 9_900_000,
    floor: 7,
    floors: 9,
    metroMinutes: 6,
    freshnessMinutes: 120,
  },
  {
    address: "Дальневосточный пр., 68",
    price: "6,3 млн ₽",
    deviation: -9,
    freshness: "3 часа",
    meta: "· Пр. Большевиков 9 мин · 1-к · 36 м² · 3/12 · Яндекс",
    strength: "strong",
    publications: 1,
    platforms: 1,
    phones: 1,
    takenBy: "МЛ",
    status: "refused",
    action: { kind: "open" },
    district: "nevsky",
    districtName: "Невский",
    metro: "Пр. Большевиков",
    rooms: 1,
    area: 36,
    priceValue: 6_300_000,
    floor: 3,
    floors: 12,
    metroMinutes: 9,
    freshnessMinutes: 180,
  },
  {
    address: "Товарищеский пр., 22",
    price: "11,2 млн ₽",
    deviation: 0,
    freshness: "4 часа",
    meta: "· Пр. Большевиков 7 мин · 3-к · 68 м² · 5/9 · Авито",
    strength: "weak",
    publications: 3,
    platforms: 2,
    phones: 2,
    status: "no-phone",
    action: { kind: "blocked", label: "Возврат оформлен" },
    district: "nevsky",
    districtName: "Невский",
    metro: "Пр. Большевиков",
    rooms: 3,
    area: 68,
    priceValue: 11_200_000,
    floor: 5,
    floors: 9,
    metroMinutes: 7,
    freshnessMinutes: 240,
  },
  {
    address: "Передовиков ул., 21",
    price: "9,8 млн ₽",
    deviation: -6,
    freshness: "5 часов",
    meta: "· Ладожская 9 мин · 2-к · 59 м² · 7/9 · Аренда-Питер",
    strength: "strong",
    publications: 1,
    platforms: 1,
    phones: 1,
    takenBy: "ИС",
    status: "disclosed",
    action: { kind: "open" },
    district: "krasnogvardeisky",
    districtName: "Красногвардейский",
    metro: "Ладожская",
    rooms: 2,
    area: 59,
    priceValue: 9_800_000,
    floor: 7,
    floors: 9,
    metroMinutes: 9,
    freshnessMinutes: 300,
  },
  {
    address: "Наставников пр., 34",
    price: "10,1 млн ₽",
    deviation: 6,
    freshness: "6 часов",
    meta: "· Ладожская 10 мин · 2-к · 56 м² · 3/12 · Циан",
    strength: "weak",
    publications: 2,
    platforms: 2,
    phones: 2,
    status: "revoked",
    action: { kind: "blocked", label: "Контакт отозван", quiet: true },
    district: "krasnogvardeisky",
    districtName: "Красногвардейский",
    metro: "Ладожская",
    rooms: 2,
    area: 56,
    priceValue: 10_100_000,
    floor: 3,
    floors: 12,
    metroMinutes: 10,
    freshnessMinutes: 360,
  },
  {
    address: "Ленская ул., 6",
    price: "8,8 млн ₽",
    deviation: -10,
    freshness: "8 часов",
    meta: "· Ладожская 5 мин · 2-к · 57 м² · 8/9 · Авито",
    strength: "medium",
    publications: 2,
    platforms: 2,
    phones: 1,
    status: "called",
    action: { kind: "disclose", price: 199 },
    district: "krasnogvardeisky",
    districtName: "Красногвардейский",
    metro: "Ладожская",
    rooms: 2,
    area: 57,
    priceValue: 8_800_000,
    floor: 8,
    floors: 9,
    metroMinutes: 5,
    freshnessMinutes: 480,
  },
]

/**
 * Состояние объекта из базы.
 *
 * Не бросок монеты, а следствие данных: объект, который висит дольше суток
 * и стоит заметно дешевле рынка, скорее всего уже кем-то взят — потому его
 * и заметили первым. Свежий и дорогой не взят никем. Так строка перестаёт
 * быть случайной и начинает объяснять сама себя.
 */
function stateOf(item: Listing, index: number): Pick<SearchRow, "status" | "takenBy" | "action"> {
  const stale = item.freshnessMinutes > 60 * 24
  const cheap = item.deviation <= -8

  /*
    СТОП-ЛИСТА ЗДЕСЬ БОЛЬШЕ НЕТ, и это исправление.

    Каждый двадцать третий объект получал `status: "stop-list"` с подписью
    «Просил не звонить». Стоп-лист — реестр АГЕНТСТВА: `/agency/refusals`
    называет его «Собственный реестр отказов», и снять отметку нельзя ни
    агенту, ни руководителю. У агентства, заведённого минуту назад, он пуст.

    А выдача показывала три таких строки сразу — то есть новому агентству
    предъявляли отказы, которых оно не ставило, по объектам, которым оно
    ещё не звонило. Отметка теперь приходит только из журнала работы
    (`withAgencyWork` → `workspace.stopList`), и до первой отметки её нет.
  */
  if (stale && cheap) {
    return {
      status: "in-progress",
      takenBy: ["ИС", "МЛ", "АТ", "ПГ"][index % 4],
      action: { kind: "open" },
    }
  }

  if (index % 11 === 0) {
    return { status: "called", action: { kind: "disclose", price: 199 } }
  }

  return { status: "new", action: { kind: "disclose", price: 199 } }
}

/** Комнатность в формате строки выдачи: «2-к», у студии — «Студия». */
function roomsLabel(rooms: number): string {
  return `${rooms}-к`
}

function toRow(item: Listing, index: number): SearchRow {
  return {
    address: item.address,
    price: item.priceLabel,
    deviation: item.deviation,
    freshness: item.freshness,
    meta: `· ${item.metro} ${item.metroMinutes} мин · ${roomsLabel(item.rooms)} · ${item.area} м² · ${item.floor}/${item.floors} · ${item.platform}`,
    strength: item.strength,
    publications: item.publications,
    platforms: item.platforms,
    phones: item.phones,
    district: item.district,
    districtName: item.districtName,
    metro: item.metro,
    rooms: item.rooms,
    area: item.area,
    priceValue: item.price,
    floor: item.floor,
    floors: item.floors,
    metroMinutes: item.metroMinutes,
    freshnessMinutes: item.freshnessMinutes,
    ...stateOf(item, index),
  }
}

/** Вся база: замеренные образцы впереди, за ними объекты по свежести. */
export const ALL_ROWS: SearchRow[] = [...MEASURED_ROWS, ...LISTINGS.map(toRow)]

/** Районы, встречающиеся в базе, — для колонки фильтров. */
export const DISTRICTS = [
  { id: "krasnogvardeisky", label: "Красногвардейский" },
  { id: "nevsky", label: "Невский" },
  { id: "kalininsky", label: "Калининский" },
  { id: "primorsky", label: "Приморский" },
  { id: "moskovsky", label: "Московский" },
  { id: "central", label: "Центральный" },
  { id: "vasileostrovsky", label: "Василеостровский" },
  { id: "petrogradsky", label: "Петроградский" },
] as const
