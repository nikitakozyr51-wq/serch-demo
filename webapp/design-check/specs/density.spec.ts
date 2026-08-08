import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Плотный режим обязан менять экран, а не только объявлять токены.
 *
 * Однажды переключатель уже не делал ничего: переменные переопределялись,
 * но их никто не читал — высоты были набраны числами. Снаружи это выглядит
 * как «кнопка есть, а толку нет», и ни один слой такого не ловил.
 *
 * Значения сняты с пары экранов `ghwPj` (просторно, 88) и `ZOB5K` (плотно, 64).
 * Пары ниже — это ровно то, что в файле отличается между ними.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

type Expected = {
  what: string
  selector: string
  prop: 'height' | 'paddingLeft' | 'borderRadius'
  spacious: number
  compact: number
}

const PAIRS: Expected[] = [
  { what: 'строка выдачи', selector: '[data-slot="listing-row"]', prop: 'height', spacious: 88, compact: 64 },
  { what: 'поле строки', selector: '[data-slot="listing-row"]', prop: 'paddingLeft', spacious: 16, compact: 12 },
  { what: 'кнопка действия', selector: '[data-slot="listing-row"] [data-slot="button"]', prop: 'height', spacious: 32, compact: 28 },
  { what: 'полоса табов', selector: '[data-slot="result-tabs"]', prop: 'height', spacious: 36, compact: 32 },
  { what: 'шапка выдачи', selector: '[data-slot="results-header"]', prop: 'height', spacious: 40, compact: 36 },
  { what: 'кнопка вида', selector: '[data-slot="density-toggle"]', prop: 'height', spacious: 28, compact: 24 },
  /**
   * Радиус из этой таблицы УБРАН.
   *
   * Плотность меняет высоту и поля — то, сколько всего помещается на экране.
   * Форму она не меняет: с 05.08 форма отвечает на вопрос «что это», а не
   * «какой оно высоты», и кнопка вида остаётся капсулой в обоих режимах.
   * Прежняя пара 8 → 6 была следствием отменённой карты радиусов по высоте.
   */
  // Колонки фильтров в раскладке больше нет: с 9 августа панель приходит
  // только наложением по нажатию (кадры `aoguG`, `C4zkJ`). Мерить её поле
  // на закрытом экране нечем — она проверяется там, где открывается,
  // в `search-entry.spec`.
]

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(
    (pairs: Expected[]) =>
      pairs.map((pair) => {
        const node = document.querySelector(pair.selector)
        if (!node) return null
        const style = getComputedStyle(node)
        const raw =
          pair.prop === 'height'
            ? String(node.getBoundingClientRect().height)
            : pair.prop === 'paddingLeft'
              ? style.paddingLeft
              : style.borderTopLeftRadius
        return Math.round(Number.parseFloat(raw) * 100) / 100
      }),
    PAIRS,
  )
}

test('плотность: переключатель действительно сжимает экран', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/search')
  await page.waitForSelector('[data-slot="listing-row"]')
  await page.evaluate(() => document.fonts.ready)

  const spacious = await measure(page)

  await page.locator('[data-slot="density-toggle"]').click()
  await expect(page.locator('[data-slot="density-toggle"]')).toHaveAttribute('aria-pressed', 'true')
  const compact = await measure(page)

  const diffs: string[] = []
  PAIRS.forEach((pair, index) => {
    const got = { spacious: spacious[index], compact: compact[index] }
    if (got.spacious === null || got.compact === null) {
      diffs.push(`${pair.what}: узел ${pair.selector} не найден`)
      return
    }
    if (Math.abs(got.spacious! - pair.spacious) > 0.5) {
      diffs.push(`${pair.what} просторно: макет ${pair.spacious}, код ${got.spacious}`)
    }
    if (Math.abs(got.compact! - pair.compact) > 0.5) {
      diffs.push(`${pair.what} плотно: макет ${pair.compact}, код ${got.compact}`)
    }
  })

  const report = [
    `Пар значений: ${PAIRS.length}`,
    `Расхождений: ${diffs.length}`,
    '',
    ...PAIRS.map(
      (pair, index) =>
        `${pair.what.padEnd(24)} просторно ${String(spacious[index]).padEnd(8)} плотно ${String(compact[index])}`,
    ),
    '',
    ...diffs,
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'density.txt'), report, 'utf8')
  if (diffs.length > 0) console.log(report)

  expect(diffs, 'плотный режим разошёлся с макетом').toEqual([])
})
