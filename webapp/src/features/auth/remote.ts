import { db } from "@/platform/db"

/**
 * Вход, регистрация и кто вошёл — на сервере.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Живёт в `features/auth`, а не рядом с журналами, хотя читает те же таблицы.
 * Граница проведена по вопросу, а не по таблице: «кто я и в каком агентстве» —
 * это вход, «что агентство наработало» — это журналы. Смешать их значило бы
 * получить раздел, который знает и про пароли, и про деньги.
 *
 * Ниже нет ни одного правила о том, ЧТО человеку можно. Все такие правила
 * живут в самой базе (см. миграцию `20260807122001_workspace`), потому что
 * этот файл уезжает в браузер и правится там кем угодно.
 */

/**
 * Кто вошёл и в каком он агентстве.
 *
 * Читается ОДНИМ запросом вместе с агентством: имя, роль и лимит лежат
 * в `people`, а остаток счёта и пробные раскрытия — свойства агентства.
 * Двумя запросами шапка кабинета показывала бы имя раньше баланса, и первую
 * долю секунды человек видел бы «0 ₽» у агентства с деньгами.
 *
 * `null` означает «вошедшего нет или он ещё не в агентстве» — второе бывает
 * ровно между регистрацией и созданием агентства.
 */
async function loadIdentity(): Promise<{
  name: string
  initials: string
  email: string
  agency: string
  role: "owner" | "agent"
  balance: number
  trial: number
} | null> {
  const client = db()
  if (client === null) return null

  const { data: auth } = await client.auth.getUser()
  if (auth.user === null) return null

  const { data, error } = await client
    .from("people")
    .select("name, initials, email, role, agencies(name, balance, trial)")
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (data === null) return null

  const row = data as unknown as {
    name: string
    initials: string
    email: string
    role: string
    agencies: { name: string; balance: number; trial: number } | null
  }

  return {
    name: row.name,
    initials: row.initials,
    email: row.email,
    agency: row.agencies?.name ?? "",
    role: row.role === "owner" ? "owner" : "agent",
    balance: row.agencies?.balance ?? 0,
    trial: row.agencies?.trial ?? 0,
  }
}

/** Вход по паролю. Возвращает текст ошибки или `null`, если вошли. */
async function signInRemote(email: string, password: string): Promise<string | null> {
  const client = db()
  if (client === null) return "База не настроена"
  const { error } = await client.auth.signInWithPassword({ email, password })
  return error === null ? null : error.message
}

/**
 * Регистрация: человек, потом агентство.
 *
 * Второе делает база одной функцией `create_agency`, а не два запроса
 * из браузера. Двумя запросами оно ломается посередине: агентство есть,
 * сотрудников нет, и человек, который его завёл, попасть в него уже не может —
 * правила доступа его не пустят, потому что он никому не сотрудник.
 */
async function signUpRemote(input: {
  email: string
  password: string
  name: string
  initials: string
  agency: string
}): Promise<string | null> {
  const client = db()
  if (client === null) return "База не настроена"

  const signed = await client.auth.signUp({ email: input.email, password: input.password })
  if (signed.error !== null) return signed.error.message

  // Подтверждение почты может быть включено — тогда сеанса ещё нет, и
  // агентство завести нечем. Это не ошибка, а другой путь: человек идёт
  // читать письмо.
  if (signed.data.session === null) return "confirm-email"

  const created = await client.rpc("create_agency", {
    agency_name: input.agency,
    person_name: input.name,
    initials: input.initials,
  })
  return created.error === null ? null : created.error.message
}

/**
 * Завести человека по приглашению.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ЭТО НЕ ОБЫЧНАЯ РЕГИСТРАЦИЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Обычная заводит агентство: `create_agency` делает человека руководителем
 * собственной конторы. Приглашённому это ровно противоположно нужному —
 * его зовут в ЧУЖОЕ агентство, на общий счёт, с чужим дневным лимитом.
 * Пройди он общим путём, у него появилось бы своё пустое агентство,
 * а приглашение осталось бы непринятым: `accept_invitation` отказывает
 * тому, кто уже где-то состоит.
 *
 * Поэтому здесь два шага и ни одного лишнего: завести вход и принять
 * приглашение. Имя, роль и лимит приходят из самого приглашения — их
 * назначил руководитель, и переспрашивать их у приглашённого значит
 * позволить ему их переписать.
 */
async function acceptInviteRemote(input: {
  email: string
  password: string
  token: string
}): Promise<string | null> {
  const client = db()
  if (client === null) return "База не настроена"

  const signed = await client.auth.signUp({ email: input.email, password: input.password })
  if (signed.error !== null) return signed.error.message
  // Сеанса ещё нет — включено подтверждение почты. Приглашение принять
  // нечем: функция базы читает вошедшего. Человек идёт читать письмо
  // и возвращается по той же ссылке — ключ живёт семь дней.
  if (signed.data.session === null) return "confirm-email"

  return callRpc("accept_invitation", { invite_token: input.token })
}

async function signOutRemote(): Promise<void> {
  const client = db()
  if (client === null) return
  await client.auth.signOut()
}

/** Обновить остаток счёта агентства. Деньги общие, поэтому живут у агентства. */
async function setBalance(balance: number, trial: number): Promise<void> {
  const client = db()
  if (client === null) return
  const { error } = await client
    .from("agencies")
    .update({ balance, trial })
    .eq("id", (await client.rpc("my_agency_id")).data as string)
  if (error) throw new Error(error.message)
}

/**
 * Действия руководителя.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Все пять — вызовы функций базы, а не запросы к таблицам, и это не стиль.
 * Правило доступа отвечает на вопрос «чьи это строки»; здесь вопрос другой —
 * «имеет ли право этот человек». Разница видна на передаче роли: строки
 * свои у обоих, а передать роль может только руководитель.
 *
 * Проверка права живёт ВНУТРИ базы (`i_am_owner`), а не здесь. Этот файл
 * уезжает в браузер, и любая проверка в нём снимается за минуту через
 * консоль.
 */
async function callRpc(name: string, args: Record<string, unknown> = {}): Promise<string | null> {
  const client = db()
  if (client === null) return "База не настроена"
  const { error } = await client.rpc(name, args)
  return error === null ? null : error.message
}

/**
 * Позвать сотрудника. Возвращает КЛЮЧ приглашения или текст отказа.
 *
 * Ключ здесь не подробность, а весь смысл вызова: письма продукт не шлёт,
 * и ссылку руководитель передаёт сам. Функция, вернувшая только «получилось»,
 * оставляла его с приглашением, которого он не может отдать.
 */
async function inviteAgent(
  email: string,
  name: string,
  limit: number | null,
): Promise<{ token: string } | { failed: string }> {
  const client = db()
  if (client === null) return { failed: "База не настроена" }
  const { data, error } = await client.rpc("invite_agent", {
    invite_email: email,
    invite_name: name,
    invite_limit: limit,
  })
  if (error !== null) return { failed: error.message }
  return { token: String(data) }
}

/**
 * Принять приглашение по ключу из ссылки.
 *
 * Вызывается ПОСЛЕ входа: функция базы читает `auth.uid()`, и до сеанса
 * ей нечего читать. Порядок «сначала завести человека, потом привязать
 * его к агентству» — единственно возможный, а не выбранный.
 */
const acceptInvitation = (token: string) =>
  callRpc("accept_invitation", { invite_token: token })

/** Передать роль руководителя. Обе строки меняются в базе одним действием. */
const transferOwner = (personId: string) => callRpc("transfer_owner", { to_person: personId })

/** Поставить вид всем сотрудникам агентства. */
const applyViewToAll = (view: "spacious" | "compact") =>
  callRpc("apply_view_to_all", { next_view: view })

/** Запросить удаление агентства. Именно запросить — см. миграцию. */
const requestDeletion = () => callRpc("request_deletion")

/** Сохранить реквизиты юрлица. Печатаются в счёте, акте и счёте-фактуре. */
async function saveRequisites(input: {
  legalName: string
  inn: string
  legalAddress: string
}): Promise<string | null> {
  const client = db()
  if (client === null) return "База не настроена"
  const agency = await client.rpc("my_agency_id")
  if (agency.error !== null) return agency.error.message
  const { error } = await client
    .from("agencies")
    .update({
      legal_name: input.legalName,
      inn: input.inn,
      legal_address: input.legalAddress,
    })
    .eq("id", agency.data as string)
  return error === null ? null : error.message
}

export {
  acceptInvitation,
  acceptInviteRemote,
  applyViewToAll,
  inviteAgent,
  loadIdentity,
  requestDeletion,
  saveRequisites,
  setBalance,
  signInRemote,
  signOutRemote,
  signUpRemote,
  transferOwner,
}
