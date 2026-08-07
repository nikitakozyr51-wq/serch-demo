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
