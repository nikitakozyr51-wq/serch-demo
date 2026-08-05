/**
 * Собирает сайт и кабинет в один каталог — одну ссылку.
 *
 * Лендинг ложится на корень, кабинет в папку `app`. Человек открывает адрес,
 * читает про продукт, жмёт «Создать агентство» и оказывается в кабинете,
 * не меняя домена. Это и есть «работоспособный сайт» в том смысле, в каком
 * его просил владелец: одна ссылка, а не две.
 *
 * Запуск:
 *
 *     node scripts/build-demo.mjs                 для своего домена
 *     node scripts/build-demo.mjs serch-demo      для GitHub Pages
 *
 * Имя папки передаётся **без ведущего слэша** намеренно. Git Bash на Windows
 * принимает любой аргумент, начинающийся со слэша, за путь файловой системы
 * и молча переписывает его в `C:/Program Files/Git/serch-demo`. Сборка при
 * этом не падает, а собирает сайт с несуществующим корнем — ошибка вылезает
 * только на хостинге белой страницей. Слэш добавляется здесь, внутри.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * **Куда кладётся результат и почему не в `docs/`.**
 *
 * GitHub Pages умеет отдавать сайт из корня ветки или из папки `docs`, и это
 * толкает положить сборку именно туда. Так и было сделано — и первая же
 * сборка стёрла документацию проекта: `docs/` уже была занята, в ней жили
 * ARCHITECTURE, DEPLOYMENT, TESTING и остальные. Файлы не были в git,
 * и вернуть их не удалось.
 *
 * Поэтому результат идёт в `.demo/`, а на хостинг попадает отдельной веткой.
 * И поэтому же ниже стоит проверка, которая **отказывается удалять папку,
 * если в ней есть хоть что-то, кроме прошлой сборки.** Скрипт, стирающий
 * каталог целиком, обязан сначала доказать, что этот каталог — его.
 */

import { spawnSync } from 'node:child_process'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const raw = (process.argv[2] ?? '').trim()

if (raw.startsWith('/')) {
  console.error(
    'Имя папки передаётся без ведущего слэша: node scripts/build-demo.mjs serch-demo\n' +
      'Со слэшем Git Bash подменит его на путь к своей установке, и сайт соберётся с чужим корнем.',
  )
  process.exit(1)
}

const base = raw === '' ? '' : `/${raw.replace(/\/+$/, '')}`
const root = resolve(import.meta.dirname, '..')
const out = resolve(root, '.demo')

/** Метка своей сборки. Без неё каталог считается чужим и не стирается. */
const MARK = '.serch-demo-build'

/**
 * Очистка каталога только после доказательства, что он наш.
 *
 * Пустой каталог — наш. Каталог с меткой прошлой сборки — наш. Всё
 * остальное — чужое, и скрипт останавливается, а не «на всякий случай»
 * удаляет. Один раз это уже стоило проекту документации.
 */
async function claim(dir) {
  let items
  try {
    items = await readdir(dir)
  } catch {
    await mkdir(dir, { recursive: true })
    await writeFile(resolve(dir, MARK), 'сборка демонстрации, каталог создан скриптом\n', 'utf8')
    return
  }

  if (items.length === 0) {
    await writeFile(resolve(dir, MARK), 'сборка демонстрации, каталог создан скриптом\n', 'utf8')
    return
  }

  const ours = await readFile(resolve(dir, MARK), 'utf8').catch(() => null)
  if (ours === null) {
    console.error(
      `Каталог ${dir} не пуст и не помечен как сборка демонстрации.\n` +
        'Скрипт остановился, ничего не удалив: в этой папке может лежать чужая работа.\n' +
        'Если каталог действительно можно стереть — удалите его руками и запустите снова.',
    )
    process.exit(1)
  }

  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  await writeFile(resolve(dir, MARK), 'сборка демонстрации, каталог создан скриптом\n', 'utf8')
}

/** Запуск сборки с общим корнем. Ошибка сборки останавливает всё. */
function build(where, label) {
  console.log(`\n— собираю ${label}${base ? ` для корня ${base}` : ''}`)
  const result = spawnSync('bun', ['run', 'build'], {
    cwd: resolve(root, where),
    env: { ...process.env, SERCH_BASE: base },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    console.error(`\n${label}: сборка не прошла, остановился`)
    process.exit(result.status ?? 1)
  }
}

build('website', 'сайт')
build('webapp', 'кабинет')

await claim(out)

await cp(resolve(root, 'website/dist'), out, { recursive: true })
await cp(resolve(root, 'webapp/dist'), resolve(out, 'app'), { recursive: true })

/**
 * `.nojekyll` — иначе GitHub Pages прогонит каталог через Jekyll и выбросит
 * всё, что начинается с подчёркивания. Сборщики кладут туда часть файлов,
 * и сайт разваливается на ровном месте без единой ошибки в логах.
 */
await writeFile(resolve(out, '.nojekyll'), '', 'utf8')

/**
 * Кабинет получает свою копию страницы «не найдено».
 *
 * Хостинг ищет `404.html` рядом с запрошенным путём. Без этой копии глубокая
 * ссылка вида `/app/search` упиралась бы в стандартную страницу GitHub,
 * а не в кабинет.
 */
await cp(resolve(out, '404.html'), resolve(out, 'app/404.html'))

const pages = (await readdir(out, { recursive: true })).filter((name) => name.endsWith('.html'))

console.log(`\nготово: ${out}`)
console.log(`страниц: ${pages.length}`)
console.log(`адрес кабинета: ${base || ''}/app/`)
console.log('\nпроверить: node scripts/check-demo.mjs' + (raw ? ` ${raw}` : ''))
