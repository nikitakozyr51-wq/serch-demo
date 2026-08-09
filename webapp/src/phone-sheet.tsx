import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Лист снизу со скримом внутри кадра телефона.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Файл рисует лист двумя разными формами, и это расхождение файла с самим
 * собой, а не решение.** Подтверждение массового раскрытия, панель действий
 * и все листы объекта идут широкой формой (радиус 24, поля [12, 20, 32, 20],
 * хват 36 × 5 цветом `line-2`, затемнение 35 %). Лист «Сохранить поиск» идёт
 * формой поуже (радиус 16, поля [12, 16, 24, 16], хват 36 × 4 цветом `line-3`,
 * затемнение 45 %). Обе воспроизведены как нарисованы.
 *
 * Общий у обеих только зазор 20 между блоками и нижнее поле больше верхнего:
 * под листом системная полоса жеста, и кнопка, прижатая к самому краю,
 * ловилась бы вместе с ней.
 *
 * Общий `MobileSheet` из `@/features/cabinet` сюда не встал: его скрим задан
 * высотой `h-svh` и внутри рамки 844 уезжает за нижний край.
 *
 * **Живёт отдельным модулем, а не внутри экрана.** Сначала лист стоял
 * в `mobile-search-extra-screens.tsx` и обслуживал три кадра. Кадров стало
 * шесть, и они разъехались по двум файлам — выдача и объект. Вторая копия
 * листа означала бы два разных радиуса у одного и того же листа через месяц.
 */
function PhoneSheet({
  shape = "wide",
  label,
  children,
}: {
  /** `wide` — лист массовых действий, `form` — лист с полями «Сохранить поиск». */
  shape?: "wide" | "form"
  label: string
  children: ReactNode
}) {
  const form = shape === "form"

  return (
    <div
      data-slot="phone-sheet-scrim"
      className={cn(
        "absolute inset-0 z-10 flex flex-col justify-end",
        form ? "bg-[#1e1e1e73]" : "bg-[#1e1e1e59]",
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-slot="phone-sheet"
        className={cn(
          "flex w-full flex-col gap-5 bg-surface",
          form ? "rounded-t-2xl px-4 pt-3 pb-6" : "rounded-t-3xl px-5 pt-3 pb-8",
        )}
      >
        {/* Хват говорит, что лист тянется пальцем. Крестика в файле нет. */}
        <div className="flex w-full justify-center">
          <span
            aria-hidden
            className={cn(
              "w-9 shrink-0 rounded-full",
              form ? "h-1 bg-line-3" : "h-[5px] bg-line-2",
            )}
          />
        </div>
        {children}
      </div>
    </div>
  )
}

export { PhoneSheet }
