import { useSyncExternalStore } from "react"

/**
 * Сообщения, которые не имеют своего места на экране.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * СПЕРВА — ЧЕГО ЗДЕСЬ БЫТЬ НЕ ДОЛЖНО
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * «Баланс пополнен», «Заявка отправлена», «В подборку», «Сменить статус» —
 * это диалоги и листы, а не сообщения. Так решено в DESIGN.md, и решение
 * держится: у каждого из них в макете есть отдельный кадр, потому что человеку
 * там нужно что-то подтвердить или выбрать, а не просто узнать.
 *
 * **Списание 199 ₽ сообщением быть не может** — это записано прямо в спеке
 * движения. Деньги оставляют постоянный след: баланс в шапке, событие
 * в таймлайне объекта, строка в журнале доступа. Всплывашка, которая
 * исчезает через четыре секунды, вместо следа даёт ощущение следа.
 *
 * Остаётся узкое: «Скопировано» (клавиша `C` в прозвоне), «Файл выгружен»
 * и ошибки, которым некуда деться. Ради трёх случаев тащить чужую библиотеку
 * незачем — здесь около сотни строк своих.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ТРИ ДЛИТЕЛЬНОСТИ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 4000 — обычное сообщение: прочитать и забыть.
 * 6000 — сообщение с действием: человеку нужно успеть до него дотянуться.
 * Без автоскрытия — ошибка: она держится, пока её не закроют. Ошибка,
 * которая ушла сама, оставляет человека с поломкой, которую он не прочёл.
 *
 * Числа из DESIGN.md, раздел «Тосты». Своих здесь нет.
 */

type NoticeKind = "plain" | "error"

type Notice = {
  id: number
  kind: NoticeKind
  text: string
  /** Подпись действия. Её наличие продлевает показ с 4000 до 6000. */
  actionLabel?: string
  onAction?: () => void
  /**
   * Сообщение уходит: последние 120 мс его жизни.
   *
   * Флаг живёт в хранилище, а не в полке, ровно потому, что уйти сообщение
   * может двумя путями — по крестику и само по таймеру. Держи полка свой
   * счётчик, автоскрытие уходило бы рывком, а закрытие рукой мягко.
   */
  leaving?: boolean
}

const PLAIN_MS = 4000
const WITH_ACTION_MS = 6000

/**
 * Сколько сообщение ещё стоит на экране после того, как его сняли.
 *
 * Зеркалит появление (`.motion-in`, 120 мс) и совпадает с длительностью
 * класса `.motion-out` в `index.css`. Числа обязаны совпадать: узел, снятый
 * раньше конца анимации, обрывает её на середине — то есть исчезает рывком,
 * ради устранения которого всё и делается.
 */
const EXIT_MS = 120

let notices: Notice[] = []
let nextId = 1

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function remove(id: number) {
  const next = notices.filter((notice) => notice.id !== id)
  if (next.length === notices.length) return
  notices = next
  emit()
}

/**
 * Снять сообщение.
 *
 * Снятие двухходовое: сначала сообщение помечается уходящим и рисует уход,
 * через 120 мс уходит из списка. Повторное снятие уже уходящего ничего
 * не делает — иначе крестик, нажатый дважды, ставил бы второй таймер.
 *
 * При отключённом движении сообщение снимается сразу: ждать 120 мс невидимой
 * анимации — задержка без причины.
 */
function dismissNotice(id: number) {
  const target = notices.find((notice) => notice.id === id)
  if (target === undefined || target.leaving === true) return

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    remove(id)
    return
  }

  notices = notices.map((notice) => (notice.id === id ? { ...notice, leaving: true } : notice))
  emit()
  window.setTimeout(() => remove(id), EXIT_MS)
}

/**
 * Показать сообщение.
 *
 * Ошибка живёт, пока её не закроют. Всё остальное уходит само: 4000 без
 * действия, 6000 с действием.
 */
function notify(input: Omit<Notice, "id">): number {
  const id = nextId++
  notices = [...notices, { ...input, id }]
  emit()

  if (input.kind !== "error") {
    const ms = input.actionLabel === undefined ? PLAIN_MS : WITH_ACTION_MS
    window.setTimeout(() => dismissNotice(id), ms)
  }

  return id
}

/** Короткая форма для обычного сообщения: «Скопировано». */
function notifyDone(text: string) {
  return notify({ kind: "plain", text })
}

/** Ошибка. Не исчезает сама — человек обязан её прочесть. */
function notifyError(text: string) {
  return notify({ kind: "error", text })
}

function useNotices(): Notice[] {
  return useSyncExternalStore(
    subscribe,
    () => notices,
    // На сервере сообщений нет: их порождают только действия человека.
    () => notices,
  )
}

export { dismissNotice, notify, notifyDone, notifyError, useNotices }
export type { Notice, NoticeKind }
