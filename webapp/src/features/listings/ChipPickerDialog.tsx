import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { TextField } from "@/components/controls/TextField"
import { Typography } from "@/components/typography"
import { DialogCard } from "@/components/DialogCard"
import { cn } from "@/lib/utils"
import { plural } from "./plural"

/**
 * Выбор из полного списка: районы и станции метро.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАЧЕМ ОКНО ВООБЩЕ ПОЯВИЛОСЬ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * В кадре `I55fb` в группе «РАЙОН» четыре чипа, и четвёртый — **«+ район»**.
 * В группе «МЕТРО» три ряда, и во втором стоит **«+ станция»**. То есть колонка
 * фильтров в файле не перечисляет всё, что есть в городе: она показывает
 * выбранное и даёт способ добавить остальное.
 *
 * Продукт делал два разных неправильных дела. Районы он вываливал все восемь
 * подряд — они переносились, и ритм колонки ломался: шаг между явными рядами
 * 44, а между перенесёнными строками 36. Станций он показывал две из
 * тридцати одной, а «+ станция» была чипом без действия.
 *
 * Отсюда окно. Оно не выдумано: форма взята у уже нарисованного окна выбора
 * адреса (`t2YEw`) — тот же каркас `DialogCard`, то же поле сверху, те же
 * чипы, тот же ряд действий внизу. Отдельного кадра под выбор станции в файле
 * нет, и это названо вслух: собственного кадра ждать нечего, а колонка
 * с восемью районами спорит с файлом уже сегодня.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ЗДЕСЬ ПОИСК, А НЕ ПРОСТО СПИСОК
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Станций тридцать одна. Список из тридцати одного чипа — это тот же самый
 * ковёр, от которого окно и спасает, только в окне. Поле сверху отвечает
 * на вопрос «Пионерская есть?» одним словом.
 *
 * Счётчик у каждого чипа — из базы. Он отвечает на вопрос, который человек
 * задаёт следующим: «а сколько там объектов». Ноль показывается тоже: пустая
 * станция — это ответ, а не ошибка.
 */
function ChipPickerDialog({
  title,
  lead,
  label,
  placeholder,
  options,
  selected,
  onApply,
  onClose,
  leaving = false,
}: {
  title: string
  lead: string
  /** Метка над полем поиска, капслоком. */
  label: string
  placeholder: string
  /** Что можно выбрать и сколько за каждым объектов. */
  options: { id: string; label: string; count: number }[]
  /** Что выбрано сейчас. */
  selected: string[]
  onApply: (next: string[]) => void
  onClose: () => void
  /** Окно уходит: 120 мс после закрытия. Решение о жизни узла — у выдачи. */
  leaving?: boolean
}) {
  /**
   * Черновик, а не сразу отбор.
   *
   * Окно открывают, чтобы добавить две-три станции. Отбор по каждому нажатию
   * дёргал бы выдачу под окном на каждый чип, и человек читал бы мелькание
   * вместо списка. Применяется одним нажатием, отменяется закрытием.
   */
  const [draft, setDraft] = useState<string[]>(selected)
  const [query, setQuery] = useState("")

  const clean = query.trim().toLowerCase()
  const visible =
    clean === "" ? options : options.filter((item) => item.label.toLowerCase().includes(clean))

  const toggle = (id: string) =>
    setDraft((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )

  return (
    <div
      data-slot="dialog-scrim"
      aria-label={title}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]",
        leaving ? "scrim-out" : "scrim-in",
      )}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={cn("h-fit", leaving ? "motion-out" : "motion-in")}>
        <DialogCard rhythm="medium">
          <Typography variant="panelTitle" tone="default" as="h2">
            {title}
          </Typography>
          <Typography variant="uiText" tone="secondary">
            {lead}
          </Typography>

          <div className="flex w-full flex-col gap-1.5">
            <Typography variant="columnHeader" tone="dense">
              {label}
            </Typography>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={label}
              placeholder={placeholder}
            />
          </div>

          {/*
            Высота ограничена и список прокручивается: тридцать одна станция
            иначе вытянула бы окно за край экрана, и кнопка «Применить»
            оказалась бы за нижней границей — ровно та поломка, которую
            в колонке фильтров уже ловили.
          */}
          <div
            data-slot="chip-picker-list"
            className="flex max-h-70 w-full flex-wrap content-start gap-x-2 gap-y-4 overflow-y-auto"
          >
            {visible.length === 0 ? (
              <Typography variant="denseText" tone="dense">
                {`По запросу «${query.trim()}» ничего не нашлось`}
              </Typography>
            ) : (
              visible.map((item) => (
                <SelectChip
                  key={item.id}
                  label={item.count === 0 ? item.label : `${item.label} · ${item.count}`}
                  selected={draft.includes(item.id)}
                  onClick={() => toggle(item.id)}
                />
              ))
            )}
          </div>

          <Typography variant="denseText" tone="dense">
            Условия складываются: выбранное здесь сужает выдачу вместе с ценой,
            площадью и этажом.
          </Typography>

          <div className="flex w-full items-center gap-2.5">
            <div className="h-px flex-1" />
            <Button
              variant="quiet"
              size="md"
              onClick={() => {
                onApply([])
                onClose()
              }}
            >
              Снять всё
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onApply(draft)
                onClose()
              }}
            >
              {draft.length === 0
                ? "Применить"
                : `Применить ${draft.length} ${plural(draft.length, "условие", "условия", "условий")}`}
            </Button>
          </div>
        </DialogCard>
      </div>
    </div>
  )
}

export { ChipPickerDialog }
