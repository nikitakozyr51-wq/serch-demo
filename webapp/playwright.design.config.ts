import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { resolveDesignWebPort } from './e2e/ports'

/**
 * Полоса сверки с макетом.
 *
 * Отдельный файл, а не проект внутри `playwright.config.ts`: запуск серверов
 * (`webServer`) и подготовка окружения (`globalSetup`) в Playwright задаются
 * на уровне всей конфигурации и наследуются каждым проектом. Отключить там
 * Docker, PostgreSQL и бэкенд «только для сверки» технически нельзя.
 *
 * Здесь поднимается один Vite. Страница контролов статична и ничего
 * не запрашивает, поэтому база и сервер не нужны, а прогон занимает секунды.
 *
 * Обязательно dev-сервер, а не собранная версия: маршрут `/kitchen-sink`
 * регистрируется только при `import.meta.env.DEV`.
 */
const frontendRoot = fileURLToPath(new URL('.', import.meta.url))
const webPort = await resolveDesignWebPort()
const webUrl = `http://127.0.0.1:${webPort}`

/**
 * На полосе сверки кабинет стоит на корне сервера.
 *
 * В демонстрации он живёт в папке `/app` — так сайт и кабинет получают одну
 * ссылку. Проверкам эта папка не нужна: они меряют экраны, а не хостинг,
 * и пишут адреса продукта — `/today`, `/search`, `/m/today`.
 *
 * Дописать папку в `baseURL` нельзя: адрес, начинающийся со слэша, затирает
 * путь целиком, и `/app/` вместе с `/today` даёт `/today`. Поэтому папку
 * убирает сервер — переменной `SERCH_APP_BASE`, — а не проверка.
 */

export default defineConfig({
  testDir: './design-check/specs',
  outputDir: './design-check/.artifacts/test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'design-check/.artifacts/report' }],
  ],
  use: {
    baseURL: webUrl,
    // Ширина кабинета из макета. Плотность переключается отдельным прогоном.
    viewport: { width: 1440, height: 1024 },
    // Замер обязан идти в тех же координатах, что макет: без масштабирования
    // и без анимаций, иначе цвет снимется на середине перехода.
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bun run dev --host 127.0.0.1 --port ${webPort}`,
    env: { SERCH_APP_BASE: '/' },
    cwd: frontendRoot,
    url: webUrl,
    // В отличие от полосы E2E здесь переиспользование безопасно: состояния нет,
    // а владельцу нужен быстрый цикл «правка — прогон».
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
