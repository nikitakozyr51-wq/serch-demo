/**
 * Выкладывает собранную демонстрацию на GitHub Pages.
 *
 * **Собранные файлы не попадают в основную ветку.** Они уезжают отдельной
 * веткой `gh-pages`, где нет ничего, кроме самой демонстрации. Иначе каждый
 * коммит с правкой одной строки тащил бы за собой пересобранные скрипты,
 * и история кода превратилась бы в историю сборок.
 *
 * Запуск:
 *
 *     node scripts/build-demo.mjs serch-demo     собрать
 *     node scripts/check-demo.mjs serch-demo     проверить
 *     node scripts/publish-demo.mjs              выложить
 *
 * Первый раз после этого нужно один раз зайти в настройки репозитория:
 * Settings → Pages → Source: Deploy from a branch → Branch: `gh-pages`, `/`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * **Что скрипт проверяет до того, как что-то отправить.**
 *
 * Отправка в открытый репозиторий необратима: git помнит всё, и удаление
 * файла из следующего коммита не убирает его из истории. Поэтому перед
 * отправкой проверяется, что в сборке нет ничего, чего там быть не должно:
 * файлов рабочей базы, таблиц, дизайн-файла.
 */

import { spawnSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const demo = resolve(root, '.demo')
const BRANCH = 'gh-pages'

function git(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.quiet ? 'pipe' : 'inherit',
  })
  if (result.status !== 0 && !options.allowFail) {
    console.error(`git ${args.join(' ')} — не прошло`)
    if (result.stderr) console.error(result.stderr)
    process.exit(result.status ?? 1)
  }
  return (result.stdout ?? '').trim()
}

// ── 1. Сборка на месте ──────────────────────────────────────────────────────
const files = await readdir(demo, { recursive: true }).catch(() => null)
if (files === null) {
  console.error('Сборки нет. Сначала: node scripts/build-demo.mjs serch-demo')
  process.exit(1)
}

// ── 2. В сборке нет ничего лишнего ──────────────────────────────────────────
const FORBIDDEN = [/\.xlsx$/i, /\.xls$/i, /\.pen$/i, /(^|\/)\.private\//i, /(^|\/)serch$/]
const leaked = files.filter((name) => FORBIDDEN.some((rule) => rule.test(name)))

if (leaked.length > 0) {
  console.error('В сборке лежит то, чего не должно быть в открытом доступе:')
  for (const name of leaked) console.error(`  ${name}`)
  process.exit(1)
}

/**
 * Отдельно — телефоны. Настоящие номера в открытой демонстрации недопустимы:
 * это персональные данные живых людей, и продукт обещает их не публиковать.
 * Выдуманные собраны в диапазоне `+7 900 000-··-··`, всё остальное — повод
 * остановиться.
 */
const PHONE = /\+7[  ]?9\d{2}[  ]?\d{3}-\d{2}-\d{2}/g
const strangers = new Set()

for (const name of files) {
  if (!/\.(html|js|json|css)$/i.test(name)) continue
  const text = await readFile(resolve(demo, name), 'utf8').catch(() => '')
  for (const match of text.matchAll(PHONE)) {
    const normalized = match[0].replace(/\s/g, ' ')
    if (!normalized.startsWith('+7 900 000-')) strangers.add(normalized)
  }
}

if (strangers.size > 0) {
  console.error('В сборке найдены телефоны вне выдуманного диапазона:')
  for (const phone of strangers) console.error(`  ${phone}`)
  console.error('\nОстановился. Публиковать чужие номера нельзя.')
  process.exit(1)
}

console.log(`Файлов в сборке: ${files.length}. Лишнего нет, чужих номеров нет.`)

// ── 3. Отправка отдельной веткой ────────────────────────────────────────────
const remote = git(['remote', 'get-url', 'origin'], { quiet: true, allowFail: true })
if (!remote) {
  console.error('У репозитория нет origin. Публиковать некуда.')
  process.exit(1)
}
console.log(`Отправляю в ${remote}, ветка ${BRANCH}`)

const worktree = resolve(root, '.demo-publish')

git(['worktree', 'remove', '--force', worktree], { quiet: true, allowFail: true })
git(['fetch', 'origin', BRANCH], { quiet: true, allowFail: true })

const exists = git(['ls-remote', '--heads', 'origin', BRANCH], { quiet: true, allowFail: true })
if (exists) {
  git(['worktree', 'add', worktree, `origin/${BRANCH}`])
  git(['checkout', '-B', BRANCH], { cwd: worktree })
} else {
  git(['worktree', 'add', '--detach', worktree])
  git(['checkout', '--orphan', BRANCH], { cwd: worktree })
  git(['rm', '-rf', '.'], { cwd: worktree, allowFail: true, quiet: true })
}

// Старое содержимое ветки убирается целиком: демонстрация всегда целая,
// а не смесь нового с забытым.
git(['rm', '-rf', '.'], { cwd: worktree, allowFail: true, quiet: true })

const { cp } = await import('node:fs/promises')
await cp(demo, worktree, { recursive: true })

git(['add', '-A'], { cwd: worktree })
const changed = git(['status', '--porcelain'], { cwd: worktree, quiet: true })

if (!changed) {
  console.log('Изменений нет: на ветке уже эта сборка.')
} else {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  git(['commit', '-m', `демонстрация: сборка ${stamp}`], { cwd: worktree })
  git(['push', '-u', 'origin', BRANCH], { cwd: worktree })
  console.log('\nОтправлено.')
}

git(['worktree', 'remove', '--force', worktree], { quiet: true, allowFail: true })

const owner = remote.replace(/.*github\.com[:/]/, '').replace(/\.git$/, '')
const [user, repo] = owner.split('/')
console.log(`\nСайт:    https://${user}.github.io/${repo}/`)
console.log(`Кабинет: https://${user}.github.io/${repo}/app/`)
console.log('\nЕсли открывается 404 — включите Pages один раз:')
console.log(`https://github.com/${owner}/settings/pages → Deploy from a branch → ${BRANCH} → /`)
