import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Проверка честности полигона.
 *
 * Полигон показывает наведение, фокус и нажатие неподвижно — через проп `demo`.
 * Это удобно для сверки с доской, но создаёт опасность: демонстрация может
 * разойтись с тем, что человек увидит на самом деле, и тогда сверка с макетом
 * будет доказывать несуществующее.
 *
 * Здесь состояния вызываются по-настоящему: мышь наводится, фокус ставится
 * с клавиатуры, кнопка мыши удерживается нажатой. Полученные стили сравниваются
 * с демонстрационной ячейкой. Расхождение означает, что полигон врёт.
 *
 * На время замера переходы выключаются: иначе стиль читается посреди
 * стопятидесятимиллисекундной анимации и приходит промежуточный цвет.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

const WATCHED = [
  'backgroundColor',
  'borderTopColor',
  'borderTopWidth',
  'outlineColor',
  'outlineWidth',
  'outlineStyle',
  'boxShadow',
  'color',
] as const

const CONTROLS = [
  { id: 'primary-48', selector: '[data-slot="button"]', comparePress: true },
  { id: 'secondary-32', selector: '[data-slot="button"]', comparePress: true },
  // Нажатие на текстовое поле неотделимо от фокуса: браузер ставит фокус
  // тем же движением. Демонстрационная ячейка показывает только нажатие,
  // поэтому сравнивать их нельзя.
  { id: 'input-40', selector: 'input', comparePress: false },
  // У чипа и чекбокса колонка «нажатие» показывает выбранное и отмеченное
  // состояние — так на доске. Это не живое нажатие.
  { id: 'chip-28', selector: '[data-slot="filter-chip"]', comparePress: false },
  { id: 'checkbox-24', selector: '[data-slot="checkbox"]', comparePress: false },
]

type Diff = { control: string; state: string; property: string; live: string; demo: string }

test('полигон не врёт: живые состояния совпадают с демонстрационными', async ({ page }) => {
  await seedSession(page)
  await page.goto('/kitchen-sink')
  await page.waitForSelector('[data-check]')
  await page.evaluate(() => document.fonts.ready)

  // Переходы выключаются на время замера: сравниваются конечные состояния,
  // а не кадры анимации.
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  })

  async function styles(check: string, selector: string) {
    return page.evaluate(
      ({ check, selector, props }) => {
        const element = document.querySelector(`[data-check="${check}"] ${selector}`)
        if (!element) return null
        const computed = getComputedStyle(element)
        const result: Record<string, string> = {}
        for (const property of props) result[property] = computed[property as never] as string

        /**
         * Ненарисованная обводка не имеет ни ширины, ни цвета.
         *
         * Браузер сообщает `outline-width` даже при `outline-style: none` —
         * и сообщает РАЗНОЕ: там, где ширину задали и погасили стилем, это
         * заданное число, а там, где не задавали вовсе, — начальное `medium`,
         * то есть 3 px. Оба случая рисуют ровно ничего, но сравнение видело
         * «2 px против 3 px» и называло расхождением то, чего на экране нет.
         *
         * Поле ввода как раз такой случай: с 05.08 его фокус — это линия
         * снизу, а не кольцо, и обводки у него нет ни в жизни, ни на полигоне.
         */
        if (result.outlineStyle === 'none') {
          result.outlineWidth = '0px'
          result.outlineColor = 'нет обводки'
        }

        return result
      },
      { check, selector, props: [...WATCHED] },
    )
  }

  const diffs: Diff[] = []
  const compare = (control: string, state: string, live: Record<string, string> | null, demo: Record<string, string> | null) => {
    if (!live || !demo) return
    for (const property of WATCHED) {
      if (live[property] !== demo[property]) {
        diffs.push({ control, state, property, live: live[property] ?? '—', demo: demo[property] ?? '—' })
      }
    }
  }

  for (const control of CONTROLS) {
    const rest = page.locator(`[data-check="${control.id}|rest"] ${control.selector}`)

    // ── Наведение ─────────────────────────────────────────────────────────
    await rest.hover()
    compare(control.id, 'наведение', await styles(`${control.id}|rest`, control.selector), await styles(`${control.id}|hover`, control.selector))
    await page.mouse.move(0, 0)

    // ── Фокус ─────────────────────────────────────────────────────────────
    // Сначала нажатие клавиши переводит браузер в клавиатурный режим — иначе
    // `:focus-visible` к программно сфокусированному элементу не применяется.
    await page.keyboard.press('Tab')
    await rest.evaluate((element: HTMLElement) => element.focus())
    compare(control.id, 'фокус', await styles(`${control.id}|rest`, control.selector), await styles(`${control.id}|focus`, control.selector))
    await rest.evaluate((element: HTMLElement) => element.blur())

    // ── Нажатие ───────────────────────────────────────────────────────────
    if (control.comparePress) {
      const box = await rest.boundingBox()
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.down()
        compare(control.id, 'нажатие', await styles(`${control.id}|rest`, control.selector), await styles(`${control.id}|press`, control.selector))
        await page.mouse.up()
        await page.mouse.move(0, 0)
      }
    }
  }

  const lines = [
    `Проверено контролов: ${CONTROLS.length}`,
    `Сравнивалось нажатие: ${CONTROLS.filter((c) => c.comparePress).length}`,
    `Расхождений между живым состоянием и демонстрацией: ${diffs.length}`,
    '',
    ...diffs.map(
      (d) => `${d.control.padEnd(16)} ${d.state.padEnd(12)} ${d.property.padEnd(18)} живое: ${d.live.padEnd(26)} демо: ${d.demo}`,
    ),
  ]
  const report = lines.join('\n')
  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'demo-states.txt'), report, 'utf8')
  if (diffs.length > 0) console.log(report)

  expect(diffs, 'демонстрация состояний разошлась с живым поведением').toEqual([])
})
