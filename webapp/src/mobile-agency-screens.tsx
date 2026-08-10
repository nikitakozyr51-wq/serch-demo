import { Link } from "@tanstack/react-router"
import {
  BellOff,
  Building2,
  ChevronRight,
  Eye,
  FileDown,
  FileText,
  Gauge,
  Hash,
  MapPin,
  Rows3,
  ScrollText,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useState } from "react"
import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import {
  requestDeletion,
  saveRequisites,
  transferOwner,
  useSession,
} from "@/features/auth"
import { MobileEmptyState, MobileScreen, MobileSectionHeader } from "@/features/cabinet"
import { groupDigits } from "@/features/listings"
import {
  formatDay,
  formatMoment,
  funnel,
  lastCall,
  useNow,
  useWorkspace,
} from "@/features/workspace"
import { cn } from "@/lib/utils"
import {
  DeleteAgencySheet,
  RequisitesSheet,
  TransferOwnerSheet,
} from "@/mobile-agency-sheets"
import { notifyDone, notifyError } from "@/platform/notify"

/**
 * МОБАЙЛ · Агентство — шесть разделов руководителя.
 *
 * Кадры `bKoEu`, `P7DnP`, `FifB0`, `MBinc`, `r3Jbr`, `cdYS2`.
 *
 * **На телефоне у руководителя нет таблиц.** На десктопе агентство — это
 * восьмиколоночная таблица агентов и шестиколоночный журнал. На 390 таблиц
 * нет ни одной: каждая строка сложена в две — что произошло сверху, чем
 * кончилось справа, подробности приглушённой строкой снизу. Колонки, которые
 * не влезли, ушли в эту вторую строку словами: «агент · лимит 25 в сутки» —
 * это две десктопные ячейки, пересказанные так, чтобы читаться одним взглядом.
 *
 * **Всё, что здесь показано, наработано вошедшим человеком.** Раньше шесть
 * экранов держали внутри себя чужое агентство из макета: пять сотрудников по
 * фамилиям, чужие адреса в отказах и журнале, чужие реквизиты в настройках.
 * Это были образцы текста дизайнера, попавшие в код как данные. Теперь списки
 * собираются из журналов агентства, реквизиты — из сеанса, а там, где
 * показывать нечего, стоит пустое состояние, объясняющее, что сюда попадёт.
 *
 * **Три раздела живут под одной шапкой.** Эффективность, Сотрудники и Отказы
 * на телефоне не три пункта меню, а один экран «Агентство» с переключателем
 * из трёх капсул по 44. Руководитель смотрит их подряд, а не выбирает
 * что-то одно, — и лишний возврат в меню между ними был бы платой ни за что.
 *
 * Журнал доступа, Согласия и Настройки в переключатель не входят: туда
 * приходят изнутри, и у них есть стрелка назад.
 */

// ── Общие части шести экранов ────────────────────────────────────────────────

/**
 * Переключатель разделов агентства (`Qof3Y`, `pqDFs`, `WXsRt`).
 *
 * Капсула 44 с полями 14, подпись 14/500, зазор 8. Выбранная залита графитом,
 * остальные белые с границей `border-control`.
 *
 * **44, а не 32 и не 40.** Это переключатель, по которому бьют пальцем, а не
 * подпись под мышь: на телефоне ступени контролов начинаются с сорока четырёх.
 *
 * Подпись здесь весом 500, а не 600, как у кнопок: это не действие, а место,
 * где человек сейчас находится, — и оно не должно кричать громче содержимого.
 *
 * **Капсулы — ссылки, а не кнопки.** Три раздела нарисованы тремя кадрами
 * и живут по трём адресам, поэтому переключатель ведёт по ним ссылкой: её
 * можно открыть в новой вкладке, скопировать и вернуться назад кнопкой
 * браузера. Роли `tab` у капсул поэтому нет — она обещала бы, что содержимое
 * подменяется на месте, а здесь меняется адрес. Текущий раздел помечен
 * `aria-current`, и вид у него прежний: заливка графитом.
 */
const SEGMENTS = [
  { id: "efficiency", label: "Эффективность", to: "/m/agency" },
  { id: "staff", label: "Сотрудники", to: "/m/agency/staff" },
  { id: "refusals", label: "Отказы", to: "/m/agency/refusals" },
] as const

function AgencySegments({ active }: { active: string }) {
  return (
    <nav
      aria-label="Разделы агентства"
      data-slot="agency-segments"
      className="flex w-full shrink-0 items-center gap-2"
    >
      {SEGMENTS.map((segment) => {
        const selected = segment.id === active
        return (
          <Link
            key={segment.id}
            to={segment.to}
            // Точное совпадение адреса: без него «Эффективность» на `/m/agency`
            // считалась бы текущей и на дочерних `/m/agency/staff`, и экран
            // читал бы вслух два текущих раздела сразу.
            activeOptions={{ exact: true }}
            aria-current={selected ? "page" : undefined}
            data-slot="agency-segment"
            data-active={selected || undefined}
            className={cn(
              "flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full px-3.5",
              "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
              "transition-colors duration-120",
              selected
                ? "bg-fg text-surface active:bg-fg-press"
                : "bg-surface text-fg outline-solid outline-1 -outline-offset-1 outline-border-control active:bg-warm-hover",
            )}
          >
            {/* Цвет подписи берётся у капсулы: на графите она белая (#ffffff),
                а токен `inverse` в Typography — это фон #f9f9f9, другой цвет. */}
            <Typography variant="uiText" tone="current">
              {segment.label}
            </Typography>
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Адрес строки списка. Тип узкий нарочно: из четырёх списков ведёт ровно один
 * и ровно в одно место. Расширять его — значит сначала нарисовать экран.
 */
type AgencyRowTarget = "/m/agency/person"

/**
 * Строка списка агентства: сотрудник, отказ, событие журнала, согласие.
 *
 * Снято с `g3tmnM`, `hJb13`, `SJQfj`, `YnUh9` — четыре списка нарисованы
 * одной формой: поля [12, 0], зазор 4, волосяная линия `line-2` снизу
 * у всех, кроме последней строки. Сверху имя 14/600 и значение у правого
 * края, снизу мета 12/500 приглушённая.
 *
 * **Значение справа бывает двух весов, и это разные вещи.** Число, ради
 * которого строка существует, — 64 раскрытия, 199 ₽ списания — идёт весом 600
 * графитом. Дата, которая только помечает строку во времени, — 24.07 — идёт
 * весом 500 приглушённой. Одинаковый вес заставил бы читать дату как результат.
 *
 * Стрелки в строке нет ни в одном из четырёх списков — так в файле, и она
 * здесь не появилась. Но у сотрудника за строкой стоит нарисованный экран,
 * и строка ведёт в него ссылкой: отказ, событие журнала и согласие —
 * записи, открывать в них нечего, а человек — карточка.
 */
function AgencyListRow({
  title,
  value,
  /** Значение — результат строки, а не отметка времени: вес 600 графитом. */
  valueStrong = false,
  meta,
  last = false,
  /** Куда ведёт строка. Без адреса она читается, а не нажимается. */
  to,
}: {
  title: string
  value: string
  valueStrong?: boolean
  meta: string
  last?: boolean
  to?: AgencyRowTarget
}) {
  const shape = cn(
    "flex w-full shrink-0 flex-col gap-1 py-3",
    !last && "border-b border-line-2",
  )

  const body = (
    <>
      <div className="flex w-full items-center gap-3">
        <div className="min-w-0 flex-1">
          <Typography variant="strongText" tone="default">
            {title}
          </Typography>
        </div>
        <Typography
          variant={valueStrong ? "strongText" : "uiText"}
          tone={valueStrong ? "default" : "dense"}
        >
          {value}
        </Typography>
      </div>
      <Typography variant="metaText" tone="dense">
        {meta}
      </Typography>
    </>
  )

  if (to === undefined) {
    return (
      <div data-slot="agency-list-row" className={shape}>
        <>{body}</>
      </div>
    )
  }

  return (
    <Link
      to={to}
      data-slot="agency-list-row"
      className={cn(
        shape,
        // Строка списка отвечает тем же правилом, что строка выдачи: одно
        // на все нажимаемые строки кабинета, живёт в `index.css`.
        "row-tap cursor-pointer text-left",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg",
      )}
    >
      {body}
    </Link>
  )
}

/**
 * Строка настройки агентства (`k0dTs` и одиннадцать её копий).
 *
 * Высота 64, зазор 12: значок 20 цветом `text-2`, название 16, подпись 13
 * приглушённая, шеврон 20. Волосяная линия снизу у всех строк группы,
 * кроме последней.
 *
 * **Подпись под названием говорит текущее значение, а не объясняет пункт.**
 * Не «ИНН — налоговый номер агентства», а само название агентства из сеанса
 * и дата подписи согласия: руководитель заходит сюда сверить, что стоит,
 * а не узнать, что такое ИНН.
 *
 * **Там, где значения ещё нет, подпись говорит именно это.** «не заполнен ·
 * нужен для договора и счетов» вместо правдоподобного ИНН: по чужому ИНН
 * выставят счёт, а руководитель, увидев заполненную строку, не станет её
 * проверять. Отсутствие значения — тоже значение, и врать о нём нельзя.
 *
 * Высота задана минимумом, а не жёстко: юридический адрес в две строки
 * не влезает, и в файле он выходит за границы кадра. Обрезать его нельзя —
 * адрес, обрезанный посередине, перестаёт быть адресом.
 *
 * **Строка открывает лист там, где лист нарисован, и называет действие там,
 * где не нарисован.** Из двенадцати строк листы есть у пяти: три реквизита
 * ведут в `TIJHR`, ответственный за данные — в `iWj2M`, удаление агентства —
 * в `hnnq8`. Остальным семи экрана правки в файле нет — ни выбора порога
 * автопополнения, ни смены плотности, — и придумать его здесь значило бы
 * придумать дизайн. Такая строка говорит, что случится при нажатии,
 * и на этом честно останавливается.
 */
function AgencySettingRow({
  icon: Icon,
  title,
  note,
  action,
  onPress,
  danger = false,
  last = false,
}: {
  icon: LucideIcon
  title: string
  note: string
  /** Что произойдёт при нажатии. Остаётся и у строки с листом: атрибут
   *  описывает действие, а не его отсутствие. */
  action: string
  /** Открыть лист. Нет — значит экрана правки в файле не нарисовано. */
  onPress?: () => void
  /** Опасная зона: плитка `err-tint`, значок и заголовок `err-text`. */
  danger?: boolean
  last?: boolean
}) {
  return (
    <button
      type="button"
      data-slot="agency-setting-row"
      data-action={action}
      onClick={onPress}
      className={cn(
        "flex min-h-16 w-full cursor-pointer items-center gap-3 bg-transparent py-2 text-left",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        "transition-colors duration-120 active:bg-warm-hover",
        !last && "border-b border-line-2",
      )}
    >
      {/* Плитка 40, как в `ESvsw`: значок в списке одинаковых строк нужен
          якорем для глаза, а голый глиф 20 читается частью текста. */}
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          danger ? "bg-err-tint" : "bg-warm",
        )}
      >
        <Icon
          className={cn("size-5 shrink-0", danger ? "text-err-text" : "text-text-2")}
          strokeWidth={2}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Typography variant="settingTitle" tone={danger ? "destructive" : "default"}>
          {title}
        </Typography>
        <Typography variant="denseText" tone="dense">
          {note}
        </Typography>
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-text-dense"
        strokeWidth={2}
      />
    </button>
  )
}

/** Группа настроек: метка капслоком и строки без зазора между ними. */
function AgencySettingsGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section
      data-slot="agency-settings-group"
      className="flex w-full shrink-0 flex-col gap-2"
    >
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <div className="flex w-full flex-col">
        <>{children}</>
      </div>
    </section>
  )
}

/** Период справа в шапке. Во всех шести кадрах это 14/600 приглушённым. */
function PeriodNote({ children }: { children: ReactNode }) {
  return (
    <Typography variant="controlLabel" tone="dense">
      {children}
    </Typography>
  )
}

// ── МОБАЙЛ · Агентство → Эффективность (`bKoEu`) ─────────────────────────────

/**
 * МОБАЙЛ · Агентство (`bKoEu`): куда уходят деньги агентства.
 *
 * **Ступени считаются из журналов, а не вписаны.** Здесь стояли пять ступеней
 * «178 раскрытий → 3 договора» и стоимость встречи с договором — работа чужого
 * агентства из макета, показанная руководителю как своя. Теперь экран
 * спрашивает `funnel()` за тридцать дней и показывает ровно то, что агентство
 * наработало.
 *
 * **Встреч и договоров в ступенях больше нет, и это не потеря.** Продукт
 * фиксирует разговор, а не сделку: в панели звонка нет исхода «договорились
 * о встрече», и считать встречи не из чего. Ступень, которая всегда нулевая,
 * читается как поломка отчёта, а вписанная — как враньё. Вместо них стоят
 * исходы, которые продукт действительно записывает: отказы и посредники.
 *
 * **Воронка здесь без процентов и без арифметики отсева.** На десктопе рядом
 * с каждой ступенью стоит «54 % от раскрытых»; на 390 такая строка не встаёт,
 * и её роль берёт сама полоса: соотношение видно глазом, без числа.
 *
 * **Итог отделён линией и назван деньгами.** Потрачено за период и сколько
 * стоил один дозвон — руководитель решает по рублю за результат, а результат,
 * который продукт умеет доказать, — это состоявшийся разговор.
 *
 * **Жёлоба под полосой нет.** Полоса меряется не «сколько осталось», а
 * «сколько от самой длинной ступени», и пустой серый остаток предлагал бы
 * читать недостачу там, где её никто не обещал.
 */
export function MobileAgencyPage() {
  const workspace = useWorkspace()
  const now = useNow()
  const report = funnel(workspace, now, 30)

  const steps = [
    { label: "Раскрыто", value: report.disclosed },
    { label: "Дозвонов", value: report.reached },
    { label: "Отказов", value: report.refused },
    { label: "Посредников", value: report.brokers },
  ]

  // Масштаб полосы — от наибольшей ступени, а не от первой. Обычно это
  // «Раскрыто», но требовать этого нельзя: делить на ноль в день, когда
  // раскрытий ещё не было, экран не должен.
  const top = Math.max(...steps.map((step) => step.value), 1)

  // Считать нечего, пока не было ни раскрытий, ни звонков. Четыре нуля подряд
  // выглядят как сломанный отчёт, а не как «работа ещё не началась».
  const empty = steps.every((step) => step.value === 0)

  const money = [
    { key: "spent", value: `${groupDigits(report.spent)} ₽`, label: "потрачено за 30 дней" },
    {
      key: "per-reach",
      // Прочерк, а не ноль: без единого дозвона цена дозвона не считается,
      // и «0 ₽ за дозвон» читалось бы как «разговоры даром».
      value:
        report.reached === 0
          ? "—"
          : `${groupDigits(Math.round(report.spent / report.reached))} ₽`,
      label: "за дозвон",
    },
  ]

  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={
        <MobileSectionHeader
          title="Агентство"
          action={<PeriodNote>30 дней</PeriodNote>}
        />
      }
    >
      <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6">
        <AgencySegments active="efficiency" />

        {empty ? (
          <MobileEmptyState
            icon={Gauge}
            title="Считать пока нечего"
            text="Отчёт собирается из работы: сколько контактов раскрыто, по скольким дозвонились и чем кончился разговор. Первые числа появятся здесь после первых звонков."
          />
        ) : (
          <>
            <section className="flex w-full shrink-0 flex-col gap-4">
              <Typography variant="columnHeader" tone="dense">
                ЧТО ВЫШЛО ИЗ РАСКРЫТИЙ
              </Typography>

              {steps.map((step) => (
                <div key={step.label} className="flex w-full flex-col gap-2">
                  <div className="flex w-full items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Typography variant="uiText" tone="secondary">
                        {step.label}
                      </Typography>
                    </div>
                    <Typography variant="rowPrice" tone="default">
                      {step.value}
                    </Typography>
                  </div>
                  <span
                    aria-hidden
                    data-slot="funnel-bar"
                    className="h-1.5 rounded-full bg-fg"
                    style={{ width: `${(step.value / top) * 100}%` }}
                  />
                </div>
              ))}
            </section>

            <div className="flex w-full shrink-0 items-start gap-6 border-t border-line-2 pt-4">
              {money.map((item) => (
                <div key={item.key} className="flex flex-col gap-1">
                  <Typography variant="panelTitle" tone="default" as="span">
                    {item.value}
                  </Typography>
                  <Typography variant="denseText" tone="dense">
                    {item.label}
                  </Typography>
                </div>
              ))}
            </div>

            <div className="flex-1" />
          </>
        )}
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Сотрудники (`P7DnP`) ────────────────────────────────────────────

/**
 * МОБАЙЛ · Сотрудники (`P7DnP`): кто сколько раскрыл.
 *
 * **Список — это сотрудники агентства, а не пять фамилий из макета.** Здесь
 * стояли Смирнова, Лебедев, Титова, Гусев и Королёв с чужими раскрытиями
 * и чужой ценой встречи. Теперь список берётся из агентства: пока в нём один
 * человек — тот, кто его завёл, — строка будет одна, и это правда, а не
 * недоделка.
 *
 * **Единственная колонка — «Раскрыто», и это выбор.** Из восьми десктопных
 * колонок на телефон вынесено число раскрытий: оно и есть потраченные деньги.
 * Считается оно по автору записи в журнале — другого способа связать раскрытие
 * с человеком у продукта нет.
 *
 * **Встреч и цены встречи в мете больше нет.** Продукт их не записывает, и
 * пересказывать в приглушённой строке нечего, кроме того, что о человеке
 * действительно известно: роль и дневной лимит.
 *
 * Шапка списка 24 с волосяной линией `line-1` — светлой: она отделяет
 * заголовки от строк внутри одного списка, а не делит сами строки.
 */
export function MobileStaffPage() {
  const workspace = useWorkspace()

  const staff = workspace.people.map((person) => ({
    id: person.id,
    name: person.name,
    disclosed: workspace.disclosures.filter((item) => item.by === person.name).length,
    meta: `${person.role === "owner" ? "руководитель" : "агент"} · ${
      person.limit === null ? "без лимита" : `лимит ${person.limit} в сутки`
    }`,
  }))

  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={
        <MobileSectionHeader
          title="Агентство"
          action={<PeriodNote>30 дней</PeriodNote>}
        />
      }
    >
      <div className="flex w-full flex-1 flex-col px-4 pt-6">
        <div className="pb-6">
          <AgencySegments active="staff" />
        </div>

        <div className="flex h-6 w-full shrink-0 items-center gap-3 border-b border-line-1">
          <div className="min-w-0 flex-1">
            <Typography variant="columnHeader" tone="dense">
              СОТРУДНИК
            </Typography>
          </div>
          <Typography variant="columnHeader" tone="dense">
            РАСКРЫТО
          </Typography>
        </div>

        {/* Строка ведёт в карточку сотрудника: на телефоне другого входа
            в неё нет. */}
        {staff.length === 0 ? (
          <MobileEmptyState
            icon={Users}
            title="Сотрудников пока нет"
            text="Здесь появится каждый, кого вы пригласите в агентство: у него будет видно, сколько контактов он раскрыл."
          />
        ) : (
          <>
            {staff.map((person, index) => (
              <AgencyListRow
                key={person.id}
                title={person.name}
                value={String(person.disclosed)}
                valueStrong
                meta={person.meta}
                last={index === staff.length - 1}
                to="/m/agency/person"
              />
            ))}

            <div className="flex-1" />
          </>
        )}
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Отказы (`FifB0`) ────────────────────────────────────────────────

/**
 * МОБАЙЛ · Отказы (`FifB0`): кто просил не звонить.
 *
 * **Список — это стоп-лист агентства.** Здесь стояли пять чужих адресов
 * из макета с обещаниями «удалим к 29.07»; ни адресов, ни сроков продукт
 * не хранил. Теперь строки берутся из стоп-листа: туда адрес попадает из
 * панели звонка отметкой «просил не звонить» и снятию не подлежит.
 *
 * **Мета говорит то, что известно наверняка: кто поставил отметку.** Отметка
 * ставится вместе с записью о звонке, и из этой записи берутся дата и автор.
 * Источника «собственник нажал кнопку на нашей странице» в продукте нет,
 * и различать источники, пока их один, значило бы придумывать второй.
 *
 * **Сроков исполнения в строке нет.** Их считает не кабинет, а сервер, которого
 * ещё нет: «удалим к 22.08» было бы обещанием от имени системы, которая его
 * не даёт. Когда сроки появятся, им место здесь же, второй половиной меты.
 *
 * Цветных отметок здесь нет ни одной: сказано словом. Раскрасить строку
 * значило бы предложить читать экран по цвету — а тут читают по существу.
 */
export function MobileRefusalsPage() {
  const workspace = useWorkspace()

  const refusals = workspace.stopList.map((address) => {
    // В стоп-лист попадают из панели звонка, и там же в этот момент пишется
    // сам звонок. Он и есть источник даты и автора отметки: отдельного поля
    // «кто и когда отметил» у стоп-листа нет.
    const call = lastCall(workspace, address)
    return {
      address,
      when: call === undefined ? "—" : formatMoment(call.at),
      meta: call?.by ? `по звонку, ${call.by}` : "отмечено в панели звонка",
    }
  })

  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={
        <MobileSectionHeader
          title="Агентство"
          action={<PeriodNote>30 дней</PeriodNote>}
        />
      }
    >
      <div className="flex w-full flex-1 flex-col px-4 pt-6">
        <div className="pb-6">
          <AgencySegments active="refusals" />
        </div>

        {refusals.length === 0 ? (
          <MobileEmptyState
            icon={BellOff}
            title="Стоп-лист пуст"
            text="Сюда попадает каждый собственник, который просил не звонить. Отметка ставится в панели звонка и снятию не подлежит."
          />
        ) : (
          <>
            {refusals.map((refusal, index) => (
              <AgencyListRow
                key={refusal.address}
                title={refusal.address}
                value={refusal.when}
                meta={refusal.meta}
                last={index === refusals.length - 1}
              />
            ))}

            <div className="flex-1" />
          </>
        )}
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Журнал доступа (`MBinc`) ────────────────────────────────────────

/**
 * Сколько записей журнала показывает экран.
 *
 * Экран показывает хвост, а не весь журнал: пять последних событий отвечают
 * на вопрос «что происходило только что», ради которого сюда и заходят
 * с телефона. Полный журнал — работа десктопа.
 */
const ACCESS_LOG_TAIL = 5

/**
 * МОБАЙЛ · Журнал доступа (`MBinc`): кто и когда открывал контакты.
 *
 * **Записи — настоящие раскрытия агентства.** Здесь стояли пять чужих адресов
 * с чужими именами и временем; журнал доступа с выдуманными строками — это
 * не журнал, а картинка журнала. Теперь строки берутся из журнала раскрытий:
 * адрес, списание и автор с временем.
 *
 * **Пробное раскрытие записано наравне с платным.** У него «0 ₽», и оно стоит
 * в том же списке. Журнал существует не для бухгалтерии, а для ответа на
 * вопрос «кто видел телефон собственника» — бесплатное раскрытие отвечает на
 * него так же, как платное.
 *
 * Ноль при этом приглушён и весом 500, а 199 ₽ — графитом весом 600: деньги
 * видно сразу, но бесплатное не спрятано.
 *
 * **«Вы» вместо своего имени.** Руководитель ищет в журнале чужие действия;
 * собственные ему опознавать не надо, и имя там было бы шумом.
 *
 * В шапке «последние 5 из 12» — число из настоящей длины журнала, и появляется
 * оно только когда записей действительно больше пяти. Иначе строка обещала бы
 * спрятанные события, которых нет.
 */
export function MobileAccessLogPage() {
  const workspace = useWorkspace()
  const session = useSession()
  const now = useNow()

  const events = workspace.disclosures.slice(0, ACCESS_LOG_TAIL).map((item) => {
    const author = item.by === "" ? "—" : item.by === session?.name ? "вы" : item.by
    return {
      id: item.id,
      address: item.address,
      // Списание, а не «сколько стоило бы»: пробное раскрытие ничего не стоило,
      // и 199 ₽ в его строке были бы записью о деньгах, которых не было.
      sum: `${groupDigits(item.amount)} ₽`,
      charged: item.amount > 0,
      meta: `Раскрытие контакта · ${author} · ${formatDay(item.at, now)}`,
    }
  })

  const total = workspace.disclosures.length

  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={
        <MobileSectionHeader
          title="Журнал доступа"
          back
          action={
            total > ACCESS_LOG_TAIL ? (
              <PeriodNote>{`последние ${ACCESS_LOG_TAIL} из ${total}`}</PeriodNote>
            ) : undefined
          }
        />
      }
    >
      <div className="flex w-full flex-1 flex-col px-4 pt-6">
        {events.length === 0 ? (
          <MobileEmptyState
            icon={ScrollText}
            title="Записей пока нет"
            text="Каждое раскрытие контакта попадёт сюда строкой: объект, списание, кто открыл и когда."
          />
        ) : (
          <>
            {events.map((event, index) => (
              <AgencyListRow
                key={event.id}
                title={event.address}
                value={event.sum}
                valueStrong={event.charged}
                meta={event.meta}
                last={index === events.length - 1}
              />
            ))}

            <div className="flex-1" />
          </>
        )}
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Согласия собственников (`r3Jbr`) ────────────────────────────────

/**
 * МОБАЙЛ · Согласия собственников (`r3Jbr`): у кого спросили разрешение
 * и что ответили.
 *
 * **Экран честно пуст, и это его настоящее состояние.** Здесь стояли пять
 * чужих адресов с исходами «подтверждено · SMS · Ирина С.». Ни одного из этих
 * фактов продукт не записывает: запросов подтверждения он не отправляет, SMS
 * не шлёт, журнала согласий не ведёт. Показывать выдуманный журнал согласий
 * опаснее, чем не показывать никакого: по нему решают, можно ли звонить.
 *
 * Форма строки, когда журнал появится, известна из файла: адрес, дата справа
 * приглушённая, и одна строка меты — исход, канал, кто спрашивал. Между «нет
 * ответа 48 часов» и «отказ от звонков» разница юридическая: молчание — не
 * отказ, объект с молчанием остаётся в выдаче, а отказ убирает его совсем.
 * Поэтому оба состояния придётся называть словами целиком, а не сводить
 * к одному значку «нельзя».
 *
 * **Счётчика «последние 5 из 12» в шапке больше нет.** Он говорил про
 * спрятанные записи, которых не существует; считать здесь пока нечего, и
 * шапка молчит, а не называет выдуманное число.
 */
export function MobileConsentsPage() {
  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={<MobileSectionHeader title="Согласия" back />}
    >
      <div className="flex w-full flex-1 flex-col px-4 pt-6">
        <MobileEmptyState
          icon={ShieldCheck}
          title="Журнал пуст"
          text="Запросы подтверждения и отметки об отказе появятся здесь после первого обращения к собственнику."
        />
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Настройки агентства (`cdYS2`) ───────────────────────────────────

/** Какой лист настроек открыт. Одновременно бывает только один. */
type OpenSheet = "none" | "requisites" | "transfer" | "delete"

type SettingsGroupData = {
  label: string
  rows: {
    id: string
    icon: LucideIcon
    title: string
    note: string
    /** Что случится при нажатии. */
    action: string
    /** Какой лист открывает. Пусто — листа в файле не нарисовано. */
    opens?: Exclude<OpenSheet, "none">
    /** Опасная зона: плитка и заголовок цветом ошибки. */
    danger?: boolean
  }[]
}

/**
 * Двенадцать строк настроек, собранные от сеанса и агентства.
 *
 * Константой они быть перестали: половина подписей — это значения конкретного
 * агентства, и держать их списком в модуле значит держать чужие. Функция берёт
 * ровно то, что известно, и ничего не досочиняет.
 */
function settingsGroups(values: {
  /** Название агентства из сеанса. Пустая строка — сеанса нет. */
  agency: string
  /** Ответственный за данные: тот, кто завёл агентство. */
  officer: string
  officerNote: string
  consentNote: string
}): SettingsGroupData[] {
  return [
    {
      label: "РЕКВИЗИТЫ",
      rows: [
        {
          id: "name",
          icon: Building2,
          title: "Название агентства",
          // Прочерк, а не пустая строка: пустая подпись выглядит как обрыв
          // вёрстки, а не как «названия нет».
          note: values.agency === "" ? "—" : values.agency,
          action: "Меняет название агентства",
          // Все три реквизита ведут в ОДИН лист `TIJHR`: он и нарисован
          // тремя полями сразу. Три отдельных листа по одному полю пришлось
          // бы выдумать, а ИНН и адрес всё равно сверяются с ЕГРЮЛ вместе.
          opens: "requisites",
        },
        {
          id: "inn",
          icon: Hash,
          title: "ИНН",
          // При регистрации спрашивают только название агентства: ни ИНН,
          // ни адреса продукт ещё не собирает и хранить их негде.
          note: "не заполнен · нужен для договора и счетов",
          action: "Меняет ИНН и заново сверяет его с ЕГРЮЛ",
          opens: "requisites",
        },
        {
          id: "address",
          icon: MapPin,
          title: "Юридический адрес",
          note: "не заполнен · подставится из ЕГРЮЛ после проверки ИНН",
          action: "Меняет юридический адрес агентства",
          opens: "requisites",
        },
      ],
    },
    {
      label: "ОТВЕТСТВЕННЫЙ ЗА ДАННЫЕ",
      rows: [
        {
          id: "officer",
          icon: UserCheck,
          title: values.officer,
          note: values.officerNote,
          action: "Назначает другого ответственного за персональные данные",
          opens: "transfer",
        },
      ],
    },
    {
      label: "ПРАВИЛА АГЕНТСТВА",
      rows: [
        // Четыре правила агентства менять пока негде: экранов выбора в файле
        // нет, и сохранять выбор некуда. Поэтому подпись говорит, что правило
        // делает, а не какое значение у него стоит: вписанное «5 в сутки»
        // читалось бы как настроенный лимит, которого никто не настраивал.
        {
          id: "limit",
          icon: Gauge,
          title: "Дневной лимит по умолчанию",
          note: "применяется к новым сотрудникам",
          action: "Меняет дневной лимит для новых сотрудников",
        },
        {
          id: "autotopup",
          icon: Wallet,
          title: "Автопополнение баланса",
          note: "выставлять счёт при остатке меньше 2 000 ₽",
          action: "Меняет порог автопополнения счёта",
        },
        {
          id: "density",
          icon: Rows3,
          title: "Плотность по умолчанию",
          note: "строка выдачи 88 px или 64 px",
          action: "Меняет плотность списков для всего агентства",
        },
        {
          id: "log-access",
          icon: Eye,
          title: "Кто видит журнал доступа",
          note: "каждое раскрытие: кто, когда и по какому объекту",
          action: "Меняет, кто в агентстве видит журнал доступа",
        },
      ],
    },
    {
      label: "ДОКУМЕНТЫ",
      rows: [
        {
          id: "consent",
          icon: FileText,
          title: "Согласие на обработку данных",
          note: values.consentNote,
          action: "Открывает подписанное согласие на обработку данных",
        },
        {
          id: "contract",
          icon: FileDown,
          title: "Договор",
          note: "скачать в PDF",
          action: "Скачивает договор в PDF",
        },
      ],
    },
    {
      label: "ОПАСНАЯ ЗОНА",
      rows: [
        {
          id: "delete",
          icon: Trash2,
          title: "Удаление агентства",
          note: "три рабочих дня · журнал хранится год",
          // Красным становится смысл, а не форма: плитка `err-tint`, значок
          // и заголовок `err-text`, геометрия строки та же. Строка не должна
          // выглядеть иначе — она должна выглядеть опасной.
          danger: true,
          action: "Запускает удаление агентства: три рабочих дня на отмену",
          opens: "delete",
        },
      ],
    },
  ]
}

/**
 * МОБАЙЛ · Настройки агентства (`cdYS2`).
 *
 * **Настройки собраны по тому, кто их спросит, а не по тому, где они лежат.**
 * Реквизиты нужны бухгалтерии, ответственный за данные — проверяющему,
 * правила — самому руководителю, документы — тому и другому. Один список
 * из двенадцати строк заставлял бы каждый раз читать все двенадцать.
 *
 * **«Ответственный за данные» — отдельная группа из одной строки.** Так
 * требует закон о персональных данных: у агентства, которое звонит
 * собственникам, должен быть живой человек, отвечающий на их запросы.
 * Спрятать его среди реквизитов значило бы сделать вид, что это формальность.
 *
 * **Опасная зона названа вслух, но красным не выкрашена.** В продукте красный
 * значит ровно одно — «сейчас спишутся деньги», — и удаление агентства
 * этим цветом пользоваться не может. Предупреждает здесь заголовок группы
 * и подпись «три рабочих дня · журнал хранится год», а не цвет. Красный
 * появляется единожды и только внутри листа `hnnq8`, на кнопке, после
 * которой отмены нет.
 *
 * **Три из двенадцати строк теперь открывают листы**, и это те же три окна,
 * что у руководителя на компьютере: реквизиты, передача роли, удаление
 * агентства. Слова и правила проверки взяты у них — расходиться платформам
 * в том, что они обещают про юрлицо и про необратимость, нельзя.
 *
 * **Ни одного чужого реквизита на экране больше нет.** Здесь стояли «Невский
 * проспект», ИНН 7806154392, адрес на Свердловской набережной и Смирнова Ирина
 * Владимировна ответственной за персональные данные — образцы из макета,
 * которые живой человек читал как реквизиты своего агентства. По чужому ИНН
 * выставят счёт, а по чужой фамилии отправят запрос субъекта персональных
 * данных, и оба раза отвечать будет не тот, кто указан.
 *
 * Экран прокручивается целиком: содержимого больше, чем 844, и распорки
 * внизу у него нет.
 */
export function MobileAgencySettingsPage() {
  const session = useSession()
  const workspace = useWorkspace()
  const now = useNow()

  // Экран за охраной, без сеанса сюда не попасть. Пустая строка — единственный
  // запасной вариант: чужое название агентства здесь читалось бы как своё.
  const agency = session?.agency ?? ""

  // Ответственный за данные — тот, кто завёл агентство: другого источника нет,
  // пока роль никому не передавали. Прочерк вместо имени, если сеанса нет:
  // «роль некому нести» обязано быть видно.
  const officer = session?.name ?? "—"
  const officerNote =
    session?.role === "agent" ? "отвечает на запросы" : "руководитель · отвечает на запросы"

  // Согласие подписывают в момент создания агентства, а создаёт его тот, кто
  // зарегистрировался. Его запись в списке сотрудников — единственная честная
  // дата подписи; раньше здесь стояло «12.06.2026» из макета.
  const signedAt = workspace.people.find((person) => person.role === "owner")?.addedAt
  const consentNote =
    signedAt === undefined
      ? "подписано при создании агентства"
      : `подписано ${formatDay(signedAt, now)} при создании агентства`

  const groups = settingsGroups({ agency, officer, officerNote, consentNote })

  const [sheet, setSheet] = useState<OpenSheet>("none")

  /**
   * Реквизиты живут в базе, а до неё — нигде.
   *
   * Без сервера сохранять их некуда: колонки есть только в базе, а в браузере
   * они пережили бы ровно до смены устройства. Поэтому лист открывается с тем,
   * что уже записано, и пустые поля здесь — не ошибка, а «ещё не заполняли».
   * Ровно так же устроен экран настроек на компьютере.
   */
  const [requisites, setRequisites] = useState({ legalName: "", inn: "", legalAddress: "" })

  /**
   * Кому можно передать роль — все, кроме себя. Передать роль себе
   * бессмысленно, и своя строка в списке выбора читалась бы как ошибка.
   */
  const colleagues = workspace.people.filter(
    (person) =>
      person.email.trim().toLowerCase() !== (session?.email ?? "").trim().toLowerCase(),
  )

  /** Отчитаться о том, что сделал сервер. Молча такие действия проходить не должны. */
  const report = (done: string) => (failed: string | null) => {
    if (failed === null) notifyDone(done)
    else notifyError(failed)
    setSheet("none")
  }

  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={<MobileSectionHeader title="Настройки агентства" back />}
    >
      <div className="flex w-full flex-col gap-6 px-4 py-6">
        {/* Пустые кавычки «» читаются как поломка вёрстки, а не как отсутствие
            названия. Без сеанса подпись остаётся без имени агентства. */}
        <Typography variant="denseText" tone="dense">
          {agency === ""
            ? "Доступ 3 000 ₽ в месяц · до двадцати сотрудников"
            : `«${agency}» · доступ 3 000 ₽ в месяц · до двадцати сотрудников`}
        </Typography>

        {groups.map((group) => (
          <AgencySettingsGroup key={group.label} label={group.label}>
            {group.rows.map((row, index) => {
              // Значение снимается в переменную до замыкания: сужение типа
              // по свойству объекта внутри стрелки не переживает границу
              // функции, и `row.opens` там снова стал бы «может быть пусто».
              const opens = row.opens
              return (
                <AgencySettingRow
                  key={row.id}
                  icon={row.icon}
                  title={row.title}
                  note={row.note}
                  action={row.action}
                  danger={row.danger}
                  onPress={opens === undefined ? undefined : () => setSheet(opens)}
                  last={index === group.rows.length - 1}
                />
              )
            })}
          </AgencySettingsGroup>
        ))}
      </div>

      {/* Листы лежат поверх окна, а не внутри прокручиваемого тела: затемнение
          обязано накрыть и шапку, и нижнюю навигацию. Экран настроек занимает
          высоту окна целиком, поэтому `fixed`, а не `absolute`. */}
      {sheet === "requisites" ? (
        <RequisitesSheet
          // Название подставляется из сеанса, пока реквизиты не заполняли:
          // оно единственное, что продукт про юрлицо знает наверняка.
          legalName={requisites.legalName || agency}
          inn={requisites.inn}
          legalAddress={requisites.legalAddress}
          onClose={() => setSheet("none")}
          onSave={(next) => {
            setRequisites(next)
            void saveRequisites(next).then(report("Реквизиты сохранены"))
          }}
        />
      ) : null}

      {sheet === "transfer" ? (
        <TransferOwnerSheet
          ownerName={session?.name ?? ""}
          // Подпись строки — роль и лимит, теми же словами, что в окне
          // на компьютере: подпись, отвечающая на разных платформах
          // на разные вопросы, приводит к выбору разных людей.
          people={colleagues.map((person) => ({
            id: person.id,
            name: person.name,
            note: `${person.role === "owner" ? "руководитель" : "агент"} · ${
              person.limit === null ? "без лимита" : `лимит ${person.limit} в сутки`
            }`,
          }))}
          onClose={() => setSheet("none")}
          onTransfer={(id) => void transferOwner(id).then(report("Роль передана"))}
        />
      ) : null}

      {sheet === "delete" ? (
        <DeleteAgencySheet
          agency={agency}
          onClose={() => setSheet("none")}
          onRequest={() =>
            void requestDeletion().then(
              report("Запрос на удаление принят: данные удалим за три рабочих дня"),
            )
          }
        />
      ) : null}
    </MobileScreen>
  )
}
