/**
 * Заглушка из макета — не данные продукта.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * «Невский проспект», «Смирнова Ирина», `i.smirnova@nevsky.ru` — это образцы
 * текста в Pencil. Дизайнер пишет их, чтобы кадр не был пустым; в код они
 * попали как данные и стали показываться живым людям.
 *
 * Владелец увидел это и сказал: «в кабинете всё ещё при заходе у нас Невский
 * проспект. Почему? Это просто была заглушка, это был весь такой текст
 * в Pencil, это заглушка.»
 *
 * Он прав, и одной вычистки мало: следующий собранный экран принесёт их
 * обратно, потому что берутся они из того же файла. Поэтому здесь стоит
 * правило, а не разовая уборка.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ГДЕ ЗАГЛУШКИ ЗАКОННЫ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * На СТЕНДАХ сверки (`/screen/…`, `kitchen-sink`, `design-check`) — там они
 * обязаны стоять: стенд существует, чтобы сравнивать пиксели с макетом, и
 * заменять в нём замеренный текст своим значило бы ломать сверку.
 *
 * Файлы стендов перечислены ниже поимённо. Список короткий и должен таким
 * оставаться: каждый новый файл в нём — это ещё одно место, куда заглушка
 * может просочиться незамеченной.
 */

import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'webapp/src')

/** Образцы текста из Pencil. Ни один не должен попадать человеку. */
const PLACEHOLDERS = [
  'Невский проспект',
  'Смирнова',
  'Лебедев Максим',
  'Титова Анна',
  'Гусев Пётр',
  'Королёв Дмитрий',
  '@nevsky.ru',
  '7806154392',
  'Свердловская наб., 44',
]

/**
 * Где заглушкам место.
 *
 * `design-check` — проверки, они сравнивают с макетом.
 * `kitchen-sink` — полигон контролов.
 * `states-screen`, `screen-map` — стенды.
 * `cabinet-demo-nav` — исчезнет вместе с последним чужим поиском в меню.
 */
const ALLOWED = [
  'design-check/',
  'kitchen-sink.tsx',
  'states-screen.tsx',
  'screen-map.tsx',
  'data/search-rows.ts',
  'data/listings.ts',
]

/**
 * Убрать комментарии, сохранив номера строк.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Комментарий — не то, что видит человек.** В комментариях этого проекта
 * заглушка упоминается ровно затем, чтобы объяснить, почему её убрали:
 * «здесь стояли „Смирнова Ирина“ и „Невский проспект“ — образцы из макета».
 * Запретить это значило бы запретить объяснять свою же работу, и следующий
 * читатель кода не узнал бы, откуда взялось правило.
 *
 * Отсечение было построчным и не работало трижды:
 * многострочный `/** … *\/`, где строка продолжения не начинается со звёздочки;
 * `{/* … *\/}` в разметке; и однострочный `/** … *\/` целиком.
 * Поэтому здесь простой конечный автомат по всему файлу, а не выражение
 * на строку.
 *
 * `//` внутри строки-адреса (`https://…`) комментарием не считается: перед
 * ним стоит двоеточие. Полного разбора языка здесь нет и не нужно — цена
 * ошибки в другую сторону (пропустить заглушку) выше, чем лишний разбор.
 */
function stripComments(lines) {
  let inBlock = false

  return lines.map((line) => {
    let out = ''
    let index = 0

    while (index < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', index)
        if (end === -1) return out
        inBlock = false
        index = end + 2
        continue
      }

      const block = line.indexOf('/*', index)
      const lineComment = line.indexOf('//', index)
      const isUrl = lineComment > 0 && line[lineComment - 1] === ':'

      if (block !== -1 && (lineComment === -1 || isUrl || block < lineComment)) {
        out += line.slice(index, block)
        inBlock = true
        index = block + 2
        continue
      }

      if (lineComment !== -1 && !isUrl) {
        return out + line.slice(index, lineComment)
      }

      return out + line.slice(index)
    }

    return out
  })
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path
  }
}

const found = []

for await (const path of walk(source)) {
  const relative = path.slice(root.length + 1).replaceAll('\\', '/')
  if (ALLOWED.some((allow) => relative.includes(allow))) continue

  const text = await readFile(path, 'utf8')

  /**
   * Возврат каретки отрезается вместе с переводом строки, а не остаётся
   * в конце строки.
   *
   * Иначе проверка врёт, и врала: файлы репозитория лежат с виндовыми
   * переводами строк, `split('\n')` оставлял `\r` последним символом,
   * а точка в регулярном выражении JavaScript конца строки не покрывает.
   * Из-за этого ни одно правило отсечения комментариев не срабатывало —
   * и двадцать шесть объяснений «здесь стояла заглушка, мы её убрали»
   * сами засчитывались как заглушки.
   */
  const lines = stripComments(text.split(/\r?\n/))

  lines.forEach((code, index) => {
    const line = code
    for (const sample of PLACEHOLDERS) {
      if (code.includes(sample)) {
        found.push({ file: relative, line: index + 1, sample, text: line.trim().slice(0, 90) })
      }
    }
  })
}

if (found.length === 0) {
  console.log('Заглушек из макета в продукте нет.')
  process.exit(0)
}

console.error(`Заглушки из макета попали в продукт: ${found.length}\n`)
for (const item of found) {
  console.error(`  ${item.file}:${item.line}  «${item.sample}»`)
  console.error(`      ${item.text}`)
}
console.error(
  '\nЭто образцы текста из Pencil, а не данные. Возьмите значение из сеанса\n' +
    'или из работы агентства; если экран — стенд сверки, добавьте его файл\n' +
    'в список ALLOWED этого скрипта и объясните почему.',
)
process.exit(1)
