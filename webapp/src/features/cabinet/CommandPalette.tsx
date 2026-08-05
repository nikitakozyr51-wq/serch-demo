import { useNavigate } from "@tanstack/react-router"
import { Building, Building2, Phone, Rows4, Search, Sun, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Командная палитра (`rs1pv`).
 *
 * 620 в ширину, радиус 16, рамка `line-3`. Строка ввода 52 с волосяной линией
 * снизу, группы по 28, пункты по 40, подвал 36 на фоне страницы.
 *
 * **Палитра — не поиск по продукту, а поиск по трём разным вещам сразу:**
 * объекты, действия и разделы. Поэтому группы подписаны: без подписи «Начать
 * прозвон по текущей выдаче» стоял бы в одном ряду с адресом и читался как
 * ещё один объект.
 *
 * **У каждого пункта справа стоит его цена или его клавиша.** У объекта —
 * «8,6 млн ₽ · 2-комн · раскрыт», у действия — «⇧P», у раздела — «G затем A».
 * Палитра тем самым учит клавишам: человек, который трижды нашёл прозвон
 * через ⌘K, на четвёртый раз нажмёт ⇧P.
 *
 * Движение: появление 120 мс по прозрачности и 8 px вверх — на нижней границе
 * диапазона кабинета. Палитру открывают десятки раз в день, и она обязана
 * казаться мгновенной. При `prefers-reduced-motion` появляется без движения.
 */

type PaletteItem = {
  icon: LucideIcon
  label: string
  /** Цена объекта, клавиша действия или путь к разделу. */
  aside: string
  to?: string
}

type PaletteGroup = { label: string; items: PaletteItem[] }

const GROUPS: PaletteGroup[] = [
  {
    label: "Объекты",
    items: [
      {
        icon: Building,
        label: "Ленская ул., 10",
        aside: "8,6 млн ₽ · 2-комн · раскрыт",
        to: "/object/disclosed",
      },
      { icon: Building, label: "Ленская ул., 6", aside: "9,7 млн ₽ · 2-комн · новый", to: "/object" },
    ],
  },
  {
    label: "Действия",
    items: [
      { icon: Sun, label: "Открыть «Перезвонить сегодня»", aside: "7 объектов", to: "/today" },
      { icon: Phone, label: "Начать прозвон по текущей выдаче", aside: "⇧P", to: "/call" },
      { icon: Rows4, label: "Переключить плотность на «Плотно»", aside: "строка 64 px" },
    ],
  },
  {
    label: "Перейти",
    items: [
      { icon: Building2, label: "Агентство → Эффективность", aside: "G затем A", to: "/agency" },
      { icon: Wallet, label: "Баланс → Возвраты", aside: "G затем K", to: "/balance/refunds" },
    ],
  },
]

const FLAT = GROUPS.flatMap((group) => group.items)

/** Порядковый номер пункта в общем списке: считается один раз, а не в рендере. */
const ORDER = new Map(FLAT.map((item, index) => [item.label, index]))

/**
 * Палитра монтируется только открытой — так её состояние начинается заново
 * при каждом вызове, без сброса в эффекте. Закрытая палитра не существует,
 * а не прячется.
 */
function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Клавиши палитры перехватываются, пока она открыта: иначе стрелка вниз
    // прокрутит страницу под ней, а Enter нажмёт кнопку, которую не видно.
    const onKeyDown = (event: KeyboardEvent) => {
      // `stopPropagation` рядом с `preventDefault`: первый не даёт событию
      // дойти до экрана под палитрой, второй гасит прокрутку страницы.
      // Без первого стрелки и Enter доходили до выдачи — и Enter списывал.
      if (event.key === "ArrowDown") {
        event.preventDefault()
        event.stopPropagation()
        setActive((index) => (index + 1) % FLAT.length)
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        event.stopPropagation()
        setActive((index) => (index - 1 + FLAT.length) % FLAT.length)
      } else if (event.key === "Enter") {
        event.preventDefault()
        event.stopPropagation()
        const item = FLAT[active]
        onClose()
        if (item?.to) void navigate({ to: item.to })
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [active, navigate, onClose])

  return (
    // Скрим гасит экран, но не прячет его: человек должен видеть, откуда
    // он вызвал палитру, иначе она читается как отдельная страница.
    <div
      data-slot="palette-scrim"
      className="fixed inset-0 z-50 flex justify-center bg-[#1e1e1e59] pt-24"
      onPointerDown={(event) => {
        if (!boxRef.current?.contains(event.target as Node)) onClose()
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label="Командная палитра"
        data-slot="command-palette"
        className="motion-in flex h-fit w-155 flex-col overflow-hidden rounded-2xl border border-line-3 bg-surface"
      >
        <div className="flex h-13 w-full shrink-0 items-center gap-2.5 border-b border-line-2 px-4">
          <Search aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <Typography variant="controlLabelLg" tone="default">
              ленск
            </Typography>
          </div>
          <Typography variant="metaText" tone="dense">
            Esc
          </Typography>
        </div>

        {GROUPS.map((group) => (
          <div key={group.label} className="flex w-full flex-col">
            <div className="flex h-7 w-full items-center px-4">
              <Typography variant="columnHeader" tone="dense">
                {group.label}
              </Typography>
            </div>
            {group.items.map((item) => {
              const current = ORDER.get(item.label) === active
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  data-slot="palette-item"
                  data-active={current || undefined}
                  onPointerDown={() => {
                    onClose()
                    if (item.to) void navigate({ to: item.to })
                  }}
                  className={cn(
                    "flex h-10 w-full cursor-pointer items-center gap-2.5 px-4 text-left transition-colors",
                    current ? "bg-warm" : "bg-surface hover:bg-warm",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn("size-4 shrink-0", current ? "text-fg" : "text-text-2")}
                    strokeWidth={2}
                  />
                  <Typography variant={current ? "strongText" : "uiText"} tone="default">
                    {item.label}
                  </Typography>
                  <span className="h-px flex-1" />
                  <Typography variant="metaText" tone="dense">
                    {item.aside}
                  </Typography>
                </button>
              )
            })}
          </div>
        ))}

        <div className="flex h-9 w-full shrink-0 items-center gap-4 border-t border-line-2 bg-bg px-4">
          <Typography variant="metaText" tone="dense">
            ↑ ↓ выбрать
          </Typography>
          <Typography variant="metaText" tone="dense">
            ⏎ открыть
          </Typography>
          <Typography variant="metaText" tone="dense">
            ⌘K закрыть
          </Typography>
        </div>
      </div>
    </div>
  )
}

export { CommandPalette }
