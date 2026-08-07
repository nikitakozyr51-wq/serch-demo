import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { AgencyChip, AgencyEmpty, DataTable, NoticeBar } from "@/features/agency"
import { useSession, useSessionActions } from "@/features/auth"
import { CabinetPage, CabinetShell } from "@/features/cabinet"
import { FillBar, groupDigits, plural } from "@/features/listings"
import {
  accountingDocument,
  disclosedSince,
  download,
  fileName,
  formatMoment,
  spentLast30Days,
  subjectiveRefunds,
  useNow,
  useWorkspace,
  type Workspace,
} from "@/features/workspace"
import { cn } from "@/lib/utils"

/** Раскрытие стоит 199 ₽ — цена продукта, а не число экрана. */
const DISCLOSURE_PRICE = 199

/** Доступ агентства — 3 000 ₽ в месяц. Вторая и последняя цена продукта. */
const SUBSCRIPTION_PRICE = 3000

/** Тридцать дней в миллисекундах: окно, за которое считаются деньги в шапке. */
const MONTH = 30 * 24 * 60 * 60 * 1000

/** «хватит на 43 раскрытия» — рубли переводятся в работу отдела. */
function disclosuresFor(amount: number) {
  const count = Math.floor(amount / DISCLOSURE_PRICE)
  return `${count} ${plural(count, "раскрытие", "раскрытия", "раскрытий")}`
}

/**
 * БАЛАНС · три вкладки на одном каркасе.
 *
 * Снято с `w0qrBv` (списания), `NanKI` (возвраты), `ruMMX` (пополнения).
 *
 * **Деньги показаны движением, а не остатком.** В каждой строке списания есть
 * колонка «остаток» — сколько было на счету после этой операции. Одно число
 * «у вас столько-то рублей» не отвечает на вопрос «куда ушло», а таблица
 * с остатком отвечает: её можно читать снизу вверх как выписку.
 *
 * **«Чем кончилось» — не техническое поле, а смысл строки.** Рядом с каждым
 * списанием стоит, что из него вышло: контакт раскрыт, оказался посредник и
 * деньги вернули, раскрытие ушло из пробного пакета. Без этой колонки таблица
 * говорила бы только про деньги, а руководитель смотрит её, чтобы понять,
 * за что заплатили.
 *
 * **Все числа раздела считаются из журналов агентства.** Ни одно не вписано:
 * вписанное число не меняется от работы и первым выдаёт, что кабинет
 * нарисован.
 */

type BalanceTab = {
  id: string
  label: string
  count: number
  /**
   * Адрес вкладки. Списания и возвраты — разные страницы, по ним ходят
   * ссылкой: её можно открыть в новой вкладке, послать бухгалтеру и вернуться
   * назад кнопкой браузера. Вкладка без адреса переключает состояние экрана.
   */
  to?: string
  /** Действие, экрана для которого в макете нет: названо и ничего не рисует. */
  action?: string
}

/**
 * Полоса вкладок со счётчиками своей работы.
 *
 * Числа считаются из журналов, а не вписаны. Вписанные 178, 9 и 4 принадлежали
 * чужому агентству и не менялись ни от одного раскрытия, ни от одного возврата:
 * счётчик, который никогда не двигается, — это рисунок счётчика.
 */
function balanceTabs(workspace: Workspace): BalanceTab[] {
  return [
    { id: "charges", label: "Списания", count: workspace.disclosures.length, to: "/balance" },
    { id: "refunds", label: "Возвраты", count: workspace.refunds.length, to: "/balance/refunds" },
    // Экран пополнений в макете есть (`ruMMX`), в продукте его пока нет.
    // Вкладка поэтому названа действием, а не ведёт на выдуманный адрес.
    {
      id: "topups",
      label: "Пополнения",
      count: workspace.topUps.length,
      action: "открыть список пополнений",
    },
  ]
}

/**
 * Ряд ключевых цифр над вкладками.
 *
 * Остаток идёт сороковым кеглем и фиксированной шириной 300, остальные три —
 * двадцать восьмым и поровну. Это не «главная метрика крупнее для красоты»:
 * остаток — единственное число, от которого зависит, сможет ли агент нажать
 * кнопку раскрытия через минуту. Остальные три объясняют прошлое.
 *
 * **Под остатком стоит пересчёт в раскрытия — «хватит на 43».** Рубли говорят
 * бухгалтеру, раскрытия говорят руководителю: сорок три звонка это неделя
 * работы отдела или два дня, и он это знает про своё агентство.
 */
function KeyNumbers({
  items,
}: {
  items: { value: string; label: string; note: string; big?: boolean }[]
}) {
  return (
    <div className="flex w-full shrink-0 items-center gap-7">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn("flex items-center gap-7", item.big ? "w-75 shrink-0" : "min-w-0 flex-1")}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Typography variant={item.big ? "display" : "cardPrice"} tone="default">
              {item.value}
            </Typography>
            <Typography variant="denseText" tone="secondary">
              {item.label}
            </Typography>
            <Typography variant="metaText" tone="dense">
              {item.note}
            </Typography>
          </div>
          {index < items.length - 1 ? (
            <span aria-hidden className="h-14 w-px shrink-0 bg-line-2" />
          ) : null}
        </div>
      ))}
    </div>
  )
}

/**
 * Все четыре числа считаются из своего же счёта и своих же журналов.
 *
 * Прежде вписаны были три из четырёх: «35 422 ₽», «9 / 1 791 ₽», «178
 * раскрытий». Они принадлежали чужому агентству и не двигались никогда — ни
 * от раскрытия, ни от возврата, ни от пополнения. Ряд ключевых цифр для того
 * и стоит наверху, чтобы по нему сверялись; сверяться с вписанным числом
 * нельзя, и первым это замечает тот, кто платит.
 *
 * Единственное, что осталось постоянным, — цена доступа: 3 000 ₽ в месяц это
 * тариф продукта, а не запись о деньгах агентства.
 */
function keyNumbers(workspace: Workspace, now: number, balance: number) {
  const since = now - MONTH
  const spent = spentLast30Days(workspace, now)
  const disclosed = disclosedSince(workspace, since)
  const refunds = workspace.refunds.filter((item) => item.at >= since)
  const returned = refunds.reduce((sum, item) => sum + item.amount, 0)

  return [
    {
      value: `${groupDigits(balance)} ₽`,
      label: "остаток на счёте",
      note: `хватит на ${disclosuresFor(balance)}`,
      big: true,
    },
    {
      value: `${groupDigits(spent)} ₽`,
      label: "потрачено за 30 дней",
      note: `${disclosed} ${plural(disclosed, "раскрытие", "раскрытия", "раскрытий")}`,
    },
    {
      value: `${refunds.length} / ${groupDigits(returned)} ₽`,
      label: "возвращено за 30 дней",
      // Доля возвратов без раскрытий не существует: делить не на что, и
      // «0 %» соврало бы про качество базы. Прочерк честнее нуля.
      note: disclosed > 0 ? `${Math.round((refunds.length / disclosed) * 100)} % раскрытий` : "—",
    },
    {
      value: `${groupDigits(SUBSCRIPTION_PRICE)} ₽`,
      label: "подписка агентства",
      note: "списывается первого числа",
    },
  ]
}

/**
 * Каркас раздела «Баланс».
 *
 * Один на четыре экрана: списания, возвраты, пополнения и документы. Ряд
 * ключевых цифр и три действия в заголовке у них общие — деньги агентства
 * одни и те же, с какой бы стороны на них ни смотрели. Различаются только
 * заголовок и полоса вкладок.
 */
/**
 * Акт, счёт или счёт-фактура — файлом, из настоящих чисел агентства.
 *
 * Живёт рядом с каркасом баланса, потому что нужен трём экранам сразу:
 * шапке денег, вкладке документов и экрану пополнения. Три копии этой
 * функции разъехались бы на первой же правке суммы.
 */
function usePaper() {
  const session = useSession()
  const workspace = useWorkspace()
  const now = useNow()

  /**
   * Номер передаётся снаружи, когда документ уже показан строкой таблицы:
   * иначе на экране стоит «Счёт № 3», а в скачанном файле «Счёт № 1003»,
   * и бухгалтер получает два разных документа вместо одного.
   */
  return (kind: string, number?: string) => {
    const spent = spentLast30Days(workspace, now)
    const topped = workspace.topUps.reduce((sum, item) => sum + item.amount, 0)

    download(
      fileName(kind.toLowerCase().replace(/[^а-яё]/gi, "-"), now, "txt"),
      accountingDocument({
        kind,
        number: number ?? String(1000 + workspace.disclosures.length),
        at: now,
        agency: session?.agency ?? "",
        lines: [
          ["Раскрытие контактов за 30 дней", `${spent} ₽`],
          ["Пополнения счёта", `${topped} ₽`],
          ["Остаток на счету", `${session?.balance ?? 0} ₽`],
        ],
        total: `${spent} ₽`,
      }),
      "text/plain;charset=utf-8",
    )
  }
}

function BalanceShell({
  title,
  note,
  tabs,
  activeTab,
  onTabSelect,
  children,
}: {
  title: string
  note: string
  /** Свои вкладки — у документов. Остальным подходит полоса раздела денег. */
  tabs?: BalanceTab[]
  activeTab: string
  /** Вкладка без адреса переключает состояние экрана — так устроены документы. */
  onTabSelect?: (id: string) => void
  children: ReactNode
}) {
  const session = useSession()
  const workspace = useWorkspace()
  const now = useNow()
  const navigate = useNavigate()
  // Кабинет закрыт охраной, и без сеанса сюда не попасть. Ноль стоит здесь
  // не как запасное значение, а как единственное честное: чужой остаток
  // подставлять некуда и незачем.
  const balance = session?.balance ?? 0
  const paper = usePaper()
  const shownTabs = tabs ?? balanceTabs(workspace)

  return (
    <CabinetShell activeId="balance">
      <CabinetPage>
        <div className="flex h-7 w-full shrink-0 items-center gap-3">
          <Typography variant="panelTitle" tone="default" as="h1">
            {title}
          </Typography>
          <Typography variant="denseText" tone="dense">
            {note}
          </Typography>
          <div className="h-px flex-1" />
          {/* Акт и счёт — настоящие файлы. Сервер нужен, чтобы ПОДПИСАТЬ
              документ печатью; чтобы СОБРАТЬ его из чисел, которые уже перед
              глазами, сервер не нужен, и притворяться иначе было незачем. */}
          <Button variant="quiet" size="sm" onClick={() => paper("Акт")}>
            Скачать акт
          </Button>
          <Button variant="quiet" size="sm" onClick={() => paper("Счёт")}>
            Скачать счёт
          </Button>
          {/* Пополнение — нарисованный экран, и человек должен попадать на него
              переходом. Кнопка проекта закрыта и ссылкой не притворяется,
              поэтому переход делается здесь, а адрес остаётся настоящим. */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => void navigate({ to: "/balance/top-up" })}
          >
            Пополнить
          </Button>
        </div>

        <KeyNumbers items={keyNumbers(workspace, now, balance)} />

        {/* Счётчик рядом с вкладкой — не украшение: он показывает, сколько
            возвратов пришлось на сколько списаний, то есть возвращает ли
            продукт деньги на самом деле. Поэтому числа настоящие. */}
        <div className="flex h-row-head w-full shrink-0 items-center gap-6 border-b border-line-2">
          {shownTabs.map((tab) => {
            const active = tab.id === activeTab
            // Вкладка с адресом — ссылка, без адреса — кнопка. Списания и
            // возвраты живут по своим адресам, вкладки документов делят один
            // список и переключают только его.
            const Element = tab.to ? Link : "button"
            const behaviour = tab.to
              ? ({ to: tab.to } as const)
              : ({
                  type: "button",
                  onClick: onTabSelect ? () => onTabSelect(tab.id) : undefined,
                } as const)

            return (
              <Element
                {...behaviour}
                key={tab.id}
                data-slot="balance-tab"
                data-active={active || undefined}
                data-action={tab.action}
                className={cn(
                  "flex h-row-head cursor-pointer items-center gap-1.5 border-b-2 bg-transparent",
                  "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
                  active ? "border-fg" : "border-transparent",
                )}
              >
                <Typography
                  variant={active ? "controlLabel" : "uiText"}
                  tone={active ? "default" : "secondary"}
                >
                  {tab.label}
                </Typography>
                <Typography variant="metaText" tone="dense">
                  {String(tab.count)}
                </Typography>
              </Element>
            )
          })}
        </div>

        <>{children}</>
      </CabinetPage>
    </CabinetShell>
  )
}

/** Три правила внизу экрана: как считаются деньги. */
function RuleGrid({ label, rules }: { label: string; rules: { title: string; text: string }[] }) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-2">
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <div className="flex w-full items-start gap-6">
        {rules.map((rule, index) => (
          <div key={rule.title} className="flex min-w-0 flex-1 items-start gap-6">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Typography variant="numericDense" tone="default">
                {rule.title}
              </Typography>
              <Typography variant="metaText" tone="dense">
                {rule.text}
              </Typography>
            </div>
            {index < rules.length - 1 ? (
              <span aria-hidden className="h-13 w-px shrink-0 bg-line-2" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Строка выписки: одно списание с остатком на момент этого списания. */
type ChargeRow = {
  id: string
  when: string
  who: string
  object: string
  result: string
  sum: string
  left: string
}

export function BalanceChargesPage() {
  /**
   * Выписка собирается из журнала раскрытий, а не пишется руками.
   *
   * Раньше здесь лежали девять чужих строк — «Смирнова Ирина», «Титова Анна»,
   * адреса чужих объектов, — и ваши раскрытия в них не попадали НИКОГДА.
   * Это были образцы текста из макета: дизайнер пишет их, чтобы кадр не был
   * пустым, а в коде они превратились в данные и показывались живым людям.
   * Показывать нечего — значит показывается пустое состояние, а не чужая
   * история.
   */
  const workspace = useWorkspace()
  const session = useSession()

  /**
   * Остаток в каждой строке считается назад от текущего счёта.
   *
   * Хранить остаток вместе с записью нельзя: возврат меняет все остатки ниже
   * себя, и сохранённые числа мгновенно расходятся с балансом в шапке. Строки
   * идут от новых к старым, поэтому остаток накапливается сверху вниз.
   */
  const balance = session?.balance ?? 0

  // Накопление идёт обычным циклом, а не внутри `map`: замыкание, меняющее
  // переменную снаружи себя, компилятор React справедливо считает опасным —
  // оно может выполниться не тогда, когда кажется.
  const charges: ChargeRow[] = []
  let running = balance

  for (const item of workspace.disclosures) {
    const left = running
    // Списание, за которое вернули деньги, остатка уже не уменьшало.
    if (!item.trial && !item.refunded) running += item.amount
    charges.push({
      id: item.id,
      when: formatMoment(item.at),
      who: item.by,
      object: item.address,
      result: item.refunded
        ? "оказался посредник, возврат"
        : item.trial
          ? "пробное раскрытие, 0 ₽"
          : "контакт раскрыт",
      sum: item.trial ? "0 ₽" : `${groupDigits(item.amount)} ₽`,
      left: `${groupDigits(left)} ₽`,
    })
  }

  return (
    <BalanceShell
      title="Баланс"
      note="общий счёт агентства, платят не за пользователей"
      activeTab="charges"
    >
      <NoticeBar
        rule="Списание происходит в момент раскрытия, отдельного подтверждения нет"
        note="каждое списание попадает в журнал доступа: кто, когда и по какому объекту"
      />

      {charges.length === 0 ? (
        <AgencyEmpty
          title="Списаний ещё не было"
          text="Здесь появится каждое движение денег: 199 ₽ за раскрытый контакт и 3 000 ₽ за доступ агентства первого числа. Строка пишется в момент раскрытия, отдельного подтверждения нет."
          note="Первые пять раскрытий не стоят ничего — они входят в пробный старт."
        />
      ) : (
      <DataTable
        columns={[
          { head: "ДАТА И ВРЕМЯ", width: "w-col-144" },
          { head: "АГЕНТ", width: "w-col-168" },
          { head: "ОБЪЕКТ" },
          { head: "ЧЕМ КОНЧИЛОСЬ", width: "w-col-216" },
          { head: "СУММА", width: "w-col-96", numeric: true },
          { head: "ОСТАТОК", width: "w-col-120", numeric: true },
        ]}
        rows={charges.map((row) => ({
          id: row.id,
          cells: [
            <Typography key="when" variant="denseText" tone="secondary">{row.when}</Typography>,
            <Typography key="who" variant="denseText" tone="secondary">{row.who}</Typography>,
            <Typography key="object" variant="denseText" tone="default">{row.object}</Typography>,
            <Typography key="result" variant="denseText" tone="secondary">{row.result}</Typography>,
            <Typography key="sum" variant="numericDense" tone="default">{row.sum}</Typography>,
            <AgencyChip key="left" label={row.left} />,
          ],
        }))}
      />
      )}

      <RuleGrid
        label="КАК СЧИТАЮТСЯ ДЕНЬГИ"
        rules={[
          {
            title: "Раскрытие контакта",
            text: "199 ₽ за номер. Списывается один раз на объект: если тот же контакт откроет другой сотрудник, второй раз агентство не платит.",
          },
          {
            title: "Подписка агентства",
            text: "3 000 ₽ первого числа за агентство целиком, до двадцати сотрудников. Не зависит от числа раскрытий.",
          },
          {
            title: "Если денег не хватает",
            text: "Кнопка раскрытия становится неактивной. Поиск, выдача и подборки продолжают работать, ничего не пропадает.",
          },
        ]}
      />
    </BalanceShell>
  )
}

/**
 * Возвраты.
 *
 * **Лимит стоит на субъективных причинах, а не на возвратах вообще.** «Номер
 * не существует», «объект продан», «согласие отозвано» — объективные, и в лимит
 * они не считаются: продукт ошибся, а не агент передумал. Счётчик лимита
 * считает свои возвраты за тридцать дней — те, что про «агент, посредник»
 * и «не тот человек».
 */
export function BalanceRefundsPage() {
  const workspace = useWorkspace()
  const now = useNow()

  /**
   * Возврат существует только тогда, когда его оформили в панели звонка.
   * Десять чужих строк, стоявших здесь раньше, были образцом текста из
   * макета — с чужими именами и чужими адресами.
   */
  const refunds = workspace.refunds.map((item) => ({
    id: item.id,
    when: formatMoment(item.at),
    who: item.by,
    object: item.address,
    reason: item.reason,
    kind: item.objective ? "объективный" : "субъективный",
    sum: `${groupDigits(item.amount)} ₽`,
    status: "Возвращено",
    // Возврат зачисляется сразу: держать «В обработке» нечем, очереди
    // рассмотрения в продукте пока нет.
    pending: false,
  }))

  return (
    <BalanceShell
      title="Баланс"
      note="общий счёт агентства, платят не за пользователей"
      activeTab="refunds"
    >
      <NoticeBar
        rule={`Лимит возвратов по субъективным причинам: ${subjectiveRefunds(workspace, now)} из 12 за 30 дней`}
        aside={
          <div className="w-40 shrink-0">
            <FillBar filled={subjectiveRefunds(workspace, now)} total={12} />
          </div>
        }
        note="объективные причины в лимит не считаются: номер не существует, объект продан, согласие отозвано"
      />

      {refunds.length === 0 ? (
        <AgencyEmpty
          title="Возвратов не было"
          text="Возврат отмечается кнопкой в панели фиксации звонка: если по номеру ответил не собственник, деньги возвращаются на счёт агентства. Объективные причины закрываются сразу, спорные — в течение часа."
          note="Лимит в двенадцать возвратов за тридцать дней тратится только на спорные причины."
        />
      ) : (
      <DataTable
        columns={[
          { head: "ДАТА И ВРЕМЯ", width: "w-col-144" },
          { head: "АГЕНТ", width: "w-col-168" },
          { head: "ОБЪЕКТ" },
          { head: "ПРИЧИНА", width: "w-col-216" },
          { head: "ТИП", width: "w-col-120" },
          { head: "СУММА", width: "w-col-96", numeric: true },
          { head: "СТАТУС", width: "w-col-120", numeric: true },
        ]}
        rows={refunds.map((row) => ({
          id: row.id,
          cells: [
            <Typography key="when" variant="denseText" tone="secondary">{row.when}</Typography>,
            <Typography key="who" variant="denseText" tone="secondary">{row.who}</Typography>,
            <Typography key="object" variant="denseText" tone="default">{row.object}</Typography>,
            <Typography key="reason" variant="denseText" tone="default">{row.reason}</Typography>,
            <Typography key="kind" variant="denseText" tone="dense">{row.kind}</Typography>,
            <Typography key="sum" variant="numericDense" tone="default">{row.sum}</Typography>,
            <Typography
              key="status"
              variant="numericDense"
              tone={row.pending ? "warn" : "ok"}
            >
              {row.status}
            </Typography>,
          ],
        }))}
      />
      )}
    </BalanceShell>
  )
}

/**
 * БАЛАНС · Документы (`uz1ET`).
 *
 * **Четвёртая вкладка денег, а не отдельный раздел.** Счёт, акт и счёт-фактура
 * — это те же операции, что в списаниях и пополнениях, только со стороны
 * бухгалтерии. Поэтому каркас, ряд ключевых цифр и три действия в заголовке
 * здесь общие с балансом: человек не должен заново искать, где он находится.
 *
 * **Колонка «состояние» отвечает на вопрос, который задаёт бухгалтер:**
 * оплачен ли счёт, ушли ли закрывающие документы. Не «готов» и не «доступен» —
 * это слова про файл, а бухгалтера интересует документооборот.
 */

/**
 * Вид документа. Бухгалтер ищет одно из двух: счёт, чтобы оплатить, или
 * закрывающие документы, чтобы закрыть месяц. По этому делению и стоят вкладки.
 */
type DocumentKind = "invoice" | "act"

type AccountingPaper = {
  id: string
  when: string
  /** Вид документа словом: «Счёт», «Акт», «Счёт-фактура». */
  title: string
  number: string
  kind: DocumentKind
  purpose: string
  state: string
  file: string
  sum: string
}

/**
 * Документы собираются из пополнений, а не лежат списком.
 *
 * Девять строк, стоявших здесь раньше, были образцом текста из макета: чужие
 * номера счетов, чужие двадцать тысяч, «оплачен 24.07» у агентства, которое
 * ещё ничего не пополняло. Счёт — след настоящего действия, и появляться он
 * обязан из этого действия.
 *
 * **Актов здесь пока нет, и выдумывать их нельзя.** Списание за доступ
 * агентства в продукте ещё не происходит: первого числа никто ничего не
 * снимает, значит и закрывать актом нечего. Вкладка «Акты и счета-фактуры»
 * остаётся и честно показывает ноль — так видно, где документы появятся,
 * когда подписка заработает.
 */
function documentsOf(workspace: Workspace): AccountingPaper[] {
  const total = workspace.topUps.length

  return workspace.topUps.map((item, index) => ({
    id: item.id,
    when: formatMoment(item.at),
    title: "Счёт",
    // Пополнения лежат от новых к старым, а нумерация счетов растёт со
    // временем: у самого свежего счёта самый большой номер.
    number: String(total - index),
    kind: "invoice",
    purpose: "Пополнение баланса",
    // Деньги зачисляются в момент пополнения. «Ждёт оплаты» и «отправлен
    // в ЭДО» — состояния, которых у продукта пока нет, и рисовать их значило
    // бы обещать бухгалтеру документооборот, которого не существует.
    state: "оплачен и зачислен",
    // Файл собирается браузером текстом: PDF без подписи и печати всё равно
    // не документ. Размер до нажатия неизвестен, и придумывать «148 КБ»
    // не из чего.
    file: "TXT",
    sum: `${groupDigits(item.amount)} ₽`,
  }))
}

/**
 * Действие внутри строки таблицы: 24 в высоту, без заливки, подпись 12/600.
 *
 * Ступени кнопки начинаются с 32, и опустить её до 24 нельзя — ступень
 * связана с кеглем подписи жёстко. В строке таблицы высотой 48 кнопка 32
 * съела бы две трети строки, поэтому в файле здесь не кнопка, а подпись,
 * по которой можно нажать.
 */
function RowAction({
  doc,
  children,
  onClick,
}: {
  doc: string
  children: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      data-slot="row-action"
      // Имя документа стоит в подписи для чтения с экрана: девять одинаковых
      // «Скачать» подряд ничего не различают.
      onClick={onClick}
      aria-label={`${children} ${doc}`}
      className="inline-flex h-6 shrink-0 cursor-pointer items-center rounded-sm bg-transparent px-2 hover:bg-warm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg"
    >
      <Typography variant="metaStrong" tone="default">
        {children}
      </Typography>
    </button>
  )
}

export function BalanceDocumentsPage() {
  /**
   * Вкладки документов — не три страницы, а один список с тремя срезами.
   * Бухгалтер приходит сюда за конкретным: оплатить счёт или закрыть месяц
   * актом. Счётчики во вкладках считают ровно то, что лежит в списке: пока
   * они были вписаны (38, 19, 19), число во вкладке не сходилось с числом
   * строк, и бухгалтер видел недостачу документов там, где её не было.
   */
  const [tab, setTab] = useState("all")
  const paper = usePaper()
  const workspace = useWorkspace()
  const documents = documentsOf(workspace)
  const shown = documents.filter((row) => {
    if (tab === "invoices") return row.kind === "invoice"
    if (tab === "acts") return row.kind === "act"
    return true
  })

  const tabs: BalanceTab[] = [
    { id: "all", label: "Все", count: documents.length },
    {
      id: "invoices",
      label: "Счета",
      count: documents.filter((row) => row.kind === "invoice").length,
    },
    {
      id: "acts",
      label: "Акты и счета-фактуры",
      count: documents.filter((row) => row.kind === "act").length,
    },
  ]

  return (
    <BalanceShell
      title="Документы"
      note="счета, акты и счета-фактуры за всё время"
      tabs={tabs}
      activeTab={tab}
      onTabSelect={setTab}
    >
      <NoticeBar
        rule="Акт и счёт-фактура за месяц появляются первого числа"
        note="документы уходят в ЭДО автоматически, если он подключён"
      />

      {shown.length === 0 ? (
        <AgencyEmpty
          title="Документов пока нет"
          text="Счёт появляется здесь сразу после пополнения баланса, акт и счёт-фактура за месяц — первого числа. Любой из них можно скачать повторно, номер не меняется."
          note="Акт сверки за произвольный период запрашивается письмом на hello@serch.ru."
        />
      ) : (
      <DataTable
        columns={[
          { head: "ДАТА", width: "w-col-144" },
          { head: "ДОКУМЕНТ", width: "w-col-216" },
          { head: "НАЗНАЧЕНИЕ" },
          { head: "СОСТОЯНИЕ", width: "w-col-168" },
          { head: "ФАЙЛ", width: "w-col-120" },
          { head: "СУММА", width: "w-col-96", numeric: true },
          { head: "СКАЧАТЬ", width: "w-col-120", numeric: true },
        ]}
        rows={shown.map((row) => {
          // Имя документа собирается один раз: в строке, в подписи для чтения
          // с экрана и в скачанном файле оно обязано совпадать.
          const name = `${row.title} № ${row.number}`

          return {
            id: row.id,
            cells: [
              <Typography key="when" variant="denseText" tone="secondary">{row.when}</Typography>,
              <Typography key="doc" variant="numericDense" tone="default">{name}</Typography>,
              <Typography key="purpose" variant="denseText" tone="default">{row.purpose}</Typography>,
              <Typography key="state" variant="denseText" tone="secondary">{row.state}</Typography>,
              <Typography key="file" variant="denseText" tone="dense">{row.file}</Typography>,
              <Typography key="sum" variant="numericDense" tone="default">{row.sum}</Typography>,
              <RowAction key="get" doc={name} onClick={() => paper(row.title, row.number)}>
                Скачать
              </RowAction>,
            ],
          }
        })}
      />
      )}

      <RuleGrid
        label="ЕСЛИ ДОКУМЕНТА НЕ ХВАТАЕТ"
        rules={[
          {
            title: "Счёт на пополнение",
            text: "Формируется сразу при нажатии «Пополнить». Если счёт потерялся, скачайте его здесь повторно, номер не изменится.",
          },
          {
            title: "Акт и счёт-фактура",
            text: "Появляются первого числа за прошлый месяц. Подписываем со своей стороны в тот же день.",
          },
          {
            title: "Акт сверки",
            text: "Запрашивается за любой период письмом на hello@serch.ru, готовим за один рабочий день.",
          },
        ]}
      />
    </BalanceShell>
  )
}

/**
 * КАБИНЕТ · Пополнить баланс (`Ve3bF`).
 *
 * **Экран не торопит и ничего не списывает.** Главное действие называется
 * «Скачать счёт», а не «Оплатить»: агентство платит с расчётного счёта,
 * и продукт заканчивает свою часть работы файлом, а не формой карты.
 *
 * **Сумма переведена в раскрытия прямо под полем** — «20 000 ₽ это 100
 * раскрытий по 199 ₽». Руководитель не считает в рублях: он считает,
 * на сколько недель работы отдела хватит пополнения.
 *
 * **«Деньги не сгорают и не имеют срока».** Это снимает главный страх при
 * предоплате и стоит там, где страх возникает, — под полем суммы, а не
 * в оферте.
 *
 * Ряда ключевых цифр здесь нет: остаток вынесен одной строкой в возврат
 * к балансу. Человек пришёл сюда пополнять, а не смотреть отчёт.
 */
const TOP_UP_AMOUNTS = [5000, 10000, 20000, 50000]

type PaymentMethod = { id: string; title: string; note: string }

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "invoice",
    title: "Счёт на юрлицо",
    note: "Счёт придёт на почту сразу. Зачисление в течение одного рабочего дня после оплаты.",
  },
  {
    id: "card",
    title: "Картой",
    note: "Мгновенное зачисление. Чек уходит на почту, закрывающие документы формируются первого числа.",
  },
]

/** Способ оплаты: кружок, заголовок и последствие выбора. */
function PaymentOption({
  method,
  selected,
  onSelect,
}: {
  method: PaymentMethod
  selected: boolean
  onSelect: () => void
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      data-slot="payment-option"
      data-selected={selected || undefined}
      // Выбор происходит по нажатию, а не по отпусканию: кольцо переключателя
      // должно перескочить под пальцем, а не через мгновение после него.
      onPointerDown={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        onSelect()
      }}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-2xl p-4",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        selected
          ? "bg-warm outline-2 -outline-offset-2 outline-fg"
          : "bg-surface outline-1 -outline-offset-1 outline-border-control",
      )}
    >
      {/* Выбранный кружок — кольцо 6 внутрь, а не точка в центре: точка
          на 20 px читается как пятно, кольцо — как переключатель. */}
      <span
        aria-hidden
        className={cn(
          "size-5 shrink-0 rounded-full bg-surface",
          selected ? "border-[6px] border-fg" : "border border-border-control",
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Typography variant="strongText" tone="default">
          {method.title}
        </Typography>
        <Typography variant="metaText" tone="dense">
          {method.note}
        </Typography>
      </span>
    </div>
  )
}

/** Строка сводки: ключ слева, значение справа. Высота 24. */
function SummaryRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex h-6 w-full items-center justify-between gap-3">
      <Typography variant="denseText" tone="dense">
        {term}
      </Typography>
      <Typography variant="numericDense" tone="default">
        {value}
      </Typography>
    </div>
  )
}

export function BalanceTopUpPage() {
  const session = useSession()
  const { topUp } = useSessionActions()
  // Экран за охраной, и без сеанса сюда не попасть. Ноль — единственное
  // честное запасное значение: чужой остаток здесь не показывается.
  const balance = session?.balance ?? 0

  /**
   * Сумма и способ оплаты живут состоянием экрана: чип, поле суммы, пересчёт
   * в раскрытия и панель «К оплате» показывают одно и то же число, иначе
   * человек не знает, за какое из них платит.
   */
  const [amount, setAmount] = useState(20000)
  /** Сумму набирают руками, а не выбирают чипом. */
  const [custom, setCustom] = useState(false)
  const [method, setMethod] = useState("invoice")
  const disclosures = Math.floor(amount / DISCLOSURE_PRICE)

  /**
   * Счёт выставляется на своё агентство и называет его своим именем.
   *
   * Реквизитов юрлица продукт пока не спрашивает, поэтому названо только то,
   * что известно: имя агентства из сеанса. Без сеанса имени нет, и строка
   * говорит об этом словами, а не подставляет чужое.
   */
  const invoiceNote = session?.agency
    ? `Счёт выставляется на юридическое лицо агентства «${session.agency}». Реквизиты берутся из настроек агентства.`
    : "Счёт выставляется на юридическое лицо агентства. Реквизиты берутся из настроек агентства."

  return (
    <CabinetShell activeId="balance">
      <CabinetPage>
        <div className="flex h-7 w-full shrink-0 items-center gap-3">
          <Typography variant="panelTitle" tone="default" as="h1">
            Пополнить баланс
          </Typography>
          <Typography variant="denseText" tone="dense">
            деньги приходят на общий счёт агентства, а не на сотрудника
          </Typography>
          <div className="h-px flex-1" />
        </div>

        {/* Возврат к балансу и остаток в одной строке: человек видит, откуда
            пришёл и сколько у него есть, не уходя со страницы. */}
        <div className="flex h-9 w-full shrink-0 items-center gap-2 border-b border-line-2">
          {/* Стрелка с подписью — настоящая дверь назад, а не украшение:
              по ней возвращаются в баланс, её можно открыть в новой вкладке
              и она отзывается на «назад» в браузере. */}
          <Link
            to="/balance"
            className="flex cursor-pointer items-center gap-2 rounded-sm outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <ArrowLeft aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
            <Typography variant="denseText" tone="dense">
              Баланс агентства
            </Typography>
          </Link>
          <div className="h-px flex-1" />
          <Typography variant="denseText" tone="dense">
            {`Сейчас на счёте ${groupDigits(balance)} ₽, это ${disclosuresFor(balance)}`}
          </Typography>
        </div>

        <NoticeBar
          rule="Счёт выставляется на юридическое лицо, акт приходит первого числа"
          note="деньги приходят в течение банковского дня, картой сразу"
        />

        <div className="flex w-full items-start gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-8">
            <section className="flex w-full flex-col gap-4">
              <Typography variant="columnHeader" tone="dense">
                Сумма пополнения
              </Typography>
              <div
                role="radiogroup"
                aria-label="Сумма пополнения"
                className="flex w-full flex-wrap items-center gap-2"
              >
                {TOP_UP_AMOUNTS.map((value) => (
                  <SelectChip
                    key={value}
                    label={`${groupDigits(value)} ₽`}
                    selected={!custom && value === amount}
                    onClick={() => {
                      setCustom(false)
                      setAmount(value)
                    }}
                  />
                ))}
                {/*
                  «Другая сумма» делает поле ниже редактируемым.

                  В макете поле нарисовано неизменяемым, и раньше чип поэтому
                  только назывался действием. Но выбор из четырёх ступеней —
                  это не пополнение баланса, а меню: агентство, которому
                  нужно внести 7 400 ₽ под остаток счёта, упиралось в четыре
                  чужие суммы. Поле рядом уже стоит, и сделать его
                  редактируемым — меньше нового, чем завести окно.
                */}
                <span className="contents" data-action="ручной ввод суммы">
                  <SelectChip
                    label="Другая сумма"
                    selected={custom}
                    onClick={() => setCustom(true)}
                  />
                </span>
              </div>
              <div className="flex h-ctl-lg w-100 items-center gap-2 rounded-xl border border-border-control bg-surface px-4">
                {custom ? (
                  <input
                    data-slot="top-up-amount"
                    autoFocus
                    inputMode="numeric"
                    aria-label="Сумма пополнения, ₽"
                    value={groupDigits(amount)}
                    onChange={(event) => {
                      // Разряды человек не набирает — их ставит продукт.
                      // Поэтому всё, кроме цифр, отбрасывается на входе.
                      const digits = event.target.value.replace(/\D/g, "")
                      setAmount(digits === "" ? 0 : Number(digits))
                    }}
                    className="h-full min-w-0 flex-1 bg-transparent text-fg outline-none"
                  />
                ) : (
                  <Typography variant="panelTitle" tone="default">
                    {groupDigits(amount)}
                  </Typography>
                )}
                <Typography variant="unitLabel" tone="dense">
                  ₽
                </Typography>
              </div>
              <Typography variant="metaText" tone="dense">
                {`${groupDigits(amount)} ₽ это ${disclosuresFor(amount)} по ${DISCLOSURE_PRICE} ₽. Деньги не сгорают и не имеют срока.`}
              </Typography>
            </section>

            <section className="flex w-full flex-col gap-4">
              <Typography variant="columnHeader" tone="dense">
                Способ оплаты
              </Typography>
              <div
                role="radiogroup"
                aria-label="Способ оплаты"
                className="flex w-full flex-col gap-3"
              >
                {PAYMENT_METHODS.map((option) => (
                  <PaymentOption
                    key={option.id}
                    method={option}
                    selected={option.id === method}
                    onSelect={() => setMethod(option.id)}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="flex w-95 shrink-0 flex-col gap-4 rounded-2xl border border-line-2 bg-surface p-5">
            <Typography variant="columnHeader" tone="dense">
              К оплате
            </Typography>
            <Typography variant="cardPrice" tone="default">
              {`${groupDigits(amount)} ₽`}
            </Typography>
            <div className="flex w-full flex-col gap-3">
              <SummaryRow term="Пополнение" value={`${groupDigits(amount)} ₽`} />
              <SummaryRow term={`Раскрытий по ${DISCLOSURE_PRICE} ₽`} value={String(disclosures)} />
              <SummaryRow term="НДС" value="не облагается" />
              {/* Срок зачисления — единственное, что меняется от способа
                  оплаты, и меняется словами самого продукта: счёт идёт
                  банковский день, карта зачисляется сразу. */}
              <SummaryRow
                term="Зачисление"
                value={method === "card" ? "сразу" : "один рабочий день"}
              />
            </div>
            <span aria-hidden className="h-px w-full bg-line-2" />
            {/* Файла счёта в демонстрации нет — печатать его будет сервер.
                Но пополнение обязано доходить: деньги приходят на общий счёт
                агентства, и счётчик в шапке досчитывает их на глазах.
                Без этого демонстрация показывает форму вместо системы. */}
            <Button
              variant="primary"
              size="lg"
              block
              data-action="скачать счёт на пополнение"
              // Способ оплаты передаётся в запись: человек выбрал счёт на
              // юрлицо, а в журнале пополнений стояла «карта» — расхождение
              // мелкое, но вылезло бы в документах, где оно как раз важно.
              onClick={() => topUp(amount, method === "card" ? "карта" : "счёт на юрлицо")}
            >
              Скачать счёт
            </Button>
            {/* Реквизитов агентства продукт пока не спрашивает: ни ИНН, ни
                названия юрлица в сеансе нет. Стоявшие здесь ООО «Невский
                проспект» и ИНН 7806154392 были образцом текста из макета —
                чужое юрлицо в счёте хуже, чем его отсутствие. */}
            <Typography variant="metaText" tone="dense">
              {invoiceNote}
            </Typography>
          </aside>
        </div>

        <RuleGrid
          label="КАК ПОПОЛНИТЬ"
          rules={[
            {
              title: "Счёт на юридическое лицо",
              text: "Скачайте счёт и оплатите с расчётного счёта. Акт и счёт-фактура появятся в разделе документов первого числа.",
            },
            {
              title: "Картой",
              text: "Мгновенно. Подходит, когда деньги нужны сейчас, а бухгалтерия оплатит счёт позже.",
            },
            {
              title: "Автопополнение",
              text: "Когда на счёте остаётся меньше десяти раскрытий, счёт выставляется сам, а руководитель получает письмо.",
            },
          ]}
        />
      </CabinetPage>
    </CabinetShell>
  )
}
