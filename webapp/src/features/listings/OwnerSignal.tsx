import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Признак собственника: шкала из трёх сегментов плюс слово.
 *
 * Геометрия снята с `jsW77`: сегмент 20 × 5 с радиусом 2, зазор между
 * сегментами 4, зазор до слова 8. Радиус 2 здесь законен — это ровно тот
 * случай, ради которого он оставлен в системе: полоска высотой до 8 px
 * с радиусом 6 превратилась бы в капсулу и потеряла прямоугольность,
 * по которой шкала и читается.
 *
 * Шкала раньше была единственным носителем смысла — нарушение правила
 * «цвет не единственный носитель». Теперь рядом стоит слово, и оба
 * считаются по одному закону из антидубля:
 *
 *   1 объявление, 1 номер    → Сильные, 3 сегмента
 *   2–3 объявления, 1 номер  → Средние, 2 сегмента
 *   2 и больше номеров       → Слабые, 1 сегмент
 *
 * Шкала нейтральная, не зелёная: семантика декоративно не применяется.
 */
// Шкала, слова и тип живут рядом друг с другом в `owner-strength.ts`:
// файл с компонентом не может отдавать ещё и функции — быстрая перезагрузка
// перестаёт работать на всём файле.
import { FILLED, WORD, type OwnerStrength } from "./owner-strength"

type OwnerSignalProps = {
  strength: OwnerStrength
  /** Публикации · площадки · номера. Считается по тому же закону, что и шкала. */
  publications: number
  platforms: number
  phones: number
  /**
   * Где стоит признак. Сегмент и оценка меняются вместе с местом,
   * и все три набора сняты замером:
   *
   *   `row`    строка выдачи   — сегмент 20 × 5, оценка 11/500 приглушённая
   *   `card`   карточка объекта — сегмент 26 × 5, оценка **14/600 графитом**
   *   `phone`  мобильная строка — сегмент 18 × 5, оценка 11/500 приглушённая
   *
   * На карточке оценка крупная и тёмная, потому что это вывод, ради которого
   * человек сюда пришёл, а не подпись к полоскам. В строке выдачи — наоборот:
   * там она одна из девяти и шуметь не должна.
   */
  place?: "row" | "card" | "phone"
}

const SEGMENT: Record<"row" | "card" | "phone", string> = {
  row: "w-5",
  card: "w-6.5",
  phone: "w-4.5",
}

function OwnerSignal({
  strength,
  publications,
  platforms,
  phones,
  place = "row",
}: OwnerSignalProps) {
  const filled = FILLED[strength]
  const inline = place !== "row"

  return (
    <div
      data-slot="owner-signal"
      data-strength={strength}
      className={cn("flex flex-col gap-1.5", inline ? "w-auto" : "w-full")}
    >
      <div className={cn("flex items-center gap-2", inline ? "w-auto" : "w-full")}>
        <div className="flex gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={cn(
                "h-[5px] rounded-full",
                SEGMENT[place],
                index < filled ? "bg-fg" : "bg-line-2",
              )}
            />
          ))}
        </div>
        {place === "card" ? (
          <Typography variant="controlLabel" tone="default">
            {WORD[strength]}
          </Typography>
        ) : (
          <Typography variant="signalLabel" tone="dense">
            {WORD[strength]}
          </Typography>
        )}
      </div>
      {inline ? null : (
        <Typography variant="signalLabel" tone="dense">
          {publications} · {platforms} · {phones}
        </Typography>
      )}
    </div>
  )
}

export { OwnerSignal }
export type { OwnerSignalProps, OwnerStrength }
