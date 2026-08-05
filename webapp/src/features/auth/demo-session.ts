import { useSyncExternalStore } from "react"

/**
 * Сеанс демонстрационного кабинета.
 *
 * **Бэкенда за этим нет, и это сказано прямо.** Продукт показывают агентствам
 * до того, как написан сервер: человек открывает ссылку, создаёт агентство,
 * заходит в кабинет и работает — но всё, что он вводит, живёт в его же
 * браузере и никуда не уходит. Ни одна форма не отправляет данные на сервер,
 * потому что сервера нет.
 *
 * **Почему не «просто пустить всех в кабинет».** Вход — часть продукта,
 * а не формальность: агент видит своё имя в шапке, руководитель видит своё
 * агентство, «Выйти» действительно выходит. Демонстрация, где кнопка «Войти»
 * ничего не меняет, показывает картинку, а не систему.
 *
 * Хранилище — `localStorage`, потому что сеанс обязан переживать перезагрузку
 * страницы: человек показывает кабинет коллегам, случайно жмёт F5 и не должен
 * оказаться на входе заново.
 */

const KEY = "serch.demo.session"

export type DemoSession = {
  /**
   * Откуда взялось агентство.
   *
   * `demo` — вошли в готовое агентство «Невский проспект»: пять сотрудников,
   * история списаний, подборки, задачи на сегодня. Это витрина работающего
   * продукта, и она нужна: показать пустой экран агентству, которое пришло
   * смотреть систему, значит не показать ничего.
   *
   * `own` — агентство создали здесь и сейчас. Тогда в нём НЕТ ничего чужого:
   * один сотрудник (тот, кто зарегистрировался), ноль на счету, пустая
   * история, ни одной подборки. Владелец сформулировал это прямо: «агентство
   * выглядит, будто зашёл в готовое чужое» — так и было, потому что оба входа
   * приводили к одним и тем же выдуманным данным.
   *
   * Разница между входом и регистрацией — это и есть разница между «показать»
   * и «начать работать», и она обязана быть видна с первого экрана.
   */
  kind: "demo" | "own"
  /** Полное имя, как его вводили при регистрации: «Смирнова Ирина». */
  name: string
  /** Инициалы для аватара в шапке: «ИС». */
  initials: string
  email: string
  agency: string
  /** Руководитель видит разделы агентства, агент — нет. */
  role: "owner" | "agent"
  /** Остаток на счету агентства в рублях. */
  balance: number
  /** Осталось пробных раскрытий. Пока они есть, деньги не списываются. */
  trial: number
  /** Адреса объектов, контакты которых уже раскрыты. */
  disclosed: string[]
}

const DEMO: DemoSession = {
  kind: "demo",
  name: "Смирнова Ирина",
  initials: "ИС",
  email: "i.smirnova@nevsky.ru",
  agency: "Невский проспект",
  role: "owner",
  balance: 8610,
  trial: 0,
  disclosed: [],
}

/**
 * Инициалы по правилу продукта «фамилия, имя» → ИС, МЛ, АТ.
 *
 * Одно слово даёт одну букву: «Ирина» → И, а не «ИИ». Пустая строка даёт
 * пустые инициалы, и аватар остаётся пустым кружком — это честнее, чем
 * подставить вопросительный знак.
 */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

let current: DemoSession | null = read()
const listeners = new Set<() => void>()

function read(): DemoSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as DemoSession
    // Записи, сделанные до появления `kind`, ничего о происхождении агентства
    // не знают. Считаем их демонстрационными: так человек, у которого сеанс
    // уже лежал в браузере, видит ровно то же, что видел вчера, а не внезапно
    // опустевший кабинет.
    return stored.kind ? stored : { ...stored, kind: "demo" }
  } catch {
    // Битая запись — не повод падать: в демонстрации это стоило бы белого
    // экрана на глазах у зрителей. Считаем, что сеанса нет.
    return null
  }
}

function write(next: DemoSession | null) {
  current = next
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next))
    else window.localStorage.removeItem(KEY)
  } catch {
    // Приватный режим браузера запрещает запись. Сеанс тогда живёт до
    // перезагрузки — это хуже, но работать не мешает.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot() {
  return current
}

/** Войти под демонстрационным руководителем: почта и пароль не проверяются. */
export function signIn(email?: string) {
  write({ ...DEMO, email: email?.trim() || DEMO.email })
}

/**
 * Создать агентство.
 *
 * Пробный старт — пять раскрытий и ноль рублей на счету: ровно то, что обещает
 * лендинг. Первый вход поэтому выглядит иначе, чем вход в работающее
 * агентство, и это не украшение, а разные состояния продукта.
 */
export function signUp(input: { name: string; email: string; agency: string }) {
  write({
    kind: "own",
    name: input.name.trim() || DEMO.name,
    initials: initialsOf(input.name) || DEMO.initials,
    email: input.email.trim() || DEMO.email,
    agency: input.agency.trim() || DEMO.agency,
    role: "owner",
    balance: 0,
    trial: 5,
    disclosed: [],
  })
}

export function signOut() {
  write(null)
}

/**
 * Раскрыть контакт: 199 ₽ либо одно пробное раскрытие.
 *
 * Повторное раскрытие того же объекта не стоит ничего — правило продукта,
 * а не защита от двойного нажатия: «если номер уже открывал коллега, второй
 * раз агентство не платит».
 */
export function disclose(address: string): "already" | "trial" | "paid" | "no-money" {
  if (!current) return "no-money"
  if (current.disclosed.includes(address)) return "already"

  if (current.trial > 0) {
    write({ ...current, trial: current.trial - 1, disclosed: [...current.disclosed, address] })
    return "trial"
  }

  if (current.balance < 199) return "no-money"

  write({
    ...current,
    balance: current.balance - 199,
    disclosed: [...current.disclosed, address],
  })
  return "paid"
}

/** Пополнить счёт. В демонстрации деньги приходят сразу. */
export function topUp(amount: number) {
  if (!current) return
  write({ ...current, balance: current.balance + amount })
}

/**
 * Телефон собственника.
 *
 * **Номера настоящих людей в демонстрацию не попадают.** Здесь он собирается
 * из идентификатора объекта в диапазоне, которого не существует у операторов
 * связи: код 900 зарезервирован и абонентам не выдаётся. Позвонить по такому
 * номеру нельзя, а выглядит он как обычный.
 */
export function demoPhone(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const a = String(hash % 1000).padStart(3, "0")
  const b = String((hash >>> 10) % 100).padStart(2, "0")
  const c = String((hash >>> 17) % 100).padStart(2, "0")
  return `+7 900 ${a}-${b}-${c}`
}

/** Текущий сеанс. `null` — человек не вошёл. */
export function useSession(): DemoSession | null {
  return useSyncExternalStore(subscribe, snapshot, () => null)
}

/**
 * Своё ли это агентство.
 *
 * Отвечает на один вопрос, который задают восемь экранов: показывать ли им
 * данные «Невского проспекта» или пустоту нового агентства. Отдельная функция
 * нужна, чтобы условие было записано ОДИН раз: восемь копий `session?.kind ===
 * "own"` разъехались бы на девятом экране, и в новом агентстве осталась бы
 * одна чужая таблица — самая заметная разновидность вранья в демонстрации.
 *
 * Без сеанса — `false`: кабинет туда всё равно не пустит.
 */
export function useOwnAgency(): boolean {
  return useSession()?.kind === "own"
}

/**
 * Действия сеанса одним объектом — чтобы экран не импортировал пять функций.
 *
 * Объект постоянный: функции живут вне React и не пересоздаются, поэтому
 * заворачивать их в хук памяти незачем — он бы только делал вид, что здесь
 * есть что запоминать.
 */
const ACTIONS = { signIn, signUp, signOut, disclose, topUp } as const

export function useSessionActions() {
  return ACTIONS
}
