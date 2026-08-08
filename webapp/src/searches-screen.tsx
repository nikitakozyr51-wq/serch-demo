import { Link, useNavigate } from "@tanstack/react-router"
import { ListFilter, Search } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { useSession } from "@/features/auth"
import { CabinetPage, CabinetShell } from "@/features/cabinet"
import { countQuery, groupDigits, plural } from "@/features/listings"
import {
  formatMoment,
  saveSearch,
  setSearchNotify,
  touchSavedSearch,
  useNow,
  useWorkspace,
  type SavedSearch,
  type SearchNotify,
} from "@/features/workspace"
import { cn } from "@/lib/utils"

/**
 * ПОИСК · Сохранённые поиски — главный экран кабинета.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ГЛАВНЫМ СТАЛ ИМЕННО ОН
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Кабинет открывался на «Сегодня». У агентства, созданного минуту назад,
 * этот экран пуст, и первое впечатление от продукта — пустота. Владелец
 * сформулировал это как «непонятно, как должен работать в принципе поиск».
 *
 * Ответ конкуренту тоже здесь. У SmartAgent на входе одна широкая строка
 * «поиск по всему», и она понятна ровно потому, что больше у него ничего
 * нет: нажал — и получил стог из полумиллиона объявлений. Наш вход говорит
 * другое: «12 новых по Красногвардейскому с вашего прошлого захода».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ГЕОМЕТРИЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Снято с `bZOeU`, 1440 × 1024. Тело 1200 с полем 24. Заголовок 32 сверху,
 * полоса подразделов 36 с зазором 24 между ними, таблица от y=140.
 *
 * Колонки таблицы: имя поиска тянется, остальные закреплены —
 * 120 · 120 · 120 · 120 · 144 · 120.
 *
 * **Одно расхождение с кадром названо вслух.** В файле нарисованы 110, 130
 * и 140; 110 и 130 не делятся на четыре, а 140 спорит с собственным правилом
 * кабинета «дата со временем всегда 144» (`DataTable`). Это дрейф значений,
 * а не решение: восемь таблиц кабинета держат одну ширину для одной по смыслу
 * колонки, и ради одной таблицы шкалу не открывают. Ширины сняты на ближайшую
 * ступень закрытой шкалы. Разница до 10 px и попадает в свободную первую
 * колонку.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧЕГО ЗДЕСЬ НЕТ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Широкой строки поиска рядом с таблицей нет. `⌘K` уже отвечает на «найти
 * конкретный объект», и второе поле рядом стало бы вторым фильтром: два
 * способа сделать одно хуже любого из них поодиночке. Поле появляется
 * только на пустом экране — там оно ЗАМЕНЯЕТ таблицу, а не соседствует
 * с ней.
 */

/** Как называется частота уведомлений в таблице. Снято с чипов `bZOeU`. */
const NOTIFY_LABEL: Record<SearchNotify, string> = {
  instant: "Сразу",
  hourly: "Раз в час",
  morning: "Утром",
  off: "Выключено",
}

/** По кругу: нажатие на чип меняет частоту, отдельного окна выбора в файле нет. */
const NOTIFY_NEXT: Record<SearchNotify, SearchNotify> = {
  instant: "hourly",
  hourly: "morning",
  morning: "off",
  off: "instant",
}

/**
 * Готовые наборы условий для первого поиска.
 *
 * Снято с `uCehD`. Это не данные и не выдумка: это четыре типовых запроса
 * петербургского агентства, и они существуют затем, чтобы человек, впервые
 * открывший кабинет, завёл первый поиск в два нажатия, а не изучал колонку
 * фильтров с нуля.
 */
const PRESETS: { name: string; query: SavedSearch["query"] }[] = [
  {
    name: "Петроградский 2-к до 15 млн",
    query: { districts: ["petrogradsky"], rooms: [2], priceCap: 15, tab: "all", sort: "fresh" },
  },
  {
    name: "Вся вторичка за сутки",
    query: { districts: [], rooms: [], priceCap: 0, tab: "new", sort: "fresh" },
  },
  {
    name: "Комнаты и доли Центральный",
    query: { districts: ["central"], rooms: [1], priceCap: 6, tab: "all", sort: "cheap" },
  },
  {
    name: "Расселение",
    query: { districts: [], rooms: [3, 4], priceCap: 0, tab: "all", sort: "expensive" },
  },
]

/** Как условия читаются человеком: «Красногвардейский · 2-к · 6–15 млн». */
function describeQuery(query: SavedSearch["query"]): string {
  const parts: string[] = []

  parts.push(query.districts.length === 0 ? "весь город" : query.districts.length === 1
    ? DISTRICT_NAME[query.districts[0]!] ?? query.districts[0]!
    : `${query.districts.length} ${plural(query.districts.length, "район", "района", "районов")}`)

  if (query.rooms.length > 0) {
    parts.push(query.rooms.map((room) => `${room}-к`).join(", "))
  }
  if (query.priceCap > 0) parts.push(`до ${query.priceCap} млн`)
  if (query.tab === "new") parts.push("за сутки")
  if (query.tab === "cheaper") parts.push("дешевле рынка")

  return parts.join(" · ")
}

/** Имена районов для подписи условий. Идентификаторы те же, что в базе. */
const DISTRICT_NAME: Record<string, string> = {
  krasnogvardeisky: "Красногвардейский",
  nevsky: "Невский",
  kalininsky: "Калининский",
  central: "Центральный",
  petrogradsky: "Петроградский",
  admiralteysky: "Адмиралтейский",
  vyborgsky: "Выборгский",
  moskovsky: "Московский",
  primorsky: "Приморский",
  frunzensky: "Фрунзенский",
  vasileostrovsky: "Василеостровский",
  kirovsky: "Кировский",
}

/** Строка таблицы: сам поиск плюс то, что по нему сейчас находится. */
type SearchLine = {
  search: SavedSearch
  total: number
  fresh: number
}

function SearchesTable({ lines }: { lines: SearchLine[] }) {
  const navigate = useNavigate()

  return (
    <div
      data-slot="searches-table"
      className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-surface"
    >
      <div className="flex h-row-head w-full items-center gap-3 bg-warm px-4">
        <div className="flex min-w-0 flex-1 items-center">
          <Typography variant="columnHeader" tone="dense">
            ПОИСК
          </Typography>
        </div>
        {[
          ["КТО СОЗДАЛ", false],
          ["ВИДЕН", true],
          ["НОВЫХ ЗА СУТКИ", true],
          ["ВСЕГО", true],
        ].map(([head, right]) => (
          <div
            key={String(head)}
            className={cn("flex w-col-120 shrink-0 items-center", right === true && "justify-end")}
          >
            <Typography variant="columnHeader" tone="dense">
              <>{head}</>
            </Typography>
          </div>
        ))}
        <div className="flex w-col-144 shrink-0 items-center justify-end">
          <Typography variant="columnHeader" tone="dense">
            ПОСЛЕДНИЙ ПРОСМОТР
          </Typography>
        </div>
        <div className="flex w-col-120 shrink-0 items-center justify-end">
          <Typography variant="columnHeader" tone="dense">
            УВЕДОМЛЕНИЯ
          </Typography>
        </div>
      </div>

      {lines.map(({ search, total, fresh }, index) => (
        <div
          key={search.id}
          data-slot="search-row"
          // Строка открывает выдачу с условиями этого поиска. До этого экрана
          // сохранённый поиск был кнопкой без действия — ровно то, на что
          // жаловался владелец: «не могу нажать ни на один сохранённый поиск».
          onClick={() => {
            touchSavedSearch(search.id)
            void navigate({ to: "/search", search: { saved: search.id } })
          }}
          className={cn(
            "row-tap flex h-row-tbl w-full cursor-pointer items-center gap-3 bg-surface px-4",
            index < lines.length - 1 && "border-b border-line-2",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Typography variant="numericDense" tone="default">
              <>{search.name}</>
            </Typography>
            <Typography variant="metaText" tone="dense">
              <>{describeQuery(search.query)}</>
            </Typography>
          </div>

          <div className="flex w-col-120 shrink-0 items-center">
            <Typography variant="denseText" tone="default">
              <>{search.by}</>
            </Typography>
          </div>

          <div className="flex w-col-120 shrink-0 items-center justify-end">
            <Typography variant="denseText" tone={search.shared ? "default" : "dense"}>
              <>{search.shared ? "агентства" : "личный"}</>
            </Typography>
          </div>

          {/* Ноль новых приглушён, а не спрятан: у поиска, который ничего
              не принёс, эта клетка и есть ответ. */}
          <div className="flex w-col-120 shrink-0 items-center justify-end">
            <Typography variant="denseText" tone={fresh > 0 ? "default" : "dense"}>
              <>{fresh}</>
            </Typography>
          </div>

          <div className="flex w-col-120 shrink-0 items-center justify-end">
            <Typography variant="denseText" tone="default">
              <>{groupDigits(total)}</>
            </Typography>
          </div>

          <div className="flex w-col-144 shrink-0 items-center justify-end">
            <Typography variant="denseText" tone="secondary">
              <>{search.lastOpenedAt === undefined ? "—" : formatMoment(search.lastOpenedAt)}</>
            </Typography>
          </div>

          <div className="flex w-col-120 shrink-0 items-center justify-end">
            {/* Чип нажимается и меняет частоту по кругу. Отдельного окна
                выбора в файле нет, а четыре значения по кругу проходятся
                быстрее, чем открывается любое окно. */}
            <button
              type="button"
              data-slot="notify-chip"
              data-notify={search.notify}
              aria-label={`Уведомления: ${NOTIFY_LABEL[search.notify]}. Сменить`}
              onClick={(event) => {
                event.stopPropagation()
                setSearchNotify(search.id, NOTIFY_NEXT[search.notify])
              }}
              className={cn(
                "flex h-ctl-chip cursor-pointer items-center rounded-full px-2 transition-colors duration-120",
                "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                search.notify === "off"
                  ? "bg-transparent hover:bg-warm active:bg-warm-hover"
                  : "bg-warm hover:bg-warm-hover active:bg-warm-press",
              )}
            >
              <Typography
                variant="metaText"
                tone={search.notify === "instant" ? "default" : search.notify === "off" ? "dense" : "secondary"}
              >
                <>{NOTIFY_LABEL[search.notify]}</>
              </Typography>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Первый вход: поисков ещё нет.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Это исключение из правила доски `СИСТЕМА · Пустые списки`**, и исключение
 * названо. Правило говорит: шапка таблицы остаётся, на месте строк — одна
 * строка текста, никаких иллюстраций и никаких извинений. Оно верное для
 * возвратов, документов и журнала — второстепенных экранов, куда заходят
 * с вопросом и уходят с ответом.
 *
 * Здесь другое. Это первый экран продукта, и пустая таблица с шапкой —
 * правильное пустое состояние и никуда не годный первый экран.
 *
 * **Экран не разовый.** Он живёт ровно столько, сколько нужна помощь, и
 * исчезает сам, когда появляется первый сохранённый поиск. Разовый экран
 * человек видит один раз и теряет.
 */
function FirstSearch() {
  const session = useSession()
  const navigate = useNavigate()
  const [text, setText] = useState("")

  const takePreset = (preset: (typeof PRESETS)[number]) => {
    saveSearch(preset.name, preset.query, session?.name ?? "")
    void navigate({ to: "/search", search: {} })
  }

  return (
    <div data-slot="first-search" className="flex w-full flex-col gap-8">
      <div className="flex w-full flex-col gap-2">
        <Typography variant="panelTitle" tone="default" as="h2">
          С чего начать поиск
        </Typography>
        <div className="w-150">
          <Typography variant="uiText" tone="secondary">
            Введите адрес, метро или район либо возьмите готовый набор.
            Фильтры перестроятся сами.
          </Typography>
        </div>
      </div>

      {/* Поле здесь ЗАМЕНЯЕТ таблицу, а не стоит рядом с фильтрами: на этом
          экране колонки фильтров нет вовсе, и спорить ему не с чем. */}
      <form
        className="flex w-full items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const name = text.trim()
          if (name === "") return
          saveSearch(
            name,
            { districts: [], rooms: [], priceCap: 0, tab: "all", sort: "fresh" },
            session?.name ?? "",
          )
          void navigate({ to: "/search", search: {} })
        }}
      >
        <div className="flex h-ctl-lg w-150 items-center gap-3 border-b border-solid border-line-2 px-0">
          <Search aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
          <input
            data-slot="first-search-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Адрес, метро или район"
            aria-label="Адрес, метро или район"
            className="h-full min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-text-dense"
          />
        </div>
        <Button type="submit" size="lg">
          Найти
        </Button>
      </form>

      <div className="flex w-full flex-col gap-3">
        <Typography variant="columnHeader" tone="dense">
          ГОТОВЫЕ НАБОРЫ
        </Typography>
        <div className="flex w-full flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              data-slot="preset"
              onClick={() => takePreset(preset)}
              className="flex h-ctl-sm cursor-pointer items-center rounded-full bg-warm px-4 transition-colors duration-120 hover:bg-warm-hover active:bg-warm-press outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="controlLabel" tone="default">
                <>{preset.name}</>
              </Typography>
            </button>
          ))}
        </div>
      </div>

      {/*
        Поиски агентства — общие, настроенные руководителем.

        Раздел показывается пустым и объясняет почему. Пока работа лежит
        в браузере одного человека, «общее для агентства» существовать
        не может физически: чужой браузер этих поисков не увидит. Убрать
        раздел значило бы спрятать половину ответа на вопрос «чем личный
        поиск отличается от общего».
      */}
      <div className="flex w-full flex-col gap-3">
        <Typography variant="columnHeader" tone="dense">
          ПОИСКИ АГЕНТСТВА, УЖЕ НАСТРОЕННЫЕ РУКОВОДИТЕЛЕМ
        </Typography>
        <div className="w-150">
          <Typography variant="metaText" tone="dense">
            Появятся, когда руководитель заведёт общий поиск. Общие поиски
            видны всем сотрудникам и приносят новое каждому.
          </Typography>
        </div>
      </div>

      {/*
        Три сущности объясняются блоком, а не подсказкой.

        Ни тура, ни всплывающих окон: блок живёт там же, где остальное пустое
        состояние, и исчезает вместе с ним. Подсказка, которую надо закрыть,
        закрывается не читая.
      */}
      <div
        data-slot="three-things"
        className="flex w-full flex-col gap-3 rounded-2xl bg-warm px-6 py-5"
      >
        <Typography variant="columnHeader" tone="dense">
          ТРИ РАЗНЫЕ ВЕЩИ, И ВСЕ НАЗЫВАЮТСЯ ПОИСКОМ
        </Typography>
        {[
          [
            "Сохранённый поиск",
            "приносит новое сам. Задайте условия и нажмите «Сохранить поиск» — он появится в сайдбаре.",
          ],
          [
            "Фильтры слева",
            "сужают то, что уже нашлось. Счётчик пересчитывается на каждом касании.",
          ],
          [
            "⌘K вверху",
            "ищет конкретный объект по адресу, телефону или номеру объявления.",
          ],
        ].map(([term, text]) => (
          <div key={term} className="flex w-full items-start gap-4">
            <div className="w-42 shrink-0">
              <Typography variant="numericDense" tone="default">
                <>{term}</>
              </Typography>
            </div>
            <div className="min-w-0 flex-1">
              <Typography variant="uiText" tone="secondary">
                <>{text}</>
              </Typography>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Подразделы главного экрана. Снято с `bZOeU`. */
const SCOPES = [
  { id: "mine", label: "Мои" },
  { id: "all", label: "Все" },
  { id: "agency", label: "Агентства" },
  { id: "archive", label: "Архив" },
] as const

export function SearchesPage() {
  const workspace = useWorkspace()
  const session = useSession()
  const now = useNow()
  const [scope, setScope] = useState<string>("all")

  const mine = session?.name ?? ""

  const visible = workspace.savedSearches.filter((search) => {
    if (scope === "mine") return search.by === mine && !search.shared
    if (scope === "agency") return search.shared
    // «Архив» — поиски, которые не открывали больше месяца. Не отдельное
    // состояние записи, а следствие: архивировать вручную нечего, если
    // человек и так туда не заходит.
    if (scope === "archive") {
      return search.lastOpenedAt !== undefined && now - search.lastOpenedAt > 30 * 24 * 60 * 60_000
    }
    return true
  })

  const lines: SearchLine[] = visible.map((search) => ({
    search,
    ...countQuery(ALL_ROWS, search.query),
  }))

  const personal = workspace.savedSearches.filter((item) => !item.shared).length
  const shared = workspace.savedSearches.length - personal

  return (
    <CabinetShell activeId="search">
      <CabinetPage rhythm={workspace.savedSearches.length === 0 ? "sparse" : "dense"}>
        <div className="flex h-8 w-full shrink-0 items-center gap-3">
          <Typography variant="panelTitle" tone="default" as="h1">
            Сохранённые поиски
          </Typography>
          <Typography variant="denseText" tone="dense">
            <>
              {workspace.savedSearches.length === 0
                ? "первый вход · поисков ещё нет"
                : `${workspace.savedSearches.length} ${plural(workspace.savedSearches.length, "поиск", "поиска", "поисков")} · ` +
                  `${personal} ${plural(personal, "личный", "личных", "личных")}, ` +
                  `${shared} ${plural(shared, "общий", "общих", "общих")} для агентства`}
            </>
          </Typography>
          <div className="h-px flex-1" />
          {/* Кнопка ведёт на выдачу: новый поиск заводится там, где его
              задают условиями, а не отдельной формой. «Сохранить поиск»
              стоит внизу колонки фильтров. */}
          <Link to="/search" search={{}}>
            <Button size="sm">Новый поиск</Button>
          </Link>
        </div>

        {workspace.savedSearches.length === 0 ? (
          <FirstSearch />
        ) : (
          <>
            <div className="flex h-row-head w-full shrink-0 items-center gap-6">
              {SCOPES.map((item) => {
                const active = item.id === scope
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-slot="scope-tab"
                    data-active={active || undefined}
                    onClick={() => setScope(item.id)}
                    // Вкладка отвечает цветом подписи: заливка превратила бы
                    // её в кнопку, а подчёркивания в этом ряду нет и в файле.
                    // Прежде ряд не отвечал ни на что и читался как подписи.
                    className={cn(
                      "flex h-row-head cursor-pointer items-center bg-transparent",
                      "transition-colors duration-120",
                      active ? "text-fg" : "text-text-2 hover:text-fg active:text-fg-hover",
                      "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
                    )}
                  >
                    <Typography variant={active ? "strongText" : "uiText"} tone="current">
                      {item.label}
                    </Typography>
                  </button>
                )
              })}
            </div>

            {lines.length === 0 ? (
              <div
                data-slot="searches-empty"
                className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-surface"
              >
                {/* Шапка таблицы остаётся — правило доски `СИСТЕМА · Пустые
                    списки`. Пустая таблица не схлопывается в картинку: на
                    месте строк одна строка текста, почему пусто. */}
                <div className="flex h-row-head w-full items-center bg-warm px-4">
                  <Typography variant="columnHeader" tone="dense">
                    ПОИСК
                  </Typography>
                </div>
                <div className="flex h-row-tbl w-full items-center px-4">
                  <Typography variant="denseText" tone="dense">
                    <>
                      {scope === "agency"
                        ? "Общих поисков нет. Их заводит руководитель, и они видны всем сотрудникам."
                        : scope === "archive"
                          ? "В архиве пусто: сюда попадают поиски, которые не открывали больше месяца."
                          : "Личных поисков нет. Задайте условия на выдаче и нажмите «Сохранить поиск»."}
                    </>
                  </Typography>
                </div>
              </div>
            ) : (
              <div className="list-in w-full">
                <SearchesTable lines={lines} />
              </div>
            )}

            <div className="w-[900px] shrink-0">
              <Typography variant="metaText" tone="dense">
                Личный поиск видите только вы. Поиск агентства виден всем сотрудникам
                и приносит новое каждому: его заводит руководитель, и снять его
                может только он.
              </Typography>
            </div>
          </>
        )}
      </CabinetPage>
    </CabinetShell>
  )
}

/** Значок сохранённого поиска в сайдбаре — тот же, что в таблице. */
export const SEARCH_ICON = ListFilter
