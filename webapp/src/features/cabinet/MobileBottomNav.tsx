import { Bookmark, Menu, Search, Sun, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Нижняя навигация телефона.
 *
 * Снято с компонента `U15v7`: 390 × 72, поля [8, 8, 16, 8], заливка `surface`,
 * волосяная линия сверху, пять вкладок по 75 × 48 с зазором 4 внутри.
 * Значок 20, подпись 12: активная весом 600 графитом, остальные весом 500
 * приглушённые.
 *
 * **Нижнее поле 16 против верхнего 8 — это не опечатка макета.** Внизу экрана
 * телефона живёт системная полоса жеста, и вкладка, прижатая к самому краю,
 * попадала бы под палец вместе с ней.
 *
 * Разделов пять против пяти пунктов десктопного сайдбара, но последний другой:
 * вместо «Агентство» стоит «Ещё». На телефоне за одним пунктом прячется всё,
 * что не помещается, — и это честнее, чем выкинуть раздел совсем.
 *
 * Подпись есть у каждой вкладки. Значок без подписи на нижней навигации
 * читается угадыванием, а угадывать в рабочем инструменте нельзя.
 */
type MobileTab = {
  id: string
  label: string
  icon: LucideIcon
}

const TABS: MobileTab[] = [
  { id: "today", label: "Сегодня", icon: Sun },
  { id: "search", label: "Поиск", icon: Search },
  { id: "collections", label: "Подборки", icon: Bookmark },
  { id: "balance", label: "Баланс", icon: Wallet },
  { id: "more", label: "Ещё", icon: Menu },
]

type MobileBottomNavProps = {
  activeId: string
  onSelect?: (id: string) => void
}

function MobileBottomNav({ activeId, onSelect }: MobileBottomNavProps) {
  return (
    <nav
      data-slot="mobile-bottom-nav"
      // Волосяная линия сверху нарисована внутренней тенью, а не рамкой:
      // в файле обводка идёт внутрь и высоту не меняет, а рамка добавила бы
      // 73-й пиксель. Это линия, а не глубина, — запрет теней не нарушен.
      className="flex w-full shrink-0 items-start justify-between bg-surface px-2 pt-2 pb-4 shadow-[inset_0_1px_0_var(--line-2)]"
    >
      {TABS.map((tab) => {
        const active = tab.id === activeId
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            data-slot="mobile-tab"
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect?.(tab.id)}
            className={cn(
              "flex h-12 w-[75px] cursor-pointer flex-col items-center justify-center gap-1 bg-transparent",
              "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
              active ? "text-fg" : "text-text-dense",
            )}
          >
            <Icon aria-hidden className="size-5" strokeWidth={2} />
            <Typography variant={active ? "metaStrong" : "metaText"} tone="current">
              {tab.label}
            </Typography>
          </button>
        )
      })}
    </nav>
  )
}

export { MobileBottomNav }
export type { MobileBottomNavProps, MobileTab }
