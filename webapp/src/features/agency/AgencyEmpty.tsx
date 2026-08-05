import type { ReactNode } from "react"

import { Typography } from "@/components/typography"

/**
 * Пусто в новом агентстве.
 *
 * **Зачем это вообще есть.** Пока вход и регистрация приводили к одним и тем же
 * выдуманным данным, кабинет показывал человеку чужое работающее агентство:
 * пять сотрудников, история списаний, подборки. Владелец назвал это точно —
 * «зашёл, а там уже готовое чужое агентство». Пустое состояние — вторая
 * половина исправления: мало убрать чужие строки, надо сказать, что делать
 * с пустотой.
 *
 * **Форма не новая.** Это тот же язык, что у пустой выдачи
 * (`ListingsEmptyState`): панель `surface` радиусом 16, содержимое по центру
 * с зазором 10, заголовок 20/28 весом 600, текст 14/20 шириной 520. Заводить
 * второй вид пустого экрана незачем — разное здесь только содержание, а форма
 * общая, и это правило DESIGN.md, а не экономия.
 *
 * Отличие от выдачи ровно одно: над панелью нет строки результата. В разделах
 * агентства считать нечего — там не поиск, а таблица, которой пока нет.
 */

type AgencyEmptyProps = {
  title: string
  text: string
  /** Действие под текстом: кнопка или ссылка, собранная вызывающим экраном. */
  action?: ReactNode
  /** Сноска под действием: 12/500 шириной 520. */
  note?: ReactNode
}

function AgencyEmpty({ title, text, action, note }: AgencyEmptyProps) {
  return (
    <div
      data-slot="agency-empty"
      className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl bg-surface px-20 py-16"
    >
      <Typography variant="panelTitle" tone="default" align="center">
        {title}
      </Typography>

      <div className="max-w-[520px]">
        <Typography variant="uiText" tone="secondary" align="center">
          {text}
        </Typography>
      </div>

      {/* Обёртка-фрагмент вокруг `action`: правило типографики требует, чтобы
          голое выражение в JSX было либо `children`, либо завёрнуто. Здесь
          внутри уже готовый контрол, а не текст. */}
      {action === undefined ? null : (
        <div className="flex items-center gap-2 pt-2">
          <>{action}</>
        </div>
      )}

      {note === undefined ? null : (
        <div className="max-w-[520px]">
          <Typography variant="metaText" tone="dense" align="center">
            {note}
          </Typography>
        </div>
      )}
    </div>
  )
}

export { AgencyEmpty }
export type { AgencyEmptyProps }
