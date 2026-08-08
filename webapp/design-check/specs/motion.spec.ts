import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Пятый слой: движение.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАЧЕМ ОН НУЖЕН, ЕСЛИ ЕСТЬ ЧЕТЫРЕ ПРЕДЫДУЩИХ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Четыре слоя сверки меряют НЕПОДВИЖНУЮ страницу: лестницы, токены, состояния
 * контролов на полигоне и честность самого полигона. Движения не видит ни один
 * из них — более того, вся полоса сверки идёт с включённым «меньше движения»,
 * потому что иначе цвет снимается посреди перехода.
 *
 * За этой слепой зоной накопилось ровно то, на что жаловался владелец:
 *
 * - чип фильтра не отвечал ни на наведение, ни на нажатие, будучи выбранным;
 * - сортировка и переключатель вида не отвечали вообще ни на что;
 * - затемнение под окном возникало одним кадром, пока карточка приезжала мягко;
 * - не исчезало НИЧТО: окна пропадали за кадр;
 * - на телефоне баланс менялся молча, хотя это единственное место кабинета,
 *   где движение обязательно.
 *
 * Каждая из пяти ошибок пережила линт, проверку типов, сборку и четыре слоя
 * сверки. Общая причина та же, что была у геометрии: проверялось то, что
 * НАПИСАНО, а не то, что ПОЛУЧИЛОСЬ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ПРОЕКТ В КОНФИГУРАЦИИ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `playwright.design.config.ts` ставит `reducedMotion: 'reduce'` на всю полосу.
 * Под этой настройкой движения нет по определению, и проверка движения была бы
 * вечнозелёной — худший вид проверки. Поэтому первые два теста живут в проекте
 * `motion` с `no-preference`, а третий возвращает `reduce` себе сам.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Числа — из `PROMPT-движение-и-интерактив.md`, раздел «Кабинет»: переходы
 * 120–200 мс, только `opacity` и `transform`, ни отскока, ни резинки.
 * Из HTML дизайн-системы не взято ничего: там стоят числа лендинга (0.78 s),
 * и они прямо названы ловушкой.
 */

/** Диапазон кабинета в секундах. Ниже — подмена кадра, выше — порог Нильсена. */
const MIN_S = 0.12
const MAX_S = 0.2

/**
 * Кадры, объявленные в `index.css`.
 *
 * Список закрытый: анимация с чужим именем означает, что кто-то завёл движение
 * мимо общего слоя — а значит мимо диапазона, кривой и запрета на раскладку.
 */
const KNOWN_KEYFRAMES = new Set([
  'serch-fade-in',
  'serch-fade-out',
  'serch-motion-in',
  'serch-motion-out',
  'serch-list-in',
  'serch-sheet-in',
  'serch-panel-in',
  'serch-panel-out',
])

type Snapshot = { background: string; borderBottom: string; outline: string }

async function styleOf(page: import('@playwright/test').Page, selector: string): Promise<Snapshot> {
  return page.evaluate((sel) => {
    const node = document.querySelector(sel)
    if (!node) return { background: 'нет узла', borderBottom: 'нет узла', outline: 'нет узла' }
    const style = getComputedStyle(node)
    return {
      background: style.backgroundColor,
      borderBottom: style.borderBottomColor,
      outline: style.outlineColor,
    }
  }, selector)
}

/**
 * Контролы выдачи и то, чем каждый обязан отвечать.
 *
 * У кнопки и чипа отвечает заливка, у вкладки — подчёркивание: вкладка
 * с заливкой перестаёт быть вкладкой, и это записано в коде рядом.
 */
const RESPONSIVE = [
  { name: 'строка выдачи', selector: '[data-slot="listing-row"]', property: 'background' },
  /*
    Чип проверяется в ОБОИХ состояниях, и это не педантизм.

    Первый прогон с одним общим селектором показал, зачем: сломанный чип
    прошёл проверку. `.first()` попал на ВЫБРАННЫЙ чип, у которого отклик
    был на месте, и молчащий невыбранный остался незамеченным. А ровно этой
    формы и была исходная ошибка — выбранный чип не отвечал ни на что,
    пока невыбранный отвечал на наведение.

    Одно состояние контрола не доказывает второго. Проверка, которая
    смотрит только на первый попавшийся узел, доказывает лишь его.
  */
  {
    name: 'чип фильтра, не выбран',
    selector: '[data-slot="filter-chip"]:not([data-selected]):not([data-invalid])',
    property: 'background',
  },
  {
    name: 'чип фильтра, выбран',
    selector: '[data-slot="filter-chip"][data-selected]',
    property: 'background',
  },
  /*
    Вкладка проверяется только неактивная — и это названное исключение.

    У активной вкладки наведения нет намеренно: она уже текущая, нажатие
    на неё ничего не меняет, и подсвечивать «сюда можно перейти» там значит
    врать. Нажатие у неё при этом есть.
  */
  {
    name: 'вкладка выдачи',
    selector: '[data-slot="result-tab"]:not([data-active])',
    property: 'borderBottom',
  },
  { name: 'сортировка', selector: '[data-slot="sort-toggle"]', property: 'background' },
  { name: 'переключатель вида', selector: '[data-slot="density-toggle"]', property: 'background' },
] as const

test('под пальцем отвечает всё, что нажимается', async ({ page }) => {
  await seedSession(page)

  const failures: string[] = []

  for (const control of RESPONSIVE) {
    /**
     * Каждый контрол меряется на СВЕЖЕЙ странице.
     *
     * Нажатие — это настоящее нажатие: чип переключает фильтр, строка ставит
     * курсор, вкладка меняет список. Мерить пять контролов подряд на одной
     * странице значит мерить пятый после четырёх чужих действий — и ловить
     * не отсутствие отклика, а последствия предыдущего замера. Так и вышло
     * при первом прогоне: вкладка «уезжала» после переключения чипа.
     */
    await page.goto('/search')
    await page.waitForSelector('[data-slot="listing-row"]')

    // Переходы выключаются на время замера: сравниваются конечные состояния,
    // а не кадры анимации. Тот же приём, что в проверке честности полигона.
    await page.addStyleTag({
      content: '*, *::before, *::after { transition-duration: 0s !important; }',
    })

    const target = page.locator(control.selector).first()
    if ((await target.count()) === 0) {
      failures.push(`${control.name}: узел ${control.selector} не найден`)
      continue
    }

    const rest = await styleOf(page, control.selector)
    await target.hover()
    const hover = await styleOf(page, control.selector)

    await page.mouse.down()
    const press = await styleOf(page, control.selector)
    await page.mouse.up()

    const key = control.property
    if (rest[key] === hover[key]) {
      failures.push(`${control.name}: наведение ничего не меняет (${key} остаётся ${rest[key]})`)
    }
    if (hover[key] === press[key]) {
      failures.push(`${control.name}: нажатие ничего не меняет (${key} остаётся ${hover[key]})`)
    }
  }

  expect(failures, failures.join('\n')).toEqual([])
})

test('окна приезжают переходом, а не подменой кадра', async ({ page }) => {
  await seedSession(page)
  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  const failures: string[] = []

  /** Снять объявленную анимацию узла: имя, длительность и что именно двигается. */
  const animationOf = async (selector: string) =>
    page.evaluate((sel) => {
      const node = document.querySelector(sel)
      if (!node) return null
      const style = getComputedStyle(node)
      return { name: style.animationName, seconds: Number.parseFloat(style.animationDuration) }
    }, selector)

  // Список выдачи проявляется целиком при смене условий — он на экране сразу.
  const shown: { name: string; selector: string }[] = [
    { name: 'список выдачи', selector: '[data-slot="results-list"]' },
  ]

  // Палитра открывается с клавиатуры на любом экране кабинета.
  await page.keyboard.press('Control+k')
  await page.waitForSelector('[data-slot="command-palette"]')
  shown.push(
    { name: 'затемнение палитры', selector: '[data-slot="palette-scrim"]' },
    { name: 'карточка палитры', selector: '[data-slot="command-palette"]' },
  )

  for (const node of shown) {
    const animation = await animationOf(node.selector)
    if (animation === null) {
      failures.push(`${node.name}: узел ${node.selector} не найден`)
      continue
    }
    if (animation.name === 'none') {
      failures.push(`${node.name}: движения нет вовсе, узел возникает одним кадром`)
      continue
    }
    if (!KNOWN_KEYFRAMES.has(animation.name)) {
      failures.push(
        `${node.name}: кадр «${animation.name}» заведён мимо общего слоя движения в index.css`,
      )
    }
    if (animation.seconds < MIN_S || animation.seconds > MAX_S) {
      failures.push(
        `${node.name}: длительность ${animation.seconds} s вне диапазона кабинета ${MIN_S}–${MAX_S} s`,
      )
    }
  }

  /**
   * Исчезновение — половина, которую забывают почти всегда.
   *
   * Проверяется тем же способом: после `Escape` узел обязан ещё стоять
   * на экране и уже нести кадр ухода. Если его нет в дереве в этот момент,
   * значит окно пропало за кадр.
   */
  await page.keyboard.press('Escape')
  const leaving = await animationOf('[data-slot="palette-scrim"]')
  if (leaving === null) {
    failures.push('затемнение палитры: узел снят сразу, ухода нет')
  } else if (!leaving.name.endsWith('-out')) {
    failures.push(`затемнение палитры: при закрытии играет «${leaving.name}», а не кадр ухода`)
  }

  expect(failures, failures.join('\n')).toEqual([])
})

/*
  Обратная половина слоя — «при отключённом движении всё мгновенно» — живёт
  в `motion-reduced.spec.ts`. Она обязана идти под настройкой `reduce`, а её
  на всю полосу ставит конфигурация; переопределять настройку внутри файла
  надёжнее не пытаться — проверка, которая думает, что движение отключено,
  а на деле нет, доказывает несуществующее.
*/
