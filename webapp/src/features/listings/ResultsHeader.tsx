import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { groupDigits, plural } from "./plural"

/**
 * Шапка выдачи.
 *
 * Геометрия снята с двух экранов сразу, и они расходятся не случайно:
 * `j7Oc03` (просторно) — высота 40 и **только заголовок**; `bPXKW` (плотно) —
 * высота 36, заголовок, арифметика отсева 13/20 весом 500 и чистота выдачи
 * 12/16 весом 500 справа. Зазор 10, выравнивание по центру в обоих.
 *
 * Логика за этим читается: просторный режим отдаёт место строкам, плотный —
 * сводке. Пояснение не «пропало», оно переехало туда, где экран и так плотный.
 *
 * Форма одна на все случаи, меняется только содержимое: у выдачи это «найдено
 * столько-то» и арифметика отсева, у пустого состояния — «начните с района»
 * и причина. Поэтому геометрия живёт в оболочке, а не дублируется.
 */
function ResultsHeaderShell({
  title,
  note,
  aside,
  dense = false,
}: {
  title: ReactNode
  note?: ReactNode
  aside?: ReactNode
  /** Плотный режим: высота 36 вместо 40. */
  dense?: boolean
}) {
  return (
    <div
      data-slot="results-header"
      data-dense={dense || undefined}
      className={cn("flex w-full items-center gap-2.5", dense ? "h-9" : "h-10")}
    >
      <Typography variant="rowPrice" tone="default">
        {title}
      </Typography>
      {note === undefined ? null : (
        <Typography variant="denseText" tone="dense">
          {note}
        </Typography>
      )}
      <div className="h-px flex-1" />
      <>{aside}</>
    </div>
  )
}

/**
 * Шапка выдачи с арифметикой отсева.
 *
 * **Арифметика обязана сходиться на экране.** 892 − 431 − 214 = 247.
 * Строка объясняет, почему из почти девятисот объявлений осталось двести сорок
 * семь, и ровно этим продукт отличается от агрегатора. Поэтому остаток
 * компонент считает сам, а не принимает отдельным числом: разойтись негде.
 */
type ResultsHeaderProps = {
  /** Сколько объявлений пришло с площадок до склейки и отсева. */
  listings: number
  /** Сколько дублей склеено: один объект под разными номерами. */
  duplicates: number
  /** Сколько посредников отсеяно до того, как агент их увидел. */
  intermediaries: number
  /**
   * Чистота выдачи за 7 дней в процентах. Необязательна намеренно:
   * этого числа нет в `DEMO-DATA.md`, а невыведенные числа рисовать нельзя.
   */
  purityPercent?: number
  /**
   * Плотный режим. В нём и только в нём шапка несёт арифметику отсева
   * и чистоту выдачи — так в файле, и это решение, а не пропуск.
   */
  dense?: boolean
}

function ResultsHeader({
  listings,
  duplicates,
  intermediaries,
  purityPercent,
  dense = false,
}: ResultsHeaderProps) {
  const found = listings - duplicates - intermediaries

  return (
    <ResultsHeaderShell
      dense={dense}
      title={`Найдено ${groupDigits(found)} ${plural(found, "объект", "объекта", "объектов")}`}
      note={
        dense
          ? `из ${groupDigits(listings)} ${plural(listings, "объявления", "объявлений", "объявлений")} · ` +
            `${groupDigits(duplicates)} ${plural(duplicates, "дубль", "дубля", "дублей")} ` +
            `${plural(duplicates, "склеен", "склеены", "склеено")} · ` +
            `${groupDigits(intermediaries)} ${plural(intermediaries, "посредник", "посредника", "посредников")} ` +
            `${plural(intermediaries, "отсеян", "отсеяны", "отсеяно")}`
          : undefined
      }
      aside={
        dense && purityPercent !== undefined ? (
          <Typography variant="metaText" tone="dense">
            Чистота выдачи за 7 дней · {purityPercent.toLocaleString("ru-RU")} %
          </Typography>
        ) : null
      }
    />
  )
}

export { ResultsHeader, ResultsHeaderShell }
export type { ResultsHeaderProps }
