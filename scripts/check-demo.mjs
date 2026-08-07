/**
 * Проверяет собранную демонстрацию так, как её увидит человек по ссылке.
 *
 * **Зачем отдельная проверка.** Сборка бывает зелёной у мёртвого сайта:
 * этот проект уже попадался — восемь адресов из одиннадцати отдавали 404,
 * а сборка, типы и тесты молчали. Мёртвая ссылка для сборщика не ошибка.
 *
 * Проверяются четыре вещи, и все четыре ломаются молча:
 *
 *   1. Каждая страница сайта открывается по своему адресу.
 *   2. Кабинет открывается и рисует хоть что-то, а не белый лист.
 *   3. Глубокая ссылка в кабинет возвращает в кабинет, а не в «страницы нет».
 *   4. Ни одна ссылка внутри страниц не ведёт мимо корня хостинга.
 *
 * Запуск: node scripts/check-demo.mjs [корень]
 *
 *     node scripts/check-demo.mjs serch-demo
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const raw = (process.argv[2] ?? '').trim().replace(/^\/+|\/+$/g, '')
const base = raw === '' ? '' : `/${raw}`
const root = resolve(import.meta.dirname, '../.demo')
const port = 4407

const TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
}

/**
 * Сервер повторяет поведение GitHub Pages: отдаёт файл, если он есть,
 * иначе `404.html` рядом с запрошенным путём и код 404. Без этого проверка
 * говорила бы про сервер разработки, а не про хостинг.
 */
const server = createServer(async (request, response) => {
  const url = decodeURIComponent((request.url ?? '/').split('?')[0])
  const withoutBase = base && url.startsWith(base) ? url.slice(base.length) || '/' : url
  const target = join(root, withoutBase)

  const send = async (file, status) => {
    try {
      const body = await readFile(file)
      response.writeHead(status, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      })
      response.end(body)
      return true
    } catch {
      return false
    }
  }

  try {
    const info = await stat(target)
    if (info.isDirectory()) {
      if (await send(join(target, 'index.html'), 200)) return
    } else if (await send(target, 200)) return
  } catch {
    // файла нет — идём к 404 ниже
  }

  if (await send(join(target, 'index.html'), 200)) return

  // Ближайшая страница «не найдено»: сначала рядом с путём, потом на корне.
  const nested = withoutBase.startsWith('/app/') ? join(root, 'app/404.html') : null
  if (nested && (await send(nested, 404))) return
  if (await send(join(root, '404.html'), 404)) return

  response.writeHead(404)
  response.end('нет файла')
})

await new Promise((done) => server.listen(port, done))

const { chromium } = await import('playwright')
const browser = await chromium.launch({
  args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage'],
})
const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
const page = await context.newPage()

const failures = []
const note = (what) => failures.push(what)

const SITE_PAGES = [
  '/',
  '/pricing',
  '/how-it-works',
  '/law',
  '/o-kompanii',
  '/kontakty',
  '/oferta',
  '/politika',
  '/soglasie',
  '/blog',
  '/blog/vosem-obyavleniy-iz-desyati',
  '/status',
  '/stop',
  '/udalit-dannye',
  '/podtverdite-nomer',
]

console.log(`Проверяю ${root} с корнем ${base || '(пусто)'}\n`)

for (const path of SITE_PAGES) {
  const url = `http://localhost:${port}${base}${path}`
  const response = await page.goto(url, { waitUntil: 'load' })
  const status = response?.status() ?? 0
  const hasMain = (await page.locator('main').count()) > 0
  if (status !== 200 || !hasMain) {
    note(`страница ${path}: код ${status}${hasMain ? '' : ', нет <main>'}`)
  }
}
console.log(`страниц сайта проверено: ${SITE_PAGES.length}`)

// Кабинет: корень и глубокая ссылка.
const cabinetErrors = []
page.on('pageerror', (error) => cabinetErrors.push(String(error)))

await page.goto(`http://localhost:${port}${base}/app/`, { waitUntil: 'load' })
const booted = await page
  .waitForSelector('[data-slot]', { timeout: 10_000 })
  .then(() => true)
  .catch(() => false)
if (!booted) note('кабинет не отрисовался: белый лист вместо интерфейса')

// Глубокая ссылка: хостинг отдаст 404, страница обязана вернуть в кабинет.
await page.goto(`http://localhost:${port}${base}/app/login`, { waitUntil: 'load' })
await page.waitForTimeout(1200)
const landed = page.url()
if (!landed.includes('/app/')) note(`глубокая ссылка увела на ${landed}`)
const deepBooted = await page
  .waitForSelector('[data-slot]', { timeout: 10_000 })
  .then(() => true)
  .catch(() => false)
if (!deepBooted) note(`глубокая ссылка не открыла кабинет: ${landed}`)

if (cabinetErrors.length > 0) note(`ошибка в кабинете: ${cabinetErrors[0].slice(0, 140)}`)

/**
 * Главное обещание демонстрации: с лендинга можно войти и начать работать.
 *
 * Проверяется путём человека, а не наличием ссылки в разметке: нажать
 * «Создать агентство» на главной, оказаться в кабинете, отметить согласия,
 * создать агентство и попасть внутрь. Каждый шаг здесь уже ломался порознь,
 * а вместе они не проверялись ни разу.
 */
await page.goto(`http://localhost:${port}${base}/`, { waitUntil: 'load' })

const cta = page.locator('a', { hasText: 'Создать агентство' }).first()
if ((await cta.count()) === 0) {
  note('на главной нет кнопки «Создать агентство»')
} else {
  await cta.click()
  await page.waitForTimeout(2000)

  if (!page.url().includes('/app/')) {
    note(`с главной «Создать агентство» ведёт мимо кабинета: ${page.url()}`)
  } else {
    const opened = await page
      .waitForSelector('[data-slot="auth-field"]', { timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
    if (!opened) note('кабинет открылся, но формы регистрации на нём нет')

    if (opened) {
      /**
       * Поля заполняются, а не считаются заполненными.
       *
       * Раньше проверка только тикала галочки и ждала, что кнопка оживёт.
       * Это работало, пока форма приезжала заполненной образцами из макета —
       * «Невский проспект», «Смирнова Ирина». Образцы убраны, форма
       * открывается пустой (так и должно быть), и проверка начала падать
       * на своём же допущении.
       *
       * Имя, почта и название агентства обязательны: без имени кабинет
       * подписал бы человека словом «Руководитель» и поставил бы его
       * в журнал раскрытий рядом с каждым списанием.
       */
      for (const [name, value] of [
        ['agency', 'Проверочное агентство'],
        ['name', 'Проверяющий'],
        ['email', 'demo-check@serch.test'],
        ['password', 'ochen-dlinnyi-parol-10'],
      ]) {
        const field = page.locator(`[data-slot="auth-field"] input[name="${name}"]`)
        if ((await field.count()) > 0) await field.fill(value)
      }

      const boxes = page.locator('[data-slot="checkbox"]')
      const count = await boxes.count()
      for (let index = 0; index < count; index += 1) await boxes.nth(index).click()

      const create = page.getByRole('button', { name: 'Создать агентство' })
      if (await create.isDisabled()) {
        note('согласия отмечены, а «Создать агентство» осталась выключенной')
      } else {
        await create.click()
        await page.waitForTimeout(1500)
        const inside = await page
          .waitForSelector('[data-slot="cabinet-header"]', { timeout: 10_000 })
          .then(() => true)
          .catch(() => false)
        if (!inside) note(`после регистрации кабинет не открылся: ${page.url()}`)
      }
    }
  }
}

// Ссылки: ни одна не должна вести мимо корня.
if (base) {
  await page.goto(`http://localhost:${port}${base}/`, { waitUntil: 'load' })
  const strays = await page.evaluate((prefix) => {
    const out = []
    for (const link of document.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href') ?? ''
      if (href.startsWith('/') && !href.startsWith(`${prefix}/`)) {
        out.push(`${href} — «${(link.textContent ?? '').trim().slice(0, 30)}»`)
      }
    }
    return out
  }, base)
  for (const stray of strays) note(`ссылка мимо корня: ${stray}`)
}

await browser.close()
server.close()

if (failures.length === 0) {
  console.log('\nвсё открывается, ссылки на месте')
} else {
  console.log(`\nне прошло: ${failures.length}`)
  for (const item of failures) console.log(`  ✗ ${item}`)
  process.exitCode = 1
}
