import { Link } from "@tanstack/react-router"
import { Search } from "lucide-react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { groupDigits, plural } from "@/features/listings"
import { useAnimatedNumber } from "./useAnimatedNumber"

/**
 * Шапка кабинета.
 *
 * Геометрия снята с компонента `Vr9uG`: высота 56, зазор 24, поля [0, 24],
 * заливка `surface`, волосяная линия снизу. Внутри: логотип, глобальный поиск
 * шириной 420, распорка, справа баланс, «Пополнить» и аватар.
 *
 * **Точка в логотипе — единственное место кабинета с ярким красным.**
 * Правило «красный только там, где списываются деньги» имеет ровно одно
 * исключение, и оно записано в DESIGN.md: точка не нажимается, значит
 * ничего не обещает.
 *
 * Баланс в шапке стоит не для красоты: агент видит, на сколько раскрытий
 * ему хватит, до того как нажмёт. При списании счётчик анимируется 600 мс —
 * это единственное место кабинета, где движение обязательно.
 */
type CabinetHeaderProps = {
  /** Остаток на счёте агентства в рублях. */
  balance: number
  /**
   * Пробный старт: на счету не деньги, а раскрытия.
   *
   * Отдельное состояние, а не «баланс, равный нулю». Пока карта не привязана,
   * агентство считает не рубли, а оставшиеся пробные раскрытия — и в шапке
   * должно стоять именно это, иначе «0 ₽» прочитается как «денег нет,
   * работать нельзя». Снято с `LthoE` и `ElGpp`: «Пробный старт · 5 раскрытий».
   *
   * Когда задан, вытесняет рублёвый баланс.
   */
  trial?: number
  /** Инициалы вошедшего по правилу «имя, фамилия»: ИС, МЛ, АТ. */
  initials: string
  onTopUp?: () => void
  onSearch?: () => void
}

function CabinetHeader({ balance, trial, initials, onTopUp, onSearch }: CabinetHeaderProps) {
  // Счёт идёт 600 мс — единственное обязательное движение кабинета.
  // Ширина числа при этом не скачет: `numeric` набран моноширинными цифрами.
  const shownBalance = useAnimatedNumber(balance)

  return (
    <header
      data-slot="cabinet-header"
      className="flex h-header w-full shrink-0 items-center gap-6 border-b border-line-2 bg-surface px-6"
    >
      <div className="flex h-8 items-center gap-2">
        <Typography variant="panelTitle" tone="default">
          Сёрчь
        </Typography>
        <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
      </div>

      {/*
        Поисковая строка — свой класс лестницы: 48 / r-control / 16.
        Обновление 04.08 подняло её с 40 и сменило радиус с r-media на r-control.
        Это не кнопка формы и не primary — это отдельная ступень, потому что
        поиск в шапке используют чаще всего остального в кабинете.
      */}
      <button
        type="button"
        data-slot="global-search"
        onClick={onSearch}
        className="flex h-ctl-lg w-105 cursor-pointer items-center gap-2 rounded-xl border border-border-control bg-bg px-3 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        <Search aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
        <div className="flex-1 text-left">
          <Typography variant="controlLabelLg" tone="dense">
            Адрес, телефон или номер объявления
          </Typography>
        </div>
        <Typography variant="metaText" tone="dense">
          ⌘K
        </Typography>
      </button>

      <div className="h-px flex-1" />

      <div className="flex items-center gap-4">
        <div className="flex h-8 items-center gap-2">
          <Typography variant="denseText" tone="dense">
            {trial === undefined ? "Баланс агентства" : "Пробный старт"}
          </Typography>
          <Typography variant="numeric" tone="default">
            {trial === undefined
              ? `${groupDigits(shownBalance)} ₽`
              : `${trial} ${plural(trial, "раскрытие", "раскрытия", "раскрытий")}`}
          </Typography>
        </div>

        <Button variant="quiet" size="sm" onClick={onTopUp}>
          Пополнить
        </Button>

        {/*
          Аватар ведёт в профиль, а не открывает меню.

          Меню в файле не нарисовано, а придумывать его нельзя. Зато нарисован
          экран «Политика входа» — там и живут смена пароля, активные сеансы
          и выход из аккаунта. Аватар, который никуда не ведёт, — самая частая
          жалоба на любой кабинет: человек жмёт его первым делом, ища выход.
        */}
        <Link
          to="/profile/login-policy"
          data-slot="user-avatar"
          aria-label="Профиль и выход"
          className="flex size-8 items-center justify-center rounded-full bg-fg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <Typography variant="metaStrong" tone="inverse">
            {initials}
          </Typography>
        </Link>
      </div>
    </header>
  )
}

export { CabinetHeader }
export type { CabinetHeaderProps }
