import { useEffect, useRef } from "react"

import { isOverlayOpen } from "@/platform/overlay"

/**
 * Горячие клавиши кабинета.
 *
 * Продукт обещает работу с клавиатуры как преимущество скорости, а её не было
 * вовсе. Карта из `PROMPT-движение-и-интерактив.md`:
 *
 *   глобально        ⌘K — командная палитра
 *   строка выдачи    B в подборку · S статус · H напомнить · N заметка
 *   прозвон          1 в работе · 2 прозвонен · 3 отказ · H отложить ·
 *                    N заметка · J/K вперёд-назад · Esc выйти в список
 *   карточка         ← / → по текущему списку · Esc вернуть фокус на строку
 *
 * **Клавиша не срабатывает, пока человек печатает.** Иначе буква «н» в поле
 * заметки открывала бы заметку, а «в» — подборку. Проверяется не только тип
 * элемента, но и `contenteditable`: редактируемый блок не является полем ввода
 * по тегу, а печатают в него точно так же.
 *
 * **Модификаторы гасят одиночные клавиши.** `Ctrl+N` — новое окно браузера,
 * и перехватывать его нельзя: продукт не имеет права ломать привычки системы.
 * Исключение только одно — `⌘K`, и оно объявлено явно.
 */
type Handlers = Record<string, (event: KeyboardEvent) => void>

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

function useHotkeys(handlers: Handlers, enabled = true) {
  // Обработчики держим в ссылке: иначе каждый рендер переподписывал бы
  // слушатель, и нажатие могло уйти в устаревшее замыкание. Запись идёт
  // в эффекте, а не в теле рендера: рендер обязан быть чистым, иначе
  // при повторном проходе ссылка обновится дважды.
  const ref = useRef(handlers)

  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target)) return

      /**
       * Пока поверх экрана открыто окно, клавиши принадлежат окну.
       *
       * Без этого правила `Enter`, нажатый в командной палитре, доходил
       * до выдачи под ней и раскрывал контакт — списание 199 ₽ из окна,
       * которое о выдаче ничего не знает. Порядок слушателей эту задачу
       * не решает: он зависит от того, кто смонтировался раньше.
       */
      if (isOverlayOpen()) return

      const meta = event.metaKey || event.ctrlKey

      // Единственное сочетание с модификатором: командная палитра.
      if (meta && event.key.toLowerCase() === "k") {
        const handler = ref.current["mod+k"]
        if (handler) {
          event.preventDefault()
          handler(event)
        }
        return
      }

      if (meta || event.altKey) return

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      const handler = ref.current[key]
      if (!handler) return

      event.preventDefault()
      handler(event)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled])
}

export { useHotkeys }
export type { Handlers as HotkeyHandlers }
