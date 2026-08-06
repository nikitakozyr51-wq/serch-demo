import type { Page } from '@playwright/test'

/**
 * Агентство, под которым идут проверки.
 *
 * Одно значение на два ключа хранилища, и это важно: `serch.accounts` — список
 * заведённых агентств, по которому вход ищет человека, а `serch.demo.session` —
 * кто вошёл сейчас. Разные значения в них означали бы, что проверка входит
 * под одним агентством, а работает в другом.
 */
const ACCOUNT = {
  kind: 'own',
  name: 'Смирнова Ирина',
  initials: 'ИС',
  email: 'i.smirnova@nevsky.ru',
  agency: 'Невский проспект',
  role: 'owner',
  balance: 8610,
  trial: 0,
  disclosed: [],
  idleMinutes: 120,
} as const

/** Почта, под которой входят проверки, ходящие через форму. */
export const ACCOUNT_EMAIL = ACCOUNT.email

/**
 * Посадить сеанс до открытия страницы.
 *
 * Кабинет закрыт для тех, кто не вошёл, и это правильно: экран с деньгами
 * агентства и телефонами собственников не должен открываться всем подряд.
 * Но проверкам вида «совпадает ли геометрия карточки» дверь ничего не
 * добавляет — они смотрят на пиксели, а не на путь человека.
 *
 * Поэтому здесь сеанс кладётся прямо в хранилище браузера до первого кадра.
 * Проверки, которые проверяют **сам вход**, дверью не пренебрегают и ходят
 * через форму — см. `enterCabinet` в `hotkeys.spec.ts`.
 *
 * **ЗАВОДИТСЯ ИМЕННО АГЕНТСТВО, А НЕ ТОЛЬКО СЕАНС.** Витрины «Невский
 * проспект» в продукте больше нет: вход ищет агентство по почте среди
 * заведённых на этом компьютере и не пускает, если такого нет. Проверка,
 * сажавшая только сеанс, после этой правки шестнадцать раз ждала перехода,
 * которого не могло произойти, — по минуте каждая.
 */
export async function seedSession(page: Page) {
  await page.addInitScript((account) => {
    window.localStorage.setItem(
      'serch.accounts',
      JSON.stringify({ [account.email]: account }),
    )
    window.localStorage.setItem('serch.demo.session', JSON.stringify(account))
  }, ACCOUNT)
}

/**
 * Завести агентство, но НЕ входить.
 *
 * Нужно проверкам самого входа: форма обязана найти агентство по почте,
 * а сеанса до нажатия «Войти» быть не должно — иначе проверяется не вход,
 * а редирект уже вошедшего.
 */
export async function seedAccountOnly(page: Page) {
  await page.addInitScript((account) => {
    window.localStorage.setItem(
      'serch.accounts',
      JSON.stringify({ [account.email]: account }),
    )
    window.localStorage.removeItem('serch.demo.session')
  }, ACCOUNT)
}

/**
 * Посадить работу агентства: раскрытые контакты, по которым ещё не звонили.
 *
 * Нужно проверкам прозвона и «Сегодня». Раньше они опирались на константы
 * экрана — «7 из 24» было вписано числом, — и проверяли не продукт, а
 * собственную заглушку. Теперь очередь настоящая, и посадить её можно только
 * через журнал.
 */
export async function seedWork(
  page: Page,
  addresses: string[],
  extra: Record<string, unknown> = {},
) {
  await page.addInitScript(
    ({ email, list, more }) => {
      const at = 1_754_000_000_000
      window.localStorage.setItem(
        `serch.workspace.${email}`,
        JSON.stringify({
          version: 1,
          people: [],
          disclosures: list.map((address, index) => ({
            id: `d${index}`,
            address,
            at: at + index,
            amount: 199,
            by: 'Смирнова Ирина',
            trial: false,
          })),
          calls: [],
          collections: [],
          savedSearches: [],
          topUps: [],
          refunds: [],
          stopList: [],
          ...more,
        }),
      )
    },
    { email: ACCOUNT.email, list: addresses, more: extra },
  )
}
