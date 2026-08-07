import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, test } from 'bun:test'

/**
 * Управление агентством: кто и что имеет право делать.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Правило доступа отвечает на вопрос «чьи это строки», и его недостаточно.
 * Разница видна на передаче роли: строки свои у обоих — и у руководителя,
 * и у агента, — а передать роль может только руководитель. Такое правилом
 * отбора не выражается, поэтому пять действий живут функциями, которые
 * проверяют роль сами.
 *
 * Здесь заводятся руководитель и агент, и агент пробует сделать всё, чего
 * ему нельзя: позвать сотрудника, передать роль, раскатать вид, запросить
 * удаление агентства. Каждый раз обязан получить отказ.
 *
 * Без поднятой базы проверка пропускается, а не падает: на машине без
 * Docker она бы падала всегда и приучала не верить красному.
 */

const URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

let live = false

async function reachable(): Promise<boolean> {
  try {
    const response = await fetch(`${URL}/rest/v1/collections?select=id&limit=1`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
      signal: AbortSignal.timeout(5000),
    })
    return response.ok
  } catch {
    return false
  }
}

function fresh() {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

const tag = () => Math.random().toString(36).slice(2, 10)

/** Руководитель со своим агентством. */
async function makeOwner() {
  const email = `owner-${tag()}@serch.test`
  const client = fresh()
  await client.auth.signUp({ email, password: 'ochen-dlinnyi-parol-10' })
  const created = await client.rpc('create_agency', {
    agency_name: 'Агентство проверки',
    person_name: 'Руководитель Проверкин',
    initials: 'РП',
  })
  expect(created.error, 'агентство обязано создаться').toBeNull()
  return { client, email }
}

/** Позвать человека и принять приглашение от его имени. */
async function makeAgent(owner: { client: ReturnType<typeof fresh> }) {
  const email = `agent-${tag()}@serch.test`

  const invited = await owner.client.rpc('invite_agent', {
    invite_email: email,
    invite_name: 'Агент Приглашённый',
    invite_limit: 5,
  })
  expect(invited.error, 'приглашение обязано создаться').toBeNull()

  const token = await owner.client
    .from('invitations')
    .select('token')
    .eq('email', email)
    .single()
  expect(token.error, 'ключ приглашения обязан читаться руководителем').toBeNull()

  const client = fresh()
  await client.auth.signUp({ email, password: 'ochen-dlinnyi-parol-10' })
  const accepted = await client.rpc('accept_invitation', {
    invite_token: (token.data as { token: string }).token,
  })
  expect(accepted.error, 'приглашение обязано приняться').toBeNull()

  return { client, email }
}

beforeAll(async () => {
  live = await reachable()
  if (!live) console.log('База не поднята — проверка управления агентством пропущена.')
})

describe('управление агентством', () => {
  test('приглашение приводит человека в то же агентство', async () => {
    if (!live) return

    const owner = await makeOwner()
    const agent = await makeAgent(owner)

    // Оба видят один и тот же состав — значит агентство действительно одно.
    const seenByOwner = await owner.client.from('people').select('email')
    const seenByAgent = await agent.client.from('people').select('email')

    expect(seenByOwner.data?.length, 'руководитель видит двоих').toBe(2)
    expect(seenByAgent.data?.length, 'агент видит тех же двоих').toBe(2)

    // Приглашение отмечено принятым — второй раз по той же ссылке не войти.
    const again = await agent.client.rpc('accept_invitation', {
      invite_token: (
        await owner.client.from('invitations').select('token').eq('email', agent.email).single()
      ).data!.token,
    })
    expect(again.error, 'принять приглашение дважды нельзя').not.toBeNull()
  }, 60_000)

  test('агент не может ничего из того, что может руководитель', async () => {
    if (!live) return

    const owner = await makeOwner()
    const agent = await makeAgent(owner)

    const invited = await agent.client.rpc('invite_agent', {
      invite_email: `chuzhoi-${tag()}@serch.test`,
      invite_name: 'Кто-то',
      invite_limit: null,
    })
    expect(invited.error, 'АГЕНТ НЕ ЗОВЁТ СОТРУДНИКОВ').not.toBeNull()

    const me = await agent.client.from('people').select('id').eq('email', agent.email).single()
    const transferred = await agent.client.rpc('transfer_owner', { to_person: me.data!.id })
    expect(transferred.error, 'АГЕНТ НЕ ЗАБИРАЕТ СЕБЕ РОЛЬ РУКОВОДИТЕЛЯ').not.toBeNull()

    const rolled = await agent.client.rpc('apply_view_to_all', { next_view: 'compact' })
    expect(rolled.error, 'агент не меняет чужие экраны').not.toBeNull()

    const asked = await agent.client.rpc('request_deletion')
    expect(asked.error, 'АГЕНТ НЕ УДАЛЯЕТ АГЕНТСТВО').not.toBeNull()
  }, 60_000)

  test('передача роли меняет обе строки разом', async () => {
    if (!live) return

    const owner = await makeOwner()
    const agent = await makeAgent(owner)

    const target = await owner.client
      .from('people')
      .select('id')
      .eq('email', agent.email)
      .single()

    const done = await owner.client.rpc('transfer_owner', { to_person: target.data!.id })
    expect(done.error, 'руководитель обязан мочь передать роль').toBeNull()

    const after = await owner.client.from('people').select('email, role')
    const roles = Object.fromEntries(
      (after.data as { email: string; role: string }[]).map((row) => [row.email, row.role]),
    )

    expect(roles[agent.email], 'принявший стал руководителем').toBe('owner')
    expect(roles[owner.email], 'передавший стал агентом').toBe('agent')

    // Руководитель в агентстве ровно один — ни двух, ни ноля.
    const owners = Object.values(roles).filter((role) => role === 'owner')
    expect(owners.length, 'РУКОВОДИТЕЛЬ РОВНО ОДИН').toBe(1)

    // И бывший руководитель немедленно теряет права.
    const back = await owner.client.rpc('request_deletion')
    expect(back.error, 'бывший руководитель больше не руководитель').not.toBeNull()
  }, 60_000)

  test('вид раскатывается на всех, удаление только запрашивается', async () => {
    if (!live) return

    const owner = await makeOwner()
    await makeAgent(owner)

    const rolled = await owner.client.rpc('apply_view_to_all', { next_view: 'compact' })
    expect(rolled.error, 'руководитель раскатывает вид').toBeNull()
    expect(rolled.data, 'вид встал обоим').toBe(2)

    const views = await owner.client.from('people').select('view')
    expect(
      (views.data as { view: string }[]).every((row) => row.view === 'compact'),
      'плотный вид встал каждому',
    ).toBe(true)

    /**
     * Удаление ЗАПРАШИВАЕТСЯ, а не выполняется.
     *
     * Данные удаляются за три рабочих дня, журнал доступа хранится год
     * по закону. Агентство, исчезающее по нажатию кнопки, нарушало бы
     * и то и другое — и делало бы необратимое мгновенно.
     */
    const asked = await owner.client.rpc('request_deletion')
    expect(asked.error, 'руководитель запрашивает удаление').toBeNull()

    const agency = await owner.client.from('agencies').select('deletion_requested_at').single()
    expect(agency.data!.deletion_requested_at, 'отметка о запросе поставлена').not.toBeNull()

    const still = await owner.client.from('people').select('email')
    expect(still.data?.length, 'АГЕНТСТВО НЕ ИСЧЕЗЛО ПО НАЖАТИЮ').toBe(2)
  }, 60_000)
})
