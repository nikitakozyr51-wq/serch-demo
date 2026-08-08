import { ArrowDownNarrowWide, ChevronDown, Rows3, Rows4 } from "lucide-react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { useAnimatedNumber } from "@/platform/motion"

/**
 * Табы выдачи, сортировка и переключатель плотности.
 *
 * Геометрия снята с `TlKLg`: полоса высотой 36 с волосяной линией снизу,
 * зазор между табами 16, внутри таба зазор 6. Активный таб несёт подчёркивание
 * толщиной 2 цветом `fg` и подпись весом 600; неактивные — вес 500 цветом
 * `text-2`. Счётчик рядом с подписью — 12/16 приглушённый.
 *
 * Справа сортировка (значок 14, подпись 13 весом 600) и переключатель вида:
 * высота 28, поля [0, 10], заливка `warm`, радиус 8, шеврон 12.
 * Значки — `arrow-down-narrow-wide`, `rows-3` и `chevron-down` из lucide,
 * ровно как в файле.
 *
 * **Плотность меняет и полосу, и переключатель.** Полоса 36 → 32 (это ступень
 * `row-head`, она переключается токеном), кнопка вида 28 → 24 с радиусом
 * 8 → 6, а значок меняется с `rows-3` на `rows-4`: в плотном режиме строк
 * в том же месте помещается больше, и значок это показывает.
 *
 * Счётчики необязательны намеренно: их значений нет в `DEMO-DATA.md`,
 * а рисовать невыведенные числа нельзя.
 */
type ResultTab = {
  id: string
  label: string
  count?: number
}

type ResultTabsProps = {
  tabs: ResultTab[]
  activeId: string
  onSelect?: (id: string) => void
  /** Как отсортировано: «по свежести». Формулировка приходит снаружи. */
  sortLabel: string
  /**
   * Сменить сортировку.
   *
   * В файле порядок нарисован подписью без стрелки выбора, и это не значит
   * «сортировать нельзя»: значок слева — тот самый, которым в интерфейсах
   * обозначают порядок, и человек по нему нажмёт. Без обработчика подпись
   * остаётся подписью — так собраны стенды.
   */
  onToggleSort?: () => void
  /** Плотный режим: полоса ниже, значок вида другой, подпись «Плотно». */
  dense?: boolean
  onToggleDensity?: () => void
}

/**
 * Счётчик вкладки.
 *
 * Число доезжает до нового значения за 200 мс — потолок диапазона кабинета,
 * а не 600 мс баланса. Разница намеренная: у баланса движение обязано быть
 * заметным, потому что оно подтверждает списание денег. Счётчик вкладки
 * ничего не подтверждает, он лишь не даёт числу подмениться незаметно, когда
 * сменили фильтр и «Все 247» стало «Все 31».
 *
 * При отключённом движении хук меняет число мгновенно — это его правило,
 * не наше исключение.
 */
function TabCount({ value }: { value: number }) {
  const shown = useAnimatedNumber(value, 200)

  return (
    <Typography variant="metaText" tone="dense">
      <>{shown}</>
    </Typography>
  )
}

function ResultTabs({
  tabs,
  activeId,
  onSelect,
  sortLabel,
  onToggleSort,
  dense = false,
  onToggleDensity,
}: ResultTabsProps) {
  const ViewIcon = dense ? Rows4 : Rows3

  return (
    <div
      data-slot="result-tabs"
      className="flex h-row-head w-full items-center gap-4 border-b border-line-2"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            data-slot="result-tab"
            data-active={active || undefined}
            onClick={() => onSelect?.(tab.id)}
            className={cn(
              "flex h-row-head cursor-pointer items-center gap-1.5 border-b-2 bg-transparent",
              "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
              // Подчёркивание переезжает цветом границы, а не сдвигом: сдвиг
              // потребовал бы анимировать раскладку, что запрещено везде.
              "transition-colors duration-120",
              /*
                Наведения у неактивной вкладки не было вовсе — только нажатие.
                То есть мышь над «Не прозвонены» не меняла ничего, и полоса
                вкладок читалась как подписи, а не как переключатель.

                Теперь под пальцем видно будущее решение: подпись доходит
                до графита, под ней проступает светлая линия. Нажатие идёт
                на ступень дальше по той же линии — `line-2 → line-3`.
                Заливки у вкладки нет и не будет: вкладка с подложкой
                перестаёт быть вкладкой и становится кнопкой.

                Активная тоже отвечает: подпись у неё уже графитовая,
                поэтому отклик несёт линия — она темнеет до `fg-press`.
              */
              active
                ? "border-fg text-fg active:border-fg-press"
                : "border-transparent text-text-2 hover:border-line-2 hover:text-fg active:border-line-3",
            )}
          >
            <Typography variant={active ? "tabActive" : "tabLabel"} tone="current">
              {tab.label}
            </Typography>
            {tab.count === undefined ? null : <TabCount value={tab.count} />}
          </button>
        )
      })}

      <div className="h-px flex-1" />

      {onToggleSort ? (
        <button
          type="button"
          data-slot="sort-toggle"
          onClick={onToggleSort}
          aria-label={`Сортировка: ${sortLabel}. Сменить`}
          /*
            Сортировка не отвечала ни на что, кроме кольца фокуса, — а она
            меняет порядок всей выдачи.

            Подложка появляется только под пальцем, и её поле гасится
            отрицательным полем ровно на ту же величину: подпись остаётся
            стоять там, где она стоит в макете, до пикселя. Форма взята
            не с потолка — ровно так собрана строчная кнопка «Скачать»
            в документах баланса: 24 в высоту, радиус 6, поле 8.
          */
          className={cn(
            "-mx-2 flex h-6 cursor-pointer items-center gap-1.5 rounded-sm bg-transparent px-2",
            "transition-colors duration-120 hover:bg-warm active:bg-warm-hover",
            "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
          )}
        >
          <ArrowDownNarrowWide aria-hidden className="size-3.5 text-text-dense" strokeWidth={2} />
          <Typography variant="tabActive" tone="default">
            {sortLabel}
          </Typography>
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <ArrowDownNarrowWide aria-hidden className="size-3.5 text-text-dense" strokeWidth={2} />
          <Typography variant="tabActive" tone="default">
            {sortLabel}
          </Typography>
        </div>
      )}

      <button
        type="button"
        data-slot="density-toggle"
        onClick={onToggleDensity}
        aria-pressed={dense}
        className={cn(
          "flex h-ctl-xs cursor-pointer items-center gap-1.5 rounded-full bg-warm px-2.5",
          // Плотность меняет высоту, а не форму: правило «форма отвечает роли»
          // (05.08) не знает про плотность вовсе. Прежний `compact:rounded-sm`
          // остался от карты радиусов по высоте — она отменена.
          //
          // Заливка у переключателя уже есть, поэтому отклик идёт по ней
          // и по общей лестнице: `warm → warm-hover → warm-press`. Прежде
          // он не отвечал ни на наведение, ни на нажатие, и переключатель
          // вида читался как подпись «Просторно», а не как кнопка.
          "transition-colors duration-120 hover:bg-warm-hover active:bg-warm-press",
          "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
        )}
      >
        <ViewIcon aria-hidden className="size-3.5 text-fg" strokeWidth={2} />
        <Typography variant="tabActive" tone="default">
          {dense ? "Плотно" : "Просторно"}
        </Typography>
        <ChevronDown aria-hidden className="size-3 text-text-dense" strokeWidth={2} />
      </button>
    </div>
  )
}

export { ResultTabs }
export type { ResultTabsProps, ResultTab }
