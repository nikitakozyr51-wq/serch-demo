import { useNavigate, useSearch } from "@tanstack/react-router"
import { Phone, X } from "lucide-react"
import { useMemo } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { demoPhone } from "@/features/auth"
import { PhoneFrame } from "@/features/cabinet"
import { ListingPhoto, photoFor } from "@/features/listings"
import { callbacksDue, takenNotCalled, useNow, useWorkspace } from "@/features/workspace"

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
/**
 * Объект, который показывает пустая очередь.
 *
 * Номер собирается из адреса, а диапазон `+7 900` не выдан ни одному
 * оператору — позвонить по нему нельзя физически. Настоящий номер
 * собственника в открытую демонстрацию попасть не может: это персональные
 * данные живого человека.
 */
const FALLBACK_ADDRESS = "Ленская ул., 10"

export function MobileCallScreenPage() {
  const navigate = useNavigate()
  const workspace = useWorkspace()
  const now = useNow()

  /**
   * Какой объект прозванивают.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * До этой правки экран был прибит к «Ленской, 10» константами: какой бы
   * объект человек ни выбрал, телефон показывал один и тот же адрес и один
   * и тот же номер. То есть агент звонил не тому, кого выбрал, — а на
   * телефоне это и есть вся работа экрана.
   *
   * Маршрут параметр объявлял с самого начала (`routes.tsx`), и кнопка
   * «Статус» его добросовестно передавала. Экран просто его не читал.
   *
   * Очередь считается так же, как на компьютере: раскрытые контакты, по
   * которым ещё не звонили, плюс назначенные перезвоны, минус стоп-лист.
   * Два экрана одного дела обязаны отвечать на «кого прозванивать» одинаково.
   */
  const { at } = useSearch({ from: "/m/call", shouldThrow: false }) ?? { at: undefined }

  const queue = useMemo(() => {
    const due = callbacksDue(workspace, now).map((item) => item.address)
    const taken = takenNotCalled(workspace).map((item) => item.address)
    const all = [...due, ...taken.filter((address) => !due.includes(address))]
    return all.filter((address) => !workspace.stopList.includes(address))
  }, [workspace, now])

  // Позиция берётся из адреса: человек пришёл за конкретным объектом, и
  // начинать с первого в очереди значило бы подменить его выбор.
  const asked = at === undefined ? -1 : queue.indexOf(at)
  const position = asked >= 0 ? asked : 0
  const address = queue[position] ?? at ?? FALLBACK_ADDRESS
  const row = ALL_ROWS.find((item) => item.address === address)
  const phone = demoPhone(address)

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
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent text-fg transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <X aria-hidden className="size-6" strokeWidth={2} />
        </button>
        <Typography variant="panelTitle" tone="default" as="h1">
          Прозвон
        </Typography>
        <div className="h-px flex-1" />
        <Typography variant="controlLabel" tone="dense">
          {queue.length === 0 ? "нечего прозванивать" : `${position + 1} из ${queue.length}`}
        </Typography>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="h-58 w-full shrink-0 overflow-hidden rounded-2xl">
          <ListingPhoto src={photoFor(address)} alt={address} size="large" reason="no-photos" />
        </div>

        <div className="flex w-full shrink-0 items-center gap-3">
          <Typography variant="cardPrice" tone="default">
            {row?.price ?? "8,6 млн ₽"}
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
          {row ? `${row.address}${row.meta}` : `${address} · 2-комн · 58 м² · 4/9 эт`}
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
          {phone}
        </Typography>

        {/* Главное действие экрана: 48 / pill / 16 графитом. Пилюля тут
            законна — она и означает «нажми меня».

            `tel:` отдаёт номер звонилке телефона — на мобильном это ровно
            то, чего человек ждёт от кнопки «Позвонить», и никакого своего
            экрана звонка тут быть не должно. */}
        <Button
          variant="primary"
          size="lg"
          block
          data-action="звонок собственнику"
          onClick={() => {
            window.location.href = `tel:${phone.replace(/[^+\d]/g, "")}`
          }}
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
              // отдельным кадром `cOYqC`. «Отложить» ведёт туда же: отложить
              // объект значит записать исход «отложен» и назначить перезвон,
              // а поля и того и другого уже стоят в листе записи. Своего
              // экрана у «Отложить» в файле нет — и не нужно, второй формы
              // для одной записи быть не должно.
              data-action={label === "Отложить" ? "отложить объект" : undefined}
              onClick={() => void navigate({ to: "/m/record", search: { at: address } })}
              className="flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full border border-border-control bg-warm transition-colors duration-120 outline-none active:bg-warm-press focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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
