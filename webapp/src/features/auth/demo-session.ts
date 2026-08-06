import { useSyncExternalStore } from "react"

import {
  closeWorkspace,
  initWorkspace,
  openWorkspace,
  recordDisclosure,
  recordRefund,
  recordTopUp,
} from "@/features/workspace"

/**
 * Сеанс кабинета: кто вошёл.
 *
 * **Бэкенда за этим пока нет, и это сказано прямо.** Продукт показывают
 * агентствам до того, как написан сервер: человек открывает ссылку, создаёт
 * агентство, заходит в кабинет и работает — но всё, что он вводит, живёт в
 * его же браузере и никуда не уходит.
 *
 * **АГЕНТСТВА-ВИТРИНЫ БОЛЬШЕ НЕТ.** Раньше «Войти» открывало готовое
 * «Невский проспект» с пятью сотрудниками и историей списаний. Решение
 * владельца: витрины не будет, агентство заводит и наполняет сам человек.
 * Поэтому вход теперь ищет агентство ПО ПОЧТЕ среди заведённых на этом
 * компьютере — и либо находит, либо честно говорит, что такого нет.
 *
 * Это не упрощение, а восстановление смысла: вход, который пускает кого
 * угодно куда угодно, — не вход, а кнопка «показать картинку».
 *
 * Здесь живёт только личность: имя, почта, агентство, деньги. Всё, что
 * НАРАБОТАНО — раскрытия, звонки, подборки, — лежит в `features/workspace`
 * и переживает выход. Разделено намеренно: сеанс кончается вместе с выходом,
 * работа агентства — нет.
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
  /**
   * Через сколько минут простоя кабинет попросит войти заново.
   *
   * Настройка ЛИЧНАЯ, а не агентства: агент в поле и руководитель за столом
   * работают по-разному. Умолчание 120 — ровно то время, которое называет
   * диалог «Сеанс истёк», и эти два числа обязаны быть одним значением,
   * а не двумя совпадающими.
   */
  idleMinutes: number
}

/**
 * Заведённые на этом компьютере агентства, ключ — почта.
 *
 * Отдельно от текущего сеанса: выход стирает сеанс, но не должен стирать
 * агентство. Иначе человек, вышедший показать вход коллеге, терял бы всю
 * работу — и это была бы потеря данных, а не выход из аккаунта.
 */
const ACCOUNTS_KEY = "serch.accounts"

type Accounts = Record<string, DemoSession>

function readAccounts(): Accounts {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    return raw ? (JSON.parse(raw) as Accounts) : {}
  } catch {
    return {}
  }
}

function saveAccount(session: DemoSession) {
  try {
    const all = readAccounts()
    all[session.email.trim().toLowerCase()] = session
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all))
  } catch {
    // Приватный режим: агентство живёт до закрытия вкладки.
  }
}

/** Есть ли вообще заведённые агентства. Экран входа спрашивает, чтобы
 *  предложить регистрацию вместо бесконечной ошибки. */
export function hasAccounts(): boolean {
  return Object.keys(readAccounts()).length > 0
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

// Сеанс мог пережить перезагрузку страницы. Тогда пространство агентства
// обязано открыться вместе с ним, иначе кабинет покажет пустые журналы
// человеку, который вчера наработал полный.
if (current) openWorkspace(current.email)

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
    return {
      ...stored,
      kind: stored.kind ?? "demo",
      idleMinutes: stored.idleMinutes ?? 120,
    }
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

/**
 * Войти.
 *
 * Пароль не проверяется — проверять его нечем, пока нет сервера, и делать
 * вид, что проверяем, нечестно. А вот ПОЧТА проверяется по-настоящему: если
 * агентства с такой почтой на этом компьютере не заводили, вход не
 * происходит, и экран говорит об этом.
 *
 * Возвращает `false`, когда агентство не найдено. Экран решает, что показать.
 */
export function signIn(email?: string): boolean {
  const key = (email ?? "").trim().toLowerCase()
  if (!key) return false

  const stored = readAccounts()[key]
  if (!stored) return false

  write({ ...stored, idleMinutes: stored.idleMinutes ?? 120, kind: "own" })
  openWorkspace(key)
  return true
}

/**
 * Создать агентство.
 *
 * Пробный старт — пять раскрытий и ноль рублей на счету: ровно то, что обещает
 * лендинг. Первый вход поэтому выглядит иначе, чем вход в работающее
 * агентство, и это не украшение, а разные состояния продукта.
 */
export function signUp(input: { name: string; email: string; agency: string }) {
  const name = input.name.trim() || "Руководитель"
  const email = input.email.trim().toLowerCase() || "owner@example.com"
  const session: DemoSession = {
    kind: "own",
    name,
    initials: initialsOf(name) || "Р",
    email,
    agency: input.agency.trim() || "Моё агентство",
    role: "owner",
    balance: 0,
    trial: 5,
    disclosed: [],
    idleMinutes: 120,
  }

  saveAccount(session)
  write(session)
  openWorkspace(email)
  initWorkspace({ name: session.name, initials: session.initials, email: session.email })
}

export function signOut() {
  if (current) saveAccount(current)
  closeWorkspace()
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

  // Каждое раскрытие попадает в журнал — с временем, суммой и автором.
  // Без этого экран денег нечем наполнить: голый список адресов не отвечает
  // ни на «когда», ни на «сколько», ни на «кто».
  if (current.trial > 0) {
    const next = { ...current, trial: current.trial - 1, disclosed: [...current.disclosed, address] }
    write(next)
    saveAccount(next)
    recordDisclosure({ address, amount: 0, by: current.name, trial: true })
    return "trial"
  }

  if (current.balance < 199) return "no-money"

  const next = {
    ...current,
    balance: current.balance - 199,
    disclosed: [...current.disclosed, address],
  }
  write(next)
  saveAccount(next)
  recordDisclosure({ address, amount: 199, by: current.name, trial: false })
  return "paid"
}

/**
 * Сменить время простоя.
 *
 * Хранится в сеансе, а не в отдельном ключе: это настройка человека, и она
 * обязана уезжать вместе с ним при выходе. Отдельный ключ пережил бы выход
 * и достался бы следующему вошедшему на этом же компьютере.
 */
export function setIdleMinutes(minutes: number) {
  if (!current) return
  const next = { ...current, idleMinutes: minutes }
  write(next)
  saveAccount(next)
}

/**
 * Пополнить счёт.
 *
 * Настоящий приход денег требует платёжного сервиса, которого нет. Здесь
 * пополнение зачисляется сразу — и записывается в журнал, чтобы вкладка
 * «Пополнения» показывала ваши пополнения, а не выдуманные.
 */
export function topUp(amount: number, method = "карта") {
  if (!current) return
  const next = { ...current, balance: current.balance + amount }
  write(next)
  saveAccount(next)
  recordTopUp({ amount, method })
}

/**
 * Возврат за брак: 199 ₽ возвращаются на счёт.
 *
 * Раскрытие при этом НЕ стирается — journal обязан помнить, что к номеру
 * обращались, даже если за это в итоге не заплатили. Стереть запись значило
 * бы потерять ответ проверяющему.
 */
export function refund(address: string, reason: string, objective: boolean) {
  if (!current) return
  const next = { ...current, balance: current.balance + 199 }
  write(next)
  saveAccount(next)
  recordRefund({ address, amount: 199, reason, objective, by: current.name })
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
  // Ответ перестал быть двузначным: витрины «Невский проспект» больше нет,
  // и у вошедшего всегда СВОЁ агентство. Функция осталась потому, что на неё
  // опираются двадцать экранов, и вопрос они задают правильный: «показывать
  // мои данные или чужие?». Она уйдёт вместе с последней вычищенной чужой
  // константой; удалить её сейчас и править двадцать файлов значило бы
  // рискнуть тем, что один экран останется с чужой веткой.
  return useSession() !== null
}

/**
 * Действия сеанса одним объектом — чтобы экран не импортировал пять функций.
 *
 * Объект постоянный: функции живут вне React и не пересоздаются, поэтому
 * заворачивать их в хук памяти незачем — он бы только делал вид, что здесь
 * есть что запоминать.
 */
const ACTIONS = { signIn, signUp, signOut, disclose, topUp, refund, setIdleMinutes } as const

export function useSessionActions() {
  return ACTIONS
}
