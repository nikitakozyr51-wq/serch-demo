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
    /*
      Обучение отмечается пройденным.

      Оно всплывает само на первом входе — это его смысл, — и для проверок
      это означает затемнение поверх каждого экрана: измеряется не продукт,
      а тур над ним. Десять слоёв упали ровно на этом, и упали правильно.

      Отметка ставится тем же ключом, что и у человека: проверка входит
      как сотрудник, который продукт уже знает. Само обучение при этом
      не остаётся без присмотра — у него свой слой, где оно и проверяется.
    */
    window.localStorage.setItem(
      `serch.tour.${account.email}`,
      JSON.stringify({ step: 0, done: true }),
    )
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
/** Запись журнала, у которой время задано «сколько минут назад». */
type Timed = { agoMinutes: number }

type AgencySpec = {
  people?: {
    name: string
    initials: string
    email: string
    role: 'owner' | 'agent'
    limit: number | null
  }[]
  disclosures?: (Timed & { address: string; by: string; amount: number; trial?: boolean })[]
  calls?: (Timed & {
    address: string
    by: string
    outcome: string
    answered?: string
  })[]
  refunds?: (Timed & {
    address: string
    amount: number
    reason: string
    objective: boolean
    by: string
  })[]
  stopList?: string[]
}

/**
 * Посадить работу агентства целиком: людей, раскрытия, звонки, отказы.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Время задаётся отступом от «сейчас», а не датой.** Экраны агентства
 * считают всё за окно — 30 дней, 7 дней, сегодня, — и запись с постоянной
 * датой через месяц выпадает из окна сама собой. Проверка начинает падать
 * не потому, что продукт сломался, а потому, что настал следующий месяц.
 * Такая проверка хуже отсутствующей: она приучает не верить красному.
 *
 * Отступ считается уже в браузере, поэтому машинное время проверки и время
 * страницы — одно и то же.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Помощник появился, когда из экранов агентства убрали витрину. До этого
 * таблицы отказов, сотрудников и эффективности рисовались из констант, и
 * проверки замеряли не продукт, а те же константы: двенадцать строк стояли
 * в коде экрана и в ожидании проверки одновременно. Теперь и то и другое
 * приходит из журнала, а значит проверка наконец что-то доказывает.
 */
export async function seedAgency(page: Page, spec: AgencySpec) {
  await page.addInitScript(
    ({ email, owner, plan }) => {
      const now = Date.now()
      const at = (agoMinutes: number) => now - agoMinutes * 60_000

      /**
       * Работа сажается ОДИН раз, а не при каждом переходе.
       *
       * `addInitScript` выполняется на каждой навигации, и без этой проверки
       * журнал переписывался заново после каждого перехода: проверка нажимала
       * «готовый набор», поиск сохранялся, страница переходила на выдачу — и
       * там же затиралась пустым журналом. Возврат на главную показывал ноль
       * поисков, будто сохранение не сработало.
       */
      const key = `serch.workspace.${email}`
      if (window.localStorage.getItem(key) === null)
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          people: (plan.people ?? []).map((person, index) => ({
            ...person,
            id: `p${index}`,
            addedAt: at(60 * 24 * 30),
          })),
          disclosures: (plan.disclosures ?? []).map((item, index) => ({
            id: `d${index}`,
            address: item.address,
            at: at(item.agoMinutes),
            amount: item.amount,
            by: item.by,
            trial: item.trial ?? false,
          })),
          calls: (plan.calls ?? []).map((item, index) => ({
            id: `c${index}`,
            address: item.address,
            at: at(item.agoMinutes),
            outcome: item.outcome,
            answered: item.answered,
            by: item.by,
          })),
          collections: [],
          savedSearches: [],
          topUps: [],
          refunds: (plan.refunds ?? []).map((item, index) => ({
            id: `r${index}`,
            at: at(item.agoMinutes),
            address: item.address,
            amount: item.amount,
            reason: item.reason,
            objective: item.objective,
            by: item.by,
          })),
          stopList: plan.stopList ?? [],
        }),
      )

      // Без сеанса кабинет закрыт охраной, а без агентства в списке вход
      // не находит человека по почте.
      window.localStorage.setItem('serch.accounts', JSON.stringify({ [email]: owner }))
      window.localStorage.setItem('serch.demo.session', JSON.stringify(owner))
      // Обучение отмечается пройденным по той же причине, что и в
      // `seedSession`: иначе оно всплывает поверх экрана, и проверка
      // меряет тур, а не продукт. Само обучение проверяется своим слоем.
      window.localStorage.setItem(
        `serch.tour.${email}`,
        JSON.stringify({ step: 0, done: true }),
      )
    },
    { email: ACCOUNT.email, owner: ACCOUNT, plan: spec },
  )
}

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
