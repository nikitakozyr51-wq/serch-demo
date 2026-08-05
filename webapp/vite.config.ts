import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Куда кабинет ляжет на хостинге.
 *
 * Сайт и кабинет — одна ссылка: лендинг на корне, кабинет во вложенной папке.
 * У GitHub Pages для проекта корень не пустой, а равен имени репозитория,
 * поэтому путь собирается из двух переменных:
 *
 *     SERCH_BASE=/serch-demo   → кабинет уедет в /serch-demo/app/
 *     без переменной           → /app/, как на своём домене и в разработке
 *
 * Vite подставляет это во все ссылки на скрипты и картинки. Ошибиться здесь
 * дороже всего: страница откроется белой, потому что браузер пойдёт
 * за скриптом не туда, и в консоли будет только 404.
 */
const siteBase = process.env.SERCH_BASE ?? ''

/**
 * Полоса сверки поднимает кабинет на корне.
 *
 * Проверки пишут адреса продукта — `/today`, `/search`, `/m/today`, — и это
 * правильно: папка на хостинге к дизайну отношения не имеет. Дописать её
 * в `baseURL` Playwright нельзя: адрес, начинающийся со слэша, затирает путь
 * целиком, и `/app/` + `/today` даёт `/today`. Поэтому папку убирает сервер,
 * а не проверка.
 */
const appBase = process.env.SERCH_APP_BASE ?? `${siteBase}/app/`

// https://vite.dev/config/
export default defineConfig({
  base: appBase,
  build: {
    rolldownOptions: {
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'tanstack-vendor',
              test: /node_modules[\\/]@tanstack[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  // По умолчанию Vite поднимался только на IPv6-петле (`::1`), и браузер,
  // который резолвит `localhost` в IPv4, получал ERR_CONNECTION_REFUSED.
  // Явная привязка к 127.0.0.1 чинит это и при этом не открывает сервер
  // в локальную сеть, в отличие от `host: true`.
  server: {
    host: '127.0.0.1',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
})
