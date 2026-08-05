import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Кабинет на телефоне: пятьдесят четыре экрана открываются и помещаются в 390.
 *
 * Слой существует из-за поимённой ошибки К37: сайт выглядел собранным, ссылки
 * были, а восемь адресов из одиннадцати отдавали 404 — сборка, типы и тесты
 * при этом были зелёные. «Экран собран» и «экран работает» — разные
 * утверждения, и второе проверяется только обращением по адресу.
 *
 * Проверяется три вещи, и все три ломаются молча:
 *
 *   1. Экран вообще отрисовался — на странице есть хоть один `data-slot`.
 *      Пустая страница из-за ошибки в модуле выглядит как белый лист,
 *      а не как падение.
 *   2. Ничего не вылезает за 390. Телефон не даёт горизонтальной прокрутки
 *      бесплатно: она либо режет содержимое, либо ездит под пальцем.
 *   3. Консоль чистая. Ошибка React на экране, который никто сегодня
 *      не открывал, живёт до первой демонстрации владельцу.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

const SCREENS = [
  '/m/today',
  '/m/record',
  '/m/list-loading',
  '/m/results-loading',
  '/m/filters',
  '/m/object',
  '/m/object/before',
  '/m/object/similar',
  '/m/similar',
  '/m/taken',
  '/m/balance',
  '/m/balance/refunds',
  '/m/balance/top-ups',
  '/m/balance/documents',
  '/m/balance/top-up',
  '/m/balance/refund',
  '/m/agency',
  '/m/agency/staff',
  '/m/agency/refusals',
  '/m/agency/access',
  '/m/agency/consents',
  '/m/agency/settings',
  '/m/agency/person',
  '/m/agency/invite',
  '/m/agency/plan',
  '/m/collections',
  '/m/collections/inside',
  '/m/collections/new',
  '/m/collections/client',
  '/m/more',
  '/m/profile',
  '/m/notifications',
  '/m/notifications/center',
  '/m/security',
  '/m/change-password',
  '/m/saved-searches',
  '/m/save-search',
  '/m/global-search',
  '/m/bulk-disclosure',
  '/m/bulk-panel',
  '/m/push',
  '/m/first-run/search',
  '/m/first-run/agency',
  '/m/first-run/employee',
  '/m/login',
  '/m/login/error',
  '/m/register',
  '/m/forgot',
  '/m/new-password',
  '/m/confirm-code',
  '/m/confirm-code/error',
  '/m/check-mail',
  '/m/invite',
  '/m/access-closed',
  // Два экрана, собранные раньше остальных и живущие на стендовых адресах.
  '/screen/mobile',
  '/screen/mobile-call',
]

type Failure = { path: string; what: string }

test('мобильный кабинет: каждый экран открывается и помещается в 390', async ({ page }) => {
  await seedSession(page)
  // Пятьдесят шесть страниц, каждая со своим куском сборки. Общего срока
  // в минуту не хватает, а не успевшая проверка молчит о непросмотренном.
  test.setTimeout(300_000)

  const failures: Failure[] = []
  const errors: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))

  await page.setViewportSize({ width: 390, height: 844 })

  for (const path of SCREENS) {
    errors.length = 0
    const response = await page.goto(path)

    if (response !== null && response.status() >= 400) {
      failures.push({ path, what: `статус ${response.status()}` })
      continue
    }

    const rendered = await page
      .waitForSelector('[data-slot]', { timeout: 8000 })
      .then(() => true)
      .catch(() => false)

    if (!rendered) {
      failures.push({ path, what: 'ни одного узла продукта — экран пустой' })
      continue
    }

    await page.evaluate(() => document.fonts.ready)

    const overflow = await page.evaluate(() => {
      const de = document.documentElement
      if (de.scrollWidth <= de.clientWidth) return null
      let worst: { tag: string; right: number } | null = null
      for (const node of document.querySelectorAll('*')) {
        const box = node.getBoundingClientRect()
        if (box.width === 0) continue
        if (box.right > de.clientWidth + 0.5 && (!worst || box.right > worst.right)) {
          worst = {
            tag: `${node.tagName.toLowerCase()}.${node.className?.toString?.().slice(0, 40) ?? ''}`,
            right: Math.round(box.right),
          }
        }
      }
      return { width: de.scrollWidth, worst }
    })

    if (overflow) {
      failures.push({
        path,
        what: `ширина ${overflow.width} против 390 · дальше всех ${overflow.worst?.tag} до ${overflow.worst?.right}`,
      })
    }

    if (errors.length > 0) {
      failures.push({ path, what: `ошибка в консоли: ${errors[0]?.slice(0, 120)}` })
    }
  }

  const report = [
    `Мобильных экранов проверено: ${SCREENS.length}`,
    `Не прошли: ${failures.length}`,
    '',
    ...failures.map((item) => `${item.path.padEnd(28)} ${item.what}`),
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'mobile-cabinet.txt'), report, 'utf8')
  if (failures.length > 0) console.log(report)

  expect(failures, 'мобильные экраны, которые не открылись или не поместились').toEqual([])
})
