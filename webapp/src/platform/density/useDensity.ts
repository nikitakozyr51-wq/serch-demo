import { useSyncExternalStore } from "react"

/**
 * Плотность интерфейса: просторно или плотно.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Выбор жил внутри одного экрана и терялся при переходе.** Агент включал
 * плотный режим на выдаче, уходил в подборки и возвращался в просторный.
 * Плотность — это не настройка экрана, а настройка человека: он либо видит
 * мелкое хорошо, либо нет, и второй раз в день его об этом спрашивать нельзя.
 *
 * Хранится в браузере под `serch.density` и одновременно ставится атрибутом
 * на корень документа. Атрибут — единственный способ переключить плотность
 * разом: на нём построен вариант `compact:` и все переменные высот. Кто-то
 * один обязан его ставить, иначе два экрана начнут спорить за корень.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Плотность доходит НЕ ВЕЗДЕ, и это решение DESIGN.md: «плотные значения
 * существуют только там, куда дотягивается переключатель „Вид“, — выдача
 * и таблицы. Диалоги, селекты, пикеры, тосты и весь лендинг всегда
 * просторные». Окно, сжавшееся вместе со списком, читается как другое окно.
 */

const KEY = "serch.density"

type Density = "spacious" | "compact"

function read(): Density {
  if (typeof window === "undefined") return "spacious"
  return window.localStorage.getItem(KEY) === "compact" ? "compact" : "spacious"
}

let value: Density = read()
const listeners = new Set<() => void>()

/** Поставить атрибут на корень. Отсюда его читают переменные высот и `compact:`. */
function apply(next: Density) {
  if (typeof document === "undefined") return
  if (next === "compact") document.documentElement.dataset.density = "compact"
  else delete document.documentElement.dataset.density
}

apply(value)

function setDensity(next: Density) {
  if (next === value) return
  value = next
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, next)
  apply(next)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Включён ли плотный режим и как его переключить. */
function useDensity(): [boolean, (next: boolean) => void] {
  const current = useSyncExternalStore(
    subscribe,
    () => value,
    () => "spacious" as Density,
  )

  return [current === "compact", (next) => setDensity(next ? "compact" : "spacious")]
}

export { setDensity, useDensity }
export type { Density }
