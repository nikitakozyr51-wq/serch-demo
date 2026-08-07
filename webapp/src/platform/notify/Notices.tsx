import { X } from "lucide-react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { dismissNotice, useNotices } from "./store"

/**
 * Полка сообщений.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ЭТА ФОРМА, ЕСЛИ В МАКЕТЕ ЕЁ НЕТ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Сообщения в файле не нарисованы — ни одного кадра. Это не пропуск: в файле
 * их роль играют диалоги, и решение записано в DESIGN.md. Но спека движения
 * требует три длительности, а клавиша `C` в прозвоне обещана «вместе с тостом
 * подтверждения». Форму пришлось вывести, и она выведена из уже закрытых
 * решений, а не придумана:
 *
 * - белая заливка и радиус 16 — как у диалога (`JHW4q`);
 * - волосяная обводка вместо тени — теней в продукте нет вовсе, это позиция;
 * - поле 16 и зазор 12 — шаг строки, а не шаг диалога: сообщение это строка,
 *   а не окно;
 * - подпись 14/500 — общий текст интерфейса;
 * - ошибка помечается цветом подписи, а не красной плашкой: акцент в продукте
 *   означает «списываются деньги», и раскрашивать им ошибку нельзя.
 *
 * Место — левый нижний угол. Правый занят: там кнопки действий на всех
 * рабочих экранах, и сообщение перекрывало бы ровно то, что человек нажимает.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Полка живёт в каркасе и ничего не знает о том, кто её позвал. Это и есть
 * причина, по которой она в `platform`, а не в кабинете: выгрузка файла
 * сообщает то же самое и с экрана агентства, и с экрана баланса.
 */
function Notices() {
  const notices = useNotices()

  if (notices.length === 0) return null

  return (
    <div
      data-slot="notices"
      aria-live="polite"
      // Полка не ловит нажатия сама — иначе невидимая колонка накрыла бы левый
      // край экрана. Ловят только сами сообщения.
      className="pointer-events-none fixed bottom-6 left-6 z-50 flex w-100 flex-col gap-2"
    >
      {notices.map((notice) => (
        <div
          key={notice.id}
          data-slot="notice"
          data-kind={notice.kind}
          className={cn(
            "motion-in pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-surface p-4",
            "outline-solid outline-1 -outline-offset-1 outline-line-2",
          )}
        >
          <div className={cn("min-w-0 flex-1", notice.kind === "error" ? "text-err-text" : "text-fg")}>
            <Typography variant="uiText" tone="current">
              <>{notice.text}</>
            </Typography>
          </div>

          {notice.actionLabel === undefined ? null : (
            <button
              type="button"
              data-slot="notice-action"
              onClick={() => {
                notice.onAction?.()
                dismissNotice(notice.id)
              }}
              className="shrink-0 cursor-pointer bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="strongText" tone="default">
                <>{notice.actionLabel}</>
              </Typography>
            </button>
          )}

          {/* Закрыть можно любое сообщение, но у ошибки это единственный
              способ: она не уходит сама. */}
          <button
            type="button"
            data-slot="notice-close"
            aria-label="Закрыть сообщение"
            onClick={() => dismissNotice(notice.id)}
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center bg-transparent text-text-dense outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <X aria-hidden className="size-4" strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  )
}

export { Notices }
