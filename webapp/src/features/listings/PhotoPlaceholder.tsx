import { ImageOff } from "lucide-react"
import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Кадра нет — это норма, а не ошибка.
 *
 * Фотографии продукт не хранит: вектор считается транзитом и удаляется, кадр
 * живёт ссылкой на площадку и исчезает вместе с объявлением. Поэтому
 * отсутствие кадра — обычное состояние слота изображения, а не сбой загрузки,
 * и рисуется оно **всегда одинаково**, а не «когда что-то пошло не так».
 *
 * Геометрия снята с трёх компонентов `C Кадр без фото`:
 *
 *   мелкий   `KuC1Q`   до 96 px    r-6   значок 16, без подписи
 *   средний  `j2uw8`   96–239 px   r-8   значок 20, подпись 12, зазор 6
 *   крупный  `M8WRUo`  от 240 px   r-16  значок 24, причина 16/600,
 *                                        факты 13, зазор 14, поля 32
 *
 * Плашка `warm`, волосяная `line-2`. Значок берёт `text-dense`, а не `text-3`:
 * на тёплом фоне `text-3` даёт ровно 3,00 — впритык к порогу, без запаса.
 *
 * **Заглушка не извиняется.** Она показывает то, что известно про объект
 * без фотографии: серию дома, год, этажность — из блока «Дом» того же объекта,
 * по данным ГИС ЖКХ. Пустая серая плашка сообщает только о нашей неудаче,
 * а эта — о доме.
 */

/** Почему кадра нет. Набор закрыт: других причин не бывает. */
type MissingPhotoReason =
  /** Объявление снято с площадки. Делать нечего — действия нет. */
  | "listing-removed"
  /** Площадка не отдала кадр. Можно попробовать снова. */
  | "fetch-failed"
  /** Модель отсеяла планировки и снимки двора: сравнивать не по чему. */
  | "frames-rejected"
  /** Собственник не приложил фотографий вовсе. */
  | "no-photos"

const REASON_TEXT: Record<MissingPhotoReason, string> = {
  "listing-removed": "Объявление снято",
  "fetch-failed": "Фото не загрузилось",
  "frames-rejected": "Планировки и снимки двора — сравнивать не по чему",
  "no-photos": "Собственник не приложил фотографий",
}

type PhotoPlaceholderSize = "small" | "medium" | "large"

type PhotoPlaceholderProps = {
  size: PhotoPlaceholderSize
  reason: MissingPhotoReason
  /**
   * Что известно про дом без фотографии: «Панельный 1969 года,
   * серия 1-ЛГ-602, 9 этажей — по ГИС ЖКХ». Показывается только в крупном
   * слоте: в мелком и среднем для него нет места.
   */
  facts?: string
  /** Действие по причине: «Обновить», «Открыть объявление». Только в крупном слоте. */
  action?: ReactNode
}

function PhotoPlaceholder({ size, reason, facts, action }: PhotoPlaceholderProps) {
  return (
    <div
      data-slot="photo-placeholder"
      data-size={size}
      data-reason={reason}
      role="img"
      aria-label={REASON_TEXT[reason]}
      className={cn(
        "flex size-full flex-col items-center justify-center border border-line-2 bg-warm text-text-dense",
        size === "small" && "rounded-sm",
        size === "medium" && "gap-1.5 rounded-md",
        size === "large" && "gap-3.5 rounded-2xl p-8",
      )}
    >
      <ImageOff
        aria-hidden
        strokeWidth={2}
        className={cn(
          size === "small" && "size-4",
          size === "medium" && "size-5",
          size === "large" && "size-6",
        )}
      />

      {size === "medium" ? (
        <Typography variant="metaText" tone="dense">
          Нет фото
        </Typography>
      ) : null}

      {size === "large" ? (
        <div className="flex flex-col items-center gap-1.5">
          <Typography variant="rowPrice" tone="default" align="center">
            {REASON_TEXT[reason]}
          </Typography>
          {facts ? (
            <div className="max-w-[400px]">
              <Typography variant="denseText" tone="dense" align="center">
                {facts}
              </Typography>
            </div>
          ) : null}
          <>{action}</>
        </div>
      ) : null}
    </div>
  )
}

export { PhotoPlaceholder }
export type { PhotoPlaceholderProps, PhotoPlaceholderSize, MissingPhotoReason }
