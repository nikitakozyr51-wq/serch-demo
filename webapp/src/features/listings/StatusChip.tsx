import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Чип состояния объекта.
 *
 * Геометрия снята с компонента `xUogw` C Чип состояния: высота 24, поля [0, 8],
 * радиус 6, подпись 12/16 весом 500 с трекингом −0,06.
 *
 * Состояние — один из двух ортогональных каналов строки. Второй — владелец
 * (кружок с инициалами). Семи цветов не бывает, поэтому каналы разведены:
 * кто взял читается позиционно, что происходит — чипом.
 *
 * **Набор закрыт восемью состояниями** — столько их в файле, и ни одним больше.
 * Первая сборка знала четыре, и три строки экрана выдачи остались без чипа,
 * а «Стахановцев ул., 14» получила чужой: «Отказ» вместо «Стоп-лист».
 * Восьмое, «Новый», нашлось позже на карточке объекта.
 *
 * Заливка и цвет подписи сняты замером и делятся на две группы:
 *
 *   с заливкой, без рамки   В работе · Прозвонен · Раскрыт
 *   белые, с рамкой         Отказ · Стоп-лист · Номера нет · Отозван · Новый
 *
 * Подпись красится по состоянию, а не одним цветом на всех: «В работе» идёт
 * `warn-text`, «Раскрыт» — `ok-text`, «Отказ» — `text-dense`, остальные —
 * `text-2`. Это не украшение: приглушённый «Отказ» отличает исход, который
 * агента не касается, от исходов, за которыми стоит действие.
 */
type ListingStatus =
  | "in-progress"
  | "called"
  | "disclosed"
  | "refused"
  | "stop-list"
  | "no-phone"
  | "revoked"
  | "new"

const LABEL: Record<ListingStatus, string> = {
  "in-progress": "В работе",
  called: "Прозвонен",
  disclosed: "Раскрыт",
  refused: "Отказ",
  "stop-list": "Стоп-лист",
  "no-phone": "Номера нет",
  revoked: "Отозван",
  new: "Новый",
}

/** Заливка, рамка и цвет подписи — по одному замеру на состояние. */
const SKIN: Record<ListingStatus, string> = {
  "in-progress": "bg-warn-tint text-warn-text",
  called: "bg-warm text-text-2",
  disclosed: "bg-ok-tint text-ok-text",
  refused: "border border-border-control bg-surface text-text-dense",
  "stop-list": "border border-border-control bg-surface text-text-2",
  "no-phone": "border border-border-control bg-surface text-text-2",
  revoked: "border border-border-control bg-surface text-text-2",
  // «Новый» живёт на карточке объекта, а не в строке выдачи: там свежесть
  // говорит текстом («14 минут»), а здесь нужен ярлык.
  new: "border border-border-control bg-surface text-text-2",
}

type StatusChipProps = {
  status: ListingStatus
  /**
   * Телефонный размер: 32 вместо 24 и радиус 8 вместо 6.
   *
   * Радиус меняется вместе с высотой, а не остаётся прежним: по карте
   * от 04.08 высоте 24 отвечает r-6, а высоте 28 и 32 — r-8. Пара
   * «высота — радиус» берётся из карты целиком, поодиночке значения не ходят.
   */
  tall?: boolean
}

function StatusChip({ status, tall = false }: StatusChipProps) {
  return (
    <span
      data-slot="status-chip"
      data-status={status}
      className={cn(
        // 24 в обеих плотностях десктопа: это пол по WCAG 2.5.8, уменьшать
        // уже некуда. Поэтому высота фиксированная, а не ступень плотности.
        "inline-flex shrink-0 items-center px-2",
        tall ? "h-8 rounded-md" : "h-6 rounded-sm",
        SKIN[status],
      )}
    >
      <Typography variant="metaText" tone="current">
        {LABEL[status]}
      </Typography>
    </span>
  )
}

export { StatusChip }
export type { StatusChipProps, ListingStatus }
