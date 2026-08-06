import { Link } from "@tanstack/react-router"
import { ArrowRight, Download } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { useOwnAgency, useSession } from "@/features/auth"
import { AgencyEmpty, AgencyShell, DataTable } from "@/features/agency"
import { OwnerAvatar } from "@/features/listings"

/**
 * КАБИНЕТ · Агентство → Эффективность.
 *
 * Снято с `Iebim`. Экран руководителя: куда уходят деньги агентства.
 *
 * **Первое, что он видит, — не метрика, а простой.** Алерт «12 контактов
 * раскрыто и не прозвонено дольше 48 часов, это 2 388 ₽ в простое» стоит
 * выше всех цифр. Метрики объясняют прошлое, а эта строка говорит, что можно
 * сделать сегодня, — поэтому она первая.
 *
 * **Главная цифра экрана — время, а не деньги.** «3 ч 40 мин от появления
 * объявления до первого звонка» набрана сороковым кеглем, всё остальное —
 * двадцать восьмым. В продукте, который обещает находить сделки раньше других,
 * это и есть мера качества: деньги — следствие.
 *
 * **Воронка считает стоимость, а не проценты.** «Встреча обходится в 2 084 ₽,
 * договор — в 11 807 ₽». Проценты конверсии стоят рядом, но решение
 * руководитель принимает по рублю за встречу — по нему же отсортирована
 * таблица агентов.
 *
 * Отдельной строкой — то, ради чего продукт делает похожие объекты:
 * «из блока „Похожие“ 22 раскрытия и 4 встречи: 18 % против 10 % в среднем».
 */

type FunnelStep = {
  label: string
  value: string
  /** Ширина полосы в пикселях — из файла, а не посчитана от значения. */
  bar: number
  conversion?: string
}

const FUNNEL: FunnelStep[] = [
  { label: "Раскрыто контактов", value: "178", bar: 520 },
  { label: "Дозвонов", value: "96", bar: 281, conversion: "54 % от раскрытых" },
  { label: "Встреч", value: "17", bar: 50, conversion: "18 % от дозвонов" },
  { label: "Договоров", value: "3", bar: 9, conversion: "18 % от встреч" },
]

type AgentRow = {
  id: string
  initials: string
  name: string
  note: string
  disclosed: string
  calls: string
  dialogs: string
  meetings: string
  refusals: string
  perMeeting: string
  returns: string
}

/**
 * Периоды отчёта.
 *
 * Выбор живёт на экране и переключается, но цифры не пересчитываются: они
 * замерены с макета за тридцать дней, а выручку за «сегодня» и «7 дней»
 * пришлось бы придумать. Придуманные деньги в отчёте руководителя опаснее
 * неподвижных: по ним принимают решения.
 */
const PERIODS = ["Сегодня", "7 дней", "30 дней"] as const

const AGENTS: AgentRow[] = [
  { id: "smirnova", initials: "ИС", name: "Смирнова Ирина", note: "руководитель, без лимита", disclosed: "64", calls: "41", dialogs: "12", meetings: "7", refusals: "5", perMeeting: "1 819 ₽", returns: "2" },
  { id: "lebedev", initials: "МЛ", name: "Лебедев Максим", note: "агент, дневной лимит 25", disclosed: "52", calls: "28", dialogs: "9", meetings: "5", refusals: "4", perMeeting: "2 070 ₽", returns: "1" },
  { id: "titova", initials: "АТ", name: "Титова Анна", note: "агент, дневной лимит 25", disclosed: "38", calls: "19", dialogs: "6", meetings: "4", refusals: "2", perMeeting: "1 891 ₽", returns: "3" },
  { id: "gusev", initials: "ПГ", name: "Гусев Пётр", note: "агент, дневной лимит 5", disclosed: "18", calls: "6", dialogs: "1", meetings: "1", refusals: "1", perMeeting: "3 582 ₽", returns: "2" },
]

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
  // Через `useOwnAgency`, а не по полю сеанса: только эта функция знает про
  // стенд сверки, который обязан показывать замеренные данные независимо от
  // того, кто вошёл. Прямая проверка поля оставляла стенд пустым.
  const own = useOwnAgency()

  return (
    <AgencyShell
      activeTab="efficiency"
      title="Эффективность"
      // Название агентства берётся из сеанса, а не вписано в экран: своё
      // агентство обязано называться своим именем на каждом экране, где имя
      // вообще произносится.
      note={
        own
          ? `агентство «${session?.agency ?? ""}» · 1 сотрудник`
          : "агентство «Невский проспект» · 5 сотрудников"
      }
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
          {/* Выгрузки в макете нет — ни экрана, ни файла. Действие названо
              и ничего не рисует: выдуманная плашка «файл готов» врала бы. */}
          <Button
            variant="quiet"
            size="sm"
            data-action="выгружен отчёт по эффективности без телефонов"
            iconLeft={<Download aria-hidden className="size-3.5" strokeWidth={2} />}
          >
            Выгрузить, без телефонов
          </Button>
        </div>
      }
    >
      {/* Своё агентство ещё не сделало ни одного звонка, и считать здесь
          нечего. Показать вместо этого нули по всем двадцати числам было бы
          хуже пустоты: воронка из нулей выглядит как сломанный отчёт, а не как
          «работа ещё не началась». */}
      {own ? (
        <AgencyEmpty
          title="Считать пока нечего"
          text="Отчёт собирается из звонков: сколько контактов раскрыто, за сколько минут по ним позвонили, чем кончился разговор. Первые числа появятся здесь после первого рабочего дня агентства."
          note="Воронка, стоимость встречи и таблица агентов считаются за выбранный период и обновляются сами."
        />
      ) : (
        <>
      {/* Простой стоит выше метрик: он говорит, что делать сегодня. */}
      <div className="flex w-full shrink-0 items-center gap-2.5 rounded-lg bg-warm px-4 py-3">
        <Typography variant="panelTitle" tone="default">
          12
        </Typography>
        <Typography variant="uiText" tone="default">
          контактов раскрыто и не прозвонено дольше 48 часов, это 2 388 ₽ в простое
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

      <div className="flex w-full shrink-0 items-center gap-6">
        <div className="w-105 shrink-0">
          <KeyNumber
            big
            value="3 ч 40 мин"
            label="среднее время от появления объявления до первого звонка"
          />
        </div>
        <span aria-hidden className="h-14 w-px shrink-0 bg-line-2" />
        <KeyNumber value="597 ₽" label="потрачено сегодня" aside="за 30 дней 35 422 ₽" />
        <KeyNumber value="3" label="раскрыто сегодня" aside="за 30 дней 178" />
        <span aria-hidden className="h-14 w-px shrink-0 bg-line-2" />
        <KeyNumber value="9 / 1 791 ₽" label="возвращено за 30 дней" aside="5 % раскрытий" />
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2">
        <div className="flex w-full items-center gap-2">
          <Typography variant="columnHeader" tone="dense">
            ВОРОНКА ЗА 30 ДНЕЙ
          </Typography>
          <Typography variant="columnHeader" tone="default">
            35 422 ₽ ПОТРАЧЕНО
          </Typography>
        </div>

        {FUNNEL.map((step) => (
          <div key={step.label} className="flex h-7.5 w-full items-center gap-3">
            <div className="w-42 shrink-0">
              <Typography variant="denseText" tone="secondary">
                {step.label}
              </Typography>
            </div>
            <div className="flex w-12 shrink-0 justify-end">
              <Typography variant="controlLabel" tone="default">
                {step.value}
              </Typography>
            </div>
            <span
              aria-hidden
              data-slot="funnel-bar"
              className="h-2.5 shrink-0 rounded-sm bg-fg"
              style={{ width: `${step.bar}px` }}
            />
            {step.conversion === undefined ? null : (
              <Typography variant="metaText" tone="dense">
                {step.conversion}
              </Typography>
            )}
          </div>
        ))}

        <Typography variant="metaText" tone="secondary">
          Встреча обходится в 2 084 ₽, договор — в 11 807 ₽
        </Typography>
        <Typography variant="metaText" tone="dense">
          Из блока «Похожие» — 22 раскрытия и 4 встречи: 18 % против 10 % в среднем
        </Typography>
      </div>

      <div className="flex w-full shrink-0 items-center gap-2">
        <Typography variant="columnHeader" tone="dense">
          АГЕНТЫ
        </Typography>
        <Typography variant="columnHeader" tone="default">
          СОРТИРОВКА ПО ₽ ЗА ВСТРЕЧУ
        </Typography>
      </div>

      <DataTable
        columns={[
          { head: "АГЕНТ" },
          { head: "РАСКРЫТО", width: "w-27.5", numeric: true },
          { head: "ДОЗВОНОВ", width: "w-27.5", numeric: true },
          { head: "ДИАЛОГОВ", width: "w-27.5", numeric: true },
          { head: "ВСТРЕЧ", width: "w-25", numeric: true },
          { head: "ОТКАЗОВ", width: "w-27.5", numeric: true },
          { head: "₽ / ВСТРЕЧА ↓", width: "w-col-144", numeric: true, sorted: true },
          { head: "ВОЗВРАТОВ", width: "w-27.5", numeric: true },
        ]}
        rows={AGENTS.map((agent) => ({
          id: agent.id,
          cells: [
            // Имя агента ведёт в его карточку: из отчёта руководитель идёт
            // ставить лимит, а не выписывать фамилию на бумажку.
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
            <Typography key="d" variant="denseText" tone="default">{agent.disclosed}</Typography>,
            <Typography key="c" variant="denseText" tone="default">{agent.calls}</Typography>,
            <Typography key="g" variant="denseText" tone="default">{agent.dialogs}</Typography>,
            <Typography key="m" variant="denseText" tone="default">{agent.meetings}</Typography>,
            <Typography key="r" variant="denseText" tone="default">{agent.refusals}</Typography>,
            <Typography key="p" variant="numericDense" tone="default">{agent.perMeeting}</Typography>,
            <Typography key="v" variant="denseText" tone="default">{agent.returns}</Typography>,
          ],
        }))}
      />
        </>
      )}
    </AgencyShell>
  )
}
