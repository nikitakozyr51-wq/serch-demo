import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { ListingPhoto } from "./ListingPhoto"
import { MarketDeviation } from "./MarketDeviation"
import { OwnerAvatar } from "./OwnerAvatar"
import { OwnerSignal, type OwnerStrength } from "./OwnerSignal"
import { StatusChip, type ListingStatus } from "./StatusChip"

/**
 * Строка выдачи на телефоне.
 *
 * Снято с компонента `G37qjO` «C Строка выдачи, телефон»: 358 × 204, радиус 16,
 * волосяная обводка, вертикально с зазором 10 и полями [12, 14].
 * Вертикаль складывается ровно: 12 + 96 + 10 + 20 + 10 + 44 + 12 = 204.
 *
 * **Это не сжатая десктопная строка, а другой порядок фактов.** На десктопе
 * отклонение стоит в строке цены, свежесть идёт отдельным текстом, фотографии
 * нет вовсе. Здесь:
 *
 *   1. фото 96 — оно и держит высоту карточки, а не текст;
 *   2. адрес и цена, отклонения в этой строке уже нет;
 *   3. мета одним текстом, и свежесть слилась с ней первым фактом;
 *   4. отклонение спускается на свою строку и встаёт **первым**;
 *   5. аватар, чип и кнопка.
 *
 * Причина перестановки читается: на 358 в строку цены отклонение не влезает,
 * а мета в две строки на телефоне нормальна. Мета может схлопнуться в одну
 * строку — карточка не поедет, потому что высоту держит фото.
 *
 * Чип здесь 32, а не 24, и кнопка 44 с фиксированной шириной 150: на телефоне
 * ступени начинаются с 44, всё что ниже палец не берёт. Сегмент шкалы 18,
 * а не 20 — строка признака делит место с отклонением и тройкой.
 *
 * **Значков lucide в этой строке нет ни одного.** Стрелки ▼ и ▲ — текстовые
 * глифы внутри отклонения, а не иконки.
 */

type MobileListingRowProps = {
  address: string
  price: string
  deviation: number
  /** Свежесть, метро, комнатность, площадь и этаж одной строкой. */
  meta: string
  photo?: string
  strength: OwnerStrength
  publications: number
  platforms: number
  phones: number
  takenBy?: string
  status?: ListingStatus
  /** Подпись действия целиком: «Открыть · 0 ₽» или «Раскрыть · 199 ₽». */
  actionLabel: string
  /** Действия нет: собственник в стоп-листе или контакт отозван. */
  blocked?: boolean
  onOpen?: () => void
  onAction?: () => void
}

function MobileListingRow({
  address,
  price,
  deviation,
  meta,
  photo,
  strength,
  publications,
  platforms,
  phones,
  takenBy,
  status,
  actionLabel,
  blocked = false,
  onOpen,
  onAction,
}: MobileListingRowProps) {
  return (
    <div
      data-slot="mobile-listing-row"
      // Адрес атрибутом: по нему проверка пути находит объект, который
      // человек правда выбрал, а не угадывает его по тексту строки.
      data-address={address}
      data-blocked={blocked || undefined}
      // Карточка открывается у любого объекта, включая заблокированный:
      // ровно так же, как на компьютере. Раньше здесь стояло `blocked ?
      // undefined : onOpen` — и объект, по которому нельзя звонить, нельзя
      // было и посмотреть. Запрет относится к раскрытию контакта, а карточка
      // как раз и объясняет, почему по этому объекту работать нельзя.
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-2.5 rounded-2xl px-3.5 py-3",
        // Обводка, а не рамка: в файле она рисуется внутрь и содержимое
        // не сжимает. Рамкой карточка стала бы на 2 px уже.
        "outline-solid outline-1 -outline-offset-1 outline-line-2",
        // Отклик на касание — общее правило кабинета, см. `index.css`.
        // На телефоне наведения нет вовсе, работает только нажатие.
        "row-tap",
        blocked ? "bg-warm" : "bg-surface",
      )}
    >
      {/*
        Верх: кадр 96 × 64 и текст рядом с ним.

        ═══════════════════════════════════════════════════════════════════
        КАДР — ТРИ К ДВУМ, КАК ВЕЗДЕ
        ═══════════════════════════════════════════════════════════════════

        Был квадрат 96 × 96 — единственный слот продукта, показывавший
        объект не в той пропорции, что все остальные. Один и тот же снимок
        900 × 600 обрезался на телефоне иначе, чем на компьютере, и человек
        видел разный кусок комнаты в зависимости от того, с чего смотрит.
        Квадрат остаётся только там, где кадр обозначает сущность,
        а не показывает объект: обложка подборки.

        ═══════════════════════════════════════════════════════════════════
        АДРЕС СТОИТ НА СВОЕЙ СТРОКЕ, ЦЕНА ПОД НИМ
        ═══════════════════════════════════════════════════════════════════

        Раньше они делили строку, и адресу доставалось 118 пикселей из 222.
        «Дальневосточный пр., 68» в них не влезал, ломался на две строки
        в узкую колонку и выглядел сломанным — владелец увидел это первым.

        Исправлено не подгонкой ширины, а составом: адрес занимает все 222,
        цена встаёт под ним. Так собраны карточки в приложениях
        недвижимости, и это единственное, что выдерживает настоящие адреса,
        а не короткие из макета.

        Карточка выросла со 172 до 196 — на 24. Перенос адреса на вторую
        строку стоил бы 32, то есть больше.
      */}
      <div className="flex w-full items-start gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl">
          <ListingPhoto src={photo} alt={address} size="medium" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex w-full flex-col gap-0.5">
            <Typography variant="rowPrice" tone="default">
              {address}
            </Typography>
            <Typography variant="rowPrice" tone="default">
              {price}
            </Typography>
          </div>
          <Typography variant="metaText" tone="dense">
            {meta}
          </Typography>
        </div>
      </div>

      {/* Отклонение здесь первое — на десктопе оно стоит в строке цены. */}
      <div className="flex h-5 w-full items-center gap-2.5">
        <div className="w-16 shrink-0">
          <MarketDeviation percent={deviation} />
        </div>
        <OwnerSignal
          strength={strength}
          publications={publications}
          platforms={platforms}
          phones={phones}
          place="phone"
        />
        <div className="h-px flex-1" />
        <Typography variant="signalLabel" tone="dense">
          {publications} · {platforms} · {phones}
        </Typography>
      </div>

      <div className="flex h-11 w-full items-center gap-2">
        <OwnerAvatar initials={takenBy} />
        {status ? <StatusChip status={status} tall /> : null}
        <div className="h-px flex-1" />
        <button
          type="button"
          data-slot="mobile-action"
          disabled={blocked}
          onClick={(event) => {
            event.stopPropagation()
            onAction?.()
          }}
          className={cn(
            "flex h-11 w-37.5 shrink-0 items-center justify-center rounded-full px-4",
            "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
            blocked
              ? "bg-warm text-text-2 outline-solid outline-1 -outline-offset-1 outline-border-control"
              : "cursor-pointer bg-fg text-surface",
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

export { MobileListingRow }
export type { MobileListingRowProps }
