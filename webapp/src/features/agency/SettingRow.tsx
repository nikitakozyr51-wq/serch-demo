import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Строка настройки: что настраивается, зачем — и контрол справа.
 *
 * Снято с `t6b58y` и `cNIZP`: высота 64, зазор 16, текстовый блок 320,
 * распорка, контрол у правого края, волосяная линия снизу у всех строк,
 * кроме последней.
 *
 * **Подпись под названием обязательна и объясняет последствие, а не повторяет
 * заголовок.** Не «дневной лимит раскрытий — сколько контактов в день»,
 * а «за 30 дней раскрыл 18 контактов на 3 582 ₽»: руководитель ставит лимит,
 * глядя на то, что человек уже потратил.
 */
function SettingRow({
  title,
  note,
  control,
  last = false,
}: {
  title: string
  note: string
  control: ReactNode
  last?: boolean
}) {
  return (
    <div
      data-slot="setting-row"
      className={cn(
        "flex min-h-16 w-full items-center gap-4 py-2",
        !last && "border-b border-line-2",
      )}
    >
      <div className="flex w-80 shrink-0 flex-col gap-0.5">
        <Typography variant="numericDense" tone="default">
          {title}
        </Typography>
        <Typography variant="metaText" tone="dense">
          {note}
        </Typography>
      </div>
      <div className="h-px flex-1" />
      <div className="flex shrink-0 items-center gap-2">
        <>{control}</>
      </div>
    </div>
  )
}

/**
 * Поле формы, снятое с компонента `B5nFCk`: метка капслоком, поле 40
 * с радиусом 10 и подсказка под ним.
 *
 * **Заблокированное поле заливается тёплым, а не гасит текст.** Почту меняет
 * только руководитель, и поле должно выглядеть не «сломанным», а «не вашим».
 */
function FormField({
  label,
  value,
  hint,
  locked = false,
}: {
  label: string
  value: string
  hint?: string
  locked?: boolean
}) {
  return (
    <div data-slot="form-field" className="flex w-full flex-col gap-2">
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <div
        className={cn(
          "flex h-ctl-md w-full items-center rounded-lg border border-border-control px-3",
          locked ? "bg-warm" : "bg-surface",
        )}
      >
        <Typography variant="uiText" tone={locked ? "dense" : "default"}>
          {value}
        </Typography>
      </div>
      {hint === undefined ? null : (
        <Typography variant="metaText" tone="dense">
          {hint}
        </Typography>
      )}
    </div>
  )
}

export { SettingRow, FormField }
