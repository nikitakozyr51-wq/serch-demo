import { useRouter } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useRef, useState } from "react"
import type { PointerEvent, ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { MobileBottomNav } from "./MobileBottomNav"
import { useMobileFramed } from "./mobile-framed"

/**
 * Общие части кабинета на телефоне: шапка раздела, пустое состояние, лист снизу
 * и логотип входа. Все четыре нарисованы в файле компонентами — `C9JSj`,
 * `I4XYhB`, `SItir`, `bWSaR`, — и потому живут одним модулем, а не копиями
 * по экранам.
 */

/**
 * Шапка раздела (`C9JSj`): 56, поля [0, 16], зазор 12, стрелка назад 20
 * и заголовок 20/600.
 *
 * **Стрелка есть не всегда.** У пяти корневых разделов возвращаться некуда:
 * они и есть нижняя навигация. Стрелка появляется там, куда пришли изнутри —
 * карточка сотрудника, заявка на возврат, документы.
 */
function MobileSectionHeader({
  title,
  back = false,
  action,
}: {
  title: string
  back?: boolean
  action?: ReactNode
}) {
  const router = useRouter()

  return (
    <header
      data-slot="mobile-section-header"
      className="flex h-header w-full shrink-0 items-center gap-3 border-b border-line-2 bg-surface px-4"
    >
      {back ? (
        <button
          type="button"
          data-slot="mobile-back"
          aria-label="Назад"
          // Возврат в историю браузера, а не на заранее назначенный адрес.
          // На телефоне в один и тот же экран приходят с разных сторон —
          // из списка, из уведомления, по ссылке от коллеги, — и стрелка
          // обязана вернуть туда, откуда пришли, а не туда, где по мнению
          // разработчика человек был.
          onClick={() => router.history.back()}
          className="flex size-5 shrink-0 cursor-pointer items-center justify-center bg-transparent text-fg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <ArrowLeft aria-hidden className="size-5" strokeWidth={2} />
        </button>
      ) : null}
      <Typography variant="panelTitle" tone="default" as="h1">
        {title}
      </Typography>
      {action === undefined ? null : (
        <>
          <div className="h-px flex-1" />
          {action}
        </>
      )}
    </header>
  )
}

/**
 * Каркас экрана телефона: шапка, прокручиваемое тело, нижняя навигация.
 *
 * Тело своё у каждого экрана, поля [16] и зазор 12 — общий случай выдачи.
 * Экран, у которого поля другие, задаёт их сам: подгонять чужую раскладку
 * под общий каркас — тот же способ выдумать дизайн, только тише.
 */
function MobileScreen({
  header,
  activeTab,
  padded = true,
  children,
}: {
  header: ReactNode
  /** Подсвеченная вкладка. Пустая строка — ни одна: так на внутренних экранах. */
  activeTab: string
  /** Тело с полями 16 и зазором 12. Выключается там, где список идёт от края. */
  padded?: boolean
  children: ReactNode
}) {
  /**
   * Внутри постоянного каркаса экран не корень, а тело.
   *
   * Тогда высоту задаёт каркас, а навигацию рисует он же — вторая копия
   * внизу была бы просто второй полосой. Вне каркаса всё как было: экран
   * занимает окно целиком и несёт навигацию сам. Так живут внутренние
   * экраны, до которых очередь ещё не дошла.
   */
  const framed = useMobileFramed()

  return (
    <div
      data-slot="mobile-screen"
      className={cn(
        "flex w-full flex-col overflow-hidden bg-bg",
        framed ? "min-h-0 flex-1" : "h-svh",
      )}
    >
      <>{header}</>
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col overflow-y-auto",
          padded && "gap-3 p-4",
        )}
      >
        <>{children}</>
      </div>
      {framed ? null : <MobileBottomNav activeId={activeTab} />}
    </div>
  )
}

/**
 * Пустое состояние (`I4XYhB`): значок 32, заголовок 20/600, объяснение 14/500
 * и одно действие 48 в капсуле. Поля тела [32, 24], зазор 16.
 *
 * **Значок приглушённый и один.** Пустой экран не праздник и не беда — это
 * место, где ещё ничего не произошло, и разноцветная иллюстрация здесь
 * назначила бы ему настроение, которого у него нет.
 */
function MobileEmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div
      data-slot="mobile-empty"
      className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-6 py-8"
    >
      <Icon aria-hidden className="size-8 shrink-0 text-text-dense" strokeWidth={2} />
      <Typography variant="panelTitle" tone="default" align="center">
        {title}
      </Typography>
      <Typography variant="uiText" tone="secondary" align="center">
        {text}
      </Typography>
      {action === undefined ? null : <>{action}</>}
    </div>
  )
}

/**
 * Лист снизу (`SItir`).
 *
 * Скрим `#1e1e1e59`, лист с радиусом 24 **только сверху**, поля [12, 20, 32, 20],
 * зазор 20, хват 36 × 5. Действия во всю ширину, главное сверху.
 *
 * **Хват — не украшение.** Он говорит, что лист тянется пальцем, а не только
 * закрывается кнопкой. Без него человек ищет крестик, которого в файле нет.
 *
 * Нижнее поле 32 против верхнего 12: под листом системная полоса жеста,
 * и кнопка, прижатая к краю, ловилась бы вместе с ней.
 */
function MobileSheet({
  title,
  text,
  children,
}: {
  title: string
  text: string
  children: ReactNode
}) {
  const router = useRouter()

  /**
   * Лист идёт за пальцем.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Хват 36 × 5 нарисован в файле, и он обещает, что лист тянется. Обещание
   * без движения — это ложь интерфейса: человек тянет, ничего не происходит,
   * и он делает вывод, что экран сломан.
   *
   * **Прерываемость — требование спеки движения.** Лист, который потянули
   * обратно, обязан пойти за пальцем, а не доигрывать анимацию. Поэтому
   * смещение хранится состоянием и переписывается на каждое движение пальца,
   * а не задаётся анимацией с фиксированной длиной.
   *
   * Порог 96 — примерно четверть типичной высоты листа. Ниже него лист
   * возвращается на место за 200 мс; выше — экран закрывается возвратом
   * в историю. Возврат, а не назначенный адрес: лист здесь — целый экран,
   * и в него приходят с разных сторон.
   *
   * Тянуть можно только вниз: `Math.max(0, …)` отсекает попытку утащить
   * лист вверх. Растянутый на пол-экрана лист в файле не нарисован, и
   * выдумывать его нельзя.
   */
  const [drag, setDrag] = useState<number | null>(null)
  const [arrived, setArrived] = useState(false)
  const startRef = useRef(0)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag(0)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return
    setDrag(Math.max(0, event.clientY - startRef.current))
  }

  const onPointerUp = () => {
    if (drag === null) return
    if (drag > 96) router.history.back()
    setDrag(null)
  }

  return (
    <div
      data-slot="mobile-sheet-scrim"
      // Затемнение только проявляется, без сдвига.
      //
      // Стоял `.motion-in`, а он поднимает узел на 8 px — и слой во всю
      // высоту экрана 120 мс держал у края незатемнённую полоску, заодно
      // сдвигая лист внутри себя вторым, лишним движением. Приезжать
      // здесь положено листу, а фону — гаснуть.
      className="scrim-in flex h-svh w-full flex-col justify-end bg-[#1e1e1e59]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-slot="mobile-sheet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // Приезд снимается сразу по окончании: анимация с `fill-mode: both`
        // держит `transform` навсегда и по правилам каскада бьёт даже
        // встроенный стиль — то есть лист перестал бы слушаться пальца.
        onAnimationEnd={(event) => {
          if (event.currentTarget === event.target) setArrived(true)
        }}
        // Пока палец на экране — ни перехода: лист стоит ровно там, где палец.
        // Отпустили — возвращается за 200 мс.
        style={drag === null ? undefined : { transform: `translateY(${drag}px)`, transition: "none" }}
        // Жест листа не должен превращаться в прокрутку страницы под ним.
        className={cn(
          "flex w-full touch-none flex-col gap-5 rounded-t-3xl bg-surface px-5 pt-3 pb-8",
          arrived ? "transition-transform duration-200" : "sheet-in",
        )}
      >
        <div className="flex w-full justify-center">
          <span aria-hidden className="h-[5px] w-9 rounded-full bg-line-2" />
        </div>
        <div className="flex w-full flex-col gap-2">
          <Typography variant="panelTitle" tone="default" as="h2">
            {title}
          </Typography>
          <Typography variant="uiText" tone="secondary">
            {text}
          </Typography>
        </div>
        <div className="flex w-full flex-col gap-2">
          <>{children}</>
        </div>
      </div>
    </div>
  )
}

/**
 * Логотип входа (`bWSaR`): 56, поля [0, 16], слово 20/600 и точка 6.
 *
 * На экранах входа нижней навигации нет — входить ещё некуда, — и логотип
 * остаётся единственным, что говорит, куда человек пришёл.
 */
function MobileAuthLogo() {
  return (
    <div
      data-slot="mobile-auth-logo"
      className="flex h-header w-full shrink-0 items-center gap-2 px-4"
    >
      <Typography variant="panelTitle" tone="default">
        Сёрчь
      </Typography>
      <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
    </div>
  )
}

/**
 * Каркас экрана входа на телефоне: логотип, тело, без нижней навигации.
 */
function MobileAuthScreen({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="mobile-auth-screen"
      className="flex h-svh w-full flex-col overflow-hidden bg-bg"
    >
      <MobileAuthLogo />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  )
}

export {
  MobileAuthLogo,
  MobileAuthScreen,
  MobileEmptyState,
  MobileScreen,
  MobileSectionHeader,
  MobileSheet,
}
