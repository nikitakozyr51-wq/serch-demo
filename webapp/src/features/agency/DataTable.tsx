import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Таблица кабинета.
 *
 * Одна форма на все восемь таблиц раздела: белая панель с радиусом 16 и
 * обрезкой, шапка 36 тёплой заливкой, строки по 48 с волосяной линией снизу
 * и **последней строкой без линии** — её край задаёт скругление панели.
 * Поля [0, 16], зазор колонок 12.
 *
 * **Ширины колонок закреплены и берутся из закрытой шкалы** 96 · 120 · 144 ·
 * 168 · 216: одна и та же по смыслу колонка имеет одну ширину во всех восьми
 * таблицах. Сумма всегда 96, дата со временем всегда 144. Иначе восемь таблиц
 * читаются как восемь разных продуктов.
 *
 * Числовые колонки выключены вправо: столбик чисел сравнивается взглядом
 * только по правому краю.
 */

type Column = {
  head: string
  /** Ширина из шкалы: `w-col-96`, `w-col-120`, `w-col-144`, `w-col-168`, `w-col-216`. Пусто — тянется. */
  width?: string
  /** Числовая колонка: выключка вправо. */
  numeric?: boolean
  /** Шапка графитом: по этой колонке отсортировано. */
  sorted?: boolean
}

type Row = {
  id: string
  cells: ReactNode[]
}

/**
 * Пустая таблица.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Шапка остаётся.** Правило доски `СИСТЕМА · Пустые списки`, и оно одно
 * на все десять пустых списков кабинета: пустая таблица не схлопывается
 * в картинку с надписью «пока ничего нет». На месте строк — одна строка
 * текста: почему пусто и что это наполнит. Никаких иллюстраций и никаких
 * извинений.
 *
 * Причина не в экономии. Шапка называет колонки, то есть отвечает на вопрос
 * «что здесь будет», раньше и точнее любого объяснения. Картинка вместо
 * таблицы заставляет человека гадать, что он вообще открыл.
 *
 * Исключение из правила ровно одно, и оно названо в своём месте: главный
 * экран `bZOeU` при первом входе. Пустая таблица с шапкой — правильное
 * пустое состояние и никуда не годный первый экран продукта.
 */
type Empty = {
  /** «Ни одной подборки». */
  title: string
  /** Что это наполнит. Одной строкой. */
  text: string
}

function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: Column[]
  rows: Row[]
  empty?: Empty
}) {
  return (
    <div
      data-slot="data-table"
      data-empty={rows.length === 0 || undefined}
      className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-surface"
    >
      <div className="flex h-row-head w-full items-center gap-3 bg-warm px-4">
        {columns.map((column) => (
          <div
            key={column.head}
            className={cn(
              "flex items-center",
              column.width ?? "min-w-0 flex-1",
              column.numeric && "justify-end",
            )}
          >
            <Typography variant="columnHeader" tone={column.sorted ? "default" : "dense"}>
              {column.head}
            </Typography>
          </div>
        ))}
      </div>

      {rows.length === 0 && empty !== undefined ? (
        <div
          data-slot="data-empty"
          // Высота двух строк таблицы, а не своя: пустое состояние занимает
          // ровно то место, куда встанут первые записи.
          className="flex w-full flex-col justify-center gap-1 px-4 py-6"
        >
          <Typography variant="numericDense" tone="default">
            <>{empty.title}</>
          </Typography>
          <Typography variant="denseText" tone="dense">
            <>{empty.text}</>
          </Typography>
        </div>
      ) : null}

      {rows.map((row, index) => (
        <div
          key={row.id}
          data-slot="data-row"
          className={cn(
            "flex h-row-tbl w-full items-center gap-3 bg-surface px-4",
            index < rows.length - 1 && "border-b border-line-2",
          )}
        >
          {row.cells.map((cell, cellIndex) => {
            const column = columns[cellIndex]!
            return (
              <div
                key={column.head}
                className={cn(
                  "flex items-center gap-2.5",
                  column.width ?? "min-w-0 flex-1",
                  column.numeric && "justify-end",
                )}
              >
                <>{cell}</>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export { DataTable }
export type { Column as DataTableColumn, Row as DataTableRow }
