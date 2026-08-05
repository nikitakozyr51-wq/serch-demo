import { ChevronRight, Plus, Search } from "lucide-react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { MobileBottomNav, MobileHeader } from "@/features/cabinet"
import { MobileListingRow } from "@/features/listings"
import { cn } from "@/lib/utils"

/**
 * МОБАЙЛ · Поиски, массовые действия, пуши.
 *
 * Шесть кадров одной группы: `LlJyw` сохранённые поиски, `sN5wC` лист
 * «Сохранить поиск», `bx94j` глобальный поиск, `liwT8` подтверждение массового
 * раскрытия, `vmUET` панель массовых действий, `nZGka` пуши на экране
 * блокировки.
 *
 * Все значения сняты замером из файла. Общая рамка стенда — 390 × 844,
 * как у `mobile-search-screen.tsx` и `mobile-call-screen.tsx`: экраны смотрят
 * в обычном браузере рядом с макетом.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Общие части этих шести экранов
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Рамка телефона на десктопном стенде.
 *
 * `relative` обязателен: лист снизу лежит абсолютом поверх экрана, а не в потоке.
 *
 * Заливка рамки — не украшение, а замер: экран кабинета идёт `bg`, экран
 * блокировки телефона — графит, а два кадра массовых действий нарисованы вовсе
 * без собственной заливки: там весь кадр и есть затемнение поверх пустоты.
 */
function PhoneStand({
  surface = "bg",
  children,
}: {
  surface?: "bg" | "dark" | "none"
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh w-full items-start justify-center bg-line-1 p-10">
      <div
        data-slot="mobile-screen"
        className={cn(
          "relative flex h-[844px] w-[390px] flex-col overflow-hidden",
          "outline-solid outline-1 -outline-offset-1 outline-line-2",
          surface === "bg" && "bg-bg",
          surface === "dark" && "bg-fg",
        )}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Лист снизу со скримом.
 *
 * **Файл рисует лист двумя разными формами, и это расхождение файла с самим
 * собой, а не решение.** Подтверждение массового раскрытия и панель действий
 * идут широкой формой (радиус 24, поля [12, 20, 32, 20], хват 36 × 5 цветом
 * `line-2`, затемнение 35 %). Лист «Сохранить поиск» идёт формой поуже
 * (радиус 16, поля [12, 16, 24, 16], хват 36 × 4 цветом `line-3`,
 * затемнение 45 %). Обе воспроизведены как нарисованы.
 *
 * Общий у обеих только зазор 20 между блоками и нижнее поле больше верхнего:
 * под листом системная полоса жеста, и кнопка, прижатая к самому краю,
 * ловилась бы вместе с ней.
 *
 * Общий `MobileSheet` из `@/features/cabinet` сюда не встал: его скрим задан
 * высотой `h-svh` и внутри рамки 844 уезжает за нижний край.
 */
function PhoneSheet({
  shape = "wide",
  label,
  children,
}: {
  /** `wide` — лист массовых действий, `form` — лист с полями «Сохранить поиск». */
  shape?: "wide" | "form"
  label: string
  children: ReactNode
}) {
  const form = shape === "form"

  return (
    <div
      data-slot="phone-sheet-scrim"
      className={cn(
        "absolute inset-0 z-10 flex flex-col justify-end",
        form ? "bg-[#1e1e1e73]" : "bg-[#1e1e1e59]",
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-slot="phone-sheet"
        className={cn(
          "flex w-full flex-col gap-5 bg-surface",
          form ? "rounded-t-2xl px-4 pt-3 pb-6" : "rounded-t-3xl px-5 pt-3 pb-8",
        )}
      >
        {/* Хват говорит, что лист тянется пальцем. Крестика в файле нет. */}
        <div className="flex w-full justify-center">
          <span
            aria-hidden
            className={cn(
              "w-9 shrink-0 rounded-full",
              form ? "h-1 bg-line-3" : "h-[5px] bg-line-2",
            )}
          />
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Строка списка 64: заголовок с подписью слева, что-нибудь справа.
 *
 * Одна и та же форма несёт сохранённый поиск (счётчик находок и шеврон)
 * и находку глобального поиска (слово о состоянии). Внутренняя обводка собрана
 * внутренней тенью, а не `outline`: `outline` оставлен кольцу фокуса, иначе
 * при переходе Tab граница строки подменялась бы кольцом.
 *
 * **Находка ведёт на карточку объекта, сохранённый поиск — некуда.** Разница
 * не в оформлении, а в том, что нарисовано: карточка объекта на телефоне есть,
 * а мобильной выдачи под собственным адресом нет. Поэтому у одних строк `to`
 * и настоящая ссылка, у других `action` — действие названо, окна не рисуется.
 */

/** Адреса карточек объекта, куда ведут находки. Литералы — их проверяет маршрутизатор. */
type ObjectRoute = "/m/object" | "/m/object/before"

function ListRow({
  title,
  meta,
  trailing,
  to,
  action,
}: {
  title: string
  meta: string
  trailing: ReactNode
  /** Карточка объекта за строкой. Задан — строка становится ссылкой. */
  to?: ObjectRoute
  /** Действие без нарисованного экрана: названо и ничего не рисует. */
  action?: string
}) {
  const shell = cn(
    "flex h-16 w-full cursor-pointer items-center gap-2.5 rounded-lg bg-surface px-3.5 text-left",
    "shadow-[inset_0_0_0_1px_var(--line-2)]",
    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
  )

  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Typography variant="strongText" tone="default">
          {title}
        </Typography>
        <Typography variant="metaText" tone="dense">
          {meta}
        </Typography>
      </span>
      <>{trailing}</>
    </>
  )

  if (to !== undefined) {
    return (
      <Link to={to} data-slot="mobile-list-row" className={shell}>
        <>{body}</>
      </Link>
    )
  }

  return (
    <button type="button" data-slot="mobile-list-row" data-action={action} className={shell}>
      <>{body}</>
    </button>
  )
}

/** Метка раздела 11/600 капслоком и список под ней. */
function LabelledSection({
  label,
  children,
  gap = "sm",
}: {
  label: string
  children: ReactNode
  /** Зазор между меткой и списком: 12 у сохранённых поисков, 10 у находок. */
  gap?: "sm" | "xs"
}) {
  return (
    <section
      className={cn("flex w-full flex-col", gap === "sm" ? "gap-3" : "gap-2.5")}
    >
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <div className="flex w-full flex-col gap-2">{children}</div>
    </section>
  )
}

/**
 * Адреса экранов этой группы, между которыми ходят листы.
 *
 * Подтверждение массового раскрытия открывается из панели действий, и отмена
 * возвращает ровно туда: выбор из двенадцати объектов при отказе не пропадает.
 */
type SheetRoute = "/m/bulk-panel" | "/m/bulk-disclosure"

/**
 * Кнопка листа 48 в капсуле с тёплой заливкой.
 *
 * Общий `Button` её не даёт: капсула у него закреплена за `primary`, `money`
 * и `pending`, а `quiet` на ступени 48 идёт радиусом 12. В файле вторая кнопка
 * листа — капсула. Другая геометрия — другой контрол, поэтому он собран здесь,
 * а не продавлен через `className` закрытой кнопки.
 */
function QuietPill({
  children,
  to,
  action,
}: {
  children: string
  /** Экран, на который возвращает отмена. Задан — капсула становится ссылкой. */
  to?: SheetRoute
  /** Действие без нарисованного экрана: названо и ничего не рисует. */
  action?: string
}) {
  const shell = cn(
    "flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-warm px-6",
    "transition-colors hover:bg-warm-hover active:bg-warm-press",
    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
  )

  const label = (
    <Typography variant="controlLabelLg" tone="default">
      {children}
    </Typography>
  )

  if (to !== undefined) {
    return (
      <Link to={to} data-slot="sheet-quiet-pill" className={shell}>
        <>{label}</>
      </Link>
    )
  }

  return (
    <button type="button" data-slot="sheet-quiet-pill" data-action={action} className={shell}>
      <>{label}</>
    </button>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   МОБАЙЛ · Сохранённые поиски (`LlJyw`)
   ──────────────────────────────────────────────────────────────────────── */

const MY_SEARCHES = [
  {
    title: "Красногвардейский 2-к до 15",
    meta: "Красногвардейский · 2-комн · 6–15 млн",
    found: 12,
  },
  { title: "Комнаты Центральный", meta: "Центральный · комнаты и доли", found: 3 },
  { title: "Снизили цену за 3 дня", meta: "весь Петербург · цена снижалась", found: 5 },
  { title: "Расселение", meta: "Лиговка · коммуналки целиком", found: 0 },
]

const AGENCY_SEARCHES = [
  {
    title: "Расселение, центр",
    meta: "Центральный, Адмиралтейский · комнаты и доли",
    found: 4,
  },
  { title: "Доли и комнаты", meta: "весь Петербург · до 5 млн", found: 2 },
]

/**
 * Счётчик находок с прошлой проверки.
 *
 * **Ноль показывается иначе, чем число.** У поиска с находками плашка тёплая
 * и число графитом весом 600; у поиска без находок заливки нет вовсе, а ноль
 * идёт приглушённым весом 500. Это не украшение: сохранённый поиск существует
 * ради ответа «сколько нового», и пустая плашка не должна выглядеть как
 * результат, за которым стоит идти.
 */
function FoundCounter({ found }: { found: number }) {
  const empty = found === 0

  return (
    <span
      data-slot="saved-search-count"
      className={cn(
        "flex h-8 shrink-0 items-center justify-center rounded-md px-2.5",
        empty ? "bg-transparent" : "bg-warm",
      )}
    >
      <Typography
        variant={empty ? "metaText" : "metaStrong"}
        tone={empty ? "dense" : "default"}
      >
        {found}
      </Typography>
    </span>
  )
}

/**
 * МОБАЙЛ · Сохранённые поиски (`LlJyw`).
 *
 * Тело с полями 16 и зазором 20 между разделами. Заголовок 28/600 —
 * на этом экране он крупнее, чем «Поиск» 20/600 на выдаче: там заголовок делит
 * строку со счётом объектов и кнопкой фильтров, здесь строка его одного.
 *
 * **Два раздела вместо одного списка.** Свои поиски и поиски агентства
 * разведены, потому что удалить чужой поиск нельзя, а свой можно, — и человек
 * должен видеть границу до того, как попробует.
 *
 * Строка 64 — вся строка и есть цель нажатия, счётчик и шеврон внутри неё
 * отдельно не нажимаются.
 *
 * **Ни один сохранённый поиск никуда не ведёт, и это не забытый обработчик.**
 * Сохранённый поиск открывает выдачу, а мобильной выдачи под собственным
 * адресом в продукте пока нет: собранный кадр живёт на стенде. Поэтому строки
 * названы действием и молчат — до того дня, когда выдача получит адрес. Вести
 * их на десктопный `/search` значило бы выкинуть человека с телефона в чужой
 * интерфейс.
 */
export function MobileSavedSearchesPage() {
  return (
    <PhoneStand>
      <MobileHeader balance={8610} initials="ИС" />

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="flex w-full shrink-0 items-center gap-2.5">
          <Typography variant="cardPrice" tone="default" as="h1">
            Сохранённые поиски
          </Typography>
          <div className="h-px flex-1" />
          {/* Единственное действие экрана — завести новый поиск. 44 × 44:
              на телефоне ступени начинаются с сорока четырёх.

              Ведёт на лист «Сохранить поиск»: это и есть нарисованный экран,
              где у нового поиска появляются название, автор и режим
              уведомлений. */}
          <Link
            to="/m/save-search"
            aria-label="Новый поиск"
            className={cn(
              "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-warm text-fg",
              "transition-colors hover:bg-warm-hover active:bg-warm-press",
              "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
            )}
          >
            <Plus aria-hidden className="size-4.5" strokeWidth={2} />
          </Link>
        </div>

        <LabelledSection label="МОИ ПОИСКИ">
          {MY_SEARCHES.map((search) => (
            <ListRow
              key={search.title}
              title={search.title}
              meta={search.meta}
              action={`Открыть выдачу поиска «${search.title}»`}
              trailing={
                <>
                  <FoundCounter found={search.found} />
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-text-dense"
                    strokeWidth={2}
                  />
                </>
              }
            />
          ))}
        </LabelledSection>

        <LabelledSection label="ПОИСКИ АГЕНТСТВА">
          {AGENCY_SEARCHES.map((search) => (
            <ListRow
              key={search.title}
              title={search.title}
              meta={search.meta}
              action={`Открыть выдачу поиска агентства «${search.title}»`}
              trailing={
                <>
                  <FoundCounter found={search.found} />
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-text-dense"
                    strokeWidth={2}
                  />
                </>
              }
            />
          ))}
        </LabelledSection>

        <div className="flex-1" />
      </div>

      <MobileBottomNav activeId="search" />
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   МОБАЙЛ · Сохранить поиск (`sN5wC`)
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Выдача под листом. Повторяет экран `waJiE` знак в знак — те же три объекта,
 * тот же счёт 247 и та же кнопка «Фильтры 7».
 *
 * Продублирована здесь, а не взята из `mobile-search-screen.tsx`: тот экран
 * ничего наружу не отдаёт, а править чужой файл ради подложки — цена выше
 * пользы.
 */
const UNDERLAY_ROWS = [
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

function SearchUnderlay() {
  return (
    // `inert` вместе с `aria-hidden`: под открытым листом выдача не читается
    // экранным диктором и не ловит Tab.
    <div className="flex min-h-0 flex-1 flex-col" aria-hidden inert>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
        <div className="flex h-11 w-full shrink-0 items-center gap-2">
          <Typography variant="panelTitle" tone="default">
            Поиск
          </Typography>
          <div className="h-px flex-1" />
          <Typography variant="denseText" tone="dense">
            247 объектов
          </Typography>
          <span className="flex h-11 shrink-0 items-center justify-center rounded-full bg-surface px-3.5 shadow-[inset_0_0_0_1px_var(--border-control)]">
            <Typography variant="controlLabel" tone="default">
              Фильтры 7
            </Typography>
          </span>
        </div>

        <div className="flex w-full flex-col gap-2">
          {UNDERLAY_ROWS.map((row) => (
            <MobileListingRow key={row.address} {...row} />
          ))}
        </div>
      </div>
    </div>
  )
}

const NOTIFY_OPTIONS = [
  { id: "instant", label: "Сразу" },
  { id: "daily", label: "Раз в день утром" },
  { id: "off", label: "Выключено" },
]

/**
 * Выбор одного из нескольких: пилюля автора и строка уведомления.
 *
 * Форма выбранного и невыбранного одна и та же во всём листе: выбранное идёт
 * тёмной границей и подписью весом 600, невыбранное — границей `border-control`
 * и приглушённой подписью весом 500.
 */
function ChoicePill({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full px-4",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        selected
          ? "bg-fg shadow-[inset_0_0_0_1px_var(--fg)]"
          : "bg-surface shadow-[inset_0_0_0_1px_var(--border-control)]",
      )}
    >
      <Typography
        variant={selected ? "controlLabel" : "uiText"}
        tone={selected ? "inverse" : "secondary"}
      >
        {label}
      </Typography>
    </button>
  )
}

function ChoiceRow({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-md px-3.5 text-left",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        selected
          ? "bg-warm shadow-[inset_0_0_0_1px_var(--fg)]"
          : "bg-surface shadow-[inset_0_0_0_1px_var(--border-control)]",
      )}
    >
      {/* Метка выбора в файле — сплошной кружок 18 без кольца и без точки
          внутри: выбранный графитовый, невыбранный серый. Воспроизведено
          как нарисовано. */}
      <span
        aria-hidden
        className={cn(
          "size-4.5 shrink-0 rounded-full",
          selected ? "bg-fg" : "bg-border-control",
        )}
      />
      <Typography
        variant={selected ? "controlLabel" : "uiText"}
        tone={selected ? "default" : "secondary"}
      >
        {label}
      </Typography>
    </button>
  )
}

/**
 * МОБАЙЛ · Сохранить поиск (`sN5wC`).
 *
 * Лист поверх выдачи, а не отдельный экран: человек уже собрал условия
 * фильтрами и не должен терять выдачу из виду ради названия.
 *
 * **Условия показаны текстом целиком, а не «7 фильтров».** Сохранённый поиск
 * живёт месяцами, и через месяц число «7» не скажет ничего, а строка
 * «Красногвардейский, Невский, Калининский · 6–15 млн · не первый этаж ·
 * до 10 минут пешком» скажет всё.
 *
 * **Автор выбирается до сохранения, а не после.** Личный поиск виден только
 * тебе, поиск агентства — всем и удалению тобой не подлежит. Развернуть это
 * решение потом дороже, чем принять сейчас.
 *
 * Уведомление тремя строками, а не переключателем: «Сразу» и «Раз в день
 * утром» — разные рабочие режимы, а не «включено» и «выключено».
 *
 * Автор и режим уведомлений — настоящий выбор: нажатие переставляет отметку.
 * Сохранение уводит на список сохранённых поисков — туда, где новый поиск
 * и появится.
 */
export function MobileSaveSearchPage() {
  const navigate = useNavigate()
  const [author, setAuthor] = useState<"personal" | "agency">("personal")
  const [notify, setNotify] = useState("instant")

  return (
    <PhoneStand>
      <div aria-hidden inert>
        <MobileHeader balance={8610} initials="ИС" />
      </div>
      <SearchUnderlay />
      <div aria-hidden inert>
        <MobileBottomNav activeId="search" />
      </div>

      <PhoneSheet shape="form" label="Сохранить поиск">
        <div className="flex w-full flex-col gap-1">
          <Typography variant="panelTitle" tone="default" as="h2">
            Сохранить поиск
          </Typography>
          <Typography variant="denseText" tone="dense">
            Красногвардейский, Невский, Калининский · 6–15 млн · не первый этаж ·
            до 10 минут пешком
          </Typography>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Typography
            as="label"
            variant="columnHeader"
            tone="dense"
            htmlFor="save-search-name"
          >
            НАЗВАНИЕ
          </Typography>
          <div className="flex h-12 w-full items-center rounded-xl bg-surface px-3.5 shadow-[inset_0_0_0_1px_var(--border-control)] focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg">
            <Typography asChild variant="rowPrice" tone="default">
              <input
                id="save-search-name"
                type="text"
                defaultValue="Красногвардейский 2-к до 15"
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
            </Typography>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Typography variant="columnHeader" tone="dense" id="save-search-author">
            АВТОР
          </Typography>
          <div
            role="radiogroup"
            aria-labelledby="save-search-author"
            className="flex w-full gap-2"
          >
            <ChoicePill
              label="Личный"
              selected={author === "personal"}
              onSelect={() => setAuthor("personal")}
            />
            <ChoicePill
              label="Агентства"
              selected={author === "agency"}
              onSelect={() => setAuthor("agency")}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Typography variant="columnHeader" tone="dense" id="save-search-notify">
            УВЕДОМЛЯТЬ О НОВЫХ
          </Typography>
          <div
            role="radiogroup"
            aria-labelledby="save-search-notify"
            className="flex w-full flex-col gap-2"
          >
            {NOTIFY_OPTIONS.map((option) => (
              <ChoiceRow
                key={option.id}
                label={option.label}
                selected={option.id === notify}
                onSelect={() => setNotify(option.id)}
              />
            ))}
          </div>
        </div>

        {/*
          Переход сделан кнопкой, а не ссылкой, вынужденно: у закрытой кнопки
          продукта `asChild` не работает — подпись печатается отдельным узлом,
          и Slot остаётся без единственного потомка. Правится в самой кнопке,
          и до тех пор эту кнопку нельзя открыть в новой вкладке.
        */}
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() => void navigate({ to: "/m/saved-searches" })}
        >
          Сохранить поиск
        </Button>
      </PhoneSheet>
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   МОБАЙЛ · Глобальный поиск (`bx94j`)
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Находки ведут на карточки объектов, и адреса не выдуманы: «Ленская ул., 10»
 * раскрыта и лежит на `/m/object`, «Ленская ул., 6» ещё нет и лежит
 * на `/m/object/before`. Найденный номер — это тот же раскрытый объект,
 * поэтому и он ведёт на карточку, а не в отдельный список телефонов.
 */
const FOUND_OBJECTS: { title: string; meta: string; state: string; to: ObjectRoute }[] = [
  {
    title: "Ленская ул., 10",
    meta: "2-комн · 58 м² · 8,6 млн ₽ · ▼ −12 %",
    state: "в работе",
    to: "/m/object",
  },
  {
    title: "Ленская ул., 6",
    meta: "2-комн · 57 м² · 8,8 млн ₽ · ▼ −10 %",
    state: "свободен",
    to: "/m/object/before",
  },
]

const FOUND_PHONES: { title: string; meta: string; state: string; to: ObjectRoute }[] = [
  {
    title: "+7 900 000-99-87",
    meta: "Ленская ул., 10 · раскрыт тобой 24.07",
    state: "0 ₽",
    to: "/m/object",
  },
]

/**
 * МОБАЙЛ · Глобальный поиск (`bx94j`).
 *
 * **На телефоне глобальный поиск — экран, а не поле в шапке.** В шапке 390
 * помещаются ровно три вещи: логотип, остаток и аватар. Поиск переехал сюда
 * целиком и получил собственную строку 48 с границей 2 px — она нарисована
 * уже в фокусе, потому что экран открывается ради ввода.
 *
 * Находки разложены по тому, чем искали: адрес и телефон отвечают на разные
 * вопросы, и общим списком их смешивать нельзя.
 *
 * **Строка про телефоны стоит в конце и написана явно.** «Телефон находится
 * только среди уже раскрытых агентством контактов» — граница продукта:
 * поиск по чужим номерам здесь невозможен, и человек узнаёт это до попытки,
 * а не после пустой выдачи.
 *
 * Справа у находки не шеврон, а слово о состоянии: «в работе», «свободен»,
 * «0 ₽». Оно отвечает на вопрос, который задают перед нажатием, — стоит ли
 * туда вообще идти и списывалось ли уже.
 */
export function MobileGlobalSearchPage() {
  return (
    <PhoneStand>
      <MobileHeader balance={8610} initials="ИС" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="flex h-12 w-full shrink-0 items-center gap-2.5 rounded-xl bg-surface px-3.5 shadow-[inset_0_0_0_2px_var(--fg)] focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-fg">
          <Search aria-hidden className="size-4.5 shrink-0 text-text-dense" strokeWidth={2} />
          <Typography asChild variant="rowPrice" tone="default">
            <input
              type="text"
              aria-label="Поиск по адресу, телефону и номеру объявления"
              defaultValue="Ленская"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </Typography>
        </div>

        <LabelledSection label="ОБЪЕКТЫ" gap="xs">
          {FOUND_OBJECTS.map((item) => (
            <ListRow
              key={item.title}
              title={item.title}
              meta={item.meta}
              to={item.to}
              trailing={
                <Typography variant="metaText" tone="secondary">
                  {item.state}
                </Typography>
              }
            />
          ))}
        </LabelledSection>

        <LabelledSection label="ПО ТЕЛЕФОНУ" gap="xs">
          {FOUND_PHONES.map((item) => (
            <ListRow
              key={item.title}
              title={item.title}
              meta={item.meta}
              to={item.to}
              trailing={
                <Typography variant="metaText" tone="secondary">
                  {item.state}
                </Typography>
              }
            />
          ))}
        </LabelledSection>

        <Typography variant="metaText" tone="dense">
          Ищем по адресу, телефону и номеру объявления. Телефон находится только
          среди уже раскрытых агентством контактов.
        </Typography>

        <div className="flex-1" />
      </div>

      <MobileBottomNav activeId="search" />
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   МОБАЙЛ · Массовое раскрытие (`liwT8`)
   ──────────────────────────────────────────────────────────────────────── */

/**
 * МОБАЙЛ · Массовое раскрытие (`liwT8`).
 *
 * Последний экран перед списанием 1 791 ₽ — самой крупной разовой тратой
 * в продукте.
 *
 * **Вопрос задан числом контактов, а не суммой**, а сумма стоит объяснением
 * ниже. Так и думает человек: сначала «сколько я открываю», потом «во что мне
 * это встанет».
 *
 * **Объяснение считает не только списание, но и остаток, и что этот остаток
 * значит:** «Останется 6 819 ₽, это 34 раскрытия». Голый остаток в рублях
 * ничего не решает — решает ответ на вопрос «на сколько мне ещё хватит».
 *
 * Подпись главной кнопки повторяет и число, и сумму. Кнопку жмут не глядя,
 * и последняя надпись перед деньгами обязана быть полной.
 *
 * **Главная кнопка названа действием и намеренно ничего не делает.** Списание
 * коснулось бы девяти конкретных объектов, а этот кадр нарисован без списка:
 * ни адресов, ни идентификаторов на нём нет. Придумать девять адресов ради
 * нажатия значило бы записать в сеанс раскрытия объектов, которых никто
 * не открывал, — и остальные экраны показали бы владельцу вымысел как факт.
 * Отмена при этом работает по-настоящему: она возвращает к панели действий,
 * откуда подтверждение и открыли, и выбор из двенадцати объектов не пропадает.
 */
export function MobileBulkDisclosurePage() {
  return (
    <PhoneStand surface="none">
      <PhoneSheet label="Раскрыть 9 контактов?">
        <div className="flex w-full flex-col gap-2">
          <Typography variant="panelTitle" tone="default" as="h2">
            Раскрыть 9 контактов?
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Спишется 1 791 ₽ со счёта агентства. Останется 6 819 ₽, это 34
            раскрытия.
          </Typography>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            block
            data-action="Списать 1 791 ₽ и раскрыть 9 контактов"
          >
            Раскрыть 9 · 1 791 ₽
          </Button>
          <QuietPill to="/m/bulk-panel">Отмена</QuietPill>
        </div>
      </PhoneSheet>
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   МОБАЙЛ · Панель массовых действий (`vmUET`)
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Четыре массовых действия.
 *
 * **Только у первого есть нарисованное продолжение** — подтверждение списания.
 * У трёх остальных выбора в макете нет: ни списка подборок, ни списка статусов,
 * ни списка агентов. Они названы действием и молчат; выдуманный список
 * подборок здесь обещал бы человеку набор, которого продукт ещё не показывает.
 */
const BULK_ACTIONS: { label: string; primary: boolean; to?: SheetRoute; action?: string }[] = [
  { label: "Раскрыть 9 контактов · 1 791 ₽", primary: true, to: "/m/bulk-disclosure" },
  { label: "В подборку", primary: false, action: "Добавить 12 объектов в подборку" },
  { label: "Сменить статус", primary: false, action: "Сменить статус у 12 объектов" },
  { label: "Назначить агенту", primary: false, action: "Назначить 12 объектов агенту" },
]

/**
 * Пункт массового действия: 48, радиус 12, подпись прижата влево.
 *
 * Влево, а не по центру, — это список действий, а не ряд кнопок: глаз идёт
 * по одной вертикали и не прыгает за центрами разной длины.
 */
function BulkActionRow({
  label,
  primary,
  to,
  action,
}: {
  label: string
  primary: boolean
  /** Экран за пунктом. Задан — пункт становится ссылкой. */
  to?: SheetRoute
  /** Действие без нарисованного экрана: названо и ничего не рисует. */
  action?: string
}) {
  const shell = cn(
    "flex h-12 w-full cursor-pointer items-center rounded-xl px-4 text-left",
    "transition-colors outline-none",
    "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
    primary
      ? "bg-fg hover:bg-fg-hover active:bg-fg-press"
      : "bg-warm hover:bg-warm-hover active:bg-warm-press",
  )

  const caption = (
    <Typography variant="controlLabelLg" tone={primary ? "inverse" : "default"}>
      {label}
    </Typography>
  )

  if (to !== undefined) {
    return (
      <Link to={to} data-slot="bulk-action" className={shell}>
        <>{caption}</>
      </Link>
    )
  }

  return (
    <button type="button" data-slot="bulk-action" data-action={action} className={shell}>
      <>{caption}</>
    </button>
  )
}

/**
 * МОБАЙЛ · Панель массовых действий (`vmUET`).
 *
 * Открывается, когда в выдаче отмечено несколько объектов.
 *
 * **Заголовок называет размер выбора, а подпись — его последствие:**
 * «Действие применится ко всем сразу». На телефоне отметки не видны за листом,
 * и число «12» — единственное, чем человек может проверить себя.
 *
 * Раскрытие стоит первым и графитом, остальные три — тёплые: только оно
 * списывает деньги, и разделены они не порядком, а весом.
 *
 * **Из двенадцати выбранных раскрывается девять.** Разница не ошибка: у трёх
 * контакт уже раскрыт агентством раньше, и второй раз за него не платят.
 *
 * «Снять выбор» отделено зазором 20 и капсулой: это выход из режима,
 * а не пятое действие над объектами.
 */
export function MobileBulkPanelPage() {
  return (
    <PhoneStand surface="none">
      <PhoneSheet label="12 объектов выбрано">
        <div className="flex w-full flex-col gap-2">
          <Typography variant="panelTitle" tone="default" as="h2">
            12 объектов выбрано
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Действие применится ко всем сразу.
          </Typography>
        </div>

        <div className="flex w-full flex-col gap-2">
          {BULK_ACTIONS.map((action) => (
            <BulkActionRow key={action.label} {...action} />
          ))}
        </div>

        {/* Снятие выбора возвращает в обычную выдачу, а у мобильной выдачи
            собственного адреса пока нет. Действие названо и ничего не рисует. */}
        <div className="flex w-full flex-col gap-2">
          <QuietPill action="Снять выбор с 12 объектов">Снять выбор</QuietPill>
        </div>
      </PhoneSheet>
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   МОБАЙЛ · Пуши на экране блокировки (`nZGka`)
   ──────────────────────────────────────────────────────────────────────── */

const PUSHES = [
  {
    time: "14:02",
    title: "Три новых объекта",
    text: "Красногвардейский 2-к до 15. Самый дешёвый на 12 % ниже аналогов.",
  },
  {
    time: "15:45",
    title: "Перезвонить через 15 минут",
    text: "Ленская ул., 6. Собственник просил набрать в 16:00.",
  },
  {
    time: "17:20",
    title: "Лимит на сегодня исчерпан",
    text: "Открыто 5 из 5. Обнулится в 00:00.",
  },
]

/**
 * Карточка уведомления на экране блокировки: значок 38, поля 14, радиус 16,
 * белая подложка при 90 %.
 *
 * Время стоит в колонке 60 и выключено влево — так в файле. В настоящей iOS оно
 * прижато вправо; расхождение воспроизведено, а не исправлено.
 */
function LockPush({ time, title, text }: { time: string; title: string; text: string }) {
  return (
    <div
      data-slot="lock-push"
      className="flex w-full items-start gap-3 rounded-2xl bg-surface/90 p-3.5"
    >
      <span className="flex size-9.5 shrink-0 items-center justify-center rounded-lg bg-fg text-surface">
        <Typography variant="rowPrice" tone="current">
          С
        </Typography>
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex w-full items-center">
          <div className="min-w-0 flex-1">
            <Typography variant="tabActive" tone="default">
              Сёрчь
            </Typography>
          </div>
          <div className="w-15 shrink-0">
            <Typography variant="metaText" tone="secondary">
              {time}
            </Typography>
          </div>
        </div>
        <Typography variant="strongText" tone="default">
          {title}
        </Typography>
        <Typography variant="uiText" tone="secondary">
          {text}
        </Typography>
      </div>
    </div>
  )
}

/**
 * МОБАЙЛ · Пуши на экране блокировки (`nZGka`).
 *
 * Это не экран продукта, а его след на чужой территории: приложение здесь
 * не открыто, и всё, чем оно располагает, — три строки под своим именем.
 *
 * **Каждый пуш отвечает на вопрос «идти ли сейчас».** Не «есть новое»,
 * а «Три новых объекта, самый дешёвый на 12 % ниже аналогов»; не «пора
 * позвонить», а «Собственник просил набрать в 16:00»; не «лимит», а «Открыто
 * 5 из 5, обнулится в 00:00». Пуш, после которого надо открыть приложение,
 * чтобы понять, зачем его открыли, — потраченное впустую внимание.
 *
 * Три пуша разной природы: находка, обещание собственнику и граница тарифа.
 * Больше поводов будить человека у продукта нет.
 *
 * Часы 66/600 — типографика операционной системы, а не продукта: в лестнице
 * кабинета восемь ступеней и самая крупная 40. Ближайшей ступени у 66 нет
 * вовсе, поэтому кегль задан замером явно; остальные размеры этого экрана
 * (15, 17) сведены на соседние ступени лестницы с расхождением в 1 px.
 */
export function MobilePushPage() {
  return (
    <PhoneStand surface="dark">
      <div className="flex h-full w-full flex-col items-center gap-8 px-4 pt-18">
        <div className="flex w-full flex-col items-center gap-0.5 text-surface">
          <Typography
            variant="display"
            tone="current"
            style={{ fontSize: "66px", lineHeight: 1, letterSpacing: "-2.4px" }}
          >
            9:41
          </Typography>
          <span className="text-surface/80">
            <Typography variant="uiText" tone="current">
              вторник, 28 июля
            </Typography>
          </span>
        </div>

        <div className="flex w-full flex-col gap-2">
          {PUSHES.map((push) => (
            <LockPush key={push.time} {...push} />
          ))}
        </div>
      </div>
    </PhoneStand>
  )
}
