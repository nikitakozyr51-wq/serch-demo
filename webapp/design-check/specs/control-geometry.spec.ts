import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

/**
 * ФОРМА ОТВЕЧАЕТ НА ВОПРОС «ЧТО ЭТО», А НЕ «КАКОЙ ОНО ВЫСОТЫ».
 *
 * Передача 05.08.2026, раздел 1. Прежняя карта из семи радиусов, назначаемых
 * по высоте, ОТМЕНЕНА — вместе с проверкой, которая её держала. Она отвечала
 * на вопрос о размере, а человек, глядя на экран, спрашивает о роли.
 *
 * | Что | Форма |
 * |---|---|
 * | Всё, что нажимается и совершает действие | капсула |
 * | Поле ввода, селект, поисковая строка | линия снизу, коробки нет |
 * | Чекбокс | квадрат `r-6` — единственное исключение |
 *
 * **Острого угла в продукте больше нет нигде**, кроме полей ввода, у которых
 * коробки нет вовсе.
 *
 * Почему это проверяет машина. В файле на момент передачи: капсул 889, мягких
 * углов 132, линий снизу 122. Правило простое на словах и разъезжается на
 * первом же экране, собранном по памяти, — ровно как разъехалась прежняя
 * связка «высота — радиус» на 64 узлах из 437.
 *
 * Поверхности — панели, строки-карточки, плашки — сюда не попадают: у них
 * мягкий угол по высоте, и это другой слой, который смотрит не на контролы.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

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

test('геометрия контролов: форма отвечает роли', async ({ page }) => {
  const violations: Violation[] = []

  for (const path of PAGES) {
    await page.setViewportSize({ width: 1440, height: 1024 })
    await page.goto(path)
    await page.waitForSelector('[data-slot]')
    await page.evaluate(() => document.fonts.ready)

    const onPage: Violation[] = await page.evaluate((path: string) => {
      const result: Violation[] = []

      /**
       * Поля ввода: коробки нет, линия снизу.
       *
       * Сюда же поисковая строка в шапке кабинета — она тоже поле, открытое
       * нажатием, а не кнопка, и коробку получает только при фокусе.
       */
      const FIELDS = new Set(['text-field', 'auth-field', 'global-search'])

      /** Квадрат — единственное исключение из капсулы. */
      const SQUARES = new Set(['checkbox'])

      /**
       * Кого правило формы не касается вовсе:
       *
       *   map-card       ссылка-карточка стенда, а не продукта
       *   palette-item   строка списка внутри окна: это поверхность
       *   preset-card    карточка готового набора условий — тоже поверхность
       *   listing-row,
       *   today-row      строки списков: поверхность, а не контрол
       */
      const SKIP = new Set(['map-card', 'palette-item', 'preset-card', 'listing-row', 'today-row'])

      function label(node: Element) {
        return (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 28)
      }

      const controls = document.querySelectorAll(
        'button, [role="button"], [role="switch"], [role="radio"], input, textarea',
      )

      for (const node of controls) {
        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility === 'hidden') continue

        const box = node.getBoundingClientRect()
        if (box.width === 0 || box.height === 0) continue

        const height = Math.round(box.height)
        const radius = Number.parseFloat(style.borderTopLeftRadius)
        const slot = node.getAttribute('data-slot') ?? node.tagName.toLowerCase()
        if (SKIP.has(slot)) continue

        // Капсула: браузер отдаёт огромное число, а не 999.
        const isPill = radius >= Math.max(box.width, box.height)

        if (SQUARES.has(slot)) {
          if (Math.abs(radius - 6) > 0.5) {
            result.push({
              page: path,
              kind: 'квадрат потерял радиус',
              text: label(node),
              detail: `${slot} · нужен r-6, стоит ${radius}`,
            })
          }
          continue
        }

        const isField = FIELDS.has(slot) || node.tagName === 'INPUT' || node.tagName === 'TEXTAREA'
        if (isField) {
          const width = (side: string) =>
            Number.parseFloat(style.getPropertyValue(`border-${side}-width`))
          const top = width('top')
          const right = width('right')
          const bottom = width('bottom')
          const left = width('left')
          const boxed = top > 0 || right > 0 || left > 0

          // Коробка законна ровно в одном состоянии — в фокусе, — и проверка
          // смотрит покой: фокуса на странице нет ни у одного поля.
          if (boxed || radius > 0.5) {
            result.push({
              page: path,
              kind: 'у поля осталась коробка',
              text: label(node),
              detail: `${slot} · рамка ${top}/${right}/${bottom}/${left}, радиус ${radius} — нужна только линия снизу`,
            })
          } else if (bottom <= 0) {
            result.push({
              page: path,
              kind: 'у поля нет линии снизу',
              text: label(node),
              detail: `${slot} · поле обязано быть видно даже пустым`,
            })
          }
          continue
        }

        /**
         * Всё остальное нажимается и совершает действие, значит капсула.
         *
         * Кроме тех, у кого нет поверхности вовсе: «Сбросить 7», «Изменить»,
         * «Показать все 8» — нажимаемые надписи без заливки и рамки. Радиус
         * им назначать не на чем, и требовать от них форму бессмысленно.
         */
        const filled =
          style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent'
        const framed =
          Number.parseFloat(style.borderTopWidth) > 0 &&
          Number.parseFloat(style.borderBottomWidth) > 0 &&
          Number.parseFloat(style.borderLeftWidth) > 0
        if (!filled && !framed) continue

        if (!isPill) {
          result.push({
            page: path,
            kind: 'не капсула',
            text: label(node),
            detail: `${slot} · высота ${height} · радиус ${radius} — нажимаемое носит капсулу`,
          })
        }
      }

      return result
    }, path)

    violations.push(...onPage)
  }

  const report = [
    `Проверено экранов: ${PAGES.length}`,
    `Контролов не по правилу формы: ${violations.length}`,
    '',
    ...violations.map((v) => `${v.kind.padEnd(26)} ${v.page.padEnd(24)} «${v.text}» — ${v.detail}`),
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'control-geometry.txt'), report, 'utf8')
  if (violations.length > 0) console.log(report)

  expect(violations, 'контролы, форма которых не отвечает роли').toEqual([])
})
