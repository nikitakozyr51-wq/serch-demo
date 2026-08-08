import { useNavigate } from "@tanstack/react-router"
import { notifyDone } from "@/platform/notify"
import type { ReactNode } from "react"

import { useSession } from "@/features/auth"

import { cn } from "@/lib/utils"
import { CabinetHeader } from "./CabinetHeader"
import { CabinetGuard } from "./CabinetGuard"
import { CabinetOverlays } from "./CabinetOverlays"
import { requestPalette } from "./overlay-state"
import { useCabinetNav } from "./useCabinetNav"
import { CabinetSidebar, type NavEntry } from "./CabinetSidebar"

/**
 * Каркас кабинета: шапка 56, сайдбар 240, тело.
 *
 * Один и тот же каркас несут все экраны продукта — выдача, «Сегодня», баланс,
 * подборки, агентство, первый вход. До этого он был переписан руками восемь
 * раз, и «Пробный старт» вместо баланса пришлось бы править в восьми местах.
 *
 * **Тело оставлено пустым слотом намеренно.** Экраны делятся на три вида:
 * с колонкой полей 24 (большинство), без полей вовсе (карточка объекта
 * с шапкой во всю ширину) и с третьей колонкой фильтров (выдача). Заводить
 * на это переключатели значило бы прятать раскладку экрана внутрь общего
 * компонента, где её никто не найдёт. Колонка с полями вынесена рядом —
 * `CabinetPage`.
 */
type CabinetShellProps = {
  /** Подсвеченный пункт навигации. Пустая строка — ни один: так на первом входе. */
  activeId: string
  /** Остаток на счёте агентства. По умолчанию демонстрационные 8 610 ₽. */
  balance?: number
  /** Пробный старт: вместо рублей считаются оставшиеся раскрытия. */
  trial?: number
  /** Инициалы вошедшего. По умолчанию ИС — Смирнова Ирина, руководитель. */
  initials?: string
  /** Сохранённые поиски. `undefined` убирает раздел целиком — см. `CabinetSidebar`. */
  savedSearches?: NavEntry[]
  /** Поиски агентства. Правило то же. */
  agencySearches?: NavEntry[]
  children: ReactNode
}

function CabinetShell({
  activeId,
  balance,
  trial,
  initials,
  savedSearches,
  agencySearches,
  children,
}: CabinetShellProps) {
  /**
   * Шапка берёт данные из сеанса, а не из констант экрана.
   *
   * Иначе человек, создавший агентство «Петров и партнёры» под своим именем,
   * видел бы в шапке чужие инициалы и чужой баланс — и демонстрация
   * рассыпалась бы на первом же нажатии. Явно переданные значения побеждают:
   * стендовые экраны показывают состояние, которого у зрителя нет.
   */
  const session = useSession()
  const navigate = useNavigate()

  const { items, savedSearches: ownSearches, agencySearches: ownAgency } = useCabinetNav()

  return (
    <CabinetGuard>
      <div className="flex h-svh w-full flex-col bg-bg">
      {/* Обработчики передаются здесь, а не на каждом экране: шапка одна
          на весь кабинет, и без них «Пополнить» и строка поиска молчали на
          ВСЕХ экранах сразу. Это первое, что человек трогает, и первое, что
          не отвечало. */}
      <CabinetHeader
        balance={balance ?? session?.balance ?? 0}
        trial={trial ?? (session && session.trial > 0 ? session.trial : undefined)}
        initials={initials ?? session?.initials ?? "ИС"}
        owner={session?.role !== "agent"}
        onTopUp={() => void navigate({ to: "/balance/top-up" })}
        // Агент не пополняет чужой счёт — он говорит руководителю, что
        // деньги кончились. Письма продукт не шлёт, поэтому и обещания
        // «отправлено письмо» здесь нет: сказано ровно то, что произошло.
        onRequestTopUp={() => notifyDone("Руководителю показано, что нужно пополнить счёт")}
        onSearch={requestPalette}
      />

      <div className="flex min-h-0 flex-1">
        <CabinetSidebar
          items={items}
          savedSearches={savedSearches ?? ownSearches}
          agencySearches={agencySearches ?? ownAgency}
          activeId={activeId}
        />
        <>{children}</>
      </div>

      {/* Палитра и карта клавиш висят на каркасе: они обещаны «на любом экране
          кабинета», и это единственный способ выполнить обещание один раз,
          а не двадцать. */}
        <CabinetOverlays />
      </div>
    </CabinetGuard>
  )
}

/**
 * Колонка содержимого: поля 24, прокрутка своя.
 *
 * Ритмов в файле ровно два, и они означают разное. 24 — рабочий экран, где
 * блоки идут подряд и глаз бежит по ним сверху вниз. 32 — стартовый экран,
 * где блоков мало и каждый требует отдельного решения: строка поиска, готовые
 * наборы, поиски агентства. Третьего ритма нет, поэтому набор закрыт.
 */
function CabinetPage({
  rhythm = "dense",
  children,
}: {
  rhythm?: "dense" | "sparse"
  children: ReactNode
}) {
  return (
    <div
      data-slot="cabinet-page"
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-y-auto p-6",
        rhythm === "dense" ? "gap-6" : "gap-8",
      )}
    >
      {children}
    </div>
  )
}

export { CabinetShell, CabinetPage }
export type { CabinetShellProps }
