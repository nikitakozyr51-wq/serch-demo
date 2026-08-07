import { useSyncExternalStore } from "react"

/**
 * Рабочее пространство агентства: всё, что накапливается работой.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Владелец сказал прямо: «кабинет выглядит как макет, он не рабочий», и
 * отдельно — «пусть пользователь заполняет». До этого файла кабинет показывал
 * выдуманные константы: девять чужих списаний, пять чужих сотрудников, четыре
 * чужие подборки, «потрачено за 30 дней 35 422 ₽». Человек раскрывал контакт,
 * деньги списывались — и НИГДЕ этого не появлялось. Экран денег продолжал
 * показывать чужую историю.
 *
 * Здесь лежит то, чего не хватало: журналы. Раскрытия, звонки, подборки,
 * пополнения, возвраты, сохранённые поиски, стоп-лист. Всё остальное —
 * выписка, «потрачено за 30 дней», счётчики вкладок, экран «Сегодня»,
 * воронка эффективности — СЧИТАЕТСЯ ИЗ НИХ, а не пишется руками.
 *
 * Правило простое: **если число можно посчитать, его нельзя вписывать**.
 * Вписанное число живёт своей жизнью и расходится с работой на первый же день.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ХРАНИЛИЩЕ В БРАУЗЕРЕ, ЕСЛИ РЕШЕНО ДЕЛАТЬ СЕРВЕР
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Сервер решён и будет. Но до него кабинет обязан работать: его показывают
 * агентствам сейчас. Поэтому границы этого модуля нарисованы так, чтобы
 * замена хранилища не задела ни одного экрана: наружу отдаются только
 * `useWorkspace()` и набор действий. Экраны не знают ни про `localStorage`,
 * ни про ключи, ни про формат записи. Когда появится сервер, меняется
 * содержимое `read`/`write` и ничего больше.
 *
 * Что честно работает в браузере и что не заработает никогда без сервера —
 * перечислено в `docs/DATA.md`. Коротко: всё однопользовательское работает,
 * всё, что должен увидеть ДРУГОЙ человек на ДРУГОМ устройстве, — нет.
 * Чужой браузер не видит это хранилище, и никакая хитрость это не обходит.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ВРЕМЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Записи несут настоящую метку времени, а не «24.07, 14:12» строкой. Строка
 * не сортируется, не сравнивается и не отвечает на вопрос «это было сегодня?».
 * Форматированием занимается тот, кто показывает, — здесь только число.
 */

/** Одно раскрытие контакта: за что и почём заплатило агентство. */
export type Disclosure = {
  id: string
  /** Адрес объекта — он же ключ: повторно за тот же объект не платят. */
  address: string
  /** Когда, в миллисекундах эпохи. */
  at: number
  /** Сколько списано. 0 — раскрытие ушло из пробного пакета. */
  amount: number
  /** Кто раскрыл: имя сотрудника на момент раскрытия. */
  by: string
  /** Пробное раскрытие не стоило денег, но всё равно записано. */
  trial: boolean
  /** Возврат оформлен: деньги вернулись, запись осталась. */
  refunded?: boolean
}

/** Чем кончился разговор. Набор закрыт: это словарь продукта, а не свободный текст. */
export type CallOutcome =
  | "в работе"
  | "дозвонился"
  | "не дозвонился"
  | "отказ"
  | "посредник"
  | "отложен"

/** Запись о звонке. Из них собирается «Сегодня» и вся эффективность. */
export type CallRecord = {
  id: string
  address: string
  at: number
  outcome: CallOutcome
  /** Кто ответил: собственник, агент, родственник. Пусто — не дозвонились. */
  answered?: string
  note?: string
  /** Перезвонить в этот момент. Отсюда берётся секция «Перезвонить сегодня». */
  remindAt?: number
  by: string
}

/** Подборка для клиента. */
export type Collection = {
  id: string
  name: string
  /** Хвост публичного адреса. Постоянный: ссылку уже могли отправить. */
  slug: string
  createdAt: number
  updatedAt: number
  /** Адреса объектов в порядке, который задал агент. */
  items: string[]
  /** Ссылка создана и работает. Пока нет — подборка видна только внутри. */
  linked: boolean
  by: string
}

/**
 * Как часто сообщать о новых объектах по поиску.
 *
 * Набор закрыт и снят с экрана `bZOeU`: «Сразу», «Раз в час», «Утром»,
 * «Выключено». Пятой частоты нет — каждая новая означала бы ещё одну
 * очередь на сервере, а разница между «раз в час» и «раз в два часа»
 * для агента не существует.
 */
export type SearchNotify = "instant" | "hourly" | "morning" | "off"

/**
 * Сохранённый поиск.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Это главный экран продукта после входа**, и запись под ним обязана
 * отвечать на все семь колонок `bZOeU`. Раньше здесь было три поля — имя,
 * дата, условия, — и экран из них собрать было нельзя.
 *
 * Чего здесь НЕТ и почему: «новых за сутки» и «всего» не хранятся. Это
 * не свойства поиска, а результат его применения к текущей базе, и записать
 * их значило бы заморозить: объявление появилось ночью, а в строке по-прежнему
 * вчерашняя цифра. Считаются на месте.
 */
export type SavedSearch = {
  id: string
  name: string
  createdAt: number
  /** Кто завёл: имя сотрудника на момент сохранения. */
  by: string
  /**
   * Виден всему агентству, а не только автору.
   *
   * Личный поиск — частное дело агента; общий заводит руководитель, и он
   * появляется в сайдбаре у всех. Пока данные лежат в браузере одного
   * человека, «общий» существовать не может физически, поэтому поле есть,
   * а способа его включить в интерфейсе пока нет — появится вместе с сервером.
   */
  shared: boolean
  notify: SearchNotify
  /** Когда поиск открывали в последний раз. `undefined` — ни разу. */
  lastOpenedAt?: number
  /** Условия в том виде, в каком их читает экран выдачи. */
  query: {
    districts: string[]
    rooms: number[]
    priceCap: number
    tab: string
    sort: string
  }
}

/** Пополнение счёта. */
export type TopUp = {
  id: string
  at: number
  amount: number
  method: string
}

/** Возврат за брак. */
export type Refund = {
  id: string
  at: number
  address: string
  amount: number
  reason: string
  /** Объективные причины в лимит не считаются. */
  objective: boolean
  by: string
}

/** Сотрудник агентства. */
export type Person = {
  id: string
  name: string
  initials: string
  email: string
  role: "owner" | "agent"
  /** Дневной лимит раскрытий. `null` — без лимита. */
  limit: number | null
  addedAt: number
}

export type Workspace = {
  /** Версия записи: по ней чиним старые данные, не теряя их. */
  version: 1
  people: Person[]
  disclosures: Disclosure[]
  calls: CallRecord[]
  collections: Collection[]
  savedSearches: SavedSearch[]
  topUps: TopUp[]
  refunds: Refund[]
  /** Адреса объектов, собственники которых просили не звонить. */
  stopList: string[]
}

const EMPTY: Workspace = {
  version: 1,
  people: [],
  disclosures: [],
  calls: [],
  collections: [],
  savedSearches: [],
  topUps: [],
  refunds: [],
  stopList: [],
}

/**
 * Ключ хранилища привязан к почте.
 *
 * Иначе два агентства на одном компьютере затирали бы работу друг друга,
 * а «Выйти → Войти под другим» показывало бы чужие подборки. Почта здесь
 * играет роль, которую на сервере играл бы идентификатор агентства.
 */
function keyFor(email: string): string {
  return `serch.workspace.${email.trim().toLowerCase()}`
}

let account: string | null = null
let current: Workspace = EMPTY
const listeners = new Set<() => void>()

function read(email: string): Workspace {
  if (typeof window === "undefined") return EMPTY
  try {
    const raw = window.localStorage.getItem(keyFor(email))
    if (!raw) return EMPTY
    const stored = JSON.parse(raw) as Partial<Workspace>
    // Недостающие поля добираются из пустого: запись, сделанная до появления
    // нового журнала, не должна ронять кабинет белым экраном на глазах
    // у зрителей.
    return { ...EMPTY, ...stored, version: 1 }
  } catch {
    return EMPTY
  }
}

function write(next: Workspace) {
  current = next
  if (account !== null) {
    try {
      window.localStorage.setItem(keyFor(account), JSON.stringify(next))
    } catch {
      // Приватный режим запрещает запись: работа живёт до перезагрузки.
      // Это хуже, но не мешает показывать кабинет.
    }
  }
  for (const listener of listeners) listener()
}

/**
 * Открыть пространство агентства. Вызывается входом и регистрацией.
 *
 * Разделено с записью намеренно: сеанс знает, КТО вошёл, а пространство —
 * ЧТО он наработал. Смешать их значило бы терять работу при каждом выходе.
 */
export function openWorkspace(email: string) {
  account = email
  current = read(email)
  for (const listener of listeners) listener()
}

/** Закрыть пространство: работа остаётся на диске, из памяти уходит. */
export function closeWorkspace() {
  account = null
  current = EMPTY
  for (const listener of listeners) listener()
}

/**
 * Завести пространство новому агентству: один человек — тот, кто его создал.
 *
 * Пустых списков не бывает у сотрудников: агентство без единого человека —
 * это не пустое состояние, а поломка. Всё остальное начинается пустым.
 */
export function initWorkspace(owner: Omit<Person, "id" | "addedAt" | "role" | "limit">) {
  const at = stamp()
  write({
    ...EMPTY,
    people: [{ ...owner, id: "owner", role: "owner", limit: null, addedAt: at }],
  })
}

/**
 * Метка времени.
 *
 * Отдельной функцией, чтобы у всех записей был один источник и чтобы в
 * проверках его можно было подменить. Прямые вызовы `Date.now()` по коду
 * экранов сделали бы тесты недетерминированными.
 */
function stamp(): number {
  return Date.now()
}

/**
 * Идентификатор записи.
 *
 * Считается от времени и счётчика, а не случайным числом: две записи,
 * сделанные в одну миллисекунду, обязаны различаться, а воспроизводимость
 * важнее непредсказуемости — идентификатор здесь не секрет.
 */
let counter = 0
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${stamp().toString(36)}-${counter.toString(36)}`
}

export function recordDisclosure(input: Omit<Disclosure, "id" | "at">) {
  write({
    ...current,
    disclosures: [{ ...input, id: nextId("d"), at: stamp() }, ...current.disclosures],
  })
}

export function recordCall(input: Omit<CallRecord, "id" | "at">) {
  write({ ...current, calls: [{ ...input, id: nextId("c"), at: stamp() }, ...current.calls] })
}

export function recordTopUp(input: Omit<TopUp, "id" | "at">) {
  write({ ...current, topUps: [{ ...input, id: nextId("t"), at: stamp() }, ...current.topUps] })
}

/**
 * Возврат за брак: деньги возвращаются, а запись о раскрытии остаётся
 * помеченной. Стирать раскрытие нельзя — журнал доступа обязан помнить, что
 * к номеру обращались, даже если за это в итоге не заплатили.
 */
export function recordRefund(input: Omit<Refund, "id" | "at">) {
  write({
    ...current,
    refunds: [{ ...input, id: nextId("r"), at: stamp() }, ...current.refunds],
    disclosures: current.disclosures.map((item) =>
      item.address === input.address ? { ...item, refunded: true } : item,
    ),
  })
}

/** Отметить, что собственник просил не звонить. Снятию не подлежит. */
export function addToStopList(address: string) {
  if (current.stopList.includes(address)) return
  write({ ...current, stopList: [...current.stopList, address] })
}

export function createCollection(name: string, by: string): Collection {
  const at = stamp()
  const collection: Collection = {
    id: nextId("k"),
    name,
    // Хвост адреса читаемый и постоянный: по нему клиент и агент узнают
    // подборку в списке ссылок.
    slug: `${slugify(name)}-${at.toString(36).slice(-4)}`,
    createdAt: at,
    updatedAt: at,
    items: [],
    linked: false,
    by,
  }
  write({ ...current, collections: [collection, ...current.collections] })
  return collection
}

export function renameCollection(id: string, name: string) {
  write({
    ...current,
    collections: current.collections.map((item) =>
      item.id === id ? { ...item, name, updatedAt: stamp() } : item,
    ),
  })
}

export function removeCollection(id: string) {
  write({ ...current, collections: current.collections.filter((item) => item.id !== id) })
}

/** Положить объект в подборку. Повтор молча ничего не делает. */
export function addToCollection(id: string, address: string) {
  write({
    ...current,
    collections: current.collections.map((item) =>
      item.id === id && !item.items.includes(address)
        ? { ...item, items: [...item.items, address], updatedAt: stamp() }
        : item,
    ),
  })
}

export function removeFromCollection(id: string, address: string) {
  write({
    ...current,
    collections: current.collections.map((item) =>
      item.id === id
        ? { ...item, items: item.items.filter((a) => a !== address), updatedAt: stamp() }
        : item,
    ),
  })
}

/** Создать или отключить публичную ссылку подборки. */
export function setCollectionLink(id: string, linked: boolean) {
  write({
    ...current,
    collections: current.collections.map((item) =>
      item.id === id ? { ...item, linked, updatedAt: stamp() } : item,
    ),
  })
}

/**
 * Сохранить поиск.
 *
 * Уведомления по умолчанию включены «сразу»: поиск заводят ради того, чтобы
 * он приносил новое сам, и выключенный по умолчанию он был бы просто закладкой.
 * Выключить можно на главном экране одним нажатием.
 */
export function saveSearch(
  name: string,
  query: SavedSearch["query"],
  by: string,
  shared = false,
) {
  write({
    ...current,
    savedSearches: [
      { id: nextId("s"), name, createdAt: stamp(), by, shared, notify: "instant", query },
      ...current.savedSearches,
    ],
  })
}

export function removeSavedSearch(id: string) {
  write({ ...current, savedSearches: current.savedSearches.filter((item) => item.id !== id) })
}

/** Отметить, что поиск открывали: колонка «Последний просмотр» на главной. */
export function touchSavedSearch(id: string) {
  const found = current.savedSearches.find((item) => item.id === id)
  if (found === undefined) return
  write({
    ...current,
    savedSearches: current.savedSearches.map((item) =>
      item.id === id ? { ...item, lastOpenedAt: stamp() } : item,
    ),
  })
}

/** Сменить частоту уведомлений по поиску. */
export function setSearchNotify(id: string, notify: SearchNotify) {
  write({
    ...current,
    savedSearches: current.savedSearches.map((item) =>
      item.id === id ? { ...item, notify } : item,
    ),
  })
}

export function addPerson(input: Omit<Person, "id" | "addedAt">) {
  write({
    ...current,
    people: [...current.people, { ...input, id: nextId("p"), addedAt: stamp() }],
  })
}

/**
 * Транслитерация для хвоста ссылки.
 *
 * Кириллица в адресе работает, но ломается при пересылке через мессенджеры:
 * ссылка приезжает клиенту в виде процентов и выглядит подозрительной. Для
 * страницы, которую агент отправляет чужому человеку, это важнее красоты.
 */
const LETTERS: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .split("")
      .map((char) => LETTERS[char] ?? char)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "podborka"
  )
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot() {
  return current
}

/** Всё, что наработало агентство. */
export function useWorkspace(): Workspace {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY)
}

const ACTIONS = {
  recordDisclosure,
  recordCall,
  recordTopUp,
  recordRefund,
  addToStopList,
  createCollection,
  renameCollection,
  removeCollection,
  addToCollection,
  removeFromCollection,
  setCollectionLink,
  saveSearch,
  removeSavedSearch,
  addPerson,
} as const

export function useWorkspaceActions() {
  return ACTIONS
}

/** Прочитать пространство вне React — для действий, живущих в сеансе. */
export function currentWorkspace(): Workspace {
  return current
}

/**
 * Часы кабинета.
 *
 * **Зачем отдельный источник времени.** Экраны спрашивают «сколько потрачено
 * сегодня», «какие перезвоны на сегодня», «сколько возвратов за 30 дней» —
 * все три вопроса про текущий момент. Прямой вызов часов в теле компонента
 * React запрещает и правильно делает: отрисовка перестаёт быть предсказуемой,
 * а два соседних блока экрана могут посчитать «сегодня» по-разному.
 *
 * Здесь время — обычное внешнее состояние, как и всё в этом файле. Обновляется
 * раз в минуту: этого хватает, чтобы «сегодня» сменилось в полночь, и при этом
 * кабинет не перерисовывается на каждом кадре.
 */
let clock = typeof window === "undefined" ? 0 : Date.now()
const clockListeners = new Set<() => void>()

if (typeof window !== "undefined") {
  window.setInterval(() => {
    clock = Date.now()
    for (const listener of clockListeners) listener()
  }, 60_000)
}

function subscribeClock(listener: () => void) {
  clockListeners.add(listener)
  return () => clockListeners.delete(listener)
}

export function useNow(): number {
  return useSyncExternalStore(
    subscribeClock,
    () => clock,
    () => 0,
  )
}
