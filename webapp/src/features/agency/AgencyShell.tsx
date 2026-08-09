import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
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
  return (
    /*
      ЗДЕСЬ БОЛЬШЕ НЕТ ШАПКИ И БОКОВОГО МЕНЮ — И ЭТО ГЛАВНАЯ ПРАВКА ФАЙЛА.

      ═══════════════════════════════════════════════════════════════════════

      Раздел «Агентство» держал ВТОРОЙ каркас кабинета: свою копию шапки
      и своё боковое меню. Из-за этого переход «Сегодня → Агентство» менял
      не содержимое, а весь кабинет целиком — React видел в одной позиции
      дерева другой компонент и сносил поддерево вместе с шапкой, счётчиком
      денег и списком поисков.

      Теперь каркас один и живёт на маршруте (`features/cabinet/CabinetFrame`).
      `AgencyShell` остался тем, чем он и был по сути, — полосой вкладок
      раздела и заголовком над ней.
    */
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          {/*
            Строка заголовка — `min-h`, а не `h`.

            Заголовок сам по себе занимает 28, и высота стояла числом 28.
            Но справа в этой же строке живёт главное действие раздела —
            кнопка ступени 32. Кнопка выше строки, в которой лежит, и
            торчала из неё по 2 пикселя сверху и снизу на девяти экранах
            подряд: агентство, сотрудники, отказы, журнал, согласия,
            настройки, тариф, профиль, безопасность.

            Нижняя граница остаётся 28 — строка без кнопки не вырастает.
            Со кнопкой строка становится 32, и это ровно то, что рисует
            кадр `u7anli`: там она 32, а не 28.
          */}
          <div className="flex min-h-7 w-full shrink-0 items-center gap-3">
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

      {/* Палитра и карта клавиш переехали в общий каркас вместе с шапкой.
          Держать их здесь второй копией больше незачем — обещание «⌘K
          на любом экране кабинета» теперь выполняется одним узлом. */}
      <>{children}</>
    </div>
  )
}

export { AgencyShell }
export type { AgencyShellProps, AgencyTab }
