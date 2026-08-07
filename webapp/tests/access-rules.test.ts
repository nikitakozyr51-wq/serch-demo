import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, test } from 'bun:test'

/**
 * Правила доступа базы: чужое агентство не видно, подборка по ссылке видна.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ЭТО ПРОВЕРЯЕТСЯ, А НЕ ЧИТАЕТСЯ ГЛАЗАМИ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ключ доступа уезжает в браузер и виден всем. Значит единственное, что
 * отделяет журнал одного агентства от другого, — правила внутри базы.
 * Экран можно обойти через консоль браузера за минуту; правило базы обойти
 * нельзя. Поэтому проверять надо именно правило, и именно запросом, а не
 * чтением SQL глазами: SQL читается правильно даже тогда, когда работает
 * неправильно.
 *
 * Здесь заводятся ДВА настоящих агентства и делается то, чего делать нельзя:
 * второе агентство пытается прочитать журнал первого, а незалогиненный
 * посетитель — раскрытия. Оба обязаны получить пусто.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО НУЖНО ДЛЯ ЗАПУСКА
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Поднятая база: `npx supabase start` в корне репозитория. Без неё проверка
 * пропускается, а не падает: на машине без Docker она бы падала всегда
 * и приучала не верить красному.
 */

const URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/** Есть ли поднятая база. Проверяется до тестов, чтобы не ждать таймаутов. */
let live = false

async function reachable(): Promise<boolean> {
  try {
    const response = await fetch(`${URL}/rest/v1/`, {
      headers: { apikey: ANON },
      signal: AbortSignal.timeout(2000),
    })
    return response.ok || response.status === 404
  } catch {
    return false
  }
}

/** Новый клиент со своим сеансом: два агентства не должны делить один. */
function fresh() {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/**
 * Завести человека и его агентство.
 *
 * Почта уникальная на каждый прогон: база живёт между запусками, и вторая
 * попытка завести того же человека упала бы не на том, что проверяется.
 */
async function makeAgency(tag: string) {
  const email = `${tag}-${Math.random().toString(36).slice(2, 10)}@serch.test`
  const client = fresh()

  const signUp = await client.auth.signUp({ email, password: 'ochen-dlinnyi-parol-10' })
  expect(signUp.error, `регистрация ${tag}`).toBeNull()

  const created = await client.rpc('create_agency', {
    agency_name: `Агентство ${tag}`,
    person_name: `Человек ${tag}`,
    initials: 'ЧХ',
  })
  expect(created.error, `создание агентства ${tag}`).toBeNull()

  return { client, email, agencyId: created.data as string }
}

beforeAll(async () => {
  live = await reachable()
  if (!live) {
    console.log(
      'База не поднята — проверка правил доступа пропущена. Поднять: npx supabase start',
    )
  }
})

describe('правила доступа базы', () => {
  test('чужой журнал не читается и не пишется', async () => {
    if (!live) return

    const first = await makeAgency('a')
    const second = await makeAgency('b')

    // Первое агентство раскрывает контакт. `agency_id` не передаётся —
    // его подставляет база.
    const wrote = await first.client
      .from('disclosures')
      .insert({ address: 'Ленская ул., 10', amount: 199, by_name: 'Человек a' })
    expect(wrote.error, 'своё раскрытие обязано записаться').toBeNull()

    const mine = await first.client.from('disclosures').select('address')
    expect(mine.data?.length, 'своё раскрытие обязано читаться').toBe(1)

    // Второе агентство смотрит в ту же таблицу.
    const theirs = await second.client.from('disclosures').select('address')
    expect(theirs.error, 'чужая таблица не должна давать ошибку — она должна быть пустой').toBeNull()
    expect(theirs.data, 'ЧУЖОЙ ЖУРНАЛ ОБЯЗАН БЫТЬ ПУСТ').toEqual([])

    /**
     * Попытка записать в чужое агентство, назвав его явно.
     *
     * Это главный случай: подставить чужой `agency_id` из консоли браузера
     * может кто угодно. Правило обязано отказать, а не молча записать.
     */
    const forged = await second.client.from('disclosures').insert({
      agency_id: first.agencyId,
      address: 'Подлог',
      amount: 199,
      by_name: 'Чужой',
    })
    expect(forged.error, 'запись в чужое агентство обязана быть отвергнута').not.toBeNull()

    const afterForge = await first.client.from('disclosures').select('address')
    expect(afterForge.data?.length, 'в чужом журнале ничего не появилось').toBe(1)
  }, 30_000)

  test('стоп-лист не удаляется никем', async () => {
    if (!live) return

    const agency = await makeAgency('c')
    const added = await agency.client
      .from('stop_list')
      .insert({ address: 'Тихая ул., 3', by_name: 'Человек c' })
    expect(added.error, 'отметка обязана записаться').toBeNull()

    /**
     * Удаление обязано не сработать — и это правило продукта, а не техники.
     * «Снять отказ из интерфейса нельзя ни агенту, ни руководителю»: иначе
     * стоп-лист не имеет смысла. Кнопку могут дорисовать, правило останется.
     */
    await agency.client.from('stop_list').delete().eq('address', 'Тихая ул., 3')

    const after = await agency.client.from('stop_list').select('address')
    expect(after.data?.length, 'ОТМЕТКА «ПРОСИЛ НЕ ЗВОНИТЬ» НЕ УДАЛЯЕТСЯ').toBe(1)
  }, 30_000)

  test('подборка по ссылке открывается без входа, а деньги — нет', async () => {
    if (!live) return

    const agency = await makeAgency('d')

    const collection = await agency.client
      .from('collections')
      .insert({ name: 'Для Ивановых', slug: `dlya-${Math.random().toString(36).slice(2, 8)}`, by_name: 'Человек d', linked: true })
      .select('id')
      .single()
    expect(collection.error, 'подборка обязана создаться').toBeNull()

    await agency.client
      .from('collection_items')
      .insert({ collection_id: collection.data!.id, address: 'Ленская ул., 10', position: 0 })

    await agency.client
      .from('disclosures')
      .insert({ address: 'Ленская ул., 10', amount: 199, by_name: 'Человек d' })

    // Клиент агентства: никакого входа, чистый анонимный ключ.
    const guest = fresh()

    const seen = await guest.from('collections').select('name, collection_items(address)')
    expect(seen.data?.length, 'клиент обязан открыть подборку по ссылке').toBe(1)
    expect(seen.data?.[0]?.name).toBe('Для Ивановых')

    /**
     * И ровно ничего сверх этого.
     *
     * «Открытие ссылки не тратит деньги агентства и не считается раскрытием» —
     * на уровне базы это верно буквально: анонимный запрос физически не может
     * прочитать журнал раскрытий.
     */
    const money = await guest.from('disclosures').select('address')
    expect(money.data ?? [], 'КЛИЕНТ НЕ ВИДИТ, СКОЛЬКО АГЕНТСТВО ЗАПЛАТИЛО').toEqual([])

    const staff = await guest.from('people').select('email')
    expect(staff.data ?? [], 'клиент не видит сотрудников агентства').toEqual([])

    // Ссылку отключили — подборка перестаёт открываться у всех, кому её
    // переслали. Это и есть смысл выключателя.
    await agency.client.from('collections').update({ linked: false }).eq('id', collection.data!.id)

    const afterOff = await fresh().from('collections').select('name')
    expect(afterOff.data ?? [], 'отключённая ссылка не открывается').toEqual([])
  }, 30_000)
})
