import type { SearchRow } from "@/data/search-rows"

/**
 * Условия поиска и правило, по которому объект в них попадает.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Правило одно на два экрана, и это не про экономию строк.** Выдача
 * применяет условия к списку, главный экран считает по ним «всего» и «новых
 * за сутки». Пока правило было написано внутри выдачи, второй экран мог
 * посчитать только своим — и разошёлся бы с первым молча: в сайдбаре «12
 * новых», открываешь, а строк девять. Такое расхождение нельзя заметить
 * глазом, зато его отлично замечает человек, который на эти двенадцать
 * рассчитывал.
 *
 * Тип условий описан здесь структурно, а не взят из журнала работы: иначе
 * выдача начала бы зависеть от журнала ради одного описания полей.
 */
type ListingQuery = {
  districts: string[]
  rooms: number[]
  /** Потолок цены в миллионах. 0 — без потолка. */
  priceCap: number
  tab: string
  sort: string
  /**
   * Условия, которые в колонке были НАРИСОВАНЫ, но не применялись.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Поля «Цена, ₽» и «Площадь, м²» стояли в колонке рамками с текстом внутри:
   * ни ввода, ни фокуса, ни курсора. Чипы «Этаж» и «Метро» нажимались
   * и не делали ничего — пятьдесят три строки до нажатия, пятьдесят три
   * после, — причём три из них («не первый», «Лиговский проспект»,
   * «до 10 мин») были нарисованы выбранными константой: агент видел три
   * условия, которых не ставил и не мог снять.
   *
   * Все поля необязательные, и это важно для СОХРАНЁННЫХ ПОИСКОВ: записи,
   * заведённые до этой правки, лежат в браузере людей без них. Отсутствие
   * поля означает «условие не задано», то есть ничего не сужает, — и старый
   * поиск открывается тем же списком, что открывался вчера.
   */
  /** Цена от и до, в рублях. */
  priceFrom?: number
  priceTo?: number
  /** Площадь от и до, в м². */
  areaFrom?: number
  areaTo?: number
  /** Какие этажи исключить. Оба условия могут стоять вместе. */
  floor?: ("not-first" | "not-last")[]
  /** Станции метро по названию, как они лежат в базе. */
  metro?: string[]
  /** Потолок пешей доступности в минутах. */
  walk?: number
}

/**
 * Вкладки выдачи.
 *
 * Пустой список районов означает «все районы», а не «ни одного»: снятый
 * фильтр не сужает. То же с комнатами. Это правило легко перепутать
 * с обратным, и тогда пустая выдача выглядит как поломка поиска.
 */
const TAB_FILTER: Record<string, (row: SearchRow) => boolean> = {
  all: () => true,
  new: (row) => row.freshnessMinutes <= 60 * 24,
  "not-called": (row) => row.status !== "called" && row.status !== "disclosed",
  taken: (row) => row.takenBy !== undefined,
  mine: (row) => row.takenBy === "ИС",
  cheaper: (row) => row.deviation < -5,
}

/** Попадает ли объект в условия. */
function matchesQuery(row: SearchRow, query: ListingQuery): boolean {
  const tab = TAB_FILTER[query.tab] ?? TAB_FILTER.all!
  if (!tab(row)) return false
  if (query.districts.length > 0 && !query.districts.includes(row.district)) return false
  if (query.priceCap !== 0 && row.priceValue > query.priceCap * 1_000_000) return false
  if (query.rooms.length > 0 && !query.rooms.includes(row.rooms)) return false

  if (query.priceFrom !== undefined && row.priceValue < query.priceFrom) return false
  if (query.priceTo !== undefined && row.priceValue > query.priceTo) return false
  if (query.areaFrom !== undefined && row.area < query.areaFrom) return false
  if (query.areaTo !== undefined && row.area > query.areaTo) return false

  // «Не первый» и «не последний» — про этаж, а не про число: у пятиэтажки
  // последний пятый, у двадцатипятиэтажной двадцать пятый.
  if (query.floor?.includes("not-first") === true && row.floor <= 1) return false
  if (query.floor?.includes("not-last") === true && row.floor >= row.floors) return false

  if (query.metro !== undefined && query.metro.length > 0 && !query.metro.includes(row.metro)) {
    return false
  }
  if (query.walk !== undefined && row.metroMinutes > query.walk) return false

  return true
}

/** Сколько объектов попадает в условия и сколько из них появилось за сутки. */
function countQuery(rows: SearchRow[], query: ListingQuery) {
  const matched = rows.filter((row) => matchesQuery(row, query))
  return {
    total: matched.length,
    fresh: matched.filter((row) => row.freshnessMinutes <= 60 * 24).length,
  }
}

export { TAB_FILTER, countQuery, matchesQuery }
export type { ListingQuery }
