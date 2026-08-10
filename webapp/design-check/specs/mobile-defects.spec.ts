import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Мобильные дефекты, которые на 1440 не видны.
 *
 * Перепись кнопок и переполнение были зелёными — и пропускали всё подряд
 * на телефоне. Причина: обе проверки ходили на 1440. Теперь ходят
 * на 390, 360 и 320 и ищут две вещи:
 *
 *   1. Мёртвые контролы — <button> без действия, без data-action,
 *      без курсора-указателя и не внутри живой кнопки.
 *   2. Выпавший текст — содержимое с жёсткой высотой, у которого
 *      scrollHeight больше clientHeight.
 *
 * Три известных ложных срабатывания вычитаются, а не вносятся в список:
 *
 *   • `tap-44` — псевдоэлемент зоны касания (min-height 44) добавляет
 *     снизу ровно (44 − h) / 2. Это не выпадение, а наоборот — норма.
 *   • Полулидинг Inter Tight — при интерлиньяже ниже естественного
 *     (1.222 × кегль) под строкой висит невидимый запас. Выпавшие
 *     строки дают больше этой добавки, поэтому запас можно вычесть.
 *   • Въезд листа — во время анимации scrim с translateY(100%) кажется
 *     переполненным. Ждём 700 мс на первой ширине каждой страницы
 *     (анимация живёт на монтировании, смена ширины её не повторяет).
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

const MOBILE_PAGES = [
  '/m/today', '/m/filters', '/m/object', '/m/object/before',
  '/m/object/similar', '/m/similar', '/m/taken',
  '/m/balance', '/m/balance/refunds', '/m/balance/top-ups',
  '/m/balance/documents', '/m/balance/top-up', '/m/balance/refund',
  '/m/agency', '/m/agency/staff', '/m/agency/refusals',
  '/m/agency/access', '/m/agency/consents', '/m/agency/settings',
  '/m/agency/person', '/m/agency/invite', '/m/agency/plan',
  '/m/collections', '/m/collections/inside', '/m/collections/new',
  '/m/collections/client', '/m/more', '/m/profile',
  '/m/notifications', '/m/notifications/center', '/m/security',
  '/m/change-password', '/m/saved-searches', '/m/save-search',
  '/m/global-search', '/m/bulk-disclosure', '/m/bulk-panel', '/m/push',
  '/m/first-run/search', '/m/first-run/agency', '/m/first-run/employee',
  '/m/login', '/m/login/error', '/m/register', '/m/forgot',
  '/m/new-password', '/m/confirm-code', '/m/confirm-code/error',
  '/m/check-mail', '/m/invite', '/m/access-closed',
]

const WIDTHS = [390, 360, 320] as const

type Defect = { page: string; width: number; kind: string; text: string; detail: string }

test('мобильные дефекты: ни одной мёртвой кнопки и ни одного выпавшего текста', async ({ page }) => {
  await seedSession(page)
  test.setTimeout(300_000)

  const all: Defect[] = []

  for (const path of MOBILE_PAGES) {
    for (let wi = 0; wi < WIDTHS.length; wi++) {
      const width = WIDTHS[wi]
      await page.setViewportSize({ width, height: 844 })
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      try { await page.waitForSelector('[data-slot]', { timeout: 6000 }) }
      catch { all.push({ page: path, width, kind: 'пусто', text: '—', detail: 'ни одного узла продукта за 6 с' }); continue }
      await page.evaluate(() => document.fonts.ready)
      // Въезд листа: ждём окончания анимации, а не фиксированное время.
      const scrim = await page.$('[data-slot="mobile-sheet-scrim"]')
      if (scrim) {
        await page.waitForFunction(() => {
          const sheet = document.querySelector('[data-slot="mobile-sheet"]')
          return !sheet || getComputedStyle(sheet).transform === 'none'
        }, { timeout: 2000 }).catch(() => {})
      }

      const found: Defect[] = await page.evaluate(({ path, width }: { path: string; width: number }) => {
        const result: { page: string; width: number; kind: string; text: string; detail: string }[] = []
        const label = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50)

        const where = (el: Element) => {
          const slot = el.closest('[data-slot]')?.getAttribute('data-slot')
          return `${path} · ${slot ?? el.tagName.toLowerCase()}`
        }

        // 1. МЁРТВЫЕ КОНТРОЛЫ — только <button> без признаков жизни
        for (const el of document.querySelectorAll('button')) {
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden') continue
          const box = el.getBoundingClientRect()
          if (box.width < 4 || box.height < 4) continue
          if (el.closest('a[href]')) continue
          if (el.hasAttribute('disabled')) continue
          if (el.dataset.action) continue
          if (el.getAttribute('type') === 'submit') continue
          // Живая: внутри компонента с data-action или внутри другой кнопки
          if (el.closest('[data-action]')) continue
          if (cs.cursor === 'pointer') continue
          result.push({
            page: path, width, kind: 'мёртвый',
            text: label(el),
            detail: `button без действия · ${where(el)}`,
          })
        }

        // 2. ПЕРЕНОС ТЕКСТА — только у элементов с явной фиксированной высотой
        for (const el of document.querySelectorAll('[data-slot]')) {
          const cs = getComputedStyle(el)
          if (cs.display === 'none' || cs.visibility === 'hidden') continue
          const box = el.getBoundingClientRect()
          if (box.width === 0 || box.height === 0) continue
          if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') continue
          // Только когда высота задана явно (не auto, не %)
          if (cs.height === 'auto' || cs.height.endsWith('%')) continue
          let diff = el.scrollHeight - el.clientHeight
          // tap-44: зона касания вычитается, а не считается выпадением.
          if (el.matches('.tap-44')) {
            diff -= Math.max(0, (44 - el.clientHeight) / 2)
          }
          // Полулидинг: запас под строкой при тесном интерлиньяже.
          // Выпавшая строка даёт больше этой добавки.
          if (diff > 2 && el.children.length === 0) {
            const fs = parseFloat(cs.fontSize) || 0
            const lh = parseFloat(cs.lineHeight) || 0
            const halfLeading = Math.max(0, (1.222 * fs - lh) / 2)
            if (diff <= halfLeading + 0.5) diff = 0
          }
          if (diff > 2) {
            result.push({
              page: path, width, kind: cs.overflowY === 'hidden' ? 'обрезано' : 'выпало',
              text: label(el),
              detail: `нужно ${el.scrollHeight}px, есть ${el.clientHeight}px (+${Math.round(el.scrollHeight - el.clientHeight)}) · ${cs.height} · ${where(el)}`,
            })
          }
        }

        return result
      }, { path, width })

      const seen = new Set<string>()
      for (const d of found) {
        const key = `${d.kind}|${d.text.slice(0, 15)}`
        if (seen.has(key)) continue
        seen.add(key)
        all.push(d)
      }
    }
  }

  const report = [
    `Мобильных экранов: ${MOBILE_PAGES.length} × ${WIDTHS.length} ширин`,
    `Дефектов найдено: ${all.length}`,
    '',
  ]
  const counts: Record<string, number> = {}
  for (const d of all) {
    report.push(`${d.width.toString().padStart(4)} · ${d.kind.padStart(8)} ${d.page.padEnd(26)} ${d.text}`)
    report.push(`       ${d.detail}`)
    counts[d.kind] = (counts[d.kind] ?? 0) + 1
  }
  report.push('', `Итого: ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}`)

  await mkdir(artifactsDir, { recursive: true })
  const outPath = resolve(artifactsDir, 'mobile-defects.txt')
  await writeFile(outPath, report.join('\n'), 'utf8')
  console.log(report.join('\n'))

  // Ни одной находки. Проверка прошла путь от 86 до 0 —
  // теперь новые дефекты не проскочат.
  expect(all).toEqual([])
})
