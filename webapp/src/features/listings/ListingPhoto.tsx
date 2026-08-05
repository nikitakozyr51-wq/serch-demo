import {
  PhotoPlaceholder,
  type MissingPhotoReason,
  type PhotoPlaceholderSize,
} from "./PhotoPlaceholder"

/**
 * Слот изображения объекта.
 *
 * Кадра может не быть, и это **обычное состояние слота**, а не сбой. Поэтому
 * решение принимается по данным — есть ссылка или нет, — а не по событию
 * ошибки загрузки. Обработчик `onError` тут был бы неправ дважды: он ловит
 * только один случай из четырёх и показывает заглушку с задержкой, уже после
 * того, как слот моргнул пустотой.
 *
 * Фотографии продукт не хранит: кадр живёт ссылкой на площадку и исчезает
 * вместе с объявлением. Значит отсутствие ссылки — не редкость, а норма,
 * с которой слот обязан уметь жить.
 */
type ListingPhotoProps = {
  /** Ссылка на кадр у площадки. Нет ссылки — рисуется заглушка. */
  src?: string
  /** Что на кадре: адрес объекта. Нужен для доступности. */
  alt: string
  size: PhotoPlaceholderSize
  /** Почему кадра нет. Обязательна, когда ссылки нет: молчаливой пустоты не бывает. */
  reason?: MissingPhotoReason
  /** Что известно про дом без фотографии. Показывается в крупном слоте. */
  facts?: string
}

function ListingPhoto({ src, alt, size, reason, facts }: ListingPhotoProps) {
  if (!src) {
    return (
      <PhotoPlaceholder size={size} reason={reason ?? "no-photos"} facts={facts} />
    )
  }

  return (
    <img
      data-slot="listing-photo"
      src={src}
      alt={alt}
      className="size-full object-cover"
    />
  )
}

export { ListingPhoto }
export type { ListingPhotoProps }
