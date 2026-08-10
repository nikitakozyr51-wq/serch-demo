import { mkdir, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Снимки живой страницы для сличения глазами.
 *
 * Числовые слои доказывают, что значения совпадают. Но совпадение значений
 * не то же самое, что совпадение вида: можно попасть во все размеры и всё
 * равно получить не то, если что-то не отрисовалось или встало не туда.
 * Именно так пропала подпись первой колонки: размеры сходились, заголовка
 * не было. Снимок — обязательный второй взгляд, а не роскошь.
 *
 * **Старый снимок хуже отсутствующего.** В первой версии слой не содержал
 * ни одного утверждения, и после красного прогона в папке лежали картинки
 * от прошлого раза с прежней датой. Смотришь на артефакт, видишь порядок,
 * а он от вчерашнего кода. Поэтому теперь снимки сперва удаляются, а после
 * съёмки проверяется, что файл появился и он не пустой.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const shotsDir = resolve(currentDir, '../.artifacts/shots')

/** Снимок обязан быть свежим: удалить прежний, снять, убедиться, что он есть. */
async function shoot(name: string, take: (path: string) => Promise<unknown>) {
  const path = resolve(shotsDir, name)
  await rm(path, { force: true })
  await take(path)

  const info = await stat(path).catch(() => null)
  expect(info, `снимок ${name} не создан`).not.toBeNull()
  expect(info!.size, `снимок ${name} пустой`).toBeGreaterThan(1024)
}

test('снимки: полигон контролов', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/kitchen-sink')
  await page.waitForSelector('[data-check]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  await shoot('controls.png', (path) => page.locator('section').first().screenshot({ path }))
  await shoot('button-row-money.png', (path) =>
    page.locator('[data-check="row-money-48|rest"] [data-slot="button"]').screenshot({ path }),
  )
  await shoot('listing-row.png', (path) =>
    page.locator('[data-check="listing-row|rest"]').screenshot({ path }),
  )
})

test('снимки: экран выдачи целиком', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/search')
  await page.waitForSelector('[data-slot="listing-row"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  // Снимок экрана целиком: девять строк, сайдбар и колонка фильтров разом.
  // Именно на нём глаз ловит то, чего не видит ни один перечень свойств.
  await shoot('screen-search.png', (path) => page.screenshot({ path }))

  const rows = await page.locator('[data-slot="listing-row"]').count()
  expect(rows, 'на экране выдачи должны быть все девять строк').toBe(9)

  // Плотный режим — второй снимок того же экрана. Сравнивать их глазами
  // осмысленно: видно, что именно сжалось, а что осталось прежним.
  await page.locator('[data-slot="density-toggle"]').click()
  await expect(page.locator('[data-slot="density-toggle"]')).toHaveAttribute('aria-pressed', 'true')
  await shoot('screen-search-compact.png', (path) => page.screenshot({ path }))
})
