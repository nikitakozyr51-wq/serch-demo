/**
 * Собирает демонстрационный набор объектов для кабинета.
 *
 * **Зачем скрипт, а не рукописный файл.** Двести пятьдесят объектов руками
 * не написать так, чтобы медианы районов сошлись с теми, что уже напечатаны
 * на лендинге. А они обязаны сойтись: сайт обещает «медиана Калининского
 * 205 тыс ₽/м²», и если в выдаче кабинета медиана другая, продукт врёт
 * на собственной витрине.
 *
 * **Числа не случайные.** Генератор детерминированный: одно и то же зерно
 * даёт один и тот же набор, поэтому результат кладётся в репозиторий файлом
 * и не меняется от запуска к запуску. Скрипт нужен, чтобы набор можно было
 * пересобрать, когда появятся настоящие данные, а не чтобы гонять его
 * при каждой сборке.
 *
 * **Телефоны выдуманы намеренно.** Настоящие номера собственников в открытую
 * демонстрацию не попадают ни при каких условиях: это ровно то, что продукт
 * обещает не делать, и это персональные данные живых людей. Номера собраны
 * из несуществующего диапазона.
 *
 * Запуск: `node scripts/generate-listings.mjs`
 */

import { writeFile } from 'node:fs/promises'

/** Детерминированный генератор: mulberry32 от постоянного зерна. */
function makeRandom(seed) {
  let state = seed
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = makeRandom(24072026)

const pick = (list) => list[Math.floor(random() * list.length)]
const between = (min, max) => min + random() * (max - min)
const intBetween = (min, max) => Math.floor(between(min, max + 1))

/**
 * Районы с медианой ₽/м² — числа из `DEMO-DATA.md`, то есть с лендинга.
 * `share` — сколько объектов набора приходится на район: пропорция взята
 * из той же таблицы, где Приморский 334, а Петроградский 148.
 */
const DISTRICTS = [
  {
    id: 'primorsky',
    name: 'Приморский',
    median: 218_000,
    share: 334,
    metro: ['Пионерская', 'Комендантский проспект', 'Старая Деревня', 'Чёрная речка', 'Удельная'],
    streets: [
      'Испытателей пр.',
      'Богатырский пр.',
      'Комендантский пр.',
      'Королёва пр.',
      'Сизова пр.',
      'Планерная ул.',
      'Шаврова ул.',
      'Уточкина ул.',
      'Гаккелевская ул.',
      'Савушкина ул.',
      'Оптиков ул.',
      'Туристская ул.',
      'Яхтенная ул.',
    ],
  },
  {
    id: 'kalininsky',
    name: 'Калининский',
    median: 205_000,
    share: 291,
    metro: [
      'Академическая',
      'Политехническая',
      'Гражданский проспект',
      'Девяткино',
      'Лесная',
      'Площадь Мужества',
    ],
    streets: [
      'Науки пр.',
      'Светлановский пр.',
      'Гражданский пр.',
      'Северный пр.',
      'Тихорецкий пр.',
      'Верности ул.',
      'Карпинского ул.',
      'Луначарского пр.',
      'Академика Байкова ул.',
      'Софьи Ковалевской ул.',
      'Ушинского ул.',
      'Замшина ул.',
      'Бестужевская ул.',
    ],
  },
  {
    id: 'moskovsky',
    name: 'Московский',
    median: 246_000,
    share: 286,
    metro: ['Московская', 'Парк Победы', 'Электросила', 'Московские ворота', 'Звёздная', 'Купчино'],
    streets: [
      'Московский пр.',
      'Ленинский пр.',
      'Космонавтов пр.',
      'Юрия Гагарина пр.',
      'Варшавская ул.',
      'Типанова ул.',
      'Алтайская ул.',
      'Фрунзе ул.',
      'Благодатная ул.',
      'Звёздная ул.',
      'Дунайский пр.',
    ],
  },
  {
    id: 'central',
    name: 'Центральный',
    median: 389_000,
    share: 203,
    metro: [
      'Площадь Восстания',
      'Маяковская',
      'Чернышевская',
      'Владимирская',
      'Лиговский проспект',
      'Достоевская',
    ],
    streets: [
      'Невский пр.',
      'Лиговский пр.',
      'Суворовский пр.',
      'Восстания ул.',
      'Марата ул.',
      'Жуковского ул.',
      'Некрасова ул.',
      'Рубинштейна ул.',
      'Гончарная ул.',
      'Кирочная ул.',
      'Чайковского ул.',
      'Фурштатская ул.',
    ],
  },
  {
    id: 'vasileostrovsky',
    name: 'Василеостровский',
    median: 271_000,
    share: 176,
    metro: ['Василеостровская', 'Приморская', 'Спортивная', 'Зенит'],
    streets: [
      'Большой пр. В.О.',
      'Средний пр. В.О.',
      'Малый пр. В.О.',
      'Наличная ул.',
      'Кораблестроителей ул.',
      'Беринга ул.',
      'Гаванская ул.',
      'Детская ул.',
      'Шевченко ул.',
      'Нахимова ул.',
      'Опочинина ул.',
    ],
  },
  {
    id: 'petrogradsky',
    name: 'Петроградский',
    median: 412_000,
    share: 148,
    metro: ['Петроградская', 'Горьковская', 'Чкаловская', 'Спортивная', 'Крестовский остров'],
    streets: [
      'Каменноостровский пр.',
      'Большой пр. П.С.',
      'Чкаловский пр.',
      'Ждановская ул.',
      'Съезжинская ул.',
      'Гатчинская ул.',
      'Подковырова ул.',
      'Пионерская ул.',
      'Лахтинская ул.',
      'Введенская ул.',
      'Малый пр. П.С.',
    ],
  },
]

const PLATFORMS = ['Авито', 'Циан', 'Домклик', 'Яндекс']

/** Сколько объектов в наборе. 250 — чтобы фильтры имели что сужать. */
const TOTAL = 250

/**
 * Площадь по комнатности. Границы взяты из настоящего петербургского рынка:
 * однокомнатная 32–45, двухкомнатная 50–68, трёхкомнатная 65–92.
 */
const AREA_BY_ROOMS = {
  1: [32, 45],
  2: [50, 68],
  3: [65, 92],
  4: [95, 130],
}

/** Доли комнатности в выдаче: однушек и двушек больше всего. */
const ROOM_WEIGHTS = [
  [1, 0.32],
  [2, 0.38],
  [3, 0.24],
  [4, 0.06],
]

function pickRooms() {
  const roll = random()
  let sum = 0
  for (const [rooms, weight] of ROOM_WEIGHTS) {
    sum += weight
    if (roll <= sum) return rooms
  }
  return 2
}

/**
 * Признак собственника: сильный, средний, слабый.
 *
 * Считается не броском монеты, а по тем же правилам, что показаны в продукте:
 * одна публикация с одним номером — сильный признак; две-три публикации
 * с одним номером — средний; больше публикаций либо несколько номеров —
 * слабый. Иначе значок противоречил бы числам рядом с ним.
 */
function ownerSignal(publications, phones) {
  if (publications === 1 && phones === 1) return 'strong'
  if (publications <= 3 && phones === 1) return 'medium'
  return 'weak'
}

/**
 * Отклонение от медианы района в процентах, целое.
 *
 * Мёртвая зона ±5 % — правило продукта: внутри неё пишется «≈ рынок»,
 * потому что разница в четыре процента о цене ничего не говорит.
 */
function deviation(pricePerMeter, median) {
  return Math.round(((pricePerMeter - median) / median) * 100)
}

/** «14 минут назад», «3 часа назад», «2 дня назад» — как в файле. */
function freshnessLabel(minutes) {
  if (minutes < 60) return `${minutes} ${plural(minutes, 'минута', 'минуты', 'минут')}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${plural(hours, 'час', 'часа', 'часов')}`
  const days = Math.floor(hours / 24)
  return `${days} ${plural(days, 'день', 'дня', 'дней')}`
}

function plural(count, one, few, many) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** Цена в формате продукта: «8,6 млн ₽». */
function priceLabel(price) {
  return `${(price / 1_000_000).toFixed(1).replace('.', ',')} млн ₽`
}

const houses = new Map()

function makeAddress(district) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const street = pick(district.streets)
    const house = intBetween(1, 132)
    const address = `${street}, ${house}`
    if (!houses.has(address)) {
      houses.set(address, true)
      return address
    }
  }
  return `${pick(district.streets)}, ${intBetween(133, 220)}`
}

const totalShare = DISTRICTS.reduce((sum, d) => sum + d.share, 0)
const listings = []
let counter = 0

for (const district of DISTRICTS) {
  const count = Math.round((district.share / totalShare) * TOTAL)

  for (let i = 0; i < count; i += 1) {
    counter += 1
    const rooms = pickRooms()
    const [areaMin, areaMax] = AREA_BY_ROOMS[rooms]
    const area = Math.round(between(areaMin, areaMax))

    // Разброс цены вокруг медианы района: большинство объектов рядом с ней,
    // меньшинство заметно ниже или выше. Это и даёт колонку отклонений,
    // в которой есть что искать.
    const spread = between(-0.22, 0.26)
    const pricePerMeter = Math.round(district.median * (1 + spread))
    const price = Math.round((pricePerMeter * area) / 100_000) * 100_000

    const publications = random() < 0.55 ? 1 : intBetween(2, 4)
    const phones = publications === 1 ? 1 : random() < 0.7 ? 1 : 2
    const platforms = Math.min(publications, intBetween(1, 3))

    const minutes = Math.floor(between(6, 60 * 24 * 5) ** 0.92)
    const floors = pick([5, 9, 9, 12, 16, 25])
    const floor = intBetween(1, floors)

    listings.push({
      id: `obj-${String(counter).padStart(3, '0')}`,
      address: makeAddress(district),
      district: district.id,
      districtName: district.name,
      metro: pick(district.metro),
      metroMinutes: intBetween(3, 18),
      rooms,
      area,
      floor,
      floors,
      price,
      pricePerMeter,
      priceLabel: priceLabel(price),
      deviation: deviation(pricePerMeter, district.median),
      freshnessMinutes: minutes,
      freshness: freshnessLabel(minutes),
      publications,
      platforms,
      platform: pick(PLATFORMS),
      phones,
      strength: ownerSignal(publications, phones),
    })
  }
}

/**
 * Подгонка медианы района к той, что напечатана на лендинге.
 *
 * Без этого шага медиана набора уходила от обещанной на 1–5 %: разброс цен
 * случайный, и на полусотне объектов середина не попадает точно. Пять
 * процентов — это ровно ширина мёртвой зоны отклонения, то есть ошибка,
 * способная перекрасить колонку «≈ рынок» в «▲ +6 %».
 *
 * Поэтому цены района домножаются на отношение «обещанная медиана к
 * получившейся». Разброс объектов между собой сохраняется, а середина
 * встаёт на своё место — и лендинг перестаёт спорить с выдачей.
 */
for (const district of DISTRICTS) {
  const inDistrict = listings.filter((item) => item.district === district.id)
  const sorted = inDistrict.map((item) => item.pricePerMeter).sort((a, b) => a - b)
  const actual = sorted[Math.floor(sorted.length / 2)]
  const factor = district.median / actual

  for (const item of inDistrict) {
    item.pricePerMeter = Math.round(item.pricePerMeter * factor)
    item.price = Math.round((item.pricePerMeter * item.area) / 100_000) * 100_000
    item.priceLabel = priceLabel(item.price)
    item.deviation = deviation(item.pricePerMeter, district.median)
  }
}

listings.sort((a, b) => a.freshnessMinutes - b.freshnessMinutes)

/** Проверка: медиана ₽/м² по каждому району обязана сойтись с лендингом. */
const report = []
for (const district of DISTRICTS) {
  const values = listings
    .filter((item) => item.district === district.id)
    .map((item) => item.pricePerMeter)
    .sort((a, b) => a - b)
  const median = values[Math.floor(values.length / 2)]
  const drift = Math.round(((median - district.median) / district.median) * 100)
  report.push(
    `${district.name.padEnd(18)} объектов ${String(values.length).padStart(3)}  медиана ${median}  против ${district.median}  расхождение ${drift} %`,
  )
}

const header = `/**
 * Демонстрационный набор объектов кабинета — ${listings.length} штук.
 *
 * **Файл собран скриптом \`scripts/generate-listings.mjs\` и правится только им.**
 * Медиана ₽/м² каждого района сходится с таблицей на лендинге и с
 * \`DEMO-DATA.md\`: сайт обещает «Калининский, медиана 205 тыс ₽/м²», и выдача
 * обязана это подтверждать, иначе продукт врёт на собственной витрине.
 *
 * **Телефонов здесь нет.** Номер собственника — персональные данные живого
 * человека, и в открытой демонстрации ему делать нечего. Раскрытие показывает
 * номер из несуществующего диапазона, собранный на лету по номеру объекта.
 * Когда за продуктом появится настоящая база, номера придут из неё, и ни один
 * из них не окажется в репозитории.
 *
 * Отклонение считается от медианы своего района, мёртвая зона ±5 %.
 */

export type Listing = {
  id: string
  address: string
  district: string
  districtName: string
  metro: string
  metroMinutes: number
  rooms: number
  area: number
  floor: number
  floors: number
  price: number
  pricePerMeter: number
  priceLabel: string
  /** Отклонение от медианы района в процентах. */
  deviation: number
  freshnessMinutes: number
  freshness: string
  publications: number
  platforms: number
  platform: string
  phones: number
  strength: 'strong' | 'medium' | 'weak'
}

export const LISTINGS: Listing[] = `

await writeFile(
  'webapp/src/data/listings.ts',
  header + JSON.stringify(listings, null, 2) + '\n',
  'utf8',
)

console.log(`объектов: ${listings.length}`)
console.log(report.join('\n'))
