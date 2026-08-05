import { mkdir, rm, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

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
   * Высоту карточки держит фото 96, а не текст, и это её главное свойство:
   * адрес переносится на две строки, мета — на две, и 48 + 6 + 32 = 86
   * всё ещё меньше 96. Поэтому проверяются **все** карточки на стенде,
   * а не первая: выросшая карточка — признак того, что текст перевесил фото.
   */
  const heights = await page.evaluate(() =>
    [...document.querySelectorAll('[data-slot="mobile-listing-row"]')].map((card) =>
      Math.round(card.getBoundingClientRect().height),
    ),
  )
  expect(heights, 'карточка выросла: текст перевесил фото').toEqual(heights.map(() => 204))

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

  // Всё из файла: 358 × 204, фото 96, чип 32 (а не 24, как на десктопе),
  // кнопка 150 × 44 — на телефоне ступени начинаются с 44.
  expect(measured).toEqual({
    cardHeight: 204,
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
  await seedSession(page)
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
    tones: ['attention', 'calm', 'done'],
    removeButtons: 0,
  })
})

test('агентство · сотрудники и эффективность', async ({ page }) => {
  await seedSession(page)
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

  expect(measured.funnelWidths).toEqual([520, 281, 50, 9])
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

  await page.goto('/screen/search')
  await page.waitForSelector('[data-slot="listing-row"]')
  const real = await page.evaluate(() => {
    const row = document.querySelector('[data-slot="listing-row"]')!
    const left = row.getBoundingClientRect().left
    return [...row.children].map((child) =>
      Math.round(child.getBoundingClientRect().left - left),
    )
  })

  await page.goto('/screen/states')
  await page.waitForSelector('[data-slot="skeleton-row"]')
  const skeleton = await page.evaluate(() => {
    const row = document.querySelector('[data-slot="skeleton-row"]')!
    const left = row.getBoundingClientRect().left
    return [...row.children].map((child) =>
      Math.round(child.getBoundingClientRect().left - left),
    )
  })

  // Кадры разной ширины — 908 у выдачи и 908 у стенда, — поэтому сравниваются
  // смещения от левого края строки, а не абсолютные координаты.
  expect(skeleton, 'колонки скелета разошлись с колонками строки выдачи').toEqual(real)
})
