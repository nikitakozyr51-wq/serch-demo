/**
 * Охват кадров: какие из нарисованных экранов собраны, а какие нет.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАЧЕМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Требование владельца: «все экраны из Pencil должны быть использованы».
 * До этой проверки ответ на «сколько собрано» был ощущением. Ощущение
 * не спорит, а число спорит: пока оно не ноль, работа не кончена.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * КАК СЧИТАЕТСЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Кадр считается собранным, если его идентификатор упоминается в коде.
 * Это не строгое доказательство — упомянуть можно и в комментарии «этот
 * кадр отложен», — но у нас в проекте комментарий с id стоит ровно там,
 * где кадр собран: «Снято с `ghwPj`». Правило проекта, а не догадка.
 *
 * **Слабое место названо честно:** проверка отвечает на вопрос «знает ли
 * код про этот кадр», а не «совпадает ли экран с кадром». На второй
 * вопрос отвечает сверка геометрии — она сравнивает числа. Здесь только
 * охват.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО НЕ СЧИТАЕТСЯ ЭКРАНОМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `C …`      — компоненты: они живут внутри экранов, отдельного адреса нет.
 * `ПОЛОСА …` — подписи разделов холста, а не дизайн.
 * `СИСТЕМА …`— доски решений: лестницы, состояния контролов, пустые списки.
 *              Это спецификация, по которой собирают, а не то, что собирают.
 * `ЗАМЕЧАНИЕ`— записка владельца на холсте.
 *
 * Они перечисляются отдельной строкой, чтобы число «собрано из скольки»
 * не разбавлялось тем, что собирать не нужно.
 *
 * Запуск: `node scripts/pencil-coverage.mjs [--verbose]`
 */

import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const verbose = process.argv.includes('--verbose')

/** Где ищем упоминания кадров. Сайт тоже: часть кадров — его страницы. */
const SOURCES = ['webapp/src', 'website/src']

/** Не экраны. Считаются отдельно и в знаменатель не идут. */
const NOT_A_SCREEN = [
  { test: (name) => name.startsWith('C '), why: 'компонент' },
  { test: (name) => name.startsWith('ПОЛОСА'), why: 'подпись раздела холста' },
  { test: (name) => name.startsWith('СИСТЕМА'), why: 'доска решений' },
  { test: (name) => name.startsWith('ЗАМЕЧАНИЕ'), why: 'записка на холсте' },
  // Доска сгенерированных кадров квартир: сырьё, а не экран. Собирать
  // на ней нечего — её содержимое уже лежит в `public/demo-photos`.
  { test: (name) => name.startsWith('ФОТО'), why: 'доска исходников' },
]

/**
 * Кадры, которые собирать не будем, и почему.
 *
 * Список должен оставаться коротким и каждый пункт — с причиной. Строка
 * без причины здесь — это способ спрятать невыполненную работу за словом
 * «отложено».
 */
const DEFERRED = {
  UBETV: 'письмо: нужен почтовый сервис, а не экран',
  AkUmG: 'письмо: нужен почтовый сервис',
  UxGfx: 'письмо: нужен почтовый сервис',
  L3WwXC: 'письмо: нужен почтовый сервис',
  nZGka: 'пуши на экране блокировки: это система телефона, не наш экран',
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(ts|tsx|astro|md)$/.test(entry.name)) yield path
  }
}

const frames = JSON.parse(
  await readFile(resolve(root, 'webapp/design-check/reference/frames.json'), 'utf8'),
)

let code = ''
for (const source of SOURCES) {
  for await (const path of walk(resolve(root, source))) {
    code += await readFile(path, 'utf8')
  }
}

const screens = []
const other = []

for (const frame of frames) {
  const skip = NOT_A_SCREEN.find((rule) => rule.test(frame.name))
  if (skip) {
    other.push({ ...frame, why: skip.why })
    continue
  }
  screens.push({ ...frame, built: code.includes(frame.id), deferred: DEFERRED[frame.id] })
}

const built = screens.filter((frame) => frame.built)
const deferred = screens.filter((frame) => !frame.built && frame.deferred)
const missing = screens.filter((frame) => !frame.built && !frame.deferred)

console.log(`Кадров в файле: ${frames.length}`)
console.log(`  не экраны: ${other.length} (компоненты, доски решений, подписи холста)`)
console.log(`  экранов: ${screens.length}`)
console.log('')
console.log(`Собрано:  ${built.length} из ${screens.length}`)
console.log(`Отложено: ${deferred.length} — с причиной`)
console.log(`Не собрано: ${missing.length}`)

if (verbose && built.length > 0) {
  console.log('\n── собрано')
  for (const frame of built) console.log(`  ${frame.id.padEnd(8)} ${frame.name}`)
}

if (deferred.length > 0) {
  console.log('\n── отложено')
  for (const frame of deferred) console.log(`  ${frame.id.padEnd(8)} ${frame.name} — ${frame.deferred}`)
}

if (missing.length > 0) {
  console.log('\n── НЕ СОБРАНО')
  for (const frame of missing) console.log(`  ${frame.id.padEnd(8)} ${frame.name}`)
  console.log(
    '\nКаждый кадр обязан быть либо собран, либо отложен с причиной в DEFERRED\n' +
      'этого скрипта. Пустой список причин — это способ спрятать работу\n' +
      'за словом «отложено».',
  )
}

process.exit(missing.length === 0 ? 0 : 1)
