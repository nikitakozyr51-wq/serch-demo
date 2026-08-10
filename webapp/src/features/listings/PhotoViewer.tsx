import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { Typography } from "@/components/typography"
import { setOverlayOpen } from "@/platform/overlay"
import { cn } from "@/lib/utils"

/**
 * Просмотрщик кадров объекта.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * СВОЕГО КАДРА В PENCIL НЕТ, И ЭТО ЗАПИСАНО, А НЕ ЗАМОЛЧАНО
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Карточка объекта показывает главный кадр, четыре миниатюры и плашку
 * «ещё 12 фото» — то есть прямо обещает, что кадров больше, чем видно.
 * Экрана, куда это обещание ведёт, в файле не нарисовано ни на одной
 * платформе. Владелец увидел следствие первым: «не нажимается изображение
 * в товаре никакое, ни на мобильной версии, ни на ПК-версии».
 *
 * Выдумывать новый визуальный язык под это нельзя, и не понадобилось.
 * Просмотрщик собран из того, что в продукте уже есть: скрим `#1e1e1e59`
 * ровно как у окон агентства, радиус `r-media` как у крупного кадра
 * в карточке, круглые кнопки 44 тёплой заливкой как у мобильных контролов,
 * счётчик 12/600 как у меты. Ни одного нового значения не заведено.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ОДИН КОМПОНЕНТ НА ОБЕ ПЛАТФОРМЫ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Не «десктопный просмотрщик и его мобильная копия»: разъезжаются именно
 * копии. Кадр сам занимает столько, сколько даёт экран, стрелки на узком
 * экране уходят под кадр, счётчик остаётся на месте. Больше между
 * платформами не отличается ничего — потому что и отличаться нечему:
 * задача одна, показать снимок целиком.
 *
 * Управление: стрелки клавиатуры, `Escape`, нажатие мимо кадра, свайп
 * пальцем. Четыре способа выйти и три способа листать — просмотрщик это
 * тупик, и выбраться из него человек должен любым движением, которое
 * первым придёт в голову.
 */
type PhotoViewerProps = {
  /** Все кадры объекта. Пустой список — просмотрщик не открывается вовсе. */
  shots: string[]
  /** С какого кадра открыли: нажали на миниатюру — открывается она. */
  startAt: number
  /** Адрес для подписи под кадром и для `alt`. */
  address: string
  onClose: () => void
}

function PhotoViewer({ shots, startAt, address, onClose }: PhotoViewerProps) {
  const [index, setIndex] = useState(startAt)
  const total = shots.length

  const step = useCallback(
    (delta: number) => {
      // По кругу: на последнем кадре «вперёд» возвращает к первому. Тупик
      // в конце списка заставлял бы отматывать двенадцать кадров назад.
      setIndex((current) => (current + delta + total) % total)
    },
    [total],
  )

  /**
   * Просмотрщик ОБЪЯВЛЯЕТ СЕБЯ ОКНОМ, и это не формальность.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * В кабинете есть общий счётчик открытых окон, и `useHotkeys` молчит,
   * пока он не ноль. Правило заведено после того, как `Enter` из командной
   * палитры раскрыл контакт на скрытой под ней выдаче — то есть списал
   * 199 ₽ из окна, которое о выдаче ничего не знает.
   *
   * Просмотрщик этот счётчик не трогал, и та же беда вернулась вдвое хуже.
   * Он открывается с карточки объекта, где `Escape` уводит в выдачу,
   * а `←` и `→` листают список, — и с экрана прозвона, где `Enter`, `2`,
   * `3` и `h` ЗАПИСЫВАЮТ ИСХОД ЗВОНКА в журнал агентства. Оба обработчика
   * висят на окне и оба срабатывают на одно нажатие: человек листал
   * фотографию, а продукт под ней отмечал разговор, которого не было,
   * и переходил к следующему объекту очереди.
   *
   * Счётчик поднимается на всё время жизни окна и опускается при закрытии
   * — включая закрытие вместе с экраном, потому что снятие возвращает
   * функция очистки, а не обработчик кнопки.
   */
  useEffect(() => {
    setOverlayOpen(true)
    return () => setOverlayOpen(false)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return
      }
      // Клавиша принадлежит просмотрщику целиком: экран под ним слушает
      // те же три и без остановки получил бы их вторым.
      event.preventDefault()
      event.stopPropagation()
      if (event.key === "Escape") onClose()
      if (event.key === "ArrowRight") step(1)
      if (event.key === "ArrowLeft") step(-1)
    }
    // `capture`: перехват до того, как событие дойдёт до слушателей экрана.
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [onClose, step])

  /**
   * Начало жеста: где палец лёг и попал ли он мимо кадра.
   *
   * Порог листания 40 px, а не любое смещение: без порога просмотрщик
   * перелистывался бы от дрожания руки при попытке просто закрыть его.
   *
   * Признак «мимо кадра» запоминается вместе с точкой, а не проверяется
   * при отпускании: за время жеста палец успевает съехать с фона на снимок
   * и обратно, и решать по конечной точке значило бы закрывать окно
   * по случайности того, где палец остановился.
   */
  const [from, setFrom] = useState<{ x: number; onBackdrop: boolean } | null>(null)

  if (total === 0) return null

  return (
    <div
      data-slot="photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Кадры объекта ${address}`}
      className="scrim-in fixed inset-0 z-60 flex flex-col items-center justify-center gap-4 bg-[#1e1e1e59] p-4"
      /*
        ЗАКРЫТИЕ — НА ОТПУСКАНИИ, А НЕ НА НАЖАТИИ, И ЭТО УСЛОВИЕ СВАЙПА.

        ═══════════════════════════════════════════════════════════════════

        Сначала фон закрывал окно по `pointerdown` и там же запоминал начало
        жеста. Две несовместимые вещи разом: свайп начинается там же, где
        срабатывает закрытие, — и обещанный в шапке файла жест был невозможен
        нигде, кроме самого снимка.

        А снимок занимает меньше трети площади: он идёт `object-contain`,
        и кадр 900 × 600 на экране 390 × 844 — это примерно 390 × 260
        из семисот доступных по высоте. Остальное фон. То есть палец
        почти всегда ложился туда, где движение обрывалось закрытием
        на первом же кадре, ещё до того, как стало ясно, что это листание.

        Теперь нажатие только запоминает точку, а решение принимается
        на отпускании: сдвинулся дальше сорока — листаем, остался
        на месте и попал мимо кадра — закрываем. Случайный сдвиг пальца
        при этом перестал закрывать окно, а не только перестал мешать.
      */
      onPointerDown={(event) => {
        setFrom({ x: event.clientX, onBackdrop: event.target === event.currentTarget })
      }}
      onPointerUp={(event) => {
        if (from === null) return
        const shift = event.clientX - from.x
        const wasOnBackdrop = from.onBackdrop
        setFrom(null)
        if (Math.abs(shift) >= 40) {
          step(shift < 0 ? 1 : -1)
          return
        }
        if (wasOnBackdrop) onClose()
      }}
      // Палец ушёл за край окна или жест перехватила система: ничего
      // не делаем, но начало забываем — иначе следующее отпускание
      // где угодно посчиталось бы концом этого жеста.
      onPointerCancel={() => setFrom(null)}
    >
      {/* Крестик у верхнего края, а не над кадром: кадр занимает всё, что
          может, и кнопка над ним отъедала бы у него высоту. */}
      <button
        type="button"
        data-slot="photo-viewer-close"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute top-4 right-4 flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface text-fg transition-colors outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
      >
        <X aria-hidden className="size-5" strokeWidth={2} />
      </button>

      <img
        src={shots[index]}
        alt={`Кадр ${index + 1} из ${total}: ${address}`}
        // `contain`, а не `cover`: просмотрщик открывают, чтобы увидеть
        // снимок целиком, и обрезать его здесь значило бы отменить причину,
        // по которой его открыли.
        className="max-h-[calc(100svh-9rem)] max-w-full rounded-2xl object-contain"
      />

      <div className="flex items-center gap-4">
        <ViewerStep label="Предыдущий кадр" icon={ChevronLeft} onPress={() => step(-1)} />
        <span className="flex h-11 min-w-20 items-center justify-center rounded-full bg-surface px-4">
          <Typography variant="metaStrong" tone="secondary">
            {`${index + 1} / ${total}`}
          </Typography>
        </span>
        <ViewerStep label="Следующий кадр" icon={ChevronRight} onPress={() => step(1)} />
      </div>
    </div>
  )
}

function ViewerStep({
  label,
  icon: Icon,
  onPress,
}: {
  label: string
  icon: typeof ChevronLeft
  onPress: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className={cn(
        "flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface text-fg",
        "transition-colors outline-none active:bg-warm-hover",
        "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface",
      )}
    >
      <Icon aria-hidden className="size-5" strokeWidth={2} />
    </button>
  )
}

export { PhotoViewer }
export type { PhotoViewerProps }
