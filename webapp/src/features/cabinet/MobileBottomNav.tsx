import { Link } from "@tanstack/react-router"
import { Bookmark, Menu, Search, Sun, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Нижняя навигация телефона.
 *
 * Снято с компонента `U15v7` (51 экземпляр): 390 × 88, поля [8, 8, 32, 8],
 * заливка `surface`, волосяная линия сверху, пять вкладок по 75 × 48
 * с зазором 4 внутри. Значок 20, подпись 12: активная весом 600 графитом,
 * остальные весом 500 приглушённые.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 88, А НЕ 72: НИЖНЕЕ ПОЛЕ 32 — ЭТО СИСТЕМНАЯ ЗОНА
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Панель была 72 с нижним полем 16, и на экране 844 занимала 772…844.
 * Подписи вкладок кончались на 814 при границе безопасной зоны 810 — то есть
 * заходили под полосу жестов на 4 пикселя, а вкладка целиком на 14. Токены
 * `safe-top 47` и `safe-bottom 34` были объявлены в файле и **не применены
 * ни разу**. Теперь 88 с полем 32: панель занимает 756…844, подписи кончаются
 * на 800, под ними 10 пикселей воздуха до границы зоны.
 *
 * **Константы 34 в коде нет — стоит `env(safe-area-inset-bottom)`.** Числа
 * из файла сняты с айфона, но полоса жестов есть и на андроиде: там она 24,
 * а три кнопки навигации — 48. Явление одно, числа разные, и зашить 34
 * значило бы промахнуться на обеих системах, кроме одной. Поле берётся
 * не меньше 32, чтобы на устройстве без выреза панель не села на 72.
 *
 * Поле, а не сдвиг содержимого: панель врастает в системную зону своим
 * фоном, поэтому под полосой жестов остаётся белое, а не просвет страницы.
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
  /** Куда ведёт вкладка. Без адреса панель — картинка, а не навигация. */
  to: string
}

/**
 * У каждой вкладки есть адрес — и это не подробность, а вся её работа.
 *
 * Панель стоит на двух десятках телефонных экранов и до этой правки не
 * открывала ни одного: у вкладки был только необязательный обработчик,
 * которого никто не передавал. Человек жал «Баланс» — экран не менялся.
 * Разделы кабинета на телефоне были достижимы только набором адреса руками,
 * то есть недостижимы.
 *
 * Хуже молчания было одно место: выдача передавала обработчик, который
 * переставлял подсветку и больше ничего. Панель говорила «вы перешли»,
 * а человек оставался на месте — это не отсутствие перехода, а ложь о нём.
 */
const TABS: MobileTab[] = [
  { id: "today", label: "Сегодня", icon: Sun, to: "/m/today" },
  { id: "search", label: "Поиск", icon: Search, to: "/m/search" },
  { id: "collections", label: "Подборки", icon: Bookmark, to: "/m/collections" },
  { id: "balance", label: "Баланс", icon: Wallet, to: "/m/balance" },
  { id: "more", label: "Ещё", icon: Menu, to: "/m/more" },
]

type MobileBottomNavProps = {
  activeId: string
}

function MobileBottomNav({ activeId }: MobileBottomNavProps) {
  return (
    <nav
      data-slot="mobile-bottom-nav"
      // Волосяная линия сверху нарисована внутренней тенью, а не рамкой:
      // в файле обводка идёт внутрь и высоту не меняет, а рамка добавила бы
      // 73-й пиксель. Это линия, а не глубина, — запрет теней не нарушен.
      className="pb-safe-nav px-safe-nav flex w-full shrink-0 items-start justify-between bg-surface pt-2 shadow-[inset_0_1px_0_var(--line-2)]"
    >
      {TABS.map((tab) => {
        const active = tab.id === activeId
        const Icon = tab.icon
        return (
          <Link
            key={tab.id}
            to={tab.to}
            data-slot="mobile-tab"
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-12 w-[75px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg bg-transparent",
              "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
              // Пять главных дверей продукта, и все пять молчали под пальцем.
              // Наведения на телефоне нет, поэтому нажатие берёт вторую
              // ступень сразу — как строка выдачи в `.row-tap`.
              "transition-colors duration-120 active:bg-warm-hover",
              active ? "text-fg" : "text-text-dense",
            )}
          >
            <Icon aria-hidden className="size-5" strokeWidth={2} />
            <Typography variant={active ? "metaStrong" : "metaText"} tone="current">
              {tab.label}
            </Typography>
          </Link>
        )
      })}
    </nav>
  )
}

export { MobileBottomNav }
export type { MobileBottomNavProps, MobileTab }
