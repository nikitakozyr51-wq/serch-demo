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
}

const PLAIN_MS = 4000
const WITH_ACTION_MS = 6000

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

function dismissNotice(id: number) {
  const next = notices.filter((notice) => notice.id !== id)
  if (next.length === notices.length) return
  notices = next
  emit()
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
