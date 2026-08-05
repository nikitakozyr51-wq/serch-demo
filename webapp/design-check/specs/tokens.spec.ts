import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

import reference from '../reference/tokens.json' with { type: 'json' }
import { seedSession } from '../lib/session'

/**
 * Слой токенов: 56 переменных Pencil-файла против того, что реально живёт
 * в браузере.
 *
 * Сравниваются не строки в `index.css`, а **вычисленные** значения на `<html>`.
 * Это ловит и опечатку в значении, и потерянную переменную, и случай, когда
 * переменная объявлена, но перекрыта другим правилом.
 *
 * Каждой переменной макета соответствует одно из трёх:
 *   — имя в коде, значение обязано совпасть;
 *   — осознанное отсутствие с записанной причиной;
 *   — ничего, и это дефект.
 * Третьего варианта «просто нет» не существует: список причин закрыт.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

/** Переменная макета → CSS-переменная кабинета. */
const DIRECT: Record<string, string> = {
  bg: '--bg',
  surface: '--surface',
  warm: '--warm',
  fg: '--fg',
  'text-2': '--text-2',
  'text-3': '--text-3',
  'text-dense': '--text-dense',
  'line-1': '--line-1',
  'line-2': '--line-2',
  'line-3': '--line-3',
  'border-control': '--border-control',
  accent: '--accent-bright',
  'accent-deep': '--accent-deep',
  'accent-hover': '--accent-hover',
  'fg-hover': '--fg-hover',
  'fg-press': '--fg-press',
  'warm-hover': '--warm-hover',
  'warm-press': '--warm-press',
  'ok-text': '--ok-text',
  'ok-glyph': '--ok-glyph',
  'ok-tint': '--ok-tint',
  'warn-text': '--warn-text',
  'warn-glyph': '--warn-glyph',
  'warn-tint': '--warn-tint',
  'err-text': '--err-text',
  'err-glyph': '--err-glyph',
  'err-tint': '--err-tint',
  'h-xs': '--h-xs',
  'h-sm': '--h-sm',
  'h-md': '--h-md',
  'h-lg': '--h-lg',
  'row-obj': '--row-obj',
  'row-tbl': '--row-tbl',
  'row-head': '--row-head',
  'pad-cell': '--pad-cell',
  'r-6': '--radius-sm',
  'r-8': '--radius-md',
  'r-10': '--radius-lg',
  'r-control': '--radius-xl',
  'r-media': '--radius-2xl',
  'r-card': '--radius-3xl',
}

/**
 * Осознанные отсутствия. Причина обязательна: список читается как решение,
 * а не как список того, до чего не дошли руки.
 */
const INTENTIONALLY_ABSENT: Record<string, string> = {
  'text-on-warm':
    'синоним text-dense с тем же значением, оставлен в макете, чтобы не переписывать проставленные ссылки',
  hairline:
    'наследие лендинга. В кабинете заменён лестницей line-1 / line-2 / line-3: 1.2:1 структурой таблицы быть не может. Живёт в токенах сайта',
  'r-pill':
    'капсула выражается утилитой rounded-full, отдельной переменной радиуса не требует',
  'grid-visible':
    'переключатель направляющих на холсте, к продукту отношения не имеет',
  'font-display':
    'проверяется отдельно: сверяется отрисованное семейство шрифта, а не переменная',
  'space-4': 'шкала отступов выражается базой --spacing: 4px, кратные получаются утилитами',
  'space-8': 'см. space-4',
  'space-12': 'см. space-4',
  'space-16': 'см. space-4',
  'space-24': 'см. space-4',
  'space-32': 'см. space-4',
  'space-48': 'см. space-4',
  'space-64': 'см. space-4',
  'space-96': 'см. space-4',
  'space-140': 'см. space-4',
}

type Mismatch = { token: string; cssVar: string; expected: string; actual: string }

test('токены: значения макета совпадают с вычисленными в браузере', async ({ page }) => {
  await seedSession(page)
  await page.goto('/kitchen-sink')
  await page.evaluate(() => document.fonts.ready)

  const entries = Object.entries(reference as Record<string, unknown>).filter(
    ([name]) => !name.startsWith('_'),
  ) as [string, { type: string; value: string | number | boolean }][]

  const wanted = entries
    .filter(([name]) => name in DIRECT)
    .map(([name, def]) => ({
      token: name,
      cssVar: DIRECT[name]!,
      expected: def.type === 'number' ? `${def.value}px` : String(def.value),
    }))

  const actual: Record<string, string> = await page.evaluate((vars: string[]) => {
    const style = getComputedStyle(document.documentElement)
    const result: Record<string, string> = {}
    for (const name of vars) result[name] = style.getPropertyValue(name).trim()
    return result
  }, wanted.map((item) => item.cssVar))

  const mismatches: Mismatch[] = []
  for (const item of wanted) {
    const got = (actual[item.cssVar] ?? '').toLowerCase()
    const want = item.expected.toLowerCase()
    if (got !== want) {
      mismatches.push({
        token: item.token,
        cssVar: item.cssVar,
        expected: item.expected,
        actual: actual[item.cssVar] || '— переменной нет —',
      })
    }
  }

  // Ни одна переменная макета не должна остаться неучтённой.
  const unaccounted = entries
    .map(([name]) => name)
    .filter((name) => !(name in DIRECT) && !(name in INTENTIONALLY_ABSENT))

  const lines = [
    `Переменных в макете: ${entries.length}`,
    `Сверяется напрямую: ${wanted.length}`,
    `Отсутствует осознанно: ${Object.keys(INTENTIONALLY_ABSENT).length}`,
    `Расхождений: ${mismatches.length}`,
    `Неучтённых: ${unaccounted.length}`,
    '',
    ...mismatches.map(
      (m) => `${m.token.padEnd(18)} ${m.cssVar.padEnd(20)} макет: ${m.expected.padEnd(12)} код: ${m.actual}`,
    ),
    ...unaccounted.map((name) => `НЕУЧТЕНА: ${name} — нет ни в карте соответствий, ни в списке причин`),
  ]
  const report = lines.join('\n')
  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'tokens.txt'), report, 'utf8')
  if (mismatches.length > 0 || unaccounted.length > 0) console.log(report)

  expect(unaccounted, 'переменные макета без соответствия и без причины').toEqual([])
  expect(mismatches, 'значения токенов разошлись с макетом').toEqual([])
})

test('шрифт: отрисовывается Inter Tight, а не запасной системный', async ({ page }) => {
  await seedSession(page)
  await page.goto('/kitchen-sink')
  // Дождаться подписи, а не идти сразу: замер шёл раньше отрисовки и молча
  // подменял объект на `body`. Подмена и прятала эту гонку.
  await page.waitForSelector('[data-slot="button"] [data-slot="typography"]')
  await page.evaluate(() => document.fonts.ready)

  /**
   * Имя семейства берётся из эталона, а не зашивается в проверку: иначе смена
   * шрифта в макете не уронит ни один слой. Объект замера — подпись кнопки,
   * и её пропажа обязана валить проверку, а не молча подменяться на `body`:
   * у `body` семейство своё, и проверка прошла бы на пустой странице.
   */
  const wantedFamily = String(
    (reference as Record<string, { value?: unknown }>)['font-display']?.value ?? '',
  )
  expect(wantedFamily, 'в эталоне нет имени шрифта font-display').not.toBe('')

  const font = await page.evaluate(async () => {
    const button = document.querySelector('[data-slot="button"] [data-slot="typography"]')
    if (!button) throw new Error('подпись кнопки не найдена — мерить нечего')
    const style = getComputedStyle(button)

    // Дождаться именно тех начертаний, которыми набрана проверяемая строка.
    // `document.fonts.ready` этого не гарантирует: он закрывается по шрифтам,
    // которые понадобились странице, а измерительная строка добавляется позже.
    const probeText = 'Раскрыть контакт · 199 ₽'
    await document.fonts.load(`600 16px "Inter Tight Variable"`, probeText)

    // Загруженные начертания. `document.fonts.check()` здесь не годится: по
    // умолчанию он спрашивает про пробел, а тот может лежать в наборе символов,
    // который странице не понадобился и потому не загружен.
    const loadedFaces = [...document.fonts]
      .filter((face) => face.family.includes('Inter Tight') && face.status === 'loaded')
      .map((face) => `${face.family} ${face.weight}`)

    // Доказательство, что шрифт не просто загружен, а действительно применён:
    // та же строка теми же размерами в продуктовом шрифте и в заведомо другом
    // обязана дать разную ширину.
    function widthWith(family: string) {
      const probe = document.createElement('span')
      probe.textContent = probeText
      probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-size:16px;font-weight:600;font-family:${family}`
      document.body.append(probe)
      const width = probe.getBoundingClientRect().width
      probe.remove()
      return width
    }

    return {
      family: style.fontFamily,
      loadedFaces,
      allFaces: [...document.fonts].map((face) => `${face.family} · ${face.weight} · ${face.status}`),
      faceCount: document.fonts.size,
      productWidth: widthWith('"Inter Tight Variable", monospace'),
      fallbackWidth: widthWith('monospace'),
    }
  })

  await mkdir(artifactsDir, { recursive: true })
  await writeFile(
    resolve(artifactsDir, 'font.txt'),
    [
      `Семейство в подписи кнопки: ${font.family}`,
      `Начертаний в документе: ${font.faceCount}`,
      `Загружено Inter Tight: ${font.loadedFaces.length}`,
      `Ширина строки в Inter Tight: ${font.productWidth}`,
      `Ширина той же строки моноширинным: ${font.fallbackWidth}`,
      '',
      'Все начертания документа:',
      ...font.allFaces.map((line) => `  ${line}`),
    ].join('\n'),
    'utf8',
  )

  expect(font.family.toLowerCase(), 'семейство шрифта в подписи кнопки').toContain(
    wantedFamily.toLowerCase(),
  )
  expect(
    font.loadedFaces.length,
    'ни одно начертание Inter Tight не загружено — текст рисуется запасным шрифтом',
  ).toBeGreaterThan(0)
  expect(
    Math.abs(font.productWidth - font.fallbackWidth),
    `ширина строки в Inter Tight (${font.productWidth}) не отличается от запасного шрифта (${font.fallbackWidth}) — значит шрифт не применён`,
  ).toBeGreaterThan(1)
})
