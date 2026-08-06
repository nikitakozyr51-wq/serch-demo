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
 * КОРОБКИ У ПОЛЯ БОЛЬШЕ НЕТ (передача 05.08.2026, раздел 1). Поле — это не
 * контейнер, а строка, в которую пишут, и рисуется оно одной линией снизу.
 * Заливки нет, рамки с четырёх сторон нет, радиуса нет.
 *
 * | состояние | линия |
 * |---|---|
 * | покой     | `border-control`, 1 px |
 * | наведение | `text-2`, 1 px |
 * | фокус     | `fg`, **2 px** |
 * | нажатие   | `fg`, 1 px |
 * | ошибка    | `err-text`, **2 px** плюс подпись под полем тем же цветом |
 * | выключено | `line-2`, 1 px, значение `text-3` |
 *
 * БОКОВОЕ ПОЛЕ 12 СНЯТО: значение выровнено по левому краю колонки, то есть
 * по своей подписи сверху. С коробкой отступ был нужен, чтобы текст не липнул
 * к рамке; без коробки он только сдвигал значение относительно метки.
 *
 * Кольцо фокуса рисуется снаружи и соседей не смещает. Толщина линии при
 * фокусе меняется с 1 на 2 внутрь — высота контрола от этого не едет,
 * потому что линия нижняя, а не рамка по кругу.
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
            "h-ctl-md w-full bg-transparent text-fg",
            // Линия только снизу. `border-b-*` вместо `border`: рамка по кругу
            // вернула бы коробку, которой у поля больше нет.
            "border-0 border-b border-solid transition-colors",
            "placeholder:text-text-dense",
            // Кольца фокуса у поля нет: фокус сказан самой линией, ставшей
            // вдвое толще и графитовой. Кольцо поверх линии дало бы две
            // разные отметки одного состояния.
            //
            // `focus-visible:outline-none` обязателен отдельно от `outline-none`:
            // в основе стоит общее правило `*:focus-visible { outline: 2px }`,
            // и без явной отмены живое поле получало кольцо, которого нет
            // ни в макете, ни в демонстрации состояний на полигоне.
            "outline-none focus-visible:outline-none",
            invalid
              ? "border-b-2 border-err-text"
              : [
                  "border-border-control",
                  "hover:border-text-2 data-[demo=hover]:border-text-2",
                  "focus-visible:border-b-2 focus-visible:border-fg",
                  "data-[demo=focus]:border-b-2 data-[demo=focus]:border-fg",
                  // Нажатие в поле и есть установка фокуса, поэтому линия
                  // та же: графитовая и вдвое толще.
                  "active:border-b-2 active:border-fg",
                  "data-[demo=press]:border-b-2 data-[demo=press]:border-fg",
                ],
            "disabled:border-line-2 disabled:bg-transparent disabled:text-text-3",
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
