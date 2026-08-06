import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"

/**
 * Кабинет открывается тем экраном, который подходит устройству.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Из-за отсутствия этого правила владелец сказал «мобильная версия кабинета
 * вообще не открывается».** И был прав по сути: она существовала, была
 * собрана целиком — двадцать четыре экрана, — но попасть в неё с телефона
 * было НЕЧЕМ. Человек открывал ссылку на телефоне и получал десктопный
 * кабинет шириной 1440 в окне 390: сайдбар 240, колонка фильтров 260 и
 * выдача 908 в трети экрана. Выглядит это как сломанный продукт, а не как
 * «не тот экран».
 *
 * Мобильные экраны кабинета — НЕ адаптив десктопных, это отдельные кадры
 * с отдельной раскладкой: нижняя навигация вместо сайдбара, карточка вместо
 * строки таблицы, лист снизу вместо диалога. Поэтому переключение — это
 * переход на другой адрес, а не медиазапрос.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ПОЧЕМУ 1024, А НЕ 768. Кабинет требует трёх полос — сайдбар 240, фильтры
 * 260, выдача — и на 900 они уже не помещаются. Это та же граница `lg`,
 * по которой живёт сайт.
 *
 * ПОЧЕМУ ПЕРЕХОД, А НЕ ПОДМЕНА КОМПОНЕНТА. Адрес обязан отвечать на вопрос
 * «что я вижу»: человек, приславший коллеге ссылку с телефона, шлёт мобильный
 * адрес, и коллега на компьютере обязан получить десктопный экран. Обратное
 * правило поэтому тоже есть.
 *
 * Замена делается `replace`, а не переходом: иначе «назад» возвращало бы на
 * тот же адрес, который правило снова переписывает, и кнопка «назад»
 * переставала работать.
 */

/**
 * Пары «экран — телефон».
 *
 * Слева адрес для компьютера, справа его двойник для телефона. Пары, у
 * которых двойника нет, здесь не перечислены: их не переписывают, и человек
 * видит то, что открыл. Врать переходом на чужой экран хуже, чем показать
 * не самый удобный.
 */
const TWINS: Array<[desktop: string, mobile: string]> = [
  ["/today", "/m/today"],
  ["/search", "/m/search"],
  ["/object", "/m/object"],
  ["/object/disclosed", "/m/object"],
  ["/call", "/m/call"],
  ["/collections", "/m/collections"],
  ["/collections/inside", "/m/collections/inside"],
  ["/balance", "/m/balance"],
  ["/balance/refunds", "/m/balance/refunds"],
  ["/balance/top-ups", "/m/balance/top-ups"],
  ["/balance/top-up", "/m/balance/top-up"],
  ["/agency", "/m/agency"],
  ["/agency/staff", "/m/agency/staff"],
  ["/agency/staff/person", "/m/agency/person"],
  ["/agency/refusals", "/m/agency/refusals"],
  ["/agency/access", "/m/agency/access"],
  ["/agency/consents", "/m/agency/consents"],
  ["/agency/settings", "/m/agency/settings"],
  ["/profile", "/m/profile"],
  ["/profile/login-policy", "/m/security"],
]

const NARROW = "(max-width: 1023px)"

export function usePlatformRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()

  useEffect(() => {
    /**
     * Стенды сверки и экраны сайта не трогаются. Стенд показывает мобильный
     * кадр внутри рамки телефона на широком экране — это его работа, и
     * переписывать ему адрес значит ломать сверку с макетом.
     */
    if (pathname.startsWith("/screen/") || pathname.startsWith("/kitchen-sink")) return

    const media = window.matchMedia(NARROW)

    const apply = () => {
      const narrow = media.matches
      for (const [desktop, mobile] of TWINS) {
        if (narrow && pathname === desktop) {
          void navigate({ to: mobile, replace: true })
          return
        }
        if (!narrow && pathname === mobile) {
          void navigate({ to: desktop, replace: true })
          return
        }
      }
    }

    apply()
    // Поворот телефона и изменение окна на компьютере — то же событие.
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [pathname, navigate])
}
