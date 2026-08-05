import { useId } from "react"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Поле ввода 40.
 *
 * Значения сняты с доски `СИСТЕМА · Состояния контролов` (`nXleb`, ряд «Поле 40»)
 * и с блока «Шестое состояние: ошибка».
 *
 * Собрано вертикально с зазором 8: метка · поле · текст ошибки. Место под текст
 * ошибки закладывается заранее, поэтому форма не прыгает в момент ошибки —
 * это отдельное правило доски, а не деталь вёрстки.
 *
 * Ошибка рисуется границей внутрь и **заменяет** обычную границу, а не
 * добавляется к ней. Кольцо фокуса рисуется снаружи и соседей не смещает.
 */
type TextFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "className" | "style"
> & {
  /**
   * Метка над полем. Идёт капслоком — единственная роль ступени 11.
   * Необязательна: в таблице состояний поле стоит голым, без метки.
   */
  label?: string
  /**
   * Текст ошибки под полем. Отвечает на три вопроса: что случилось,
   * сколько осталось попыток, что делать дальше.
   */
  error?: string
  /** Подсказка под полем, когда ошибки нет. */
  hint?: ReactNode
  /** Показать состояние неподвижно. Только для полигона `/kitchen-sink`. */
  demo?: "hover" | "focus" | "press"
}

function TextField({
  label,
  error,
  hint,
  demo,
  id,
  disabled,
  ...props
}: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const messageId = `${fieldId}-message`
  const invalid = Boolean(error)

  return (
    <div data-slot="text-field" className="flex w-full flex-col gap-2">
      {label ? (
        <Typography as="label" variant="columnHeader" tone="dense" htmlFor={fieldId}>
          {label}
        </Typography>
      ) : null}

      <Typography asChild variant="fieldValue">
        <input
          id={fieldId}
          data-demo={demo}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            "h-ctl-md w-full rounded-lg bg-surface px-3 text-fg",
            "border transition-colors",
            "placeholder:text-text-dense",
            "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
            "focus-visible:border-transparent",
            "data-[demo=focus]:outline-solid data-[demo=focus]:outline-2 data-[demo=focus]:outline-offset-0 data-[demo=focus]:outline-fg data-[demo=focus]:border-transparent",
            invalid
              ? "border-2 border-err-text"
              : "border-border-control hover:border-text-2 active:border-fg data-[demo=hover]:border-text-2 data-[demo=press]:border-fg",
            "disabled:border-line-2 disabled:bg-warm disabled:text-text-dense",
          )}
          {...props}
        />
      </Typography>

      {error ? (
        <Typography id={messageId} variant="fieldError" tone="destructive" role="alert">
          {error}
        </Typography>
      ) : hint ? (
        <Typography id={messageId} variant="fieldError" tone="muted">
          {hint}
        </Typography>
      ) : null}
    </div>
  )
}

export { TextField }
export type { TextFieldProps }
