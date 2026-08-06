import { useId } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Поле формы входа.
 *
 * Снято с компонента `B5nFCk`: метка капслоком, поле 40 с радиусом 10
 * и обводкой `border-control`, подсказка 12/500 под ним.
 *
 * **Ошибка не добавляет рамку, а заменяет её**, и толщина растёт с 1 до 2.
 * Если бы красная рамка добавлялась к обычной, поле подпрыгивало бы
 * на два пикселя в момент ошибки — а прыгать оно не должно: человек
 * в этот момент читает, что не так.
 *
 * **Место под подсказку заложено заранее.** Ряд с ошибкой становится выше
 * не потому, что текст «влез», а потому что высота была рассчитана
 * с запасом — иначе форма скачет при каждой проверке.
 *
 * **Поле бывает живым и нарисованным, и это разные вещи.** С `onChange` оно
 * настоящее: в него печатают, оно держит фокус и отдаёт значение форме. Без
 * `onChange` это снимок состояния — так собраны экраны, которые показывают
 * заполненную форму по макету. Заводить ради этого второй компонент нельзя:
 * геометрия у них одна, и разъехалась бы она молча.
 */
function AuthField({
  label,
  value,
  hint,
  /** Значение — подсказка, а не введённый текст: цвет приглушённый. */
  placeholder = false,
  error,
  onChange,
  placeholderText,
  type = "text",
  autoComplete,
  name,
}: {
  label: string
  value: string
  hint?: string
  placeholder?: boolean
  error?: string
  /** Задан — поле настоящее. Не задан — нарисованное. */
  onChange?: (value: string) => void
  /**
   * Подсказка внутри живого поля.
   *
   * Отдельно от флага `placeholder`: у нарисованного поля подсказкой служит
   * само значение, у живого — значение принадлежит человеку, и подменять его
   * подсказкой нельзя.
   */
  placeholderText?: string
  type?: "text" | "email" | "password" | "tel"
  autoComplete?: string
  name?: string
}) {
  const generatedId = useId()
  const fieldId = `${generatedId}-field`

  // Коробки у поля больше нет: одна линия снизу, ни заливки, ни радиуса,
  // ни бокового отступа (передача 05.08.2026, раздел 1). Значение стоит по
  // левому краю колонки — то есть ровно под своей подписью.
  const frame = cn(
    "flex h-ctl-md w-full items-center border-0 border-b border-solid bg-transparent",
    error ? "border-b-2 border-err-text" : "border-border-control",
  )

  return (
    <div
      data-slot="auth-field"
      data-invalid={error ? true : undefined}
      className="flex min-w-0 flex-1 flex-col gap-2"
    >
      <Typography as="label" variant="columnHeader" tone="dense" htmlFor={fieldId}>
        {label}
      </Typography>

      {onChange ? (
        <Typography asChild variant="uiText">
          <input
            id={fieldId}
            name={name}
            type={type}
            value={value}
            autoComplete={autoComplete}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholderText}
            className={cn(
              frame,
              "text-fg transition-colors placeholder:text-text-dense",
              // Фокус сказан самой линией: она становится графитовой и вдвое
              // толще. Кольцо поверх линии дало бы две отметки одного
              // состояния, а линия снизу от толщины высоту не меняет.
              "outline-none",
              error ? "" : "hover:border-text-2 focus-visible:border-b-2 focus-visible:border-fg",
            )}
          />
        </Typography>
      ) : (
        <div className={frame}>
          <Typography variant="uiText" tone={placeholder ? "dense" : "default"}>
            {value}
          </Typography>
        </div>
      )}

      {error === undefined && hint === undefined ? null : (
        <Typography variant="metaText" tone={error ? "destructive" : "dense"}>
          {error ?? hint}
        </Typography>
      )}
    </div>
  )
}

export { AuthField }
