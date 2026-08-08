import { SlidersHorizontal } from "lucide-react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Свёрнутая колонка фильтров: полоска 44 над выдачей.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Появляется на окне уже 1360, где постоянному столбцу 260 места уже нет.
 * Смысл полоски не в том, чтобы спрятать фильтры, а в том, чтобы **не
 * прятать условия**: чип называет их число, а рядом идут они сами.
 *
 * Спрятать условия было бы хуже, чем занять ими место. Человек, который
 * не видит, по каким условиям собрана выдача, через минуту решает, что
 * продукт нашёл мало объектов, — и уходит.
 *
 * Чип залит `fg`, когда условия заданы: заливка отвечает за ранг, и «фильтры
 * стоят» — это ранг главного факта полоски. Пустой фильтр оставляет чип
 * тёплым: сообщать нечего.
 */
function FilterBar({
  activeCount,
  summary,
  onOpen,
  onReset,
}: {
  /** Сколько условий сужают выдачу. */
  activeCount: number
  /** Сами условия одной строкой: «Красногвардейский · 2-к · 6–15 млн». */
  summary: string
  onOpen: () => void
  onReset?: () => void
}) {
  return (
    <div
      data-slot="filter-bar"
      className="flex h-11 w-full shrink-0 items-center gap-3 border-b border-line-2"
    >
      <button
        type="button"
        data-slot="filter-bar-open"
        data-active={activeCount > 0 || undefined}
        onClick={onOpen}
        aria-label={`Фильтры: ${activeCount}. Открыть`}
        className={cn(
          "flex h-ctl-sm shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 transition-colors duration-120",
          "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
          activeCount > 0
            ? "bg-fg hover:bg-fg-hover active:bg-fg-press"
            : "bg-warm hover:bg-warm-hover active:bg-warm-press",
        )}
      >
        <SlidersHorizontal
          aria-hidden
          className={cn("size-3.5 shrink-0", activeCount > 0 ? "text-bg" : "text-fg")}
          strokeWidth={2}
        />
        <Typography variant="numericDense" tone={activeCount > 0 ? "inverse" : "default"}>
          <>Фильтры {activeCount === 0 ? "" : activeCount}</>
        </Typography>
      </button>

      {/* Условия перечислены подряд, без обрезки многоточием: DESIGN.md
          запрещает её прямо, а условие, оборванное на середине, отвечает
          на вопрос «почему так мало» хуже, чем его отсутствие. */}
      <div className="min-w-0 flex-1">
        <Typography variant="denseText" tone="dense">
          <>{summary}</>
        </Typography>
      </div>

      {activeCount === 0 ? null : (
        <button
          type="button"
          data-slot="filter-bar-reset"
          onClick={onReset}
          // Подложка появляется под пальцем, отрицательное поле возвращает
          // подпись на её место в полосе. Форма та же, что у сортировки
          // над выдачей и у строчной кнопки «Скачать»: 24 · радиус 6 · поле 8.
          className="-mx-2 shrink-0 cursor-pointer rounded-sm bg-transparent px-2 py-0.5 transition-colors duration-120 outline-none hover:bg-warm active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <Typography variant="numericDense" tone="default">
            Сбросить
          </Typography>
        </button>
      )}
    </div>
  )
}

export { FilterBar }
