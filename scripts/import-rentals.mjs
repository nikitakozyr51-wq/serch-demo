/**
 * Аренда: 212 объектов из таблицы владельца, обезличенно.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО ПЕРЕНОСИТСЯ, А ЧТО НЕТ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Таблица владельца — рабочая база рассылки собственникам. В ней шестнадцать
 * колонок, и две из них персональные: имя и телефон живых людей.
 *
 * **Имя и телефон не переносятся ни в каком виде.** Ни целиком, ни частично,
 * ни в виде «В. И.» или «+7 921 ••• ••-89». Продукт публикуется на GitHub
 * Pages, то есть в открытом доступе, и попадание туда номера собственника —
 * это не «демонстрационные данные», а разглашение персональных данных
 * с ответственностью агентства.
 *
 * Номер в продукте собирается на лету функцией `demoPhone` из диапазона
 * `+7 900`, который в России не выдан ни одному оператору. Позвонить по нему
 * нельзя физически.
 *
 * Переносятся факты о недвижимости: адрес, тип, площадь, метро, район,
 * жилой комплекс, ремонт, цена, дата объявления, площадка, номер лота.
 * Это описание рынка, а не описание человека.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧЕГО В ТАБЛИЦЕ НЕТ, И ЧТО С ЭТИМ ДЕЛАЕТСЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Этаж, этажность, минуты до метро, число публикаций и площадок — этих
 * колонок в таблице нет. Они НЕ выдумываются случайными числами: каждое
 * выводится из того, что есть, детерминированно — по номеру лота. Один и тот
 * же объект всегда получает одни и те же значения, и файл не меняется при
 * повторном запуске.
 *
 * Свежесть считается от даты объявления к моменту сборки, а не пишется
 * числом: иначе через месяц вся аренда была бы «14 минут назад».
 *
 * Запуск: `node scripts/import-rentals.mjs`
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { inflateRawSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, '.private/База_собственников_рассылка.xlsx')
const target = resolve(root, 'webapp/src/data/rentals.ts')

/* ── Чтение xlsx без зависимостей ────────────────────────────────────────
   Книга — это zip с XML внутри. Тянуть библиотеку ради одного разового
   разбора нельзя: правило проекта — не добавлять зависимости без нужды,
   а нужда тут ровно на пятьдесят строк. */

function readZip(buffer) {
  const files = new Map()
  // Идём по локальным заголовкам: сигнатура 0x04034b50.
  let offset = 0
  while (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8)
    const compressedSize = buffer.readUInt32LE(offset + 18)
    const nameLength = buffer.readUInt16LE(offset + 26)
    const extraLength = buffer.readUInt16LE(offset + 28)
    const start = offset + 30 + nameLength + extraLength
    const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLength)
    const body = buffer.subarray(start, start + compressedSize)
    // Метод 0 — без сжатия, 8 — deflate без zlib-заголовка (`raw`).
    files.set(name, method === 0 ? body : inflateRawSync(body))
    offset = start + compressedSize
  }
  return files
}

function unescapeXml(text) {
  return (
    text
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&apos;', "'")
      // Кириллица в книге записана числовыми ссылками (`&#1040;`), а не
      // буквами. Без этой строки район приезжал как «&#1060;&#1088;...»,
      // не находился в словаре и молча падал в «другой» — все 212 объектов
      // оказывались в одном районе, и медиана считалась по всему городу.
      .replaceAll(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replaceAll(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replaceAll('&amp;', '&')
  )
}

/** Строки листа: массив объектов «буква колонки → значение». */
function sheetRows(xml, shared) {
  const rows = []
  for (const [, rowXml] of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {}
    for (const [, attrs, body] of rowXml.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1]
      if (ref === undefined) continue
      const type = /t="([^"]+)"/.exec(attrs)?.[1]
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? ''
      if (type === 's') cells[ref] = shared[Number(raw)] ?? ''
      else if (type === 'inlineStr') {
        cells[ref] = unescapeXml(
          [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''),
        )
      } else cells[ref] = unescapeXml(raw)
    }
    rows.push(cells)
  }
  return rows
}

/* ── Выведенные значения ─────────────────────────────────────────────────
   Всё, чего в таблице нет, считается от номера лота. Не случайно: файл
   пересобирается на каждой правке скрипта, и случайные числа означали бы,
   что каждый раз меняется вся выдача, а сверка снимков ломается на ровном
   месте. */

function seedOf(text) {
  let seed = 0
  for (const char of text) seed = (seed * 31 + char.codePointAt(0)) % 2_147_483_647
  return seed
}

function pick(seed, step, list) {
  return list[Math.floor(seed / step) % list.length]
}

/** Комнатность из «2-к.кв», «студия», «комната». */
function roomsOf(type) {
  const digits = /^(\d+)-к/.exec(type)
  if (digits !== null) return Number(digits[1])
  if (/студи/i.test(type)) return 0
  return 1
}

/** Идентификатор района: тот же словарь, что у продажи. */
const DISTRICT_ID = {
  Адмиралтейский: 'admiralteysky',
  Василеостровский: 'vasileostrovsky',
  Выборгский: 'vyborgsky',
  Калининский: 'kalininsky',
  Кировский: 'kirovsky',
  Колпинский: 'kolpinsky',
  Красногвардейский: 'krasnogvardeisky',
  Красносельский: 'krasnoselsky',
  Кронштадтский: 'kronshtadtsky',
  Курортный: 'kurortny',
  Московский: 'moskovsky',
  Невский: 'nevsky',
  Петроградский: 'petrogradsky',
  Петродворцовый: 'petrodvortsovy',
  Приморский: 'primorsky',
  Пушкинский: 'pushkinsky',
  Фрунзенский: 'frunzensky',
  Центральный: 'central',
}

/** Дата «24.11.2025» → миллисекунды. */
function parseDate(text) {
  const parts = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(text).trim())
  if (parts === null) return null
  return Date.UTC(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]))
}

const buffer = await readFile(source)
const files = readZip(buffer)

const sharedXml = files.has('xl/sharedStrings.xml')
  ? files.get('xl/sharedStrings.xml').toString('utf8')
  : ''
const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, body]) =>
  unescapeXml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join('')),
)

const rows = sheetRows(files.get('xl/worksheets/sheet1.xml').toString('utf8'), shared)
const [, ...data] = rows

const rentals = []
const skipped = []

for (const row of data) {
  const type = (row.D ?? '').trim()
  const area = Number(row.E)
  const metro = (row.F ?? '').trim()
  const districtName = (row.G ?? '').trim()
  const address = (row.H ?? '').trim()
  const complex = (row.I ?? '').trim()
  const repair = (row.J ?? '').trim()
  const price = Number(row.K)
  const postedAt = parseDate(row.L)
  const platform = (row.M ?? '').trim()
  const lot = (row.N ?? '').trim()

  if (address === '' || !Number.isFinite(price) || price <= 0) {
    skipped.push({ address, price: row.K })
    continue
  }

  const seed = seedOf(lot === '' ? address : lot)
  const floors = pick(seed, 1, [5, 9, 12, 16, 25])
  const floor = 1 + (seed % floors)

  rentals.push({
    // Номер лота — единственный идентификатор из таблицы, который ничего
    // не говорит о человеке: он принадлежит объявлению на площадке.
    id: `rent-${lot === '' ? String(seed).padStart(8, '0') : lot}`,
    address,
    complex: complex === '' ? undefined : complex,
    district: DISTRICT_ID[districtName] ?? 'other',
    districtName,
    metro,
    // Минут до метро в таблице нет. Считается от номера лота и держится
    // в диапазоне, который вообще имеет смысл писать в объявлении.
    metroMinutes: 3 + (seed % 18),
    rooms: roomsOf(type),
    type,
    area,
    floor,
    floors,
    repair,
    price,
    // Цена за метр — то, по чему сравнивают аренду. Считается, а не берётся:
    // в таблице её нет, а посчитать её должен один и тот же код везде.
    pricePerMeter: Math.round(price / area),
    postedAt,
    platform,
  })
}

/* ── Медианы районов ─────────────────────────────────────────────────────
   Отклонение от рынка обязано считаться от медианы СВОЕГО района, а не от
   общей по городу: 45 000 в Колпино и 45 000 в Центральном — это разные
   события. Медиана считается по этим же 212 объектам, потому что другого
   источника у нас нет, и вычислять её из воздуха нельзя. */

const byDistrict = new Map()
for (const item of rentals) {
  const list = byDistrict.get(item.district) ?? []
  list.push(item.pricePerMeter)
  byDistrict.set(item.district, list)
}

const median = new Map()
for (const [district, values] of byDistrict) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  median.set(
    district,
    sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle],
  )
}

for (const item of rentals) {
  const base = median.get(item.district) ?? item.pricePerMeter
  const raw = Math.round(((item.pricePerMeter - base) / base) * 100)
  // Мёртвая зона ±5 %: разница в пять процентов на рынке аренды — это шум,
  // и подсвечивать её как находку значит приучать не верить подсветке.
  item.deviation = Math.abs(raw) < 5 ? 0 : raw
  // Сколько объектов района дают эту медиану. Меньше восьми — «мало данных»:
  // отклонение от медианы трёх квартир не значит ничего.
  item.comparables = (byDistrict.get(item.district) ?? []).length
}

rentals.sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0) || a.id.localeCompare(b.id))

const platforms = new Map()
for (const item of rentals) platforms.set(item.platform, (platforms.get(item.platform) ?? 0) + 1)

const header = `/**
 * Аренда: ${rentals.length} объектов Санкт-Петербурга.
 *
 * **Файл собран скриптом \`scripts/import-rentals.mjs\` и правится только им.**
 * Источник — рабочая таблица владельца.
 *
 * **Имён и телефонов собственников здесь нет.** Они были в источнике и не
 * перенесены ни в каком виде: продукт публикуется в открытом доступе, и
 * номер живого человека в нём — это разглашение персональных данных, а не
 * демонстрационные данные. Номер в карточке собирается на лету из диапазона
 * \`+7 900\`, не выданного ни одному оператору.
 *
 * Этаж, этажность и минуты до метро выведены из номера лота: этих колонок
 * в таблице нет, а случайные числа меняли бы выдачу при каждой пересборке.
 *
 * Отклонение считается от медианы ₽/м² СВОЕГО района, мёртвая зона ±5 %.
 * \`comparables\` — сколько объектов дали эту медиану: меньше восьми, и
 * отклонение показывать нельзя, это «мало данных».
 *
 * Площадки: ${[...platforms].map(([name, count]) => `${name} ${count}`).join(' · ')}.
 */

export type Rental = {
  id: string
  address: string
  /** Жилой комплекс. Есть не у всех — у старого фонда его не бывает. */
  complex?: string
  district: string
  districtName: string
  metro: string
  metroMinutes: number
  /** 0 — студия. */
  rooms: number
  /** Как записано в объявлении: «2-к.кв», «студия». */
  type: string
  area: number
  floor: number
  floors: number
  /** «Косметический», «Евроремонт», «Без ремонта». */
  repair: string
  /** ₽ в месяц. */
  price: number
  pricePerMeter: number
  /** Когда объявление вышло, в миллисекундах эпохи. */
  postedAt: number | null
  platform: string
  deviation: number
  comparables: number
}

export const RENTALS: Rental[] = `

await writeFile(target, header + JSON.stringify(rentals, null, 2) + '\n', 'utf8')

console.log(`Аренда собрана: ${rentals.length} объектов → ${target.slice(root.length + 1)}`)
console.log(`Площадки: ${[...platforms].map(([name, count]) => `${name} ${count}`).join(' · ')}`)
console.log(`Районов: ${median.size}`)
if (skipped.length > 0) console.log(`Пропущено строк без адреса или цены: ${skipped.length}`)
