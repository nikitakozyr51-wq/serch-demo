import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Слой закрытых лестниц.
 *
 * Это правило, а не сравнение с эталоном: эталонный файл ему не нужен,
 * связей вести не надо, и работает он на любой странице продукта с первого дня.
 *
 * Дизайн-система «Сёрчи» объявляет закрытые наборы: восемь кеглей кабинета,
 * лестницу радиусов, лестницу высот контролов, двойную шкалу отступов.
 * «Закрытая» означает, что значение вне набора — дефект, а не вариант.
 * Проверка обходит отрисованную страницу и требует, чтобы каждое значение
 * лежало в своём наборе.
 *
 * Именно этот слой поймал бы мёртвые классы высоты мгновенно: 26 не лежит
 * на лестнице контролов.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

/** Кабинет: 11 · 12 · 13 · 14 · 16 · 20 · 28 · 40. Промежуточных нет. */
const FONT_SIZES = [11, 12, 13, 14, 16, 20, 28, 40]

/**
 * Радиусы. 2 и 4 допустимы только на полосках высотой до 8 px, поэтому
 * проверяются вместе с высотой элемента. Капсула распознаётся отдельно.
 */
const RADII = [0, 2, 4, 6, 8, 10, 12, 16, 24]

/** Высоты контролов: просторный и плотный режим вместе. Пол 24 по WCAG 2.5.8. */
const CONTROL_HEIGHTS = [24, 28, 32, 36, 40, 44, 48]

/**
 * Лестница высот действует на контролы, а не на всё, что несёт `data-slot`.
 * Текстовый узел `typography` и колонка `text-field` — не контролы: у первого
 * высота равна строке, у второй складывается из метки, поля и текста ошибки.
 */
const CONTROL_SLOTS = ['button', 'filter-chip', 'checkbox']

/**
 * Отступы и зазоры. Микро-шкала внутри контрола и строки, макро — между
 * блоками. Обе объявлены в DESIGN.md, обе выражаются базой 4.
 */
const SPACING = [
  0, 2, 4, 6, 8, 10, 12, 14,
  // 72 — поле формы входа по горизонтали, снято с `MyesE`: `pad=[64,72]`.
  // Ступень нашлась только когда правило распространили с двух страниц
  // на все двадцать девять: восемь экранов входа стояли вне лестницы,
  // и никто об этом не знал.
  16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 88, 96, 120, 140,
]

type Violation = {
  kind: string
  value: string
  allowed: string
  where: string
}

/**
 * Слой работает на всех продуктовых страницах, а не на одной.
 *
 * README обещал «любую страницу продукта с первого дня», а открывался только
 * полигон: настоящий экран выдачи под правило не попадал вовсе.
 */
const PAGES = [
  '/kitchen-sink',
  '/screen/search',
  '/today',
  '/search',
  '/object',
  '/object/disclosed',
  '/call',
  '/balance',
  '/balance/refunds',
  '/balance/documents',
  '/balance/top-up',
  '/collections',
  '/collections/inside',
  '/agency',
  '/agency/staff',
  '/agency/staff/person',
  '/agency/refusals',
  '/agency/access',
  '/agency/consents',
  '/agency/settings',
  '/agency/plan',
  '/profile/login-policy',
  '/dialogs',
  '/first-run/search',
  '/first-run/agency',
  '/first-run/employee',
  '/register',
  '/forgot',
  '/new-password',
  '/confirm-code',
  '/check-mail',
  '/invite',
  '/access-closed',
]

test('лестницы: ни одного значения вне закрытых наборов', async ({ page }) => {
  await seedSession(page)
  // Правило обходит тридцать две страницы, и каждая грузится своим кусочком
  // сборки. Общего срока в минуту на это не хватает: проверка падала
  // не находкой, а таймаутом на середине списка — то есть молчала о том,
  // чего не успела посмотреть. Худшая порода зелёной проверки.
  test.setTimeout(240_000)

  const violations: Violation[] = []

  for (const path of PAGES) {
  await page.goto(path)
  await page.waitForSelector('[data-slot="button"]')
  await page.evaluate(() => document.fonts.ready)

  const pageViolations: Violation[] = await page.evaluate(
    ({ FONT_SIZES, RADII, CONTROL_HEIGHTS, CONTROL_SLOTS, SPACING }) => {
      const found: Violation[] = []
      const near = (value: number, set: number[]) =>
        set.some((allowed) => Math.abs(value - allowed) < 0.5)

      function describe(element: Element) {
        const slot = element.getAttribute('data-slot')
        if (slot) {
          const variant = element.getAttribute('data-variant')
          const size = element.getAttribute('data-size')
          return [slot, variant, size].filter(Boolean).join('·')
        }
        const text = (element.textContent ?? '').trim().slice(0, 22)
        return `${element.tagName.toLowerCase()}${text ? ` «${text}»` : ''}`
      }

      /** Текст считается собственным, если у элемента есть прямой текстовый ребёнок. */
      function ownsText(element: Element) {
        return [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
        )
      }

      // Обход от body, а не от #root: порталы — диалоги, меню, подсказки —
      // рисуются соседним узлом, и внутри #root их не видно.
      for (const element of document.body.querySelectorAll('*')) {
        const style = getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        const box = element.getBoundingClientRect()
        if (box.width === 0 && box.height === 0) continue
        const where = describe(element)

        if (ownsText(element)) {
          const fontSize = Number.parseFloat(style.fontSize)
          if (!near(fontSize, FONT_SIZES)) {
            found.push({
              kind: 'кегль',
              value: `${fontSize}px`,
              allowed: FONT_SIZES.join(' · '),
              where,
            })
          }
        }

        // Капсула распознаётся по тому, что радиус задан заведомо больше
        // элемента, а не по «больше половины высоты»: на кнопке 32 второй
        // порог объявлял капсулой любые 16 и выше, и внелестничные 18 или 22
        // проходили молча. Настоящая капсула отдаёт в браузере 3.3e7px.
        const radius = Number.parseFloat(style.borderTopLeftRadius)
        const isPill = radius >= Math.max(box.width, box.height)
        if (radius > 0 && !isPill && !near(radius, RADII)) {
          found.push({
            kind: 'радиус',
            value: `${radius}px`,
            allowed: `${RADII.join(' · ')} или капсула`,
            where,
          })
        }
        // 2 и 4 законны только на полосках до 8 px высотой.
        if ((near(radius, [2]) || near(radius, [4])) && box.height > 8.5) {
          found.push({
            kind: 'радиус 2/4 не на полоске',
            value: `${radius}px при высоте ${Math.round(box.height)}px`,
            allowed: 'только на элементах высотой до 8px',
            where,
          })
        }

        const slot = element.getAttribute('data-slot')
        const isControl =
          (slot !== null && CONTROL_SLOTS.includes(slot)) ||
          (element.tagName === 'INPUT' && element.closest('[data-slot="text-field"]') !== null)
        if (isControl) {
          const height = Math.round(box.height * 100) / 100
          if (!near(height, CONTROL_HEIGHTS)) {
            found.push({
              kind: 'высота контрола',
              value: `${height}px`,
              allowed: CONTROL_HEIGHTS.join(' · '),
              where,
            })
          }
        }

        for (const [name, raw] of [
          ['отступ сверху', style.paddingTop],
          ['отступ справа', style.paddingRight],
          ['отступ снизу', style.paddingBottom],
          ['отступ слева', style.paddingLeft],
          ['зазор по горизонтали', style.columnGap],
          ['зазор по вертикали', style.rowGap],
        ] as const) {
          if (raw === 'normal') continue
          const value = Number.parseFloat(raw)
          if (Number.isNaN(value)) continue
          if (!near(value, SPACING)) {
            found.push({ kind: name, value: `${value}px`, allowed: 'шкала DESIGN.md', where })
          }
        }
      }

      return found
    },
    { FONT_SIZES, RADII, CONTROL_HEIGHTS, CONTROL_SLOTS, SPACING },
  )

  violations.push(...pageViolations.map((v) => ({ ...v, where: `${path} · ${v.where}` })))
  }

  const lines = [
    `Нарушений закрытых лестниц: ${violations.length}`,
    '',
    ...violations.map(
      (v) => `${v.kind.padEnd(24)} ${v.value.padEnd(18)} ${v.where.padEnd(30)} допустимо: ${v.allowed}`,
    ),
  ]
  const report = lines.join('\n')
  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'ladders.txt'), report, 'utf8')
  if (violations.length > 0) console.log(report)

  expect(violations, 'значения вне закрытых лестниц').toEqual([])
})
