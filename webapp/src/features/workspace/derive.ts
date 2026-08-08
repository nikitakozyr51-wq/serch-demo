import type { CallRecord, Disclosure, Workspace } from "./store"

/**
 * Всё, что раньше было вписано числом, а теперь считается.
 *
 * Правило одно: **если число можно посчитать, его нельзя вписывать.**
 * Вписанное «потрачено за 30 дней 35 422 ₽» не менялось никогда — ни от
 * раскрытий, ни от возвратов, — и первым выдавало, что кабинет нарисован.
 *
 * Считать здесь, а не на экранах, приходится потому, что одно и то же число
 * стоит в нескольких местах: потраченное за месяц видно и в шапке баланса,
 * и в отчёте эффективности. Две формулы разошлись бы на первой же правке,
 * и разошлись бы молча.
 */

const DAY = 24 * 60 * 60 * 1000

/** Начало сегодняшних суток по местному времени зрителя. */
export function startOfToday(now: number): number {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Раскрытия, за которые в итоге заплатили.
 *
 * Возвращённые не считаются: деньги вернулись на счёт, и включать их в
 * «потрачено» значило бы показывать расход, которого нет. Пробные не
 * считаются тоже — они ничего не стоили.
 */
export function paidDisclosures(workspace: Workspace): Disclosure[] {
  return workspace.disclosures.filter((item) => !item.trial && !item.refunded)
}

/** Потрачено за период, в рублях. */
export function spentSince(workspace: Workspace, since: number): number {
  return paidDisclosures(workspace)
    .filter((item) => item.at >= since)
    .reduce((sum, item) => sum + item.amount, 0)
}

export function spentLast30Days(workspace: Workspace, now: number): number {
  return spentSince(workspace, now - 30 * DAY)
}

export function spentToday(workspace: Workspace, now: number): number {
  return spentSince(workspace, startOfToday(now))
}

/** Сколько раскрытий сделано за период — включая пробные и возвращённые. */
export function disclosedSince(workspace: Workspace, since: number): number {
  return workspace.disclosures.filter((item) => item.at >= since).length
}

/** Раскрыт ли контакт по этому объекту. За второй раз агентство не платит. */
export function isDisclosed(workspace: Workspace, address: string): boolean {
  return workspace.disclosures.some((item) => item.address === address)
}

/** Кто раскрыл контакт по объекту и когда. Нужно строке «раскрыт коллегой». */
export function disclosureOf(workspace: Workspace, address: string): Disclosure | undefined {
  return workspace.disclosures.find((item) => item.address === address)
}

/**
 * Последний исход по объекту.
 *
 * Записей о звонках по одному объекту бывает несколько — перезванивали. Строку
 * выдачи и «Сегодня» интересует последняя: она отвечает на вопрос «на чём
 * остановились».
 */
export function lastCall(workspace: Workspace, address: string): CallRecord | undefined {
  return workspace.calls.find((item) => item.address === address)
}

/** Перезвоны, назначенные на сегодня или просроченные. */
export function callbacksDue(workspace: Workspace, now: number): CallRecord[] {
  const end = startOfToday(now) + DAY
  return workspace.calls
    .filter((item) => item.remindAt !== undefined && item.remindAt < end)
    .filter((item) => {
      // Перезвон снимается, когда по объекту появилась запись ПОЗЖЕ него:
      // значит человеку уже перезвонили, и напоминание отработало.
      const later = workspace.calls.find(
        (other) => other.address === item.address && other.at > item.at,
      )
      return later === undefined
    })
    .sort((a, b) => (a.remindAt ?? 0) - (b.remindAt ?? 0))
}

/**
 * Взяты в работу и не прозвонены.
 *
 * Контакт раскрыт — деньги потрачены, — а звонка по нему нет ни одного. Это
 * и есть «простой»: заплатили и не воспользовались. Отчёт руководителя
 * начинается именно с этого числа, а не с метрик.
 */
export function takenNotCalled(workspace: Workspace): Disclosure[] {
  return workspace.disclosures.filter(
    (item) => !workspace.calls.some((call) => call.address === item.address),
  )
}

/** Счёт дня: звонки, диалоги, встречи, раскрытия. */
export function todayTally(workspace: Workspace, now: number) {
  const since = startOfToday(now)
  const calls = workspace.calls.filter((item) => item.at >= since)

  return {
    calls: calls.length,
    dialogs: calls.filter((item) => item.outcome === "дозвонился").length,
    disclosures: workspace.disclosures.filter((item) => item.at >= since).length,
    spent: spentToday(workspace, now),
  }
}

/**
 * Воронка за период: раскрыто → дозвонов → отказов.
 *
 * Встреч и договоров в наборе исходов нет, и придумывать их здесь нельзя:
 * продукт фиксирует разговор, а не сделку. Пока в панели звонка нет исхода
 * «договорились о встрече», строки «Встреч» в воронке быть не должно —
 * иначе она всегда будет нулевой и будет выглядеть поломкой.
 */
export function funnel(workspace: Workspace, now: number, days: number) {
  const since = now - days * DAY
  const disclosures = workspace.disclosures.filter((item) => item.at >= since)
  const calls = workspace.calls.filter((item) => item.at >= since)

  return {
    disclosed: disclosures.length,
    reached: calls.filter((item) => item.outcome === "дозвонился").length,
    refused: calls.filter((item) => item.outcome === "отказ").length,
    brokers: calls.filter((item) => item.outcome === "посредник").length,
    spent: spentSince(workspace, since),
  }
}

/**
 * Сколько возвратов по спорным причинам агентство может взять за 30 дней.
 *
 * Число живёт здесь, а не на экране возвратов: до этого «12» стояло двумя
 * копиями в подписи и в полосе заполнения, а сам лимит не проверялся нигде —
 * то есть продукт печатал ограничение, которого не исполнял. Теперь на это
 * число смотрят и надпись, и дверь возврата, и разъехаться им негде.
 */
export const SUBJECTIVE_REFUND_LIMIT = 12

/** Возвраты по спорным причинам за 30 дней — те, что считаются в лимит. */
export function subjectiveRefunds(workspace: Workspace, now: number): number {
  return workspace.refunds.filter((item) => !item.objective && item.at >= now - 30 * DAY).length
}

/**
 * Очередь прозвона: что режим «Прозвон» пройдёт подряд.
 *
 * Живёт здесь, а не в экране прозвона, потому что ответ нужен ДВУМ экранам.
 * «Сегодня» решает по ней, жива ли главная кнопка, а прозвон — по чему идти.
 * Пока правило было записано только внутри `/call`, кнопка на «Сегодня»
 * гасла по совсем другому условию — «своё ли это агентство», — то есть
 * всегда, и главное действие экрана не работало ни разу.
 *
 * Порядок не случаен: сперва назначенные перезвоны (у них есть время, и оно
 * проходит), потом взятые в работу и не прозвоненные. Стоп-лист вычитается
 * последним: по этим номерам звонить нельзя ни одной ролью.
 */
export function callQueue(workspace: Workspace, now: number): string[] {
  const due = callbacksDue(workspace, now).map((item) => item.address)
  const taken = takenNotCalled(workspace).map((item) => item.address)
  const all = [...due, ...taken.filter((address) => !due.includes(address))]
  return all.filter((address) => !workspace.stopList.includes(address))
}

/**
 * Дата и время для показа: «24.07, 14:12».
 *
 * Формат один на весь кабинет и живёт здесь, а не в каждом экране: восемь
 * таблиц с восемью написанными руками форматами разъезжаются молча.
 */
export function formatMoment(at: number): string {
  const date = new Date(at)
  const two = (value: number) => String(value).padStart(2, "0")
  return `${two(date.getDate())}.${two(date.getMonth() + 1)}, ${two(date.getHours())}:${two(date.getMinutes())}`
}

/**
 * «суббота, 8 августа» — подпись сегодняшнего дня.
 *
 * Стояла вписанной строкой «пятница, 24 июля» в шапке «Сегодня» и не менялась
 * никогда: экран, который называется днём, показывал чужой день. Дата в этом
 * месте — единственная опора человека на вопрос «это точно про сегодня?»,
 * и врать в ней хуже, чем не показывать вовсе.
 *
 * День недели и месяц идут через `Intl`, а не таблицей из двенадцати строк:
 * падежи месяцев («8 августа», а не «8 август») браузер знает сам, а таблица
 * их бы потеряла на первом же ноябре.
 */
const DAY_FORMAT = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" })

export function formatWeekday(at: number): string {
  return DAY_FORMAT.format(new Date(at))
}

/** «сегодня, 09:12» — там, где важнее день, чем дата. */
export function formatDay(at: number, now: number): string {
  const today = startOfToday(now)
  const two = (value: number) => String(value).padStart(2, "0")
  const time = `${two(new Date(at).getHours())}:${two(new Date(at).getMinutes())}`

  if (at >= today) return `сегодня, ${time}`
  if (at >= today - DAY) return `вчера, ${time}`
  return formatMoment(at)
}

/**
 * «14 минут назад» — свежесть.
 *
 * Продукт обещает, что объявление собственника живёт час-два до того, как его
 * найдут все. Свежесть поэтому измеряется минутами, а не датой.
 */
export function formatAgo(minutes: number): string {
  if (minutes < 60) return `${minutes} ${plural(minutes, "минута", "минуты", "минут")}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${plural(hours, "час", "часа", "часов")}`
  const days = Math.floor(hours / 24)
  return `${days} ${plural(days, "день", "дня", "дней")}`
}

function plural(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = count % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}
