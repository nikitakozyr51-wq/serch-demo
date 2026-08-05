import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Кирпичи карточки объекта.
 *
 * Снято с `Fo8gk` «КАБИНЕТ · Карточка объекта — до раскрытия». Здесь живут
 * повторяющиеся формы: озаглавленный блок и мини-таблица. Экран собирается
 * из них, а не переписывает разметку по четыре раза.
 *
 * **Мини-таблица здесь настоящая, в отличие от строки выдачи.** У неё ширины
 * колонок закреплены — 174 / 78 / 92 у аналогов и 48 / 78 / 218 у истории
 * цены, — и волосяная линия снизу у каждой строки, кроме последней. Именно
 * так и должна выглядеть таблица: значения сравниваются столбиком.
 */

/**
 * Озаглавленный блок: метка 11/600 капслоком и содержимое через 16.
 *
 * Справа от метки может стоять приписка — «клавиши 1 2 3 4» у фиксации
 * звонка. Она прижата к правому краю распоркой: подсказка про клавиатуру
 * относится ко всему блоку, а не к первому чипу.
 */
function TitledBlock({
  title,
  aside,
  children,
}: {
  title: string
  aside?: string
  children: ReactNode
}) {
  return (
    <section data-slot="card-block" className="flex w-full flex-col gap-4">
      <div className="flex h-4 w-full items-center gap-2">
        <Typography variant="columnHeader" tone="dense">
          {title}
        </Typography>
        {aside === undefined ? null : (
          <>
            <div className="h-px flex-1" />
            <Typography variant="metaText" tone="dense">
              {aside}
            </Typography>
          </>
        )}
      </div>
      <>{children}</>
    </section>
  )
}

type MiniTableColumn = {
  /** Заголовок колонки капслоком. */
  head: string
  /** Ширина из макета. Колонки таблицы закреплены, а не тянутся. */
  width: string
  /** Правая выключка для чисел. */
  numeric?: boolean
}

type MiniTableRow = {
  id: string
  cells: string[]
  /** Какая ячейка идёт графитом весом 600. Обычно цена. */
  strongAt?: number
}

/**
 * Мини-таблица: шапка 24 и строки по 30, зазор колонок 12,
 * волосяная линия `line-1` — светлая линия внутри карточки, а не разделитель
 * строк списка. Тёмная `line-2` здесь была ошибкой на обеих таблицах.
 *
 * **Тон ячеек задаётся снаружи, а не выводится из порядка.** В таблице аналогов
 * адрес темнее, чем цена за метр; в истории цены наоборот — дата светлее,
 * чем «что изменилось». Одно правило на обе таблицы их путало.
 */
function MiniTable({
  columns,
  rows,
  /** Тон каждой колонки. По длине совпадает с `columns`. */
  tones,
  /** Линия снизу у последней строки. В истории цены она есть, у аналогов нет. */
  lastLine = false,
}: {
  columns: MiniTableColumn[]
  rows: MiniTableRow[]
  tones: ("default" | "secondary" | "dense")[]
  lastLine?: boolean
}) {
  return (
    <div data-slot="mini-table" className="flex w-full flex-col">
      <div className="flex h-6 w-full items-center gap-3 border-b border-line-1">
        {columns.map((column) => (
          <div key={column.head} className={cn("shrink-0", column.width)}>
            <Typography variant="columnHeader" tone="dense">
              {column.head}
            </Typography>
          </div>
        ))}
      </div>

      {rows.map((row, rowIndex) => (
        <div
          key={row.id}
          data-slot="mini-table-row"
          className={cn(
            "flex h-7.5 w-full items-center gap-3",
            (lastLine || rowIndex < rows.length - 1) && "border-b border-line-1",
          )}
        >
          {row.cells.map((cell, index) => {
            const column = columns[index]!
            const strong = row.strongAt === index
            return (
              <div key={column.head} className={cn("shrink-0", column.width)}>
                <Typography
                  variant={strong ? "numericDense" : "denseText"}
                  tone={strong ? "default" : (tones[index] ?? "dense")}
                >
                  {cell}
                </Typography>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/**
 * Пара «число — что это». Число всегда 14/600 графитом, подпись меняется
 * по месту: на карточке объекта она 13/500, в счёте дня на «Сегодня» — 14/500.
 * Разница снята замером, а не выведена.
 */
function CountPair({
  value,
  label,
  /** Подпись 14 вместо 13 — так в счёте дня. */
  large = false,
}: {
  value: string
  label: string
  large?: boolean
}) {
  return (
    <div data-slot="count-pair" className="flex items-baseline gap-1.5">
      <Typography variant="controlLabel" tone="default">
        {value}
      </Typography>
      <Typography variant={large ? "uiText" : "denseText"} tone="dense">
        {label}
      </Typography>
    </div>
  )
}

/**
 * Шкала с заполнением: срок в выдаче против медианы по городу.
 *
 * Пустой жёлоб без заполнения ничего не показывает — это была ошибка.
 * Число слева говорит «19 дней», а полоса показывает, много это или мало
 * относительно ста двенадцати.
 */
function FillBar({ filled, total }: { filled: number; total: number }) {
  const percent = Math.max(0, Math.min(100, Math.round((filled / total) * 100)))

  return (
    <div
      data-slot="fill-bar"
      role="img"
      aria-label={`${filled} из ${total}`}
      className="h-1.5 w-full overflow-hidden rounded-full bg-warm"
    >
      <span aria-hidden className="block h-full rounded-full bg-fg" style={{ width: `${percent}%` }} />
    </div>
  )
}

/** Чип факта о доме: 12/500, тёплая заливка, радиус 6. */
function FactChip({ label }: { label: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-sm bg-warm px-2">
      <Typography variant="metaText" tone="secondary">
        {label}
      </Typography>
    </span>
  )
}

export { TitledBlock, MiniTable, CountPair, FactChip, FillBar }
export type { MiniTableColumn, MiniTableRow }
