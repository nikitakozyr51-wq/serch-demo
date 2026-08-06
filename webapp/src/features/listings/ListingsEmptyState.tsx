import type { ReactNode } from "react"

import { FilterChip } from "@/components/controls/FilterChip"
import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { ResultsHeaderShell } from "./ResultsHeader"

/**
 * Пустое состояние выдачи.
 *
 * **Пустых состояний шесть, и они не делят один шаблон** — это правило
 * DESIGN.md, а замер файла его уточнил: в первой сборке я знал четыре и путал
 * ошибку источника с пустотой, хотя это не пустое состояние вовсе — там
 * выдача остаётся на экране. Форма общая, содержание разное, потому что
 * разные причины требуют разных действий:
 *
 *   первый вход              нечего искать — предложить пресеты
 *   перефильтровали          слишком узко сошлись условия — снять чип-виновника
 *   поиск без результата     строка не нашлась; возможно, объект отсеян как посредник
 *   похожих не нашлось       нечем считать похожесть: кадры объекта не годятся
 *   в коридоре никого нет    не с чем сравнивать: в базе нет других объектов
 *   смена не начата          пусто в «Сегодня», а не в выдаче
 *
 * **Два последних неразличимы по шапке** — у обоих «Похожих не нашлось» —
 * и расходятся только телом. Значит причину нельзя решать по строке
 * результата: она не несёт различия.
 *
 * Подвал бывает двух видов, и путать их нельзя: `footnote` — полоса внизу
 * панели (13/500, форма A), `note` — сноска внутри блока под кнопками
 * (12/500 шириной 520, форма B).
 *
 * Геометрия снята с `UYQoT` и `Yz08U`: панель `surface` с радиусом 16 внутри
 * области `bg`, содержимое по центру с зазором 10 и полями [0, 80], заголовок
 * 20/28 весом 600, текст 14/20 шириной 520, ряд чипов с отступом 6 сверху,
 * кнопки с отступом 8.
 *
 * **В «перефильтровали» подсвечивается чип-виновник.** Не «ничего не найдено,
 * попробуйте иначе», а «снимите „до 8 млн“ — вернётся 84 объекта». Пустое
 * состояние обязано говорить, что именно сделать.
 */

type EmptyStateChip = {
  id: string
  label: string
  /** Виновник сужения: тинт ошибки и красная граница. Такой чип один. */
  culprit?: boolean
}

type EmptyStateAction = {
  id: string
  label: string
  /** Главное действие заливается графитом, остальные — тёплой нейтралью. */
  primary?: boolean
  onClick?: () => void
}

type ListingsEmptyStateProps = {
  /** Строка результата над панелью: что произошло. */
  headerTitle: string
  /** Пояснение в строке результата: почему так. */
  headerNote?: string
  title: string
  text: string
  /** Активные условия. Один из них может быть отмечен виновником. */
  chips?: EmptyStateChip[]
  actions?: EmptyStateAction[]
  /** Сноска внутри блока, под кнопками: 12/500 шириной 520 (форма B). */
  note?: ReactNode
  /** Полоса внизу панели: «Комнаты и доли · Расселение · Снизили цену» (форма A). */
  footnote?: ReactNode
}

function ListingsEmptyState({
  headerTitle,
  headerNote,
  title,
  text,
  chips,
  actions,
  note,
  footnote,
}: ListingsEmptyStateProps) {
  // Собственного кадра у пустого состояния нет: 940 × 560 с полями 16
  // и волосяной обводкой — это стенд, внутри которого оно живёт, ровно как
  // живёт обычная выдача. Своя рамка давала вторую, вложенную.
  return (
    <div data-slot="listings-empty" className="flex h-full w-full flex-col gap-3">
      <ResultsHeaderShell title={headerTitle} note={headerNote} />

      <div className="flex flex-1 flex-col rounded-2xl bg-surface">
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-20">
          <Typography variant="panelTitle" tone="default" align="center">
            {title}
          </Typography>
          <div className="max-w-[520px]">
            <Typography variant="uiText" tone="secondary" align="center">
              {text}
            </Typography>
          </div>

          {chips?.length ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
              {chips.map((chip) => (
                <FilterChip key={chip.id} label={chip.label} invalid={chip.culprit} />
              ))}
            </div>
          ) : null}

          {actions?.length ? (
            <div className="flex items-center gap-2 pt-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  data-slot="empty-action"
                  data-primary={action.primary || undefined}
                  onClick={action.onClick}
                  className={cn(
                    // Высота 36 при кегле 14 — так в макете на всех досках
                    // состояний, независимо от плотности экрана.
                    "flex h-9 cursor-pointer items-center justify-center rounded-full px-4",
                    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                    action.primary ? "bg-fg text-surface" : "bg-warm text-fg",
                  )}
                >
                  <Typography variant="controlLabel">{action.label}</Typography>
                </button>
              ))}
            </div>
          ) : null}

          {note === undefined ? null : (
            <div className="max-w-[520px]">
              <Typography variant="metaText" tone="dense" align="center">
                {note}
              </Typography>
            </div>
          )}
        </div>

        {footnote === undefined ? null : (
          // Выключка по центру задаётся раскладкой, а не свойством текста:
          // подпись — строчный узел, и `text-align` на нём самом ничего не даёт.
          <div className="flex w-full justify-center px-20 pb-7">
            <Typography variant="denseText" tone="dense" align="center">
              {footnote}
            </Typography>
          </div>
        )}
      </div>
    </div>
  )
}

export { ListingsEmptyState }
export type { ListingsEmptyStateProps, EmptyStateChip, EmptyStateAction }
