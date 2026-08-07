/**
 * Какой экран подходит устройству — решается ДО отрисовки.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ НЕ ЭФФЕКТОМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Первая версия переключала адрес эффектом после отрисовки, и это привело
 * к бесконечному циклу: охрана кабинета рисует переход на вход прямо во
 * время отрисовки, а переключатель платформы отвечает своим переходом уже
 * после — и они начинают перебрасывать друг другу управление. React
 * останавливает это словами «Maximum update depth exceeded», и экран
 * остаётся белым.
 *
 * Оба решения — «пустить ли внутрь» и «какой экран показать» — принимаются
 * ДО того, как что-нибудь отрисуется, в `beforeLoad` маршрута. Тогда
 * перебрасывать нечего: до первого кадра доходит уже правильный адрес.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ПОЧЕМУ 1024. Кабинет требует трёх полос — сайдбар 240, фильтры 260,
 * выдача — и на 900 они уже не помещаются. Та же граница `lg`, по которой
 * живёт сайт.
 *
 * ПОЧЕМУ ПЕРЕХОД, А НЕ ПОДМЕНА КОМПОНЕНТА. Адрес обязан отвечать на вопрос
 * «что я вижу»: человек, приславший коллеге ссылку с телефона, шлёт
 * мобильный адрес, и коллега на компьютере обязан получить десктопный
 * экран. Поэтому правило работает в обе стороны.
 */

/**
 * Пары «экран — телефон».
 *
 * Слева адрес для компьютера, справа его двойник для телефона. Адреса без
 * двойника здесь не перечислены: их не переписывают, и человек видит то,
 * что открыл. Врать переходом на чужой экран хуже, чем показать не самый
 * удобный.
 */
const TWINS: Array<[desktop: string, mobile: string]> = [
  // Главная кабинета. Пара нашлась не сразу: десктопный экран новый,
  // а мобильный собран давно и жил на своём адресе без пары — то есть
  // на телефоне главная открывалась только руками.
  ["/searches", "/m/saved-searches"],
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

  /**
   * ВХОД, РЕГИСТРАЦИЯ И ПЕРВЫЙ ЗАПУСК.
   *
   * Их отсутствие в этой таблице и было причиной жалобы «не могу
   * зарегистрировать агентство с телефона». Кнопка сайта ведёт на
   * `/register`, а это кадр 1440 × 1024 в две колонки: на 390 он
   * превращается в нечитаемую полосу. Мобильные двойники существуют
   * и собраны — им не хватало только этих строк.
   */
  ["/login", "/m/login"],
  ["/register", "/m/register"],
  ["/forgot", "/m/forgot"],
  ["/new-password", "/m/new-password"],
  ["/confirm-code", "/m/confirm-code"],
  ["/check-mail", "/m/check-mail"],
  ["/invite", "/m/invite"],
  ["/access-closed", "/m/access-closed"],
  ["/first-run/search", "/m/first-run/search"],
  ["/first-run/agency", "/m/first-run/agency"],
  ["/first-run/employee", "/m/first-run/employee"],
]

/** Узкий экран — телефон. На сервере окна нет, считаем экран широким. */
export function isNarrow(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(max-width: 1023px)").matches
}

/**
 * Адрес, подходящий устройству. Возвращает `null`, если менять нечего.
 */
export function platformTwin(pathname: string): string | null {
  if (pathname.startsWith("/screen/") || pathname.startsWith("/kitchen-sink")) return null

  const narrow = isNarrow()
  for (const [desktop, mobile] of TWINS) {
    if (narrow && pathname === desktop) return mobile
    if (!narrow && pathname === mobile) return desktop
  }
  return null
}

/** Куда вести того, кто не вошёл: экран входа своей платформы. */
export function loginPath(): "/login" | "/m/login" {
  return isNarrow() ? "/m/login" : "/login"
}
