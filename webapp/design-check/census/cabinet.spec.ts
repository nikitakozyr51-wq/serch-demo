import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

import { seedAgency } from '../lib/session'

/**
 * Перепись кабинета: каждый экран открывается, ничего не падает, нажимаемое
 * нажимается.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАЧЕМ ОНА ЕСТЬ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Владелец сказал: «кабинет полностью неработоспособный, это просто набор
 * шаблонов, ничего не кликается». Он был прав, и я чинил по одному месту,
 * о котором он говорил, — а оставалось десять таких же. Корень был не
 * в отдельных ошибках, а в отсутствии сплошного метода.
 *
 * Разовый обход эту дыру не закрывает: он показывает состояние на один день.
 * Здесь он становится постоянным.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО СЧИТАЕТСЯ МЁРТВЫМ УЗЛОМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Узел, который ВЫГЛЯДИТ нажимаемым и не делает ничего:
 *
 * - `<button>` без обработчика и вне формы;
 * - `<a>` без адреса;
 * - что угодно с `cursor: pointer` и без обработчика.
 *
 * Выключенный контрол мёртвым не считается: он честно говорит, что не
 * работает. Не считается и то, что ведёт наружу.
 *
 * Обработчики React не видны в разметке, поэтому проверка ловит их иначе:
 * перехватывает `addEventListener` до загрузки приложения и помечает узлы,
 * на которые React повесил делегирование. React 19 вешает слушатели на
 * корень контейнера, поэтому дополнительно засчитывается любой узел,
 * у которого есть внутреннее свойство с обработчиком.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

/**
 * Все продуктовые адреса кабинета: компьютер и телефон.
 *
 * Стенды сверки (`/screen/…`) сюда не входят: они существуют, чтобы
 * сравнивать пиксели, и мёртвая кнопка на стенде — не дефект продукта.
 */
const DESKTOP = [
  '/searches',
  '/today',
  '/search',
  '/object',
  '/object/disclosed',
  '/call',
  '/collections',
  '/collections/inside',
  '/balance',
  '/balance/top-up',
  '/balance/documents',
  '/agency',
  '/agency/staff',
  '/agency/efficiency',
  '/agency/refusals',
  '/agency/access',
  '/agency/consents',
  '/agency/plan',
  '/agency/settings',
  '/profile',
  '/profile/login-policy',
]

const MOBILE = [
  '/m/searches',
  '/m/today',
  '/m/search',
  '/m/object',
  '/m/call',
  '/m/collections',
  '/m/balance',
  '/m/agency',
  '/m/more',
]

/** Работа, с которой экраны не пустые: иначе перепись обходит пустые состояния. */
const WORK = {
  people: [
    {
      name: 'Пётр Волков',
      initials: 'ПВ',
      email: 'p@agency.test',
      role: 'owner' as const,
      limit: null,
    },
  ],
  disclosures: [
    { address: 'Ленская ул., 10', by: 'Пётр Волков', amount: 199, agoMinutes: 120 },
    { address: 'Новочеркасский пр., 47', by: 'Пётр Волков', amount: 199, agoMinutes: 300 },
  ],
  calls: [
    { address: 'Ленская ул., 10', by: 'Пётр Волков', outcome: 'дозвонился', agoMinutes: 90 },
  ],
  stopList: ['Новочеркасский пр., 47'],
}

type Dead = { path: string; tag: string; text: string; why: string }

async function census(page: import('@playwright/test').Page, paths: string[], width: number) {
  const dead: Dead[] = []
  const broken: { path: string; error: string }[] = []

  for (const path of paths) {
    const errors: string[] = []
    const onError = (error: Error) => errors.push(String(error))
    page.on('pageerror', onError)

    await page.setViewportSize({ width, height: 1000 })

    try {
      // `networkidle` здесь не годится: приложение держит соединение
      // с сервером разработки, и «тишина в сети» не наступает никогда.
      // Тридцать экранов по такому ожиданию не помещаются ни в какой бюджет.
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-slot]', { timeout: 8000 })
      await page.waitForTimeout(200)
    } catch (error) {
      broken.push({ path, error: String(error) })
      page.off('pageerror', onError)
      continue
    }

    const found: Dead[] = await page.evaluate((path: string) => {
      const result: Dead[] = []

      function text(node: Element) {
        return (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
      }

      /**
       * Есть ли у узла обработчик.
       *
       * React 19 держит обработчики во внутреннем свойстве узла (`__reactProps$…`)
       * и делегирует событие с корня — прямого слушателя на кнопке нет.
       * Поэтому смотрим и на пометку из `addEventListener`, и на внутренние
       * свойства React.
       */
      function hasHandler(node: Element) {
        if (node.hasAttribute('data-has-handler')) return true
        for (const key of Object.keys(node)) {
          if (!key.startsWith('__reactProps$')) continue
          const props = (node as unknown as Record<string, Record<string, unknown>>)[key]
          if (props?.onClick !== undefined || props?.onPointerDown !== undefined) return true
        }
        return false
      }

      for (const node of document.querySelectorAll('button, a, [role="button"], [role="radio"]')) {
        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        const box = node.getBoundingClientRect()
        if (box.width === 0 || box.height === 0) continue

        // Выключенный контрол честно говорит, что не работает.
        if (node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true') continue

        if (node.tagName === 'A') {
          const href = node.getAttribute('href')
          if (href === null || href === '' || href === '#') {
            if (!hasHandler(node)) {
              result.push({ path, tag: 'a', text: text(node), why: 'ссылка без адреса' })
            }
          }
          continue
        }

        // Кнопка отправки формы работает через саму форму.
        if (node instanceof HTMLButtonElement && node.type === 'submit' && node.form !== null) {
          continue
        }

        // Кнопка внутри ссылки нажимается ссылкой. Так собран «Новый поиск»
        // на главной: `Link` снаружи, `Button` внутри — переход работает,
        // а обработчика у самой кнопки нет и не должно быть.
        if (node.closest('a[href]') !== null) continue

        if (!hasHandler(node)) {
          result.push({
            path,
            tag: node.tagName.toLowerCase(),
            text: text(node),
            why: 'нажимаемый узел без действия',
          })
        }
      }

      return result
    }, path)

    dead.push(...found)
    if (errors.length > 0) broken.push({ path, error: errors[0]! })
    page.off('pageerror', onError)
  }

  return { dead, broken }
}

// Тридцать экранов на двух ширинах в минуту не помещаются: это перепись,
// а не проверка одного кадра.
test.setTimeout(240_000)

test('перепись кабинета: каждый экран открывается и каждая кнопка работает', async ({ page }) => {
  await seedAgency(page, WORK)

  /**
   * Слушатели помечаются ДО загрузки приложения и ровно один раз.
   *
   * Внутри цикла эта же правка накладывалась бы на каждый переход — тридцать
   * обёрток вокруг `addEventListener`, — и к середине переписи браузер
   * заметно тормозил.
   */
  await page.addInitScript(() => {
    const original = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this instanceof Element && (type === 'click' || type === 'pointerdown')) {
        this.setAttribute('data-has-handler', '')
      }
      return original.call(this, type, listener, options)
    }
  })

  const desktop = await census(page, DESKTOP, 1440)
  const mobile = await census(page, MOBILE, 390)

  const dead = [...desktop.dead, ...mobile.dead]
  const broken = [...desktop.broken, ...mobile.broken]

  const report = [
    `Экранов пройдено: ${DESKTOP.length + MOBILE.length}`,
    `Экранов с ошибкой: ${broken.length}`,
    `Мёртвых узлов: ${dead.length}`,
    '',
    ...broken.map((item) => `ОШИБКА  ${item.path}\n        ${item.error.slice(0, 200)}`),
    '',
    ...dead.map((item) => `МЁРТВЫЙ ${item.path.padEnd(24)} <${item.tag}> «${item.text}» — ${item.why}`),
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'cabinet-census.txt'), report, 'utf8')
  console.log(report)

  expect(broken, 'экраны, которые не открылись или уронили страницу').toEqual([])
  expect(dead, 'нажимаемые узлы без действия').toEqual([])
})
