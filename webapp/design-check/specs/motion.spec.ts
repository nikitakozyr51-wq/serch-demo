import { expect, test, type Page } from '@playwright/test'
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

/**
 * Открыть панель фильтров.
 *
 * Чипы фильтра живут внутри неё, а не на выдаче: с 9 августа колонки
 * в раскладке нет ни на одной ширине, панель приходит наложением
 * по нажатию (кадры `aoguG`, `C4zkJ`). Проверка, ищущая чип прямо
 * на выдаче, до этой правки просто не находила узел.
 *
 * Ждём конца выезда: панель едет 200 мс, и нажатие на середине пути
 * попадает в движущуюся мишень.
 */
async function openFilters(page: Page) {
  await page.click('[data-slot="filter-bar-open"]')
  await page.waitForSelector('[data-slot="filter-panel"]')
  await page
    .locator('[data-slot="filter-panel"]')
    .evaluate((node) => Promise.all(node.getAnimations().map((a) => a.finished)))
}

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
    // Панель открывается ТОЛЬКО ради чипов: они живут внутри неё. Открывать
    // её для строки или вкладки нельзя — затемнение накроет их, и навести
    // будет не на что.
    if (control.selector.includes('filter-chip')) await openFilters(page)

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

  const shown: { name: string; selector: string }[] = []

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
  /*
    Кадр ухода ищется опросом, а не одним замером.

    Между нажатием Escape и перерисовкой React проходит неопределимое время,
    а сам узел живёт после закрытия ровно 120 мс. Один замер сразу после
    нажатия попадал то до перерисовки, то после снятия узла — и проверка
    падала на здоровом продукте, что хуже пропущенной ошибки.

    Опрос закрывает обе стороны: он ждёт появления кадра ухода, но не дольше
    жизни самого узла.
  */
  await page.keyboard.press('Escape')
  const leaving = await page.evaluate(async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const node = document.querySelector('[data-slot="palette-scrim"]')
      if (node !== null) {
        const name = getComputedStyle(node).animationName
        if (name.endsWith('-out')) return name
      }
      await new Promise((resolve) => setTimeout(resolve, 12))
    }
    const node = document.querySelector('[data-slot="palette-scrim"]')
    return node === null ? null : getComputedStyle(node).animationName
  })

  if (leaving === null) {
    failures.push('затемнение палитры: узел снят сразу, ухода нет')
  } else if (!leaving.endsWith('-out')) {
    failures.push(`затемнение палитры: при закрытии играет «${leaving}», а не кадр ухода`)
  }

  expect(failures, failures.join('\n')).toEqual([])
})

/**
 * Список выдачи собирается волной при смене условий.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Проверяется иначе, чем окна, и это важно понимать.** Окна двигает CSS,
 * и объявленную анимацию видно в вычисленных стилях. Строки двигает
 * библиотека — она пишет значения напрямую, никакого `animation-name`
 * у строки нет, и проверка по имени кадра докладывала бы «движения нет»
 * ровно там, где оно есть.
 *
 * Поэтому здесь замеряется факт, а не объявление: сразу после пересборки
 * списка первая строка обязана быть НЕ до конца проявленной, а через
 * сотню миллисекунд — заметно ближе к единице. Две выборки во времени
 * доказывают движение независимо от того, чем оно сделано.
 *
 * Эта проверка и поймала переход: когда появление переехало с панели
 * на строки, прежний вариант — «у списка объявлена анимация» — стал врать.
 */
test('список выдачи собирается волной, а не подменяется', async ({ page }) => {
  await seedSession(page)
  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  /*
    Волна на первой загрузке уже доиграла, поэтому список пересобирается
    сменой условий — тем самым событием, ради которого движение и заведено.

    Условия меняются ВКЛАДКОЙ, а не чипом фильтра. Чипы с 9 августа живут
    внутри панели наложением, и чтобы нажать чип, надо сначала открыть
    панель — а она закрывает список затемнением ровно в тот момент, когда
    его надо мерить. Вкладка меняет ту же величину и стоит на виду.
  */
  await page.locator('[data-slot="result-tab"]:not([data-active])').first().click()

  const sample = await page.evaluate(async () => {
    const read = () => {
      const row = document.querySelector('[data-slot="listing-row"]')
      return row === null ? null : Number.parseFloat(getComputedStyle(row).opacity)
    }
    const first = read()
    await new Promise((resolve) => setTimeout(resolve, 110))
    return { first, second: read() }
  })

  const failures: string[] = []

  if (sample.first === null || sample.second === null) {
    failures.push('строк выдачи после смены условий не осталось: проверять нечего')
  } else {
    if (sample.first >= 1) {
      failures.push(
        `первая строка появилась сразу целиком (прозрачность ${sample.first}) — волны нет`,
      )
    }
    if (sample.second <= sample.first) {
      failures.push(
        `строка не проявляется: ${sample.first} → ${sample.second} за 110 мс`,
      )
    }
  }

  expect(failures, failures.join('\n')).toEqual([])
})

/**
 * Меню профиля раскрывается, а не возникает готовым.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Эта проверка появилась после того, как дыру нашёл владелец, а не код.**
 * Меню аватара было единственным попапом кабинета вовсе без движения:
 * нажал — панель появилась одним кадром. Ни одна из сорока с лишним проверок
 * этого не заметила, потому что смотреть на меню было некому.
 *
 * Замеряется фактом, как и волна выдачи: меню двигает библиотека, и в
 * вычисленных стилях объявленной анимации у него нет.
 */
test('меню профиля раскрывается, а не появляется готовым', async ({ page }) => {
  await seedSession(page)
  await page.goto('/search')
  await page.waitForSelector('[data-slot="user-avatar"]')

  await page.locator('[data-slot="user-avatar"]').click()
  await page.waitForSelector('[data-slot="avatar-menu"]')

  const sample = await page.evaluate(async () => {
    const read = () => {
      const menu = document.querySelector('[data-slot="avatar-menu"]')
      return menu === null ? null : Number.parseFloat(getComputedStyle(menu).opacity)
    }
    const first = read()
    await new Promise((resolve) => setTimeout(resolve, 90))
    return { first, second: read() }
  })

  const failures: string[] = []

  if (sample.first === null || sample.second === null) {
    failures.push('меню профиля не открылось')
  } else {
    if (sample.first >= 1) {
      failures.push(`меню появилось сразу целиком (прозрачность ${sample.first})`)
    }
    if (sample.second <= sample.first) {
      failures.push(`меню не раскрывается: ${sample.first} → ${sample.second} за 90 мс`)
    }
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
