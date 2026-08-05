import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/**
 * Высота и радиус — пара, а не два независимых значения.
 *
 * Обновление 04.08: в макете сверено 437 кнопкоподобных узлов, **64 нарушали
 * связку**. Все исправлены. Число говорит само за себя: на глаз эта связка
 * не держится, её обязана держать проверка.
 *
 * Карта из обновления. Радиус **берётся из неё**, а не считается от высоты:
 *
 *   24            → r-6
 *   28 · 32       → r-8
 *   36 · 40       → r-10
 *   44 · 48       → r-control (12)
 *   строка 64/88  → r-control (12)
 *   панели, диалоги → r-media (16)
 *   pill          → primary, чип фильтра, круглые фигуры
 *
 * Прежнее правило «радиус ÷ высота = 0,22–0,27» отменено: пять пар из девяти
 * в самой карте в него не попадают.
 *
 * **Пилюля означает «нажми меня».** Ненажимаемое её не получает никогда —
 * это отдельное утверждение, и оно проверяется отдельно.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

/** Высота → единственно верный радиус. */
const RADIUS_BY_HEIGHT: Record<number, number> = {
  24: 6,
  28: 8,
  32: 8,
  36: 10,
  40: 10,
  44: 12,
  48: 12,
  64: 12,
  88: 12,
}

const PAGES = [
  '/screen/search',
  '/screen/today',
  '/screen/object',
  '/screen/object-disclosed',
  '/screen/call',
  '/screen/mobile',
  '/screen/mobile-call',
  '/kitchen-sink',
]

type Violation = { page: string; kind: string; text: string; detail: string }

test('геометрия контролов: высота и радиус берутся из карты', async ({ page }) => {
  const violations: Violation[] = []

  for (const path of PAGES) {
    await page.setViewportSize({ width: 1440, height: 1024 })
    await page.goto(path)
    await page.waitForSelector('[data-slot]')
    await page.evaluate(() => document.fonts.ready)

    const onPage: Violation[] = await page.evaluate(
      ({ path, RADIUS_BY_HEIGHT }: { path: string; RADIUS_BY_HEIGHT: Record<number, number> }) => {
        const result: Violation[] = []

        /**
         * Пилюля законна у главного действия, у чипа фильтра и у круглых фигур:
         * аватар, точка логотипа, полоса прогресса. Всё остальное её не носит.
         */
        const PILL_ALLOWED = new Set(['filter-chip', 'mobile-filters'])

        /**
         * Кого карта не касается:
         *
         *   nav-item   высота идёт от содержимого, а не со ступени: длинное
         *              название поиска переносится, и пункт растёт до 56–64
         *   mobile-action, mobile-call-secondary
         *              **открытый вопрос владельца от 04.08**: лестница даёт
         *              44 / r-8, карта радиусов — r-control. Девятнадцать узлов,
         *              в исправленные 64 не входят. Пока стоит r-8 по лестнице;
         *              трогать нельзя, пока вопрос не решён
         */
        const OUT_OF_MAP = new Set(['nav-item', 'mobile-action', 'mobile-call-secondary'])

        function label(node: Element) {
          return (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 28)
        }

        const controls = document.querySelectorAll(
          'button, [role="button"], [role="switch"], [role="radio"], input, [data-slot="status-chip"], [data-slot="blocked-action"], [data-slot="qualification"]',
        )

        for (const node of controls) {
          const style = getComputedStyle(node)
          if (style.display === 'none' || style.visibility === 'hidden') continue

          const box = node.getBoundingClientRect()
          const height = Math.round(box.height)
          const radius = Number.parseFloat(style.borderTopLeftRadius)
          const slot = node.getAttribute('data-slot') ?? node.tagName.toLowerCase()
          if (OUT_OF_MAP.has(slot)) continue

          /**
           * Карта — про плашки, а не про любую нажимаемую надпись.
           * «Сбросить 7», «Изменить», «Показать все 8» и табы поверхности
           * не имеют: у них нет ни заливки, ни рамки по кругу. Радиус нуля
           * у них законен, и требовать от них ступень бессмысленно.
           */
          const filled =
            style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent'
          const framed =
            Number.parseFloat(style.borderTopWidth) > 0 &&
            Number.parseFloat(style.borderBottomWidth) > 0 &&
            Number.parseFloat(style.borderLeftWidth) > 0
          if (!filled && !framed) continue

          // Капсула: браузер отдаёт огромное число, а не 999.
          const isPill = radius >= Math.max(box.width, box.height)
          const round = Math.abs(box.width - box.height) < 1.5

          if (isPill) {
            const variant = node.getAttribute('data-variant')
            const pillOk =
              round ||
              PILL_ALLOWED.has(slot) ||
              variant === 'primary' ||
              variant === 'money' ||
              variant === 'pending'
            if (!pillOk) {
              result.push({
                page: path,
                kind: 'лишняя пилюля',
                text: label(node),
                detail: `${slot} · высота ${height} · пилюля разрешена главному действию, чипу фильтра и круглым фигурам`,
              })
            }
            continue
          }

          const want = RADIUS_BY_HEIGHT[height]
          if (want === undefined) continue
          if (Math.abs(radius - want) > 0.5) {
            result.push({
              page: path,
              kind: 'радиус не по карте',
              text: label(node),
              detail: `${slot} · высота ${height} → нужен r-${want}, стоит ${radius}`,
            })
          }
        }

        return result
      },
      { path, RADIUS_BY_HEIGHT },
    )

    violations.push(...onPage)
  }

  const report = [
    `Проверено экранов: ${PAGES.length}`,
    `Нарушений связки «высота — радиус»: ${violations.length}`,
    '',
    ...violations.map((v) => `${v.kind.padEnd(18)} ${v.page.padEnd(26)} «${v.text}» — ${v.detail}`),
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'control-geometry.txt'), report, 'utf8')
  if (violations.length > 0) console.log(report)

  expect(violations, 'контролы, у которых радиус не из карты').toEqual([])
})
