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

export { loadIdentity, setBalance, signInRemote, signOutRemote, signUpRemote }
