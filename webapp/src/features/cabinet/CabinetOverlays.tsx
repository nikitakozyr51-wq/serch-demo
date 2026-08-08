import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { useExit } from "@/platform/motion"
import { CommandPalette } from "./CommandPalette"
import { HotkeysDialog } from "./dialogs"
import { onPaletteRequest, resetOverlays, setOverlayOpen } from "./overlay-state"

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

  // Строка поиска в шапке просит открыть палитру. Подписка живёт здесь,
  // потому что состояние окна принадлежит этому компоненту.
  useEffect(() => {
    const off = onPaletteRequest(() => setOpen("palette"))
    return () => {
      off()
    }
  }, [])

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

  /**
   * Оба окна остаются на экране ещё 120 мс после закрытия — на время ухода.
   *
   * Палитру открывают десятки раз за смену, и до этого она пропадала за один
   * кадр: человек нажимал Esc и получал мгновенную подмену экрана. Появление
   * при этом у неё было — перекос ровно в ту сторону, которая заметнее.
   */
  const palette = useExit(open === "palette")
  const hotkeys = useExit(open === "hotkeys")

  return (
    <>
      {palette.mounted ? (
        <CommandPalette leaving={palette.leaving} onClose={() => setOpen("none")} />
      ) : null}
      {hotkeys.mounted ? (
        <div
          data-slot="hotkeys-scrim"
          // Затемнение идёт быстрее карточки и в обе стороны: сначала гаснет
          // фон, потом приезжает содержимое, и наоборот при уходе.
          className={cn(
            "fixed inset-0 z-50 flex justify-center bg-[#1e1e1e59] pt-24",
            hotkeys.leaving ? "scrim-out" : "scrim-in",
          )}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen("none")
          }}
        >
          <div className={cn("h-fit", hotkeys.leaving ? "motion-out" : "motion-in")}>
            <HotkeysDialog />
          </div>
        </div>
      ) : null}
    </>
  )
}

export { CabinetOverlays }
