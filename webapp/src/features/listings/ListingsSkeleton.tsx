import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Загрузка выдачи.
 *
 * Снято с экрана `pG4yw` «СОСТОЯНИЕ · Загрузка выдачи»: пять строк по 88
 * в белой панели с радиусом 16, колонки те же, что у настоящей строки —
 * 16 / 432 / 596 / 748. Скелет повторяет раскладку, а не намекает на неё:
 * когда данные приедут, ничего не прыгнет.
 *
 * **Скелетоны, а не крутилка, и загрузка называет, чего ждёт.** Это правило
 * DESIGN.md, и файл его подтверждает: над скелетом стоит «Ищем в 4 источниках»
 * и «2 из 4 ответили · Авито и Циан». Спиннера без слов не бывает — человек
 * должен понимать, кого мы ждём и сколько уже ответило.
 *
 * Нижняя линия есть у всех пяти строк, включая последнюю: в списке с данными
 * последняя её теряет, а в скелете нет — так в файле. Разница читается как
 * «список продолжается, просто пока не приехал».
 *
 * Чего здесь **нет намеренно**: задержки 150 мс перед показом и удержания
 * минимум 400 мс. Это правила про данные, а не про вид, и заводить их
 * без сетевого слоя не на чем — сейчас показывать нечего и нечего ждать.
 */

/** Плашка скелета. Цвет из макета, мерцание из DESIGN.md — см. `index.css`. */
function Plate({ className }: { className: string }) {
  return <span aria-hidden className={cn("skeleton-plate block", className)} />
}

type ListingsSkeletonProps = {
  /** Что грузим: «Ищем в 4 источниках». */
  title?: string
  /** Насколько продвинулись: «2 из 4 ответили · Авито и Циан». */
  note?: string
  /** Сколько строк рисовать. В макете пять. */
  rows?: number
}

function ListingsSkeleton({
  title = "Ищем в 4 источниках",
  note = "2 из 4 ответили · Авито и Циан",
  rows = 5,
}: ListingsSkeletonProps) {
  const rowIndexes = Array.from({ length: rows }, (_, index) => index)

  return (
    <div data-slot="listings-skeleton" className="flex h-full w-full flex-col gap-3">
      {/* Строка состояния — та же форма, что у шапки выдачи: 36, зазор 10. */}
      <div className="flex h-9 w-full items-center gap-2.5">
        <Typography variant="rowPrice" tone="default">
          <>{title}</>
        </Typography>
        <Typography variant="denseText" tone="dense">
          <>{note}</>
        </Typography>
      </div>

      <div
        role="status"
        aria-busy="true"
        aria-label={`${title}. ${note}`}
        className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface"
      >
        {rowIndexes.map((index) => (
          <div
            key={index}
            data-slot="skeleton-row"
            className="flex h-row-obj w-full shrink-0 items-center gap-8 border-b border-line-2 px-cell"
          >
            {/* Кадр объекта: та же клетка 84 × 56, что и в настоящей строке.
                Скелет обязан повторять КОЛОНКИ, а не намекать на них: иначе
                при появлении данных список дёргается, и человек видит не
                загрузку, а перестройку. */}
            <Plate className="h-14 w-21 shrink-0 rounded-xl" />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Plate className="h-4 w-50 rounded-sm" />
              <Plate className="h-3 w-70 rounded-sm" />
            </div>

            <div className="flex w-33 shrink-0 flex-col gap-2">
              {/* Радиус 2 законен: полоска высотой 5, при радиусе 6 стала бы капсулой. */}
              <Plate className="h-[5px] w-24 rounded-bar" />
              <Plate className="h-[11px] w-15 rounded-sm" />
            </div>

            <div className="flex w-30 shrink-0 items-center gap-3">
              <Plate className="size-6 rounded-full" />
              <Plate className="h-6 w-21 rounded-sm" />
            </div>

            <Plate className="h-ctl-sm w-36 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { ListingsSkeleton }
export type { ListingsSkeletonProps }
