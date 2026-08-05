import { useEffect, useRef, useState } from "react"

import { CommandPalette } from "./CommandPalette"
import { HotkeysDialog } from "./dialogs"
import { resetOverlays, setOverlayOpen } from "./overlay-state"

/**
 * Два окна, которые открываются с клавиатуры на любом экране кабинета.
 *
 * `⌘K` — командная палитра, `?` — карта горячих клавиш. Оба живут в каркасе,
 * а не на страницах: клавиатура обещана как преимущество скорости, и обещание,
 * которое работает через раз, хуже отсутствующего.
 *
 * **Escape закрывает то, что открыто, и ничего больше.** Пока открыто окно,
 * Escape ему и достаётся: в прозвоне тот же Escape выходит в список, и если бы
 * оба сработали разом, человек вышел бы из режима, всего лишь закрыв справку.
 *
 * Клавиши не срабатывают, пока человек печатает, — за это отвечает `useHotkeys`.
 */
function CabinetOverlays() {
  const [open, setOpen] = useState<"none" | "palette" | "hotkeys">("none")

  /**
   * Что открыто — ещё и в ссылке.
   *
   * Обработчик клавиш живёт вне рендера и должен знать состояние в момент
   * нажатия. Раньше он читал его внутри функции обновления `setOpen(...)`
   * и там же звал `stopPropagation()`. React не обязан выполнять эту функцию
   * прямо сейчас и вправе вызвать её дважды — то есть остановка события
   * происходила когда придётся. Ссылка отвечает сразу и один раз.
   */
  const openRef = useRef(open)

  // Запись в эффекте, а не в теле рендера: рендер обязан быть чистым,
  // иначе при повторном проходе ссылка обновится дважды.
  useEffect(() => {
    openRef.current = open
  }, [open])

  // Экраны под окном перестают слышать клавиши, пока окно живо.
  useEffect(() => {
    if (open === "none") return
    setOverlayOpen(true)
    return () => setOverlayOpen(false)
  }, [open])

  // Экран сменился вместе с открытым окном — счётчик обязан обнулиться,
  // иначе клавиатура останется выключенной навсегда.
  useEffect(() => resetOverlays, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"

      if (typing) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => (current === "palette" ? "none" : "palette"))
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === "?") {
        event.preventDefault()
        setOpen((current) => (current === "hotkeys" ? "none" : "hotkeys"))
        return
      }

      if (event.key === "Escape" && openRef.current !== "none") {
        // Открытое окно съедает Escape: иначе он дошёл бы до экрана
        // и вышел из прозвона заодно с закрытием справки.
        event.stopPropagation()
        event.preventDefault()
        setOpen("none")
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      {open === "palette" ? <CommandPalette onClose={() => setOpen("none")} /> : null}
      {open === "hotkeys" ? (
        <div
          data-slot="hotkeys-scrim"
          className="fixed inset-0 z-50 flex justify-center bg-[#1e1e1e59] pt-24"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen("none")
          }}
        >
          <div className="motion-in h-fit">
            <HotkeysDialog />
          </div>
        </div>
      ) : null}
    </>
  )
}

export { CabinetOverlays }
