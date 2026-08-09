import { Outlet, useRouterState } from "@tanstack/react-router"

import { MobileBottomNav } from "./MobileBottomNav"
import { MobileFramedContext } from "./mobile-framed"

/**
 * Постоянный каркас мобильного кабинета: тело и нижняя навигация.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * То же решение, что у десктопного `CabinetFrame`, и по той же причине.
 * Нижняя навигация стояла ВНУТРИ каждого экрана — тринадцать копий, — и при
 * касании вкладки всё дерево умирало: навигация исчезала и появлялась заново
 * вместе с содержимым. Пять главных дверей продукта мигали прямо под пальцем.
 *
 * Шапку каркас не берёт намеренно. На телефоне их три разных по смыслу:
 * шапка кабинета с балансом, шапка раздела с заголовком и шапка возврата
 * с адресом, куда вернуться. Свести их в одну значило бы стереть различие,
 * которое в файле нарисовано тремя разными кадрами.
 *
 * Закон движения — `docs/MOTION.md`, роль «Смена экрана».
 */

/** Какая вкладка подсвечена. Внутренние экраны сюда не попадают. */
const TAB_BY_PREFIX: readonly (readonly [string, string])[] = [
  ["/m/today", "today"],
  ["/m/search", "search"],
  ["/m/collections", "collections"],
  ["/m/balance", "balance"],
  ["/m/more", "more"],
] as const

function tabOf(pathname: string): string {
  for (const [prefix, id] of TAB_BY_PREFIX) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return id
  }
  return ""
}

function MobileFrame() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  /**
   * Ключ проявления — отрисованный маршрут, а не адрес.
   *
   * Адрес меняется в начале навигации, экран приезжает после загрузки своего
   * куска кода. Ключ по адресу отдавал бы проявление уходящему экрану.
   */
  const screenId = useRouterState({ select: (state) => state.matches.at(-1)?.id ?? "" })

  /**
   * На стенде каркаса нет, и это не исключение ради удобства.
   *
   * Стенд рисует телефон коробкой 390 × 844 посреди серой страницы, чтобы
   * кадр можно было сверить с макетом рядом в браузере. Постоянный каркас
   * растянут по окну, и нижняя навигация из него вышла бы за пределы этой
   * коробки — проверка так и сказала: ширина 1440 вместо 390.
   *
   * Поэтому на стенде экран остаётся сам себе корнем и рисует навигацию сам,
   * ровно как рисовал. Пересборка каркаса стенду не вредит: по нему не ходят,
   * его смотрят.
   */
  const stand = pathname.startsWith("/screen/")

  if (stand) {
    return (
      <MobileFramedContext value={false}>
        <Outlet />
      </MobileFramedContext>
    )
  }

  return (
    <MobileFramedContext value={true}>
      <div
        data-slot="mobile-frame"
        // `relative` обязателен: лист снизу лежит абсолютом поверх экрана.
        className="relative flex h-svh w-full flex-col overflow-hidden bg-bg"
      >
        <div key={screenId} className="screen-in flex min-h-0 w-full flex-1 flex-col">
          <Outlet />
        </div>
        <MobileBottomNav activeId={tabOf(pathname)} />
      </div>
    </MobileFramedContext>
  )
}

export { MobileFrame }
