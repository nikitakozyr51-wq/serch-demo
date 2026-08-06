import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Бейдж состояния в таблицах агентства.
 *
 * **ПОДЛОЖКИ БОЛЬШЕ НЕТ** (передача 05.08.2026, раздел 1). Статус перестал
 * быть плашкой: кружок 6 px цветом `*-glyph` плюс подпись цветом `*-text`,
 * зазор 6, ни заливки, ни рамки.
 *
 * Почему так честнее. Плашка — это поверхность, а состояние не поверхность:
 * оно ничего не содержит и никуда не ведёт. В таблице на восемь колонок
 * восемь плашек в колонке статуса читались как восемь кнопок, которых там
 * нет. Точка называет состояние, не притворяясь контролом.
 *
 * Подложка сохраняется ровно в трёх случаях, и ни один из них не здесь:
 * алерт во всю ширину, подпись поверх фотографии, скелет загрузки.
 *
 * Набор состояний у каждой таблицы свой, и смешивать их нельзя: у объекта
 * «В работе», «Отказ», «Раскрыт»; у номера в реестре «Скрыт», «На удалении»,
 * «Удалён»; у сотрудника «Активен» и «Отключён».
 *
 * Три тона говорят разное:
 *
 *   calm       обычное состояние, ничего не происходит
 *   attention  идёт процесс или что-то требует взгляда
 *   done       состояние закончилось, действий больше нет
 */
type ChipTone = "calm" | "attention" | "done"

/**
 * Кружок и подпись берут РАЗНЫЕ токены одного цвета, и это не описка.
 * `*-glyph` ярче: пятно 6 px на светлом фоне обязано быть заметнее буквы,
 * иначе оно теряется. `*-text` темнее: подпись читают, а не замечают,
 * и ей нужен контраст, а не яркость.
 */
const SKIN: Record<ChipTone, { dot: string; label: string }> = {
  calm: { dot: "bg-ok-glyph", label: "text-ok-text" },
  attention: { dot: "bg-warn-glyph", label: "text-warn-text" },
  done: { dot: "bg-text-dense", label: "text-text-dense" },
}

function AgencyChip({ label, tone = "calm" }: { label: string; tone?: ChipTone }) {
  const skin = SKIN[tone]

  return (
    <span
      data-slot="agency-chip"
      data-tone={tone}
      className="inline-flex shrink-0 items-center gap-1.5"
    >
      {/* Кружок нарисован, а не набран символом: точка шрифта меняет размер
          вместе с кеглем подписи и на разной плотности расходится с макетом. */}
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", skin.dot)} />
      <span className={skin.label}>
        <Typography variant="metaText" tone="current">
          {label}
        </Typography>
      </span>
    </span>
  )
}

export { AgencyChip }
export type { ChipTone as AgencyChipTone }
