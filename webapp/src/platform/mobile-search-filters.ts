import { useSyncExternalStore } from "react"

import { ALL_ROWS, DISTRICTS, PRICE_BOUNDS, type SearchRow } from "@/data/search-rows"

/**
 * Условия мобильного поиска: общий стор листа и выдачи.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * На десктопе фильтры живут колонкой на том же экране, что выдача, — и
 * `useState` экрана доживает до возврата. На телефоне лист — отдельный
 * маршрут `/m/filters`, выдача — `/m/search`, и локальное состояние умирало
 * на закрытии листа: выбор сбрасывался, «Сбросить 7» и «Показать 247
 * объектов» стояли константами, и выдача не менялась ни на строку.
 *
 * Условия вынесены в модульный стор по образцу `platform/density`:
 * тот же `useSyncExternalStore`, но без `localStorage` — фильтры это
 * состояние экрана, а не настройка человека, и перезагрузка вправе
 * вернуть дефолты, как на десктопе.
 *
 * **Стартовые условия — дефолт ПК-версии, а не снимок кадра `gFIin`.**
 * В кадре выбраны «Лиговский проспект», «до 10 мин» и «не первый», и семь
 * условий сужают выдачу до нуля: у станции «Лиговский проспект» все
 * объекты в Центральном районе, а выбраны три других района. Лист с
 * «Показать 0 объектов» на первом же открытии — это и есть дефект, который
 * владелец описал как «фильтры не работают». Решение владельца «мобильная
 * версия равна компьютерной» (DESIGN.md) значит, что стартовать мобильный
 * поиск обязан с той же выдачи, что ПК: три района и потолок 15 млн,
 * а станции, пешая доступность и этаж — пусто.
 */

export type MobileFilterState = {
  /** Выбранные районы — id из `DISTRICTS`. */
  districts: string[]
  /** Выбранные станции — названия из базы (или кандидаты кадра). */
  metro: string[]
  /** Пешая доступность: 10 или 20 минут, `undefined` — без условия. */
  walk: 10 | 20 | undefined
  /** Правила этажа: «не первый», «не последний». */
  floor: Array<"not-first" | "not-last">
  /** Цена «от» в рублях; `undefined` — без условия. */
  priceFrom: number | undefined
  /** Цена «до» в рублях; `undefined` — без потолка. */
  priceTo: number | undefined
  /** Какая группа раскрыта по «+»: полный список районов или станций. */
  expanded: "district" | "metro" | null
}

/**
 * Дефолты по умолчанию. Дефолтный потолок 15 млн — тот же, что у
 * десктопной колонки (`PRICE_CAP_DEFAULT.sale`), и та же подпись
 * кадра «до 15 млн».
 */
const DEFAULT: MobileFilterState = {
  districts: ["krasnogvardeisky", "nevsky", "kalininsky"],
  metro: [],
  walk: undefined,
  floor: [],
  priceFrom: undefined,
  priceTo: 15_000_000,
  expanded: null,
}

/** Станции, у которых в базе есть объекты, — по алфавиту, как в десктопном окне. */
export const METRO_STATIONS: string[] = [...new Set(ALL_ROWS.map((row) => row.metro))].sort(
  (a, b) => a.localeCompare(b, "ru"),
)

/**
 * Кандидаты кадра `gFIin`, которых в базе нет.
 *
 * «Обводный канал» — станция из макета без единого объекта в базе. Чип
 * остаётся на своём месте (кадр — закон), но выбор его честно даёт ноль:
 * счётчик в подвале пересчитывается, и человек видит, что условие пустое.
 */
const FRAME_CANDIDATES = ["Лиговский проспект", "Обводный канал", "Площадь Восстания"]

let state: MobileFilterState = DEFAULT
const listeners = new Set<() => void>()

function commit(next: MobileFilterState) {
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function useMobileFilters(): MobileFilterState {
  return useSyncExternalStore(subscribe, () => state, () => DEFAULT)
}

/* ── Действия ───────────────────────────────────────────────────────────── */

function toggleDistrict(id: string) {
  commit({
    ...state,
    districts: state.districts.includes(id)
      ? state.districts.filter((item) => item !== id)
      : [...state.districts, id],
  })
}

function toggleMetro(name: string) {
  commit({
    ...state,
    metro: state.metro.includes(name)
      ? state.metro.filter((item) => item !== name)
      : [...state.metro, name],
  })
}

function toggleWalk(minutes: 10 | 20) {
  commit({ ...state, walk: state.walk === minutes ? undefined : minutes })
}

function toggleFloor(rule: "not-first" | "not-last") {
  commit({
    ...state,
    floor: state.floor.includes(rule)
      ? state.floor.filter((item) => item !== rule)
      : [...state.floor, rule],
  })
}

/** Цена в рублях; `undefined` стирает условие (поле стало пустым). */
function setPrice(edge: "priceFrom" | "priceTo", value: number | undefined) {
  commit({ ...state, [edge]: value })
}

/** «+ район»/«+ станция»: раскрыть полный список или свернуть. */
function toggleExpanded(which: "district" | "metro") {
  commit({ ...state, expanded: state.expanded === which ? null : which })
}

/** Сброс снимает ВСЕ условия, включая поля цены. Раскрытие тоже. */
function resetMobileFilters() {
  commit({ ...DEFAULT, districts: [], priceFrom: undefined, priceTo: undefined })
}

/* ── Отбор и счётчики ───────────────────────────────────────────────────── */

/**
 * Те же условия, что десктопная колонка (`search-screen.tsx`), только без
 * табов, потолка-ступеней и свежести — в листе их нет. Одна функция на
 * лист (счётчик «Показать N») и на выдачу: два разных фильтра для одного
 * набора условий разошлись бы на первой же правке.
 */
export function applyMobileFilters(rows: SearchRow[], filters: MobileFilterState): SearchRow[] {
  return rows
    .filter((row) => filters.districts.length === 0 || filters.districts.includes(row.district))
    .filter((row) => filters.metro.length === 0 || filters.metro.includes(row.metro))
    .filter((row) => filters.walk === undefined || row.metroMinutes <= filters.walk)
    .filter((row) => !filters.floor.includes("not-first") || row.floor > 1)
    .filter((row) => !filters.floor.includes("not-last") || row.floor < row.floors)
    .filter((row) => filters.priceFrom === undefined || row.priceValue >= filters.priceFrom)
    .filter((row) => filters.priceTo === undefined || row.priceValue <= filters.priceTo)
}

/**
 * Сколько условий сужают выдачу — то самое число в «Фильтры N», «Сбросить N».
 *
 * Поле цены считается условием, только когда сужает: «от 6 000 000» при
 * минимальной квартире в 6 000 000 — подпись, а не условие (на десктопе
 * так работает потолок 0: «без потолка»). Иначе счётчик соврал бы с
 * первого открытия, где «Цена от» заполнена дефолтом кадра.
 */
export function countActiveFilters(filters: MobileFilterState): number {
  const priceFromActive =
    filters.priceFrom !== undefined && filters.priceFrom > PRICE_BOUNDS.min
  const priceToActive = filters.priceTo !== undefined && filters.priceTo < PRICE_BOUNDS.max
  return (
    filters.districts.length +
    filters.metro.length +
    (filters.walk === undefined ? 0 : 1) +
    filters.floor.length +
    (priceFromActive ? 1 : 0) +
    (priceToActive ? 1 : 0)
  )
}

/* ── Чипы групп: что показывать в свёрнутой и раскрытой группе ──────────── */

type RowChip = { id: string; label: string; selected: boolean }

/**
 * Районы группы: выбранные впереди, «+ район» последним — правило колонки
 * из файла `I55fb`, перенесённое в лист. Пока не выбрано ничего, показываются
 * первые районы базы, как нарисовано в кадре.
 */
export function districtRows(filters: MobileFilterState): RowChip[][] {
  const shown = (
    filters.districts.length > 0 ? filters.districts : DISTRICTS.slice(0, 3).map((d) => d.id)
  ).slice(0, 3)
  const chips = shown.map((id) => {
    const spec = DISTRICTS.find((item) => item.id === id)
    return { id, label: spec?.label ?? id, selected: filters.districts.includes(id) }
  })
  const hidden = Math.max(0, filters.districts.length - 3)
  const more: RowChip = {
    id: "more-district",
    label: hidden === 0 ? "+ район" : `+ ещё ${hidden}`,
    selected: false,
  }
  return [
    chips.slice(0, 1),
    [...chips.slice(1, 3), more],
  ].filter((row) => row.length > 0)
}

/**
 * Раскрытая группа «РАЙОН»: все районы базы по три в ряд, «− район» —
 * единственная новая подпись (свернуть). Поведение повторяет десктопное
 * окно выбора: полный список, выбор и применение на месте.
 */
export function districtRowsOpen(): RowChip[][] {
  const rows: RowChip[][] = []
  for (let i = 0; i < DISTRICTS.length; i += 3) {
    rows.push(
      DISTRICTS.slice(i, i + 3).map((d) => ({
        id: d.id,
        label: d.label,
        selected: false,
        muted: false,
      })),
    )
  }
  rows.push([{ id: "close-district", label: "− район", selected: false }])
  return rows
}

/**
 * Станции группы: выбранные впереди, кандидаты кадра за ними, пока
 * выбранных меньше трёх, — тогда группа показывает только выбранное
 * и «+ станция · ещё N», где N — невлезшие выбранные.
 */
export function metroRows(filters: MobileFilterState): RowChip[][] {
  const chosen = filters.metro.slice(0, 2).map((name) => ({
    id: name,
    label: name,
    selected: true,
  }))
  const extras = FRAME_CANDIDATES.filter((name) => !filters.metro.includes(name)).map((name) => ({
    id: name,
    label: name,
    selected: false,
  }))
  const shown = [...chosen, ...extras].slice(0, 3)
  const hidden = Math.max(0, filters.metro.length - 2)
  const more: RowChip = {
    id: "more-station",
    label: hidden === 0 ? "+ станция" : `+ станция · ещё ${hidden}`,
    selected: false,
  }
  return [shown.slice(0, 2), [...shown.slice(2, 3), more]].filter((row) => row.length > 0)
}

/**
 * Раскрытая группа «МЕТРО»: все станции базы по две в ряд — ряд в кадре
 * двухместный. Ступени пешей доступности и «− станция» добавляет лист:
 * они остаются в конце, как в кадре.
 */
export function metroRowsOpen(filters: MobileFilterState): RowChip[][] {
  const rows: RowChip[][] = []
  for (let i = 0; i < METRO_STATIONS.length; i += 2) {
    rows.push(
      METRO_STATIONS.slice(i, i + 2).map((name) => ({
        id: name,
        label: name,
        selected: filters.metro.includes(name),
      })),
    )
  }
  return rows
}

export {
  useMobileFilters,
  toggleDistrict,
  toggleMetro,
  toggleWalk,
  toggleFloor,
  setPrice,
  toggleExpanded,
  resetMobileFilters,
}
export type { RowChip }
