import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Обойма взаимоисключающего выбора: «Продажа | Аренда».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ НЕ ДВА ЧИПА
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * В этом продукте **форма отвечает за поведение**. Чипы комбинируются: их
 * можно выбрать несколько, и человек это знает по виду. Режим выдачи
 * комбинировать нельзя — смешанный список физически нечитаем, потому что
 * в одной колонке цены не могут стоять «8,6 млн ₽» и «70 000 ₽/мес».
 * Это разные шкалы.
 *
 * Первая версия была собрана двумя чипами: та же пилюля, та же логика
 * «выбранный залит `fg`». Форма говорила «меня можно комбинировать»,
 * а поведение — обратное. Возможность смешать надо убирать конструкцией,
 * а не договорённостью.
 *
 * Собрано так: внешняя капсула с рамкой `border-control`, внутри две капсулы
 * без зазора, активная залита `fg`. Капсула в капсуле читается как один
 * контрол с двумя положениями, а не как два контрола.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Высоты держатся на лестнице: обойма — ступень `sm` (32 просторно, 28
 * плотно), внутренние капсулы — ступень чипа (28 / 24). Разница ровно
 * в поле 2 с каждой стороны, и своих чисел здесь не появляется.
 */
function Segment<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (next: T) => void
  /** Что выбирают. Уходит в доступное имя группы, на экране не рисуется. */
  label: string
}) {
  return (
    <div
      data-slot="segment"
      role="radiogroup"
      aria-label={label}
      className="flex h-ctl-sm w-full shrink-0 items-center rounded-full border border-border-control p-0.5"
    >
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-slot="segment-option"
            data-active={active || undefined}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex h-ctl-chip min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full",
              "transition-colors duration-120",
              "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
              active
                ? "bg-fg hover:bg-fg-hover active:bg-fg-press"
                : "bg-transparent hover:bg-warm active:bg-warm-hover",
            )}
          >
            <Typography variant="controlLabel" tone={active ? "inverse" : "secondary"}>
              <>{option.label}</>
            </Typography>
          </button>
        )
      })}
    </div>
  )
}

export { Segment }
