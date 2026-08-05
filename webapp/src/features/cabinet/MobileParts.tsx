import { useRouter } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { MobileBottomNav } from "./MobileBottomNav"

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
  return (
    <div
      data-slot="mobile-screen"
      className="flex h-svh w-full flex-col overflow-hidden bg-bg"
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
      <MobileBottomNav activeId={activeTab} />
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
  return (
    <div
      data-slot="mobile-sheet-scrim"
      className="flex h-svh w-full flex-col justify-end bg-[#1e1e1e59]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-slot="mobile-sheet"
        className="flex w-full flex-col gap-5 rounded-t-3xl bg-surface px-5 pt-3 pb-8"
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
