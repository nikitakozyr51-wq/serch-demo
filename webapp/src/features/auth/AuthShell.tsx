import type { ReactNode } from "react"

import { Typography } from "@/components/typography"

/**
 * Каркас экранов входа.
 *
 * Снято с `tIplu`, `V3seY`, `C1oCj`, `G6S9d`, `pIdgz`, `iziCH`, `INCeL`,
 * `RfL9b`: кадр 1440 × 1024 делится на форму 920 с полями [64, 72]
 * и тёплую панель 520 с полями [64, 48].
 *
 * **Правая панель — не украшение и не «маркетинг сбоку».** Она отвечает
 * на вопрос, который человек задаёт в момент регистрации: что я получу
 * и сколько это стоит. Поэтому там шаги, две цены и состав — и это одни
 * и те же цифры, что в продукте: 199 ₽ за контакт, 3 000 ₽ за агентство.
 *
 * **Внизу панели всегда одна и та же строка про защиту базы.** Выгрузка
 * номеров пачкой недоступна никому, включая руководителя. Это главный
 * страх агентства при подключении чужого сервиса, и отвечать на него нужно
 * до регистрации, а не после.
 *
 * Ритм внутри формы задан пустыми распорками, а не зазором: расстояния между
 * блоками разные — 34, 24, 32, 26, 28, — и общий `gap` их бы сравнял.
 */

type Step = { title: string; note: string }
type Price = { value: string; note: string }
type Item = { title: string; note: string }

const STEPS: Step[] = [
  { title: "Подтвердите почту", note: "письмо придёт в течение минуты" },
  { title: "Выберите район", note: "четыре готовых пресета, поиск соберётся сам" },
  {
    title: "Позвоните первому собственнику",
    note: "на счету 5 пробных раскрытий, деньги не нужны",
  },
]

const PRICES: Price[] = [
  {
    value: "199 ₽",
    note: "за раскрытый контакт. Вернём в один клик, если это не собственник.",
  },
  {
    value: "3 000 ₽ в месяц",
    note: "за агентство целиком, а не за каждого сотрудника.",
  },
]

const INCLUDED: Item[] = [
  { title: "Склейка дублей", note: "один объект вместо четырёх объявлений" },
  { title: "История цены и срок", note: "сколько висит и как менялась цена" },
  { title: "Кто из коллег уже звонил", note: "второй звонок собственнику не уйдёт" },
  { title: "Стоп-лист агентства", note: "отказ собственника исполняется навсегда" },
]

const LEGAL =
  "Оператор персональных данных, уведомление в Роскомнадзор № 78-19-004182. " +
  "Серверы в Российской Федерации. Мы показываем происхождение каждого номера " +
  "и исполняем отказ собственника без переписки."

const BASE_PROTECTION =
  "Выгрузка номеров пачкой недоступна никому, включая руководителя. " +
  "Телефон открывается по одному и записывается в журнал доступа. " +
  "Это защищает ваши контакты от увода вместе с агентом."

type AuthShellProps = {
  title: string
  subtitle: string
  /** Узкий подзаголовок 480 вместо 640 — так на экранах регистрации. */
  narrow?: boolean
  children: ReactNode
  /** Метка списка шагов справа: «ЧТО ВНУТРИ», «ЧТО БУДЕТ ДАЛЬШЕ». */
  stepsLabel?: string
  steps?: Step[]
  /** Цены и состав. У экрана «доступ закрыт» их нет вовсе. */
  showPricing?: boolean
  pricesLabel?: string
  prices?: Price[]
  protection?: string
}

function AuthShell({
  title,
  subtitle,
  narrow = false,
  children,
  stepsLabel = "ЧТО ВНУТРИ",
  steps = STEPS,
  showPricing = true,
  pricesLabel = "СКОЛЬКО СТОИТ",
  prices = PRICES,
  protection = BASE_PROTECTION,
}: AuthShellProps) {
  return (
    <div data-slot="auth-shell" className="flex h-svh w-full bg-surface">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-surface px-18 py-16">
        <div className="flex items-center gap-2">
          <Typography variant="panelTitle" tone="default">
            Сёрчь
          </Typography>
          <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
        </div>

        <div className="h-8.5" />

        <Typography variant="cardPrice" tone="default" as="h1">
          {title}
        </Typography>

        <div className="h-6" />

        <div className={narrow ? "w-120" : "w-160"}>
          <Typography variant="uiText" tone="secondary">
            {subtitle}
          </Typography>
        </div>

        <div className="h-8" />

        <>{children}</>

        <div className="flex-1" />

        <div className={narrow ? "w-120" : "w-160"}>
          <Typography variant="metaText" tone="dense">
            {LEGAL}
          </Typography>
        </div>
      </div>

      <div
        data-slot="auth-aside"
        className="flex w-130 shrink-0 flex-col overflow-y-auto bg-warm px-12 py-16"
      >
        <Typography variant="columnHeader" tone="dense">
          {stepsLabel}
        </Typography>
        <div className="h-4" />
        <div className="flex w-full flex-col gap-3.5">
          {steps.map((step, index) => (
            <div key={step.title} className="flex w-full items-start gap-3">
              <div className="w-4 shrink-0">
                <Typography variant="controlLabel" tone="dense">
                  {String(index + 1)}
                </Typography>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Typography variant="controlLabel" tone="default">
                  {step.title}
                </Typography>
                <Typography variant="denseText" tone="dense">
                  {step.note}
                </Typography>
              </div>
            </div>
          ))}
        </div>

        {showPricing ? (
          <>
            <div className="h-8" />
            <div className="h-px w-full bg-line-2" />
            <div className="h-8" />

            <Typography variant="columnHeader" tone="dense">
              {pricesLabel}
            </Typography>
            <div className="h-4" />
            <div className="flex w-full flex-col gap-5">
              {prices.map((price) => (
                <div key={price.value} className="flex w-full flex-col gap-1">
                  <Typography variant="cardPrice" tone="default">
                    {price.value}
                  </Typography>
                  <Typography variant="denseText" tone="secondary">
                    {price.note}
                  </Typography>
                </div>
              ))}
            </div>

            <div className="h-8" />
            <div className="h-px w-full bg-line-2" />
            <div className="h-8" />

            <Typography variant="columnHeader" tone="dense">
              ЧТО ВХОДИТ СРАЗУ
            </Typography>
            <div className="h-4" />
            <div className="flex w-full flex-col gap-2.5">
              {INCLUDED.map((item) => (
                <div key={item.title} className="flex w-full flex-col gap-0.5">
                  <Typography variant="numericDense" tone="default">
                    {item.title}
                  </Typography>
                  <Typography variant="metaText" tone="dense">
                    {item.note}
                  </Typography>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="flex-1" />
        <div className="h-8" />

        <Typography variant="metaText" tone="dense">
          {protection}
        </Typography>
      </div>
    </div>
  )
}

export { AuthShell, STEPS, PRICES }
export type { AuthShellProps }
