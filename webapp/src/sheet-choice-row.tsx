import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Строка выбора в листе: капсула 48, кружок 20, подпись, приписка справа.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Снято с `OWHVQ` и `u2WQZ`, где она нарисована одинаково до пикселя:
 * высота 48, радиус 999, кружок 20 на поле 16, зазор до подписи 12
 * (16 + 20 + 12 = 48 — подпись начинается ровно на 48, как в кадре).
 *
 *   не выбрана   заливка `surface`, кольцо `line-2`,        кружок пустой с кольцом `line-3`
 *   выбрана      заливка `warm`,    кольцо `border-control`, кружок залит графитом
 *
 * **Кольцо нарисовано внутренней тенью, а не `outline`.** `outline` оставлен
 * кольцу фокуса: иначе при переходе Tab граница строки подменялась бы кольцом
 * и человек не видел бы, где он находится. Та же причина, что у `ChoiceRow`
 * листа «Сохранить поиск».
 *
 * **Кружок залит целиком, без белой точки внутри.** Так в обоих кадрах —
 * и так же собран выбор доступа в листе «Новая подборка». Точка внутри
 * пришла бы из другого языка (окно передачи роли на компьютере), а на телефоне
 * её нигде нет.
 *
 * Подпись выбранного идёт весом 600, невыбранного — 500, но графитом оба:
 * приглушать невыбранное нельзя, это не подсказка, а равноправный вариант.
 */
function SheetChoiceRow({
  label,
  note,
  selected,
  onSelect,
}: {
  label: string
  /** Приписка справа: «6 объектов», «создать», «агент · до 30 в день». */
  note?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="sheet-choice-row"
      // Отклик по касанию, а не по отпусканию: между нажатием и щелчком
      // на телефоне лежит больше сотни миллисекунд, и палец за это время
      // успевает решить, что контрол не сработал.
      onPointerDown={onSelect}
      onClick={onSelect}
      className={cn(
        "flex h-ctl-lg w-full cursor-pointer items-center gap-3 rounded-full px-4 text-left",
        "transition-colors duration-120",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        selected
          ? "bg-warm shadow-[inset_0_0_0_1px_var(--border-control)] active:bg-warm-press"
          : "bg-surface shadow-[inset_0_0_0_1px_var(--line-2)] active:bg-warm-hover",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-5 shrink-0 rounded-full",
          selected ? "bg-fg" : "bg-surface shadow-[inset_0_0_0_1px_var(--line-3)]",
        )}
      />
      <div className="min-w-0 flex-1">
        <Typography
          variant={selected ? "controlLabel" : "uiText"}
          tone="default"
          truncate
        >
          {label}
        </Typography>
      </div>
      {note === undefined ? null : (
        <Typography variant="denseText" tone="dense">
          {note}
        </Typography>
      )}
    </button>
  )
}

export { SheetChoiceRow }
