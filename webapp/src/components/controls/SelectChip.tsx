import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Чип выбора.
 *
 * Снято с компонента `maUSZ` «C Чип выбора»: высота 28, радиус **8**,
 * поля [0, 10], зазор 8, белая заливка и граница `border-control`.
 * Выбранный заливается графитом, подпись белеет, буква горячей клавиши
 * гаснет до полупрозрачной белой.
 *
 * **Это не чип фильтра.** У `FilterChip` радиус капсулы и поля 12: он живёт
 * в колонке условий, где чипов много и они читаются рядом. Здесь радиус 8
 * и поля 10 — чип стоит в форме, рядом с полями ввода, и должен быть с ними
 * одного языка. Разница снята замером, а не выбрана.
 *
 * **Буква горячей клавиши необязательна, и чаще её нет.** В режиме прозвона
 * из восемнадцати чипов её несут три — те, что в группе «Результат». Клавиша
 * даётся тому, что жмут в каждом разговоре, а не всему подряд: восемнадцать
 * подсказок не запоминаются, три — запоминаются.
 */
type SelectChipProps = {
  label: string
  /** Буква или цифра горячей клавиши. Без неё чип просто уже. */
  hotkey?: string
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

function SelectChip({ label, hotkey, selected = false, disabled = false, onClick }: SelectChipProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="select-chip"
      data-selected={selected || undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        // Капсула: чип нажимается и совершает действие, значит форма у него
        // та же, что у кнопки (передача 05.08.2026, раздел 1). Боковое поле
        // при этом остаётся 10, а не 0,75 высоты: у чипа ширина служит ряду,
        // а не подписи, и правило воздуха на него не распространяется.
        "flex h-ctl-chip shrink-0 cursor-pointer items-center gap-2 rounded-full border px-2.5",
        "transition-colors outline-none",
        "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        // Ступени те же, что у чипа фильтра, и по той же причине: выбранный
        // чип молчал на наведение и нажатие, а он стоит в прозвоне под
        // клавишами 1 · 2 · 3 — то есть его жмут чаще всего остального.
        // Заливка и граница едут вместе, токены готовые.
        selected
          ? "border-fg bg-fg text-surface hover:border-fg-hover hover:bg-fg-hover active:border-fg-press active:bg-fg-press"
          : "border-border-control bg-surface text-fg hover:bg-warm active:bg-warm-hover",
        "disabled:pointer-events-none disabled:border-line-2 disabled:text-text-dense",
      )}
    >
      <Typography variant="chipFilterLabel" tone="current">
        {label}
      </Typography>
      {/* На выбранном чипе буква гаснет до полупрозрачной белой: подсказка
          не должна спорить с подписью, ради которой чип и нажали. */}
      {hotkey === undefined ? null : (
        <span className={cn(selected && "opacity-70")}>
          <Typography variant="metaText" tone={selected ? "current" : "dense"}>
            {hotkey}
          </Typography>
        </span>
      )}
    </button>
  )
}

export { SelectChip }
export type { SelectChipProps }
