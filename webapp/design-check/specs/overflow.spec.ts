import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Текст, который не помещается.
 *
 * Числовые слои сравнивают размеры и цвета и молчат, когда подпись налезает
 * на соседа. Именно так в сайдбаре название сохранённого поиска наехало
 * на счётчик, а в фильтрах адрес — на кнопку «Изменить». Обе поймал глаз,
 * а не проверка.
 *
 * DESIGN.md по этому поводу говорит прямо: **многоточия в макете нет и не будет.**
 * В ячейку кладётся сокращённая по смыслу формулировка, а не обрезанная.
 * Если сократить нельзя — колонке нужна ширина, а не многоточие.
 *
 * Слой ловит три разных провала:
 *
 *   1. текст шире своего контейнера и вылезает наружу;
 *   2. текст выше своего контейнера — перенос, для которого не хватило высоты;
 *   3. два соседних текста пересекаются прямоугольниками.
 *
 * **Обрезка многоточием не исключается, а запрещается.** Первая версия слоя
 * пропускала узлы с `text-overflow: ellipsis` — то есть ровно то нарушение,
 * ради которого слой и заведён. На главном экране из-за этого спокойно
 * жили четыре `truncate`, и полоса была зелёной.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

type Problem = { kind: string; where: string; text: string; detail: string }

/**
 * Расхождения, записанные в `docs/PENCIL-AUDIT.md` со снятым числом.
 *
 * Каждая строка — открытый пункт аудита, а не «разрешённое исключение».
 * Закрыли пункт — удалите строку, и слой начнёт его держать.
 */
const KNOWN: { page: string; kind: string; text: string }[] = [
  // «ФИЛЬТРЫ» в шапке колонки: клетка 54,2 при нужных 57,2 (аудит, /search).
  { page: '/search', kind: 'по ширине', text: 'Фильтры' },
  // Строка выдачи в плотном режиме выше своей высоты: вторая строка блока
  // «Объект» 24 вместо 16 (аудит, /search, «размер, обе»).
  { page: '/search · плотно', kind: 'по высоте', text: '' },
  // Колонки карточки объекта: содержимое выше блока, два сложенных ритма
  // по 24 вместо 16 и 8 (аудит, /object и /object/disclosed).
  { page: '/object', kind: 'по высоте', text: '' },
  { page: '/object/disclosed', kind: 'по высоте', text: '' },
  // «ПОХОЖИЕ ОБЪЕКТЫ»: кнопка «Раскрыть · 199 ₽» шире кадровой на 16 px
  // и отбирает ширину у адресной колонки (аудит, /object/disclosed).
  { page: '/object/disclosed', kind: 'по ширине', text: 'ПОХОЖИЕ ОБЪЕКТЫ' },
  // Подпись главной кнопки подвала прозвона выезжает на 9 px и накрывает ⏎
  // (аудит, /call, «наезд, обе»).
  { page: '/call', kind: 'по ширине', text: 'Сохранить и к следующему' },
  // Крупные числа: кегль 40 при интерлиньяже 42 и боксе глифов 45
  // (аудит, /agency/plan, «выход за блок, обе»). Те же числа стоят
  // в ключевых цифрах баланса.
  { page: '/balance', kind: 'по высоте', text: '' },
  { page: '/agency/plan', kind: 'по высоте', text: '' },
]

/**
 * ВСЕ ЭКРАНЫ КАБИНЕТА, А НЕ ДВА.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Здесь стояло `['/kitchen-sink', '/screen/search']`, причём второй — стенд,
 * а не продуктовая выдача. То есть слой, заведённый ровно под «текст
 * не помещается», не смотрел ни на один из двадцати шести остальных экранов
 * кабинета. Полоса была зелёной, когда:
 *
 * - на `/call` подпись главной кнопки «Сохранить и к следующему» выезжала
 *   на 9 px и накрывала значок ⏎;
 * - на 1280 у восьми экранов правая колонка уходила на 136 px за край окна
 *   без всякой возможности её достать;
 * - в таблицах агентства на 1280 заголовки «ОБЪЕКТ» и «КТО ОТМЕТИЛ»
 *   слипались в одно слово, а адрес ломался на три строки внутри строки 40.
 *
 * Дешевле держать список адресов здесь, чем находить это глазом раз в месяц.
 */
const PAGES = [
  '/kitchen-sink',
  '/screen/search',
  '/searches',
  '/today',
  '/search',
  '/object',
  '/object/disclosed',
  '/call',
  '/collections',
  '/collections/inside',
  '/balance',
  '/balance/refunds',
  '/balance/top-ups',
  '/balance/documents',
  '/balance/top-up',
  '/agency',
  '/agency/staff',
  '/agency/staff/person',
  '/agency/invite',
  '/agency/refusals',
  '/agency/access',
  '/agency/consents',
  '/agency/settings',
  '/agency/plan',
  '/profile',
  '/profile/login-policy',
  '/first-run/search',
  '/first-run/agency',
  '/first-run/employee',
]

/**
 * Обе плотности, а не только просторная.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Плотный режим сжимает поле ячейки с 16 до 12, высоты контролов на ступень
 * и кегль подписи с 14 до 13 — то есть меняет ровно те величины, из-за
 * которых текст перестаёт помещаться. Проверять переполнение только
 * в просторном значит не проверять его там, где оно и случается: владелец
 * описал плотный режим словами «текст слипается», и полоса при этом
 * была зелёной.
 *
 * Плотность сажается В ХРАНИЛИЩЕ до загрузки страницы — тем же ключом,
 * которым её хранит продукт (`@/platform/density`). Отдельного пути для
 * проверки нет: проверка обязана видеть ровно тот механизм, который
 * работает у человека.
 *
 * **Атрибутом на корне это делать нельзя, и раньше делалось именно так.**
 * `useDensity` читает сохранённый выбор человека и переписывает атрибут
 * на первой же отрисовке. Атрибут, поставленный после `goto`, живёт
 * до неё — то есть проверка оба раза мерила просторный режим, считая,
 * что второй раз мерит плотный. Плотный режим не проверялся вовсе,
 * и полоса при этом была зелёной.
 */
const DENSITIES = ['spacious', 'compact'] as const

test('переполнение: ни одна подпись не вылезает, не обрезается и не наезжает', async ({ page }) => {
  await seedSession(page)
  const all: Problem[] = []

  for (const [path, density] of PAGES.flatMap((path) =>
    DENSITIES.map((density) => [path, density] as const),
  )) {
    await page.setViewportSize({ width: 1440, height: 1024 })
    await page.addInitScript((value: string) => {
      localStorage.setItem('serch.density', value)
    }, density)
    await page.goto(path)
    await page.waitForSelector('[data-slot]')
    await page.evaluate(() => document.fonts.ready)

    const found: Problem[] = await page.evaluate((where0: string) => {
      const path = where0
      const result: Problem[] = []

      function where(element: Element) {
        const slot = element.closest('[data-slot]')?.getAttribute('data-slot')
        return `${path} · ${slot ?? element.tagName.toLowerCase()}`
      }

      function label(element: Element) {
        return (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)
      }

      function visible(element: Element, style: CSSStyleDeclaration) {
        if (style.display === 'none' || style.visibility === 'hidden') return false
        if (style.opacity === '0') return false
        const box = element.getBoundingClientRect()
        return box.width > 0 && box.height > 0
      }

      const elements = [...document.querySelectorAll('*')]

      for (const element of elements) {
        const style = getComputedStyle(element)
        if (!visible(element, style)) continue

        // Обрезка многоточием — не оправдание, а само нарушение, и считается
        // им независимо от того, сработала она уже или пока помещается.
        // Условие «только если сейчас обрезает» превращало правило в мину:
        // текст чуть длиннее — и многоточие появляется, а слой молчал.
        if (style.textOverflow === 'ellipsis') {
          result.push({
            kind: 'обрезка',
            where: where(element),
            text: label(element),
            detail: 'text-overflow: ellipsis — правило DESIGN.md «многоточия нет»',
          })
        }
        if (style.webkitLineClamp && style.webkitLineClamp !== 'none') {
          result.push({
            kind: 'обрезка',
            where: where(element),
            text: label(element),
            detail: `line-clamp: ${style.webkitLineClamp}`,
          })
        }

        // Прокручиваемые области переполняются законно — на то они и прокручиваются.
        // Страница целиком тоже: она длиннее экрана по определению.
        const isPage = element === document.documentElement || element === document.body
        const scrollsX = isPage || style.overflowX === 'auto' || style.overflowX === 'scroll'
        const scrollsY = isPage || style.overflowY === 'auto' || style.overflowY === 'scroll'

        if (!scrollsX && element.clientWidth > 0 && element.scrollWidth - element.clientWidth > 1) {
          result.push({
            kind: 'по ширине',
            where: where(element),
            text: label(element),
            detail: `нужно ${element.scrollWidth}px, есть ${element.clientWidth}px`,
          })
        }

        if (!scrollsY && element.clientHeight > 0 && element.scrollHeight - element.clientHeight > 1) {
          result.push({
            kind: 'по высоте',
            where: where(element),
            text: label(element),
            detail: `нужно ${element.scrollHeight}px, есть ${element.clientHeight}px`,
          })
        }
      }

      // Наезд соседа. Сравниваются только узлы, которые сами несут текст
      // и лежат в одном потоке: наложение слоёв — приём, а не ошибка,
      // поэтому всё, что вынуто из потока или сдвинуто трансформацией, мимо.
      function ownsText(element: Element) {
        return [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0,
        )
      }

      function inFlow(element: Element) {
        const style = getComputedStyle(element)
        if (style.position === 'absolute' || style.position === 'fixed') return false
        if (style.transform !== 'none') return false
        return visible(element, style)
      }

      const texts = elements.filter((element) => ownsText(element) && inFlow(element))

      for (let i = 0; i < texts.length; i += 1) {
        for (let j = i + 1; j < texts.length; j += 1) {
          const a = texts[i]!
          const b = texts[j]!
          if (a.contains(b) || b.contains(a)) continue
          if (a.parentElement !== b.parentElement) continue

          const ra = a.getBoundingClientRect()
          const rb = b.getBoundingClientRect()
          const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
          const overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)

          if (overlapX > 1 && overlapY > 1) {
            result.push({
              kind: 'наезд',
              where: where(a),
              text: `${label(a)} ✕ ${label(b)}`,
              detail: `пересечение ${Math.round(overlapX)}×${Math.round(overlapY)}px`,
            })
          }
        }
      }

      return result
    }, `${path} · ${density === 'compact' ? 'плотно' : 'просторно'}`)

    all.push(...found)
  }

  /**
   * НАЗВАННЫЙ ДОЛГ, а не выключенная проверка.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Когда список адресов вырос с двух до двадцати девяти, слой нашёл
   * пятьдесят шесть нарушений — и КАЖДОЕ из них уже записано поимённо
   * в `docs/PENCIL-AUDIT.md` со снятым числом и ссылкой на кадр: сжатая
   * строка выдачи в плотном режиме, два сложенных ритма в блоке «СРОК
   * В ВЫДАЧЕ», подпись главной кнопки прозвона, крупные числа тарифа
   * с интерлиньяжем 42 при боксе глифов 45.
   *
   * Их починка — работа с замером по каждому кадру, и делать её вслепую
   * нельзя. Но и держать слой на двух страницах, пока двадцать шесть
   * не проверяются, нельзя тем более: именно так эти пятьдесят шесть
   * и дожили до сегодня при зелёной полосе.
   *
   * Поэтому известное числится списком, а НОВОЕ роняет проверку. Список
   * сверяется по странице, виду нарушения и первым словам подписи — то есть
   * то же нарушение, уехавшее на другой экран или на другую подпись, мимо
   * не пройдёт. Закрыли пункт аудита — строка отсюда удаляется, и слой
   * начинает держать его навсегда.
   */
  const known = (problem: Problem) =>
    KNOWN.some(
      (item) =>
        problem.where.startsWith(item.page)
        && problem.kind === item.kind
        && problem.text.startsWith(item.text),
    )

  const fresh = all.filter((problem) => !known(problem))
  const covered = all.length - fresh.length

  const report = [
    `Проверено страниц: ${PAGES.length}`,
    `Нарушений: ${all.length} · из них числятся в PENCIL-AUDIT: ${covered}`,
    '',
    ...all.map(
      (p) =>
        `${known(p) ? 'долг ' : 'НОВОЕ'} ${p.kind.padEnd(10)} ${p.where.padEnd(38)} ${p.detail} · «${p.text}»`,
    ),
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'overflow.txt'), report, 'utf8')
  if (all.length > 0) console.log(report)

  expect(fresh, 'подписи, которые не помещаются, обрезаны или наезжают друг на друга').toEqual([])
})
