import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Кнопка живёт в одном месте.
 *
 * Правка кнопок в макете обязана стоить одну правку в коде, а не тридцать.
 * К моменту заведения этого слоя кнопкоподобных элементов, написанных руками
 * мимо компонента, было **четырнадцать**: у каждого своя заливка, свой радиус
 * и своё кольцо фокуса, набранные по памяти.
 *
 * Слой ищет на продуктовых экранах интерактивные узлы, которые выглядят
 * кнопкой — заливка плюс радиус плюс курсор, — но компонентом не являются.
 * Найденный узел называется поимённо: либо он становится вариантом кнопки,
 * либо он не кнопка и не должен ею выглядеть.
 *
 * Что законно и потому не считается: сами кнопки компонента, чипы (у них свой
 * контрол), поля ввода, ссылки-карточки карты экранов и всё, что вне продукта.
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
  // Продуктовые адреса, а не только стенды. Слой ловил рукописные кнопки
  // ровно там, куда смотрел, — то есть на семи стендах из тридцати трёх
  // страниц. Всё, что построено позже, проходило мимо него молча.
  '/balance',
  '/balance/top-up',
  '/balance/documents',
  '/agency',
  '/agency/staff',
  '/agency/staff/person',
  '/agency/settings',
  '/collections',
  '/collections/inside',
  '/profile/login-policy',
  '/first-run/search',
  '/first-run/agency',
  '/first-run/employee',
  '/dialogs',
  '/register',
  '/invite',
  '/access-closed',
]

type HandMade = { page: string; text: string; detail: string }

test('кнопки: ни одной написанной руками мимо компонента', async ({ page }) => {
  await seedSession(page)
  // Срок растёт вместе со списком страниц. Проверка, не успевшая дойти
  // до конца, молчит о непросмотренном — и это выглядит как зелёная.
  test.setTimeout(240_000)

  const found: HandMade[] = []

  for (const path of PAGES) {
    await page.setViewportSize({ width: 1440, height: 1024 })
    await page.goto(path)
    await page.waitForSelector('[data-slot]')
    await page.evaluate(() => document.fonts.ready)

    const onPage: HandMade[] = await page.evaluate((path: string) => {
      const result: HandMade[] = []
      /**
       * Не кнопки, хотя выглядят похоже, — у каждого своя причина:
       *
       *   button, select-chip, filter-chip, checkbox  — сами контролы
       *   map-card                                     — ссылка-карточка стенда
       *   nav-item                                     — пункт навигации: заливка
       *       у него означает «здесь вы сейчас», а не «сюда можно нажать»
       *   global-search                                — поле поиска в шапке;
       *       это поле ввода, открытое кликом, а не кнопка
       *   mobile-tab, mobile-filters, density-toggle,
       *   result-tab, filter-reset                     — переключатели вида
       *       и разделов: они меняют состояние экрана, а не запускают действие
       *   step-button                                  — стрелки «предыдущий /
       *       следующий объект», 28 × 28: ступени кнопки начинаются с 32
       *   mobile-action, mobile-call-now,
       *   mobile-call-secondary                        — **временно**: на телефоне
       *       ступени 44, а у кнопки их нет. Заводить их сейчас рано —
       *       кнопки правятся в макете, и ступень надо брать из итога,
       *       а не из промежуточного состояния.
       */
      const ALLOWED = new Set([
        'button',
        /**
         * `user-avatar` — круглая фигура с инициалами, открывающая меню.
         *
         * Кнопкой компонента ей быть нельзя: у кнопки есть подпись, ступень
         * высоты и боковое поле, а здесь квадрат 32 с двумя буквами по центру.
         * Правило формы от 05.08 относит аватар к круглым фигурам вместе
         * с точкой вордмарка, а не к кнопкам.
         *
         * Раньше аватар был ссылкой и мимо проверки проходил молча; кнопкой
         * он стал, когда обходное решение «аватар ведёт в Политику входа»
         * сменилось настоящим меню.
         */
        'user-avatar',
        'select-chip',
        'filter-chip',
        'checkbox',
        'map-card',
        'nav-item',
        'global-search',
        'mobile-tab',
        'mobile-filters',
        'density-toggle',
        'result-tab',
        'filter-reset',
        'step-button',
        'mobile-action',
        'mobile-call-now',
        'mobile-call-secondary',
        /**
         * Не кнопки по той же причине, что и остальные в списке:
         *
         *   balance-tab, agency-tab   — переключатели раздела, не действия
         *   palette-item              — строка списка в командной палитре
         *   preset-card               — карточка готового набора: это выбор
         *       условий поиска, а не запуск действия
         *   agency-search-row         — строка списка поисков агентства
         *   payment-option,
         *   format-option             — переключатели выбора, у них своя
         *       геометрия карточки и кружок вместо подписи кнопки
         *   row-action                — «Скачать» в строке таблицы: 24 в высоту,
         *       а ступени кнопки начинаются с 32. Это подпись, по которой
         *       можно нажать, и в файле она нарисована именно так
         *   mobile-back               — стрелка «назад» 20 в шапке раздела
         */
        'balance-tab',
        'agency-tab',
        'palette-item',
        'preset-card',
        'agency-search-row',
        'payment-option',
        'format-option',
        'row-action',
        'mobile-back',
      ])

      for (const node of document.querySelectorAll('button, [role="button"]')) {
        const slot = node.getAttribute('data-slot')
        if (slot && ALLOWED.has(slot)) continue
        if (node.closest('[data-slot="button"]')) continue
        if (node.closest('[data-slot="select-chip"]')) continue

        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility === 'hidden') continue

        const filled =
          style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent'
        const rounded = Number.parseFloat(style.borderTopLeftRadius) > 0
        const bordered = Number.parseFloat(style.borderTopWidth) > 0

        // Кнопкой на вид считается то, у чего есть поверхность: заливка
        // или граница вместе со скруглением. Голая текстовая кнопка —
        // законный приём («Показать все 8», «Сбросить 7»), её не трогаем.
        if (!(rounded && (filled || bordered))) continue

        result.push({
          page: path,
          text: (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 32),
          detail: `${slot ?? node.tagName.toLowerCase()} · фон ${style.backgroundColor} · радиус ${style.borderTopLeftRadius}`,
        })
      }

      return result
    }, path)

    found.push(...onPage)
  }

  const report = [
    `Проверено экранов: ${PAGES.length}`,
    `Кнопок мимо компонента: ${found.length}`,
    '',
    ...found.map((item) => `${item.page.padEnd(28)} «${item.text}» — ${item.detail}`),
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'buttons.txt'), report, 'utf8')
  if (found.length > 0) console.log(report)

  expect(found, 'кнопки, написанные руками мимо компонента Button').toEqual([])
})
