import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

import reference from '../reference/board-texts.json' with { type: 'json' }
import controlsReference from '../reference/controls.json' with { type: 'json' }
import { seedSession } from '../lib/session'

/**
 * Надписи доски против надписей на странице.
 *
 * Числовые слои сравнивают размеры и цвета — и молчат, когда надписи нет
 * вовсе. Именно так пропала подпись первой колонки «КОНТРОЛ»: все размеры
 * сходились, а заголовка не было. Владелец увидел расхождение раньше проверок.
 *
 * Здесь сравнивается **набор надписей**: каждая надпись доски обязана найтись
 * на странице. Повторы не считаются — доска повторяет «Раскрыть» пять раз
 * по числу состояний, и это не пять разных требований, а одно.
 *
 * Две поправки после разбора:
 *
 * **Считается только видимое.** Первая версия обходила все узлы подряд,
 * поэтому надпись из `display: none` засчитывалась наравне с нарисованной,
 * и спрятанная доска прошла бы проверку целиком.
 *
 * **Ищется и лишнее.** Эталон обещает ловить «пропущенные и лишние подписи»,
 * а искалось только направление «эталон → страница». Лишняя надпись — это
 * выдуманный текст, а выдумывать запрещено ровно так же, как терять.
 * Полигон при этом несёт свою обвязку — заголовки разделов и пояснения,
 * которых на доске нет по определению, — поэтому она перечислена явно.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

/** Пунктуация в макете и в коде может отличаться пробелами и кавычками. */
function normalise(value: string) {
  return value
    .replaceAll(' ', ' ')
    .replaceAll(' ', ' ')
    .replaceAll('«', '"')
    .replaceAll('»', '"')
    .replaceAll('„', '"')
    .replaceAll('“', '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

test('надписи: каждая надпись доски есть на странице', async ({ page }) => {
  await seedSession(page)
  await page.goto('/kitchen-sink')
  await page.waitForSelector('[data-check]')
  await page.evaluate(() => document.fonts.ready)

  /**
   * Собираются отдельные надписи, а не сплошной текст страницы.
   *
   * Первая версия склеивала всё в одну строку и искала подстроку — и «КОНТРОЛ»
   * прошёл ложно, потому что нашёлся внутри слова «контролов». Значения полей
   * ввода при этом не попадали в текст вовсе, и «недоступно» числилось пропавшим,
   * хотя стояло на экране.
   */
  const onPage: string[] = await page.evaluate(() => {
    const found: string[] = []
    for (const node of document.querySelectorAll('*')) {
      const style = getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') continue
      const box = node.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue

      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = (child.textContent ?? '').trim()
          if (text) found.push(text)
        }
      }
      if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
        if (node.value) found.push(node.value)
        if (node.placeholder) found.push(node.placeholder)
      }
    }
    return found
  })

  const present = new Set(onPage.map(normalise))
  const wanted = (reference as Record<string, string[]>).nXleb!

  const missing = wanted.filter((text) => !present.has(normalise(text)))

  /**
   * Лишнее ищется только внутри ячеек доски.
   *
   * Ячейка одного из пяти контролов доски `nXleb` — Primary 48, Вторичная 32,
   * Инпут 40, Чип фильтра 28, Чекбокс 24 — это дословная копия клетки доски,
   * и посторонней надписи в ней быть не может.
   *
   * Строка выдачи и заглушки кадра сюда не входят: они с других компонентов,
   * и их надписи в эталоне этой доски отсутствуют по определению. Обвязка
   * полигона — заголовки разделов и пояснения — живёт снаружи ячеек.
   */
  const BOARD_FAMILIES = ['primary-48', 'secondary-32', 'input-40', 'chip-28', 'checkbox-24']
  const cellKeys = Object.keys(controlsReference).filter((key) =>
    BOARD_FAMILIES.includes(key.split('|')[0] ?? ''),
  )
  const extra: string[] = await page.evaluate((keys: string[]) => {
    const found: string[] = []
    for (const key of keys) {
      const cell = document.querySelector(`[data-check="${key}"]`)
      if (!cell) continue
      for (const node of cell.querySelectorAll('*')) {
        const style = getComputedStyle(node)
        if (style.display === 'none' || style.visibility === 'hidden') continue
        for (const child of node.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = (child.textContent ?? '').trim()
            if (text) found.push(`${key} :: ${text}`)
          }
        }
        if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
          if (node.value) found.push(`${key} :: ${node.value}`)
          if (node.placeholder) found.push(`${key} :: ${node.placeholder}`)
        }
      }
    }
    return found
  }, cellKeys)

  const board = new Set(wanted.map(normalise))
  const invented = [...new Set(extra)].filter((entry) => {
    const text = entry.slice(entry.indexOf(' :: ') + 4)
    return !board.has(normalise(text))
  })

  const report = [
    `Надписей на доске: ${wanted.length}`,
    `Не найдено на странице: ${missing.length}`,
    `Лишних внутри ячеек доски: ${invented.length}`,
    '',
    ...missing.map((text) => `НЕТ:    «${text}»`),
    ...invented.map((entry) => `ЛИШНЯЯ: ${entry}`),
  ].join('\n')

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'texts.txt'), report, 'utf8')
  if (missing.length > 0 || invented.length > 0) console.log(report)

  expect(missing, 'надписи доски, которых нет на странице').toEqual([])
  expect(invented, 'надписи в ячейках доски, которых на доске нет').toEqual([])
})
