import type { ComponentPropsWithoutRef } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Чип фильтра 28.
 *
 * Значения сняты с доски `СИСТЕМА · Состояния контролов` (`nXleb`, ряд
 * «Чип фильтра 28»): высота 28, радиус pill, поля 12, подпись 13 весом 500.
 *
 * Выбранный чип заливается графитом с белой подписью — так в файле выглядит
 * четвёртая колонка доски. Радиус pill здесь законен: это ровно тот случай,
 * ради которого он и оставлен в системе, вместе с главной кнопкой.
 *
 * Счётчик найденного пересчитывается на каждом касании контрола — кнопки
 * «Применить» в продукте не существует.
 */
type FilterChipProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "className" | "style" | "children" | "type"
> & {
  label: string
  selected?: boolean
  /** Сколько объектов даст этот чип. Показывается справа от подписи. */
  count?: number
  /**
   * Чип-виновник: это условие сузило выдачу до пустоты. Тинт ошибки
   * и красная граница, снято с `Yz08U`. Такой чип на экране один — иначе
   * подсказка «снимите вот это» перестаёт быть подсказкой.
   */
  invalid?: boolean
  /**
   * Приглушённая граница `line-2` вместо `border-control`. Так в макете набраны
   * подсказки в группе «Метро»: станции, которые предлагаются, но не выбраны.
   * Разница снята замером с `I55fb` и означает «это подсказка, а не условие».
   */
  muted?: boolean
  /** Показать состояние неподвижно. Только для полигона `/kitchen-sink`. */
  demo?: "hover" | "focus"
}

function FilterChip({
  label,
  selected = false,
  count,
  invalid = false,
  muted = false,
  demo,
  disabled,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      data-slot="filter-chip"
      data-selected={selected || undefined}
      data-invalid={invalid || undefined}
      data-demo={demo}
      disabled={disabled}
      className={cn(
        "inline-flex h-ctl-chip shrink-0 items-center gap-2 rounded-full px-3",
        "cursor-pointer border transition-colors",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
        "focus-visible:border-transparent",
        "data-[demo=focus]:outline-solid data-[demo=focus]:outline-2 data-[demo=focus]:outline-offset-0 data-[demo=focus]:outline-fg data-[demo=focus]:border-transparent",
        invalid
          ? "border-err-glyph bg-err-tint text-fg"
          : selected
            ? "border-fg bg-fg text-surface"
            : muted
              ? "border-line-2 bg-surface text-fg hover:bg-warm data-[demo=hover]:bg-warm"
              : "border-border-control bg-surface text-fg hover:bg-warm data-[demo=hover]:bg-warm",
        "disabled:pointer-events-none disabled:border-line-2 disabled:bg-surface disabled:text-text-dense",
      )}
      {...props}
    >
      <Typography variant="chipFilterLabel">{label}</Typography>
      {count === undefined ? null : (
        <Typography variant="chipFilterLabel" tone="current">
          {count > 99 ? "99+" : count}
        </Typography>
      )}
    </button>
  )
}

export { FilterChip }
export type { FilterChipProps }
