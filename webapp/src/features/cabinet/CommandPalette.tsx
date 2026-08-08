import { useNavigate } from "@tanstack/react-router"
import { Building, Building2, Phone, Rows4, Search, Sun, Wallet } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { demoPhone } from "@/features/auth"
import { plural } from "@/features/listings"
import { useDensity } from "@/platform/density"
import { callQueue, disclosureOf, useNow, useWorkspace } from "@/features/workspace"
import { cn } from "@/lib/utils"

/** Пункты, подходящие запросу. Пустой запрос не сужает: показываются все. */
function byQuery(items: PaletteItem[], clean: string): PaletteItem[] {
  if (clean === "") return items
  return items.filter((item) => item.label.toLowerCase().includes(clean))
}

/**
 * Командная палитра (`rs1pv`).
 *
 * 620 в ширину, радиус 16, рамка `line-3`. Строка ввода 52 с волосяной линией
 * снизу, группы по 28, пункты по 40, подвал 36 на фоне страницы.
 *
 * **Палитра — не поиск по продукту, а поиск по трём разным вещам сразу:**
 * объекты, действия и разделы. Поэтому группы подписаны: без подписи «Начать
 * прозвон по текущей выдаче» стоял бы в одном ряду с адресом и читался как
 * ещё один объект.
 *
 * **У каждого пункта справа стоит его цена или его клавиша.** У объекта —
 * «8,6 млн ₽ · 2-комн · раскрыт», у действия — «⇧P», у раздела — «G затем A».
 * Палитра тем самым учит клавишам: человек, который трижды нашёл прозвон
 * через ⌘K, на четвёртый раз нажмёт ⇧P.
 *
 * Движение: появление 120 мс по прозрачности и 8 px вверх — на нижней границе
 * диапазона кабинета. Палитру открывают десятки раз в день, и она обязана
 * казаться мгновенной. При `prefers-reduced-motion` появляется без движения.
 */

type PaletteItem = {
  icon: LucideIcon
  label: string
  /** Цена объекта, клавиша действия или путь к разделу. */
  aside: string
  to?: string
  /** Что уходит в адрес: карточка объекта открывается по своему адресу. */
  search?: Record<string, string>
  /** Действие на месте, без перехода. Пока такое одно — плотность. */
  run?: () => void
}

type PaletteGroup = { label: string; items: PaletteItem[] }

/**
 * Разделы, куда палитра умеет уводить. Постоянные: это карта продукта,
 * а не результат поиска.
 */
const PLACES: PaletteItem[] = [
  { icon: Building2, label: "Агентство → Эффективность", aside: "G затем A", to: "/agency" },
  { icon: Wallet, label: "Баланс → Возвраты", aside: "G затем K", to: "/balance/refunds" },
]

/** Сколько объектов палитра показывает по запросу: список, а не выдача. */
const OBJECT_LIMIT = 5

/**
 * Палитра монтируется только открытой — так её состояние начинается заново
 * при каждом вызове, без сброса в эффекте. Закрытая палитра не существует,
 * а не прячется.
 */
function CommandPalette({
  onClose,
  leaving = false,
}: {
  onClose: () => void
  /**
   * Окно уходит: 120 мс, которые оно ещё стоит на экране после закрытия.
   *
   * Решение о жизни узла принимает не палитра, а тот, кто её открыл, —
   * `CabinetOverlays`. Палитра только рисует уход, потому что снять себя
   * с экрана она всё равно не может: `Esc` убирает её из дерева раньше,
   * чем успела бы отработать анимация.
   */
  leaving?: boolean
}) {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const workspace = useWorkspace()
  const now = useNow()
  const [dense, setDense] = useDensity()

  /**
   * ЗАПРОС ПЕЧАТАЕТСЯ, А НЕ НАРИСОВАН.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Здесь стояла строка `Typography` с текстом «ленск» — картинка набранного
   * запроса. То есть человек нажимал поле «Адрес, телефон или номер» в шапке,
   * открывалась палитра, и в ней уже был чужой запрос, который нельзя ни
   * стереть, ни дописать. Список под ним тоже был вписан: «Ленская ул., 10»
   * и «Ленская ул., 6» независимо от того, что в базе.
   *
   * Кадр `MULT9` рисует «Ввод» первым узлом палитры: высота 52, лупа 16,
   * запрос 16/500, «Esc» справа 12/500. Собрано по этим числам.
   */
  const [query, setQuery] = useState("")
  const clean = query.trim().toLowerCase()
  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Уходящая палитра отпускает фокус.
   *
   * Узел живёт ещё 120 мс после закрытия, чтобы нарисовать уход, — и всё это
   * время фокус остаётся в поле ввода. Горячие клавиши кабинета намеренно
   * молчат, пока человек печатает, поэтому «?» сразу после Esc не открывал
   * карту клавиш: продукт считал, что в палитре всё ещё набирают.
   */
  useEffect(() => {
    if (leaving) inputRef.current?.blur()
  }, [leaving])

  /**
   * Объекты — из базы, по адресу.
   *
   * Подпись строки собирается из самой строки: цена, комнатность и то,
   * платило ли агентство за этот контакт. Пока запрос пуст, объектов нет —
   * палитра не угадывает, с чего человек начнёт.
   */
  /*
    Поле обещает три способа найти: «Адрес, телефон или номер».

    Телефон искался только на телефоне — группа была собрана в мобильной
    палитре и не собрана в десктопной. Поле при этом обещало поиск
    по номеру на обоих: человек вводил цифры, палитра молчала, и он решал,
    что номера в базе нет. Обещание в плейсхолдере — такое же обещание,
    как надпись на кнопке.

    Ищется по цифрам, а не по строке: человек вводит номер как придётся —
    «+7 900 123-45-67», «89001234567», «123-45-67», — и пробелы, скобки
    и дефисы к делу не относятся. Хвоста в четыре цифры достаточно, чтобы
    не показывать пол-базы на первой же цифре.
  */
  const digits = clean.replace(/\D/g, "")
  const byPhone = digits.length >= 4

  const objects: PaletteItem[] =
    clean === ""
      ? []
      : ALL_ROWS.filter((row) =>
          byPhone
            ? demoPhone(row.address).replace(/\D/g, "").includes(digits)
            : row.address.toLowerCase().includes(clean),
        )
          .slice(0, OBJECT_LIMIT)
          .map((row) => {
            const paid = disclosureOf(workspace, row.address) !== undefined
            return {
              icon: Building,
              label: row.address,
              // При поиске по номеру подпись показывает НАЙДЕННЫЙ номер:
              // иначе человек не понимает, почему нашлась именно эта строка.
              // У нераскрытого объекта номер скрыт до раскрытия — показываем
              // хвост, по которому он и искал.
              aside: byPhone
                ? `${paid ? demoPhone(row.address) : `+7 900 •••-••-${demoPhone(row.address).slice(-2)}`} · ${row.price}`
                : `${row.price} · ${row.rooms}-комн · ${paid ? "раскрыт" : "новый"}`,
              to: paid ? "/object/disclosed" : "/object",
              search: { at: row.address },
            }
          })

  /** Действия. Числа в подписях считаются, а не вписаны. */
  const queue = callQueue(workspace, now).length
  const actions: PaletteItem[] = [
    {
      icon: Sun,
      label: "Открыть «Перезвонить сегодня»",
      aside: `${queue} ${plural(queue, "объект", "объекта", "объектов")}`,
      to: "/today",
    },
    { icon: Phone, label: "Начать прозвон по текущей выдаче", aside: "⇧P", to: "/call" },
    {
      icon: Rows4,
      // Единственный пункт, который не уводит, а делает. Раньше он не делал
      // и этого: ни адреса, ни действия — подпись и всё.
      label: `Переключить плотность на «${dense ? "Просторно" : "Плотно"}»`,
      aside: dense ? "строка 88 px" : "строка 64 px",
      run: () => setDense(!dense),
    },
  ]

  const groups: PaletteGroup[] = [
    { label: "Объекты", items: objects },
    { label: "Действия", items: byQuery(actions, clean) },
    { label: "Перейти", items: byQuery(PLACES, clean) },
  ].filter((group) => group.items.length > 0)

  const flat = groups.flatMap((group) => group.items)
  const order = new Map(flat.map((item, index) => [item.label, index]))
  /** Курсор не уезжает за конец списка, когда запрос сузил его на ходу. */
  const cursor = flat.length === 0 ? 0 : Math.min(active, flat.length - 1)

  const pick = (item: PaletteItem | undefined) => {
    if (item === undefined) return
    if (item.run) {
      item.run()
      onClose()
      return
    }
    onClose()
    if (item.to) {
      void navigate(item.search ? { to: item.to, search: item.search } : { to: item.to })
    }
  }

  useEffect(() => {
    // Клавиши палитры перехватываются, пока она открыта: иначе стрелка вниз
    // прокрутит страницу под ней, а Enter нажмёт кнопку, которую не видно.
    const onKeyDown = (event: KeyboardEvent) => {
      // `stopPropagation` рядом с `preventDefault`: первый не даёт событию
      // дойти до экрана под палитрой, второй гасит прокрутку страницы.
      // Без первого стрелки и Enter доходили до выдачи — и Enter списывал.
      if (flat.length === 0) return
      if (event.key === "ArrowDown") {
        event.preventDefault()
        event.stopPropagation()
        setActive((index) => (Math.min(index, flat.length - 1) + 1) % flat.length)
      } else if (event.key === "ArrowUp") {
        event.preventDefault()
        event.stopPropagation()
        setActive((index) => (Math.min(index, flat.length - 1) - 1 + flat.length) % flat.length)
      } else if (event.key === "Enter") {
        event.preventDefault()
        event.stopPropagation()
        pick(flat[cursor])
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  })

  return (
    // Скрим гасит экран, но не прячет его: человек должен видеть, откуда
    // он вызвал палитру, иначе она читается как отдельная страница.
    <div
      data-slot="palette-scrim"
      className={cn(
        "fixed inset-0 z-50 flex justify-center bg-[#1e1e1e59] pt-24",
        leaving ? "scrim-out" : "scrim-in",
      )}
      onPointerDown={(event) => {
        if (!boxRef.current?.contains(event.target as Node)) onClose()
      }}
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label="Командная палитра"
        data-slot="command-palette"
        className={cn(
          "flex h-fit w-155 flex-col overflow-hidden rounded-2xl border border-line-3 bg-surface",
          leaving ? "motion-out" : "motion-in",
        )}
      >
        <div className="flex h-13 w-full shrink-0 items-center gap-2.5 border-b border-line-2 px-4">
          <Search aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
          <Typography asChild variant="controlLabelLg" tone="default">
            <input
              ref={inputRef}
              data-slot="palette-input"
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                // Новый запрос — курсор на первую строку: он мог стоять
                // на пункте, которого в новом списке уже нет.
                setActive(0)
              }}
              placeholder="Адрес, телефон или номер"
              aria-label="Что найти"
              className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-dense"
            />
          </Typography>
          <Typography variant="metaText" tone="dense">
            Esc
          </Typography>
        </div>

        {/*
          Пусто — не тишина. Палитра открывается без запроса, и человеку
          надо сказать, что она умеет искать, а не показать ей пустой список.
        */}
        {flat.length === 0 ? (
          <div className="flex h-10 w-full items-center px-4">
            <Typography variant="denseText" tone="dense">
              {clean === ""
                ? "Начните печатать адрес — или выберите действие"
                : `По запросу «${query.trim()}» ничего не нашлось`}
            </Typography>
          </div>
        ) : null}

        {groups.map((group) => (
          <div key={group.label} className="flex w-full flex-col">
            <div className="flex h-7 w-full items-center px-4">
              <Typography variant="columnHeader" tone="dense">
                {group.label}
              </Typography>
            </div>
            {group.items.map((item) => {
              const current = order.get(item.label) === cursor
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  data-slot="palette-item"
                  data-active={current || undefined}
                  onPointerDown={() => pick(item)}
                  className={cn(
                    "flex h-10 w-full cursor-pointer items-center gap-2.5 px-4 text-left transition-colors",
                    current ? "bg-warm" : "bg-surface hover:bg-warm",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn("size-4 shrink-0", current ? "text-fg" : "text-text-2")}
                    strokeWidth={2}
                  />
                  <Typography variant={current ? "strongText" : "uiText"} tone="default">
                    {item.label}
                  </Typography>
                  <span className="h-px flex-1" />
                  <Typography variant="metaText" tone="dense">
                    {item.aside}
                  </Typography>
                </button>
              )
            })}
          </div>
        ))}

        <div className="flex h-9 w-full shrink-0 items-center gap-4 border-t border-line-2 bg-bg px-4">
          <Typography variant="metaText" tone="dense">
            ↑ ↓ выбрать
          </Typography>
          <Typography variant="metaText" tone="dense">
            ⏎ открыть
          </Typography>
          <Typography variant="metaText" tone="dense">
            ⌘K закрыть
          </Typography>
        </div>
      </div>
    </div>
  )
}

export { CommandPalette }
