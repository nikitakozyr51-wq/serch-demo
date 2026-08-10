import { Link } from "@tanstack/react-router"

import { Typography } from "@/components/typography"
import { groupDigits } from "@/features/listings"
import { useAnimatedNumber } from "@/platform/motion"

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
  /**
   * Счётчик баланса — единственное место кабинета, где движение ОБЯЗАНО быть.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Так записано в спеке, и причина не в красоте: 199 ₽ ушли, и человек
   * обязан это увидеть. На телефоне число печаталось напрямую, то есть
   * списание проходило молча — а именно на телефоне агент и работает в полях,
   * где промах в двести рублей заметить некому.
   *
   * 600 мс — те же, что в десктопной шапке. Одно движение на два кабинета,
   * потому что подтверждает оно одно и то же.
   */
  const shownBalance = useAnimatedNumber(balance)

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
        {`${groupDigits(shownBalance)} ₽`}
      </Typography>

      {/*
        Аватар 28 графитом — на десктопе он такой же, а инициалы наследуют
        цвет подложки, поэтому тон берётся от родителя.

        **Это дверь, а не картинка.** В файле поверх аватара лежит рамка
        `VapV6` 44 × 44 — «зона нажатия 44». Рамка нарисована, значит нажатие
        нарисовано; в коде аватар был неподвижным `span`, и единственная
        дверь в профиль с любого экрана телефона молчала. Ведёт он в профиль:
        меню аватара с четырьмя пунктами есть только на компьютере, а на
        телефоне то же самое разложено по вкладке «Ещё».

        Габарит остаётся 28, зону добирает `tap-44`: подними сам кружок
        до 44, и шапка 56 перестала бы сходиться.
      */}
      <Link
        to="/m/profile"
        data-slot="mobile-header-avatar"
        aria-label="Профиль"
        className="tap-44 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-fg text-surface outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        <Typography variant="avatarInitials" tone="current">
          {initials}
        </Typography>
      </Link>
    </header>
  )
}

export { MobileHeader }
export type { MobileHeaderProps }
