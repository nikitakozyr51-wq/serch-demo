import { Link, useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import {
  CabinetHeader,
  CabinetOverlays,
  CabinetSidebar,
  requestPalette,
  useCabinetNav,
} from "@/features/cabinet"
import { cn } from "@/lib/utils"

/**
 * Каркас раздела «Агентство».
 *
 * Общий для четырёх экранов: эффективность, сотрудники, отказы и журнал
 * доступа. Снято с `Iebim`, `u7anli`, `Y2Up0t`, `mCjJV` — у всех один шелл:
 * шапка 56, сайдбар 240, контент 1200 с полями 24 и зазором 24, заголовок 28
 * и полоса подразделов 36 с волосяной линией снизу.
 *
 * **Раздел один, а вкладок четыре, потому что вопросы разные.** «Эффективность»
 * отвечает руководителю, куда уходят деньги; «Сотрудники» — кто чем занят;
 * «Отказы» — кому агентство навсегда запретило звонить; «Журнал доступа» —
 * кто и когда открывал контакты. Свести их в один экран нельзя: первые два
 * смотрят каждый день, вторые два — когда что-то случилось.
 */

type AgencyTab = { id: string; label: string; to: string }

/**
 * Пять разделов, и у каждого свой адрес.
 *
 * Вкладка — переход, а не переключатель состояния: разделы отвечают на разные
 * вопросы, их открывают по ссылке, посылают коллеге и возвращаются назад
 * кнопкой браузера. До этой правки вкладки были нарисованы, но не нажимались
 * вовсе — четыре из пяти разделов открывались только вводом адреса руками.
 */
const TABS: AgencyTab[] = [
  { id: "efficiency", label: "Эффективность", to: "/agency" },
  { id: "staff", label: "Сотрудники", to: "/agency/staff" },
  { id: "refusals", label: "Отказы", to: "/agency/refusals" },
  { id: "access", label: "Журнал доступа", to: "/agency/access" },
  { id: "consents", label: "Согласия", to: "/agency/consents" },
]

type AgencyShellProps = {
  /**
   * Активная вкладка. `none` — экран вне вкладок: настройки агентства,
   * тариф и карточка сотрудника открываются отдельно и полосы не несут.
   */
  activeTab: string | "none"
  title: string
  /** Подпись рядом с заголовком: «стоп-лист агентства · 12 из 23 номеров». */
  note: string
  /** Действие справа в строке заголовка. */
  action?: ReactNode
  children: ReactNode
}

function AgencyShell({ activeTab, title, note, action, children }: AgencyShellProps) {
  const session = useSession()
  const navigate = useNavigate()
  const nav = useCabinetNav()

  return (
    <div className="flex h-svh w-full flex-col bg-bg">
      {/* Шапка берёт деньги и инициалы из сеанса, как и весь остальной
          кабинет. Раньше здесь стояли 8 610 ₽ и «ИС» константами: человек
          с нулём на счету переходил в «Агентство» и видел чужие деньги —
          два разных числа на соседних экранах. */}
      <CabinetHeader
        balance={session?.balance ?? 0}
        trial={session && session.trial > 0 ? session.trial : undefined}
        initials={session?.initials ?? "ИС"}
        onTopUp={() => void navigate({ to: "/balance/top-up" })}
        onSearch={requestPalette}
      />

      <div className="flex min-h-0 flex-1">
        {/* Меню берётся из общего источника, а не из констант файла
            навигации: раньше здесь стояли шесть чужих поисков без адреса,
            и ни один из них не нажимался. */}
        <CabinetSidebar
          items={nav.items}
          savedSearches={nav.savedSearches}
          agencySearches={nav.agencySearches}
          activeId="agency"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div className="flex h-7 w-full shrink-0 items-center gap-3">
            <Typography variant="panelTitle" tone="default" as="h1">
              {title}
            </Typography>
            <Typography variant="denseText" tone="dense">
              {note}
            </Typography>
            <div className="h-px flex-1" />
            {action === undefined ? null : <>{action}</>}
          </div>

          {/* Подчёркивание активной вкладки толщиной 2, у остальных линии нет.
              Полоса целиком стоит на волосяной линии. */}
          {activeTab === "none" ? null : (
          <div
            data-slot="agency-tabs"
            className="flex h-row-head w-full shrink-0 items-center gap-6 border-b border-line-2"
          >
            {TABS.map((tab) => {
              const active = tab.id === activeTab
              return (
                <Link
                  key={tab.id}
                  to={tab.to}
                  data-slot="agency-tab"
                  data-active={active || undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-row-head cursor-pointer items-center border-b-2 bg-transparent",
                    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
                    active ? "border-fg" : "border-transparent",
                  )}
                >
                  <Typography
                    variant={active ? "controlLabel" : "uiText"}
                    tone={active ? "default" : "secondary"}
                  >
                    {tab.label}
                  </Typography>
                </Link>
              )
            })}
          </div>
          )}

          <>{children}</>
        </div>
      </div>

      {/* Те же два окна, что на остальных экранах. Карта клавиш обещает
          «⌘K и ? на любом экране кабинета», а семь экранов агентства
          собраны на своём каркасе — и обещание на них не работало. */}
      <CabinetOverlays />
    </div>
  )
}

export { AgencyShell }
export type { AgencyShellProps, AgencyTab }
