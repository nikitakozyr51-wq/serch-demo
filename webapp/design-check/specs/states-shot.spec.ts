import { mkdir, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedAgency, seedSession, seedWork } from '../lib/session'

/**
 * Снимки состояний выдачи.
 *
 * Восемь кадров по 940 × 560 из файла: загрузка, ошибка источника и шесть
 * пустых. Каждый снимается отдельно — сличать их с макетом придётся глазами,
 * а на общем снимке страницы деталей не разглядеть.
 *
 * Отдельно проверяется то, что перечень свойств не ловит: скелет обязан
 * повторять колонки настоящей строки, иначе при появлении данных всё прыгнет.
 */

const currentDir = dirname(fileURLToPath(import.meta.url))
const shotsDir = resolve(currentDir, '../.artifacts/shots/states')

const STAGES = [
  ['pG4yw', 'загрузка выдачи'],
  ['g6EnZ', 'ошибка источника'],
  ['UYQoT', 'пусто, первый вход'],
  ['Yz08U', 'пусто, перефильтровали'],
  ['jxTTf', 'поиск без результата'],
  ['IhrBR', 'похожих не нашлось'],
  ['a6C5P', 'в коридоре никого нет'],
  ['cTCZL', 'смена не начата'],
] as const

test('снимки: состояния выдачи', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/states')
  await page.waitForSelector('[data-slot="listings-skeleton"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  for (const [id] of STAGES) {
    const path = resolve(shotsDir, `${id}.png`)
    await rm(path, { force: true })
    const stage = page.locator(`[data-check="state-${id}|rest"]`)
    await expect(stage, `кадр ${id} не найден на стенде`).toHaveCount(1)
    await stage.screenshot({ path })

    const info = await stat(path).catch(() => null)
    expect(info, `снимок ${id} не создан`).not.toBeNull()
    expect(info!.size, `снимок ${id} пустой`).toBeGreaterThan(1024)
  }
})

test('мобильная строка: геометрия и порядок фактов', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/states')
  await page.waitForSelector('[data-slot="mobile-listing-row"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'G37qjO.png')
  await rm(path, { force: true })
  await page.locator('[data-check="mobile-row|rest"]').screenshot({ path })
  const info = await stat(path).catch(() => null)
  expect(info, 'снимок мобильной строки не создан').not.toBeNull()

  /**
   * Высоту карточки держит ТО, ЧТО ВЫШЕ: кадр 64 или текст рядом с ним.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Прежде проверка требовала от всех карточек ровно 204 и была зелёной —
   * но держалось это не правилом, а совпадением: кадр стоял квадратом 96
   * и был выше любого текста. Когда кадр привели к трём к двум (96 × 64),
   * совпадение кончилось, и карточка с адресом «Стахановцев ул., 14»
   * выросла до 194: адрес переносится на две строки, и текст занимает 86.
   *
   * Уравнять их нечем, и это не недоделка. Обрезать адрес многоточием
   * DESIGN.md запрещает прямо; сокращать по смыслу нельзя — адрес это
   * адрес. Значит высота карточки телефонного списка **зависит от адреса**,
   * и правило здесь другое: карточка не короче нарисованных 172 и ровно
   * такая, какой её делает содержимое.
   *
   * Кадр `G37qjO` рисует 172, потому что в нём адрес однострочный. Это
   * названо дизайн-чату: компонент собран на данных, которых в базе нет.
   */
  const heights = await page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="mobile-listing-row"]')].map((card) =>
      Math.round(card.getBoundingClientRect().height),
    ),
  )
  const short = heights.filter((height) => height < 196)
  expect(short, 'карточка ниже нарисованных 196: кадр или текст сжался').toEqual([])

  /*
    Расти карточка может ТОЛЬКО от содержимого.

    Проверяется точно, а не с запасом: высота обязана сойтись из детей,
    полей и зазоров до пикселя. Запас в проверке — это место, где потом
    поселится забытое число: `h-51`, лишняя распорка, поле, поставленное
    «чтобы не липло». Сойтись должно ровно.
  */
  const grown = await page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="mobile-listing-row"]')]
      .map((card) => {
        const style = getComputedStyle(card)
        const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom)
        const gap = Number.parseFloat(style.rowGap) || 0
        const children = [...card.children]
        const content = children.reduce(
          (sum, child) => sum + child.getBoundingClientRect().height,
          0,
        )
        const expected = Math.round(content + padding + gap * Math.max(0, children.length - 1))
        return { own: Math.round(card.getBoundingClientRect().height), expected }
      })
      .filter((card) => Math.abs(card.own - card.expected) > 1),
  )
  expect(grown, 'высота карточки не сходится из содержимого, полей и зазоров').toEqual([])

  const measured = await page.evaluate(() => {
    const card = document.querySelector('[data-slot="mobile-listing-row"]')!
    const photo = card.querySelector('[data-slot="listing-photo"], [data-slot="photo-placeholder"]')!
    const chip = card.querySelector('[data-slot="status-chip"]')!
    const action = card.querySelector('[data-slot="mobile-action"]')!
    const round = (value: number) => Math.round(value * 100) / 100
    return {
      cardHeight: round(card.getBoundingClientRect().height),
      cardWidth: round(card.getBoundingClientRect().width),
      photo: round(photo.getBoundingClientRect().width),
      chip: round(chip.getBoundingClientRect().height),
      actionWidth: round(action.getBoundingClientRect().width),
      actionHeight: round(action.getBoundingClientRect().height),
    }
  })

  // Всё из файла: 358 × 196, кадр 96 (× 64 — три к двум, как везде),
  // чип 32 (а не 24, как на десктопе), кнопка 150 × 44 — на телефоне
  // ступени начинаются с 44.
  //
  // Высота прошла 204 → 172 → 196, и оба шага не про красоту. 204 давал
  // квадратный кадр 96: он был выше текста и держал карточку собой.
  // Кадр привели к трём к двум — стало 172, но адрес делил строку с ценой
  // и получал 118 пикселей из 222, отчего настоящий «Дальневосточный пр.,
  // 68» ломался на две строки. Адрес поставили на свою строку, цену под
  // ним — 196. Перенос адреса стоил бы 32, эта перестановка стоила 24.
  expect(measured).toEqual({
    cardHeight: 196,
    cardWidth: 358,
    photo: 96,
    chip: 32,
    actionWidth: 150,
    actionHeight: 44,
  })
})

test('мобильный экран выдачи: каркас 390 × 844', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/mobile')
  await page.waitForSelector('[data-slot="mobile-screen"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'waJiE.png')
  await rm(path, { force: true })
  await page.locator('[data-slot="mobile-screen"]').screenshot({ path })
  expect(await stat(path).catch(() => null), 'снимок мобильного экрана не создан').not.toBeNull()

  const measured = await page.evaluate(() => {
    const round = (value: number) => Math.round(value * 100) / 100
    const box = (selector: string) => {
      const node = document.querySelector(selector)
      if (!node) return null
      const rect = node.getBoundingClientRect()
      return { w: round(rect.width), h: round(rect.height) }
    }
    return {
      screen: box('[data-slot="mobile-screen"]'),
      header: box('[data-slot="mobile-header"]'),
      nav: box('[data-slot="mobile-bottom-nav"]'),
      filters: box('[data-slot="mobile-filters"]'),
      tab: box('[data-slot="mobile-tab"]'),
      rows: document.querySelectorAll('[data-slot="mobile-listing-row"]').length,
    }
  })

  /**
   * Всё снято с `waJiE` и `U15v7`: экран 390 × 844, шапка 56, навигация 72,
   * кнопка фильтров 98 × 44, вкладка 75 × 48, карточек три.
   *
   * Допуск в 1 px есть у двух величин, и обе — не наша вольность.
   * Ширина кнопки фильтров задана содержимым, и подпись «Фильтры 7»
   * в браузере на доли пикселя уже, чем в макете. Ширина вкладки упирается
   * в **переполнение самого файла**: пять вкладок по 75 дают 375 при 374
   * доступных, и в браузере они честно ужимаются на 0,2 px каждая.
   * В макете лишний пиксель просто вылезает за поле.
   */
  const near = (got: number, want: number) => Math.abs(got - want) <= 1

  expect(measured.screen, 'кадр экрана').toEqual({ w: 390, h: 844 })
  expect(measured.header, 'шапка').toEqual({ w: 390, h: 56 })
  expect(measured.nav, 'нижняя навигация').toEqual({ w: 390, h: 72 })
  expect(measured.rows, 'карточек в списке').toBe(3)

  expect(measured.filters!.h, 'высота кнопки фильтров').toBe(44)
  expect(
    near(measured.filters!.w, 98),
    `ширина кнопки фильтров: макет 98, код ${measured.filters!.w}`,
  ).toBe(true)

  expect(measured.tab!.h, 'высота вкладки').toBe(48)
  expect(near(measured.tab!.w, 75), `ширина вкладки: макет 75, код ${measured.tab!.w}`).toBe(true)
})

test('карточка объекта: каркас и колонки', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/object')
  await page.waitForSelector('[data-slot="card-panel"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'Fo8gk.png')
  await rm(path, { force: true })
  await page.screenshot({ path, fullPage: true })
  expect(await stat(path).catch(() => null), 'снимок карточки не создан').not.toBeNull()

  const measured = await page.evaluate(() => {
    const round = (value: number) => Math.round(value * 100) / 100
    const width = (selector: string) => {
      const node = document.querySelector(selector)
      return node ? round(node.getBoundingClientRect().width) : null
    }
    const panel = document.querySelector('[data-slot="card-panel"]')!
    return {
      panelHeight: round(panel.getBoundingClientRect().height),
      panelWidth: round(panel.getBoundingClientRect().width),
      blocks: document.querySelectorAll('[data-slot="card-block"]').length,
      tables: document.querySelectorAll('[data-slot="mini-table"]').length,
      tableRows: document.querySelectorAll('[data-slot="mini-table-row"]').length,
      // Вторичные действия панели — тихие кнопки: тёплые, без границы.
      actions: panel.querySelectorAll('[data-slot="button"][data-variant="quiet"]').length,
      // Кнопка раскрытия обязана быть вариантом «деньги»: красный на ней
      // значит «сейчас спишутся 199 ₽», и подменить его тёмным нельзя.
      disclose: width('[data-slot="button"][data-variant="money"]'),
      moneyButtons: document.querySelectorAll('[data-variant="money"]').length,
    }
  })

  // Панель 48 на всю правую часть 1200, четыре вторичных действия,
  // пять озаглавленных блоков, две мини-таблицы по три строки,
  // кнопка раскрытия на всю колонку решения 564 и она одна на экране.
  expect(measured).toEqual({
    panelHeight: 48,
    panelWidth: 1200,
    blocks: 5,
    tables: 2,
    tableRows: 6,
    actions: 4,
    disclose: 564,
    moneyButtons: 1,
  })
})

test('карточка после раскрытия: номер, фиксация и похожие', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/object-disclosed')
  await page.waitForSelector('[data-slot="button"][data-variant="primary"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'NKj5L.png')
  await rm(path, { force: true })
  await page.screenshot({ path, fullPage: true })
  expect(await stat(path).catch(() => null), 'снимок раскрытой карточки не создан').not.toBeNull()

  const measured = await page.evaluate(() => {
    const round = (value: number) => Math.round(value * 100) / 100
    const call = document.querySelector('[data-slot="button"][data-variant="primary"]')!
    return {
      callWidth: round(call.getBoundingClientRect().width),
      callHeight: round(call.getBoundingClientRect().height),
      resultChips: document.querySelectorAll('[data-slot="select-chip"]').length,
      similar: document.querySelectorAll('[data-slot="similar-row"]').length,
      // Признаков собственника после раскрытия быть не должно: вопрос
      // «стоит ли платить» снят, и блок ушёл вместе с ним.
      ownerSignals: document.querySelectorAll('[data-slot="owner-signal"]').length,
      // Красной кнопки здесь быть не может: деньги уже списаны,
      // и второй раз за тот же контакт их не берут.
      moneyButtons: document.querySelectorAll('[data-variant="money"]').length,
    }
  })

  expect(measured).toEqual({
    callWidth: 564,
    callHeight: 48,
    resultChips: 4,
    similar: 3,
    ownerSignals: 0,
    moneyButtons: 0,
  })
})

test('Сегодня: три секции и порядок по срочности', async ({ page }) => {
  await seedSession(page)
  /**
   * «Сегодня» больше не константа: секции собираются из журналов. Значит и
   * стенд наполняется журналом — иначе он показывает пустой экран и сверять
   * нечего. Здесь ровно то, что нарисовано в макете: перезвон на сегодня,
   * взятый в работу объект и сохранённый поиск.
   */
  const ADDRESSES = [
    'Ленская ул., 10',
    'Гражданский пр., 114',
    'Науки пр., 17',
    'Стахановцев ул., 14',
    'Заневский пр., 32',
    'Ленская ул., 6',
  ]
  // Время считается от текущего момента, а не прибито числом: «просрочен»
  // и «на сегодня» — это отношение ко «сейчас», и с фиксированной датой
  // проверка либо всегда врёт, либо перестаёт работать назавтра.
  const NOW = Date.now()
  const AT = NOW - 6 * 60 * 60 * 1000

  await seedWork(page, ADDRESSES, {
    // Четыре перезвона на сегодня и два взятых в работу — состав кадра `kNd9b`.
    calls: ADDRESSES.slice(0, 4).map((address, index) => ({
      id: `c${index}`,
      address,
      at: AT + index,
      outcome: 'не дозвонился',
      note: 'две попытки без ответа',
      // Два перезвона просрочены, два ещё впереди — состав кадра.
      remindAt: index < 2 ? NOW - 60 * 60 * 1000 : NOW + 60 * 60 * 1000,
      by: 'Смирнова Ирина',
    })),
    // Один объект в стоп-листе: строка «звонок запрещён» в макете есть, и без
    // неё проверка не поймала бы, что запрет перестал рисоваться.
    stopList: ['Стахановцев ул., 14'],
    /**
     * ТРИ поиска, а не один.
     *
     * Здесь стоял один, а ожидание ниже требовало трёх строк в секции —
     * и сходилось, потому что экран рисовал три ВПИСАННЫХ поиска вместо
     * заведённых. То есть проверка утверждала сам дефект: у агентства
     * с одним своим поиском секция показывала три чужих.
     *
     * Кадр `kNd9b` рисует в этой секции три строки, поэтому стенд заводит
     * три поиска. Теперь ожидание проверяет правило «строк столько,
     * сколько поисков», а не число 3 само по себе.
     */
    savedSearches: [
      {
        id: 's1',
        name: 'Красногвардейский 2-к до 15',
        createdAt: AT,
        query: { districts: [], rooms: [], priceCap: 15, tab: 'all', sort: 'fresh' },
      },
      {
        id: 's2',
        name: 'Снизили цену за 3 дня',
        createdAt: AT,
        query: { districts: [], rooms: [], priceCap: 0, tab: 'cheaper', sort: 'fresh' },
      },
      {
        id: 's3',
        name: 'Комнаты Центральный',
        createdAt: AT,
        query: { districts: ['central'], rooms: [1], priceCap: 0, tab: 'all', sort: 'fresh' },
      },
    ],
  })
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/today')
  await page.waitForSelector('[data-slot="today-section"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'kNd9b.png')
  await rm(path, { force: true })
  await page.screenshot({ path, fullPage: true })
  expect(await stat(path).catch(() => null), 'снимок «Сегодня» не создан').not.toBeNull()

  const measured = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-slot="today-row"]')]
    return {
      sections: document.querySelectorAll('[data-slot="today-section"]').length,
      rows: rows.length,
      rowHeights: [...new Set(rows.map((row) => Math.round(row.getBoundingClientRect().height)))],
      blocked: document.querySelectorAll('[data-slot="today-row"][data-blocked]').length,
      searches: document.querySelectorAll('[data-slot="today-search"]').length,
      // Строка «2 дня без звонка» обязана быть цветом внимания: за контакт
      // уже заплачено, а звонка не было. Это про деньги агентства.
      warn: [...document.querySelectorAll('[data-slot="today-row"] [data-slot="typography"]')].filter(
        (node) => getComputedStyle(node).color === 'rgb(117, 108, 0)',
      ).length,
    }
  })

  expect(measured).toEqual({
    sections: 3,
    rows: 6,
    rowHeights: [88],
    blocked: 1,
    // Ровно столько строк, сколько поисков посажено выше. Число здесь
    // не самостоятельное: оно равно длине `savedSearches`, и если экран
    // снова начнёт рисовать свои — проверка это назовёт.
    searches: 3,
    warn: 2,
  })
})

test('карта экранов: все ссылки ведут на живые страницы', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen')
  await page.waitForSelector('[data-slot="map-card"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'map.png')
  await rm(path, { force: true })
  await page.screenshot({ path, fullPage: true })
  expect(await stat(path).catch(() => null), 'снимок карты не создан').not.toBeNull()

  /**
   * Карта врёт легче любого экрана: ссылка на несобранный экран выглядит
   * ровно как на собранный. Поэтому каждая ссылка открывается и проверяется
   * на то, что страница отрисовалась, а не отдала пустоту.
   */
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('a[data-slot="map-card"]')].map(
      (node) => node.getAttribute('href') ?? '',
    ),
  )

  expect(links.length, 'ссылок на карте').toBeGreaterThan(5)

  // Запас 15 с, а не 5: на холодном старте Vite собирает страницу по первому
  // обращению, и первая ссылка открывается заметно дольше остальных.
  // Пятисекундного окна не хватало, и проверка мигала — а мигающая проверка
  // хуже отсутствующей: ей перестают верить.
  const dead: string[] = []
  for (const href of links) {
    await page.goto(href)
    const rendered = await page
      .waitForSelector('[data-slot]', { timeout: 15_000 })
      .then(() => true)
      .catch(() => false)
    if (!rendered) dead.push(href)
  }

  expect(dead, 'ссылки карты, которые никуда не ведут').toEqual([])
})

test('режим «Прозвон»: полный экран без навигации', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/call')
  await page.waitForSelector('[data-slot="fix-panel"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'pR6T1.png')
  await rm(path, { force: true })
  await page.screenshot({ path, fullPage: true })
  expect(await stat(path).catch(() => null), 'снимок прозвона не создан').not.toBeNull()

  const measured = await page.evaluate(() => {
    const round = (value: number) => Math.round(value * 100) / 100
    const panel = document.querySelector('[data-slot="fix-panel"]')!
    const bar = document.querySelector('[data-slot="call-bar"]')!
    const chips = [...document.querySelectorAll('[data-slot="select-chip"]')]
    return {
      barHeight: round(bar.getBoundingClientRect().height),
      panelWidth: round(panel.getBoundingClientRect().width),
      chips: chips.length,
      selected: chips.filter((chip) => chip.hasAttribute('data-selected')).length,
      groups: document.querySelectorAll('[data-slot="fix-group"]').length,
      qualification: document.querySelectorAll('[data-slot="qualification"]').length,
      // Режим полноэкранный: ни шапки кабинета, ни сайдбара здесь быть не должно.
      header: document.querySelectorAll('[data-slot="cabinet-header"]').length,
      sidebar: document.querySelectorAll('[data-slot="cabinet-sidebar"]').length,
    }
  })

  expect(measured).toEqual({
    barHeight: 56,
    panelWidth: 460,
    chips: 17,
    selected: 2,
    groups: 5,
    qualification: 4,
    header: 0,
    sidebar: 0,
  })
})

test('мобильный прозвон: одна колонка и подвал под палец', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/mobile-call')
  await page.waitForSelector('[data-slot="mobile-call-footer"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'q4uhsx.png')
  await rm(path, { force: true })
  await page.locator('[data-slot="mobile-call-screen"]').screenshot({ path })
  expect(await stat(path).catch(() => null), 'снимок мобильного прозвона не создан').not.toBeNull()

  const measured = await page.evaluate(() => {
    const round = (value: number) => Math.round(value * 100) / 100
    const box = (selector: string) => {
      const node = document.querySelector(selector)
      if (!node) return null
      const rect = node.getBoundingClientRect()
      return { w: round(rect.width), h: round(rect.height) }
    }
    const screen = document.querySelector('[data-slot="mobile-call-screen"]')!
    const footer = document.querySelector('[data-slot="mobile-call-footer"]')!
    return {
      screen: box('[data-slot="mobile-call-screen"]'),
      bar: box('[data-slot="mobile-call-bar"]'),
      call: box('[data-slot="button"][data-variant="primary"]'),
      secondary: document.querySelectorAll('[data-slot="mobile-call-secondary"]').length,
      // Подвал прижат к низу: его нижний край совпадает с краем экрана.
      footerAtBottom:
        Math.round(footer.getBoundingClientRect().bottom) ===
        Math.round(screen.getBoundingClientRect().bottom),
      // Панели фиксации на телефоне нет — она не помещается.
      fixPanel: document.querySelectorAll('[data-slot="fix-panel"]').length,
    }
  })

  expect(measured).toEqual({
    screen: { w: 390, h: 844 },
    bar: { w: 390, h: 56 },
    call: { w: 358, h: 48 },
    secondary: 2,
    footerAtBottom: true,
    fixPanel: 0,
  })
})

test('агентство · отказы: таблица и запрет на снятие', async ({ page }) => {
  /**
   * Двенадцать отметок сажаются в журнал, а не берутся из экрана.
   *
   * Раньше двенадцать строк стояли константой внутри самого экрана, и эта
   * проверка сравнивала константу сама с собой — то есть не проверяла ничего.
   * Теперь стоп-лист приходит из работы агентства, и число строк на экране
   * доказывает, что экран действительно читает журнал.
   */
  await seedAgency(page, {
    stopList: Array.from({ length: 12 }, (_, index) => `Ленская ул., ${index + 1}`),
    calls: Array.from({ length: 12 }, (_, index) => ({
      address: `Ленская ул., ${index + 1}`,
      by: 'Смирнова Ирина',
      outcome: 'отказ',
      agoMinutes: 60 + index * 17,
    })),
  })
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/screen/agency-refusals')
  await page.waitForSelector('[data-slot="data-table"]')
  await page.evaluate(() => document.fonts.ready)
  await mkdir(shotsDir, { recursive: true })

  const path = resolve(shotsDir, 'Y2Up0t.png')
  await rm(path, { force: true })
  await page.screenshot({ path, fullPage: true })
  expect(await stat(path).catch(() => null), 'снимок отказов не создан').not.toBeNull()

  const measured = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-slot="data-row"]')]
    const chips = [...document.querySelectorAll('[data-slot="agency-chip"]')]
    return {
      rows: rows.length,
      rowHeights: [...new Set(rows.map((row) => Math.round(row.getBoundingClientRect().height)))],
      tabs: document.querySelectorAll('[data-slot="agency-tab"]').length,
      activeTabs: document.querySelectorAll('[data-slot="agency-tab"][data-active]').length,
      tones: [...new Set(chips.map((chip) => chip.getAttribute('data-tone')))].sort(),
      // Ни одной кнопки, снимающей отказ: снять его нельзя ни одной ролью,
      // и кнопки, которой нет в продукте, не должно быть и на экране.
      removeButtons: [...document.querySelectorAll('button')].filter((node) =>
        /снять|удалить отказ/i.test(node.textContent ?? ''),
      ).length,
    }
  })

  expect(measured).toEqual({
    rows: 12,
    rowHeights: [48],
    // Вкладок пять: к четырём журналам добавились «Согласия».
    tabs: 5,
    activeTabs: 1,
    /**
     * Оттенок один, и это осознанное расхождение с макетом.
     *
     * В `Y2Up0t` состояний три — «Скрыт», «На удалении», «Удалён», — но
     * удалять номер из реестра продукт не умеет и не будет: снять отказ
     * нельзя ни агенту, ни руководителю, об этом плашка над таблицей.
     * Три оттенка обещали бы процесс, которого нет. Расхождение записано
     * в самом экране, здесь оно закреплено числом.
     */
    tones: ['calm'],
    removeButtons: 0,
  })
})

test('агентство · сотрудники и эффективность', async ({ page }) => {
  /**
   * Воронка считается по журналу, а не рисуется по макету.
   *
   * Числа взяты те же, что стояли в файле, — 178 раскрытий, 96 дозвонов,
   * 17 отказов, 3 посредника, — но теперь они получаются из записей, а
   * ширина полосы вычисляется из значения. Ожидание ниже поэтому проверяет
   * арифметику продукта: 520 у верхней ступени и доля от неё у остальных.
   *
   * Всё внутри окна в 30 дней: воронка считает за период, и запись старше
   * окна в неё просто не попала бы.
   */
  const staff = [
    { name: 'Смирнова Ирина', initials: 'ИС', email: 'i.smirnova@nevsky.ru', role: 'owner' as const, limit: null },
    { name: 'Агент второй', initials: 'А2', email: 'a2@nevsky.ru', role: 'agent' as const, limit: 5 },
    { name: 'Агент третий', initials: 'А3', email: 'a3@nevsky.ru', role: 'agent' as const, limit: 5 },
    { name: 'Агент четвёртый', initials: 'А4', email: 'a4@nevsky.ru', role: 'agent' as const, limit: null },
  ]

  const call = (outcome: string, count: number, from: number) =>
    Array.from({ length: count }, (_, index) => ({
      address: `Ленская ул., ${from + index}`,
      by: staff[index % staff.length]!.name,
      outcome,
      agoMinutes: 120 + index * 3,
    }))

  await seedAgency(page, {
    people: staff,
    disclosures: Array.from({ length: 178 }, (_, index) => ({
      address: `Ленская ул., ${index + 1}`,
      by: staff[index % staff.length]!.name,
      amount: 199,
      agoMinutes: 60 + index * 5,
    })),
    calls: [...call('дозвонился', 96, 1), ...call('отказ', 17, 200), ...call('посредник', 3, 300)],
  })
  await page.setViewportSize({ width: 1440, height: 1024 })
  await mkdir(shotsDir, { recursive: true })

  for (const [path, name] of [
    ['/screen/agency-staff', 'u7anli'],
    ['/screen/agency-efficiency', 'Iebim'],
  ] as const) {
    await page.goto(path)
    await page.waitForSelector('[data-slot="data-table"]')
    await page.evaluate(() => document.fonts.ready)

    const shot = resolve(shotsDir, `${name}.png`)
    await rm(shot, { force: true })
    await page.screenshot({ path: shot, fullPage: true })
    expect(await stat(shot).catch(() => null), `снимок ${name} не создан`).not.toBeNull()
  }

  const measured = await page.evaluate(() => {
    const bars = [...document.querySelectorAll('[data-slot="funnel-bar"]')]
    return {
      // Воронка сужается сверху вниз: если полосы не убывают, что-то
      // подставлено не туда, и это видно раньше, чем глазом.
      funnelWidths: bars.map((bar) => Math.round(bar.getBoundingClientRect().width)),
      rows: document.querySelectorAll('[data-slot="data-row"]').length,
      sortedColumns: document.querySelectorAll('[data-slot="data-table"] [data-slot]').length >= 0,
    }
  })

  // 520 · 96/178 = 280,4 · 17/178 = 49,7 · 3/178 = 8,8 — округление к ближайшему.
  expect(measured.funnelWidths).toEqual([520, 280, 50, 9])
  expect(
    measured.funnelWidths.every(
      (width, index) => index === 0 || width < measured.funnelWidths[index - 1]!,
    ),
    'воронка обязана сужаться сверху вниз',
  ).toBe(true)
  expect(measured.rows, 'строк в таблице агентов').toBe(4)
})

test('скелет повторяет колонки настоящей строки', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })

  /**
   * Сравниваются НЕ абсолютные смещения, и это исправление.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Прежде проверка брала левый край каждой колонки и требовала совпадения
   * числом. Это работало, пока обе строки были шириной 908. После того как
   * колонка фильтров ушла, выдача выросла до 1200, а стенд состояний остался
   * прежним — и проверка упала на трёх правых колонках, хотя скелет
   * по-прежнему повторял строку правильно.
   *
   * Раскладка гарантирует другое: колонка «Объект» тянется, всё до неё
   * прижато влево, всё после — вправо. Значит сравнивать надо левый край
   * у ведущих колонок и ПРАВЫЙ край у замыкающих. Тогда проверка
   * не зависит от ширины и ловит именно то, ради чего заведена, —
   * расхождение колонок.
   */
  const columns = async (slot: string) =>
    page.evaluate((selector) => {
      const row = document.querySelector(selector)!
      const box = row.getBoundingClientRect()
      const children = [...row.children].map((child) => child.getBoundingClientRect())
      // Тянется та колонка, что шире всех: остальные закреплены числом.
      const flexing = children.reduce(
        (best, rect, index) => (rect.width > children[best]!.width ? index : best),
        0,
      )
      return {
        count: children.length,
        flexing,
        before: children.slice(0, flexing).map((rect) => Math.round(rect.left - box.left)),
        after: children.slice(flexing + 1).map((rect) => Math.round(box.right - rect.right)),
        widths: children
          .filter((_, index) => index !== flexing)
          .map((rect) => Math.round(rect.width)),
      }
    }, slot)

  await page.goto('/screen/search')
  await page.waitForSelector('[data-slot="listing-row"]')
  const real = await columns('[data-slot="listing-row"]')

  await page.goto('/screen/states')
  await page.waitForSelector('[data-slot="skeleton-row"]')
  const skeleton = await columns('[data-slot="skeleton-row"]')

  expect(skeleton, 'колонки скелета разошлись с колонками строки выдачи').toEqual(real)
})
