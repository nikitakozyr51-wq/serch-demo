import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Арифметика на экране.
 *
 * Правило владельца: цифры на всех экранах обязаны сходиться между собой
 * и с журналом. Для шапки выдачи это проверяемо машиной: из скольких
 * объявлений сколько склеено и отсеяно и сколько осталось.
 *
 * `DEMO-DATA.md`: 892 − 431 − 214 = 247.
 *
 * Проверка читает **отрисованный текст**, а не пропсы компонента. Если кто-то
 * однажды передаст остаток отдельным числом и оно разойдётся с вычитанием,
 * это будет видно.
 */
test('шапка выдачи: арифметика отсева сходится', async ({ page }) => {
  await seedSession(page)
  await page.goto('/kitchen-sink')
  // Шапок на странице несколько: ту же форму используют пустые состояния.
  // Арифметика есть только у шапки выдачи, поэтому адрес уточнён меткой.
  const header = page.locator('[data-check="results-header|rest"] [data-slot="results-header"]')
  await header.waitFor()

  const text = (await header.innerText())
    .replaceAll(' ', ' ')
    .replaceAll(' ', ' ')

  const numbers = [...text.matchAll(/\d[\d ]*/g)]
    .map((match) => Number.parseInt(match[0].replaceAll(' ', ''), 10))
    .filter((value) => Number.isFinite(value))

  expect(numbers.length, `в шапке найдено мало чисел: «${text}»`).toBeGreaterThanOrEqual(4)

  const [found, listings, duplicates, intermediaries] = numbers

  expect(
    listings! - duplicates! - intermediaries!,
    `арифметика не сходится: ${listings} − ${duplicates} − ${intermediaries} ≠ ${found}. Текст: «${text}»`,
  ).toBe(found)

  // Числа обязаны совпадать с DEMO-DATA.md, а не быть просто согласованными
  // между собой: согласованная выдумка — тоже выдумка.
  expect({ found, listings, duplicates, intermediaries }).toEqual({
    found: 247,
    listings: 892,
    duplicates: 431,
    intermediaries: 214,
  })
})
