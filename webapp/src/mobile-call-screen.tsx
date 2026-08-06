import { useNavigate } from "@tanstack/react-router"
import { Phone, X } from "lucide-react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { PhoneFrame } from "@/features/cabinet"
import { ListingPhoto } from "@/features/listings"

/**
 * МОБАЙЛ · Прозвон.
 *
 * Снято с `q4uhsx`: 390 × 844, шапка 56, тело с полями 16 и зазором 16,
 * липкий подвал 188 с нижним полем 24.
 *
 * **Это не сжатый десктопный прозвон, а другой экран.** На десктопе окно делится
 * на объект 980 и панель фиксации 460: агент видит объект и форму разом.
 * На 390 так нельзя, и панель фиксации исчезает целиком — вместо неё
 * в подвале стоит кнопка «Записать результат», которая её открывает.
 *
 * Что ещё ушло: слово «Выйти» с подписью «Esc» (остался голый крестик —
 * на телефоне клавиатуры нет), полоса прогресса, счёт дня, факты об объекте,
 * скрипт разговора, номер в шапке. Осталось ровно то, что нужно в момент
 * звонка: кадр, цена с основанием, что уже пробовали, номер и кнопка.
 *
 * **Подвал прижат вниз распоркой, а не приклеен.** Когда содержимое короче
 * экрана — а на телефоне оно короче всегда, — номер и кнопка остаются
 * под большим пальцем, а не уезжают вверх за текстом.
 */
export function MobileCallScreenPage() {
  const navigate = useNavigate()

  return (
    <PhoneFrame slot="mobile-call-screen">
      <div
        data-slot="mobile-call-bar"
        className="flex h-header w-full shrink-0 items-center gap-3 border-b border-line-2 bg-surface px-4"
      >
        {/* Крестик без подписи: на телефоне нет ни клавиши Esc,
            ни места под слово «Выйти». */}
        <button
          type="button"
          aria-label="Выйти из прозвона"
          onClick={() => void navigate({ to: "/m/today" })}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center bg-transparent text-fg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <X aria-hidden className="size-6" strokeWidth={2} />
        </button>
        <Typography variant="panelTitle" tone="default" as="h1">
          Прозвон
        </Typography>
        <div className="h-px flex-1" />
        <Typography variant="controlLabel" tone="dense">
          7 из 24
        </Typography>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="h-58 w-full shrink-0 overflow-hidden rounded-2xl">
          <ListingPhoto alt="Ленская ул., 10" size="large" reason="no-photos" />
        </div>

        <div className="flex w-full shrink-0 items-center gap-3">
          <Typography variant="cardPrice" tone="default">
            8,6 млн ₽
          </Typography>
          {/* Отклонение собрано вручную, а не инстансом: на телефоне
              у него высота 16 против 20 на десктопе. Так в файле. */}
          <span className="flex items-center gap-1">
            <Typography variant="numericMeta" tone="ok">
              ▼
            </Typography>
            <Typography variant="numericMeta" tone="ok">
              −12 %
            </Typography>
          </span>
        </div>

        <Typography variant="rowPrice" tone="default">
          Ленская ул., 10 · 2-комн · 58 м² · 4/9 эт
        </Typography>

        {/* Основание цены одной строкой вместо трёх фактов десктопа:
            на 390 три колонки с делителями не встают. */}
        <Typography variant="denseText" tone="dense">
          148 тыс ₽/м² · медиана 24 аналогов 9,8 млн ₽ · 42 дня в выдаче
        </Typography>

        <div className="flex w-full shrink-0 flex-col gap-1 rounded-lg bg-warm px-3.5 py-3">
          <Typography variant="numericDense" tone="default">
            Две попытки дозвона сегодня, обе без ответа
          </Typography>
          <Typography variant="metaText" tone="dense">
            14:20 и 15:05 · перезвон на 16:00 · повторное списание невозможно
          </Typography>
        </div>

        <div className="flex-1" />
      </div>

      <div
        data-slot="mobile-call-footer"
        className="flex w-full shrink-0 flex-col gap-3 border-t border-line-2 bg-surface px-4 pt-4 pb-6"
      >
        <Typography variant="cardPrice" tone="default">
          +7 900 000-99-87
        </Typography>

        {/* Главное действие экрана: 48 / pill / 16 графитом. Пилюля тут
            законна — она и означает «нажми меня». */}
        <Button
          variant="primary"
          size="lg"
          block
          iconLeft={<Phone aria-hidden className="size-5" strokeWidth={2} />}
        >
          Позвонить
        </Button>

        {/*
          Панель фиксации на телефоне не помещается, и вместо неё —
          кнопка, которая её открывает. Обе вторичные кнопки по 44:
          на телефоне ступени начинаются с сорока четырёх.
        */}
        <div className="flex w-full gap-3">
          {["Записать результат", "Отложить"].map((label) => (
            <button
              key={label}
              type="button"
              data-slot="mobile-call-secondary"
              // «Записать результат» открывает лист записи — он нарисован
              // отдельным кадром `cOYqC`. «Отложить» переносит объект на
              // потом: экрана у этого действия в файле нет, поэтому оно
              // названо и ничего не рисует.
              data-action={label === "Отложить" ? "отложить объект" : undefined}
              onClick={
                label === "Отложить"
                  ? undefined
                  : () => void navigate({ to: "/m/record" })
              }
              className="flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full border border-border-control bg-warm outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="controlLabel" tone="default">
                {label}
              </Typography>
            </button>
          ))}
        </div>
      </div>
    </PhoneFrame>
  )
}
