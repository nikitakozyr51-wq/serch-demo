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

const PAGES = ['/kitchen-sink', '/screen/search']

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
 * Плотность ставится атрибутом на корень документа — тем же, что ставит
 * продукт (`@/platform/density`). Отдельного пути для проверки нет: проверка
 * обязана видеть ровно тот механизм, который работает у человека.
 */
const DENSITIES = ['spacious', 'compact'] as const

test('переполнение: ни одна подпись не вылезает, не обрезается и не наезжает', async ({ page }) => {
  await seedSession(page)
  const all: Problem[] = []

  for (const [path, density] of PAGES.flatMap((path) =>
    DENSITIES.map((density) => [path, density] as const),
  )) {
    await page.setViewportSize({ width: 1440, height: 1024 })
    await page.goto(path)
    await page.waitForSelector('[data-slot]')
    await page.evaluate((density: string) => {
      if (density === 'compact') document.documentElement.dataset.density = 'compact'
      else delete document.documentElement.dataset.density
    }, density)
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

  const report = [
    `Проверено страниц: ${PAGES.length}`,
    `Нарушений: ${all.length}`,
    '',
    ...all.map((p) => `${p.kind.padEnd(10)} ${p.where.padEnd(38)} ${p.detail} · «${p.text}»`),
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'overflow.txt'), report, 'utf8')
  if (all.length > 0) console.log(report)

  expect(all, 'подписи, которые не помещаются, обрезаны или наезжают друг на друга').toEqual([])
})
