import { ListFilter } from "lucide-react"
import type { ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { AgencyEmpty } from "@/features/agency"
import { ALL_ROWS } from "@/data/search-rows"
import { useOwnAgency } from "@/features/auth"
import {
  callbacksDue,
  disclosureOf,
  formatDay,
  lastCall,
  takenNotCalled,
  todayTally,
  useNow,
  useWorkspace,
} from "@/features/workspace"
import { CabinetPage, CabinetShell } from "@/features/cabinet"
import { CountPair, MarketDeviation } from "@/features/listings"
import { cn } from "@/lib/utils"

/**
 * КАБИНЕТ · Сегодня.
 *
 * Снято с `kNd9b`: экран 1440 × 1024, контент 1200 с полями 24 и зазором 24,
 * три секции по 1152 в белых панелях с радиусом 16, строки по 88.
 *
 * **Это рабочий день агента, а не сводка.** Экран отвечает на вопрос «с чего
 * начать» и упорядочен по срочности, а не по красоте: сперва перезвоны
 * с назначенным временем, потом объекты, взятые в работу и так и не прозвоненные,
 * и только потом новое по сохранённым поискам.
 *
 * **Средняя секция — про деньги агентства.** «2 дня без звонка · контакт
 * раскрыт, 199 ₽» цветом внимания: за этот контакт уже заплачено, а звонка
 * не было. Это единственное место продукта, где мы говорим сотруднику, что он
 * подвесил чужие деньги, — и потому оно на главном экране, а не в отчёте.
 *
 * Строка дня наверху считает сделанное: 18 звонков, 3 диалога, 1 встреча,
 * 1 раскрытие на 199 ₽. Не показатели эффективности, а память о прошедшем дне.
 *
 * **Каждое действие экрана открывает собранный экран, а не заглушку.**
 * «Прозвон» — режим прозвона, «Позвонить» — карточку с раскрытым контактом,
 * где лежат номер и фиксация результата, «Открыть выдачу» — выдачу.
 *
 * Переходы сделаны переходом маршрутизатора, а не ссылкой, и это плата
 * за единый вид кнопки: кнопка продукта закрыта и своим тегом не поступается,
 * поэтому действие нельзя открыть в новой вкладке. Возврат браузером назад
 * при этом работает.
 *
 * Ведут они на общие экраны, а не на «свой» объект и «свой» поиск: адресов
 * у отдельного объекта и отдельного сохранённого поиска в продукте ещё нет.
 * Показать вместо этого выдуманную карточку значило бы соврать зрителю
 * о том, что в системе уже есть.
 */

/** Метка секции: подпись капслоком и счётчик графитом через 8. */
function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex h-4 w-full items-center gap-2">
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <Typography variant="columnHeader" tone="default">
        {String(count)}
      </Typography>
    </div>
  )
}

/** Секция: метка и белая панель со строками. */
function Section({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  return (
    <section data-slot="today-section" className="flex w-full flex-col gap-4">
      <SectionLabel label={label} count={count} />
      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-surface">{children}</div>
    </section>
  )
}

type CallRow = {
  id: string
  address: string
  price: string
  deviation: number
  /** Что известно: кто раскрыл, кто договорился, что сказал собственник. */
  note: string
  /** Когда перезвонить или сколько объект висит без звонка. */
  when: string
  /** Пояснение под сроком: «через 40 минут», «контакт раскрыт, 199 ₽». */
  whenNote: string
  /** Срок покрашен цветом внимания: за контакт заплачено, а звонка нет. */
  overdue?: boolean
  /** Звонить нельзя: собственник в реестре отказов. Строка тёплая. */
  blocked?: boolean
  action: string
}

/**
 * Строка дня: 88 с полями [0, 16] и зазором 16. Три блока — что известно,
 * когда и действие 116 × 32.
 *
 * Заблокированная строка отличается тёплой подложкой и рамочной плашкой
 * вместо кнопки: тот же язык, что в выдаче, — слот занят сообщением о том,
 * почему действия нет.
 */
function CallRowView({ row, last }: { row: CallRow; last: boolean }) {
  const navigate = useNavigate()

  return (
    <div
      data-slot="today-row"
      data-blocked={row.blocked || undefined}
      className={cn(
        "flex h-row-obj w-full items-center gap-4 px-4",
        !last && "border-b border-line-2",
        row.blocked ? "bg-warm" : "bg-surface",
      )}
    >
      {/* Миниатюра 48 слева: строка дня начинается с объекта, а не с текста.
          Без неё вся сетка съезжала влево на 64 против макета. */}
      <div
        aria-hidden
        data-slot="today-thumb"
        className="size-12 shrink-0 rounded-md bg-warm"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Адрес 264 и цена 104 — обе колонки закреплены и выключены влево:
            цены читаются столбиком по левому краю, как в файле. */}
        <div className="flex w-full items-center gap-2.5">
          <div className="w-66 shrink-0">
            <Typography variant="rowPrice" tone="default">
              {row.address}
            </Typography>
          </div>
          <div className="w-26 shrink-0">
            <Typography variant="rowPrice" tone="default">
              {row.price}
            </Typography>
          </div>
          <div className="w-16 shrink-0">
            <MarketDeviation percent={row.deviation} />
          </div>
        </div>
        <Typography variant="denseText" tone="dense">
          {row.note}
        </Typography>
      </div>

      <div className="flex w-44 shrink-0 flex-col gap-1">
        <Typography
          variant="numericDense"
          tone={row.overdue ? "warn" : row.blocked ? "secondary" : "default"}
        >
          {row.when}
        </Typography>
        <Typography variant="metaText" tone="dense">
          {row.whenNote}
        </Typography>
      </div>

      {row.blocked ? (
        <div className="flex h-ctl-sm w-29 shrink-0 items-center justify-center rounded-md border border-border-control bg-warm px-4">
          <Typography variant="controlLabel" tone="secondary">
            {row.action}
          </Typography>
        </div>
      ) : (
        <div className="w-29 shrink-0">
          {/* Контакт по этим объектам уже куплен, поэтому «Позвонить» ведёт
              не на карточку-витрину, а на ту, где есть номер и куда
              записывают, чем кончился разговор. */}
          <Button
            variant="primary"
            size="sm"
            block
            onClick={() => void navigate({ to: "/object/disclosed", search: { at: row.address } })}
          >
            {row.action}
          </Button>
        </div>
      )}
    </div>
  )
}



const FRESH = [
  { id: "s1", label: "Красногвардейский 2-к до 15", note: "12 новых · последнее 14 минут назад" },
  { id: "s3", label: "Снизили цену за 3 дня", note: "5 новых · последнее 1 час назад" },
  { id: "s2", label: "Комнаты Центральный", note: "3 новых · последнее 3 часа назад" },
]

export function TodayScreenPage() {
  const navigate = useNavigate()
  // Первый экран после регистрации. Именно он создавал впечатление «зашёл
  // в чужое готовое агентство»: восемнадцать звонков, четыре перезвона
  // и три сохранённых поиска у агентства, которому пять минут от роду.
  const own = useOwnAgency()
  const workspace = useWorkspace()
  const now = useNow()

  /**
   * «Сегодня» собирается из журналов, а не стоит константой.
   *
   * Секции ровно те, что нарисованы: перезвонить сегодня — из назначенных
   * напоминаний; взяты в работу и не прозвонены — раскрытые контакты, по
   * которым нет ни одного звонка. Обе строятся сами, поэтому завтра экран
   * покажет вчерашнюю работу, а не одно и то же навсегда.
   */
  const rowsFor = (addresses: string[], noteOf: (address: string) => string): CallRow[] =>
    addresses.map((address) => {
      const listing = ALL_ROWS.find((item) => item.address === address)
      const stopped = workspace.stopList.includes(address)
      return {
        id: address,
        address,
        price: listing?.price ?? "",
        deviation: listing?.deviation ?? 0,
        note: noteOf(address),
        when: stopped ? "Звонок запрещён" : "Сегодня",
        whenNote: stopped ? "снять отметку нельзя" : "",
        blocked: stopped,
        // Просрочен — время перезвона прошло. Подпись уходит в тон внимания:
        // это не ошибка, но и не «всё по плану», и разница видна без чтения.
        overdue: overdue.has(address) && !stopped,
        action: stopped ? "Стоп-лист" : "Позвонить",
      }
    })

  const overdue = new Set(
    callbacksDue(workspace, now)
      .filter((item) => (item.remindAt ?? 0) < now)
      .map((item) => item.address),
  )

  const callbacks = rowsFor(
    callbacksDue(workspace, now).map((item) => item.address),
    (address) => {
      const call = lastCall(workspace, address)
      return call ? `${call.outcome}${call.note ? ` · ${call.note}` : ""}` : "перезвон назначен"
    },
  )

  const taken = rowsFor(
    takenNotCalled(workspace).map((item) => item.address),
    (address) => {
      const paid = disclosureOf(workspace, address)
      return paid
        ? `контакт раскрыт ${formatDay(paid.at, now)}, звонка ещё не было`
        : "контакт раскрыт, звонка ещё не было"
    },
  )

  const tally = todayTally(workspace, now)
  const nothing = callbacks.length === 0 && taken.length === 0

  return (
    <CabinetShell activeId="today">
      <CabinetPage>
        <div className="flex w-full flex-col gap-4">
          <div className="flex h-8 w-full items-center gap-3">
            <div className="flex items-baseline gap-2.5">
              <Typography variant="panelTitle" tone="default" as="h1">
                Сегодня
              </Typography>
              <Typography variant="denseText" tone="dense">
                пятница, 24 июля
              </Typography>
            </div>
            <div className="h-px flex-1" />
            {/*
              «Прозвон» — второй способ прожить этот же список: не выбирать
              строку глазами, а идти подряд без возврата сюда. Режим собран
              и открывается по-настоящему; замечание владельца в макете
              касается состава карточки внутри и на дверь не влияет.
            */}
            {/* Прозвон — это проход по списку контактов подряд. Списка ещё
                нет, поэтому кнопка выключена, а не ведёт в пустой режим:
                выключенная кнопка объясняет состояние, пустой экран за ней —
                нет. */}
            <Button
              variant="primary"
              size="sm"
              disabled={own}
              onClick={() => void navigate({ to: "/call" })}
            >
              Прозвон
            </Button>
          </div>

          {/* Счёт дня: сделанное, а не показатели эффективности. */}
          <div className="flex h-6 w-full items-center gap-6">
            <CountPair value={String(tally.calls)} label="звонков" large />
            <CountPair value={String(tally.dialogs)} label="диалогов" large />
            <CountPair value={String(tally.disclosures)} label="раскрытий" large />
            <CountPair value={`${tally.spent} ₽`} label="потрачено" large />
          </div>
        </div>

        {nothing ? (
          <AgencyEmpty
            title="Смена не начата"
            text="«Сегодня» собирается сам из работы агентства: сюда попадают перезвоны, назначенные в панели звонка, контакты, взятые в работу и ещё не прозвоненные, и находки по сохранённым поискам. Начните с выдачи — задайте район и цену, и первые строки появятся здесь."
            action={
              <Button variant="primary" size="md" onClick={() => void navigate({ to: "/search" })}>
                Открыть выдачу
              </Button>
            }
            note="Сохранённый поиск сам приносит сюда новые объекты: их не нужно искать заново каждое утро."
          />
        ) : (
          <>
        {callbacks.length === 0 ? null : (
          <Section label="ПЕРЕЗВОНИТЬ СЕГОДНЯ" count={callbacks.length}>
            {callbacks.map((row, index) => (
              <CallRowView key={row.id} row={row} last={index === callbacks.length - 1} />
            ))}
          </Section>
        )}

        {taken.length === 0 ? null : (
          <Section label="ВЗЯТЫ В РАБОТУ, НЕ ПРОЗВОНЕНЫ" count={taken.length}>
            {taken.map((row, index) => (
              <CallRowView key={row.id} row={row} last={index === taken.length - 1} />
            ))}
          </Section>
        )}

        {workspace.savedSearches.length === 0 ? null : (
        <Section label="НОВОЕ ПО МОИМ ПОИСКАМ" count={workspace.savedSearches.length}>
          {FRESH.map((item, index) => (
            <div
              key={item.id}
              data-slot="today-search"
              className={cn(
                "flex h-14 w-full items-center gap-3 px-4",
                index < FRESH.length - 1 && "border-b border-line-2",
              )}
            >
              {/* Название и мета стоят в одну строку рядом, а не столбиком:
                  это перечень поисков, и каждая занимает одну строку. */}
              <ListFilter aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
              <div className="w-48 shrink-0">
                <Typography variant="controlLabel" tone="default">
                  {item.label}
                </Typography>
              </div>
              <div className="min-w-0 flex-1">
                <Typography variant="denseText" tone="dense">
                  {item.note}
                </Typography>
              </div>
              {/* Смысл строки — «пришло новое, посмотри». Кнопка ровно туда
                  и ведёт: в выдачу, где эти находки лежат списком. */}
              <Button
                variant="quiet"
                size="sm"
                onClick={() => void navigate({ to: "/search" })}
              >
                Открыть выдачу
              </Button>
            </div>
          ))}
        </Section>
        )}
          </>
        )}
      </CabinetPage>
    </CabinetShell>
  )
}
