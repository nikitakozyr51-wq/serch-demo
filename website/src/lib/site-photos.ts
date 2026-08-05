/**
 * Фотографии сайта.
 *
 * Своих ассетов у сайта нет: в Pencil все заливки-картинки заданы прямыми
 * адресами Unsplash. Адреса сняты замером и лежат тут одним списком, чтобы
 * подмена на собственные снимки была одной правкой в одном файле, а не
 * обходом девяти компонентов.
 *
 * Соотношения сторон подписаны рядом: они нужны разметке, чтобы место под
 * картинку резервировалось до загрузки и страница не прыгала.
 */

/** Миниатюры объектов в макете выдачи на первом экране, 40×40. */
export const listingThumbs = {
  nauki:
    'https://images.unsplash.com/photo-1600494448850-6013c64ba722?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMDI2MDh8&ixlib=rb-4.1.0&q=80&w=1080',
  svetlanovskiy:
    'https://images.unsplash.com/photo-1556185781-a47769abb7ee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMDI2MDh8&ixlib=rb-4.1.0&q=80&w=1080',
  grazhdanskiy:
    'https://images.unsplash.com/photo-1638840992956-142399e7e2df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMDI2MDl8&ixlib=rb-4.1.0&q=80&w=1080',
} as const

/** Снимки в карточках четырёх шагов, 380×240. */
export const stepPhotos = [
  'https://images.unsplash.com/photo-1659284994810-a552bd8ccf07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxNTU5MzB8&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1780653503232-8d0bb70550bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxNTU5MzF8&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1758598306765-10156411ffc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxNTU5MDJ8&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/flagged/photo-1564767609342-620cb19b2357?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjE2MzN8&ixlib=rb-4.1.0&q=80&w=1080',
] as const

/**
 * Снимки в карточках разборов блога, 380×240. Порядок — как в кадре `E34UR`:
 * данные рынка, закон и звонки, работа агентства, продукт. Четвёртый адрес
 * совпадает с четвёртым шагом «Как это устроено» — так в файле, дубль не мой.
 */
export const blogPhotos = [
  'https://images.unsplash.com/photo-1575909812796-4a0ae171a443?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjE2MzB8&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1643906652169-a750f3f70848?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjE2MzF8&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1585401738582-41c80d8f7b10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjE2NzN8&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/flagged/photo-1564767609342-620cb19b2357?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjE2MzN8&ixlib=rb-4.1.0&q=80&w=1080',
] as const

/** Подложки плашек районов, 282×340. */
export const districtPhotos = {
  primorskiy:
    'https://images.unsplash.com/photo-1605267143746-999bf61d0d08?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjc0NTR8&ixlib=rb-4.1.0&q=80&w=1080',
  kalininskiy:
    'https://images.unsplash.com/photo-1779247601930-0fe35031bf90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjc0NTV8&ixlib=rb-4.1.0&q=80&w=1080',
  moskovskiy:
    'https://images.unsplash.com/photo-1646471209588-2877db507779?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjc0NTZ8&ixlib=rb-4.1.0&q=80&w=1080',
  centralniy:
    'https://images.unsplash.com/photo-1779233495727-588a40d4b60c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjc0NTd8&ixlib=rb-4.1.0&q=80&w=1080',
} as const

/** Подложка финального призыва, во всю ширину экрана. */
export const finalCtaPhoto =
  'https://images.unsplash.com/photo-1781661005867-a5b8ec7d4d31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODUxMjE3NDd8&ixlib=rb-4.1.0&q=80&w=1080'
