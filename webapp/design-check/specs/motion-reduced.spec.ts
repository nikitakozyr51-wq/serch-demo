import { expect, test } from '@playwright/test'
import { seedSession } from '../lib/session'

/**
 * «Меньше движения»: вторая половина слоя движения.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Живёт отдельным файлом, а не рядом с `motion.spec.ts`, по одной причине:
 * ей нужна настройка `reducedMotion: 'reduce'`, и эту настройку на всю полосу
 * ставит конфигурация. Проверке движения, наоборот, нужна обратная — поэтому
 * та вынесена в свой проект.
 *
 * Первый прогон этой проверки показал, зачем она нужна: попытка переключить
 * настройку внутри файла НЕ сработала, и проверка спокойно докладывала,
 * что при отключённом движении палитра доезжает за 0,12 s, а мерцание
 * скелетона идёт. Проверка, которая думает, что движение отключено, а на деле
 * нет, доказывает несуществующее — хуже отсутствующей.
 *
 * Правило спеки короткое: `prefers-reduced-motion` — всё мгновенно.
 * Для части людей движение вызывает тошноту, и это не про вкус.
 */

/** Общий ковёр в `index.css` схлопывает длительности до 0.01 мс. */
const INSTANT_S = 0.01

test('при отключённом движении всё мгновенно, а мерцание гаснет насухо', async ({ page }) => {
  /**
   * Настройка ставится ВЫЗОВОМ, а не объявлением.
   *
   * В `playwright.design.config.ts` она стоит на всю полосу, и первый прогон
   * показал, что до страницы она не доходит: проверка собственными словами
   * доложила «настройка не включена», а палитра доезжала за 0,12 s.
   * Объявление на уровне файла дало то же самое.
   *
   * Прямой вызов работает и стоит там, где его видно. Заодно это ответ
   * на вопрос, почему в проверке есть самопроверка: без неё все три года
   * этот файл был бы зелёным, ничего не проверяя.
   */
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedSession(page)
  await page.goto('/search')
  await page.waitForSelector('[data-slot="listing-row"]')

  const failures: string[] = []

  // Проверка начинается с проверки самой себя: без включённой настройки
  // всё, что ниже, ничего не значит.
  const reduced = await page.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  if (!reduced) {
    failures.push('настройка «меньше движения» не включена — проверка не доказывает ничего')
  }

  await page.keyboard.press('Control+k')
  await page.waitForSelector('[data-slot="command-palette"]')

  const palette = await page.evaluate(() => {
    const node = document.querySelector('[data-slot="command-palette"]')
    if (!node) return null
    return Number.parseFloat(getComputedStyle(node).animationDuration)
  })

  if (palette === null) failures.push('карточка палитры не найдена')
  else if (palette > INSTANT_S) {
    failures.push(`карточка палитры доезжает ${palette} s, хотя движение отключено`)
  }

  // Строка выдачи меняет заливку переходом — он тоже обязан схлопнуться.
  const row = await page.evaluate(() => {
    const node = document.querySelector('[data-slot="listing-row"]')
    if (!node) return null
    return Number.parseFloat(getComputedStyle(node).transitionDuration)
  })

  if (row === null) failures.push('строка выдачи не найдена')
  else if (row > INSTANT_S) {
    failures.push(`строка выдачи красится ${row} s, хотя движение отключено`)
  }

  /*
    Мерцание скелетона обязано ГАСНУТЬ, а не замедлиться.

    Общий ковёр оставил бы градиент застывшим на случайном кадре — то есть
    плашку в полоску. Поэтому у скелетона своё правило: заливка ровная,
    анимации нет вовсе. Экран состояний — единственное место, где скелетон
    сейчас живёт.
  */
  await page.goto('/screen/states')
  await page.waitForSelector('.skeleton-plate')

  const plate = await page.evaluate(() => {
    const node = document.querySelector('.skeleton-plate')
    if (!node) return null
    const style = getComputedStyle(node)
    return { name: style.animationName, image: style.backgroundImage }
  })

  if (plate === null) failures.push('плашка скелетона не найдена')
  else {
    if (plate.name !== 'none') failures.push(`мерцание скелетона идёт: ${plate.name}`)
    if (plate.image !== 'none') failures.push(`градиент скелетона остался: ${plate.image}`)
  }

  expect(failures, failures.join('\n')).toEqual([])
})
