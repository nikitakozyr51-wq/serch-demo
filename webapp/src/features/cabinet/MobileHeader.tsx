import { Typography } from "@/components/typography"
import { groupDigits } from "@/features/listings"

/**
 * Шапка кабинета на телефоне.
 *
 * Снято с `N91X82` экрана `waJiE`: высота 56, поля [0, 16], зазор 10,
 * заливка `surface`, волосяная линия снизу, содержимое по центру.
 *
 * **Это не сжатая десктопная шапка.** На десктопе в ней живёт глобальный поиск
 * шириной 420 и кнопка «Пополнить»; здесь ни того, ни другого нет. Осталось
 * ровно три вещи: логотип, остаток на счету и аватар. Причина простая —
 * на 390 четвёртой вещи места нет, а поиск на телефоне открывается со своего
 * экрана, а не из шапки.
 *
 * Баланс идёт 12/600 и без подписи «Баланс агентства»: на телефоне подпись
 * съела бы половину строки, а число само себя объясняет — рядом с ним нечему
 * быть, кроме денег.
 */
type MobileHeaderProps = {
  /** Остаток на счету агентства в рублях. */
  balance: number
  /** Инициалы вошедшего: «ИС». */
  initials: string
}

function MobileHeader({ balance, initials }: MobileHeaderProps) {
  return (
    <header
      data-slot="mobile-header"
      className="flex h-header w-full shrink-0 items-center gap-2.5 border-b border-line-2 bg-surface px-4"
    >
      <div className="flex items-center gap-2">
        <Typography variant="panelTitle" tone="default">
          Сёрчь
        </Typography>
        {/* Точка — единственное место, где живёт яркий акцент. */}
        <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
      </div>

      <div className="h-px flex-1" />

      {/* Баланс вторичным, а не графитом: он справка, а не действие. */}
      <Typography variant="metaStrong" tone="secondary">
        {`${groupDigits(balance)} ₽`}
      </Typography>

      {/* Аватар 28 графитом — на десктопе он такой же, а инициалы наследуют
          цвет подложки, поэтому тон берётся от родителя. */}
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fg text-surface">
        <Typography variant="avatarInitials" tone="current">
          {initials}
        </Typography>
      </span>
    </header>
  )
}

export { MobileHeader }
export type { MobileHeaderProps }
