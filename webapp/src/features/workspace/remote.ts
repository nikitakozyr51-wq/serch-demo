import { db, hasDatabase } from "@/platform/db"
import type {
  CallRecord,
  Collection,
  Disclosure,
  Person,
  Refund,
  SavedSearch,
  TopUp,
  Workspace,
} from "./store"

/**
 * Работа агентства на сервере.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ГРАНИЦА, РАДИ КОТОРОЙ ВСЁ И ЗАДУМАНО
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Экраны не знают, откуда пришли данные, и не узнают. Они спрашивают
 * `useWorkspace()` и получают ту же самую запись, что и раньше. Меняется
 * только начинка: журнал приезжает из базы, а не из браузера.
 *
 * Так и было задумано, когда журналы заводились: `features/workspace` —
 * закрытый раздел, и снаружи видно ровно его публичный список. Если бы
 * экраны читали `localStorage` напрямую, сегодня пришлось бы править
 * тридцать файлов вместо одного.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ЗАПИСЬ НЕ ЖДЁТ СЕРВЕРА
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Раскрытие контакта, отметка звонка, добавление в подборку — всё это
 * происходит в памяти сразу, а на сервер уезжает следом. Агент делает
 * тридцать-пятьдесят таких действий за смену, и заставлять его ждать сеть
 * на каждом значит превратить продукт в анкету.
 *
 * **Расплата названа честно: если запись до сервера не доехала, человек
 * узнает об этом сообщением, а не молча.** Молчаливая потеря — худшее,
 * что может случиться с журналом, по которому считают деньги.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧЕГО ЗДЕСЬ НЕТ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Нет слияния расхождений. Если два сотрудника правят одну подборку
 * одновременно, побеждает последний. Настоящее слияние нужно там, где
 * правят один и тот же объект вдвоём, — в этом продукте так работают
 * только с подборкой, и цена ошибки там измеряется порядком строк,
 * а не деньгами.
 */

/** Строка базы → запись раскрытия. */
type DisclosureRow = {
  id: string
  address: string
  at: string
  amount: number
  by_name: string
  trial: boolean
  refunded: boolean
}

type CallRow = {
  id: string
  address: string
  at: string
  outcome: string
  answered: string | null
  note: string | null
  remind_at: string | null
  by_name: string
}

type CollectionRow = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  linked: boolean
  by_name: string
  collection_items: { address: string; position: number }[]
}

type SearchRow = {
  id: string
  name: string
  created_at: string
  by_name: string
  shared: boolean
  notify: string
  last_opened_at: string | null
  query: SavedSearch["query"]
}

type PersonRow = {
  id: string
  name: string
  initials: string
  email: string
  role: string
  day_limit: number | null
  added_at: string
}

type TopUpRow = { id: string; at: string; amount: number; method: string }

type RefundRow = {
  id: string
  at: string
  address: string
  amount: number
  reason: string
  objective: boolean
  by_name: string
}

/** Момент времени базы → миллисекунды, которыми считает кабинет. */
function ms(value: string): number {
  return new Date(value).getTime()
}

/**
 * Прочитать всю работу агентства.
 *
 * Одним заходом, а не по журналу за раз: кабинет показывает «Сегодня»,
 * счётчики сайдбара и баланс сразу, и семь последовательных запросов
 * означали бы семь задержек подряд на первом же экране.
 *
 * Возвращает `null`, когда база не настроена или человек не вошёл, —
 * тогда работа остаётся в браузере, и это законный режим, а не сбой.
 */
async function loadWorkspace(): Promise<Workspace | null> {
  const client = db()
  if (client === null) return null

  const { data: session } = await client.auth.getSession()
  if (session.session === null) return null

  const [people, disclosures, calls, collections, searches, topUps, refunds, stop] =
    await Promise.all([
      client.from("people").select("id, name, initials, email, role, day_limit, added_at"),
      client.from("disclosures").select("id, address, at, amount, by_name, trial, refunded"),
      client.from("calls").select("id, address, at, outcome, answered, note, remind_at, by_name"),
      client
        .from("collections")
        .select(
          "id, name, slug, created_at, updated_at, linked, by_name, collection_items(address, position)",
        ),
      client
        .from("saved_searches")
        .select("id, name, created_at, by_name, shared, notify, last_opened_at, query"),
      client.from("top_ups").select("id, at, amount, method"),
      client.from("refunds").select("id, at, address, amount, reason, objective, by_name"),
      client.from("stop_list").select("address"),
    ])

  const failed = [people, disclosures, calls, collections, searches, topUps, refunds, stop].find(
    (result) => result.error !== null,
  )
  if (failed?.error) throw new Error(failed.error.message)

  return {
    version: 1,
    people: ((people.data ?? []) as PersonRow[]).map(
      (row): Person => ({
        id: row.id,
        name: row.name,
        initials: row.initials,
        email: row.email,
        role: row.role === "owner" ? "owner" : "agent",
        limit: row.day_limit,
        addedAt: ms(row.added_at),
      }),
    ),
    disclosures: ((disclosures.data ?? []) as DisclosureRow[]).map(
      (row): Disclosure => ({
        id: row.id,
        address: row.address,
        at: ms(row.at),
        amount: row.amount,
        by: row.by_name,
        trial: row.trial,
        refunded: row.refunded,
      }),
    ),
    calls: ((calls.data ?? []) as CallRow[]).map(
      (row): CallRecord => ({
        id: row.id,
        address: row.address,
        at: ms(row.at),
        outcome: row.outcome as CallRecord["outcome"],
        answered: row.answered ?? undefined,
        note: row.note ?? undefined,
        remindAt: row.remind_at === null ? undefined : ms(row.remind_at),
        by: row.by_name,
      }),
    ),
    collections: ((collections.data ?? []) as CollectionRow[]).map(
      (row): Collection => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        createdAt: ms(row.created_at),
        updatedAt: ms(row.updated_at),
        // Порядок задал агент, и клиент видит именно его. База порядок строк
        // не гарантирует — его несёт колонка `position`.
        items: [...row.collection_items]
          .sort((a, b) => a.position - b.position)
          .map((item) => item.address),
        linked: row.linked,
        by: row.by_name,
      }),
    ),
    savedSearches: ((searches.data ?? []) as SearchRow[]).map(
      (row): SavedSearch => ({
        id: row.id,
        name: row.name,
        createdAt: ms(row.created_at),
        by: row.by_name,
        shared: row.shared,
        notify: row.notify as SavedSearch["notify"],
        lastOpenedAt: row.last_opened_at === null ? undefined : ms(row.last_opened_at),
        query: row.query,
      }),
    ),
    topUps: ((topUps.data ?? []) as TopUpRow[]).map(
      (row): TopUp => ({ id: row.id, at: ms(row.at), amount: row.amount, method: row.method }),
    ),
    refunds: ((refunds.data ?? []) as RefundRow[]).map(
      (row): Refund => ({
        id: row.id,
        at: ms(row.at),
        address: row.address,
        amount: row.amount,
        reason: row.reason,
        objective: row.objective,
        by: row.by_name,
      }),
    ),
    stopList: ((stop.data ?? []) as { address: string }[]).map((row) => row.address),
    /**
     * Счёт агентства приезжает не отсюда, а вместе с личностью
     * (`features/auth/remote.ts`): на сервере он лежит в таблице агентств,
     * а не в журналах. Нули здесь — не «ноль на счету», а «этот запрос про
     * деньги ничего не знает»; сеанс подставит настоящие сразу после входа.
     */
    balance: 0,
    trial: 0,
  }
}

/**
 * Записать строку на сервер.
 *
 * `agency_id` НЕ передаётся: его подставляет сама база значением по умолчанию
 * `my_agency_id()`. Это не экономия поля, а защита — присланное значение можно
 * подменить из консоли браузера, вычисленное базой нельзя.
 */
async function insert(table: string, row: Record<string, unknown>): Promise<void> {
  const client = db()
  if (client === null) return
  const { error } = await client.from(table).insert(row)
  if (error) throw new Error(`${table}: ${error.message}`)
}

async function update(
  table: string,
  id: string,
  row: Record<string, unknown>,
): Promise<void> {
  const client = db()
  if (client === null) return
  const { error } = await client.from(table).update(row).eq("id", id)
  if (error) throw new Error(`${table}: ${error.message}`)
}

async function remove(table: string, id: string): Promise<void> {
  const client = db()
  if (client === null) return
  const { error } = await client.from(table).delete().eq("id", id)
  if (error) throw new Error(`${table}: ${error.message}`)
}

/** Момент кабинета → момент базы. */
function iso(at: number): string {
  return new Date(at).toISOString()
}

const remote = {
  disclosure: (item: Disclosure) =>
    insert("disclosures", {
      address: item.address,
      at: iso(item.at),
      amount: item.amount,
      by_name: item.by,
      trial: item.trial,
    }),
  call: (item: CallRecord) =>
    insert("calls", {
      address: item.address,
      at: iso(item.at),
      outcome: item.outcome,
      answered: item.answered ?? null,
      note: item.note ?? null,
      remind_at: item.remindAt === undefined ? null : iso(item.remindAt),
      by_name: item.by,
    }),
  topUp: (item: TopUp) =>
    insert("top_ups", { at: iso(item.at), amount: item.amount, method: item.method }),
  refund: (item: Refund) =>
    insert("refunds", {
      at: iso(item.at),
      address: item.address,
      amount: item.amount,
      reason: item.reason,
      objective: item.objective,
      by_name: item.by,
    }),
  stop: (address: string, by: string) => insert("stop_list", { address, by_name: by }),
  search: (item: SavedSearch) =>
    insert("saved_searches", {
      id: item.id,
      name: item.name,
      created_at: iso(item.createdAt),
      by_name: item.by,
      shared: item.shared,
      notify: item.notify,
      query: item.query,
    }),
  searchNotify: (id: string, notify: string) => update("saved_searches", id, { notify }),
  searchOpened: (id: string, at: number) =>
    update("saved_searches", id, { last_opened_at: iso(at) }),
  searchRemove: (id: string) => remove("saved_searches", id),
  collection: (item: Collection) =>
    insert("collections", {
      id: item.id,
      name: item.name,
      slug: item.slug,
      created_at: iso(item.createdAt),
      updated_at: iso(item.updatedAt),
      linked: item.linked,
      by_name: item.by,
    }),
  collectionRename: (id: string, name: string) =>
    update("collections", id, { name, updated_at: iso(Date.now()) }),
  collectionLink: (id: string, linked: boolean) =>
    update("collections", id, { linked, updated_at: iso(Date.now()) }),
  collectionRemove: (id: string) => remove("collections", id),
  /**
   * Состав подборки записывается целиком, а не по одному объекту.
   *
   * Порядок здесь и есть содержание: агент перетаскивает строки, и клиент
   * видит именно этот порядок. Дописывать по одному значило бы хранить его
   * в двух местах — в памяти и в номерах позиций — и однажды разойтись.
   */
  collectionItems: async (id: string, addresses: string[]) => {
    const client = db()
    if (client === null) return
    await client.from("collection_items").delete().eq("collection_id", id)
    if (addresses.length === 0) return
    const { error } = await client.from("collection_items").insert(
      addresses.map((address, position) => ({ collection_id: id, address, position })),
    )
    if (error) throw new Error(`collection_items: ${error.message}`)
  },
  person: (item: Person) =>
    insert("people", {
      name: item.name,
      initials: item.initials,
      email: item.email,
      role: item.role,
      day_limit: item.limit,
    }),
}

export { hasDatabase, loadWorkspace, remote }
