import {
  Bell,
  ChevronRight,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Monitor,
  Pencil,
  Phone,
  RotateCcw,
  Rows3,
  ScrollText,
  Send,
  Shield,
  Smartphone,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSessionActions } from "@/features/auth"
import { MobileScreen, MobileSectionHeader } from "@/features/cabinet"
import { cn } from "@/lib/utils"

/**
 * МОБАЙЛ · Ещё, профиль, уведомления, безопасность.
 *
 * Шесть экранов последнего раздела нижней навигации. Все шесть построены
 * на одной строке-переключателе (`ESvsw`) и потому живут одним модулем:
 * править форму строки в шести местах — верный способ развести их между собой.
 *
 * **На телефоне «Ещё» заменяет пункт «Агентство» десктопного сайдбара.**
 * На десктопе разделы агентства стоят колонкой и видны сразу; на 390 их семь,
 * и они прячутся за один пункт. Это честнее, чем выкинуть половину: человек
 * видит, что раздел есть, и знает, где он.
 */

/**
 * Адреса, куда ведут строки этой группы.
 *
 * Список литералами, а не `string`: маршрутизатор проверяет адреса типами,
 * и опечатка в пути ловится до запуска, а не глазами владельца.
 */
type MobileSettingRoute =
  | "/m/profile"
  | "/m/notifications"
  | "/m/security"
  | "/m/agency/staff"
  | "/m/agency/consents"
  | "/m/agency/access"
  | "/m/change-password"

/**
 * Строка настройки на телефоне (`ESvsw`): 64, зазор 12, значок 20 слева,
 * название 16 и подпись 13 колонкой с зазором 4, значок 20 справа,
 * волосяная линия снизу.
 *
 * **Подпись под названием обязательна и говорит текущее значение, а не
 * повторяет заголовок.** Не «Уведомления — настройка уведомлений», а
 * «сразу · раз в день утром · выключено»: человек читает строку и уже знает,
 * как у него настроено, — заходить внутрь нужно только чтобы поменять.
 *
 * Строка целиком — цель нажатия, 64 px по высоте: значок справа только
 * показывает, что внутри что-то есть, и сам по себе не нажимается.
 *
 * **Строка бывает трёх пород, и порода видна по свойству.** `to` — за строкой
 * есть нарисованный экран, и она честная ссылка: её открывают в новой вкладке
 * и по ней возвращаются назад. `onPress` — строка меняет сеанс или этот же
 * экран. `action` — действие названо, но окна для него в макете нет: строка
 * остаётся кнопкой и говорит, что должно произойти, а рисовать выдуманную
 * плашку вместо отсутствующего экрана нельзя.
 */
type MobileSettingRowProps = {
  /** Значок слева, 20, вторичным цветом. */
  icon: LucideIcon
  title: string
  /** Текущее значение или последствие. У «Выйти» подписи нет — так в файле. */
  note?: string
  /** Значок справа: шеврон, карандаш, конверт. Только знак, не контрол. */
  trailingIcon?: LucideIcon
  /** Собственный контрол справа — например крестик закрытия чужого сеанса. */
  trailing?: ReactNode
  /** Название приглушено: так нарисовано «Выйти» — уход, а не переход. */
  quiet?: boolean
  /** Строка-факт, а не действие: своё устройство закрыть нельзя. */
  passive?: boolean
  /** Экран за строкой. Задан — строка становится ссылкой. */
  to?: MobileSettingRoute
  /** Действие над сеансом или над этим экраном. */
  onPress?: () => void
  /** Действие без нарисованного окна: названо и ничего не рисует. */
  action?: string
}

function MobileSettingRow({
  icon: Icon,
  title,
  note,
  trailingIcon: TrailingIcon,
  trailing,
  quiet = false,
  passive = false,
  to,
  onPress,
  action,
}: MobileSettingRowProps) {
  const body = (
    <>
      <Icon aria-hidden className="size-5 shrink-0 text-text-2" strokeWidth={2} />
      {/* Колонка выровнена влево явно: внутри кнопки текст иначе встал бы
          по центру и подпись разъехалась бы с названием. */}
      <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
        <Typography variant="rowPrice" tone={quiet ? "secondary" : "default"}>
          {title}
        </Typography>
        {note === undefined ? null : (
          <Typography variant="denseText" tone="dense">
            {note}
          </Typography>
        )}
      </span>
      {TrailingIcon === undefined ? null : (
        <TrailingIcon
          aria-hidden
          className="size-5 shrink-0 text-text-dense"
          strokeWidth={2}
        />
      )}
      {trailing === undefined ? null : <>{trailing}</>}
    </>
  )

  const shell = "flex h-16 w-full shrink-0 items-center gap-3 border-b border-line-2"

  // Кольцо фокуса рисуется внутрь: строка идёт от края до края поля,
  // и внешнее кольцо срезалось бы прокруткой.
  const pressable = cn(
    shell,
    "cursor-pointer bg-transparent",
    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg",
  )

  if (passive) {
    return (
      <div data-slot="mobile-setting-row" className={shell}>
        <>{body}</>
      </div>
    )
  }

  if (to !== undefined) {
    return (
      <Link to={to} data-slot="mobile-setting-row" className={pressable}>
        <>{body}</>
      </Link>
    )
  }

  return (
    <button
      type="button"
      data-slot="mobile-setting-row"
      data-action={action}
      onClick={onPress}
      className={pressable}
    >
      <>{body}</>
    </button>
  )
}

/**
 * Строка центра уведомлений: событие и время, поля [14, 0], зазор 12.
 *
 * **Время выровнено по верху, а не по центру.** Сообщение переносится на две
 * строки, время — никогда; выравнивание по центру уводило бы его вниз,
 * и колонка времени перестала бы читаться столбиком.
 */
function MobileNoticeRow({
  text,
  time,
  first = false,
}: {
  text: string
  time: string
  /** Первая строка группы: линии сверху у неё нет. */
  first?: boolean
}) {
  return (
    <div
      data-slot="mobile-notice-row"
      className={cn(
        "flex w-full items-start gap-3 py-3.5",
        // Линия между строками нарисована внутрь тенью, а не рамкой: в файле
        // обводка идёт внутрь и высоту не меняет, рамка добавила бы каждой
        // строке лишний пиксель. Это линия, а не глубина.
        !first && "shadow-[inset_0_1px_0_var(--line-2)]",
      )}
    >
      <div className="min-w-0 flex-1">
        <Typography variant="uiText" tone="default">
          {text}
        </Typography>
      </div>
      <span className="shrink-0">
        <Typography variant="metaText" tone="dense">
          {time}
        </Typography>
      </span>
    </div>
  )
}

/**
 * Поле пароля на телефоне: метка капслоком, поле 48 с радиусом 12 и подсказка.
 *
 * **Это не `TextField`.** Общее поле формы идёт 40 с радиусом 10, границей
 * `border-control` и значением 14; здесь 48, радиус 12, граница `line-2`
 * и значение 16. Другая геометрия — другой контрол, поэтому поле собрано
 * на месте, а не выдавлено из общего через переопределения.
 */
function MobilePasswordField({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  /** Правило, которое человек обязан знать до того, как начнёт вводить. */
  hint?: string
}) {
  return (
    <div data-slot="mobile-password-field" className="flex w-full flex-col gap-2">
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <div className="flex h-ctl-lg w-full items-center rounded-xl border border-line-2 bg-surface px-4">
        <Typography variant="rowPrice" tone="default">
          {value}
        </Typography>
      </div>
      {hint === undefined ? null : (
        <Typography variant="metaText" tone="dense">
          {hint}
        </Typography>
      )}
    </div>
  )
}

/** Тело раздела: поля [24, 16], зазор 24 — общий случай всех пяти экранов. */
function MobileSettingsBody({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-1 flex-col gap-6 px-4 py-6">{children}</div>
}

type SettingRowSpec = MobileSettingRowProps & { id: string }

/**
 * МОБАЙЛ · Ещё (`AJkLF`).
 *
 * Корень пятого раздела: кто вошёл и семь дверей. Стрелки «назад» в шапке нет —
 * возвращаться некуда, этот экран и есть вкладка нижней навигации.
 *
 * **Наверху стоит человек, а не настройки.** Раздел «Ещё» на телефоне
 * единственное место, где видно, под кем работает приложение: в шапке кабинета
 * помещаются только инициалы. Агентство подписано рядом с ролью, потому что
 * у одного человека их может быть несколько.
 *
 * «Выйти» стоит последним и набран приглушённым: это уход, а не переход,
 * и он не должен спорить взглядом с рабочими разделами над собой.
 *
 * **Шесть верхних строк — ссылки, седьмая — нет.** Шесть открывают экраны,
 * и по ним можно уйти в новую вкладку и вернуться назад. «Выйти» заканчивает
 * сеанс, а такое ссылкой не делают: адрес, который выкидывает из кабинета
 * при переходе по нему из истории браузера, — ловушка.
 */
const MORE_ROWS: SettingRowSpec[] = [
  { id: "profile", icon: User, title: "Профиль", note: "имя, телефон, почта", trailingIcon: ChevronRight, to: "/m/profile" },
  {
    id: "notifications",
    icon: Bell,
    title: "Уведомления",
    note: "сразу · раз в день утром · выключено",
    trailingIcon: ChevronRight,
    to: "/m/notifications",
  },
  {
    id: "security",
    icon: Shield,
    title: "Безопасность и сеансы",
    note: "два активных устройства",
    trailingIcon: ChevronRight,
    to: "/m/security",
  },
  {
    id: "staff",
    icon: Users,
    title: "Сотрудники",
    note: "пять человек, одно приглашение",
    trailingIcon: ChevronRight,
    to: "/m/agency/staff",
  },
  {
    id: "consents",
    icon: FileText,
    title: "Согласия собственников",
    note: "12 событий за 30 дней",
    trailingIcon: ChevronRight,
    to: "/m/agency/consents",
  },
  {
    id: "access",
    icon: ScrollText,
    title: "Журнал доступа",
    note: "кто и когда открывал контакты",
    trailingIcon: ChevronRight,
    to: "/m/agency/access",
  },
]

export function MobileMorePage() {
  const { signOut } = useSessionActions()
  const navigate = useNavigate()

  // Выход кончает сеанс и уводит на вход: остаться в кабинете без сеанса
  // человек не должен даже на секунду — иначе он видит чужие цифры,
  // которых у него больше нет права видеть.
  const leave = () => {
    signOut()
    void navigate({ to: "/m/login" })
  }

  return (
    <MobileScreen header={<MobileSectionHeader title="Ещё" />} activeTab="more" padded={false}>
      <MobileSettingsBody>
        <div className="flex w-full shrink-0 items-center gap-3">
          {/* Аватар 48 графитом. Инициалы наследуют цвет подложки —
              тон берётся от родителя, как в шапке кабинета. */}
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-fg text-surface">
            <Typography variant="rowPrice" tone="current">
              ИС
            </Typography>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Typography variant="rowPrice" tone="default">
              Смирнова Ирина
            </Typography>
            <Typography variant="denseText" tone="dense">
              руководитель · агентство «Невский проспект»
            </Typography>
          </div>
        </div>

        <div className="flex w-full flex-col">
          {MORE_ROWS.map(({ id, ...row }) => (
            <MobileSettingRow key={id} {...row} />
          ))}
          <MobileSettingRow icon={LogOut} title="Выйти" quiet onPress={leave} />
        </div>

        {/* Распорка низа: разделы прижаты к шапке, а не растянуты по экрану. */}
        <div className="flex-1" />
      </MobileSettingsBody>
    </MobileScreen>
  )
}

/**
 * МОБАЙЛ · Профиль (`f3X8BR`).
 *
 * Пять строк: три о человеке и две о том, как он видит кабинет.
 *
 * **Карандаш и шеврон значат разное.** Карандаш — «поменяется значение,
 * которое написано в строке» (имя, телефон, почта); шеврон — «откроется
 * следующий экран с выбором» (плотность, стартовый экран). Один и тот же
 * знак на всех пяти строках стёр бы разницу между правкой и переходом.
 *
 * Плотность интерфейса и стартовый экран живут здесь, а не в «Настройках
 * агентства»: это выбор человека, а не правило конторы, и у двух агентов
 * одного агентства он законно разный.
 *
 * **Ни у одной из пяти строк нарисованного окна нет — ни поля правки,
 * ни экрана выбора.** Поэтому каждая строка названа действием и не рисует
 * ничего: выдуманное поле ввода на месте карандаша обещало бы правку,
 * которой в продукте пока не существует, и владелец узнал бы об этом
 * не из отчёта, а от первого же агентства.
 */
const PROFILE_ROWS: SettingRowSpec[] = [
  {
    id: "name",
    icon: User,
    title: "Смирнова Ирина",
    note: "руководитель агентства",
    trailingIcon: Pencil,
    action: "Изменить имя",
  },
  {
    id: "phone",
    icon: Phone,
    title: "+7 900 000-57-66",
    note: "рабочий телефон",
    trailingIcon: Pencil,
    action: "Изменить рабочий телефон",
  },
  {
    id: "mail",
    icon: Mail,
    title: "i.smirnova@nevsky.ru",
    note: "почта, на неё приходят уведомления",
    trailingIcon: Pencil,
    action: "Изменить почту",
  },
  {
    id: "density",
    icon: Rows3,
    title: "Просторно",
    note: "плотность интерфейса, строка 88",
    trailingIcon: ChevronRight,
    action: "Выбрать плотность интерфейса",
  },
  {
    id: "start",
    icon: LayoutDashboard,
    title: "Сегодня",
    note: "стартовый экран при входе",
    trailingIcon: ChevronRight,
    action: "Выбрать стартовый экран",
  },
]

export function MobileProfilePage() {
  return (
    <MobileScreen
      header={<MobileSectionHeader title="Профиль" back />}
      activeTab="more"
      padded={false}
    >
      <MobileSettingsBody>
        <div className="flex w-full flex-col">
          {PROFILE_ROWS.map(({ id, ...row }) => (
            <MobileSettingRow key={id} {...row} />
          ))}
        </div>
        <div className="flex-1" />
      </MobileSettingsBody>
    </MobileScreen>
  )
}

/**
 * МОБАЙЛ · Уведомления (`jTLZb`) — настройка, а не лента.
 *
 * **Ни одного переключателя.** Каждая строка ведёт на свой выбор, потому что
 * ответов больше двух: «сразу», «раз в день утром», «выключено». Тумблер
 * соврал бы, сведя три ответа к да/нет, — и человек, увидев его включённым,
 * не узнал бы, приходит ли ему письмо каждую минуту или раз в сутки.
 *
 * Подпись у каждой строки — текущее значение. Экран читается сверху вниз
 * как ответ на вопрос «что мне вообще приходит», без единого захода внутрь.
 *
 * **Строки названы действием, а не переключены на месте.** Шеврон обещает
 * экран с выбором из трёх ответов, и такого экрана в макете нет. Превратить
 * шеврон в тумблер значило бы соврать ровно тем способом, от которого экран
 * и отказался: свести «сразу», «раз в день утром» и «выключено» к да/нет.
 */
const NOTIFICATION_ROWS: SettingRowSpec[] = [
  {
    id: "saved-searches",
    icon: Bell,
    title: "Новые по сохранённым поискам",
    note: "сразу",
    trailingIcon: ChevronRight,
    action: "Выбрать, как часто приходят новые по сохранённым поискам",
  },
  {
    id: "channel",
    icon: Send,
    title: "Канал уведомлений",
    note: "e-mail",
    trailingIcon: ChevronRight,
    action: "Выбрать канал уведомлений",
  },
  {
    id: "colleague",
    icon: Users,
    title: "Коллега взял объект",
    note: "включено, если вы его смотрели",
    trailingIcon: ChevronRight,
    action: "Выбрать, когда сообщать, что коллега взял объект",
  },
  {
    id: "refund",
    icon: RotateCcw,
    title: "Ответ по заявке на возврат",
    note: "включено",
    trailingIcon: ChevronRight,
    action: "Выбрать, сообщать ли ответ по заявке на возврат",
  },
  {
    id: "balance",
    icon: Wallet,
    title: "Баланс заканчивается",
    note: "включено, меньше десяти раскрытий",
    trailingIcon: ChevronRight,
    action: "Выбрать, когда предупреждать о конце баланса",
  },
]

export function MobileNotificationSettingsPage() {
  return (
    <MobileScreen
      header={<MobileSectionHeader title="Уведомления" back />}
      activeTab="more"
      padded={false}
    >
      <MobileSettingsBody>
        <div className="flex w-full flex-col">
          {NOTIFICATION_ROWS.map(({ id, ...row }) => (
            <MobileSettingRow key={id} {...row} />
          ))}
        </div>
        <div className="flex-1" />
      </MobileSettingsBody>
    </MobileScreen>
  )
}

/**
 * МОБАЙЛ · Центр уведомлений (`lidwQ`) — лента, а не настройка.
 *
 * Тот же заголовок «Уведомления», что и у настройки, но приходят сюда с другой
 * стороны: подсвечена вкладка «Сегодня», а не «Ещё». Настройка живёт в «Ещё»,
 * потому что её открывают раз в месяц; лента — рядом с рабочим днём.
 *
 * **Группы «Сегодня» и «Ранее», а не даты у каждой строки.** Уведомление живёт
 * часы: сегодняшнее требует действия, вчерашнее уже нет. Время внутри группы
 * идёт часами, в «Ранее» — числом: там час уже ничего не значит.
 *
 * «Прочитать все» стоит у группы «Сегодня» и только у неё: разбирают то,
 * что пришло сегодня, старое разбирать поздно.
 *
 * **Прочитанное в файле ничем не помечено — ни точкой, ни цветом.** Значит
 * единственное честное следствие «Прочитать все» — исчезновение самого
 * действия: разбирать больше нечего. Пометка непрочитанного, которой в макете
 * нет, здесь не заводится: её место — решение владельца, а не догадка кода.
 */
type NoticeGroup = {
  label: string
  /** Действие у метки группы. Есть только у «Сегодня». */
  action?: string
  rows: { text: string; time: string }[]
}

const NOTICE_GROUPS: NoticeGroup[] = [
  {
    label: "СЕГОДНЯ",
    action: "Прочитать все",
    rows: [
      { text: "Красногвардейский 2-к до 15: двенадцать новых объектов", time: "14:02" },
      { text: "Титова Анна оформила возврат 199 ₽, Индустриальный пр., 26", time: "15:40" },
      { text: "Гусев Пётр просит увеличить дневной лимит", time: "09:15" },
    ],
  },
  {
    label: "РАНЕЕ",
    rows: [{ text: "Подписка 3 000 ₽ спишется 1 августа", time: "27.07" }],
  },
]

export function MobileNotificationCenterPage() {
  const [readGroups, setReadGroups] = useState<string[]>([])

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Уведомления" back />}
      activeTab="today"
      padded={false}
    >
      <MobileSettingsBody>
        {NOTICE_GROUPS.map((group) => (
          <section key={group.label} className="flex w-full flex-col gap-2">
            <div className="flex w-full items-center">
              <Typography variant="columnHeader" tone="dense">
                {group.label}
              </Typography>
              {group.action === undefined || readGroups.includes(group.label) ? null : (
                <>
                  <div className="h-px flex-1" />
                  <button
                    type="button"
                    data-slot="mobile-notice-action"
                    onClick={() => setReadGroups((read) => [...read, group.label])}
                    className="cursor-pointer bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                  >
                    <Typography variant="tabActive" tone="default">
                      {group.action}
                    </Typography>
                  </button>
                </>
              )}
            </div>
            <div className="flex w-full flex-col">
              {group.rows.map((row, index) => (
                <MobileNoticeRow key={row.time} {...row} first={index === 0} />
              ))}
            </div>
          </section>
        ))}
        <div className="flex-1" />
      </MobileSettingsBody>
    </MobileScreen>
  )
}

/**
 * МОБАЙЛ · Безопасность и сеансы (`hxSFc`).
 *
 * **Экран показывает безопасность, а не настраивает её.** Длина пароля, число
 * попыток и срок кода — решения продукта, одинаковые для всех агентств;
 * притворяться, что человек ими управляет, нечестно. Настоящих действий три,
 * и все три необратимы: сменить пароль, закрыть чужой сеанс, закрыть все чужие.
 *
 * Своё устройство стоит без крестика: закрыть свой же сеанс — это «выйти»,
 * а «Выйти» живёт в «Ещё» и означает другое. Строка остаётся строкой-фактом.
 *
 * Разделы идут с зазором 12, а не вплотную, как на остальных экранах: здесь
 * между ними стоит метка «АКТИВНЫЕ СЕАНСЫ», и сплошной список слипся бы с ней.
 */

/**
 * Чужие сеансы — те, что можно закрыть.
 *
 * Список отдельно от разметки, потому что он живой: крестик убирает одну
 * строку, «Завершить остальные сеансы» — все сразу. Исчезнувшая строка и есть
 * весь ответ продукта: подтверждения в макете нет, и придумывать его нельзя,
 * а сеанс, который после нажатия остался бы на экране, врал бы прямо в глаза.
 */
const OTHER_SESSIONS: { id: string; icon: LucideIcon; title: string; note: string }[] = [
  {
    id: "chrome-windows",
    icon: Monitor,
    title: "Chrome на Windows",
    note: "Санкт-Петербург, вчера в 18:40",
  },
]

export function MobileSecurityPage() {
  const [otherSessions, setOtherSessions] = useState(OTHER_SESSIONS)

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Безопасность и сеансы" back />}
      activeTab="more"
      padded={false}
    >
      <MobileSettingsBody>
        <div className="flex w-full flex-col gap-3">
          <MobileSettingRow
            icon={KeyRound}
            title="Пароль"
            note="изменён 12 июня"
            trailingIcon={ChevronRight}
            to="/m/change-password"
          />

          <Typography variant="columnHeader" tone="dense">
            АКТИВНЫЕ СЕАНСЫ
          </Typography>

          <MobileSettingRow
            icon={Smartphone}
            title="iPhone, Санкт-Петербург"
            note="это устройство, сеанс с 09:12"
            passive
          />

          {/*
            Крестик — отдельное действие внутри строки-факта, а не переход:
            строка не открывается, она закрывается. Поэтому сама строка
            не кнопка, а кнопка только крестик, и у него есть имя.
          */}
          {otherSessions.map((session) => (
            <MobileSettingRow
              key={session.id}
              icon={session.icon}
              title={session.title}
              note={session.note}
              passive
              trailing={
                <button
                  type="button"
                  aria-label={`Завершить сеанс ${session.title}`}
                  onClick={() =>
                    setOtherSessions((rest) =>
                      rest.filter((item) => item.id !== session.id),
                    )
                  }
                  className="flex size-5 shrink-0 cursor-pointer items-center justify-center bg-transparent text-text-dense outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                >
                  <X aria-hidden className="size-5" strokeWidth={2} />
                </button>
              }
            />
          ))}

          {/*
            Подпись отвечает на страх, из-за которого человек не жмёт:
            «на этом устройстве вход сохранится». Ответ обязан стоять
            в самой строке, а не после неё, иначе он опоздал.
          */}
          <MobileSettingRow
            icon={LogOut}
            title="Завершить остальные сеансы"
            note="на этом устройстве вход сохранится"
            onPress={() => setOtherSessions([])}
          />

          {/*
            Подтверждение входа по коду — правило продукта, экрана настройки
            у него в макете нет. Строка названа действием и ничего не рисует:
            тумблер здесь пообещал бы выключение, которого продукт не даёт.
          */}
          <MobileSettingRow
            icon={Mail}
            title="Подтверждение входа по коду"
            note="код из письма при входе с нового устройства"
            trailingIcon={Mail}
            action="Настроить подтверждение входа по коду"
          />
        </div>
        <div className="flex-1" />
      </MobileSettingsBody>
    </MobileScreen>
  )
}

/**
 * МОБАЙЛ · Сменить пароль (`q2rO9f`).
 *
 * **Единственный экран группы без нижней навигации.** Это задача, а не раздел:
 * из неё выходят назад или сохранением, и вкладки внизу звали бы бросить
 * наполовину заполненную форму.
 *
 * Лид стоит до полей, а не после: «все сеансы, кроме этого, завершатся» —
 * последствие, которое надо знать до ввода, а не узнать после нажатия.
 * Там же сказано, что почту меняет только поддержка: человек, пришедший
 * сюда за сменой почты, разворачивается сразу, а не после трёх полей.
 *
 * Требования к паролю подписаны под полями, а не спрятаны в ошибку: правило,
 * показанное после промаха, — это уже наказание, а не помощь.
 */
export function MobileChangePasswordPage() {
  const navigate = useNavigate()

  return (
    // Каркас собран на месте, а не через `MobileScreen`: тот всегда рисует
    // нижнюю навигацию, а в файле её на этом экране нет.
    <div
      data-slot="mobile-screen"
      className="flex h-svh w-full flex-col overflow-hidden bg-bg"
    >
      <MobileSectionHeader title="Сменить пароль" back />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
        <Typography variant="uiText" tone="secondary">
          После смены пароля все сеансы, кроме этого, завершатся. Почту меняет только
          поддержка — это защита от увода аккаунта.
        </Typography>

        <MobilePasswordField label="ТЕКУЩИЙ ПАРОЛЬ" value="••••••••••" />
        <MobilePasswordField
          label="НОВЫЙ ПАРОЛЬ"
          value="••••••••••••"
          hint="не короче десяти знаков"
        />
        <MobilePasswordField
          label="ПОВТОРИТЕ ПАРОЛЬ"
          value="••••••••••••"
          hint="должен совпадать с новым"
        />

        {/*
          Сохранение закрывает задачу и возвращает туда, откуда пришли, —
          так сказано в описании экрана: из него выходят назад или сохранением.

          Переход сделан кнопкой, а не ссылкой, вынужденно: закрытая кнопка
          продукта всегда печатает подпись отдельным узлом, и `asChild` у неё
          не работает — Slot требует ровно одного потомка. Чинится это одной
          правкой в `components/controls/Button.tsx`, которая в эту задачу
          не входит; до тех пор кнопку нельзя открыть в новой вкладке.
        */}
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() => void navigate({ to: "/m/security" })}
        >
          Сохранить пароль
        </Button>

        <div className="flex-1" />

        {/* Сноска внизу, а не рядом с кнопкой: это правило продукта,
            одинаковое для всех агентств, и менять его человек не может. */}
        <Typography variant="metaText" tone="dense">
          Пять попыток входа подряд, потом пауза пятнадцать минут. Так настроено для всех
          агентств и не меняется.
        </Typography>
      </div>
    </div>
  )
}
