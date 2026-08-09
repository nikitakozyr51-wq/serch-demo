import { useRouterState } from "@tanstack/react-router"
import { useSyncExternalStore } from "react"

import {
  SUBJECTIVE_REFUND_LIMIT,
  closeWorkspace,
  currentWorkspace,
  disclosureOf,
  initWorkspace,
  joinWorkspace,
  openWorkspace,
  recordDisclosure,
  recordRefund,
  recordTopUp,
  setMoney,
  subjectiveRefunds,
} from "@/features/workspace"
import { hasDatabase } from "@/platform/db"
import { createInvite, findInvite, markInviteAccepted, type InviteProblem } from "./invites"
import {
  acceptInviteRemote,
  inviteAgent,
  loadIdentity,
  signInRemote,
  signOutRemote,
  signUpRemote,
} from "./remote"

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

/**
 * Цена раскрытого контакта.
 *
 * Живёт в слое денег, а не на экранах: до этого «199» стояло копиями
 * в списании, в возврате и на двух экранах баланса, а выдача про цену не
 * знала вовсе и поэтому не умела сказать «денег не хватает». Один источник
 * отвечает и на «сколько списать», и на «остановлено ли раскрытие».
 */
export const DISCLOSURE_PRICE = 199

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
  /**
   * Чьё пространство открывать — почта ВЛАДЕЛЬЦА агентства.
   *
   * У того, кто завёл агентство сам, она совпадает с собственной. У того,
   * кого позвали, — это почта позвавшего, и именно поэтому он видит журналы,
   * людей, подборки и счёт ЧУЖОГО агентства, а не заводит себе пустое.
   *
   * Поле необязательное ради записей, сделанных до его появления: у них
   * ключом остаётся собственная почта, и кабинет открывается как вчера.
   */
  agencyKey?: string
}

/** Чьё пространство агентства открывает этот сеанс. */
function agencyKeyOf(session: DemoSession): string {
  return (session.agencyKey ?? session.email).trim().toLowerCase()
}

/**
 * Подтянуть в сеанс деньги агентства.
 *
 * Счёт лежит в пространстве агентства — он общий на всех сотрудников, —
 * а сеанс показывает его зеркалом, чтобы двадцать экранов продолжали читать
 * `session.balance` и ничего про переезд не знали.
 */
function mirrorMoney() {
  if (!current) return
  const { balance, trial } = currentWorkspace()
  if (current.balance === balance && current.trial === trial) return
  write({ ...current, balance, trial })
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
if (current) {
  openWorkspace(agencyKeyOf(current))
  adoptMoney(current)
}

/**
 * Перенести деньги старой записи в пространство агентства.
 *
 * Записи, сделанные до переезда счёта, держат его в сеансе, а в пространстве
 * стоит ноль. Без переноса человек, у которого вчера было восемь тысяч,
 * увидел бы сегодня ноль — то есть правка съела бы его деньги. Перенос
 * делается один раз: как только в пространстве появились непустые деньги
 * или хоть одно движение по счёту, оно и есть правда.
 */
function adoptMoney(session: DemoSession) {
  const workspace = currentWorkspace()
  const untouched =
    workspace.balance === 0
    && workspace.trial === 0
    && workspace.disclosures.length === 0
    && workspace.topUps.length === 0
  if (untouched && (session.balance !== 0 || session.trial !== 0)) {
    setMoney({ balance: session.balance, trial: session.trial })
    return
  }
  mirrorMoney()
}

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
/**
 * Войти.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ДВА ПУТИ, ОДНА ДВЕРЬ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Есть база — вход настоящий: почта и пароль проверяются сервером, и чужой
 * пароль не подойдёт. Нет базы (демонстрация на GitHub Pages) — вход находит
 * агентство, заведённое на этом же компьютере. Пароль там не проверяется,
 * и проверять его нечем: сервера нет, а «проверка» в браузере — это театр,
 * который создаёт ложное чувство защиты.
 *
 * Экраны входа при этом одни и те же, и человек разницы не видит. Разницу
 * видит тот, кто попробует войти с другого устройства: с базой — войдёт,
 * без базы — нет.
 *
 * Возвращает текст ошибки или `null`, если вошли.
 */
export async function signIn(email?: string, password = ""): Promise<string | null> {
  const key = (email ?? "").trim().toLowerCase()
  if (!key) return "Введите почту"

  if (hasDatabase()) {
    const failed = await signInRemote(key, password)
    if (failed !== null) return failed

    const identity = await loadIdentity()
    if (identity === null) return "Этот человек ещё не состоит в агентстве"

    write({
      kind: "own",
      name: identity.name,
      initials: identity.initials,
      email: identity.email,
      agency: identity.agency,
      role: identity.role,
      balance: identity.balance,
      trial: identity.trial,
      disclosed: [],
      idleMinutes: 120,
    })
    openWorkspace(identity.email)
    // Счёт приехал вместе с личностью: кладём его в пространство агентства,
    // откуда его читают списание, возврат и плашка нулевого баланса.
    setMoney({ balance: identity.balance, trial: identity.trial })
    return null
  }

  const stored = readAccounts()[key]
  if (!stored) return "Агентство с такой почтой на этом компьютере не заводили"

  const session = { ...stored, idleMinutes: stored.idleMinutes ?? 120, kind: "own" as const }
  write(session)
  openWorkspace(agencyKeyOf(session))
  adoptMoney(session)
  return null
}

/**
 * Создать агентство.
 *
 * Пробный старт — пять раскрытий и ноль рублей на счету: ровно то, что обещает
 * лендинг. Первый вход поэтому выглядит иначе, чем вход в работающее
 * агентство, и это не украшение, а разные состояния продукта.
 */
export async function signUp(input: {
  name: string
  email: string
  agency: string
  password?: string
}): Promise<string | null> {
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

  if (hasDatabase()) {
    /**
     * С базой регистрация — это два действия: завести человека и завести
     * агентство. Второе делает сама база одной функцией: двумя запросами
     * из браузера оно ломается посередине — агентство есть, сотрудников нет,
     * и создатель попасть в него уже не может.
     */
    const failed = await signUpRemote({
      email,
      password: input.password ?? "",
      name: session.name,
      initials: session.initials,
      agency: session.agency,
    })
    if (failed === "confirm-email") return "confirm-email"
    if (failed !== null) return failed

    write(session)
    openWorkspace(email)
    setMoney({ balance: session.balance, trial: session.trial })
    return null
  }

  saveAccount(session)
  write(session)
  openWorkspace(email)
  initWorkspace(
    { name: session.name, initials: session.initials, email: session.email },
    { balance: session.balance, trial: session.trial },
  )
  return null
}

/**
 * Позвать сотрудника. Возвращает КЛЮЧ приглашения или текст отказа.
 *
 * Та же развилка, что у входа и регистрации: есть база — зовём сервер, нет —
 * заводим приглашение в браузере. До этой правки второй ветки не было вовсе,
 * и в демонстрации путь приглашения не начинался: кнопка отвечала «База
 * не настроена», ссылки не появлялось.
 */
export async function invite(input: {
  name: string
  email: string
  role: "owner" | "agent"
  limit: number | null
}): Promise<{ token: string } | { failed: string }> {
  if (!current) return { failed: "Сеанс не найден" }

  if (hasDatabase()) return inviteAgent(input.email, input.name, input.limit)

  const created = createInvite({
    agencyKey: agencyKeyOf(current),
    agency: current.agency,
    name: input.name,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    limit: input.limit,
  })
  return { token: created.token }
}

/** Отказ приглашения человеческими словами. */
const INVITE_PROBLEM: Record<InviteProblem, string> = {
  "not-found": "Приглашение не найдено. Попросите руководителя прислать новое",
  expired: "Срок приглашения истёк — попросите руководителя прислать новое",
  used: "Это приглашение уже принято",
}

/**
 * Принять приглашение — попасть в ЧУЖОЕ агентство, а не завести своё.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Разница не техническая, и до этой правки путь был вывернут наизнанку.
 * Обычная регистрация делает человека руководителем СВОЕЙ конторы; здесь его
 * зовут в чужую — на общий счёт, с чужой вывеской и своим дневным лимитом.
 * Без базы код шёл общим путём и заводил приглашённому пустое агентство
 * «Моё агентство» с нулём на счету, где он оказывался ВЛАДЕЛЬЦЕМ, а ключ
 * приглашения не читался ни разу. Руководитель при этом не видел его в списке
 * сотрудников никогда.
 *
 * Ключ к чужому агентству — `agencyKey`: по нему открывается пространство
 * позвавшего, и оттуда же берутся журналы, люди, подборки и счёт.
 *
 * Возвращает текст ошибки или `null`, если вошли.
 */
export async function acceptInvite(
  token: string,
  input: { name: string; email: string; password?: string },
): Promise<string | null> {
  const name = input.name.trim() || "Сотрудник"
  const email = input.email.trim().toLowerCase()

  if (hasDatabase()) {
    return acceptInviteRemote({ email, password: input.password ?? "", token })
  }

  const found = findInvite(token)
  if ("problem" in found) return INVITE_PROBLEM[found.problem]

  const session: DemoSession = {
    kind: "own",
    name,
    initials: initialsOf(name) || "С",
    email,
    agency: found.invite.agency,
    role: found.invite.role,
    // Деньги общие и лежат в пространстве агентства. Здесь нули — они
    // подтянутся зеркалом сразу после того, как пространство откроется.
    balance: 0,
    trial: 0,
    disclosed: [],
    idleMinutes: 120,
    agencyKey: found.invite.agencyKey,
  }

  saveAccount(session)
  write(session)
  openWorkspace(found.invite.agencyKey)
  joinWorkspace({
    name,
    initials: session.initials,
    email,
    role: found.invite.role,
    limit: found.invite.limit,
  })
  markInviteAccepted(token)
  mirrorMoney()
  return null
}

export function signOut() {
  if (current) saveAccount(current)
  closeWorkspace()
  write(null)
  // Сеанс сервера закрывается следом: без этого следующее открытие кабинета
  // восстановило бы вход, который человек только что закрыл.
  void signOutRemote()
}

/**
 * Раскрыть контакт: 199 ₽ либо одно пробное раскрытие.
 *
 * Повторное раскрытие того же объекта не стоит ничего — правило продукта,
 * а не защита от двойного нажатия: «если номер уже открывал коллега, второй
 * раз агентство не платит».
 */
export function disclose(
  address: string,
): "already" | "trial" | "paid" | "no-money" | "limit" {
  if (!current) return "no-money"

  const workspace = currentWorkspace()

  /**
   * Дневной лимит агента — до денег, а не после.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Он ставился в карточке сотрудника, показывался в таблице, и окно
   * «дневной лимит исчерпан» было нарисовано и собрано — а здесь его
   * не проверял НИКТО. Руководитель ставил агенту пять раскрытий в сутки,
   * агент делал пятьдесят, и со счёта агентства уходило десять тысяч
   * вместо тысячи. Настройка существовала как обещание.
   *
   * Считается по журналу раскрытий этого человека с начала суток. Не
   * счётчиком в сеансе: счётчик обнуляется вместе с браузером, и лимит
   * снимался бы выходом и повторным входом. Журнал общий, и обойти его
   * нечем.
   *
   * Повторное раскрытие уже оплаченного контакта в лимит НЕ идёт: оно
   * не стоит агентству ничего, а лимит существует ради денег. Поэтому
   * проверка стоит ниже «уже раскрыт»… нет, ВЫШЕ — и вот почему она
   * всё-таки здесь: «уже раскрыт» отвечает мгновенно и денег не трогает,
   * так что порядок между ними не виден. Зато лимит обязан отработать
   * раньше пробных раскрытий: пробные тоже расход, просто оплаченный
   * заранее.
   *
   * Руководителя лимит не касается: у него его нет и быть не может —
   * он и есть тот, кто лимиты ставит.
   */
  const me = workspace.people.find((person) => person.email === current!.email)
  const limit = me?.role === "owner" ? null : (me?.limit ?? null)

  if (limit !== null && disclosureOf(workspace, address) === undefined) {
    const dayStart = new Date().setHours(0, 0, 0, 0)
    const today = workspace.disclosures.filter(
      (item) => item.at >= dayStart && item.by === current!.name,
    ).length
    if (today >= limit) return "limit"
  }

  /**
   * «Уже раскрыт» спрашивается у ЖУРНАЛА АГЕНТСТВА, а не у своего сеанса.
   *
   * Правило продукта звучит так: «если номер уже открывал коллега, второй
   * раз агентство не платит». Пока список раскрытых лежал только в сеансе,
   * коллега про чужие покупки не знал — и агентство платило за один и тот же
   * контакт столько раз, сколько у него сотрудников.
   */
  if (disclosureOf(workspace, address) !== undefined) {
    if (!current.disclosed.includes(address)) {
      write({ ...current, disclosed: [...current.disclosed, address] })
      saveAccount(current)
    }
    return "already"
  }

  // Каждое раскрытие попадает в журнал — с временем, суммой и автором.
  // Без этого экран денег нечем наполнить: голый список адресов не отвечает
  // ни на «когда», ни на «сколько», ни на «кто».
  if (workspace.trial > 0) {
    setMoney({ balance: workspace.balance, trial: workspace.trial - 1 })
    recordDisclosure({ address, amount: 0, by: current.name, trial: true })
    remember(address)
    return "trial"
  }

  if (workspace.balance < DISCLOSURE_PRICE) return "no-money"

  setMoney({ balance: workspace.balance - DISCLOSURE_PRICE, trial: 0 })
  recordDisclosure({ address, amount: DISCLOSURE_PRICE, by: current.name, trial: false })
  remember(address)
  return "paid"
}

/** Запомнить раскрытие в сеансе и подтянуть новый остаток агентства. */
function remember(address: string) {
  if (!current) return
  const { balance, trial } = currentWorkspace()
  const next = {
    ...current,
    balance,
    trial,
    disclosed: current.disclosed.includes(address)
      ? current.disclosed
      : [...current.disclosed, address],
  }
  write(next)
  saveAccount(next)
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
 * Сменить имя человека.
 *
 * Имя показывается в меню профиля, в шапке инициалами и — главное —
 * записывается в журнал вместе с каждым раскрытием и звонком: «кто раскрыл»,
 * «кто отметил отказ». Поэтому оно правится, а не стоит намертво: человек,
 * заведший агентство с опечаткой в фамилии, иначе носил бы её во всех
 * записях навсегда.
 *
 * **Прошлые записи журнала не переписываются.** В них стоит имя на момент
 * действия, и это правильно: журнал доступа отвечает на вопрос «кто это
 * сделал тогда», а не «как он называется сейчас».
 */
export function setName(name: string) {
  if (!current) return
  const trimmed = name.trim()
  if (trimmed === "") return
  const next = { ...current, name: trimmed, initials: initialsOf(trimmed) }
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
  const { balance, trial } = currentWorkspace()
  setMoney({ balance: balance + amount, trial })
  recordTopUp({ amount, method })
  mirrorMoney()
  saveAccount(current)
}

/**
 * Чем кончилась попытка вернуть деньги.
 *
 * `not-paid` — за этот контакт агентство не платило: раскрытия нет вовсе
 * или оно ушло из пробного пакета. `already` — возврат по нему уже взяли.
 * `limit` — исчерпаны двенадцать спорных возвратов за тридцать дней.
 */
export type RefundResult = "ok" | "not-paid" | "already" | "limit"

/**
 * Возврат за брак: 199 ₽ возвращаются на счёт. ЕДИНСТВЕННАЯ ДВЕРЬ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ДВЕРЬ ОБЯЗАНА БЫТЬ ОДНА
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Входов в возврат четыре: чип «Брак» в раскрытой карточке, кнопка в панели
 * прозвона, заявка в разделе денег и отметка на телефоне. До этой правки
 * работал ровно один из них, и работал неправильно — звал ПОПОЛНЕНИЕ:
 * деньги возвращались, но в журнал уходила строка «Картой · 199 ₽», в
 * документы — счёт, которого агентство не оплачивало, а журнал возвратов
 * оставался пустым навсегда. Касса не сходилась: остаток рос, расход не
 * уменьшался.
 *
 * Двойного начисления при этом не было по единственной причине — три входа
 * из четырёх были мертвы. Почини их порознь, и человек получил бы 199 ₽
 * дважды за одно списание. Поэтому проверки живут здесь, а не на экранах:
 * четыре экрана с четырьмя копиями условия разъедутся на пятом.
 *
 * Раскрытие при этом НЕ стирается — журнал обязан помнить, что к номеру
 * обращались, даже если за это в итоге не заплатили. Стереть запись значило
 * бы потерять ответ проверяющему.
 */
export function refund(address: string, reason: string, objective: boolean): RefundResult {
  if (!current) return "not-paid"

  const workspace = currentWorkspace()

  // Возвращают за КОНКРЕТНОЕ списание, а не «вообще». Пробное раскрытие
  // ничего не стоило, и возвращать за него нечего.
  const paid = disclosureOf(workspace, address)
  if (paid === undefined || paid.trial) return "not-paid"
  if (paid.refunded === true) return "already"

  // Объективные причины в лимит не считаются: номер не существует, объект
  // продан, согласие отозвано — тут агентство не виновато.
  if (!objective && subjectiveRefunds(workspace, Date.now()) >= SUBJECTIVE_REFUND_LIMIT) {
    return "limit"
  }

  setMoney({ balance: workspace.balance + paid.amount, trial: workspace.trial })
  recordRefund({ address, amount: paid.amount, reason, objective, by: current.name })
  mirrorMoney()
  saveAccount(current)
  return "ok"
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

/**
 * Есть ли сеанс — вне React.
 *
 * Нужен охране маршрута: она решает, пускать ли внутрь, ДО того как
 * что-нибудь отрисуется. Хук здесь не подходит — его негде вызвать.
 */
export function hasSession(): boolean {
  return current !== null
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
  /**
   * Ответ перестал быть двузначным: витрины «Невский проспект» больше нет,
   * и у вошедшего всегда СВОЁ агентство. Функция осталась потому, что на неё
   * опираются двадцать экранов, и вопрос они задают правильный: «показывать
   * мои данные или чужие?».
   *
   * ИСКЛЮЧЕНИЕ — СТЕНД СВЕРКИ. Экраны по адресам `/screen/…` существуют,
   * чтобы сравнивать вёрстку с макетом, и обязаны показывать ЗАМЕРЕННЫЕ
   * данные независимо от того, кто вошёл и что наработал. Иначе снимок для
   * сверки менялся бы после каждого раскрытия, и «совпадает ли с макетом»
   * стало бы вопросом без ответа.
   *
   * Стенд узнаётся по адресу, а не по флагу в состоянии: адрес — это и есть
   * то, что отличает стенд от продукта, и второго источника правды тут
   * заводить незачем. Стендовые маршруты существуют только в режиме
   * разработки, так что в собранной версии условие никогда не срабатывает.
   */
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const session = useSession()
  return !pathname.startsWith("/screen/") && session !== null
}

/**
 * Действия сеанса одним объектом — чтобы экран не импортировал пять функций.
 *
 * Объект постоянный: функции живут вне React и не пересоздаются, поэтому
 * заворачивать их в хук памяти незачем — он бы только делал вид, что здесь
 * есть что запоминать.
 */
const ACTIONS = {
  signIn,
  signUp,
  signOut,
  disclose,
  topUp,
  refund,
  setIdleMinutes,
  setName,
  invite,
  acceptInvite,
} as const

export function useSessionActions() {
  return ACTIONS
}
