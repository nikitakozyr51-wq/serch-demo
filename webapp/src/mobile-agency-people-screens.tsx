import { Link } from "@tanstack/react-router"
import { Fragment, useId, useState } from "react"
import { Mail, Phone } from "lucide-react"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { MobileBottomNav, MobileSectionHeader, PhoneFrame } from "@/features/cabinet"
import { cn } from "@/lib/utils"

/**
 * Агентство на телефоне: люди и тариф.
 *
 * Три кадра одной темы — `yDYOE` «Карточка сотрудника», `NMEod` «Пригласить
 * агента», `T59AML` «Тариф и подписка». Все три живут за вкладкой «Ещё»:
 * пяти корневым разделам телефона места не хватило, и всё, что касается
 * агентства целиком, спрятано за одним пунктом.
 *
 * Общее у трёх: шапка раздела 56, тело с полями по 16 и зазором 20,
 * нижняя навигация 72. Отличается только вертикальное поле тела —
 * 24 у людей и 20 у тарифа. Так в файле.
 */

/**
 * Кадр телефона на десктопном стенде: 390 × 844 по центру.
 *
 * Форма взята у `mobile-search-screen` и `mobile-call-screen`, чтобы стенд
 * читался одинаково на всех мобильных экранах. Общий `MobileScreen`
 * из `@/features/cabinet` здесь не подходит: он занимает высоту окна,
 * а эти три экрана прижимают действия к низу кадра 844 — вне этой высоты
 * распорка теряет смысл.
 */
function PersonScreen({
  header,
  activeTab,
  children,
}: {
  header: ReactNode
  activeTab: string
  children: ReactNode
}) {
  return (
    <PhoneFrame slot="mobile-screen">
      <>{header}</>
      {children}
      <MobileBottomNav activeId={activeTab} />
    </PhoneFrame>
  )
}

/**
 * Слово справа в шапке: «К списку», «Отмена».
 *
 * В файле это голый текст 14/600 без подложки и без рамки. Область касания
 * растянута до 44 по высоте — видимого следа это не оставляет, но палец
 * попадает в слово, а не мимо: строчка высотой 20 на телефоне не берётся.
 *
 * **Это ссылка, а не кнопка.** Оба слова говорят одно и то же — «верни меня
 * к списку сотрудников», — и список нарисован отдельным экраном со своим
 * адресом. Ссылка открывается в новой вкладке и переживает возврат назад;
 * кнопка ни того, ни другого не умеет.
 */
function HeaderAction({ label, to }: { label: string; to: "/m/agency/staff" }) {
  return (
    <Link
      to={to}
      data-slot="mobile-header-action"
      className="flex h-11 shrink-0 cursor-pointer items-center bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <Typography variant="strongText" tone="secondary">
        {label}
      </Typography>
    </Link>
  )
}

/**
 * Поле ввода телефона: 48, радиус 12, поля по 14, значение кеглем 16.
 *
 * Общий `TextField` не подошёл: он собран под десктоп — 40, радиус 10,
 * поля 12, значение кеглем 14. На телефоне поле выше, потому что в него
 * попадают пальцем, и значение крупнее, потому что мельче 16 браузер
 * телефона приближает экран сам при постановке курсора.
 */
function MobileField({
  label,
  ...props
}: Omit<ComponentPropsWithoutRef<"input">, "className" | "style" | "id"> & {
  label: string
}) {
  const fieldId = useId()

  return (
    <div data-slot="mobile-field" className="flex w-full shrink-0 flex-col gap-2">
      <Typography as="label" variant="columnHeader" tone="dense" htmlFor={fieldId}>
        {label}
      </Typography>
      {/*
        Значение набрано 16/600 вместо 16/500 из файла: в лестнице кабинета
        ступени 16 весом 500 нет, а трогать общий модуль типографики ради
        одного поля — цена выше пользы. Расхождение видно только рядом
        с макетом.
      */}
      <Typography asChild variant="rowPrice">
        <input
          id={fieldId}
          data-slot="mobile-field-input"
          className={cn(
            "h-ctl-lg w-full rounded-xl bg-surface px-3.5 text-fg",
            "border border-border-control transition-colors",
            "placeholder:text-text-dense",
            "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg focus-visible:border-transparent",
          )}
          {...props}
        />
      </Typography>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const PERSON_CONTACTS = [
  { icon: Mail, value: "p.gusev@nevsky.ru" },
  { icon: Phone, value: "+7 900 000-71-40" },
]

/**
 * Семь показателей за месяц. Порядок из файла и он не случайный: сверху
 * то, за что заплачено (раскрытия), снизу то, ради чего платили (встречи),
 * и последней строкой — во что обошлась одна встреча. Руководитель читает
 * столбик сверху вниз и в конце получает цену результата.
 */
const PERSON_STATS = [
  { name: "Раскрыто контактов", value: "18" },
  { name: "Дозвонов", value: "6" },
  { name: "Диалогов", value: "1" },
  { name: "Встреч", value: "1" },
  { name: "Отказов", value: "1" },
  { name: "Возвратов", value: "2" },
  { name: "Стоимость встречи", value: "3 582 ₽" },
]

/**
 * МОБАЙЛ · Карточка сотрудника (`yDYOE`).
 *
 * Экран отвечает на один вопрос руководителя: что этот человек сделал
 * за месяц и стоит ли менять ему лимит. Поэтому вся середина — столбик
 * из семи чисел, а два действия внизу прижаты к краю кадра распоркой.
 *
 * **Возврата стрелкой здесь нет — есть слово «К списку».** На телефоне
 * в карточку приходят из списка сотрудников, и слово говорит, куда
 * вернёшься, а стрелка только что вернёшься.
 *
 * **Почта и телефон нарисованы карточками, но действия у них в файле нет.**
 * Ни нажатия, ни состояния — поэтому строки собраны неподвижными: звонок
 * и письмо по касанию здесь не выдуманы.
 */
export function MobilePersonPage() {
  return (
    <PersonScreen
      activeTab="more"
      header={
        <MobileSectionHeader
          title="Сотрудник"
          action={<HeaderAction label="К списку" to="/m/agency/staff" />}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
        <div className="flex w-full shrink-0 items-center gap-3">
          {/* Инициалы вместо фотографии: снимок сотрудника продукт не хранит,
              а пустой кружок ничего бы не говорил. */}
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-warm">
            <Typography variant="panelTitle" tone="default" as="span">
              ПГ
            </Typography>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Typography variant="panelTitle" tone="default">
              Гусев Пётр
            </Typography>
            <Typography variant="denseText" tone="dense">
              агент · дневной лимит 5 раскрытий
            </Typography>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2">
          {PERSON_CONTACTS.map((contact) => {
            const Icon = contact.icon
            return (
              <div
                key={contact.value}
                data-slot="mobile-contact-row"
                // Обводка внутрь, а не рамка: в файле она высоту не меняет.
                className="flex h-ctl-lg w-full items-center gap-2.5 rounded-xl bg-surface px-3.5 outline-solid outline-1 -outline-offset-1 outline-line-2"
              >
                <Icon aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
                <Typography variant="uiText" tone="default">
                  {contact.value}
                </Typography>
              </div>
            )
          })}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2">
          <Typography variant="columnHeader" tone="dense">
            ЗА ТРИДЦАТЬ ДНЕЙ
          </Typography>
          {PERSON_STATS.map((stat) => (
            <div
              key={stat.name}
              data-slot="mobile-stat-row"
              // Волосяная линия снизу нарисована внутренней тенью: рамка
              // добавила бы 45-й пиксель к строке 44. Линия есть и у последней
              // строки — так в файле, столбик заканчивается чертой.
              className="flex h-11 w-full shrink-0 items-center gap-2.5 shadow-[inset_0_-1px_0_var(--line-1)]"
            >
              <Typography variant="uiText" tone="secondary">
                {stat.name}
              </Typography>
              <div className="h-px flex-1" />
              <Typography variant="numeric" tone="default">
                {stat.value}
              </Typography>
            </div>
          ))}
        </div>

        {/* Распорка: действия стоят у нижнего края кадра, под большим пальцем,
            а не сразу за столбиком чисел. */}
        <div className="flex-1" />

        {/*
          Оба действия названы в `data-action` и ничего не открывают: ни выбора
          лимита, ни подтверждения отключения в файле не нарисовано. Придумать
          их здесь значило бы придумать дизайн, а отключение сотрудника — не то
          место, где угадывают: человек теряет доступ к общему счёту.
        */}
        <div className="flex w-full shrink-0 flex-col gap-4">
          <Button
            variant="primary"
            size="lg"
            block
            data-action="Меняет дневной лимит раскрытий у сотрудника"
          >
            Изменить лимит
          </Button>
          {/*
            «Отключить» — не вторичная кнопка системы: у той тёплая заливка
            и радиус 12, а здесь белая заливка и капсула. Отключение человека
            — вещь редкая и тяжёлая, и в файле она нарочно выглядит пустой
            рамкой, а не готовым к нажатию контролом.
          */}
          <button
            type="button"
            data-slot="mobile-outline-action"
            data-action="Отключает сотрудника: доступ пропадает, объекты и история остаются агентству"
            className="flex h-ctl-lg w-full cursor-pointer items-center justify-center rounded-full bg-surface outline-solid outline-1 -outline-offset-1 outline-border-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="controlLabelLg" tone="secondary">
              Отключить
            </Typography>
          </button>
        </div>
      </div>
    </PersonScreen>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const INVITE_LIMITS = ["5", "25", "50"]

/**
 * МОБАЙЛ · Пригласить агента (`NMEod`).
 *
 * Форма из трёх решений: кто, куда написать и сколько раскрытий в день.
 * Больше на телефоне не спрашивается — роль, отдел и права выдаются потом
 * в карточке.
 *
 * **Лимит выбирается чипами, а не вводится числом.** Три готовых ответа
 * закрывают почти все случаи, а клавиатура на телефоне отняла бы пол-экрана
 * ради двух цифр. Подсказка под чипами говорит главное: безлимита у агента
 * не бывает.
 *
 * **Блок «Что будет дальше» стоит до кнопки, а не после.** Приглашение
 * тратит чужие деньги — раскрытия агент берёт с общего баланса агентства, —
 * и об этом читают до нажатия, а не в письме потом.
 */
export function MobileInviteAgentPage() {
  const [limit, setLimit] = useState(INVITE_LIMITS[0])

  return (
    <PersonScreen
      activeTab="more"
      header={
        <MobileSectionHeader
          title="Пригласить агента"
          action={<HeaderAction label="Отмена" to="/m/agency/staff" />}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
        <MobileField label="ФАМИЛИЯ И ИМЯ" defaultValue="Королёв Дмитрий" />
        <MobileField
          label="РАБОЧАЯ ПОЧТА"
          type="email"
          defaultValue="d.korolev@nevsky.ru"
        />

        <div className="flex w-full shrink-0 flex-col gap-2">
          <Typography variant="columnHeader" tone="dense">
            ДНЕВНОЙ ЛИМИТ РАСКРЫТИЙ
          </Typography>
          {/*
            Чип лимита — не чип фильтра: тот 28 в высоту и живёт в колонке
            условий, а этот 44 и делит строку на три равные доли. Ступень 44
            здесь обязательна: это единственный контрол формы, который жмут
            пальцем без клавиатуры.
          */}
          <div
            role="radiogroup"
            aria-label="Дневной лимит раскрытий"
            className="flex w-full gap-2"
          >
            {INVITE_LIMITS.map((value) => {
              const selected = value === limit
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-slot="mobile-limit-chip"
                  data-selected={selected || undefined}
                  // Отклик на нажатие, а не на отпускание: выбор виден в тот
                  // момент, когда палец коснулся чипа.
                  onPointerDown={() => setLimit(value)}
                  className={cn(
                    "flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full",
                    "outline-solid outline-1 -outline-offset-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                    selected
                      ? "bg-fg text-surface outline-fg"
                      : "bg-surface text-text-2 outline-border-control",
                  )}
                >
                  <Typography variant={selected ? "controlLabel" : "uiText"} tone="current">
                    {value}
                  </Typography>
                </button>
              )
            })}
          </div>
          <Typography variant="metaText" tone="dense">
            Новому агенту по умолчанию 5. Лимит меняется в любой момент. Безлимит есть
            только у руководителя и агенту не выдаётся.
          </Typography>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-lg bg-warm p-3.5">
          <Typography variant="strongText" tone="default">
            Что будет дальше
          </Typography>
          <Typography variant="metaText" tone="dense">
            На почту уйдёт ссылка со сроком 7 дней. Агент задаст пароль и подпишет
            согласие на обработку своих данных. Раскрытия он тратит с общего баланса
            агентства.
          </Typography>
        </div>

        <div className="flex-1" />

        {/*
          Кнопка названа и никуда не ведёт. Экрана «приглашение отправлено»
          в файле нет, а вернуть на список сотрудников значило бы сделать
          отправку неотличимой от «Отмены» в шапке: на глаз произошло бы
          одно и то же, хотя во втором случае агенту ничего не ушло.
        */}
        <Button
          variant="primary"
          size="lg"
          block
          data-action="Отправляет приглашение на рабочую почту, ссылка живёт 7 дней"
        >
          Отправить приглашение
        </Button>
      </div>
    </PersonScreen>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Три факта тарифа. Каждый набран одинаково: подпись капслоком, крупное
 * число, единица и одна строка последствия. Число всегда отвечает на вопрос
 * подписи, а последняя строка — на невысказанный «а дальше что».
 */
const PLAN_FACTS = [
  {
    label: "ПОДПИСКА",
    value: "3 000 ₽",
    unit: "в месяц за агентство целиком",
    note: "Следующее списание 1 августа",
  },
  {
    label: "МЕСТА",
    value: "6 из 20",
    unit: "сотрудников подключено",
    note: "Свободно 14 мест",
  },
  {
    label: "РАСКРЫТИЯ",
    value: "199 ₽",
    unit: "за контакт собственника",
    note: "Списывается со счёта, не с подписки",
  },
]

/**
 * МОБАЙЛ · Тариф и подписка (`T59AML`).
 *
 * Экран из трёх чисел, разделённых линиями: сколько стоит подписка, сколько
 * занято мест и сколько стоит одно раскрытие. Таблицы нет — на 390 колонка
 * подписей и колонка значений не встают рядом, и факт разворачивается
 * в столбик: подпись, число, единица, последствие.
 *
 * **Третий факт объясняет, что раскрытия и подписка — разные деньги.**
 * Это главное недоразумение продукта: люди считают, что 3 000 ₽ включают
 * контакты. Строка «Списывается со счёта, не с подписки» стоит ради него.
 *
 * **Переход на расширенный доступ — не апселл, а ответ на упор в потолок.**
 * Блок появляется последним и говорит цену за агентство целиком, а не
 * за сотрудника: цена продукта не растёт от найма.
 */
export function MobilePlanPage() {
  return (
    <PersonScreen activeTab="more" header={<MobileSectionHeader title="Тариф" />}>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
        {PLAN_FACTS.map((fact) => (
          <Fragment key={fact.label}>
            <div className="flex w-full shrink-0 flex-col gap-3">
              <Typography variant="columnHeader" tone="dense">
                {fact.label}
              </Typography>
              <Typography variant="cardPrice" tone="default">
                {fact.value}
              </Typography>
              <Typography variant="denseText" tone="secondary">
                {fact.unit}
              </Typography>
              <Typography variant="denseText" tone="secondary">
                {fact.note}
              </Typography>
            </div>
            {/* Делитель фактов. В файле он на четыре единицы светлее `line-1`,
                но такого цвета в палитре проекта нет и заведён он не будет:
                разница между #e7e5e0 и #ebe9e5 не видна, а лишний цвет линии
                виден в системе навсегда. */}
            <div aria-hidden className="h-px w-full shrink-0 bg-line-1" />
          </Fragment>
        ))}

        <div className="flex w-full shrink-0 flex-col gap-3">
          <Typography variant="rowPrice" tone="default">
            Больше двадцати сотрудников
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Дальше включается расширенный доступ: 6 000 ₽ в месяц до пятидесяти
            человек. Цена по-прежнему за агентство целиком, а не за сотрудника.
          </Typography>
          {/* Смена тарифа — счёт и договор, а не экран: в файле за этой
              кнопкой ничего не нарисовано, поэтому она названа и молчит. */}
          <Button
            variant="primary"
            size="lg"
            block
            data-action="Переводит агентство на расширенный доступ: 6 000 ₽ в месяц до пятидесяти человек"
          >
            Перейти на расширенный
          </Button>
        </div>
      </div>
    </PersonScreen>
  )
}
