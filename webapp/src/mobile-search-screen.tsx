import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { Typography } from "@/components/typography"
import { MobileBottomNav, MobileHeader, PhoneFrame } from "@/features/cabinet"
import { MobileListingRow } from "@/features/listings"

/**
 * МОБАЙЛ · Поиск и выдача.
 *
 * Снято с экрана `waJiE`: 390 × 844, шапка 56, тело с полями 16 и зазором 12,
 * список из трёх карточек с зазором 8, нижняя навигация 72.
 *
 * **Фильтры на телефоне не колонка, а кнопка.** На десктопе колонка фильтров
 * стоит рядом с выдачей, потому что там правило «фильтры никогда не перекрывают
 * выдачу»: агент видит условия и результат одновременно. На 390 это физически
 * невозможно, и правило меняет форму — условия сворачиваются в кнопку
 * «Фильтры 7», где 7 говорит, сколько условий сейчас сужают выдачу.
 * Счётчик обязателен: без него кнопка молчит о том, что выдача уже сужена.
 *
 * Заголовок несёт «247 объектов» рядом с названием раздела — на телефоне
 * отдельной строки результата нет, и число переезжает в шапку раздела.
 * Арифметики отсева здесь нет вовсе: три числа в строку 390 не встают.
 */

const ROWS = [
  {
    address: "Ленская ул., 10",
    price: "8,6 млн ₽",
    deviation: -12,
    meta: "14 минут · Ладожская 6 мин · 2-к · 58 м² · 4/9",
    strength: "medium" as const,
    publications: 3,
    platforms: 2,
    phones: 1,
    takenBy: "ИС",
    status: "in-progress" as const,
    actionLabel: "Открыть · 0 ₽",
  },
  {
    address: "Гражданский пр., 114",
    price: "12,8 млн ₽",
    deviation: -12,
    meta: "38 минут · Академическая 8 мин · 3-к · 71 м²",
    strength: "medium" as const,
    publications: 2,
    platforms: 1,
    phones: 1,
    takenBy: "АТ",
    status: "in-progress" as const,
    actionLabel: "Открыть · 0 ₽",
  },
  {
    address: "Стахановцев ул., 14",
    price: "12,4 млн ₽",
    deviation: 0,
    meta: "1 час · Новочеркасская 8 мин · 3-к · 74 м²",
    strength: "strong" as const,
    publications: 1,
    platforms: 1,
    phones: 1,
    status: "stop-list" as const,
    actionLabel: "Просил не звонить",
    blocked: true,
  },
]

export function MobileSearchScreenPage() {
  const navigate = useNavigate()

  const [tab, setTab] = useState("search")

  return (
    // Кадр телефона на десктопном экране: 390 × 844 по центру, чтобы стенд
    // можно было смотреть в обычном браузере рядом с макетом.
    <PhoneFrame slot="mobile-screen">
      <MobileHeader balance={8610} initials="ИС" />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex h-11 w-full shrink-0 items-center gap-2">
          <Typography variant="panelTitle" tone="default" as="h1">
            Поиск
          </Typography>
          <div className="h-px flex-1" />
          <Typography variant="denseText" tone="dense">
            247 объектов
          </Typography>
          {/* Фильтры на телефоне — лист снизу, он нарисован кадром `gFIin`
              и живёт своим адресом. */}
          <button
            type="button"
            data-slot="mobile-filters"
            onClick={() => void navigate({ to: "/m/filters" })}
            className="flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface px-3.5 outline-solid outline-1 -outline-offset-1 outline-border-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="controlLabel" tone="default">
              Фильтры 7
            </Typography>
          </button>
        </div>

        <div className="flex w-full flex-col gap-2">
          {ROWS.map((row) => (
            <MobileListingRow key={row.address} {...row} />
          ))}
        </div>
      </div>

      <MobileBottomNav activeId={tab} onSelect={setTab} />
    </PhoneFrame>
  )
}
