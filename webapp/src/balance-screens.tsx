import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { AgencyChip, AgencyEmpty, DataTable, NoticeBar } from "@/features/agency"
import { useOwnAgency, useSession, useSessionActions } from "@/features/auth"
import { CabinetPage, CabinetShell } from "@/features/cabinet"
import { FillBar, groupDigits, plural } from "@/features/listings"
import { cn } from "@/lib/utils"

/** Раскрытие стоит 199 ₽ — цена продукта, а не число экрана. */
const DISCLOSURE_PRICE = 199

/** Остаток агентства до входа в сеанс: те же 8 610 ₽, что показывает шапка. */
const DEMO_BALANCE = 8610

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
 * «у вас 8 610 ₽» не отвечает на вопрос «куда ушло», а таблица с остатком
 * отвечает: её можно читать снизу вверх как выписку.
 *
 * **«Чем кончилось» — не техническое поле, а смысл строки.** Рядом с каждым
 * списанием стоит, что из него вышло: «дозвонилась», «оказался посредник,
 * возврат», «отказ собственника». Без этой колонки таблица говорила бы только
 * про деньги, а руководитель смотрит её, чтобы понять, за что заплатили.
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

const TABS: BalanceTab[] = [
  { id: "charges", label: "Списания", count: 178, to: "/balance" },
  { id: "refunds", label: "Возвраты", count: 9, to: "/balance/refunds" },
  // Экран пополнений в макете есть (`ruMMX`), в продукте его пока нет.
  // Вкладка поэтому названа действием, а не ведёт на выдуманный адрес.
  { id: "topups", label: "Пополнения", count: 4, action: "открыть список пополнений" },
]

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
 * Остаток берётся из сеанса, а не из константы экрана.
 *
 * Иначе пополнение проходит, шапка досчитывает новые деньги, а раздел «Баланс»
 * продолжает показывать прежнюю сумму — и человек перестаёт верить обоим
 * числам. Прошлое (потрачено, возвращено, подписка) остаётся демонстрационным:
 * это история, её пополнение не меняет.
 */
function keyNumbers(balance: number) {
  return [
    {
      value: `${groupDigits(balance)} ₽`,
      label: "остаток на счёте",
      note: `хватит на ${disclosuresFor(balance)}`,
      big: true,
    },
    { value: "35 422 ₽", label: "потрачено за 30 дней", note: "178 раскрытий" },
    { value: "9 / 1 791 ₽", label: "возвращено за 30 дней", note: "5 % раскрытий" },
    { value: "3 000 ₽", label: "подписка агентства", note: "списывается 1 августа" },
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
function BalanceShell({
  title,
  note,
  tabs = TABS,
  activeTab,
  onTabSelect,
  children,
}: {
  title: string
  note: string
  tabs?: BalanceTab[]
  activeTab: string
  /** Вкладка без адреса переключает состояние экрана — так устроены документы. */
  onTabSelect?: (id: string) => void
  children: ReactNode
}) {
  const session = useSession()
  const navigate = useNavigate()
  const balance = session?.balance ?? DEMO_BALANCE

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
          {/* Акт и счёт — файлы, а не экраны: печатать их будет сервер, которого
              за демонстрацией нет. Действие названо, но ничего не рисует:
              плашка «скоро будет» была бы обещанием вместо документа. */}
          <Button variant="quiet" size="sm" data-action="скачать акт за месяц">
            Скачать акт
          </Button>
          <Button variant="quiet" size="sm" data-action="скачать счёт на пополнение">
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

        <KeyNumbers items={keyNumbers(balance)} />

        {/* Счётчик рядом с вкладкой — не украшение: он показывает, что
            возвратов девять при ста семидесяти восьми списаниях, то есть
            продукт возвращает деньги, а не отговаривается. */}
        <div className="flex h-row-head w-full shrink-0 items-center gap-6 border-b border-line-2">
          {tabs.map((tab) => {
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

const CHARGES = [
  { id: "1", when: "24.07, 14:12", who: "Смирнова Ирина", object: "Ленская ул., 10", result: "две попытки, перезвон на 16:00", sum: "199 ₽", left: "8 610 ₽" },
  { id: "2", when: "24.07, 11:47", who: "Титова Анна", object: "Индустриальный пр., 26", result: "оказался посредник, возврат", sum: "199 ₽", left: "8 809 ₽" },
  { id: "3", when: "24.07, 09:38", who: "Гусев Пётр", object: "Заневский пр., 32", result: "не дозвонился, повторит завтра", sum: "199 ₽", left: "9 008 ₽" },
  { id: "4", when: "23.07, 17:20", who: "Титова Анна", object: "Товарищеский пр., 22", result: "брак, возврат", sum: "199 ₽", left: "9 207 ₽" },
  { id: "5", when: "23.07, 10:05", who: "Смирнова Ирина", object: "Гражданский пр., 114", result: "дозвонилась", sum: "199 ₽", left: "9 406 ₽" },
  { id: "6", when: "22.07, 16:31", who: "Гусев Пётр", object: "Кузнецовская ул., 44", result: "брак, возврат", sum: "199 ₽", left: "9 605 ₽" },
  { id: "7", when: "22.07, 12:18", who: "Лебедев Максим", object: "наб. Обводного канала, 108", result: "дозвонился", sum: "199 ₽", left: "9 804 ₽" },
  { id: "8", when: "21.07, 09:55", who: "Титова Анна", object: "Передовиков ул., 21", result: "отказ собственника", sum: "199 ₽", left: "10 003 ₽" },
  { id: "9", when: "01.07, 00:05", who: "Система", object: "Доступ агентства за июль", result: "списано", sum: "3 000 ₽", left: "10 202 ₽" },
]

export function BalanceChargesPage() {
  // Своё агентство ещё ничего не тратило: ни раскрытий, ни списания за доступ.
  // Чужие девять строк здесь читались бы как собственная история расходов.
  const own = useOwnAgency()
  const charges = own ? [] : CHARGES

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

const REFUNDS = [
  { id: "1", when: "24.07, 15:40", who: "Титова Анна", object: "Индустриальный пр., 26", reason: "Это агент, посредник", kind: "субъективный", sum: "199 ₽", status: "В обработке", pending: true },
  { id: "2", when: "23.07, 17:20", who: "Титова Анна", object: "Товарищеский пр., 22", reason: "Номер не существует", kind: "объективный", sum: "199 ₽", status: "Возвращено" },
  { id: "3", when: "23.07, 12:40", who: "Королёв Дмитрий", object: "Энтузиастов пр., 47", reason: "Номер чужой, не тот человек", kind: "субъективный", sum: "199 ₽", status: "Возвращено" },
  { id: "4", when: "23.07, 10:05", who: "Смирнова Ирина", object: "Наставников пр., 34", reason: "Собственник отозвал согласие", kind: "объективный", sum: "199 ₽", status: "Возвращено" },
  { id: "5", when: "22.07, 16:31", who: "Гусев Пётр", object: "Дыбенко ул., 13", reason: "Номер не существует", kind: "объективный", sum: "199 ₽", status: "Возвращено" },
  { id: "6", when: "22.07, 12:18", who: "Лебедев Максим", object: "Косыгина пр., 17", reason: "Это агент, посредник", kind: "субъективный", sum: "199 ₽", status: "Возвращено" },
  { id: "7", when: "21.07, 09:55", who: "Титова Анна", object: "Большевиков пр., 9", reason: "Номер чужой, не тот человек", kind: "субъективный", sum: "199 ₽", status: "Возвращено" },
  { id: "8", when: "20.07, 14:40", who: "Смирнова Ирина", object: "Шаумяна пр., 4", reason: "Это агент, посредник", kind: "субъективный", sum: "199 ₽", status: "Возвращено" },
  { id: "9", when: "19.07, 11:12", who: "Гусев Пётр", object: "Тельмана ул., 41", reason: "Объект уже продан", kind: "объективный", sum: "199 ₽", status: "Возвращено" },
  { id: "10", when: "18.07, 16:05", who: "Титова Анна", object: "Ржевская пл., 3", reason: "Это агент, посредник", kind: "субъективный", sum: "199 ₽", status: "Возвращено" },
]

/**
 * Возвраты.
 *
 * **Лимит стоит на субъективных причинах, а не на возвратах вообще.** «Номер
 * не существует», «объект продан», «согласие отозвано» — объективные, и в лимит
 * они не считаются: продукт ошибся, а не агент передумал. Пять из двенадцати
 * за тридцать дней — это про «агент, посредник» и «не тот человек».
 */
export function BalanceRefundsPage() {
  const own = useOwnAgency()
  const refunds = own ? [] : REFUNDS

  return (
    <BalanceShell
      title="Баланс"
      note="общий счёт агентства, платят не за пользователей"
      activeTab="refunds"
    >
      <NoticeBar
        rule={
          own
            ? "Лимит возвратов по субъективным причинам: 0 из 12 за 30 дней"
            : "Лимит возвратов по субъективным причинам: 5 из 12 за 30 дней"
        }
        aside={
          <div className="w-40 shrink-0">
            <FillBar filled={own ? 0 : 5} total={12} />
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
 * «оплачен 24.07», «подписан ЭДО», «отправлена в ЭДО». Не «готов» и не
 * «доступен» — это слова про файл, а бухгалтера интересует документооборот.
 */
const DOCUMENT_TABS: BalanceTab[] = [
  { id: "all", label: "Все", count: 38 },
  { id: "invoices", label: "Счета", count: 19 },
  { id: "acts", label: "Акты и счета-фактуры", count: 19 },
]

/**
 * Вид документа. Бухгалтер ищет одно из двух: счёт, чтобы оплатить, или
 * закрывающие документы, чтобы закрыть месяц. По этому делению и стоят вкладки.
 */
type DocumentKind = "invoice" | "act"

const DOCUMENTS: {
  id: string
  when: string
  doc: string
  kind: DocumentKind
  purpose: string
  state: string
  file: string
  sum: string
}[] = [
  { id: "1", when: "24.07, 09:12", doc: "Счёт № 1042", kind: "invoice", purpose: "Пополнение баланса", state: "оплачен 24.07", file: "PDF · 148 КБ", sum: "20 000 ₽" },
  { id: "2", when: "01.07, 00:05", doc: "Акт № 0714", kind: "act", purpose: "Доступ агентства за июнь", state: "подписан ЭДО", file: "PDF · 96 КБ", sum: "3 000 ₽" },
  { id: "3", when: "01.07, 00:05", doc: "Счёт-фактура № 0714", kind: "act", purpose: "Доступ агентства за июнь", state: "отправлена в ЭДО", file: "PDF · 92 КБ", sum: "3 000 ₽" },
  { id: "4", when: "14.07, 10:40", doc: "Счёт № 1039", kind: "invoice", purpose: "Пополнение баланса", state: "оплачен 14.07", file: "PDF · 147 КБ", sum: "20 000 ₽" },
  { id: "5", when: "04.07, 12:05", doc: "Счёт № 1035", kind: "invoice", purpose: "Пополнение баланса", state: "оплачен 04.07", file: "PDF · 147 КБ", sum: "20 000 ₽" },
  { id: "6", when: "01.06, 00:05", doc: "Акт № 0613", kind: "act", purpose: "Доступ агентства за май", state: "подписан ЭДО", file: "PDF · 96 КБ", sum: "3 000 ₽" },
  { id: "7", when: "01.06, 00:05", doc: "Счёт-фактура № 0613", kind: "act", purpose: "Доступ агентства за май", state: "отправлена в ЭДО", file: "PDF · 91 КБ", sum: "3 000 ₽" },
  { id: "8", when: "17.06, 11:20", doc: "Счёт № 1028", kind: "invoice", purpose: "Пополнение баланса", state: "оплачен 17.06", file: "PDF · 147 КБ", sum: "20 000 ₽" },
  { id: "9", when: "06.06, 09:44", doc: "Счёт № 1021", kind: "invoice", purpose: "Пополнение баланса", state: "оплачен 06.06", file: "PDF · 146 КБ", sum: "20 000 ₽" },
]

/**
 * Действие внутри строки таблицы: 24 в высоту, без заливки, подпись 12/600.
 *
 * Ступени кнопки начинаются с 32, и опустить её до 24 нельзя — ступень
 * связана с кеглем подписи жёстко. В строке таблицы высотой 48 кнопка 32
 * съела бы две трети строки, поэтому в файле здесь не кнопка, а подпись,
 * по которой можно нажать.
 */
function RowAction({ doc, children }: { doc: string; children: string }) {
  return (
    <button
      type="button"
      data-slot="row-action"
      // Файл выдаёт сервер, которого за демонстрацией нет, поэтому нажатие
      // названо и ничего не рисует. Имя документа стоит в подписи для чтения
      // с экрана: девять одинаковых «Скачать» подряд ничего не различают.
      data-action={`скачать ${doc}`}
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
   * актом. Счётчики во вкладках считают все документы за всё время, в таблице
   * лежат последние — поэтому число во вкладке больше числа строк.
   */
  const [tab, setTab] = useState("all")
  const shown = DOCUMENTS.filter((row) => {
    if (tab === "invoices") return row.kind === "invoice"
    if (tab === "acts") return row.kind === "act"
    return true
  })

  return (
    <BalanceShell
      title="Документы"
      note="счета, акты и счета-фактуры за всё время"
      tabs={DOCUMENT_TABS}
      activeTab={tab}
      onTabSelect={setTab}
    >
      <NoticeBar
        rule="Акт и счёт-фактура за месяц появляются первого числа"
        note="документы уходят в ЭДО автоматически, если он подключён"
      />

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
        rows={shown.map((row) => ({
          id: row.id,
          cells: [
            <Typography key="when" variant="denseText" tone="secondary">{row.when}</Typography>,
            <Typography key="doc" variant="numericDense" tone="default">{row.doc}</Typography>,
            <Typography key="purpose" variant="denseText" tone="default">{row.purpose}</Typography>,
            <Typography key="state" variant="denseText" tone="secondary">{row.state}</Typography>,
            <Typography key="file" variant="denseText" tone="dense">{row.file}</Typography>,
            <Typography key="sum" variant="numericDense" tone="default">{row.sum}</Typography>,
            <RowAction key="get" doc={row.doc}>Скачать</RowAction>,
          ],
        }))}
      />

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
  const balance = session?.balance ?? DEMO_BALANCE

  /**
   * Сумма и способ оплаты живут состоянием экрана: чип, поле суммы, пересчёт
   * в раскрытия и панель «К оплате» показывают одно и то же число, иначе
   * человек не знает, за какое из них платит.
   */
  const [amount, setAmount] = useState(20000)
  const [method, setMethod] = useState("invoice")
  const disclosures = Math.floor(amount / DISCLOSURE_PRICE)

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
                    selected={value === amount}
                    onClick={() => setAmount(value)}
                  />
                ))}
                {/* Своя сумма набирается в поле ниже, а поле в макете
                    нарисовано неизменяемым. Чип поэтому назван действием
                    и ничего не рисует: клавиатурный ввод суммы — отдельное
                    решение владельца, а не догадка кода. */}
                <span className="contents" data-action="ручной ввод суммы">
                  <SelectChip label="Другая сумма" selected={false} />
                </span>
              </div>
              <div className="flex h-ctl-lg w-100 items-center gap-2 rounded-xl border border-border-control bg-surface px-4">
                <Typography variant="panelTitle" tone="default">
                  {groupDigits(amount)}
                </Typography>
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
              onClick={() => topUp(amount)}
            >
              Скачать счёт
            </Button>
            <Typography variant="metaText" tone="dense">
              Счёт выставляется на ООО «Невский проспект», ИНН 7806154392. Реквизиты берутся
              из настроек агентства.
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
