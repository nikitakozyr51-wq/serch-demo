import { MobileSearchScreenPage } from "./mobile-search-screen"

/**
 * Стенд мобильной выдачи: три замеренные строки кадра `waJiE`.
 *
 * Отдельный модуль, а не пропс в маршруте, — ровно как у десктопного стенда
 * (`search-stand.tsx`): маршруты собираются лениво, и передать им пропсы
 * негде. Заодно из списка файлов видно, что стенд и продукт — два адреса
 * одного экрана, а не случайное дублирование.
 */
export function MobileSearchStandPage() {
  return <MobileSearchScreenPage dataset="measured" />
}
