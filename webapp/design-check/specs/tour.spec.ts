import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * Обучение первого входа.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАЧЕМ ОТДЕЛЬНЫЙ СЛОЙ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Все остальные проверки входят с отметкой «обучение пройдено»: иначе оно
 * всплывает поверх экрана, и они меряют тур, а не продукт. Значит само
 * обучение остаётся единственным, что никто не смотрит, — и его надо
 * смотреть здесь.
 *
 * Слой ловит четыре провала, каждый из которых уже случался при сборке
 * и каждый был найден замером, а не глазом:
 *
 *   1. обучение гасит само себя (своё затемнение попадало под правило
 *      «молчать поверх окна», и окно мигало через шаг);
 *   2. обучение висит поверх чужого окна (чтение разметки не будило
 *      перерисовку: палитра открывалась, тур об этом не узнавал);
 *   3. обучение пропадает на полноэкранном экране («Прозвон» не несёт
 *      каркаса кабинета, и тур обрывался на шаге, который про прозвон);
 *   4. у агента показывается глава про чужие разделы.
 */

/** Позвать обучение из меню с инициалами — так его зовёт человек. */
async function openTour(page: import('@playwright/test').Page) {
  await page.click('[data-slot="user-avatar"]')
  await page.click('text=Открыть обучение')
  await page.waitForSelector('[data-slot="tour-card"]')
}

test('обучение доходит до конца и не гаснет по дороге', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/searches')
  await page.waitForSelector('[data-slot="cabinet-sidebar"]')

  await openTour(page)

  const failures: string[] = []
  const seen: string[] = []

  // Двадцать шагов и шесть обложек — двадцать шесть окон. Потолок втрое
  // больше: если тур зациклится, проверка обязана кончиться сама, а не
  // висеть до тайм-аута.
  for (let click = 0; click < 80; click += 1) {
    const card = page.locator('[data-slot="tour-card"]')
    if ((await card.count()) === 0) break

    const label = await page.evaluate(
      () => document.querySelector('[data-slot="tour-card"]')?.children[0]?.textContent?.trim() ?? '',
    )
    seen.push(label)

    // Окно обязано быть на экране целиком: подсказка, уехавшая за край,
    // не подсказка.
    const box = await card.boundingBox()
    if (box === null) {
      failures.push(`${label}: окно есть в разметке, но не на экране`)
    } else if (box.x < 0 || box.y < 0 || box.x + box.width > 1440 || box.y + box.height > 1024) {
      failures.push(`${label}: окно вылезло за край экрана`)
    }

    await card.locator('button').last().click()
    // Окно уходит за 100 мс и приезжает пружиной. Мерить раньше значит
    // поймать уходящее окно и решить, что шаг не сдвинулся.
    await page.waitForTimeout(450)
  }

  if (seen.length < 20) {
    failures.push(`обучение оборвалось на ${seen.length} окне: «${seen.at(-1) ?? "—"}»`)
  }

  // Ни одно окно не должно повториться подряд: повтор значит, что шаг
  // не сдвинулся, и человек жмёт «Дальше» впустую.
  for (let index = 1; index < seen.length; index += 1) {
    if (seen[index] === seen[index - 1]) {
      failures.push(`окно «${seen[index]}» показано дважды подряд: шаг не сдвинулся`)
      break
    }
  }

  expect(failures, failures.join('\n')).toEqual([])
})

test('обучение молчит поверх окна и возвращается после него', async ({ page }) => {
  await seedSession(page)
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/searches')
  await page.waitForSelector('[data-slot="cabinet-sidebar"]')

  await openTour(page)
  expect(await page.locator('[data-slot="tour-card"]').count(), 'обучение открылось').toBe(1)

  await page.keyboard.press('Control+k')
  await page.waitForSelector('[data-slot="palette-scrim"]')
  expect(
    await page.locator('[data-slot="tour-card"]').count(),
    'обучение висит поверх палитры: два слоя разом',
  ).toBe(0)

  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  expect(
    await page.locator('[data-slot="tour-card"]').count(),
    'обучение не вернулось после закрытия палитры',
  ).toBe(1)
})

test('у агента пять глав, а не шесть', async ({ page }) => {
  await seedSession(page)
  // Роль подменяется в хранилище: экранов, где руководитель делает
  // из себя агента, в продукте нет и быть не должно.
  await page.addInitScript(() => {
    const raw = window.localStorage.getItem('serch.demo.session')
    if (raw === null) return
    const session = JSON.parse(raw) as Record<string, unknown>
    session.role = 'agent'
    window.localStorage.setItem('serch.demo.session', JSON.stringify(session))
  })
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.goto('/searches')
  await page.waitForSelector('[data-slot="cabinet-sidebar"]')

  await openTour(page)
  const label = await page.evaluate(
    () => document.querySelector('[data-slot="tour-card"]')?.children[0]?.textContent?.trim() ?? '',
  )

  expect(label, 'агенту показывается глава про баланс и сотрудников — их у него нет').toContain(
    'ИЗ 5',
  )
})
