import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"

import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { DISCLOSURE_PRICE, useSession } from "@/features/auth"
import { MobileBottomNav, MobileHeader, PhoneFrame } from "@/features/cabinet"
import { MobileListingRow, plural, photoFor } from "@/features/listings"
import { useWorkspace } from "@/features/workspace"

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

/** Сколько объектов список показывает за раз. Дальше — прокрутка списка. */
const PAGE = 30

/**
 * Стенд показывает три замеренные строки, продукт — всю базу.
 *
 * Та же развилка, что у десктопной выдачи, и по той же причине: снимок для
 * сверки с кадром `waJiE` обязан быть одинаковым сегодня и через месяц,
 * а продуктовый экран обязан показывать то, что человек правда ищет.
 */
const MEASURED = ["Ленская ул., 10", "Гражданский пр., 114", "Стахановцев ул., 14"]

export function MobileSearchScreenPage({
  dataset = "all",
}: {
  dataset?: "all" | "measured"
}) {
  const navigate = useNavigate()
  const session = useSession()
  const workspace = useWorkspace()

  /**
   * Выдача на телефоне — настоящая, а не три вписанные карточки.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * До этой правки экран был картинкой: три объекта стояли константой,
   * «247 объектов» и «8 610 ₽» были набраны текстом, а нажатие на карточку
   * не делало ничего. Какой бы поиск человек ни открыл, он видел одни и те же
   * Ленскую, Гражданский и Стахановцев — и путь агента обрывался на первом же
   * шаге после входа.
   *
   * База берётся та же, что у компьютера: два экрана одной выдачи не могут
   * показывать разные объекты.
   */
  const rows = useMemo(() => {
    const stop = new Set(workspace.stopList)
    const paid = new Set(session?.disclosed ?? [])

    const source =
      dataset === "measured"
        ? MEASURED.flatMap((address) => ALL_ROWS.filter((row) => row.address === address))
        : ALL_ROWS.slice(0, PAGE)

    return source.map((row) => ({
      address: row.address,
      price: row.price,
      deviation: row.deviation,
      meta: `${row.freshness}${row.meta}`,
      strength: row.strength,
      publications: row.publications,
      platforms: row.platforms,
      phones: row.phones,
      takenBy: row.takenBy,
      status: row.status,
      blocked: stop.has(row.address),
      // Подпись говорит правду про деньги: за раскрытый контакт второй раз
      // не платят, у объекта из стоп-листа раскрытия нет вовсе.
      actionLabel: stop.has(row.address)
        ? "Просил не звонить"
        : paid.has(row.address)
          ? "Открыть · 0 ₽"
          : `Раскрыть · ${DISCLOSURE_PRICE} ₽`,
      paid: paid.has(row.address),
    }))
  }, [dataset, session?.disclosed, workspace.stopList])

  return (
    // Кадр телефона на десктопном экране: 390 × 844 по центру, чтобы стенд
    // можно было смотреть в обычном браузере рядом с макетом.
    <PhoneFrame slot="mobile-screen">
      <MobileHeader balance={session?.balance ?? 0} initials={session?.initials ?? ""} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex h-11 w-full shrink-0 items-center gap-2">
          <Typography variant="panelTitle" tone="default" as="h1">
            Поиск
          </Typography>
          <div className="h-px flex-1" />
          <Typography variant="denseText" tone="dense">
            {`${ALL_ROWS.length} ${plural(ALL_ROWS.length, "объект", "объекта", "объектов")}`}
          </Typography>
          {/* Фильтры на телефоне — лист снизу, он нарисован кадром `gFIin`
              и живёт своим адресом. */}
          <button
            type="button"
            data-slot="mobile-filters"
            onClick={() => void navigate({ to: "/m/filters" })}
            className="flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface px-3.5 transition-colors duration-120 outline-solid outline-1 -outline-offset-1 outline-border-control active:bg-warm-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="controlLabel" tone="default">
              Фильтры 7
            </Typography>
          </button>
        </div>

        <div className="flex w-full flex-col gap-2">
          {rows.map(({ paid, ...row }) => (
            <MobileListingRow
              key={row.address}
              {...row}
              photo={photoFor(row.address)}
              // Карточка открывается у любого объекта, включая объект из
              // стоп-листа: она и объясняет, почему по нему нельзя работать.
              onOpen={() =>
                void navigate({
                  to: paid ? "/m/object" : "/m/object/before",
                  search: { at: row.address },
                })
              }
              onAction={
                row.blocked
                  ? undefined
                  : () =>
                      paid
                        ? void navigate({ to: "/m/object", search: { at: row.address } })
                        : void navigate({ to: "/m/object/before", search: { at: row.address } })
              }
            />
          ))}
        </div>
      </div>

      <MobileBottomNav activeId="search" />
    </PhoneFrame>
  )
}
