import { useSyncExternalStore } from "react"

/**
 * Открыто ли поверх экрана окно, которому принадлежат клавиши.
 *
 * **Из-за отсутствия этого состояния клавиша могла списать деньги.**
 * Командная палитра вешала свой обработчик на документ и звала
 * `preventDefault()`, но не останавливала событие. Обработчик выдачи под ней
 * продолжал слушать — и `Enter`, нажатый в палитре, раскрывал контакт
 * под курсором на скрытом экране. Списание на 199 ₽ из окна, которое
 * о выдаче ничего не знает.
 *
 * Чинится не порядком слушателей — он ненадёжен, — а явным правилом:
 * **пока окно открыто, экран под ним клавиш не получает.** `useHotkeys`
 * спрашивает это состояние и молчит, если окно есть.
 *
 * Состояние живёт вне React намеренно: его читает хук в произвольном месте
 * дерева, а окна и экраны — соседи, а не родственники, и общего родителя
 * с состоянием у них нет.
 */

let openCount = 0
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Окно открылось или закрылось. Счётчик, а не флаг: окон может быть два. */
export function setOverlayOpen(open: boolean) {
  openCount = Math.max(0, openCount + (open ? 1 : -1))
  emit()
}

/** Сбросить счётчик — на случай, если окно исчезло вместе с экраном. */
export function resetOverlays() {
  if (openCount === 0) return
  openCount = 0
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => openCount > 0

export function useOverlayOpen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}

/** Прочитать состояние вне React — нужно обработчику клавиш. */
export function isOverlayOpen(): boolean {
  return openCount > 0
}
