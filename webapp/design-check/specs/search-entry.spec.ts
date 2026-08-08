import { expect, test } from '@playwright/test'

import { seedAgency, seedSession } from '../lib/session'

/**
 * Вход в поиск: главный экран, первый вход и сворачивание фильтров.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Владелец сказал: «непонятно, как должен работать в принципе поиск».
 * Ответ на это — три решения, и каждое проверяется здесь числом, а не
 * на глаз:
 *
 * 1. Кабинет открывается сохранёнными поисками, а не «Сегодня».
 * 2. У нового агентства вместо пустой таблицы стоит «С чего начать поиск»
 *    с готовыми наборами — и исчезает сам, как только поиск появился.
 * 3. Колонка фильтров сворачивается по ширине окна, а не тумблером,
 *    и в свёрнутом виде НЕ прячет условия.
 *
 * Проверка ходит по настоящему пути: сажает агентство в журнал, нажимает
 * на готовый набор, возвращается на главную. Стендов здесь нет — стенд
 * доказал бы только то, что кадр нарисован.
 */

test('кабинет открывается сохранёнными поисками', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/')

  await page.waitForURL(/\/searches$/)
  expect(new URL(page.url()).pathname, 'корень кабинета обязан вести на поиски').toMatch(
    /\/searches$/,
  )
})

test('первый вход: готовые наборы вместо пустой таблицы', async ({ page }) => {
  await seedAgency(page, {})
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/searches')
  await page.waitForSelector('[data-slot="first-search"]')

  const measured = await page.evaluate(() => ({
    presets: document.querySelectorAll('[data-slot="preset"]').length,
    // Блок «три разные вещи» объясняет `⌘K`, фильтры и сохранённый поиск.
    // Без него человек остаётся с тремя сущностями и одним словом на всех.
    explainer: document.querySelectorAll('[data-slot="three-things"]').length,
    field: document.querySelectorAll('[data-slot="first-search-input"]').length,
    // Таблицы на первом входе нет вовсе: показывать нечего.
    table: document.querySelectorAll('[data-slot="searches-table"]').length,
  }))

  expect(measured).toEqual({ presets: 4, explainer: 1, field: 1, table: 0 })

  // Готовый набор заводит поиск и сразу открывает выдачу — два нажатия,
  // как обещано.
  await page.click('[data-slot="preset"]')
  await page.waitForURL(/\/search/)

  await page.goto('/searches')
  await page.waitForSelector('[data-slot="searches-table"]')

  const after = await page.evaluate(() => ({
    rows: document.querySelectorAll('[data-slot="search-row"]').length,
    // Помощь исчезает сама, как только в ней отпала нужда.
    explainer: document.querySelectorAll('[data-slot="three-things"]').length,
  }))

  expect(after, 'после первого поиска помощь обязана уйти').toEqual({ rows: 1, explainer: 0 })
})

test('фильтры открываются кнопкой на любой ширине и не прячут условия', async ({ page }) => {
  await seedSession(page)

  /**
   * Модель одна на все ширины — решение владельца от 9 августа.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Прежде их было две: при 1360 и шире колонка 260 стояла в раскладке,
   * уже — сворачивалась в полоску. Модель выбирало окно, и продукт вёл себя
   * по-разному на ноутбуке и на мониторе. Эта проверка тогда закрепляла
   * обе модели; теперь она закрепляет то, что второй модели НЕТ.
   *
   * Кадры `aoguG` (1440) и `C4zkJ` (1280) рисуют одну и ту же механику,
   * и проверка обязана убедиться в этом на обеих ширинах, а не на одной.
   */
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 1024 })
    await page.goto('/search')
    await page.waitForSelector('[data-slot="listing-row"]')

    const closed = await page.evaluate(() => {
      const bar = document.querySelector('[data-slot="filter-bar"]')
      return {
        panel: document.querySelectorAll('[data-slot="filter-panel"]').length,
        bar: bar === null ? 0 : 1,
        barHeight: Math.round(bar?.getBoundingClientRect().height ?? 0),
        results: Math.round(
          document.querySelector('[data-slot="results"]')?.getBoundingClientRect().width ?? 0,
        ),
        // Условия перечислены прямо в полоске. Спрятать их было бы хуже,
        // чем занять место: человек забудет, почему выдача такая.
        summary: (bar?.textContent ?? '').includes('Красногвардейский'),
      }
    })

    expect(closed, `на ${width} колонки в раскладке нет, есть полоска`).toEqual({
      panel: 0,
      bar: 1,
      barHeight: 44,
      // Вся ширина за вычетом сайдбара 240 достаётся выдаче.
      results: width - 240,
      summary: true,
    })
  }

  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  await page.click('[data-slot="filter-bar-open"]')
  await page.waitForSelector('[data-slot="filter-panel"][data-overlay]')
  // Панель выезжает 200 мс. Мерить на середине пути значит мерить движение,
  // а не геометрию: первый прогон этой проверки поймал ровно это и показал
  // верх 64 вместо 56.
  await page
    .locator('[data-slot="filter-panel"][data-overlay]')
    .evaluate((node) => Promise.all(node.getAnimations().map((a) => a.finished)))

  const overlay = await page.evaluate(() => {
    const panel = document.querySelector('[data-slot="filter-panel"][data-overlay]')!
    const box = panel.getBoundingClientRect()
    const results = document.querySelector('[data-slot="results"]')!.getBoundingClientRect()
    return {
      width: Math.round(box.width),
      // Панель начинается от края сайдбара, а не от края окна.
      left: Math.round(box.left),
      top: Math.round(box.top),
      scrim: document.querySelectorAll('[data-slot="filter-scrim"]').length,
      // Выдача остаётся видимой справа — это главное отличие от конкурента,
      // у которого фильтр закрывает результат целиком.
      resultsVisible: Math.round(results.right - (box.left + box.width)),
    }
  })

  expect(overlay.width, 'ширина колонки та же, что в раскладке').toBe(260)
  expect(overlay.left, 'наложение начинается от края сайдбара').toBe(240)
  expect(overlay.top, 'наложение начинается под шапкой').toBe(56)
  expect(overlay.scrim, 'затемнение поверх выдачи').toBe(1)
  expect(
    overlay.resultsVisible,
    'выдача обязана остаться видна справа от панели',
  ).toBeGreaterThan(500)
})
