import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { resolveDesignWebPort } from './e2e/ports'

/**
 * Перепись кабинета.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Отдельная полоса, а не ещё один файл внутри сверки с макетом, — и по двум
 * причинам, обе продуктовые.
 *
 * **Первая: она отвечает на другой вопрос.** Сверка спрашивает «совпадает ли
 * пиксель с макетом», перепись — «работает ли то, что человек видит». Первая
 * ловит смещение на два пикселя, вторая — кнопку, которая молчит. Смешанные
 * в одну полосу, они дают один общий ответ «красное», по которому непонятно,
 * что чинить.
 *
 * **Вторая: она идёт минуты, а не секунды.** Тридцать экранов на двух
 * ширинах — это перепись, и держать её в цикле «правка — прогон» вместе
 * со сверкой значило бы сделать сверку неудобной, а неудобную проверку
 * перестают гонять.
 *
 * Запуск: `bun run --cwd webapp cabinet:check`
 */
const frontendRoot = fileURLToPath(new URL('.', import.meta.url))
const webPort = await resolveDesignWebPort()
const webUrl = `http://127.0.0.1:${webPort}`

export default defineConfig({
  testDir: './design-check/census',
  outputDir: './design-check/.artifacts/census-results',
  // Перепись длинная по устройству: тридцать переходов подряд.
  timeout: 300_000,
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
    // Движение выключено: перепись меряет наличие действия, а не анимацию,
    // и ждать переходы тридцать раз незачем.
    reducedMotion: 'reduce',
    colorScheme: 'light',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bun run dev --host 127.0.0.1 --port ${webPort}`,
    env: { SERCH_APP_BASE: '/' },
    cwd: frontendRoot,
    url: webUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
