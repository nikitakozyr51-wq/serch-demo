import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ComponentPropsWithoutRef } from "react"

/**
 * Чекбокс 24 × 24.
 *
 * Значения сняты с доски `СИСТЕМА · Состояния контролов` (`nXleb`, ряд «Чекбокс 24»)
 * и с компонента `wd19E` C Чекбокс. Галочка — иконка `check` из lucide, 14 × 14,
 * заливка `surface`: ровно то, что стоит в файле.
 *
 * Двадцать четыре — это пол по WCAG 2.5.8, а не эстетика: в плотном режиме
 * контрол не уменьшается, потому что уменьшать уже некуда.
 *
 * Состояния: покой · наведение · фокус · отмечен · выключен · ошибка.
 * Ошибка рисуется границей внутрь — она заменяет обычную границу, а не
 * добавляется к ней, иначе контрол подпрыгивает на два пикселя.
 */
type CheckboxProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "className" | "style" | "children" | "onChange" | "type"
> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Поле не прошло проверку. Граница становится красной, толщиной 2 внутрь. */
  invalid?: boolean
  /** Показать состояние неподвижно. Только для полигона `/kitchen-sink`. */
  demo?: "hover" | "focus"
}

function Checkbox({
  checked,
  onCheckedChange,
  invalid = false,
  demo,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-invalid={invalid || undefined}
      data-slot="checkbox"
      data-demo={demo}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-sm",
        "cursor-pointer border transition-colors",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
        "focus-visible:border-transparent",
        "data-[demo=focus]:outline-solid data-[demo=focus]:outline-2 data-[demo=focus]:outline-offset-0 data-[demo=focus]:outline-fg data-[demo=focus]:border-transparent",
        /*
          Отмеченный флажок тоже отвечает на палец.

          Пустой флажок наведением темнит ГРАНИЦУ, а не заливку: заливки
          у него нет вовсе, и темнить нечего — так на доске. Нажатие идёт
          дальше по тому же свойству, до `fg-press`.

          Отмеченный работает как выбранный чип: `fg → fg-hover → fg-press`,
          граница едет вместе с заливкой.
        */
        checked
          ? "border-fg bg-fg text-surface hover:border-fg-hover hover:bg-fg-hover active:border-fg-press active:bg-fg-press"
          : "border-border-control bg-surface hover:border-fg active:border-fg-press data-[demo=hover]:border-fg",
        invalid && !disabled ? "border-2 border-err-text hover:border-err-text" : "",
        "disabled:pointer-events-none disabled:border-line-2 disabled:bg-warm disabled:text-text-dense",
      )}
      {...props}
    >
      {checked ? <Check aria-hidden className="size-3.5" strokeWidth={2} /> : null}
    </button>
  )
}

export { Checkbox }
export type { CheckboxProps }
