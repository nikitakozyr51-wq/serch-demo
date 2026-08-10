import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { ListingPhoto } from "./ListingPhoto"
import { photosFor } from "./demo-photos"

/**
 * Строка похожего объекта — одна форма на тизер и на полный список.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ОДНА ФОРМА
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Тизер внутри карточки объекта (`f5qg35`) и полный экран похожих (`GUrdB`)
 * показывают одно и то же и отличаются только объёмом: тизер два объекта
 * без фильтров, экран — четыре, восемь чипов и строку «Ещё 4 похожих».
 * Пока это были два куска разметки, они разошлись: у тизера цена стояла
 * справа вверху, у экрана — внизу слева; у тизера была рамка со всех сторон,
 * у экрана волосяная линия сверху. Один и тот же объект выглядел двумя
 * разными вещами на двух соседних экранах.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОДПИСЬ СТОИТ ПОД КАДРАМИ, КОЛОНКИ ВЫРОВНЕНЫ ПО ВЕРХУ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Замер `KPEaF` (экран) и `T39GI` (тизер): пара кадров 100 — два по 48
 * с зазором 4, — под ними подпись «КУХНЯ И КУХНЯ» 11/600 капслоком. Пока
 * подпись стояла НАД кадрами, сами кадры начинались на 22 px ниже адреса
 * справа, и строка читалась съехавшей: глаз ищет верх картинки на одной
 * линии с первой строкой текста.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * СТРОКА НАЖИМАЕТСЯ ЦЕЛИКОМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Раньше в ней работала только кнопка раскрытия — то есть единственным
 * доступным действием было заплатить. Посмотреть похожий объект, прежде
 * чем платить за его контакт, было нельзя ни на одной платформе. Открытие
 * карточки ничего не стоит, и оно обязано быть первым.
 *
 * Кнопка при этом гасит всплытие: «Раскрыть · 199 ₽» и «открыть карточку» —
 * разные намерения, и одно нажатие не может значить оба.
 */
type SimilarRowProps = {
  /** Адрес похожего объекта. Он же ключ к его кадрам и к его карточке. */
  address: string
  /** Адрес объекта, из карточки которого смотрят: его кадр стоит слева первым. */
  compareWith: string
  /** Что сравнили: «КУХНЯ И КУХНЯ». Вывод модели, а не поле базы. */
  caption: string
  price: string
  deviation: number
  /** Район, комнатность, площадь, этаж — одной строкой. */
  meta: string
  /**
   * Чем похоже: «панельный 1969-го, школа в 200 м».
   *
   * Только в тизере. На полном экране этой строки нет — там объектов четыре,
   * и вывод модели, повторённый четырежды, перестаёт читаться выводом.
   */
  why?: string
  /** Подпись действия: «Раскрыть · 199 ₽» или «Открыть · 0 ₽». */
  actionLabel: string
  /** Нажатие спишет деньги: кнопка красная в покое. */
  charges?: boolean
  /** Поля строки: в тизере 12 со всех сторон, на экране [12, 16]. */
  wide?: boolean
  onOpen?: () => void
  onAction?: () => void
}

function SimilarRow({
  address,
  compareWith,
  caption,
  price,
  deviation,
  meta,
  why,
  actionLabel,
  charges = false,
  wide = false,
  onOpen,
  onAction,
}: SimilarRowProps) {
  // Слева кадр объекта, из карточки которого смотрят, справа — кадр похожего.
  // Порядок именно такой: сравнение читается «это и вот это», а не наоборот.
  const mine = photosFor(compareWith, 2)
  const theirs = photosFor(address, 2)

  return (
    <div
      data-slot="similar-row"
      data-address={address}
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-2 bg-surface",
        // Волосяная линия сверху, а не рамка кругом: строки лежат на одной
        // поверхности, и рамка сделала бы из списка стопку карточек.
        "shadow-[inset_0_1px_0_var(--line-1)]",
        "row-tap",
        wide ? "px-4 py-3" : "p-3",
      )}
    >
      {/* По верху, а не по центру: пара кадров и адрес обязаны начинаться
          на одной линии, иначе строка читается съехавшей. */}
      <div className="flex w-full items-start gap-2.5">
        <div className="flex w-25 shrink-0 flex-col gap-1.5">
          <div className="flex gap-1">
            <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-warm">
              <ListingPhoto src={mine[0]} alt={`Кадр объекта ${compareWith}`} size="small" reason="no-photos" />
            </div>
            <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-warm">
              <ListingPhoto src={theirs[0]} alt={`Кадр объекта ${address}`} size="small" reason="no-photos" />
            </div>
          </div>
          <Typography variant="columnHeader" tone="dense">
            {caption}
          </Typography>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Typography variant="rowPrice" tone="default">
            {address}
          </Typography>
          <Typography variant="denseText" tone="dense">
            {meta}
          </Typography>
          {why === undefined ? null : (
            <Typography variant="denseText" tone="dense">
              {why}
            </Typography>
          )}
        </div>
      </div>

      <div className="flex w-full items-center gap-2">
        <Typography variant="rowPrice" tone="default">
          {price}
        </Typography>
        <SimilarDeviation percent={deviation} />
        <div className="h-px flex-1" />
        <button
          type="button"
          data-slot="similar-action"
          onClick={(event) => {
            event.stopPropagation()
            onAction?.()
          }}
          className={cn(
            // Кнопка 32 при норме 44: зона касания добирается псевдоэлементом.
            "tap-44",
            "flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full px-4 transition-colors",
            "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
            // Тот же закон, что в выдаче: красный означает списание всегда
            // и в покое. Прежняя запись «в списке похожих кнопка графитовая,
            // потому что раскрытие тут не главное действие экрана» отменена
            // 10.08.2026 — цвет говорит про деньги, а не про важность.
            charges
              ? "bg-accent-deep text-surface hover:bg-accent-hover active:bg-accent-hover"
              : "bg-fg text-surface hover:bg-fg-hover active:bg-fg-press",
          )}
        >
          <Typography variant="controlLabel" tone="current">
            {actionLabel}
          </Typography>
        </button>
      </div>
    </div>
  )
}

/**
 * Отклонение в строке похожих: 13/600, цветом по знаку.
 *
 * Собрано отдельно от `MarketDeviation`, потому что там отклонение идёт 12/600
 * двумя узлами с зазором 4, а в списке похожих файл рисует его одним текстом
 * на ступень крупнее. Полосы те же и берутся из одного закона: ±5 % — мёртвая
 * зона со словами «≈ рынок», дешевле — зелёное со знаком ▼, дороже — красное
 * со знаком ▲.
 *
 * Знак пишется всегда: цвет не может быть единственным носителем смысла.
 */
function SimilarDeviation({ percent }: { percent: number }) {
  if (Math.abs(percent) <= 5) {
    return (
      <Typography variant="numericDense" tone="dense">
        ≈ рынок
      </Typography>
    )
  }

  const cheaper = percent < 0

  return (
    <Typography variant="numericDense" tone={cheaper ? "ok" : "destructive"}>
      {`${cheaper ? "▼ −" : "▲ +"}${Math.abs(percent)} %`}
    </Typography>
  )
}

export { SimilarRow, SimilarDeviation }
export type { SimilarRowProps }
