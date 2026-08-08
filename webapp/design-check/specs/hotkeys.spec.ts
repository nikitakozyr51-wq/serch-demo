import { expect, test } from '@playwright/test'

import { ACCOUNT_EMAIL, seedAccountOnly, seedSession, seedWork } from '../lib/session'

/**
 * Войти в кабинет.
 *
 * Кабинет закрыт для тех, кто не вошёл, — поэтому проверки, которые смотрят
 * на выдачу и на баланс, обязаны сначала пройти дверь. Это не обход защиты,
 * а тот же путь, которым идёт человек.
 */
async function enterCabinet(page: import('@playwright/test').Page) {
  /**
   * Дверь проверяется ОДИН раз — отдельной проверкой ниже, — а не в каждой
   * из шести проверок клавиатуры.
   *
   * Раньше здесь заполнялась форма входа. Пока вход пускал любого, это было
   * дёшево; теперь он ищет агентство по почте, и шесть проверок клавиатуры
   * стали зависеть от внутренностей формы — от имени поля, от того, что
   * кнопка не выключена, от текста ошибки. Любая правка формы роняла шесть
   * проверок, не имеющих к ней отношения, и роняла по минуте каждую.
   *
   * Проверка одного правила в одном месте: вход — в «дверь пускает только
   * заведённое агентство», клавиатура — в своих проверках.
   */
  await seedSession(page)
  await page.goto('/today')
  await page.waitForSelector('[data-slot="cabinet-sidebar"]')
}

/**
 * ДВЕРЬ. Единственная проверка самого входа.
 *
 * Витрины, в которую пускали любого, в продукте больше нет: агентство заводит
 * человек, и вход ищет его по почте среди заведённых. Проверка держит обе
 * половины правила — незнакомую почту не пускает, знакомую пускает.
 */
test('вход: чужая почта не пускает, своя пускает', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await seedAccountOnly(page)
  await page.goto('/login')
  await page.waitForSelector('[data-slot="auth-field"] input')

  const email = page.locator('[data-slot="auth-field"] input[name="email"]')
  const enter = page.getByRole('button', { name: 'Войти' })

  await email.fill('нет-такого@example.com')
  await enter.click()
  await expect(
    page.locator('[data-slot="auth-field"][data-invalid]'),
    'вход пустил под почтой, под которой агентства не заводили',
  ).toBeVisible()
  expect(page.url(), 'вход увёл в кабинет вопреки отказу').toContain('/login')

  await email.fill(ACCOUNT_EMAIL)
  await enter.click()
  // Вход ведёт на сохранённые поиски, а не на «Сегодня»: у агентства,
  // созданного минуту назад, «Сегодня» пусто, и продукт начинался с пустоты.
  await page.waitForURL(/\/searches/)
})

/**
 * Клавиатура прозвона.
 *
 * Продукт обещает работу с клавиатуры как преимущество скорости, и это
 * заявленный дифференциатор, а не удобство. Проверка держит четыре правила
 * из `PROMPT-движение-и-интерактив.md`, каждое из которых легко потерять
 * при следующей правке экрана.
 */
test('прозвон: клавиши ставят результат и ведут к следующему объекту', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  // Очередь прозвона настоящая: раскрытые контакты, по которым ещё не
  // звонили. Раньше здесь стояло вписанное «7 из 24», и проверка держала
  // число, а не поведение.
  await seedSession(page)
  await seedWork(page, ['Ленская ул., 10', 'Гражданский пр., 114', 'Науки пр., 17'])
  await page.goto('/call')
  await page.waitForSelector('[data-slot="select-chip"]')

  const position = () => page.locator('[data-slot="call-bar"] >> text=/\\d+ из \\d+/').innerText()
  const selected = () =>
    page.locator('[data-slot="select-chip"][data-selected]').first().innerText()

  expect(await position()).toBe('1 из 3')

  /**
   * «3» — отказ, и после него сразу следующий объект.
   *
   * Исход записывается, а панель обнуляется: следующий звонок — другой
   * человек, и чужие отметки в его форме были бы ложной записью о нём.
   * Поэтому проверяется не чип на экране (он уже про новый объект),
   * а записанный исход и сдвинувшаяся позиция.
   */
  await page.keyboard.press('3')
  await expect(page.locator('[data-slot="call-bar"]')).toHaveAttribute(
    'data-last-result',
    'Отказ',
  )
  // Объект, по которому записан исход, уходит из очереди: она и есть список
  // того, что ещё не сделано. Осталось два, и позиция сдвинулась на второй —
  // «3» переводит к следующему, а очередь под ним укоротилась.
  expect(await position()).toBe('2 из 2')
  expect(await selected(), 'панель обязана обнулиться под новый объект').toContain('В работе')

  // «1» перехода не даёт: «в работе» значит, что с объектом продолжат сейчас.
  await page.keyboard.press('1')
  expect(await selected()).toContain('В работе')
  expect(await position()).toBe('2 из 2')

  // J и K листают список без мыши.
  await page.keyboard.press('k')
  expect(await position()).toBe('1 из 2')
  await page.keyboard.press('j')
  expect(await position()).toBe('2 из 2')

  // Esc возвращает в выдачу **на ту же строку**: адрес объекта уезжает
  // параметром, иначе агент теряет место после каждого звонка.
  await page.keyboard.press('Escape')
  await page.waitForURL(/\/search\?at=/)
})

test('клавиша не срабатывает, пока человек печатает', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await seedSession(page)
  await seedWork(page, ['Ленская ул., 10', 'Гражданский пр., 114'])
  await page.goto('/call')
  await page.waitForSelector('[data-slot="select-chip"]')

  /**
   * Буква в поле заметки обязана оставаться буквой. Без этой проверки
   * «3» в тексте заметки переводила бы агента к следующему объекту
   * посреди набора — и он бы не понял, что произошло.
   */
  await page.evaluate(() => {
    const field = document.createElement('input')
    field.id = 'проба-ввода'
    document.body.append(field)
    field.focus()
  })

  const before = await page.locator('[data-slot="call-bar"] >> text=/\\d+ из \\d+/').innerText()
  await page.keyboard.press('3')
  const after = await page.locator('[data-slot="call-bar"] >> text=/\\d+ из \\d+/').innerText()

  expect(after, 'позиция не должна меняться, пока фокус в поле ввода').toBe(before)
})

/**
 * Клавиатура выдачи и два окна кабинета.
 *
 * Карта клавиш обещает `⌘K` и `?` **на любом экране кабинета**, а в строке
 * выдачи — `B`, `S`, `H`, `N`. Обещание, работающее через раз, хуже
 * отсутствующего, поэтому проверка держит его отдельно от прозвона.
 */
test('выдача: стрелки водят курсор, буквы называют действие', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await enterCabinet(page)
  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  const selectedAddress = () =>
    page.locator('[data-slot="listing-row"][data-selected]').first().innerText()

  // Экран открывается с курсором на ПЕРВОЙ строке, за которую ещё не платили,
  // — то есть на объекте, с которым можно начать работать прямо сейчас.
  // Какой это адрес, зависит от сортировки по свежести, поэтому проверяется
  // правило, а не адрес: под курсором стоит платное действие.
  const first = await selectedAddress()
  expect(first, 'курсор встал не на строку, с которой можно начать').toContain('199 ₽')

  // Стрелка уводит курсор на другую строку и возвращает обратно. Какая именно
  // строка соседняя, зависит от сортировки и фильтров, поэтому проверяется
  // не адрес соседа, а сам факт перехода и возврата.
  await page.keyboard.press('ArrowDown')
  const second = await selectedAddress()
  expect(second, 'стрелка вниз не сдвинула курсор').not.toBe(first)

  await page.keyboard.press('ArrowUp')
  expect(await selectedAddress(), 'стрелка вверх не вернула курсор').toBe(first)

  // «B» открывает настоящее окно выбора подборки — с созданием первой.
  // Раньше клавиша писала строчку в служебный атрибут, и обещание пустого
  // экрана «объекты добавляются клавишей B» было ложным.
  await page.keyboard.press('b')
  await expect(page.locator('[data-slot="collection-picker"]')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.keyboard.press('s')
  await expect(page.locator('[data-slot="results"]')).toHaveAttribute(
    'data-last-action',
    /сменить статус/,
  )
})

test('счётчик баланса: раскрытие списывает 199 ₽ и считает 600 мс', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await enterCabinet(page)
  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  const box = page.locator('[data-slot="cabinet-header"] [data-variant="numeric"]')
  // Разряды разделены неразрывным пробелом, а не обычным: иначе «8 610 ₽»
  // переносилось бы посреди числа. Сравнение это учитывает.
  const balance = async () => (await box.innerText()).replace(/\s/g, ' ')
  expect(await balance()).toBe('8 610 ₽')

  // Платит КНОПКА строки, а не `Enter`: клавиша теперь открывает карточку.
  // Списание одним нажатием без экрана, где написана цена, — слишком
  // дорогая ошибка, чтобы висеть на самой частой клавише. Списание видно
  // счётчиком в шапке, а не тостом: деньги оставляют постоянный след.
  await page
    .locator('[data-slot="listing-row"][data-selected]')
    .first()
    .locator('[data-slot="button"]')
    .first()
    .click()

  // На середине счёта значение обязано отличаться и от старого, и от нового:
  // счётчик идёт, а не подменяется мгновенно.
  await page.waitForTimeout(250)
  const middle = await balance()
  expect(middle, 'на 250 мс счёт ещё идёт').not.toBe('8 610 ₽')
  expect(middle, 'на 250 мс счёт ещё не закончен').not.toBe('8 411 ₽')

  await expect
    .poll(balance, { timeout: 2000 })
    .toBe('8 411 ₽')

  // Второй раз за тот же объект агентство не платит, и кнопка это говорит:
  // «Раскрыть · 199 ₽» сменилась на «Открыть · 0 ₽».
  const again = page.locator('[data-slot="listing-row"][data-selected]').first()
  expect(
    await again.locator('[data-slot="button"]').first().innerText(),
    'строка не запомнила оплату',
  ).toContain('0 ₽')
})

test('кабинет: ⌘K открывает палитру, «?» — карту клавиш', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await enterCabinet(page)
  await page.goto('/today')
  await page.waitForSelector('[data-slot="cabinet-sidebar"]')

  await page.keyboard.press('Control+k')
  await expect(page.locator('[data-slot="command-palette"]')).toBeVisible()

  /*
    ЗАПРОС ПЕЧАТАЕТСЯ, И СПИСОК ИДЁТ ЗА НИМ.

    Здесь проверялось, что первым пунктом стоит «Ленская ул., 10», а стрелка
    переводит на «Ленскую ул., 6». Это были два ВПИСАННЫХ в палитру пункта,
    и проверка закрепляла их: поля ввода в палитре не существовало вовсе,
    а запрос был нарисован строкой «ленск». То есть проверка держала дефект.

    Теперь проверяется то, ради чего палитра есть: в неё печатают, и находится
    то, что напечатали.
  */
  await page.locator('[data-slot="palette-input"]').fill('бестуж')
  const items = () => page.locator('[data-slot="palette-item"]')
  await expect(items().first()).toContainText('Бестужевская')

  // Стрелка в палитре двигает выбор, а не прокручивает страницу под ней.
  const active = () => page.locator('[data-slot="palette-item"][data-active]').first().innerText()
  const first = await active()
  await page.keyboard.press('ArrowDown')
  expect(await active()).not.toBe(first)

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-slot="command-palette"]')).toHaveCount(0)

  await page.keyboard.press('?')
  await expect(page.locator('[data-slot="hotkeys-scrim"]')).toBeVisible()
  await expect(page.locator('text=Командная палитра')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-slot="hotkeys-scrim"]')).toHaveCount(0)
})

test('карточка объекта: ← и → листают список, Esc возвращает в выдачу', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await enterCabinet(page)
  await page.goto('/object')
  await page.waitForSelector('[data-slot="card-panel"]')

  const position = () =>
    page.locator('[data-slot="card-panel"] >> text=/\\d+ из 247/').innerText()
  expect(await position()).toBe('9 из 247')

  await page.keyboard.press('ArrowRight')
  expect(await position()).toBe('10 из 247')

  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  expect(await position()).toBe('8 из 247')

  await page.keyboard.press('Escape')
  await page.waitForURL(/\/search/)
})

/**
 * Открытое окно забирает клавиши себе.
 *
 * Из-за отсутствия этого правила `Enter`, нажатый в командной палитре,
 * доходил до выдачи под ней и раскрывал контакт под курсором — списание
 * 199 ₽ из окна, которое о выдаче ничего не знает. Проверка держит границу:
 * пока окно открыто, баланс не двигается.
 */
test('палитра забирает клавиши: Enter в ней не списывает деньги', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await enterCabinet(page)
  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  const box = page.locator('[data-slot="cabinet-header"] [data-variant="numeric"]')
  const balance = async () => (await box.innerText()).replace(/\s/g, ' ')
  const before = await balance()

  await page.keyboard.press('Control+k')
  await expect(page.locator('[data-slot="command-palette"]')).toBeVisible()

  const cursor = await page.locator('[data-slot="listing-row"][data-selected]').first().innerText()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-slot="command-palette"]')).toHaveCount(0)

  expect(await balance(), 'палитра пропустила нажатие вниз и списала деньги').toBe(before)
  expect(
    await page.locator('[data-slot="listing-row"][data-selected]').first().innerText(),
    'стрелки в палитре сдвинули курсор выдачи',
  ).toBe(cursor)
})

/**
 * `⌘K` и «?» обещаны на любом экране кабинета, включая раздел агентства:
 * он собран на своём каркасе, и окна там не подключались вовсе.
 */
test('окна работают и в разделе «Агентство»', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await enterCabinet(page)
  await page.goto('/agency/staff')
  await page.waitForSelector('[data-slot="agency-tabs"]')

  await page.keyboard.press('Control+k')
  await expect(page.locator('[data-slot="command-palette"]')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.keyboard.press('?')
  await expect(page.locator('[data-slot="hotkeys-scrim"]')).toBeVisible()
})
