/**
 * Ищет кнопки, которые выглядят нажимаемыми и ничего не делают.
 *
 * **Зачем разбор исходников, а не браузер.** В браузере обработчик React
 * не виден: на узле нет ни `onclick`, ни другого признака. Отличить живую
 * кнопку от мёртвой можно только в коде.
 *
 * Что считается мёртвым:
 *
 *   1. `<button>` без onClick, onPointerDown, onSubmit и без type="submit";
 *   2. `<Button>` продукта без onClick, onPointerDown и без asChild;
 *   3. узел с `cursor-pointer` без обработчика и не внутри ссылки.
 *
 * Что мёртвым не считается и почему:
 *
 *   - узел с `data-action` — действие названо сознательно: окна для него
 *     в макете нет, и рисовать его нельзя;
 *   - узел с `disabled` — выключен намеренно;
 *   - `<Link>` и `<a>` — это переход, обработчик им не нужен;
 *   - кнопка, получающая обработчик пропсом (`onClick={onSelect}` внутри
 *     компонента) — она живая у того, кто её вызывает.
 *
 * Запуск: node scripts/find-dead-buttons.mjs [--verbose]
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../webapp/src')
const verbose = process.argv.includes('--verbose')

/** Файлы экранов и компонентов. Стенды и полигон тоже: там кнопки настоящие. */
async function walk(dir) {
  const out = []
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, item.name)
    if (item.isDirectory()) out.push(...(await walk(full)))
    else if (item.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

/**
 * Разбирает открывающий тег: имя и весь текст свойств до `>`.
 *
 * Регулярное выражение вместо разбора JSX — сознательный размен. Полный
 * разбор потребовал бы компилятора и нашёл бы то же самое: свойства тега
 * лежат подряд, а вложенность тут не важна.
 */
function* tags(source) {
  const open = /<([A-Za-z][\w.]*)\s/g
  let match
  while ((match = open.exec(source)) !== null) {
    const name = match[1]
    let depth = 0
    let index = open.lastIndex
    let inString = null

    while (index < source.length) {
      const char = source[index]
      if (inString) {
        if (char === inString) inString = null
      } else if (char === '"' || char === "'" || char === '`') {
        inString = char
      } else if (char === '{') depth += 1
      else if (char === '}') depth -= 1
      else if (char === '>' && depth === 0) break
      index += 1
    }

    yield { name, props: source.slice(open.lastIndex, index), at: match.index }
  }
}

/** Номер строки по смещению — чтобы находку можно было открыть. */
function lineOf(source, offset) {
  return source.slice(0, offset).split('\n').length
}

const HANDLERS = ['onClick', 'onPointerDown', 'onSubmit', 'onChange', 'onSelect', 'onToggle']

/**
 * Обработчик приходит не только свойством.
 *
 * `{...pressProps(onPress)}` и `{...props}` раскладываются в те же onClick
 * и onPointerDown, просто в другом месте. Сканер, который этого не знает,
 * ругается на живые кнопки — и его перестают читать. Проверка, которой
 * не верят, хуже отсутствующей.
 */
const SPREAD = /\{\s*\.\.\./

const files = await walk(root)
const dead = []

/**
 * Стенды: файлы, которых в собранном продукте нет.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Полигон контролов, доска диалогов, доска состояний, карта экранов
 * и стенды выдачи живут на маршрутах, которые включаются только в режиме
 * разработки (`standRoutes` в `routes.tsx`). Это поверхности для сверки
 * с макетом: карточки на них нажимаются, но никуда не ведут — и не должны,
 * это витрина, а не работа.
 *
 * Считать их мёртвыми кнопками значит держать в счётчике шестнадцать узлов,
 * до которых человек не доберётся никогда, и тем самым прятать за ними
 * настоящие. Проверялось: ни один из этих файлов не импортируется
 * продуктовым экраном — они целиком свои.
 *
 * **Список закрытый и короткий.** Добавить сюда продуктовый файл значит
 * спрятать работу, а не сделать её; поэтому каждая строка названа поимённо,
 * а не задана шаблоном вроде «всё, что похоже на стенд».
 */
const STANDS = new Set([
  'webapp/src/kitchen-sink.tsx',
  'webapp/src/dialog-screens.tsx',
  'webapp/src/states-screen.tsx',
  'webapp/src/screen-map.tsx',
  'webapp/src/search-stand.tsx',
  'webapp/src/mobile-search-stand.tsx',
])

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const short = relative(resolve(import.meta.dirname, '..'), file).replaceAll('\\', '/')

  // Стенды в счёт не идут: в собранном продукте их нет. См. `STANDS` выше.
  if (STANDS.has(short)) continue

  for (const tag of tags(source)) {
    const { name, props } = tag
    const has = (needle) => props.includes(needle)

    /**
     * ПОМЕТКА НЕ СЧИТАЕТСЯ ДЕЙСТВИЕМ.
     *
     * Здесь стояло `has('data-action')`, и это была дыра размером
     * в сорок одну кнопку: 15 подозрительных узлов вместо 56.
     *
     * `data-action` не читается нигде — ни одного `dataset.action`,
     * ни одного селектора `[data-action]` во всём репозитории. Это подпись
     * «вот что должно случиться, когда для этого появится экран», то есть
     * НАМЕРЕНИЕ. Проверка принимала намерение за исполнение, и получалось
     * ровно то, от чего предостерегает DESIGN.md: зелёной сделали проверку,
     * а не работу — рабочей.
     *
     * Пометка осталась: она полезна как документация и по ней видно, куда
     * подключать действие. Но закрывать ею глаза счётчику нельзя.
     */
    const live =
      HANDLERS.some(has) ||
      SPREAD.test(props) ||
      has('asChild') ||
      has('type="submit"') ||
      has('disabled') ||
      has('aria-hidden')

    if (live) continue

    if (name === 'button') {
      dead.push({ file: short, line: lineOf(source, tag.at), what: '<button> без действия' })
      continue
    }

    if (name === 'Button') {
      dead.push({ file: short, line: lineOf(source, tag.at), what: '<Button> без действия' })
      continue
    }

    /**
     * Курсор-рука проверяется только у собственных тегов разметки.
     *
     * У компонента свойства тянутся до закрывающей скобки и захватывают
     * вложенный JSX целиком: `<DataTable rows={…<Link className="cursor-pointer">…}>`
     * выглядел бы мёртвой кнопкой, хотя внутри живая ссылка. Компонент
     * отвечает за свою разметку сам, и проверять его надо в его файле.
     */
    const intrinsic = name[0] === name[0].toLowerCase()
    if (intrinsic && has('cursor-pointer') && name !== 'a') {
      dead.push({
        file: short,
        line: lineOf(source, tag.at),
        what: `<${name}> с cursor-pointer без действия`,
      })
    }
  }
}

/**
 * Компонент, который принимает обработчик пропсом, живой у вызывающего.
 * Такие узлы отбрасываются: у них в теле стоит `onClick={onSomething}`,
 * то есть обработчик всё-таки есть, просто пришёл снаружи.
 */
const byFile = new Map()
for (const item of dead) {
  if (!byFile.has(item.file)) byFile.set(item.file, [])
  byFile.get(item.file).push(item)
}

console.log(`Файлов просмотрено: ${files.length}`)
console.log(`Подозрительных узлов: ${dead.length}\n`)

const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)
for (const [file, items] of sorted) {
  console.log(`${String(items.length).padStart(3)}  ${file}`)
  if (verbose) for (const item of items) console.log(`      :${item.line}  ${item.what}`)
}
