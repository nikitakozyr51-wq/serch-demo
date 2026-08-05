import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Тёплая полоса-пояснение под вкладками.
 *
 * Снято с экранов баланса: 1152 × 44, заливка `warm`, радиус 10, поля [0, 16],
 * зазор 12. Слева — правило графитом 13/600, справа — оговорка 12/500.
 *
 * **Это не предупреждение, а правило игры**, поэтому полоса тёплая, а не жёлтая:
 * «списание происходит в момент раскрытия, отдельного подтверждения нет».
 * Жёлтый вариант оставлен для случая, когда действие уже невозможно —
 * например, денег на счету нет.
 *
 * Правило и оговорка разведены по краям намеренно: короткое правило читают
 * все, длинную оговорку — те, кому она понадобилась.
 */
function NoticeBar({
  rule,
  note,
  aside,
  tone = "calm",
}: {
  rule: string
  note?: string
  /** Дополнительный узел между правилом и оговоркой: шкала лимита. */
  aside?: ReactNode
  tone?: "calm" | "warn"
}) {
  return (
    <div
      data-slot="notice-bar"
      data-tone={tone}
      className={cn(
        "flex w-full shrink-0 items-center gap-3 rounded-lg px-4 py-3",
        tone === "warn" ? "bg-warn-tint" : "bg-warm",
      )}
    >
      <Typography variant="numericDense" tone={tone === "warn" ? "warn" : "default"}>
        {rule}
      </Typography>
      {aside === undefined ? null : <>{aside}</>}
      {note === undefined ? null : (
        <>
          <div className="h-px flex-1" />
          <Typography variant="metaText" tone="dense">
            {note}
          </Typography>
        </>
      )}
    </div>
  )
}

export { NoticeBar }
