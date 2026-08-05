import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowDownToLine, Download, FileText, Undo2, Wallet } from "lucide-react"
import { useState } from "react"
import type { MouseEvent, ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useOwnAgency, useSession } from "@/features/auth"
import { MobileEmptyState, MobileScreen, MobileSectionHeader, MobileSheet } from "@/features/cabinet"
import { groupDigits, plural } from "@/features/listings"
import { cn } from "@/lib/utils"

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
const DISCLOSURE_PRICE = 199

/** «43 раскрытия», «100 раскрытий», «251 раскрытие» — счёт со склонением. */
function disclosures(rubles: number) {
  const count = Math.floor(rubles / DISCLOSURE_PRICE)
  return `${count} ${plural(count, "раскрытие", "раскрытия", "раскрытий")}`
}

/** Остаток на счету агентства. Без сеанса остаётся число стенда. */
function useBalance() {
  const session = useSession()
  return session?.balance ?? 8610
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
      className="flex h-11 shrink-0 cursor-pointer items-center bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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
 * **Число здесь не всегда остаток.** На вкладке возвратов это «9 / 1 791 ₽» —
 * сколько заявок и на какую сумму вернули за месяц, на пополнениях — сколько
 * внесли. Одно место экрана отвечает на вопрос открытой вкладки, а объяснение
 * под числом говорит, что именно посчитано. Без этой строки число врёт.
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
              on
                ? "bg-fg text-surface outline-fg"
                : "bg-surface text-fg outline-border-control",
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

const SPENDINGS = [
  {
    title: "Ленская ул., 10",
    what: "Раскрытие контакта · вы",
    when: "Сегодня, 14:12",
    amount: "199 ₽",
  },
  {
    title: "Индустриальный пр., 26",
    what: "Раскрытие контакта · Анна Т.",
    when: "Сегодня, 11:47",
    amount: "199 ₽",
  },
  {
    title: "Заневский пр., 32",
    what: "Раскрытие контакта · Пётр Г.",
    when: "Сегодня, 09:38",
    amount: "199 ₽",
  },
  {
    title: "Наставников пр., 34",
    what: "Раскрытие контакта · вы",
    when: "23.07, 09:20",
    amount: "199 ₽",
  },
]

/**
 * МОБАЙЛ · Баланс (`hRN4n`) — список списаний.
 *
 * **В каждой строке написано, кто потратил.** «вы», «Анна Т.», «Пётр Г.» — это
 * не украшение истории, а единственное место продукта, где руководитель агентства
 * видит, чьи именно раскрытия съели баланс. Без имени строка отвечала бы только
 * на вопрос «куда ушли деньги», но не на «кто их тратит».
 */
export function MobileBalancePage() {
  // Число берётся из сеанса: раскрытие контакта тут же уменьшает остаток,
  // и человек видит, куда ушли деньги, а не читает нарисованную цифру.
  const balance = useBalance()
  // Свой кабинет начинается пустым: чужие списания сюда не переходят.
  const own = useOwnAgency()

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
          {own ? (
            <MobileEmptyState
              icon={Wallet}
              title="Списаний ещё не было"
              text="Здесь появится каждое движение денег: 199 ₽ за раскрытый контакт и 3 000 ₽ за доступ агентства."
            />
          ) : (
          SPENDINGS.map((row) => (
              <OperationRow key={row.title} {...row} />
            ))
          )}
        </div>
      </MoneyBody>
    </MobileScreen>
  )
}

/* ── МОБАЙЛ · Баланс, возвраты (`nJc69`) ──────────────────────────────────── */

const REFUNDS = [
  {
    title: "Индустриальный пр., 26",
    what: "Это агент, посредник · Анна Т.",
    when: "Сегодня, 15:40",
    amount: "199 ₽",
    tone: "pending" as const,
    status: "В обработке",
  },
  {
    title: "Товарищеский пр., 22",
    what: "Номер не существует · Анна Т.",
    when: "23.07, 17:20",
    amount: "199 ₽",
    tone: "done" as const,
    status: "Возвращено",
  },
  {
    title: "Энтузиастов пр., 47",
    what: "Номер чужой · Дмитрий К.",
    when: "23.07, 12:40",
    amount: "199 ₽",
    tone: "done" as const,
    status: "Возвращено",
  },
  {
    title: "Наставников пр., 34",
    what: "Собственник отозвал согласие · вы",
    when: "23.07, 10:05",
    amount: "199 ₽",
    tone: "done" as const,
    status: "Возвращено",
  },
]

/**
 * МОБАЙЛ · Баланс, возвраты (`nJc69`).
 *
 * **Возвраты показаны не суммой, а долей: «9 / 1 791 ₽ · 5 % раскрытий».**
 * Доля — это оценка качества базы, а не бухгалтерия: пять процентов брака агентство
 * терпит, двадцать пять означают, что продукт продаёт мусор. Число видно раньше
 * списка, чтобы этот вопрос задавался сам.
 *
 * Причина возврата стоит там же, где на вкладке списаний стояло «Раскрытие
 * контакта», — вторая строка всегда отвечает «за что», меняется только ответ.
 */
export function MobileBalanceRefundsPage() {
  // Свой кабинет начинается пустым: чужие строки сюда не переходят.
  const own = useOwnAgency()

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Баланс" action={<DocumentsLink />} />}
      activeTab="balance"
      padded={false}
    >
      <MoneyBody>
        <BalanceHero
          value="9 / 1 791 ₽"
          caption="возвращено за 30 дней · 5 % раскрытий"
        />
        <TopUpButton />
        <BalanceSegments active="Возвраты" />
        <div className="flex w-full flex-col">
          {own ? (
            <MobileEmptyState
              icon={Undo2}
              title="Возвратов не было"
              text="Если по номеру ответил не собственник, возврат отмечается в панели звонка и деньги вернутся на счёт."
            />
          ) : (
          REFUNDS.map((row) => (
              <OperationRow
                key={row.title}
                title={row.title}
                what={row.what}
                when={row.when}
                amount={row.amount}
                chip={<RefundChip tone={row.tone} label={row.status} />}
              />
            ))
          )}
        </div>
      </MoneyBody>
    </MobileScreen>
  )
}

/* ── МОБАЙЛ · Баланс, пополнения (`FA4Dt`) ────────────────────────────────── */

const TOP_UPS = [
  {
    title: "Счёт № 1042",
    what: "Счёт на юрлицо · оплачен",
    when: "Сегодня, 09:12",
    amount: "20 000 ₽",
  },
  {
    title: "Счёт № 1035",
    what: "Счёт на юрлицо · оплачен",
    when: "14.07, 11:20",
    amount: "20 000 ₽",
  },
  {
    title: "Картой",
    what: "Мгновенное зачисление · вы",
    when: "28.06, 19:05",
    amount: "5 000 ₽",
  },
  {
    title: "Счёт № 1021",
    what: "Счёт на юрлицо · оплачен",
    when: "04.07, 15:40",
    amount: "20 000 ₽",
  },
]

/**
 * МОБАЙЛ · Баланс, пополнения (`FA4Dt`).
 *
 * **Строка пополнения названа документом, а не суммой: «Счёт № 1042».** Агентство
 * платит по счетам и сверяется с бухгалтерией по их номерам, поэтому номер стоит
 * там, где у списаний стоял адрес объекта, — на месте, которым строка себя называет.
 * Карта — исключение: у неё номера счёта нет, и она честно называется «Картой».
 */
export function MobileBalanceTopUpsPage() {
  // Свой кабинет начинается пустым: чужие строки сюда не переходят.
  const own = useOwnAgency()

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Баланс" action={<DocumentsLink />} />}
      activeTab="balance"
      padded={false}
    >
      <MoneyBody>
        <BalanceHero
          value="65 000 ₽"
          caption="пополнено за 30 дней · четыре платежа"
        />
        <TopUpButton />
        <BalanceSegments active="Пополнения" />
        <div className="flex w-full flex-col">
          {own ? (
            <MobileEmptyState
              icon={ArrowDownToLine}
              title="Пополнений не было"
              text="Первое пополнение появится здесь. Пока идёт пробный старт: пять раскрытий не стоят ничего."
            />
          ) : (
          TOP_UPS.map((row) => (
              <OperationRow key={row.title} {...row} />
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
              on ? "border-fg" : "border-transparent",
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

const DOCUMENTS = [
  {
    title: "Счёт на подписку",
    meta: "01.08.2026 · доступ агентства за август",
    amount: "3 000 ₽",
  },
  {
    title: "Акт об оказанных услугах",
    meta: "01.07.2026 · раскрытия за июнь",
    amount: "35 422 ₽",
  },
  {
    title: "Счёт на пополнение",
    meta: "01.07.2026 · оплачен",
    amount: "20 000 ₽",
  },
]

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
      className="flex h-16 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-line-2 bg-surface px-3.5 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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
 * Тут же видно и вторую линию выручки: счёт на подписку (3 000 ₽ за доступ) стоит
 * рядом с актом за раскрытия (35 422 ₽ за июнь) — абонентская плата и поштучная
 * оплата в одном списке.
 */
export function MobileBalanceDocumentsPage() {
  const balance = useBalance()

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
          {DOCUMENTS.map((doc) => (
            <DocumentRow key={doc.title} {...doc} />
          ))}
        </div>
        <Typography variant="metaText" tone="dense">
          Счёт и акт приходят первого числа. Документы выставляются на ООО «Невский
          проспект», ИНН 7806154392.
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
        selected ? "border-fg bg-warm" : "border-border-control bg-surface",
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
        selected
          ? "border-fg bg-fg text-surface"
          : "border-border-control bg-surface text-text-2",
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
  const [amount, setAmount] = useState(20000)
  const [method, setMethod] = useState("Счёт юрлицу")

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

        {/* Сводка пересчитывается вместе с выбранной суммой: строка, которая
            обещает остаток, обязана обещать настоящий. Числа те же, что были
            нарисованы, — при сумме 20 000 ₽ они совпадают дословно. */}
        <div className="flex w-full shrink-0 flex-col gap-2 rounded-lg bg-warm p-3.5">
          <Typography variant="strongText" tone="default">
            {`Спишется ${groupDigits(amount)} ₽. Остаток станет ${groupDigits(balance + amount)} ₽, это ${disclosures(balance + amount)}.`}
          </Typography>
          <Typography variant="metaText" tone="dense">
            Деньги не сгорают. Возврат за брак приходит на баланс, а не на карту.
            Счёт и акт выставляются на ООО «Невский проспект» первого числа.
          </Typography>
        </div>

        <div className="flex-1" />

        {/* Счёт — это файл для бухгалтера, а не экран продукта: показывать
            после нажатия нечего, и деньги на счёт от скачивания не приходят.
            Действие названо. Подпись кнопки остаётся счётом и при выборе
            «Картой» — оплаты картой в файле не нарисовано, см. отчёт. */}
        <Button
          variant="primary"
          size="lg"
          block
          data-action="скачать счёт на пополнение"
        >
          {`Скачать счёт на ${groupDigits(amount)} ₽`}
        </Button>
      </MoneyBody>
    </MobileScreen>
  )
}

/* ── МОБАЙЛ · Заявка на возврат (`B8BQ8`) ─────────────────────────────────── */

const REASONS = ["Номера не существует", "Оказался посредник", "Объект уже продан"]

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
        selected ? "bg-warm" : "bg-transparent",
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
      className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-warm px-6 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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
 * Причин ровно три, все — объективный брак данных: номера нет, ответил посредник,
 * объект продан. «Не понравился разговор» в списке отсутствует намеренно: возврат
 * тут закрывается автоматически («объективная причина закрывается сразу»), и любая
 * субъективная причина сделала бы это невозможным.
 *
 * Заголовок листа называет сумму — «Вернуть 199 ₽», — а не действие: человек
 * подтверждает не форму, а деньги.
 */
export function MobileRefundRequestPage() {
  /** Выбранная причина. Одна из трёх, по умолчанию первая — так в файле. */
  const [reason, setReason] = useState(REASONS[0])

  return (
    <MobileSheet
      title="Вернуть 199 ₽"
      text="Ленская ул., 10 · раскрыто сегодня в 14:12. Объективная причина закрывается сразу."
    >
      {/*
        Обе группы отданы одним ребёнком: контейнер листа держит зазор 8, а между
        списком причин и действиями в файле 20. Один ребёнок зазор контейнера
        не показывает, и раскладка получается ровно файловой.
      */}
      <div className="flex w-full flex-col gap-5">
        <div role="radiogroup" aria-label="Причина возврата" className="flex w-full flex-col gap-2">
          {REASONS.map((label) => (
            <ReasonRow
              key={label}
              label={label}
              selected={label === reason}
              onPress={() => setReason(label)}
            />
          ))}
        </div>

        <div className="flex w-full flex-col gap-2">
          {/* Заявку принимает сервер, которого за демонстрацией нет.
              Экрана «заявка принята» в файле тоже нет. Действие названо. */}
          <Button
            variant="primary"
            size="lg"
            block
            data-action={`заявка на возврат: ${reason}`}
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
