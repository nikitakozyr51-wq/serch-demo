// Первым импортом и не случайно: он чинит адрес до того, как маршрутизатор
// успеет его прочитать. Порядок здесь — не стиль, а условие работы.
import './deep-link'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth'
import App from './App'
import { clearChunkReloadMark } from './chunk-reload'
import './index.css'

// Приложение дошло до запуска — значит куски кода на месте, и отметка
// о вынужденной перезагрузке своё отработала. Без снятия вкладка,
// однажды перезагрузившаяся, до самого закрытия не смогла бы сделать
// это снова, а выкладок за день бывает несколько.
clearChunkReloadMark()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Тёмной темы в продукте нет — это решение, см. DESIGN.md. `forcedTheme`
            не даёт next-themes повесить класс `dark` по системной настройке:
            иначе на машине с тёмной Windows включились бы `dark:`-утилиты
            вендорных примитивов, для которых значений в проекте не существует. */}
        <ThemeProvider
          attribute="class"
          forcedTheme="light"
          enableSystem={false}
          storageKey="serch_theme"
        >
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
