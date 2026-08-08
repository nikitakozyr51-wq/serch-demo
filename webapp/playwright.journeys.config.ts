import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { resolveDesignWebPort } from './e2e/ports'

/**
 * Путь целиком.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАЧЕМ ЧЕТВЁРТАЯ ПОЛОСА, ЕСЛИ ЕСТЬ ТРИ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Все три существующие полосы были ЗЕЛЁНЫМИ в тот день, когда ни один из
 * шести путей пользователя не доходил до конца. Перепись обошла тридцать
 * экранов и не нашла ни одной мёртвой кнопки; сверка сошлась по всем
 * тридцати девяти замерам; типы, линт и сборка молчали. При этом:
 *
 * - главная кнопка прозвона не записывала звонок,
 * - «Брак» возвращал деньги строкой «Пополнение картой»,
 * - нижние вкладки телефона не открывали ни одного раздела,
 * - приглашение не создавалось вовсе,
 * - агент, принявший приглашение, заводил себе пустое агентство.
 *
 * Ни одна из этих поломок не видна на отдельном экране. Все пять видны
 * с первого шага, если пройти путь подряд.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ДВА ОТЛИЧИЯ ОТ ОСТАЛЬНЫХ ПОЛОС
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Первое: сеанс НЕ сажается.** Перепись и сверка кладут `serch.demo.session`
 * в хранилище до первого кадра — им это правильно, они меряют экран. Здесь
 * браузер начинается пустым, и человек проходит дверь сам. Путь, начатый
 * с посаженного сеанса, не проверяет вход.
 *
 * **Второе: окружение как у собранной демонстрации.** `build-demo.mjs`
 * затирает ключи Supabase, то есть зрителю продукт достаётся БЕЗ базы.
 * Ровно эта ветка и проверяется: полоса, зелёная на машине разработчика
 * с `.env.local` и красная у зрителя, хуже отсутствующей.
 *
 * Запуск: `bun run --cwd webapp journeys:check`
 */
const frontendRoot = fileURLToPath(new URL('.', import.meta.url))
const webPort = await resolveDesignWebPort('journeys')
const webUrl = `http://127.0.0.1:${webPort}`

export default defineConfig({
  testDir: './design-check/journeys',
  outputDir: './design-check/.artifacts/journeys-results',
  // Путь длиннее экрана: регистрация, выдача, раскрытие, звонок, журнал.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: webUrl,
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1,
    // Движение выключено: полоса меряет, доходит ли дело до конца,
    // а не как оно выглядит по дороге.
    reducedMotion: 'reduce',
    colorScheme: 'light',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bun run dev --host 127.0.0.1 --port ${webPort}`,
    env: { SERCH_APP_BASE: '/', VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    cwd: frontendRoot,
    url: webUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
