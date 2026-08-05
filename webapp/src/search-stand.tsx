import { SearchScreenPage } from "./search-screen"

/**
 * Стенд выдачи: девять замеренных строк.
 *
 * Отдельный модуль, а не пропс в маршруте: маршруты собираются лениво, и
 * передать им пропсы негде. Заодно видно из списка файлов, что стенд и продукт
 * это два разных адреса одного экрана, а не случайное дублирование.
 */
export function SearchStandPage() {
  return <SearchScreenPage dataset="measured" />
}
