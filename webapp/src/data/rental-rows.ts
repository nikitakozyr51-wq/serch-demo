import { priceLabel } from "@/features/listings"
import type { SearchRow } from "./search-rows"
import { RENTALS, type Rental } from "./rentals"

/**
 * Аренда в форме строки выдачи.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Строка одна и та же на оба режима — и это решение, а не экономия. Агент
 * читает выдачу одинаково, что бы он ни искал: адрес, цена, отклонение,
 * признак собственника, действие. Вторая форма строки означала бы, что
 * человеку нужно переучиваться при каждом переключении режима.
 *
 * Различий ровно три, и все три обоснованы:
 *
 * 1. **Цена без единицы.** «70 000», а единица — в подписи колонки. Иначе
 *    «₽/мес» повторяется двадцать четыре раза на экране.
 * 2. **Отклонение может отсутствовать.** В аренде объявление живёт дни,
 *    и аналогов набирается меньше восьми у каждого десятого объекта.
 *    Тогда отклонения нет вовсе — см. `ENOUGH_COMPARABLES`.
 * 3. **В мете стоит ремонт, а не этаж отдельной величиной.** В аренде этаж
 *    спрашивают редко, а ремонт — первым делом.
 */

/**
 * Убрать из адреса название округа.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * В выгрузке владельца часть адресов аренды несёт впереди муниципальный
 * округ: «Академическое, Академика Константинова ул, д. 1 к1». Часть —
 * не несёт: «пр. Обуховской Обороны, д. 110 к1». Продажа не несёт никогда.
 *
 * Из-за этого колонка адреса рвалась: соседние строки начинались с разного,
 * а длинные адреса переносились на две строки там, где короткие занимали
 * одну. Владелец назвал это прямо — «текст не по колонке, сжат».
 *
 * Округ при этом не теряется как знание: он лежит в поле `district`, по нему
 * работает фильтр района, а положение объекта человек читает по станции метро
 * в мета-строке. В адресе он был третьим упоминанием того же самого.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ НЕЛЬЗЯ ПРОСТО РЕЗАТЬ ДО ПЕРВОЙ ЗАПЯТОЙ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Запятая есть и в адресе без округа: «пр. Обуховской Обороны, д. 110 к1».
 * Резать по ней значило бы оставить от адреса «д. 110 к1» — дом без улицы.
 *
 * Поэтому голова отбрасывается, только если В ОСТАТКЕ есть признак улицы.
 * Тогда голова — округ, а улица идёт следом. Если признака нет, значит
 * улица и была головой, и трогать нечего.
 */
const STREET = /(^|\s)(ул|улица|пр|проспект|пер|переулок|наб|набережная|дор|дорога|ш|шоссе|б-р|бульвар|аллея|линия|пл|площадь|туп|тупик)\.?(\s|,|$)/i

function withoutDistrict(address: string): string {
  const comma = address.indexOf(", ")
  if (comma === -1) return address
  const tail = address.slice(comma + 2)
  return STREET.test(tail) ? tail : address
}

/** Комнатность аренды: у студии своё слово, «4+» вместо «4-к» и выше. */
function roomsLabel(rooms: number): string {
  if (rooms === 0) return "студия"
  if (rooms >= 4) return "4+"
  return `${rooms}-к`
}

/**
 * Свежесть считается от даты объявления к сегодняшнему дню.
 *
 * Не пишется числом при сборке: иначе через месяц вся аренда была бы
 * «14 минут назад», а через год — «вчера». В аренде это критичнее, чем
 * в продаже: объявление живёт дни.
 */
function freshnessOf(postedAt: number | null, now: number): { minutes: number; label: string } {
  if (postedAt === null) return { minutes: 60 * 24 * 365, label: "дата неизвестна" }

  const minutes = Math.max(1, Math.round((now - postedAt) / 60_000))
  if (minutes < 60) return { minutes, label: `${minutes} мин` }

  const hours = Math.round(minutes / 60)
  if (hours < 24) return { minutes, label: `${hours} ч` }

  const days = Math.round(hours / 24)
  if (days < 31) return { minutes, label: `${days} дн` }

  const months = Math.round(days / 30)
  return { minutes, label: `${months} мес` }
}

/**
 * Признак собственника.
 *
 * В таблице владельца этой оценки нет, и выдумывать её нельзя. Но она
 * ВЫВОДИТСЯ из того, что есть: объявление на одной площадке от частного
 * лица — сильный признак; «Звонок» как источник означает, что собственник
 * позвонил сам; «Недоступно» и «нет данных» — слабый.
 */
function strengthOf(item: Rental): SearchRow["strength"] {
  if (item.platform === "Звонок") return "strong"
  if (item.platform === "Недоступно" || item.platform === "нет данных") return "weak"
  return "medium"
}

function toRow(item: Rental, now: number): SearchRow {
  const fresh = freshnessOf(item.postedAt, now)

  return {
    address: withoutDistrict(item.address),
    price: priceLabel("rent", item.price),
    // Ноль означает «в пределах рынка», а отсутствие аналогов — отдельный
    // случай: у таких объектов отклонения нет вовсе, и колонка молчит.
    deviation: item.deviation,
    freshness: fresh.label,
    meta:
      `· ${item.metro} ${item.metroMinutes} мин · ${roomsLabel(item.rooms)} · ${item.area} м²` +
      `${item.repair === "" ? "" : ` · ${item.repair.toLowerCase()}`} · ${item.platform}`,
    strength: strengthOf(item),
    publications: 1,
    platforms: 1,
    phones: 1,
    district: item.district,
    districtName: item.districtName,
    metro: item.metro,
    rooms: item.rooms,
    area: item.area,
    priceValue: item.price,
    floor: item.floor,
    floors: item.floors,
    metroMinutes: item.metroMinutes,
    freshnessMinutes: fresh.minutes,
    status: "new",
    action: { kind: "disclose", price: 199 },
    // Сколько объектов района дали медиану. Меньше восьми — отклонение
    // не показывается, и строка говорит «мало данных».
    comparables: item.comparables,
  }
}

/**
 * Вся база аренды.
 *
 * Собирается на каждый вызов, а не один раз при загрузке модуля: свежесть
 * зависит от «сейчас», и постоянный список к вечеру начал бы врать на часы.
 */
function rentalRows(now: number): SearchRow[] {
  return RENTALS.map((item) => toRow(item, now))
}

export { rentalRows }
