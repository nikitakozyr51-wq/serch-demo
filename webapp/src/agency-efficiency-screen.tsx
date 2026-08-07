import { Link } from "@tanstack/react-router"
import { ArrowRight, Download } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import {
  csv,
  download,
  fileName,
  funnel,
  paidDisclosures,
  startOfToday,
  takenNotCalled,
  useNow,
  useWorkspace,
} from "@/features/workspace"
import { AgencyEmpty, AgencyShell, DataTable } from "@/features/agency"
import { groupDigits, OwnerAvatar, plural } from "@/features/listings"

/**
 * КАБИНЕТ · Агентство → Эффективность.
 *
 * Снято с `Iebim`. Экран руководителя: куда уходят деньги агентства.
 *
 * **Первое, что он видит, — не метрика, а простой.** Строка «раскрыто и не
 * прозвонено дольше 48 часов, это N ₽ в простое» стоит выше всех цифр.
 * Метрики объясняют прошлое, а эта строка говорит, что можно сделать сегодня, —
 * поэтому она первая. Считается она на текущий момент, а не за выбранный
 * период: эти деньги висят сейчас, сколько бы дней назад за них ни заплатили.
 *
 * **Главная цифра экрана — время, а не деньги.** В продукте, который обещает
 * находить сделки раньше других, время и есть мера качества: деньги —
 * следствие. В макете цифра называлась «от появления объявления до первого
 * звонка». Времени появления объявления продукт нигде не хранит, поэтому
 * измеряется то, что записано журналом: от раскрытия контакта до первого
 * звонка по нему. Дорисовать недостающую метку времени значило бы соврать
 * в самой крупной цифре экрана.
 *
 * **Воронка считает стоимость шага, а не проценты.** Строки «Встреч»,
 * «Договоров» и «Встреча обходится в 2 084 ₽» ушли вместе с макетными
 * числами: исходов «встреча» и «договор» в продукте нет — панель звонка их
 * не записывает (см. `funnel` в `derive.ts`). Воронка на них была бы вечными
 * нулями. Остаётся то, что журнал действительно помнит: раскрытия, дозвоны,
 * отказы, посредники — и рубль за дозвон.
 *
 * Строки «из блока „Похожие“ — 22 раскрытия и 4 встречи» больше нет: журнал
 * не помнит, из какого блока пришло раскрытие, и посчитать это нечем.
 *
 * Всё показанное считается из журналов агентства за выбранный период — и ровно
 * те же числа уходят в выгрузку.
 */

/** Сутки в миллисекундах: период отчёта считается в них. */
const DAY = 24 * 60 * 60 * 1000

type FunnelStep = {
  label: string
  value: number
  /** Конверсия ставится только там, где шаг действительно вложен в предыдущий. */
  conversion?: string
}

/**
 * Периоды отчёта.
 *
 * Раньше выбор переключался, но ничего не менял: числа были замерены с макета
 * за тридцать дней, и пересчитывать их было не из чего. Теперь есть из чего —
 * журналы, — и период по-настоящему задаёт окно расчёта.
 */
const PERIODS = ["Сегодня", "7 дней", "30 дней"] as const

/**
 * Длина периода в сутках.
 *
 * «Сегодня» — это доля суток, прошедшая с полуночи, а не последние 24 часа:
 * руководитель спрашивает про рабочий день, а не про скользящее окно.
 */
function periodDays(period: string, now: number): number {
  if (period === "7 дней") return 7
  if (period === "30 дней") return 30
  return (now - startOfToday(now)) / DAY
}

/** «3 ч 40 мин» — длительность главной цифры экрана. */
function duration(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} мин`
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`
}

/** Ключевая цифра: значение, что это и справка за период. */
function KeyNumber({
  value,
  label,
  aside,
  big = false,
}: {
  value: string
  label: string
  aside?: string
  big?: boolean
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <Typography variant={big ? "display" : "cardPrice"} tone="default">
        {value}
      </Typography>
      <Typography variant="denseText" tone={big ? "dense" : "secondary"}>
        {label}
      </Typography>
      {aside === undefined ? null : (
        <Typography variant="metaText" tone="dense">
          {aside}
        </Typography>
      )}
    </div>
  )
}

export function AgencyEfficiencyPage() {
  const [period, setPeriod] = useState<string>("30 дней")
  const session = useSession()
  const workspace = useWorkspace()
  const now = useNow()

  // Одно окно на весь экран и на выгрузку. `from` считается тем же выражением,
  // что внутри `funnel`, — иначе таблица агентов и воронка разъехались бы
  // на границе периода, и разъехались бы молча.
  const days = periodDays(period, now)
  const from = now - days * DAY
  const f = funnel(workspace, now, days)

  const periodLabel = period === "Сегодня" ? "сегодня" : `за ${period}`
  const periodCalls = workspace.calls.filter((item) => item.at >= from)
  const refunds = workspace.refunds.filter((item) => item.at >= from)
  const refunded = refunds.reduce((sum, item) => sum + item.amount, 0)

  // Простой: за контакт заплачено, а звонка по нему нет ни одного дольше двух
  // суток. Возвращённые в сумму не идут — эти деньги уже вернулись на счёт.
  const idle = takenNotCalled(workspace).filter((item) => now - item.at >= 2 * DAY)
  const idleMoney = idle
    .filter((item) => !item.refunded)
    .reduce((sum, item) => sum + item.amount, 0)

  /**
   * Сколько проходит от раскрытия контакта до первого звонка по нему.
   *
   * Считается только по раскрытиям, где звонок уже был: незвонённые сидят
   * выше, в строке простоя, и подмешивать их сюда значило бы усреднять
   * «ещё не случилось» с «случилось» — среднее поехало бы вверх само собой.
   */
  const waits = workspace.disclosures
    .filter((item) => item.at >= from)
    .map((item) => {
      const answered = workspace.calls
        .filter((call) => call.address === item.address && call.at >= item.at)
        .map((call) => call.at)
      return answered.length === 0 ? null : Math.min(...answered) - item.at
    })
    .filter((value): value is number => value !== null)

  const averageWait =
    waits.length === 0 ? null : waits.reduce((sum, value) => sum + value, 0) / waits.length

  const steps: FunnelStep[] = [
    { label: "Раскрыто контактов", value: f.disclosed },
    {
      label: "Дозвонов",
      value: f.reached,
      conversion:
        f.disclosed === 0
          ? undefined
          : `${Math.round((f.reached / f.disclosed) * 100)} % от раскрытых`,
    },
    { label: "Отказов", value: f.refused },
    { label: "Оказались посредниками", value: f.brokers },
  ]

  // Ширина 520 снята с файла и осталась максимумом воронки, но пропорция
  // теперь считается от значения, а не замерена: полосы, нарисованные по
  // макету, при живых числах врали бы длиной. Минимум два пикселя — иначе
  // единственный дозвон при сотне раскрытий рисуется в ноль и читается
  // как «дозвонов не было».
  const top = Math.max(...steps.map((step) => step.value))
  const barWidth = (value: number) =>
    top === 0 || value === 0 ? 0 : Math.max(2, Math.round((520 * value) / top))

  const paid = paidDisclosures(workspace).filter((item) => item.at >= from)

  /**
   * Строки таблицы берутся из состава агентства, а не из журнала.
   *
   * Человек, который за период не сделал ничего, обязан стоять в таблице
   * с нулями: журнал показал бы только работавших, и простаивающий агент
   * просто исчез бы из отчёта — ровно тот, ради кого отчёт открывают.
   */
  const agents = workspace.people
    .map((person) => {
      const calls = periodCalls.filter((item) => item.by === person.name)
      return {
        id: person.id,
        initials: person.initials,
        name: person.name,
        note:
          person.role === "owner"
            ? "руководитель, без лимита"
            : person.limit === null
              ? "агент, без лимита"
              : `агент, дневной лимит ${person.limit}`,
        disclosed: workspace.disclosures.filter(
          (item) => item.by === person.name && item.at >= from,
        ).length,
        calls: calls.length,
        reached: calls.filter((item) => item.outcome === "дозвонился").length,
        refused: calls.filter((item) => item.outcome === "отказ").length,
        spent: paid
          .filter((item) => item.by === person.name)
          .reduce((sum, item) => sum + item.amount, 0),
        returns: refunds.filter((item) => item.by === person.name).length,
      }
    })
    // Сортировка по потраченному: руководитель начинает разбор с того, у кого
    // ушло больше всего денег агентства. «₽ за встречу» из макета считать не
    // из чего — встреч продукт не записывает.
    .sort((a, b) => b.spent - a.spent)

  const started = workspace.disclosures.length > 0 || workspace.calls.length > 0
  const nothing = f.disclosed === 0 && periodCalls.length === 0

  /**
   * Отчёт руководителя файлом: та же воронка и тот же период, что на экране.
   * Собирается из журналов, поэтому в нём ровно то, что видно глазами.
   */
  const exportReport = () => {
    const slug = period === "Сегодня" ? "сегодня" : period.replace(" ", "-")
    download(
      fileName(`эффективность-${slug}`, now),
      csv(
        ["Показатель", "Значение"],
        [
          ["Период", periodLabel],
          ["Раскрыто контактов", f.disclosed],
          ["Дозвонов", f.reached],
          ["Отказов", f.refused],
          ["Оказались посредниками", f.brokers],
          ["Потрачено, ₽", f.spent],
        ],
      ),
    )
  }

  return (
    <AgencyShell
      activeTab="efficiency"
      title="Эффективность"
      // Название агентства берётся из сеанса, а число людей — из состава
      // агентства: своё агентство обязано называться своим именем и считать
      // своих людей на каждом экране, где о них вообще заходит речь.
      note={`агентство «${session?.agency ?? ""}» · ${workspace.people.length} ${plural(
        workspace.people.length,
        "сотрудник",
        "сотрудника",
        "сотрудников",
      )}`}
      action={
        <div className="flex items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Период отчёта"
            className="flex items-center gap-1.5"
          >
            {PERIODS.map((label) => (
              <SelectChip
                key={label}
                label={label}
                selected={label === period}
                onClick={() => setPeriod(label)}
              />
            ))}
          </div>
          {/* Файл отдаётся сразу, а плашки «файл готов» нет: браузер сам
              показывает загрузку, и вторая нарисованная нами плашка врала бы
              о том, чего продукт не делает. */}
          <Button
            variant="quiet"
            size="sm"
            onClick={exportReport}
            iconLeft={<Download aria-hidden className="size-3.5" strokeWidth={2} />}
          >
            Выгрузить, без телефонов
          </Button>
        </div>
      }
    >
      {/* Простой стоит выше метрик: он говорит, что делать сегодня. Строки нет,
          когда подвисших контактов нет, — пустая тревога хуже отсутствующей. */}
      {idle.length === 0 ? null : (
        <div className="flex w-full shrink-0 items-center gap-2.5 rounded-lg bg-warm px-4 py-3">
          <Typography variant="panelTitle" tone="default">
            {String(idle.length)}
          </Typography>
          <Typography variant="uiText" tone="default">
            {`раскрыто и не прозвонено дольше 48 часов, это ${groupDigits(idleMoney)} ₽ в простое`}
          </Typography>
          <div className="h-px flex-1" />
          {/* Список подвисших контактов живёт на «Сегодня» — там средняя секция
              и есть «взято в работу и не прозвонено». Ссылка, а не кнопка:
              руководитель открывает её в соседней вкладке, не теряя отчёт. */}
          <Link
            to="/today"
            className="flex shrink-0 cursor-pointer items-center gap-1.5 bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="numericDense" tone="default">
              Показать список
            </Typography>
            <ArrowRight aria-hidden className="size-3.5 text-fg" strokeWidth={2} />
          </Link>
        </div>
      )}

      {/* Считать нечего — показывается пустое состояние, а не двадцать нулей.
          Воронка из нулей выглядит как сломанный отчёт, а не как «работа ещё
          не началась», и заголовок честно различает два разных «пусто»:
          агентство не начинало работать вовсе или не работало в этот период. */}
      {nothing ? (
        <AgencyEmpty
          title={
            started
              ? period === "Сегодня"
                ? "Сегодня ещё ничего не сделано"
                : `За ${period} ничего не сделано`
              : "Считать пока нечего"
          }
          text={
            started
              ? "Отчёт считается за выбранный период, а в нём нет ни раскрытий, ни звонков. Переключите период сверху, чтобы увидеть более раннюю работу агентства."
              : "Отчёт собирается из звонков: сколько контактов раскрыто, за сколько времени по ним позвонили, чем кончился разговор. Первые числа появятся здесь после первого рабочего дня агентства."
          }
          note="Воронка, стоимость дозвона и таблица агентов считаются за выбранный период и обновляются сами."
        />
      ) : (
        <>
          <div className="flex w-full shrink-0 items-center gap-6">
            <div className="w-105 shrink-0">
              {/* Прочерк, а не ноль: «0 ч 0 мин до первого звонка» читается как
                  мгновенная работа, хотя означает, что звонков ещё не было. */}
              <KeyNumber
                big
                value={averageWait === null ? "—" : duration(averageWait)}
                label="среднее время от раскрытия контакта до первого звонка"
              />
            </div>
            <span aria-hidden className="h-14 w-px shrink-0 bg-line-2" />
            <KeyNumber value={`${groupDigits(f.spent)} ₽`} label={`потрачено ${periodLabel}`} />
            <KeyNumber value={String(f.disclosed)} label={`раскрыто ${periodLabel}`} />
            <span aria-hidden className="h-14 w-px shrink-0 bg-line-2" />
            <KeyNumber
              value={`${refunds.length} / ${groupDigits(refunded)} ₽`}
              label={`возвращено ${periodLabel}`}
              aside={
                f.disclosed === 0
                  ? undefined
                  : `${Math.round((refunds.length / f.disclosed) * 100)} % раскрытий`
              }
            />
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2">
            <div className="flex w-full items-center gap-2">
              <Typography variant="columnHeader" tone="dense">
                {`Воронка ${periodLabel}`}
              </Typography>
              <Typography variant="columnHeader" tone="default">
                {`${groupDigits(f.spent)} ₽ потрачено`}
              </Typography>
            </div>

            {steps.map((step) => (
              <div key={step.label} className="flex h-7.5 w-full items-center gap-3">
                <div className="w-42 shrink-0">
                  <Typography variant="denseText" tone="secondary">
                    {step.label}
                  </Typography>
                </div>
                <div className="flex w-12 shrink-0 justify-end">
                  <Typography variant="controlLabel" tone="default">
                    {String(step.value)}
                  </Typography>
                </div>
                <span
                  aria-hidden
                  data-slot="funnel-bar"
                  className="h-2.5 shrink-0 rounded-sm bg-fg"
                  style={{ width: `${barWidth(step.value)}px` }}
                />
                {step.conversion === undefined ? null : (
                  <Typography variant="metaText" tone="dense">
                    {step.conversion}
                  </Typography>
                )}
              </div>
            ))}

            {f.reached === 0 ? null : (
              <Typography variant="metaText" tone="secondary">
                {`Дозвон обходится в ${groupDigits(Math.round(f.spent / f.reached))} ₽`}
              </Typography>
            )}
          </div>

          {/* Таблицы нет, пока в агентстве некого показывать: шапка колонок над
              пустотой выглядит как потерянные данные. */}
          {agents.length === 0 ? null : (
            <>
              <div className="flex w-full shrink-0 items-center gap-2">
                <Typography variant="columnHeader" tone="dense">
                  АГЕНТЫ
                </Typography>
                <Typography variant="columnHeader" tone="default">
                  СОРТИРОВКА ПО ПОТРАЧЕННОМУ
                </Typography>
              </div>

              <DataTable
                columns={[
                  { head: "АГЕНТ" },
                  { head: "РАСКРЫТО", width: "w-27.5", numeric: true },
                  { head: "ЗВОНКОВ", width: "w-27.5", numeric: true },
                  { head: "ДОЗВОНОВ", width: "w-27.5", numeric: true },
                  { head: "ОТКАЗОВ", width: "w-27.5", numeric: true },
                  { head: "ПОТРАЧЕНО ↓", width: "w-col-144", numeric: true, sorted: true },
                  { head: "ВОЗВРАТОВ", width: "w-27.5", numeric: true },
                ]}
                rows={agents.map((agent) => ({
                  id: agent.id,
                  cells: [
                    // Имя агента ведёт в его карточку: из отчёта руководитель
                    // идёт ставить лимит, а не выписывать фамилию на бумажку.
                    <Link
                      key="who"
                      to="/agency/staff/person"
                      className="flex min-w-0 cursor-pointer items-center gap-2.5 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                    >
                      <OwnerAvatar initials={agent.initials} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <Typography variant="numericDense" tone="default">
                          {agent.name}
                        </Typography>
                        <Typography variant="metaText" tone="dense">
                          {agent.note}
                        </Typography>
                      </div>
                    </Link>,
                    <Typography key="d" variant="denseText" tone="default">{String(agent.disclosed)}</Typography>,
                    <Typography key="c" variant="denseText" tone="default">{String(agent.calls)}</Typography>,
                    <Typography key="g" variant="denseText" tone="default">{String(agent.reached)}</Typography>,
                    <Typography key="r" variant="denseText" tone="default">{String(agent.refused)}</Typography>,
                    <Typography key="p" variant="numericDense" tone="default">{`${groupDigits(agent.spent)} ₽`}</Typography>,
                    <Typography key="v" variant="denseText" tone="default">{String(agent.returns)}</Typography>,
                  ],
                }))}
              />
            </>
          )}
        </>
      )}
    </AgencyShell>
  )
}
