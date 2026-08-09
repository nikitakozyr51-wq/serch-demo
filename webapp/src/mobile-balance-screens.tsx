import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { ArrowDownToLine, Download, FileText, Undo2, Wallet } from "lucide-react"
import { useState } from "react"
import type { MouseEvent, ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { DISCLOSURE_PRICE, useSession, useSessionActions } from "@/features/auth"
import { MobileEmptyState, MobileScreen, MobileSectionHeader, MobileSheet } from "@/features/cabinet"
import { groupDigits, plural } from "@/features/listings"
import {
  disclosedSince,
  formatDay,
  formatMoment,
  useNow,
  useWorkspace,
  type Workspace,
} from "@/features/workspace"
import { cn } from "@/lib/utils"
import {
  RefundLimitSheet,
  RefundSentSheet,
  TopUpDoneSheet,
} from "@/money-confirmations"
import { notifyError } from "@/platform/notify"

/**
 * Деньги агентства на телефоне: шесть экранов одного раздела.
 *
 * `hRN4n` списания · `nJc69` возвраты · `FA4Dt` пополнения · `XxC6e` документы ·
 * `NhUOQ` пополнить · `B8BQ8` заявка на возврат.
 *
 * **Верх у всех четырёх списков одинаковый и это главное решение раздела.**
 * Крупное число, строка-объяснение под ним и «Пополнить» стоят выше переключателя
 * вкладок, поэтому не уезжают при смене вкладки. Агентство приходит сюда с одним
 * вопросом — «сколько осталось и на сколько хватит», — и ответ на него не должен
 * зависеть от того, какой список открыт последним.
 *
 * Второе: строка под числом всегда переводит деньги в раскрытия («хватит на 43
 * раскрытия»), а не повторяет сумму словами. Рубли — валюта покупателя, раскрытия —
 * единица работы агента, и перевод между ними в продукте делается один раз, здесь.
 */

/* ── Общие части раздела ──────────────────────────────────────────────────── */

/**
 * Отклик приходит по `pointerdown`, а не по `click`.
 *
 * Между нажатием и щелчком на телефоне лежит больше сотни миллисекунд, и палец
 * за это время успевает решить, что контрол не сработал. Щелчок остаётся ради
 * клавиатуры: браузер шлёт его с `detail === 0`, и только такой обрабатывается
 * вторым — иначе мышь считалась бы дважды.
 */
function pressProps(onPress: () => void) {
  return {
    onPointerDown: onPress,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (event.detail === 0) onPress()
    },
  }
}

/**
 * Цена раскрытия — одна на весь продукт.
 *
 * Она живёт здесь числом, а не подписью, потому что раздел денег только тем
 * и занят, что переводит рубли в раскрытия: и остаток, и суммы пополнения
 * человек читает как «на сколько звонков хватит».
 */

/** Тридцать дней в миллисекундах: окно, за которое считаются деньги наверху. */
const MONTH = 30 * 24 * 60 * 60 * 1000

/** «43 раскрытия», «100 раскрытий», «251 раскрытие» — счёт со склонением. */
function disclosures(rubles: number) {
  const count = Math.floor(rubles / DISCLOSURE_PRICE)
  return `${count} ${plural(count, "раскрытие", "раскрытия", "раскрытий")}`
}

/**
 * Остаток на счету агентства.
 *
 * Без сеанса — ноль, а не число из макета: кабинет закрыт охраной, и попасть
 * сюда, не войдя, нельзя. Стоявшие здесь 8 610 ₽ были остатком чужого
 * агентства и не двигались ни от раскрытия, ни от пополнения.
 */
function useBalance() {
  const session = useSession()
  return session?.balance ?? 0
}

/**
 * На кого выставляются документы.
 *
 * Реквизитов юрлица продукт пока не спрашивает: ни ИНН, ни названия ООО
 * в сеансе нет. Стоявшие в этом файле ООО «Невский проспект» и ИНН 7806154392
 * были образцом текста из макета, а чужое юрлицо в счёте хуже, чем его
 * отсутствие. Названо поэтому только то, что известно, — имя своего агентства.
 */
function useLegalEntity(): string {
  const session = useSession()
  return session?.agency
    ? `юридическое лицо агентства «${session.agency}»`
    : "юридическое лицо агентства"
}

/**
 * Тело денежного экрана: поля [24, 16].
 *
 * Общий каркас `MobileScreen` даёт поля 16 и зазор 12 — это раскладка выдачи,
 * где строки идут плотно. У денег в файле верхнее поле 24 и зазор 24 (на экране
 * пополнения — 20), потому что здесь не список однородных строк, а четыре разных
 * по смыслу блока: остаток, действие, переключатель, история.
 */
function MoneyBody({
  gap = 24,
  children,
}: {
  gap?: 20 | 24
  children: ReactNode
}) {
  return (
    <div
      data-slot="money-body"
      className={cn(
        "flex w-full flex-1 flex-col px-4 py-6",
        gap === 24 ? "gap-6" : "gap-5",
      )}
    >
      <>{children}</>
    </div>
  )
}

/**
 * Ссылка «Документы» в шапке раздела (14/600 графитом).
 *
 * Документы вынесены из переключателя вкладок в шапку — на трёх списках их среди
 * вкладок нет. Так решено в файле, и это спорно: см. отчёт о расхождениях.
 * Высота 44 добавлена к тексту, чтобы палец попадал: в файле это голая надпись.
 */
function DocumentsLink() {
  return (
    <Link
      to="/m/balance/documents"
      data-slot="balance-documents-link"
      className="-mx-2 flex h-11 shrink-0 cursor-pointer items-center rounded-md bg-transparent px-2 transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <Typography variant="controlLabel" tone="default">
        Документы
      </Typography>
    </Link>
  )
}

/**
 * «Пополнить» — одно и то же действие на трёх списках подряд.
 *
 * Ссылкой кнопка стать не может: закрытая `Button` не принимает `className`,
 * а её `asChild` в нынешнем виде падает (см. отчёт). Поэтому переход идёт
 * через маршрутизатор, а не через `<a>`.
 */
function TopUpButton() {
  const navigate = useNavigate()

  return (
    <Button
      variant="primary"
      size="lg"
      block
      {...pressProps(() => void navigate({ to: "/m/balance/top-up" }))}
    >
      Пополнить
    </Button>
  )
}

/**
 * Остаток: число 40/600 и строка-объяснение 14/500 под ним, зазор 4.
 *
 * **Число здесь не всегда остаток.** На вкладке возвратов это «сколько заявок
 * и на какую сумму вернули за месяц», на пополнениях — сколько внесли. Одно
 * место экрана отвечает на вопрос открытой вкладки, а объяснение под числом
 * говорит, что именно посчитано. Без этой строки число врёт.
 */
function BalanceHero({ value, caption }: { value: string; caption: string }) {
  return (
    <div data-slot="balance-hero" className="flex w-full shrink-0 flex-col gap-1">
      <Typography variant="display" tone="default">
        {value}
      </Typography>
      <Typography variant="uiText" tone="secondary">
        {caption}
      </Typography>
    </div>
  )
}

/**
 * Три списка денег — три отдельных экрана, а не три состояния одного.
 *
 * У каждого своё крупное число наверху: остаток, возвращено за месяц,
 * пополнено за месяц. Разные ответы на разные вопросы, поэтому и адреса
 * разные — на любой из трёх можно дать ссылку.
 */
const BALANCE_SEGMENTS = [
  { label: "Списания", to: "/m/balance" },
  { label: "Возвраты", to: "/m/balance/refunds" },
  { label: "Пополнения", to: "/m/balance/top-ups" },
]

/**
 * Переключатель списка: три капсулы 44 с зазором 8.
 *
 * Не `FilterChip`: тот 28 высотой с подписью 13 — размер десктопного фильтра,
 * под палец не годится. Здесь 44, подпись 14 весом 500 в обоих состояниях.
 *
 * Выбранная капсула залита графитом целиком, а не подчёркнута: на телефоне
 * подчёркивание в 2 px теряется, а заливка читается боковым зрением.
 */
function BalanceSegments({ active }: { active: string }) {
  return (
    <nav data-slot="balance-segments" className="flex w-full shrink-0 gap-2">
      {BALANCE_SEGMENTS.map((segment) => {
        const on = segment.label === active
        return (
          <Link
            key={segment.label}
            to={segment.to}
            data-slot="balance-segment"
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full px-4",
              // Обводка, а не рамка: в файле она рисуется внутрь и ширину капсулы
              // не меняет. Рамкой каждая капсула стала бы на 2 px шире.
              "outline-solid outline-1 -outline-offset-1",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
              // Нажатие берёт вторую ступень сразу — наведения на телефоне нет.
              "transition-colors duration-120",
              on
                ? "bg-fg text-surface outline-fg active:bg-fg-press"
                : "bg-surface text-fg outline-border-control active:bg-warm-hover",
            )}
          >
            <Typography variant="uiText" tone="current" wrap="nowrap">
              {segment.label}
            </Typography>
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Строка истории: адрес 16/600, два приглушённых факта под ним, сумма справа.
 *
 * Строки разделены волосяной линией сверху, а не карточками: история денег —
 * однородный поток, и четыре карточки подряд превратили бы его в четыре события,
 * каждое из которых просит внимания.
 *
 * Линия нарисована внутренней тенью, а не рамкой: рамка добавила бы каждой строке
 * 21-й пиксель и сдвинула бы содержимое вниз на один.
 */
function OperationRow({
  title,
  what,
  when,
  amount,
  chip,
}: {
  title: string
  what: string
  when: string
  amount: string
  /** Судьба заявки на возврат. Есть только на вкладке возвратов. */
  chip?: ReactNode
}) {
  return (
    <div
      data-slot="balance-operation"
      className="flex w-full items-start gap-3 py-3 shadow-[inset_0_1px_0_var(--line-2)]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Typography variant="rowPrice" tone="default">
          {title}
        </Typography>
        <Typography variant="denseText" tone="dense">
          {what}
        </Typography>
        <Typography variant="denseText" tone="dense">
          {when}
        </Typography>
      </div>

      {chip === undefined ? (
        <div className="flex w-20 shrink-0 justify-end">
          <Typography variant="rowPrice" tone="default">
            {amount}
          </Typography>
        </div>
      ) : (
        <div className="flex w-24 shrink-0 flex-col items-end gap-1.5">
          <Typography variant="rowPrice" tone="default">
            {amount}
          </Typography>
          <>{chip}</>
        </div>
      )}
    </div>
  )
}

/**
 * Чип судьбы возврата: 24 / r-6 / 12 весом 500.
 *
 * Не `StatusChip`: у того набор подписей закрыт восемью состояниями объекта
 * («В работе», «Раскрыт», «Стоп-лист»…), а здесь состояние не объекта, а заявки
 * на деньги — «В обработке» и «Возвращено». Заливки и цвета подписи те же
 * токены `warn-tint`/`warn-text` и `ok-tint`/`ok-text`, что снято замером.
 *
 * **В списке сегодня стоит только «Возвращено».** Продукт зачисляет возврат
 * сразу, очереди рассмотрения за ним нет, и рисовать «В обработке» значило бы
 * обещать проверку, которой не происходит. Ожидание оставлено в компоненте —
 * оно снято с файла и понадобится, когда возвраты начнёт подтверждать сервер.
 */
function RefundChip({ tone, label }: { tone: "pending" | "done"; label: string }) {
  return (
    <span
      data-slot="refund-chip"
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-sm px-2",
        tone === "pending" ? "bg-warn-tint text-warn-text" : "bg-ok-tint text-ok-text",
      )}
    >
      <Typography variant="metaText" tone="current">
        {label}
      </Typography>
    </span>
  )
}

/* ── МОБАЙЛ · Баланс, списания (`hRN4n`) ──────────────────────────────────── */

/**
 * Строки списаний собираются из журнала раскрытий, а не пишутся руками.
 *
 * Прежде здесь лежали четыре чужие строки — чужие адреса и чужие имена, — и
 * ваши раскрытия в них не попадали НИКОГДА. Это были образцы текста из макета:
 * дизайнер пишет их, чтобы кадр не был пустым, а в коде они превратились в
 * данные и показывались живым людям.
 *
 * Своё имя заменяется на «вы»: человек не читает себя в третьем лице. Чужое
 * остаётся как есть — это и есть ответ на вопрос «кто тратит».
 */
function spendingRows(workspace: Workspace, now: number, me: string) {
  return workspace.disclosures.map((item) => {
    const who = item.by === me ? "вы" : item.by

    return {
      id: item.id,
      title: item.address,
      // Вторая строка всегда отвечает «за что». Пробное раскрытие и раскрытие
      // с оформленным возвратом стоят в истории на своих местах: журнал денег
      // обязан помнить и то, за что не заплатили.
      what: item.refunded
        ? `Раскрытие контакта, возврат · ${who}`
        : item.trial
          ? `Пробное раскрытие · ${who}`
          : `Раскрытие контакта · ${who}`,
      when: formatDay(item.at, now),
      amount: `${groupDigits(item.amount)} ₽`,
    }
  })
}

/**
 * МОБАЙЛ · Баланс (`hRN4n`) — список списаний.
 *
 * **В каждой строке написано, кто потратил.** Имя автора раскрытия — не
 * украшение истории, а единственное место продукта на телефоне, где руководитель
 * агентства видит, чьи именно раскрытия съели баланс. Без имени строка отвечала
 * бы только на вопрос «куда ушли деньги», но не на «кто их тратит».
 */
export function MobileBalancePage() {
  // Число берётся из сеанса: раскрытие контакта тут же уменьшает остаток,
  // и человек видит, куда ушли деньги, а не читает нарисованную цифру.
  const balance = useBalance()
  const session = useSession()
  const workspace = useWorkspace()
  const now = useNow()
  const rows = spendingRows(workspace, now, session?.name ?? "")

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Баланс" action={<DocumentsLink />} />}
      activeTab="balance"
      padded={false}
    >
      <MoneyBody>
        <BalanceHero
          value={`${groupDigits(balance)} ₽`}
          caption={`на счёте агентства · хватит на ${disclosures(balance)}`}
        />
        <TopUpButton />
        <BalanceSegments active="Списания" />
        <div className="flex w-full flex-col">
          {rows.length === 0 ? (
            <MobileEmptyState
              icon={Wallet}
              title="Списаний ещё не было"
              text="Здесь появится каждое движение денег: 199 ₽ за раскрытый контакт и 3 000 ₽ за доступ агентства."
            />
          ) : (
            rows.map((row) => (
              <OperationRow
                key={row.id}
                title={row.title}
                what={row.what}
                when={row.when}
                amount={row.amount}
              />
            ))
          )}
        </div>
      </MoneyBody>
    </MobileScreen>
  )
}

/* ── МОБАЙЛ · Баланс, возвраты (`nJc69`) ──────────────────────────────────── */

/**
 * Строки возвратов собираются из журнала возвратов.
 *
 * Возврат существует только тогда, когда его оформили: четыре строки, стоявшие
 * здесь раньше, были образцом текста из макета — чужие адреса, чужие имена и
 * причины, которых никто не называл.
 */
function refundRows(workspace: Workspace, now: number, me: string) {
  return workspace.refunds.map((item) => ({
    id: item.id,
    title: item.address,
    what: `${item.reason} · ${item.by === me ? "вы" : item.by}`,
    when: formatDay(item.at, now),
    amount: `${groupDigits(item.amount)} ₽`,
  }))
}

/**
 * МОБАЙЛ · Баланс, возвраты (`nJc69`).
 *
 * **Возвраты показаны не суммой, а долей: сколько заявок на сколько денег и
 * какой это процент раскрытий.** Доля — это оценка качества базы, а не
 * бухгалтерия: пять процентов брака агентство терпит, двадцать пять означают,
 * что продукт продаёт мусор. Число видно раньше списка, чтобы этот вопрос
 * задавался сам.
 *
 * Доли без раскрытий не существует: делить не на что, и «0 %» соврало бы про
 * качество базы. Тогда строка молчит о проценте, а не выдумывает его.
 *
 * Причина возврата стоит там же, где на вкладке списаний стояло «Раскрытие
 * контакта», — вторая строка всегда отвечает «за что», меняется только ответ.
 */
export function MobileBalanceRefundsPage() {
  const session = useSession()
  const workspace = useWorkspace()
  const now = useNow()
  const rows = refundRows(workspace, now, session?.name ?? "")

  const since = now - MONTH
  const monthly = workspace.refunds.filter((item) => item.at >= since)
  const returned = monthly.reduce((sum, item) => sum + item.amount, 0)
  const disclosed = disclosedSince(workspace, since)
  const share =
    disclosed > 0 ? ` · ${Math.round((monthly.length / disclosed) * 100)} % раскрытий` : ""

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Баланс" action={<DocumentsLink />} />}
      activeTab="balance"
      padded={false}
    >
      <MoneyBody>
        <BalanceHero
          value={`${monthly.length} / ${groupDigits(returned)} ₽`}
          caption={`возвращено за 30 дней${share}`}
        />
        <TopUpButton />
        <BalanceSegments active="Возвраты" />
        <div className="flex w-full flex-col">
          {rows.length === 0 ? (
            <MobileEmptyState
              icon={Undo2}
              title="Возвратов не было"
              text="Если по номеру ответил не собственник, возврат отмечается в панели звонка и деньги вернутся на счёт."
            />
          ) : (
            rows.map((row) => (
              <OperationRow
                key={row.id}
                title={row.title}
                what={row.what}
                when={row.when}
                amount={row.amount}
                // Деньги вернулись в момент оформления: другого состояния
                // у заявки сегодня не бывает, см. пояснение у `RefundChip`.
                chip={<RefundChip tone="done" label="Возвращено" />}
              />
            ))
          )}
        </div>
      </MoneyBody>
    </MobileScreen>
  )
}

/* ── МОБАЙЛ · Баланс, пополнения (`FA4Dt`) ────────────────────────────────── */

/**
 * Оплата картой — единственный способ без номера счёта.
 *
 * Способ записывается в журнал строкой в момент пополнения, и сравнение идёт
 * с ней, а не с придуманным перечислением: список способов задаёт тот, кто
 * пополняет, а не тот, кто показывает историю.
 */
function isCard(method: string) {
  return method === "карта"
}

/**
 * Номер счёта считается от порядка пополнений, а не хранится строкой.
 *
 * Пополнения лежат от новых к старым, а нумерация растёт со временем: у самого
 * свежего счёта самый большой номер. Точно так же он считается в кабинете на
 * большом экране — иначе бухгалтер получил бы два разных номера на один платёж.
 */
function invoiceNumber(total: number, index: number) {
  return total - index
}

/**
 * Строки пополнений собираются из журнала пополнений.
 *
 * Четыре строки, стоявшие здесь раньше, были образцом текста из макета: чужие
 * номера счетов и чужие двадцать тысяч у агентства, которое ещё ничего не
 * пополняло.
 */
function topUpRows(workspace: Workspace, now: number) {
  const total = workspace.topUps.length

  return workspace.topUps.map((item, index) => ({
    id: item.id,
    title: isCard(item.method) ? "Картой" : `Счёт № ${invoiceNumber(total, index)}`,
    // Деньги зачисляются в момент пополнения, поэтому «оплачен» — не обещание,
    // а факт: остаток наверху уже включает эту сумму.
    what: isCard(item.method) ? "Мгновенное зачисление" : "Счёт на юрлицо · оплачен",
    when: formatDay(item.at, now),
    amount: `${groupDigits(item.amount)} ₽`,
  }))
}

/**
 * МОБАЙЛ · Баланс, пополнения (`FA4Dt`).
 *
 * **Строка пополнения названа документом, а не суммой: «Счёт № 7».** Агентство
 * платит по счетам и сверяется с бухгалтерией по их номерам, поэтому номер стоит
 * там, где у списаний стоял адрес объекта, — на месте, которым строка себя называет.
 * Карта — исключение: у неё номера счёта нет, и она честно называется «Картой».
 */
export function MobileBalanceTopUpsPage() {
  const workspace = useWorkspace()
  const now = useNow()
  const rows = topUpRows(workspace, now)

  const monthly = workspace.topUps.filter((item) => item.at >= now - MONTH)
  const added = monthly.reduce((sum, item) => sum + item.amount, 0)

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Баланс" action={<DocumentsLink />} />}
      activeTab="balance"
      padded={false}
    >
      <MoneyBody>
        <BalanceHero
          value={`${groupDigits(added)} ₽`}
          caption={`пополнено за 30 дней · ${monthly.length} ${plural(monthly.length, "платёж", "платежа", "платежей")}`}
        />
        <TopUpButton />
        <BalanceSegments active="Пополнения" />
        <div className="flex w-full flex-col">
          {rows.length === 0 ? (
            <MobileEmptyState
              icon={ArrowDownToLine}
              title="Пополнений не было"
              text="Первое пополнение появится здесь. Пока идёт пробный старт: пять раскрытий не стоят ничего."
            />
          ) : (
            rows.map((row) => (
              <OperationRow
                key={row.id}
                title={row.title}
                what={row.what}
                when={row.when}
                amount={row.amount}
              />
            ))
          )}
        </div>
      </MoneyBody>
    </MobileScreen>
  )
}

/* ── МОБАЙЛ · Баланс, документы (`XxC6e`) ─────────────────────────────────── */

/** Те же три списка плюс сами документы — четвёртой вкладкой. */
const DOCUMENT_TABS = [
  ...BALANCE_SEGMENTS,
  { label: "Документы", to: "/m/balance/documents" },
]

/**
 * Переключатель с подчёркиванием: четыре вкладки 44 с зазором 16.
 *
 * Не `ResultTabs`: тот собран под десктопную выдачу — полоса 36, подписи 13,
 * сортировка и переключатель плотности в том же ряду. Здесь только вкладки.
 */
function DocumentTabs({ active }: { active: string }) {
  return (
    <nav
      data-slot="document-tabs"
      className="flex w-full shrink-0 items-center gap-4 shadow-[inset_0_-1px_0_var(--line-2)]"
    >
      {DOCUMENT_TABS.map((tab) => {
        const on = tab.label === active
        return (
          <Link
            key={tab.label}
            to={tab.to}
            data-slot="document-tab"
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 cursor-pointer items-center justify-center border-b-2 bg-transparent",
              "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg",
              // Вкладка отвечает подчёркиванием, а не заливкой: заливка
              // превратила бы её в кнопку. Ступени те же, что у вкладок выдачи.
              "transition-colors duration-120",
              on ? "border-fg active:border-fg-press" : "border-transparent active:border-line-3",
            )}
          >
            <Typography
              variant={on ? "controlLabel" : "uiText"}
              tone={on ? "default" : "dense"}
              wrap="nowrap"
            >
              {tab.label}
            </Typography>
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Документы собираются из пополнений, а не лежат списком.
 *
 * Три строки, стоявшие здесь раньше, были образцом текста из макета: счёт на
 * подписку за август, акт «на 35 422 ₽ за июнь» и чужие двадцать тысяч —
 * у агентства, которое ещё ничего не пополняло.
 *
 * **Актов здесь пока нет, и выдумывать их нельзя.** Списание за доступ
 * агентства в продукте ещё не происходит: первого числа никто ничего не
 * снимает, значит и закрывать актом нечего.
 */
function documentRows(workspace: Workspace) {
  const total = workspace.topUps.length

  return workspace.topUps.map((item, index) => ({
    id: item.id,
    title: `Счёт № ${invoiceNumber(total, index)}`,
    meta: `${formatMoment(item.at)} · оплачен и зачислен`,
    amount: `${groupDigits(item.amount)} ₽`,
  }))
}

/**
 * Карточка документа: 64 / r-10 / поля 14.
 *
 * **Скачивает вся карточка, а не значок стрелки.** В файле стрелка нарисована
 * глифом 18 — под палец это вдвое меньше нормы, и обвести её кнопкой 44 нельзя,
 * не сломав раскладку карточки. Поэтому карточка сама и есть кнопка: у неё
 * высота 64, попасть нельзя не туда. Стрелка осталась указателем, а не мишенью.
 *
 * Скачивание — это файл, а не экран: показывать после него нечего, и действие
 * названо вместо того, чтобы рисовать выдуманное подтверждение.
 */
function DocumentRow({
  title,
  meta,
  amount,
}: {
  title: string
  meta: string
  amount: string
}) {
  return (
    <button
      type="button"
      data-action="скачать документ"
      data-slot="balance-document"
      aria-label={`Скачать: ${title}`}
      className="flex h-16 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-line-2 bg-surface px-3.5 transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <FileText aria-hidden className="size-4.5 shrink-0 text-text-dense" strokeWidth={2} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <Typography variant="strongText" tone="default">
          {title}
        </Typography>
        <Typography variant="metaText" tone="dense">
          {meta}
        </Typography>
      </div>
      <Typography variant="controlLabel" tone="default">
        {amount}
      </Typography>
      <Download aria-hidden className="size-4.5 shrink-0 text-text-2" strokeWidth={2} />
    </button>
  )
}

/**
 * МОБАЙЛ · Баланс, документы (`XxC6e`).
 *
 * **Закрывающие документы — не бухгалтерская формальность, а условие покупки.**
 * Агентство на юрлице не может провести раскрытия по бухгалтерии без счёта и акта,
 * поэтому раздел стоит внутри денег, а не в настройках, и снизу прямо написано,
 * когда документы приходят и на какое юрлицо выставляются.
 *
 * Вторую линию выручки — счёт за доступ агентства и акт за раскрытия — здесь
 * пока не видно: подписка ещё не списывается, и рисовать её документы значило бы
 * обещать бухгалтеру бумаги, которых не существует.
 */
export function MobileBalanceDocumentsPage() {
  const balance = useBalance()
  const workspace = useWorkspace()
  const legalEntity = useLegalEntity()
  const documents = documentRows(workspace)

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Баланс" />}
      activeTab="balance"
      padded={false}
    >
      <MoneyBody>
        <BalanceHero
          value={`${groupDigits(balance)} ₽`}
          caption={`на счёте агентства · хватит на ${disclosures(balance)}`}
        />
        <TopUpButton />
        <DocumentTabs active="Документы" />
        <div className="flex w-full flex-col gap-2">
          {documents.length === 0 ? (
            <MobileEmptyState
              icon={FileText}
              title="Документов пока нет"
              text="Счёт появляется здесь сразу после пополнения баланса. Любой из них можно скачать повторно, номер не меняется."
            />
          ) : (
            documents.map((doc) => (
              <DocumentRow key={doc.id} title={doc.title} meta={doc.meta} amount={doc.amount} />
            ))
          )}
        </div>
        <Typography variant="metaText" tone="dense">
          {`Счёт и акт приходят первого числа. Документы выставляются на ${legalEntity}.`}
        </Typography>
      </MoneyBody>
    </MobileScreen>
  )
}

/* ── МОБАЙЛ · Пополнить баланс (`NhUOQ`) ──────────────────────────────────── */

/**
 * Четыре суммы числами, а не подписями.
 *
 * Подсказка справа считается тут же из цены раскрытия, а не хранится строкой:
 * сумма и её перевод в звонки не должны иметь возможности разъехаться.
 */
const AMOUNTS = [5000, 10000, 20000, 50000]

/**
 * Строка суммы: 56 / r-10 / поля 14, кружок выбора 18 слева.
 *
 * **Справа от суммы всегда стоит пересчёт в раскрытия.** Человек выбирает не
 * «сколько денег внести», а «на сколько звонков хватит», и подсказка избавляет
 * его от деления в уме прямо в момент решения.
 *
 * Кружок нарисован кольцом, а не точкой в кольце: в файле это эллипс с дыркой —
 * тонкое кольцо у невыбранных, толстое графитовое у выбранной. Толщины 1,35 и
 * 4,95 не выдуманы, а посчитаны из доли выреза (0,85 и 0,45 от радиуса 9).
 */
function AmountRow({
  rub,
  selected,
  onPress,
}: {
  rub: number
  selected: boolean
  onPress: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="top-up-amount"
      className={cn(
        "flex h-14 w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3.5",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        // Выбранная сумма уже тёплая, поэтому нажатие уходит на `warm-press`;
        // невыбранная белая — на `warm-hover`. Одна лестница, разные точки входа.
        "transition-colors duration-120",
        selected
          ? "border-fg bg-warm active:bg-warm-press"
          : "border-border-control bg-surface active:bg-warm-hover",
      )}
      {...pressProps(onPress)}
    >
      <span
        aria-hidden
        className={cn(
          "size-4.5 shrink-0 rounded-full",
          selected ? "border-[4.95px] border-fg" : "border-[1.35px] border-border-control",
        )}
      />
      <Typography variant="rowPrice" tone="default">
        {`${groupDigits(rub)} ₽`}
      </Typography>
      <span className="h-px flex-1" />
      <Typography variant="denseText" tone="dense" wrap="nowrap">
        {disclosures(rub)}
      </Typography>
    </button>
  )
}

/** Способ оплаты: две капсулы 44 во всю ширину, выбранная залита графитом. */
function MethodChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="top-up-method"
      className={cn(
        "flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full border",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        "transition-colors duration-120",
        selected
          ? "border-fg bg-fg text-surface active:border-fg-press active:bg-fg-press"
          : "border-border-control bg-surface text-text-2 active:bg-warm-hover",
      )}
      {...pressProps(onPress)}
    >
      <Typography
        variant={selected ? "controlLabel" : "uiText"}
        tone="current"
        wrap="nowrap"
      >
        {label}
      </Typography>
    </button>
  )
}

/**
 * МОБАЙЛ · Пополнить баланс (`NhUOQ`).
 *
 * **Кнопка внизу говорит, что произойдёт: «Скачать счёт на 20 000 ₽».** Оплата
 * счётом юрлицу не заканчивается нажатием — заканчивается файлом, который уйдёт
 * бухгалтеру. Кнопка называет результат, а не намерение, поэтому никто не ждёт,
 * что деньги появятся сразу.
 *
 * Сводка над кнопкой закрывает три вопроса разом: сколько спишется, каким станет
 * остаток и что деньги не сгорают. Последнее особенно важно: без этой строки
 * агентство берёт минимальную сумму на пробу и возвращается к пополнению каждую
 * неделю.
 *
 * Кнопка прижата к низу распоркой, а не приклеена: содержимое короче экрана,
 * и без распорки действие висело бы посреди пустоты.
 */
export function MobileTopUpPage() {
  const balance = useBalance()
  const legalEntity = useLegalEntity()
  const { topUp } = useSessionActions()
  const [amount, setAmount] = useState(20000)
  const [method, setMethod] = useState("Счёт юрлицу")

  /**
   * Сколько зачислили — или `null`, пока не зачисляли.
   *
   * Сумма запоминается в момент нажатия: список сумм остаётся живым под
   * затемнением, и случайное касание сменило бы число в подтверждении
   * на то, которого человек не вносил.
   */
  const [credited, setCredited] = useState<number | null>(null)

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Пополнить баланс" back />}
      activeTab="balance"
      padded={false}
    >
      <MoneyBody gap={20}>
        <div className="flex w-full shrink-0 flex-col gap-2">
          <Typography variant="columnHeader" tone="dense">
            СУММА
          </Typography>
          <div role="radiogroup" aria-label="Сумма пополнения" className="flex w-full flex-col gap-2">
            {AMOUNTS.map((rub) => (
              <AmountRow
                key={rub}
                rub={rub}
                selected={rub === amount}
                onPress={() => setAmount(rub)}
              />
            ))}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2">
          <Typography variant="columnHeader" tone="dense">
            СПОСОБ
          </Typography>
          <div role="radiogroup" aria-label="Способ оплаты" className="flex w-full gap-2">
            {["Счёт юрлицу", "Картой"].map((label) => (
              <MethodChip
                key={label}
                label={label}
                selected={label === method}
                onPress={() => setMethod(label)}
              />
            ))}
          </div>
        </div>

        {/* Сводка пересчитывается вместе с выбранной суммой и настоящим
            остатком: строка, которая обещает остаток, обязана обещать
            настоящий. */}
        <div className="flex w-full shrink-0 flex-col gap-2 rounded-lg bg-warm p-3.5">
          <Typography variant="strongText" tone="default">
            {`Спишется ${groupDigits(amount)} ₽. Остаток станет ${groupDigits(balance + amount)} ₽, это ${disclosures(balance + amount)}.`}
          </Typography>
          <Typography variant="metaText" tone="dense">
            {`Деньги не сгорают. Возврат за брак приходит на баланс, а не на карту. Счёт и акт выставляются на ${legalEntity} первого числа.`}
          </Typography>
        </div>

        <div className="flex-1" />

        {/* Подпись кнопки остаётся счётом и при выборе «Картой» — оплаты
            картой в файле не нарисовано, см. отчёт.

            Единственная кнопка этого файла на `onClick`, а не на `pressProps`.
            Остальные отвечают по касанию, потому что отклик в сто миллисекунд
            читается как поломка; здесь касание списывает и зачисляет деньги,
            и палец, начавший прокрутку с кнопки, не имеет права их двинуть. */}
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() => {
            // Способ уходит в журнал теми же словами, что и на компьютере:
            // список пополнений сравнивает строку с «карта», и «Картой»
            // из подписи чипа превратилась бы там в счёт на юрлицо.
            topUp(amount, method === "Картой" ? "карта" : "счёт на юрлицо")
            setCredited(amount)
          }}
        >
          {`Скачать счёт на ${groupDigits(amount)} ₽`}
        </Button>
      </MoneyBody>

      {/* МОБАЙЛ · Баланс пополнен (`l9WNps`). Лист, а не сообщение: деньги
          оставляют постоянный след, и подтверждение ждёт, пока его прочтут. */}
      {credited === null ? null : <TopUpDoneSheet amount={credited} />}
    </MobileScreen>
  )
}

/* ── МОБАЙЛ · Заявка на возврат (`B8BQ8`) ─────────────────────────────────── */

/**
 * Три причины возврата — и у каждой своя цена для агентства.
 *
 * **«Оказался посредник» — суждение агента, а не брак данных.** Номера,
 * которого не существует, и объекта, который уже продан, в базе быть не
 * должно: ошибся продукт, и такой возврат в лимит не считается. А кто именно
 * взял трубку — вывод человека, проверить его нечем, и потому спорные
 * возвраты ограничены двенадцатью за тридцать дней. Ровно так этот список
 * разделён в шапке вкладки возвратов: «объективные причины в лимит не
 * считаются: номер не существует, объект продан, согласие отозвано».
 *
 * До этого разделения все три уходили объективными, и кадр «Лимит возвратов
 * исчерпан» (`exztG`) было нечем показать: до него нельзя было дойти.
 */
const REASONS = [
  { label: "Номера не существует", objective: true },
  { label: "Оказался посредник", objective: false },
  { label: "Объект уже продан", objective: true },
] as const

type RefundReason = (typeof REASONS)[number]

/**
 * Чем кончилась отправка заявки — тем, что вернул журнал, а не тем, что
 * решил экран.
 *
 * Сумма и адрес запоминаются здесь, а не читаются заново: после возврата
 * то самое раскрытие помечено возвращённым, и поиск «последнего оплаченного
 * без возврата» отдал бы уже следующее — то есть подтверждение назвало бы
 * чужой объект.
 */
type RefundOutcome =
  | { kind: "sent"; amount: number; address: string; objective: boolean }
  | { kind: "limit" }

/**
 * Причина возврата: строка 48 / r-12 с кружком 20.
 *
 * Выбранная строка отличается тёплой заливкой и залитым графитом кружком; граница
 * у всех трёх одинаковая, приглушённая. Так в файле.
 */
function ReasonRow({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="refund-reason"
      className={cn(
        "flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-border-control px-4",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        "transition-colors duration-120",
        selected ? "bg-warm active:bg-warm-press" : "bg-transparent active:bg-warm-hover",
      )}
      {...pressProps(onPress)}
    >
      <span
        aria-hidden
        className={cn(
          "size-5 shrink-0 rounded-full",
          selected ? "bg-fg" : "border border-border-control",
        )}
      />
      <Typography variant="uiText" tone="default">
        {label}
      </Typography>
    </button>
  )
}

/**
 * Тихая капсула 48 для «Отмены».
 *
 * Не `Button variant="quiet" size="lg"`: у закрытой кнопки на ступени 48 радиус 12,
 * капсула оставлена только главному действию и списанию. В файле «Отмена»
 * нарисована капсулой — воспроизводим файл, но отдельным контролом, а не правкой
 * общей лестницы: менять её из-за одного экрана нельзя.
 *
 * Собранная руками, она принимает адрес — и «Отмена» закрывает лист возвратом
 * в тот список, поверх которого он открылся.
 */
function SheetQuietPill({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      data-slot="sheet-quiet-pill"
      className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-warm px-6 transition-colors duration-120 outline-none active:bg-warm-press focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <Typography variant="controlLabelLg" tone="default">
        {children}
      </Typography>
    </Link>
  )
}

/**
 * МОБАЙЛ · Заявка на возврат (`B8BQ8`).
 *
 * **Возврат — лист снизу, а не экран.** Заявку подают из строки списания, не
 * уходя из истории: человек уже нашёл нужное раскрытие, и увести его на отдельный
 * экран значило бы заставить искать заново, если он передумает.
 *
 * Причин ровно три: номера нет, ответил посредник, объект продан. «Не понравился
 * разговор» в списке отсутствует намеренно — деньги возвращают за брак данных,
 * а не за неудачный звонок. Две причины из трёх объективные и закрываются сразу,
 * «посредник» — спорная и тратит одну из двенадцати попыток за месяц.
 *
 * Заголовок листа называет сумму — «Вернуть 199 ₽», — а не действие: человек
 * подтверждает не форму, а деньги. Сумма и объект берутся из журнала раскрытий:
 * адрес «Ленская ул., 10» и время «сегодня в 14:12», стоявшие здесь раньше,
 * были образцом текста из макета и не менялись никогда.
 *
 * **Ответ на отправку — лист, а не всплывающее сообщение.** Возврат двигает
 * деньги агентства, и след от него обязан дождаться, пока его прочтут:
 * `m0ATRJ`, когда деньги вернулись, и `exztG`, когда лимит спорных возвратов
 * исчерпан и заявка ушла человеку на разбор.
 */
export function MobileRefundRequestPage() {
  const workspace = useWorkspace()
  const now = useNow()
  const router = useRouter()
  const { refund } = useSessionActions()

  /**
   * Возврат оформляется за конкретное раскрытие, а не «вообще».
   *
   * Ссылки с адресом объекта у листа пока нет — в продукте на него ничто не
   * ведёт, — поэтому берётся последнее оплаченное раскрытие без возврата:
   * ровно то, за что человек только что заплатил. Пробные раскрытия не в счёт:
   * они ничего не стоили, и возвращать за них нечего.
   */
  const target = workspace.disclosures.find((item) => !item.trial && !item.refunded)

  /** Выбранная причина. Одна из трёх, по умолчанию первая — так в файле. */
  const [reason, setReason] = useState<RefundReason>(REASONS[0])
  const [outcome, setOutcome] = useState<RefundOutcome | null>(null)

  /**
   * Ответ листа стоит ВЫШЕ проверки «есть ли что возвращать», и это не порядок
   * ради порядка. После удачного возврата то раскрытие помечено возвращённым;
   * если оно было последним оплаченным, `target` становится пустым — и человек
   * вместо «Заявка отправлена» увидел бы «Возвращать пока нечего» за секунду
   * до того, как деньги пришли.
   */
  if (outcome?.kind === "sent") {
    return (
      <RefundSentSheet
        amount={outcome.amount}
        address={outcome.address}
        objective={outcome.objective}
        // «Понятно» уводит туда, откуда пришли за возвратом: лист открыт
        // поверх списка, и возвращать человека в форму заявки, которую он
        // уже отправил, значит предлагать отправить её второй раз.
        onClose={() => router.history.back()}
      />
    )
  }

  if (outcome?.kind === "limit") {
    return <RefundLimitSheet onCancel={() => setOutcome(null)} />
  }

  // Возвращать нечего — значит лист говорит об этом и предлагает единственный
  // осмысленный выход. Показывать три причины возврата над несуществующим
  // раскрытием было бы формой ради формы.
  if (target === undefined) {
    return (
      <MobileSheet
        title="Возвращать пока нечего"
        text={`Возврат оформляется за оплаченное раскрытие: если по номеру ответил не собственник, ${DISCLOSURE_PRICE} ₽ вернутся на счёт агентства.`}
      >
        <SheetQuietPill to="/m/balance">К балансу</SheetQuietPill>
      </MobileSheet>
    )
  }

  return (
    <MobileSheet
      title={`Вернуть ${groupDigits(target.amount)} ₽`}
      // Обе половины правила названы до выбора, а не после: спорная причина
      // тратит одну из двенадцати попыток за месяц, и узнать об этом человек
      // должен раньше, чем нажмёт, а не в подтверждении.
      text={`${target.address} · раскрыто ${formatDay(target.at, now)}. Объективная причина закрывается сразу, спорная считается в лимит.`}
    >
      {/*
        Обе группы отданы одним ребёнком: контейнер листа держит зазор 8, а между
        списком причин и действиями в файле 20. Один ребёнок зазор контейнера
        не показывает, и раскладка получается ровно файловой.
      */}
      <div className="flex w-full flex-col gap-5">
        <div role="radiogroup" aria-label="Причина возврата" className="flex w-full flex-col gap-2">
          {REASONS.map((item) => (
            <ReasonRow
              key={item.label}
              label={item.label}
              selected={item.label === reason.label}
              onPress={() => setReason(item)}
            />
          ))}
        </div>

        <div className="flex w-full flex-col gap-2">
          {/*
            Отправка на `onClick`, а не на `pressProps`: остальной файл отвечает
            по касанию ради скорости, но здесь касание двигает деньги, и палец,
            начавший прокрутку с кнопки, не имеет права их вернуть.

            Проверки живут в журнале, а не здесь: «за это уже возвращали» и
            «лимит исчерпан» знает только он, а четыре экрана с четырьмя копиями
            условия разъехались бы на пятом.
          */}
          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => {
              const result = refund(target.address, reason.label, reason.objective)

              if (result === "ok") {
                setOutcome({
                  kind: "sent",
                  amount: target.amount,
                  address: target.address,
                  objective: reason.objective,
                })
                return
              }

              if (result === "limit") {
                setOutcome({ kind: "limit" })
                return
              }

              // «Уже возвращали» и «нечего возвращать» — не подтверждение
              // денежного действия, а отказ: денег никто не двигал. Сообщением
              // об ошибке ему быть можно, и оно держится, пока его не закроют.
              notifyError(
                result === "already"
                  ? "За этот контакт возврат уже брали"
                  : "Возврат оформляется за оплаченное раскрытие",
              )
            }}
          >
            Отправить заявку
          </Button>
          {/* «Отмена» возвращает в историю списаний — туда, откуда лист открыт:
              человек уже нашёл нужное раскрытие и не должен искать его заново. */}
          <SheetQuietPill to="/m/balance">Отмена</SheetQuietPill>
        </div>
      </div>
    </MobileSheet>
  )
}
