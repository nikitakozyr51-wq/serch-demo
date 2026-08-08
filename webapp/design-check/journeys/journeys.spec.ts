import { expect, test, type Page } from '@playwright/test'

/**
 * Шесть путей пользователя, каждый — от пустого браузера до конца дела.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО ЗДЕСЬ УТВЕРЖДАЕТСЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Не «открылся ли экран» — на это отвечает перепись. Не «совпал ли пиксель» —
 * на это отвечает сверка. Здесь один вопрос: ДОШЁЛ ЛИ ЧЕЛОВЕК ДО КОНЦА.
 *
 * Поэтому каждое утверждение говорит про результат, а не про разметку:
 * раскрытие видно в журнале денег, исход звонка дожил до журнала доступа,
 * деньги вернулись возвратом, а не пополнением, приглашённый агент оказался
 * в агентстве руководителя, а не в своём пустом.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ БЕЗ ПОСАЖЕННОГО СЕАНСА
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Три существующие полосы кладут сеанс в хранилище до первого кадра. Им это
 * правильно: они меряют экран, и дверь им ничего не добавляет. Здесь дверь —
 * часть пути, и пройти её обязан сам тест. Иначе путь номер один начинался бы
 * с середины, а именно на его первом шаге и ломалось.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ТЕКСТ СТРАНИЦЫ, А НЕ `getByRole('main')`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Элемента `<main>` в кабинете нет ни на одном экране раздела денег: каркас
 * собран из `div` со слотами. Утверждение о роли, которой нет, падало бы
 * не потому, что путь оборвался, а потому, что проверка ищет не то.
 */

/** Уникальная почта на каждый прогон: агентства копятся в одном хранилище. */
function freshEmail(tag: string): string {
  return `${tag}-${Math.floor(performance.now() * 1000)}@agency.test`
}

/**
 * Дождаться, что кабинет отрисовался.
 *
 * Экраны грузятся лениво, и текст страницы сразу после перехода ещё пуст.
 * Проверка, прочитавшая его в этот момент, падала бы не потому, что путь
 * оборвался, а потому, что успела раньше приложения.
 */
async function settle(page: Page) {
  await page.waitForSelector('[data-slot="cabinet-sidebar"]', { timeout: 20_000 })
  await page.waitForTimeout(400)
}

/** Весь видимый текст страницы одной строкой — для утверждений про результат. */
async function screenText(page: Page): Promise<string> {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ')
}

/**
 * Пройти регистрацию и оказаться в кабинете.
 *
 * Возвращает почту заведённого агентства: по ней ключуется его пространство.
 */
async function register(page: Page, agency = 'Невский проспект'): Promise<string> {
  const email = freshEmail('owner')

  await page.goto('/register')
  await page.waitForSelector('[data-slot="auth-field"] input')

  for (const [name, value] of [
    ['agency', agency],
    ['name', 'Смирнова Ирина'],
    ['email', email],
    ['password', 'пароль-подлиннее-десяти'],
  ] as const) {
    await page.locator(`[data-slot="auth-field"] input[name="${name}"]`).fill(value)
  }

  // Согласия обязательны: без них кнопка выключена, и это правило продукта.
  for (const box of await page.locator('[data-slot="checkbox"]').all()) {
    if ((await box.getAttribute('aria-checked')) !== 'true') await box.click()
  }

  await page.getByRole('button', { name: /Создать агентство/ }).click()
  await page.waitForURL(/\/(first-run\/agency|searches|today)/, { timeout: 30_000 })

  return email
}

/**
 * Положить агентству денег и потратить пробные.
 *
 * Пять пробных раскрытий — правило продукта, и проходить их по одному ради
 * шестого не нужно: путь проверяет не арифметику пакета, а то, что деньги
 * видны в журнале и что возврат возвращает.
 */
async function giveMoney(page: Page, balance: number) {
  await page.evaluate((amount) => {
    const raw = localStorage.getItem('serch.demo.session')
    if (raw === null) return
    const session = JSON.parse(raw)
    session.trial = 0
    session.balance = amount
    localStorage.setItem('serch.demo.session', JSON.stringify(session))
    const key = `serch.workspace.${session.agencyKey ?? session.email}`
    const work = JSON.parse(localStorage.getItem(key) ?? '{}')
    localStorage.setItem(key, JSON.stringify({ ...work, balance: amount, trial: 0 }))
  }, balance)
}

/* ────────────────────────────────────────────────────────────────────────── */

test('путь 1: с сайта до записанного исхода', async ({ page }) => {
  await register(page)
  await giveMoney(page, 10_000)

  // ── нашёл объект и раскрыл контакт ────────────────────────────────────
  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')
  await page.getByRole('button', { name: /Раскрыть · / }).first().click()
  await page.waitForTimeout(300)

  // КОНЕЦ ШАГА: за раскрытие правда заплачено, и это видно в журнале денег.
  await page.goto('/balance')
  await settle(page)
  expect(
    await screenText(page),
    'раскрытие не попало в журнал списаний — человек заплатил, а следа нет',
  ).toContain('потрачено за 30 дней')
  expect(
    await screenText(page),
    'счёт агентства не уменьшился на цену раскрытия',
  ).toContain('9 801 ₽')

  // ── позвонил ──────────────────────────────────────────────────────────
  await page.goto('/call')
  await page.waitForSelector('[data-slot="call-bar"]')
  const onCall = await screenText(page)
  expect(onCall, 'очередь прозвона пуста, хотя контакт только что раскрыли').not.toContain(
    'нечего прозванивать',
  )

  // ── записал исход ─────────────────────────────────────────────────────
  await page.getByRole('radio', { name: /Прозвонен/ }).click()
  await page.getByRole('button', { name: /Сохранить и к следующему/ }).click()
  await page.waitForTimeout(300)

  /**
   * КОНЕЦ ДЕЛА: исход пережил уход с экрана.
   *
   * Именно здесь ломалось: кнопка перелистывала объект и не записывала
   * ничего, а выглядело это как сохранение. Журнал доступа — то место,
   * куда руководитель придёт проверять работу агента.
   */
  await page.goto('/agency/access')
  await settle(page)
  /*
    Утверждение нарочно узкое: «Звонок: дозвонился» — это строка журнала.
    Первая версия искала слово «звонок» в любом регистре и проходила бы
    на ПУСТОМ журнале: в его пустом состоянии написано «каждое раскрытие
    контакта и каждый звонок по нему попадают сюда строкой». Проверка,
    которую удовлетворяет пустой экран, не проверяет ничего.
  */
  expect(
    await screenText(page),
    'исход звонка не дожил до журнала: кнопка перелистнула объект и ничего не записала',
  ).toContain('Звонок: дозвонился')
})

test('путь 2: приглашённый агент попадает в ЧУЖОЕ агентство, а не заводит своё', async ({
  page,
}) => {
  const ownerEmail = await register(page, 'Невский проспект')

  // ── руководитель зовёт агента ─────────────────────────────────────────
  await page.goto('/agency/invite')
  await page.waitForSelector('input')

  const agentEmail = freshEmail('agent')
  const fields = page.locator('input')
  await fields.nth(0).fill('Волков Пётр')
  await fields.nth(1).fill(agentEmail)
  await page.getByRole('button', { name: /Отправить приглашение/ }).click()

  // КОНЕЦ ШАГА: ссылка существует, и её можно передать.
  const link = page.locator('[data-slot="invite-link"]')
  await expect(link, 'приглашение не создалось — передавать нечего').toBeVisible({
    timeout: 15_000,
  })
  const href = (await link.innerText()).trim()
  expect(href, 'в ссылке нет ключа приглашения').toContain('token=')
  const token = href.split('token=')[1]!.trim()

  // ── агент принимает приглашение на пустом сеансе ──────────────────────
  await page.evaluate(() => localStorage.removeItem('serch.demo.session'))
  await page.goto(`/invite?token=${token}`)
  await page.waitForSelector('[data-slot="auth-field"] input')

  await page.locator('[data-slot="auth-field"] input[name="name"]').fill('Волков Пётр')
  await page.locator('[data-slot="auth-field"] input[name="email"]').fill(agentEmail)
  for (const box of await page.locator('[data-slot="checkbox"]').all()) {
    if ((await box.getAttribute('aria-checked')) !== 'true') await box.click()
  }
  await page.getByRole('button', { name: /Принять приглашение/ }).click()
  await page.waitForURL(/first-run\/employee/, { timeout: 30_000 })

  /**
   * КОНЕЦ ДЕЛА, И ЭТО ГЛАВНОЕ УТВЕРЖДЕНИЕ ПУТИ.
   *
   * Ломалось ровно наоборот: приглашённый заводил себе агентство «Моё
   * агентство» с нулём на счету и становился в нём ВЛАДЕЛЬЦЕМ, а ключ
   * приглашения не читался ни разу.
   */
  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('serch.demo.session') ?? 'null'),
  )
  expect(session?.agency, 'агент завёл СВОЁ агентство вместо того, в которое его звали').toBe(
    'Невский проспект',
  )
  expect(session?.role, 'приглашённый оказался руководителем, а звали агентом').toBe('agent')
  expect(
    session?.agencyKey,
    'агент открыл собственное пространство: журналы и счёт агентства ему не видны',
  ).toBe(ownerEmail)
})

test('путь 3: клиент открывает подборку без входа и не видит ни одного телефона', async ({
  page,
  context,
}) => {
  await register(page)

  /**
   * Подборка сажается в журнал, а не собирается через окно выбора.
   *
   * Окно выбора — отдельное дело со своей проверкой; здесь путь проверяет
   * ДРУГОЙ конец: что видит клиент. Гонять его через окно значило бы ронять
   * проверку клиента каждый раз, когда правят анимацию окна.
   */
  await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('serch.demo.session')!)
    const key = `serch.workspace.${session.agencyKey ?? session.email}`
    const work = JSON.parse(localStorage.getItem(key) ?? '{}')
    localStorage.setItem(
      key,
      JSON.stringify({
        ...work,
        collections: [
          {
            id: 'k1',
            name: 'Для Ивановых',
            slug: 'dlya-ivanovyh-9z1q',
            createdAt: 1,
            updatedAt: 2,
            items: ['Ленская ул., 10'],
            linked: false,
            by: session.name,
          },
        ],
      }),
    )
  })

  await page.goto('/collections')
  await settle(page)
  expect(await screenText(page), 'подборка не появилась в списке').toContain('Для Ивановых')

  /**
   * Ссылка для клиента ВЫКЛЮЧЕНА С НАЗВАННОЙ ПРИЧИНОЙ — решение дизайна
   * от 08.08.2026. Подборка живёт в браузере агента, клиент открывает её
   * на другом устройстве, и показать ему физически нечего.
   *
   * Проверка держит именно это: кнопка на месте, она выключена, и рядом
   * сказано почему. Выключенная кнопка без причины — мёртвый конец,
   * а не решение.
   */
  const create = page.getByRole('button', { name: 'Создать ссылку' }).first()
  await expect(create, 'кнопка создания ссылки исчезла — путь к подборке потерян').toBeVisible()
  await expect(create, 'ссылка создаётся, хотя показать её клиенту нечем').toBeDisabled()

  // ── клиент: другое устройство, пустое хранилище, без входа ────────────
  const client = await context.newPage()
  await client.evaluate(() => localStorage.clear()).catch(() => {})
  await client.goto('/m/collections/client')
  await client.waitForSelector('[data-slot="mobile-client-collection"]')

  const seen = (await client.locator('body').innerText()).replace(/\s+/g, ' ')
  expect(
    seen,
    'ТЕЛЕФОН СОБСТВЕННИКА УТЁК НА ПУБЛИЧНУЮ СТРАНИЦУ — это нарушение 152-ФЗ',
  ).not.toMatch(/\+7[\s\d()-]{9,}/)
  await client.close()
})

test('путь 4: деньги кончились — человек это увидел и знает, что делать', async ({ page }) => {
  await register(page)
  await giveMoney(page, 0)

  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  // КОНЕЦ ДЕЛА: остановка НАЗВАНА словами, а не спрятана в невидимый атрибут.
  const plate = page.locator('[data-slot="balance-stopped"]')
  await expect(
    plate,
    'деньги кончились, а продукт молчит: человек жмёт кнопку и думает, что подвис компьютер',
  ).toBeVisible()
  await expect(plate).toContainText('Раскрытие контактов остановлено')
  await expect(plate, 'не сказано, что при этом продолжает работать').toContainText(
    'продолжают работать',
  )
  await expect(
    plate.getByRole('button'),
    'сказано «остановлено», но не сказано, что делать дальше',
  ).toBeVisible()
})

test('путь 5: возврат за брак виден в журнале возвратов, а не в пополнениях', async ({ page }) => {
  await register(page)
  await giveMoney(page, 10_000)

  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  // Адрес снимается ДО раскрытия: после него строка перерисовывается.
  const button = page.getByRole('button', { name: /Раскрыть · / }).first()
  const address =
    (await button
      .locator('xpath=ancestor::*[@data-slot="listing-row"]')
      .getAttribute('data-address')) ?? ''
  expect(address, 'в выдаче не нашлось объекта, который можно раскрыть').not.toBe('')
  await button.click()
  await page.waitForTimeout(400)

  // Возврат оформляется из раскрытой карточки: чип «Брак».
  await page.goto(`/object/disclosed?at=${encodeURIComponent(address)}`)
  await settle(page)
  await page.getByRole('radio', { name: /Брак, вернуть/ }).click()
  await page.waitForTimeout(400)

  // КОНЕЦ ДЕЛА: возврат лежит в журнале ВОЗВРАТОВ.
  await page.goto('/balance/refunds')
  await settle(page)
  expect(
    await screenText(page),
    'возврат не попал в журнал возвратов — деньги вернулись мимо кассы',
  ).not.toContain('Возвратов не было')

  /**
   * И НЕ лежит в пополнениях. Ломалось именно так: чип «Брак» звал ПОПОЛНЕНИЕ,
   * и в документах появлялся счёт «Пополнение баланса», которого агентство
   * никогда не оплачивало.
   */
  await page.goto('/balance/top-ups')
  await settle(page)
  expect(
    await screenText(page),
    'возврат записан пополнением картой: в документах появился счёт, которого агентство не оплачивало',
  ).not.toContain('Мгновенное зачисление')
})

test('путь 6: тот же путь с телефона доходит до карточки выбранного объекта', async ({ page }) => {
  await register(page)
  await page.setViewportSize({ width: 390, height: 844 })

  // ── нижние вкладки открывают разделы ──────────────────────────────────
  await page.goto('/m/search')
  await page.waitForSelector('[data-slot="mobile-bottom-nav"]')
  await page.locator('[data-slot="mobile-tab"]', { hasText: 'Баланс' }).click()
  await expect(page, 'нижняя вкладка не открыла раздел: кабинет на телефоне недостижим').toHaveURL(
    /\/m\/balance/,
  )

  // ── выдача настоящая, а не три вписанные карточки ─────────────────────
  await page.goto('/m/search')
  await page.waitForSelector('[data-slot="mobile-listing-row"]')
  const rows = page.locator('[data-slot="mobile-listing-row"]')
  expect(
    await rows.count(),
    'мобильная выдача показывает вписанные карточки вместо базы',
  ).toBeGreaterThan(3)

  // ── строка ведёт в КОНКРЕТНЫЙ объект ──────────────────────────────────
  const second = rows.nth(1)
  const address = (await second.getAttribute('data-address')) ?? ''
  expect(address, 'у строки выдачи нет адреса').not.toBe('')
  await second.click()

  await expect(page, 'карточка объекта открылась без адреса').toHaveURL(/at=/)
  expect(
    (await page.locator('body').innerText()).replace(/\s+/g, ' '),
    'на телефоне открылся не тот объект, который выбрали: карточка прибита к одному адресу',
  ).toContain(address)
})
