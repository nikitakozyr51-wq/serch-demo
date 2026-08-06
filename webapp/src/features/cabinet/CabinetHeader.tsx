import { Search } from "lucide-react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { groupDigits, plural } from "@/features/listings"
import { AvatarMenu } from "./AvatarMenu"
import { useAnimatedNumber } from "./useAnimatedNumber"

/**
 * Шапка кабинета.
 *
 * Геометрия снята с компонента `Vr9uG`: высота 56, зазор 24, поля [0, 24],
 * заливка `surface`, волосяная линия снизу.
 *
 * ШАПКА ПОВТОРЯЕТ ТРИ ПОЛОСЫ ТЕЛА (передача 05.08.2026, раздел 3). Сетка
 * кабинета: сайдбар `0…240`, фильтры `240…500`, выдача `500…1440`.
 * Логотип занимает `24…216`, поиск — ровно полосу фильтров `240…500`, правый
 * кластер прижат к 1416.
 *
 * Раньше поиск стоял `119…426`: он перечёркивал границу на 240 и не
 * принадлежал ни одной полосе. Глазом это читалось как сдвинутый элемент,
 * и владелец на это и указал.
 *
 * У поиска НЕТ ЗАЛИВКИ, РАМКИ И РАДИУСА: лупа, подсказка, `⌘K`. Коробка
 * появляется только при фокусе — острый прямоугольник с границей `fg`.
 * Это единственное место продукта, где острый угол законен: коробка здесь
 * не форма контрола, а отметка «сюда сейчас печатают».
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
      {/* Логотип занимает полосу 24…216: ширина фиксирована, иначе поиск
          съезжал бы с границы 240 при смене подписи. */}
      <div className="flex h-8 w-48 shrink-0 items-center gap-2">
        <Typography variant="panelTitle" tone="default">
          Сёрчь
        </Typography>
        <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
      </div>

      {/* Полоса фильтров: 240…500, то есть ширина 260 при зазоре 24 от
          логотипа шириной 192. Ступень высоты 40 — ряд «Поиск в шапке 40»
          на доске состояний. */}
      <button
        type="button"
        data-slot="global-search"
        onClick={onSearch}
        className="flex h-ctl-md w-65 shrink-0 cursor-pointer items-center gap-2 rounded-none border-0 bg-transparent text-left outline-none focus-visible:border focus-visible:border-solid focus-visible:border-fg"
      >
        <Search aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
        <div className="min-w-0 flex-1">
          <Typography variant="controlLabel" tone="dense">
            Адрес, телефон или номер
          </Typography>
        </div>
        {/* Подсказка клавиши плашку потеряла: голый текст `text-dense`
            весом 600 (передача 05.08.2026, раздел 1). */}
        <Typography variant="metaStrong" tone="dense">
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

        <AvatarMenu initials={initials} />
      </div>
    </header>
  )
}

export { CabinetHeader }
export type { CabinetHeaderProps }
