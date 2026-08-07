import { Typography } from "@/components/typography"

/**
 * Отклонение цены от рынка.
 *
 * Геометрия снята с компонента `hgutA` C Отклонение от рынка: высота 20,
 * зазор 4, заливки нет, глиф и значение — 12/16 весом 600 с трекингом −0,06.
 *
 * Три полосы с мёртвой зоной, по DESIGN.md:
 *
 *   ±5 %        `text-dense`, без глифа, «≈ рынок» весом 500
 *   дешевле     `ok-text`, глиф ▼, значение весом 600
 *   дороже      `err-text`, глиф ▲, значение весом 600
 *
 * **Знак пишется всегда**, и между числом и процентом стоит пробел: «−12 %».
 * Глиф и цвет — избыточное кодирование, знак — основное: цвет не может быть
 * единственным носителем смысла.
 *
 * **Тинт-плашки за ±15 % здесь нет.** DESIGN.md её описывает, но файл
 * с этим расходится: на экране выдачи строка «+18 %» идёт без плашки,
 * а сама плашка встречается в файле ровно один раз и на другом экране —
 * «−16 %» в подборке. Закон — файл, поэтому строка выдачи плашки не рисует;
 * когда дойдём до подборки, она заведётся там и по замеру.
 *
 * Отклонение считается от медианы цены аналогов — та же комнатность в радиусе
 * 700 м за 60 дней, — а не от медианы района. Следствие: у двух похожих объектов
 * на одной улице база обязана быть одна.
 */
type MarketDeviationProps = {
  /** Отклонение в процентах: −12 значит на 12 % дешевле рынка. */
  percent: number
  /**
   * Сколько сопоставимых объектов дали медиану.
   *
   * `undefined` — вопрос не стоит: в продаже медиана района считается по
   * сотням объектов и всегда набирается.
   */
  comparables?: number
}

/**
 * Ниже этого числа аналогов отклонение не показывается вовсе.
 *
 * В аренде объявление живёт дни, а не месяцы, и аналогов может не набраться.
 * Отклонение от медианы трёх квартир — это не отклонение, а совпадение.
 *
 * **Врать про рынок хуже, чем промолчать.** Колонка отклонения — ядро
 * продукта: ради неё агент и платит за контакт. Одно неверное число в ней
 * стоит дороже десяти пустых клеток, потому что после него не верят и
 * верным.
 */
const ENOUGH = 8

function MarketDeviation({ percent, comparables }: MarketDeviationProps) {
  if (comparables !== undefined && comparables < ENOUGH) {
    return (
      <span data-slot="market-deviation" data-band="unknown" className="inline-flex h-5 items-center">
        <Typography variant="metaText" tone="dense">
          мало данных
        </Typography>
      </span>
    )
  }

  const isNeutral = Math.abs(percent) <= 5
  const isCheaper = percent < 0

  if (isNeutral) {
    return (
      <span data-slot="market-deviation" data-band="neutral" className="inline-flex h-5 items-center">
        <Typography variant="metaText" tone="dense">
          ≈ рынок
        </Typography>
      </span>
    )
  }

  const tone = isCheaper ? "ok" : "destructive"

  return (
    <span
      data-slot="market-deviation"
      data-band={isCheaper ? "cheaper" : "pricier"}
      className="inline-flex h-5 items-center gap-1"
    >
      <Typography variant="metaStrong" tone={tone}>
        {isCheaper ? "▼" : "▲"}
      </Typography>
      <Typography variant="numericMeta" tone={tone}>
        {`${isCheaper ? "−" : "+"}${Math.abs(percent)} %`}
      </Typography>
    </span>
  )
}

export { MarketDeviation }
export type { MarketDeviationProps }
