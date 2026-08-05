import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Чип состояния в таблицах агентства.
 *
 * Форма та же, что у чипа объекта — 24 / r-6 / 12 по карте от 04.08, —
 * но **набор другой**, и смешивать их нельзя: у объекта состояния «В работе»,
 * «Отказ», «Раскрыт»; у номера в реестре — «Скрыт», «На удалении», «Удалён»;
 * у сотрудника — «Активен» и «Отключён».
 *
 * Три группы заливок, и они говорят разное:
 *
 *   тёплая, без рамки       обычное состояние, ничего не происходит
 *   тинт внимания           идёт процесс или что-то требует взгляда
 *   белая с рамкой          состояние закончилось, действий больше нет
 */
type ChipTone = "calm" | "attention" | "done"

const SKIN: Record<ChipTone, string> = {
  calm: "bg-warm text-text-2",
  attention: "bg-warn-tint text-warn-text",
  done: "border border-border-control bg-surface text-text-dense",
}

function AgencyChip({ label, tone = "calm" }: { label: string; tone?: ChipTone }) {
  return (
    <span
      data-slot="agency-chip"
      data-tone={tone}
      className={cn("inline-flex h-6 shrink-0 items-center rounded-sm px-2", SKIN[tone])}
    >
      <Typography variant="metaText" tone="current">
        {label}
      </Typography>
    </span>
  )
}

export { AgencyChip }
export type { ChipTone as AgencyChipTone }
