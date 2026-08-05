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
import type { ReactNode } from "react"

import { Typography } from "@/components/typography"
import { useOwnAgency } from "@/features/auth"
import { MobileEmptyState, MobileScreen, MobileSectionHeader } from "@/features/cabinet"
import { cn } from "@/lib/utils"

/**
 * МОБАЙЛ · Агентство — шесть разделов руководителя.
 *
 * Кадры `bKoEu`, `P7DnP`, `FifB0`, `MBinc`, `r3Jbr`, `cdYS2`.
 *
 * **На телефоне у руководителя нет таблиц.** На десктопе агентство — это
 * восьмиколоночная таблица агентов и шестиколоночный журнал. На 390 таблиц
 * нет ни одной: каждая строка сложена в две — что произошло сверху, чем
 * кончилось справа, подробности приглушённой строкой снизу. Колонки, которые
 * не влезли, ушли в эту вторую строку словами: «агент · лимит 25 · 5 встреч ·
 * 2 070 ₽ за встречу» — это пять десктопных ячеек, пересказанных так, чтобы
 * читаться одним взглядом.
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
              selected
                ? "bg-fg text-surface"
                : "bg-surface text-fg outline-solid outline-1 -outline-offset-1 outline-border-control",
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
        "cursor-pointer text-left",
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
 * Не «ИНН — налоговый номер агентства», а «7806154392 · проверен в ЕГРЮЛ
 * 14.06.2026»: руководитель заходит сюда сверить, что стоит, а не узнать,
 * что такое ИНН.
 *
 * Высота задана минимумом, а не жёстко: юридический адрес в две строки
 * не влезает, и в файле он выходит за границы кадра. Обрезать его нельзя —
 * адрес, обрезанный посередине, перестаёт быть адресом.
 *
 * **Каждая строка называет своё действие в `data-action`, но окна не
 * открывает.** Двенадцати экранов правки за этими строками в файле нет:
 * ни смены ИНН, ни выбора порога автопополнения. Придумать их здесь значило
 * бы придумать дизайн, поэтому строка говорит, что случится при нажатии,
 * и на этом честно останавливается.
 */
function AgencySettingRow({
  icon: Icon,
  title,
  note,
  action,
  last = false,
}: {
  icon: LucideIcon
  title: string
  note: string
  /** Что произойдёт при нажатии. Экрана для этого в файле нет. */
  action: string
  last?: boolean
}) {
  return (
    <button
      type="button"
      data-slot="agency-setting-row"
      data-action={action}
      className={cn(
        "flex min-h-16 w-full cursor-pointer items-center gap-3 bg-transparent py-2 text-left",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        !last && "border-b border-line-2",
      )}
    >
      <Icon aria-hidden className="size-5 shrink-0 text-text-2" strokeWidth={2} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Typography variant="rowPrice" tone="default">
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
 * Воронка от раскрытия до договора.
 *
 * Ширина полосы снята из файла в пикселях при теле 358 и здесь пересчитана
 * в долю: 178 раскрытий занимают всю ширину, остальные ступени — свою часть
 * от них. Так соотношение остаётся верным и на кадре шире 390.
 *
 * **Жёлоба под полосой нет.** Полоса меряется не «сколько осталось», а
 * «сколько от первой ступени», и пустой серый остаток предлагал бы читать
 * недостачу там, где её никто не обещал.
 */
const FUNNEL_FULL_WIDTH = 358

const FUNNEL = [
  { label: "Раскрыто", value: "178", bar: 358 },
  { label: "Дозвонов", value: "96", bar: 193 },
  { label: "Диалогов", value: "28", bar: 56 },
  { label: "Встреч", value: "17", bar: 34 },
  { label: "Договоров", value: "3", bar: 6 },
]

const FUNNEL_MONEY = [
  { value: "2 084 ₽", label: "за встречу" },
  { value: "11 807 ₽", label: "за договор" },
]

/**
 * МОБАЙЛ · Агентство (`bKoEu`): куда уходят деньги агентства.
 *
 * **Воронка здесь без процентов и без арифметики отсева.** На десктопе рядом
 * с каждой ступенью стоит «54 % от раскрытых»; на 390 такая строка не встаёт,
 * и её роль берёт сама полоса: 96 против 178 видно глазом, без числа.
 *
 * **Итог воронки — деньги, а не конверсия.** «2 084 ₽ за встречу» и
 * «11 807 ₽ за договор» отделены линией и стоят последними: руководитель
 * решает по рублю за встречу, а не по процентам.
 *
 * Пяти ступеней здесь, а не четырёх, как на десктопе: между дозвоном и
 * встречей стоят «Диалоги» — те звонки, где собственник вообще стал говорить.
 * На телефоне это единственное место, где видно, что дозвон и разговор —
 * не одно и то же.
 */
export function MobileAgencyPage() {
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

        <section className="flex w-full shrink-0 flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            ОТ РАСКРЫТИЯ ДО ДОГОВОРА
          </Typography>

          {FUNNEL.map((step) => (
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
                style={{ width: `${(step.bar / FUNNEL_FULL_WIDTH) * 100}%` }}
              />
            </div>
          ))}
        </section>

        <div className="flex w-full shrink-0 items-start gap-6 border-t border-line-2 pt-4">
          {FUNNEL_MONEY.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
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
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Сотрудники (`P7DnP`) ────────────────────────────────────────────

const STAFF = [
  {
    id: "smirnova",
    title: "Смирнова Ирина",
    value: "64",
    meta: "руководитель · без лимита · 7 встреч · 1 819 ₽ за встречу",
  },
  {
    id: "lebedev",
    title: "Лебедев Максим",
    value: "52",
    meta: "агент · лимит 25 · 5 встреч · 2 070 ₽ за встречу",
  },
  {
    id: "titova",
    title: "Титова Анна",
    value: "38",
    meta: "агент · лимит 25 · 4 встречи · 1 891 ₽ за встречу",
  },
  {
    id: "gusev",
    title: "Гусев Пётр",
    value: "18",
    meta: "агент · лимит 5 · 1 встреча · 3 582 ₽ за встречу",
  },
  {
    id: "korolev",
    title: "Королёв Дмитрий",
    value: "6",
    meta: "агент · лимит 5 · встреч нет · последний вход 23.07",
  },
]

/**
 * МОБАЙЛ · Сотрудники (`P7DnP`): кто сколько раскрыл и чем это кончилось.
 *
 * **Единственная колонка — «Раскрыто», и это выбор.** Из восьми десктопных
 * колонок на телефон вынесено число раскрытий: оно и есть потраченные деньги.
 * Встречи и рубль за встречу переехали в приглушённую строку под именем —
 * их читают вторым взглядом, а не сравнивают столбиком.
 *
 * **Строка Королёва специально другая.** У всех в мете стоит цена встречи,
 * у него — «встреч нет · последний вход 23.07». Когда результата нет,
 * стоимость встречи не считается, и подставлять туда прочерк значило бы
 * делать вид, что человек просто дешёвый.
 *
 * Шапка списка 24 с волосяной линией `line-1` — светлой: она отделяет
 * заголовки от строк внутри одного списка, а не делит сами строки.
 */
export function MobileStaffPage() {
  // Свой кабинет начинается пустым: чужие строки сюда не переходят.
  const own = useOwnAgency()

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
            в неё нет. Карточка в файле нарисована одна — Гусева, — и в
            демонстрации она стоит за любым именем списка. */}
        {own ? (
          <MobileEmptyState
            icon={Users}
            title="В агентстве вы один"
            text="Приглашённые сотрудники появятся здесь: у каждого будет видно, сколько контактов он раскрыл и на какую сумму."
          />
        ) : (
          STAFF.map((person, index) => (
            <AgencyListRow
              key={person.id}
              title={person.title}
              value={person.value}
              valueStrong
              meta={person.meta}
              last={index === STAFF.length - 1}
              to="/m/agency/person"
            />
          ))
        )}

        <div className="flex-1" />
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Отказы (`FifB0`) ────────────────────────────────────────────────

const REFUSALS = [
  {
    id: "salova",
    title: "Салова ул., 68",
    value: "24.07",
    meta: "через serch.ru/stop · удалим к 29.07",
  },
  {
    id: "telmana-23",
    title: "Тельмана ул., 41",
    value: "23.07",
    meta: "по звонку, Анна Т. · удалим к 22.08",
  },
  {
    id: "sofiyskaya",
    title: "Софийская ул., 47",
    value: "22.07",
    meta: "через serch.ru/stop · идёт удаление",
  },
  {
    id: "telmana-21",
    title: "Тельмана ул., 41",
    value: "21.07",
    meta: "по звонку, Максим Л. · удалим к 20.08",
  },
  {
    id: "kostyushko",
    title: "Костюшко ул., 9",
    value: "19.07",
    meta: "через serch.ru/stop · исполнено 22.07",
  },
]

/**
 * МОБАЙЛ · Отказы (`FifB0`): кто просил не звонить и что с этим стало.
 *
 * **Мета отвечает на два вопроса: откуда отказ и когда он будет исполнен.**
 * «через serch.ru/stop · удалим к 29.07» — собственник нажал кнопку на нашей
 * странице сам; «по звонку, Анна Т.» — отметил агент во время разговора.
 * Разница юридическая: первое доказуемо без нас, второе держится на слове
 * сотрудника.
 *
 * **Срок стоит в каждой строке, даже когда всё уже сделано.** «Идёт удаление»
 * и «исполнено 22.07» — это не украшение, а то, что руководитель показывает
 * при проверке. Отказ без даты исполнения ничего не доказывает.
 *
 * Цветных отметок здесь нет ни одной: исход сказан словом. Раскрасить
 * «исполнено» зелёным значило бы предложить читать экран по цвету — а тут
 * читают по существу.
 */
export function MobileRefusalsPage() {
  // Свой кабинет начинается пустым: чужие строки сюда не переходят.
  const own = useOwnAgency()

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

        {own ? (
          <MobileEmptyState
            icon={BellOff}
            title="Стоп-лист пуст"
            text="Сюда попадает каждый собственник, который просил не звонить. Отметка ставится в панели звонка и снятию не подлежит."
          />
        ) : (
          REFUSALS.map((refusal, index) => (
            <AgencyListRow
              key={refusal.id}
              title={refusal.title}
              value={refusal.value}
              meta={refusal.meta}
              last={index === REFUSALS.length - 1}
            />
          ))
        )}

        <div className="flex-1" />
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Журнал доступа (`MBinc`) ────────────────────────────────────────

const ACCESS_LOG = [
  {
    id: "lenskaya",
    title: "Ленская ул., 10",
    value: "199 ₽",
    charged: true,
    meta: "Раскрытие контакта · вы · сегодня в 14:12",
  },
  {
    id: "industrialny",
    title: "Индустриальный пр., 26",
    value: "199 ₽",
    charged: true,
    meta: "Раскрытие контакта · Анна Т. · сегодня в 11:47",
  },
  {
    id: "grazhdansky",
    title: "Гражданский пр., 114",
    value: "0 ₽",
    charged: false,
    meta: "Просмотр раскрытого контакта · Анна Т. · сегодня в 11:05",
  },
  {
    id: "zanevsky",
    title: "Заневский пр., 32",
    value: "199 ₽",
    charged: true,
    meta: "Раскрытие контакта · Пётр Г. · сегодня в 09:38",
  },
  {
    id: "ligovka",
    title: "Расселение, Лиговка",
    value: "0 ₽",
    charged: false,
    meta: "Экспорт подборки · вы · вчера в 16:20",
  },
]

/**
 * МОБАЙЛ · Журнал доступа (`MBinc`): кто и когда открывал контакты.
 *
 * **Бесплатные действия записаны наравне с платными.** «Просмотр раскрытого
 * контакта · 0 ₽» и «Экспорт подборки · 0 ₽» стоят в том же списке, что
 * списания. Журнал существует не для бухгалтерии, а для ответа на вопрос
 * «кто видел телефон собственника» — и повторный просмотр отвечает на него
 * так же, как первое раскрытие.
 *
 * Ноль при этом приглушён и весом 500, а 199 ₽ — графитом весом 600: деньги
 * видно сразу, но бесплатное не спрятано.
 *
 * **«Вы» вместо своего имени.** Руководитель ищет в журнале чужие действия;
 * собственные ему опознавать не надо, и имя там было бы шумом.
 *
 * В шапке «последние 5 из 12»: экран показывает хвост, а не весь журнал.
 * Число сказано честно, чтобы никто не решил, что событий всего пять.
 */
export function MobileAccessLogPage() {
  // Свой кабинет начинается пустым: чужие строки сюда не переходят.
  const own = useOwnAgency()

  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={
        <MobileSectionHeader
          title="Журнал доступа"
          back
          action={<PeriodNote>последние 5 из 12</PeriodNote>}
        />
      }
    >
      <div className="flex w-full flex-1 flex-col px-4 pt-6">
        {own ? (
          <MobileEmptyState
            icon={ScrollText}
            title="Записей пока нет"
            text="Каждое раскрытие контакта и каждый просмотр номера попадут сюда строкой с автором и временем."
          />
        ) : (
          ACCESS_LOG.map((event, index) => (
            <AgencyListRow
              key={event.id}
              title={event.title}
              value={event.value}
              valueStrong={event.charged}
              meta={event.meta}
              last={index === ACCESS_LOG.length - 1}
            />
          ))
        )}

        <div className="flex-1" />
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Согласия собственников (`r3Jbr`) ────────────────────────────────

const CONSENTS = [
  {
    id: "nauki",
    title: "Науки пр., 17",
    value: "24.07",
    meta: "подтверждено · SMS · Ирина С.",
  },
  {
    id: "svetlanovsky",
    title: "Светлановский пр., 62",
    value: "24.07",
    meta: "ждём ответа · SMS · Пётр Г.",
  },
  {
    id: "kuznetsovskaya",
    title: "Кузнецовская ул., 44",
    value: "23.07",
    meta: "отказ от звонков · по звонку · Анна Т.",
  },
  {
    id: "grazhdansky",
    title: "Гражданский пр., 114",
    value: "23.07",
    meta: "подтверждено · SMS · Ирина С.",
  },
  {
    id: "obvodny",
    title: "наб. Обводного канала, 108",
    value: "22.07",
    meta: "нет ответа 48 часов · SMS · Максим Л.",
  },
]

/**
 * МОБАЙЛ · Согласия собственников (`r3Jbr`): у кого спросили разрешение
 * и что ответили.
 *
 * **Исход, канал и кто спрашивал — в одну приглушённую строку.** «подтверждено
 * · SMS · Ирина С.»: этих трёх фактов хватает, чтобы понять, можно ли звонить
 * и с кого спрашивать, если окажется, что нельзя.
 *
 * **Между «нет ответа 48 часов» и «отказ от звонков» разница юридическая.**
 * Молчание — не отказ, и объект с молчанием остаётся в выдаче; отказ убирает
 * объект совсем. Поэтому оба состояния названы словами целиком, а не сведены
 * к одному значку «нельзя».
 *
 * Дата справа приглушена и весом 500: она метит строку во времени, но
 * результат строки — не она, а первое слово меты.
 */
export function MobileConsentsPage() {
  // Свой кабинет начинается пустым: чужие строки сюда не переходят.
  const own = useOwnAgency()

  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={
        <MobileSectionHeader
          title="Согласия"
          back
          action={
            // Здесь период набран 13/600, а не 14/600, как в пяти остальных
            // кадрах, — так в файле.
            <Typography variant="numericDense" tone="dense">
              последние 5 из 12
            </Typography>
          }
        />
      }
    >
      <div className="flex w-full flex-1 flex-col px-4 pt-6">
        {own ? (
          <MobileEmptyState
            icon={ShieldCheck}
            title="Журнал пуст"
            text="Запросы подтверждения и отметки об отказе появятся здесь после первого обращения к собственнику."
          />
        ) : (
          CONSENTS.map((consent, index) => (
            <AgencyListRow
              key={consent.id}
              title={consent.title}
              value={consent.value}
              meta={consent.meta}
              last={index === CONSENTS.length - 1}
            />
          ))
        )}

        <div className="flex-1" />
      </div>
    </MobileScreen>
  )
}

// ── МОБАЙЛ · Настройки агентства (`cdYS2`) ───────────────────────────────────

type SettingsGroupData = {
  label: string
  rows: {
    id: string
    icon: LucideIcon
    title: string
    note: string
    /** Что случится при нажатии. Своего экрана ни у одной строки нет. */
    action: string
  }[]
}

const SETTINGS: SettingsGroupData[] = [
  {
    label: "РЕКВИЗИТЫ",
    rows: [
      {
        id: "name",
        icon: Building2,
        title: "Название агентства",
        note: "Невский проспект",
        action: "Меняет название агентства",
      },
      {
        id: "inn",
        icon: Hash,
        title: "ИНН",
        note: "7806154392 · проверен в ЕГРЮЛ 14.06.2026",
        action: "Меняет ИНН и заново сверяет его с ЕГРЮЛ",
      },
      {
        id: "address",
        icon: MapPin,
        title: "Юридический адрес",
        note: "Санкт-Петербург, Свердловская наб., 44, литера А, помещение 3-Н",
        action: "Меняет юридический адрес агентства",
      },
    ],
  },
  {
    label: "ОТВЕТСТВЕННЫЙ ЗА ДАННЫЕ",
    rows: [
      {
        id: "officer",
        icon: UserCheck,
        title: "Смирнова Ирина Владимировна",
        note: "руководитель · отвечает на запросы",
        action: "Назначает другого ответственного за персональные данные",
      },
    ],
  },
  {
    label: "ПРАВИЛА АГЕНТСТВА",
    rows: [
      {
        id: "limit",
        icon: Gauge,
        title: "Дневной лимит по умолчанию",
        note: "5 в сутки · применяется к новым сотрудникам",
        action: "Меняет дневной лимит для новых сотрудников",
      },
      {
        id: "autotopup",
        icon: Wallet,
        title: "Автопополнение баланса",
        note: "по порогу: счёт при остатке меньше 2 000 ₽",
        action: "Меняет порог автопополнения счёта",
      },
      {
        id: "density",
        icon: Rows3,
        title: "Плотность по умолчанию",
        note: "просторно, строка 88 px",
        action: "Меняет плотность списков для всего агентства",
      },
      {
        id: "log-access",
        icon: Eye,
        title: "Кто видит журнал доступа",
        note: "только руководитель",
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
        note: "подписано 12.06.2026 при создании агентства",
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
        action: "Запускает удаление агентства: три рабочих дня на отмену",
      },
    ],
  },
]

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
 * и подпись «три рабочих дня · журнал хранится год», а не цвет.
 *
 * Экран прокручивается целиком: содержимого больше, чем 844, и распорки
 * внизу у него нет.
 */
export function MobileAgencySettingsPage() {
  return (
    <MobileScreen
      activeTab="more"
      padded={false}
      header={<MobileSectionHeader title="Настройки агентства" back />}
    >
      <div className="flex w-full flex-col gap-6 px-4 py-6">
        <Typography variant="denseText" tone="dense">
          «Невский проспект» · доступ 3 000 ₽ в месяц · до двадцати сотрудников
        </Typography>

        {SETTINGS.map((group) => (
          <AgencySettingsGroup key={group.label} label={group.label}>
            {group.rows.map((row, index) => (
              <AgencySettingRow
                key={row.id}
                icon={row.icon}
                title={row.title}
                note={row.note}
                action={row.action}
                last={index === group.rows.length - 1}
              />
            ))}
          </AgencySettingsGroup>
        ))}
      </div>
    </MobileScreen>
  )
}
