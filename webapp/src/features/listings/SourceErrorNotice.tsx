import { TriangleAlert } from "lucide-react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Источник не ответил.
 *
 * Снято с `g6EnZ` «СОСТОЯНИЕ · Ошибка источника»: плашка `err-tint`
 * с радиусом 10 и полями [12, 14], значок `triangle-alert` 16, заголовок
 * 13/600 цветом `err-text`, объяснение 12/500 цветом `text-2`, справа
 * две кнопки по 32 с радиусом 8.
 *
 * **Выдача при этом остаётся на экране.** Отвалившийся источник — не пустое
 * состояние и не диалог: под плашкой идут обычные строки, собранные из тех
 * площадок, что ответили. Продукт не перестаёт работать оттого, что одна
 * из четырёх площадок молчит.
 *
 * **Текст называет цену потери числом.** Не «произошла ошибка», а «обычно там
 * 247 объектов, сейчас 180: часть объявлений вы не видите». Агент должен
 * понимать, чего именно не хватает, — иначе он решит, что выдача полная.
 *
 * Отдельного экрана «частичный ответ источников» в файле нет, и заводить его
 * нельзя: частичность выражена ровно двумя средствами — подписью на загрузке
 * «2 из 4 ответили» и этой плашкой.
 */

type SourceErrorAction = {
  id: string
  label: string
  /** Главное действие заливается графитом, второе — белым с обводкой. */
  primary?: boolean
  onClick?: () => void
}

type SourceErrorNoticeProps = {
  /** «Авито не ответил за 10 секунд». */
  title: string
  /** Что это значит для выдачи, с числами. */
  text: string
  actions?: SourceErrorAction[]
}

function SourceErrorNotice({ title, text, actions }: SourceErrorNoticeProps) {
  return (
    <div
      data-slot="source-error"
      role="status"
      className="flex w-full shrink-0 items-center gap-2.5 rounded-lg bg-err-tint px-3.5 py-3"
    >
      <TriangleAlert aria-hidden className="size-4 shrink-0 text-err-text" strokeWidth={2} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Typography variant="numericDense" tone="destructive">
          {title}
        </Typography>
        <Typography variant="metaText" tone="secondary">
          {text}
        </Typography>
      </div>

      {actions?.length ? (
        <div className="flex shrink-0 items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              data-slot="source-error-action"
              data-primary={action.primary || undefined}
              onClick={action.onClick}
              className={cn(
                "flex h-ctl-sm cursor-pointer items-center justify-center rounded-md px-3.5",
                "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                action.primary ? "bg-fg text-surface" : "bg-surface text-fg",
              )}
            >
              <Typography variant="numericDense" tone="current">
                {action.label}
              </Typography>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export { SourceErrorNotice }
export type { SourceErrorNoticeProps, SourceErrorAction }
