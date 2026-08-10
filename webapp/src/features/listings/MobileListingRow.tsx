import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { ListingPhoto } from "./ListingPhoto"
import { MarketDeviation } from "./MarketDeviation"
import { OwnerAvatar } from "./OwnerAvatar"
import { type OwnerStrength } from "./OwnerSignal"
import { type ListingStatus } from "./StatusChip"

/**
 * Строка выдачи на телефоне.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПЕРЕСОБРАНА 10.08.2026: ОДНА ФОРМА НА ОБЕ ПЛАТФОРМЫ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Была карточка 204 в четыре яруса: фото 96 × 64, адрес с ценой, мета,
 * шкала признака с тройкой, аватар с чипом и кнопкой. Стала строка 96
 * в два этажа. Это не сжатие — это другой ответ на вопрос, что человек
 * решает, глядя в список.
 *
 * В список смотрят, чтобы выбрать, что открыть. Для выбора нужны адрес,
 * цена и положение к рынку; всё остальное — метраж, этаж, метро, сила
 * собственника, сколько площадок и телефонов — решается уже в карточке,
 * куда всё равно придётся зайти. Четыре яруса давали три объекта на экран;
 * два этажа дают восемь.
 *
 * Замер `G37qjO` «C Строка выдачи, телефон», 42 экземпляра:
 *
 * ```
 * 358 × 96, фон surface, радиус 16, обводка внутрь #ddd9d3, поля [16, 12]
 *
 *   ┌────┐  Дальневосточный пр., 68              [ИС]     этаж 1
 *   │ 48 │
 *   └────┘  6,3 млн ₽  ▼ −12 %        [Открыть · 0 ₽]     этаж 2
 * ```
 *
 * Вертикаль: 16 + 64 + 16 = 96. Снимок 48 × 48 стоит **абсолютно**, x 0,
 * y 8 внутри яруса 64 — то есть по центру текстового блока, а не по центру
 * строки. Текстовая колонка 258 начинается на 76 от левого края содержимого:
 * это поле яруса, а не зазор, поэтому снимок в поток не входит и текст под
 * ним не подтекает.
 *
 * **Что выключено во всех 42 экземплярах:** чип состояния, мета, ярус
 * признака целиком (шкала, распорка, тройка) и четвёртый ярус. Это не
 * недосмотр макета — состояние выключено даже там, где у объекта есть
 * «Прозвонен». У заблокированного дополнительно выключены аватар
 * и отклонение: положение к рынку ничего не решает, если звонить нельзя.
 *
 * **Значков lucide в строке нет ни одного.** Стрелки ▼ и ▲ — текстовые
 * глифы внутри отклонения.
 */

type MobileListingRowProps = {
  address: string
  price: string
  deviation: number
  /**
   * Свежесть, метро, комнатность, площадь и этаж одной строкой.
   *
   * Остаётся в свойствах, но в строке не рисуется: узел «Мета» выключен
   * во всех экземплярах. Значение живёт дальше, потому что по нему строка
   * попадает в поиск и в проверку пути, — и потому что убрать свойство
   * значило бы потерять факт, который карточка объекта показывает.
   */
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
  /** Нажатие спишет деньги: кнопка красная в покое, а не от касания. */
  charges?: boolean
  onOpen?: () => void
  onAction?: () => void
}

function MobileListingRow({
  address,
  price,
  deviation,
  photo,
  takenBy,
  actionLabel,
  blocked = false,
  charges = false,
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
      // ровно так же, как на компьютере. Запрет относится к раскрытию
      // контакта, а карточка как раз и объясняет, почему по этому объекту
      // работать нельзя.
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-pointer flex-col rounded-2xl px-3 py-4",
        // Обводка, а не рамка: в файле она рисуется внутрь и содержимое
        // не сжимает. Рамкой карточка стала бы на 2 px уже.
        "outline-solid outline-1 -outline-offset-1 outline-line-2",
        // Отклик на касание — общее правило кабинета, см. `index.css`.
        // На телефоне наведения нет вовсе, работает только нажатие.
        "row-tap",
        blocked ? "bg-warm" : "bg-surface",
      )}
    >
      {/* Ярус 64. Поле слева 76 держит место снимку, который вынут
          из потока: так текст не поедет, если снимка не окажется. */}
      <div className="relative flex h-16 w-full items-center pl-19">
        <div className="absolute top-2 left-0 size-12 overflow-hidden rounded-xl bg-warm">
          <ListingPhoto src={photo} alt={address} size="small" reason="no-photos" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <Typography variant="rowPrice" tone="default">
                {address}
              </Typography>
            </div>
            {/* Аватар только у занятого объекта и только у доступного:
                у заблокированного он выключен в файле — знать, кто его
                вёл, бессмысленно, если звонить всё равно нельзя. */}
            {takenBy && !blocked ? <OwnerAvatar initials={takenBy} /> : null}
          </div>

          <div className="flex w-full items-center gap-3">
            <Typography variant="rowPrice" tone="default">
              {price}
            </Typography>
            {blocked ? null : (
              <div className="flex h-6 items-center">
                <MarketDeviation percent={deviation} />
              </div>
            )}
            <div className="h-px flex-1" />
            {blocked ? (
              // Третий уровень закона цвета: нельзя. Тёплая заливка,
              // обводка, капсула — форма та же, что на компьютере.
              <div
                data-slot="mobile-blocked-action"
                className="flex h-8 shrink-0 items-center justify-center rounded-full border border-border-control bg-warm px-3"
              >
                <Typography variant="controlLabel" tone="secondary">
                  {actionLabel}
                </Typography>
              </div>
            ) : (
              <button
                type="button"
                data-slot="mobile-action"
                onClick={(event) => {
                  event.stopPropagation()
                  onAction?.()
                }}
                className={cn(
                  // Кнопка 32 при норме 44: зона касания добирается
                  // псевдоэлементом, габариты строки не трогаются.
                  "tap-44",
                  "flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full px-3 transition-colors",
                  "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                  // Красный означает списание всегда и в покое. Бесплатное
                  // «Открыть · 0 ₽» и платное «Раскрыть · 199 ₽» стоят
                  // в одном столбце, и различать их на ощупь нельзя:
                  // на телефоне наведения, которое раньше красило кнопку,
                  // не существует вовсе.
                  charges
                    ? "bg-accent-deep text-surface active:bg-accent-hover"
                    : "bg-fg text-surface active:bg-fg-press",
                )}
              >
                <Typography variant="controlLabel" tone="current">
                  {actionLabel}
                </Typography>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { MobileListingRow }
export type { MobileListingRowProps }
