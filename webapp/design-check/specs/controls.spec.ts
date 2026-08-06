import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

import reference from '../reference/controls.json' with { type: 'json' }
import { seedSession } from '../lib/session'

/**
 * Покомпонентная сверка с эталоном доски `СИСТЕМА · Состояния контролов`.
 *
 * Самый строгий слой: сравнивает не «лежит ли значение на лестнице», а
 * «совпадает ли оно с тем, что стоит в макете» — для каждого из пяти контролов
 * в каждом из пяти состояний.
 *
 * Эталон снят из Pencil с разрешёнными переменными, поэтому цвета в нём
 * настоящие. Живые значения читаются из браузера как вычисленные стили.
 * Между ними нет человека, который мог бы «примерно сверить».
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const artifactsDir = resolve(currentDir, '../.artifacts')

type Expected = {
  height?: number
  width?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  /**
   * Поле ввода: рамки по кругу у него нет, есть линия снизу.
   *
   * Отдельные ключи, а не `stroke`, потому что это другая величина: у рамки
   * четыре стороны и радиус, у линии — одна сторона и ничего больше. Свести
   * их в одно поле значило бы позволить коробке вернуться незаметно.
   */
  strokeBottom?: number
  strokeColor?: string
  radius?: number
  padding?: [number, number]
  ring?: { color: string; width: number; gap?: string }
  text?: { color: string; size: number; weight: string; ls: number; lh: number }
}

type Diff = { key: string; property: string; expected: string; actual: string }

/** `#1e1e1e` → `rgb(30, 30, 30)`: браузер отдаёт цвета только так. */
function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

test('контролы: каждое состояние совпадает с эталоном доски', async ({ page }) => {
  await seedSession(page)
  await page.goto('/kitchen-sink')
  await page.waitForSelector('[data-check]')
  await page.evaluate(() => document.fonts.ready)

  const keys = Object.keys(reference as Record<string, unknown>).filter((key) => !key.startsWith('_'))

  const measured: Record<string, Record<string, string>> = await page.evaluate((keys: string[]) => {
    const result: Record<string, Record<string, string>> = {}

    for (const key of keys) {
      const cell = document.querySelector(`[data-check="${key}"]`)
      if (!cell) {
        result[key] = { missing: 'ячейка не найдена' }
        continue
      }
      // Внутри ячейки ищем сам контрол: кнопку, чип, чекбокс или поле ввода.
      const control = cell.querySelector(
        '[data-slot="photo-placeholder"], [data-slot="listing-row"], [data-slot="button"], [data-slot="filter-chip"], [data-slot="checkbox"], input',
      )
      if (!control) {
        result[key] = { missing: 'контрол внутри ячейки не найден' }
        continue
      }

      const style = getComputedStyle(control)
      const box = control.getBoundingClientRect()
      // Подпись у кнопки и чипа лежит в отдельном узле, у поля — это сам input.
      const label = control.querySelector('[data-slot="typography"]') ?? control
      const labelStyle = getComputedStyle(label)

      result[key] = {
        height: String(Math.round(box.height * 100) / 100),
        width: String(Math.round(box.width * 100) / 100),
        backgroundColor: style.backgroundColor,
        borderColor: style.borderTopColor,
        borderWidth: style.borderTopWidth,
        borderRadius: style.borderTopLeftRadius,
        paddingTop: style.paddingTop,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        borderBottomWidth: style.borderBottomWidth,
        borderBottomColor: style.borderBottomColor,
        borderLeftWidth: style.borderLeftWidth,
        borderRightWidth: style.borderRightWidth,
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
        color: labelStyle.color,
        fontSize: labelStyle.fontSize,
        fontWeight: labelStyle.fontWeight,
        letterSpacing: labelStyle.letterSpacing,
        lineHeight: labelStyle.lineHeight,
      }
    }

    return result
  }, keys)

  const diffs: Diff[] = []
  const near = (a: number, b: number, tolerance = 0.5) => Math.abs(a - b) <= tolerance

  for (const key of keys) {
    const want = (reference as Record<string, Expected>)[key]!
    const got = measured[key]!
    if (got.missing) {
      diffs.push({ key, property: 'ячейка', expected: 'существует', actual: got.missing })
      continue
    }

    if (want.height !== undefined && !near(Number(got.height), want.height)) {
      diffs.push({ key, property: 'высота', expected: `${want.height}px`, actual: `${got.height}px` })
    }
    if (want.width !== undefined && !near(Number(got.width), want.width)) {
      diffs.push({ key, property: 'ширина', expected: `${want.width}px`, actual: `${got.width}px` })
    }
    if (want.fill && got.backgroundColor !== hexToRgb(want.fill)) {
      diffs.push({ key, property: 'заливка', expected: `${want.fill} = ${hexToRgb(want.fill)}`, actual: got.backgroundColor! })
    }
    if (want.stroke) {
      /**
       * Кольцо вокруг контрола браузер умеет рисовать двумя способами —
       * рамкой и обводкой, — и выглядят они одинаково. В макете кольцо всегда
       * обводка узла, потому что другого инструмента у Pencil нет; в коде
       * фокус намеренно сделан обводкой, чтобы не съедать высоту контрола
       * и не сдвигать соседей.
       *
       * Поэтому сверяется НАЛИЧИЕ кольца нужного цвета и толщины, а не то,
       * каким свойством оно нарисовано. Требовать именно рамку значило бы
       * проверять способ, а не результат — и заставлять контрол прыгать
       * на два пикселя при получении фокуса.
       */
      const wantColor = hexToRgb(want.stroke)
      const byBorder =
        got.borderColor === wantColor &&
        (want.strokeWidth === undefined || near(Number.parseFloat(got.borderWidth!), want.strokeWidth))
      const byOutline =
        got.outlineStyle !== 'none' &&
        got.outlineColor === wantColor &&
        (want.strokeWidth === undefined || near(Number.parseFloat(got.outlineWidth!), want.strokeWidth))
      // Зазор двойного кольца рисуется тенью — это тот же способ показать
      // ту же линию, и он законен по той же причине.
      const byShadow = got.boxShadow !== 'none' && got.boxShadow!.includes(wantColor)

      if (!byBorder && !byOutline && !byShadow) {
        diffs.push({
          key,
          property: 'кольцо контрола',
          expected: `${want.strokeWidth ?? 1}px ${want.stroke} = ${wantColor}`,
          actual: `рамка ${got.borderWidth} ${got.borderColor} · обводка ${got.outlineWidth} ${got.outlineColor}`,
        })
      }
    }
    if (want.strokeBottom !== undefined) {
      // Линия снизу — и ничего сверху и по бокам: коробки у поля больше нет.
      if (!near(Number.parseFloat(got.borderBottomWidth!), want.strokeBottom)) {
        diffs.push({
          key,
          property: 'линия снизу',
          expected: `${want.strokeBottom}px`,
          actual: got.borderBottomWidth!,
        })
      }
      for (const [side, value] of [
        ['сверху', got.borderWidth],
        ['слева', got.borderLeftWidth],
        ['справа', got.borderRightWidth],
      ] as const) {
        if (Number.parseFloat(value!) > 0.5) {
          diffs.push({ key, property: `лишняя рамка ${side}`, expected: '0px', actual: value! })
        }
      }
      if (want.strokeColor && got.borderBottomColor !== hexToRgb(want.strokeColor)) {
        diffs.push({
          key,
          property: 'цвет линии',
          expected: `${want.strokeColor} = ${hexToRgb(want.strokeColor)}`,
          actual: got.borderBottomColor!,
        })
      }
      // У поля без коробки радиуса быть не может: скруглять нечего.
      if (Number.parseFloat(got.borderRadius!) > 0.5) {
        diffs.push({ key, property: 'у поля остался радиус', expected: '0px', actual: got.borderRadius! })
      }
    }

    if (want.radius !== undefined) {
      const actualRadius = Number.parseFloat(got.borderRadius!)
      // Капсула: браузер отдаёт фактический радиус, а не 999.
      const isPill = want.radius >= 999
      const ok = isPill
        ? actualRadius >= Number(got.height) / 2 - 0.5
        : near(actualRadius, want.radius)
      if (!ok) {
        diffs.push({
          key,
          property: 'радиус',
          expected: isPill ? 'капсула' : `${want.radius}px`,
          actual: `${actualRadius}px`,
        })
      }
    }
    if (want.padding) {
      // Пара [вертикаль, горизонталь] сверяется целиком. Первая версия
      // деструктурировала вертикаль в пустоту, и вертикальные поля
      // не проверялись ни у одного контрола ни разу.
      const [vertical, horizontal] = want.padding
      if (!near(Number.parseFloat(got.paddingTop!), vertical)) {
        diffs.push({ key, property: 'поле сверху', expected: `${vertical}px`, actual: got.paddingTop! })
      }
      if (!near(Number.parseFloat(got.paddingBottom!), vertical)) {
        diffs.push({ key, property: 'поле снизу', expected: `${vertical}px`, actual: got.paddingBottom! })
      }
      if (!near(Number.parseFloat(got.paddingLeft!), horizontal)) {
        diffs.push({ key, property: 'поле слева', expected: `${horizontal}px`, actual: got.paddingLeft! })
      }
      if (!near(Number.parseFloat(got.paddingRight!), horizontal)) {
        diffs.push({ key, property: 'поле справа', expected: `${horizontal}px`, actual: got.paddingRight! })
      }
    }
    if (want.ring) {
      if (got.outlineStyle === 'none' || Number.parseFloat(got.outlineWidth!) === 0) {
        diffs.push({ key, property: 'кольцо фокуса', expected: `${want.ring.width}px ${want.ring.color}`, actual: 'кольца нет' })
      } else {
        if (got.outlineColor !== hexToRgb(want.ring.color)) {
          diffs.push({ key, property: 'цвет кольца', expected: hexToRgb(want.ring.color), actual: got.outlineColor! })
        }
        if (!near(Number.parseFloat(got.outlineWidth!), want.ring.width)) {
          diffs.push({ key, property: 'толщина кольца', expected: `${want.ring.width}px`, actual: got.outlineWidth! })
        }
      }
      // Двойное кольцо: зазор задан заливкой, а не прозрачностью.
      if (want.ring.gap && !got.boxShadow!.includes(hexToRgb(want.ring.gap))) {
        diffs.push({ key, property: 'зазор кольца', expected: hexToRgb(want.ring.gap), actual: got.boxShadow! })
      }
    }
    if (want.text) {
      if (got.color !== hexToRgb(want.text.color)) {
        diffs.push({ key, property: 'цвет подписи', expected: `${want.text.color} = ${hexToRgb(want.text.color)}`, actual: got.color! })
      }
      if (!near(Number.parseFloat(got.fontSize!), want.text.size)) {
        diffs.push({ key, property: 'кегль', expected: `${want.text.size}px`, actual: got.fontSize! })
      }
      if (got.fontWeight !== want.text.weight) {
        diffs.push({ key, property: 'насыщенность', expected: want.text.weight, actual: got.fontWeight! })
      }
      if (!near(Number.parseFloat(got.letterSpacing!), want.text.ls, 0.02)) {
        diffs.push({ key, property: 'трекинг', expected: `${want.text.ls}px`, actual: got.letterSpacing! })
      }
      if (!near(Number.parseFloat(got.lineHeight!), want.text.lh)) {
        diffs.push({ key, property: 'интерлиньяж', expected: `${want.text.lh}px`, actual: got.lineHeight! })
      }
    }
  }

  /**
   * Обратная сторона сверки.
   *
   * Список сверяемого задавал эталон, поэтому ячейка полигона без записи
   * в эталоне не сверялась ни с чем — и об этом никто не узнавал. Так пять
   * ячеек молча выпали из проверки. Теперь непокрытая ячейка называется
   * поимённо: либо у неё появляется эталон, либо она перечисляется здесь
   * как составная — у панели фильтров или шапки выдачи одного контрола нет,
   * их геометрию держат отдельные слои.
   */
  const COMPOSITE = new Set([
    'filter-panel|rest',
    'results-header|rest',
    'results-header|spacious',
    'result-tabs|rest',
    'empty-first|rest',
    'empty-narrow|rest',
  ])

  const onPage: string[] = await page.evaluate(() =>
    [...document.querySelectorAll('[data-check]')].map(
      (cell) => cell.getAttribute('data-check') ?? '',
    ),
  )

  const known = new Set(keys)
  const uncovered = [...new Set(onPage)].filter(
    (key) => key && !known.has(key) && !COMPOSITE.has(key),
  )

  const lines = [
    `Сверено состояний: ${keys.length}`,
    `Расхождений с макетом: ${diffs.length}`,
    `Ячеек полигона без эталона: ${uncovered.length}`,
    '',
    ...diffs.map((d) => `${d.key.padEnd(24)} ${d.property.padEnd(18)} макет: ${d.expected.padEnd(26)} код: ${d.actual}`),
    ...uncovered.map((key) => `БЕЗ ЭТАЛОНА: ${key}`),
  ]
  const report = lines.join('\n')
  await mkdir(artifactsDir, { recursive: true })
  await writeFile(resolve(artifactsDir, 'controls.txt'), report, 'utf8')
  if (diffs.length > 0 || uncovered.length > 0) console.log(report)

  expect(diffs, 'контролы разошлись с эталоном доски').toEqual([])
  expect(uncovered, 'ячейки полигона, которые не сверяются ни с чем').toEqual([])
})
