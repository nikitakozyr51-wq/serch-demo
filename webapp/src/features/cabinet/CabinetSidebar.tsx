import { Link } from "@tanstack/react-router"
import { Keyboard, ListFilter, Plus, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Сайдбар кабинета.
 *
 * Геометрия снята с компонента `C6b6DX`: ширина 240, вертикальная раскладка,
 * зазор 2, поля 12, заливка `surface`, волосяная линия справа.
 *
 * Пункт (`BVT4W`): поля [8, 12], радиус 10, зазор 8, значок 16, подпись 14/20.
 * Активный получает заливку `warm`, значок и подпись графитом, вес 600 —
 * снято с переопределений инстанса на экране выдачи.
 *
 * Сохранённые поиски набраны кеглем 13, а не 14: их в списке больше и они
 * длиннее, поэтому ступень ниже. Значок у них светлее (`dense` против `text-2`
 * у главных пунктов) и мельче — 14 против 16.
 *
 * **Высота пункта не фиксирована, и подпись переносится.** «Красногвардейский
 * 2-к до 15» в макете занимает две строки: пункт 216 × 56 против обычных 36,
 * текстовый блок 150 × 40. Обрезка многоточием здесь была моей выдумкой —
 * в файле её нет, и DESIGN.md её запрещает.
 *
 * **Счётчик читается по-разному в двух половинах сайдбара.** У главных пунктов
 * он 12/500 приглушённым: «Сегодня 7» — это объём, а не новость. У сохранённых
 * и агентских поисков он 12/600 графитом, потому что это находки с прошлого
 * захода; ноль возвращается в приглушённый, потому что новостей нет.
 * Снято замером: `dl2IG` со счётчиком 0 — единственный светлый из шести.
 */
type NavEntry = {
  id: string
  label: string
  icon?: LucideIcon
  count?: number
  /**
   * Куда ведёт пункт. Без адреса пункт остаётся кнопкой и ничего не делает —
   * ровно то, на что жаловался владелец: «ничего не нажимается».
   */
  to?: string
  /**
   * Что уходит в адрес параметром.
   *
   * Нужно сохранённым поискам: без него пункт «Невский, 2-к до 12 млн»
   * открывал выдачу с чужими условиями, то есть называл одно, а показывал
   * другое.
   */
  search?: Record<string, string>
}

type CabinetSidebarProps = {
  items: NavEntry[]
  /**
   * Сохранённые поиски. **Пустой список и его отсутствие — разные состояния,
   * и оба сняты с файла.**
   *
   * `[]` — заголовок «СОХРАНЁННЫЕ ПОИСКИ» с плюсом стоит, поисков ещё нет
   * (`uCehD`, первый поиск): человеку показывают, куда они лягут.
   * `undefined` — раздела нет вовсе (`EF9xj`, агентство только что создано):
   * заголовок, делитель и отступы в файле выключены. Пустой заголовок в первую
   * минуту работы — обещание раздела, которым ещё нечем пользоваться.
   */
  savedSearches?: NavEntry[]
  /** Поиски агентства. Правило то же: `[]` — заголовок без строк, `undefined` — раздела нет. */
  agencySearches?: NavEntry[]
  activeId: string
  onSelect?: (id: string) => void
  onAddSearch?: () => void
}

function NavItem({
  entry,
  active,
  dense,
  onSelect,
}: {
  entry: NavEntry
  active: boolean
  dense?: boolean
  onSelect?: (id: string) => void
}) {
  const Icon = entry.icon

  // Пункт с адресом — ссылка, без адреса — кнопка. Ссылка нужна не ради
  // красоты: её можно открыть в новой вкладке, скопировать и вернуться назад
  // кнопкой браузера. Кнопка ничего этого не умеет.
  const Element = entry.to ? Link : "button"
  const linkProps = entry.to
    ? ({ to: entry.to, ...(entry.search ? { search: entry.search } : {}) } as const)
    : ({ type: "button", onClick: () => onSelect?.(entry.id) } as const)

  return (
    <Element
      {...linkProps}
      data-slot="nav-item"
      data-active={active || undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
        // Наведения для этого пункта в файле нет — макет статичен, и на доске
        // состояний пункта навигации тоже нет. Ступень берётся по общему правилу
        // DESIGN.md «наведение сдвигает заливку на ступень темнее»: покой без
        // заливки, значит наведение — `warm`, нажатие — ещё ступень, `warm-hover`.
        // Активный при этом остаётся различим не заливкой, а графитовой
        // подписью весом 600, и под пальцем темнеет со своей ступени.
        //
        // Переход по цвету обязателен: без него подсветка щёлкает, и пункт
        // читается как перерисованный, а не как ответивший.
        "transition-colors duration-120",
        active
          ? "bg-warm text-fg hover:bg-warm-hover active:bg-warm-press"
          : "bg-transparent text-text-2 hover:bg-warm active:bg-warm-hover",
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden
          className={cn("shrink-0", dense ? "size-3.5 text-text-dense" : "size-4")}
          strokeWidth={2}
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <Typography
          variant={dense ? "denseText" : active ? "strongText" : "uiText"}
          tone="current"
        >
          {entry.label}
        </Typography>
      </span>
      {entry.count === undefined ? null : (
        <span className="shrink-0">
          <Typography
            variant={dense ? "metaStrong" : "metaText"}
            tone={dense && entry.count > 0 ? "default" : "dense"}
          >
            {entry.count}
          </Typography>
        </span>
      )}
    </Element>
  )
}

function SectionLabel({ label, onAdd }: { label: string; onAdd?: () => void }) {
  return (
    <div className="flex h-5.5 w-full items-center px-2.5">
      <span className="flex-1">
        <Typography variant="columnHeader" tone="dense">
          {label}
        </Typography>
      </span>
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Добавить поиск"
          // Значок 14 в цели 22: без подложки нажатие было незаметно вовсе.
          // Отрицательное поле возвращает значок на его место в строке.
          className="-m-1 cursor-pointer rounded-sm bg-transparent p-1 text-text-dense transition-colors duration-120 outline-none hover:bg-warm active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <Plus aria-hidden className="size-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}

function CabinetSidebar({
  items,
  savedSearches,
  agencySearches,
  activeId,
  onSelect,
  onAddSearch,
}: CabinetSidebarProps) {
  return (
    <nav
      data-slot="cabinet-sidebar"
      className="flex h-full w-sidebar shrink-0 flex-col gap-0.5 border-r border-line-2 bg-surface p-3"
    >
      {items.map((entry) => (
        <NavItem
          key={entry.id}
          entry={entry}
          active={entry.id === activeId}
          onSelect={onSelect}
        />
      ))}

      {/* Делитель отделяет разделы поиска от разделов кабинета. Разделов нет —
          делить нечего, и он уходит вместе с ними. */}
      {savedSearches === undefined && agencySearches === undefined ? null : (
        <>
          <div className="h-2.5" />
          <div className="h-px w-full bg-line-1" />
          <div className="h-2.5" />
        </>
      )}

      {/* Значки снизу другие и мельче: сохранённый поиск помечается воронкой,
          поиск агентства — людьми. Размер 14 против 16 у главных пунктов. */}
      {savedSearches === undefined ? null : (
        // Обёртка со своей меткой: обучение подсвечивает блок целиком —
        // заголовок вместе со строками, — а не первую строку из него.
        <div data-slot="saved-searches" className="flex w-full flex-col">
          <SectionLabel label="Сохранённые поиски" onAdd={onAddSearch} />
          {savedSearches.map((entry) => (
            <NavItem
              key={entry.id}
              entry={{ ...entry, icon: entry.icon ?? ListFilter }}
              active={entry.id === activeId}
              dense
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {agencySearches === undefined ? null : (
        <>
          <div className="h-3.5" />
          <SectionLabel label="Поиски агентства" />
          {agencySearches.map((entry) => (
            <NavItem
              key={entry.id}
              entry={{ ...entry, icon: entry.icon ?? Users }}
              active={entry.id === activeId}
              dense
              onSelect={onSelect}
            />
          ))}
        </>
      )}

      <div className="flex-1" />

      <div className="flex h-8 w-full items-center gap-2 px-2.5 text-text-dense">
        <Keyboard aria-hidden className="size-3.5" strokeWidth={2} />
        <Typography variant="metaText" tone="dense">
          Горячие клавиши
        </Typography>
      </div>
    </nav>
  )
}

export { CabinetSidebar }
export type { CabinetSidebarProps, NavEntry }
