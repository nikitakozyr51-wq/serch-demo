import {
  Bell,
  ChevronRight,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
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
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link, useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSession, useSessionActions } from "@/features/auth"
import type { DemoSession } from "@/features/auth"
import { MobileEmptyState, MobileScreen, MobileSectionHeader } from "@/features/cabinet"
import { useWorkspace } from "@/features/workspace"
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
    // Строка настроек — та же нажимаемая строка, что в выдаче, и правило
    // отклика у неё общее: живёт в `index.css`, а не переписывается здесь.
    "row-tap cursor-pointer bg-transparent",
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
 *
 * **Подписи, которые были числами, стали описаниями — кроме одной.** Раньше
 * здесь стояли «два активных устройства», «пять человек, одно приглашение»,
 * «12 событий за 30 дней»: образцы текста из макета, выданные живому человеку
 * за его собственные цифры. Посчитать из работы агентства можно только
 * сотрудников — их и считаем; остальные строки честно говорят, что внутри,
 * а не сколько там.
 */
function moreRows(staff: number): SettingRowSpec[] {
  return [
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
      note: "пароль, устройства, вход по коду",
      trailingIcon: ChevronRight,
      to: "/m/security",
    },
    {
      id: "staff",
      icon: Users,
      title: "Сотрудники",
      note: staffNote(staff),
      trailingIcon: ChevronRight,
      to: "/m/agency/staff",
    },
    {
      id: "consents",
      icon: FileText,
      title: "Согласия собственников",
      note: "запросы подтверждения и отказы от звонков",
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
}

/**
 * «1 человек», «2 человека», «5 человек».
 *
 * Счёт русского языка пишется здесь руками, потому что число берётся из работы
 * агентства и меняется: «пять человек» строкой снова стало бы образцом текста
 * на следующий же день после первого приглашения.
 */
function staffNote(count: number): string {
  const hundreds = count % 100
  const units = count % 10

  if (hundreds < 11 || hundreds > 14) {
    if (units === 1) return `${count} человек`
    if (units >= 2 && units <= 4) return `${count} человека`
  }

  return `${count} человек`
}

export function MobileMorePage() {
  // Кто вошёл — из сеанса, сколько людей в агентстве — из его же работы.
  // Ни одно из этих значений нельзя знать заранее: вписанные сюда имя, роль
  // и агентство были образцом текста из макета и показывались каждому, кто
  // открывал раздел, — как будто это он сам.
  const session = useSession()
  const { people } = useWorkspace()
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
              тон берётся от родителя, как в шапке кабинета.

              Без сеанса кружок остаётся пустым: кабинет закрыт охраной, и
              сюда без входа не попасть, а чужие инициалы в этом месте были бы
              не заглушкой, а прямым враньём про то, под кем работает человек. */}
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-fg text-surface">
            <Typography variant="rowPrice" tone="current">
              {session?.initials ?? ""}
            </Typography>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Typography variant="rowPrice" tone="default">
              {session?.name ?? ""}
            </Typography>
            <Typography variant="denseText" tone="dense">
              {session === null
                ? ""
                : `${session.role === "agent" ? "агент" : "руководитель"} · агентство «${session.agency}»`}
            </Typography>
          </div>
        </div>

        <div className="flex w-full flex-col">
          {moreRows(people.length).map(({ id, ...row }) => (
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
 *
 * **Имя и почта — из сеанса, телефон — прочерк.** Имя и почту человек ввёл
 * сам при создании агентства, и они настоящие. Телефона в сеансе нет вовсе:
 * его негде взять, пока форма правки не работает, — и на его месте стоит
 * прочерк, а не правдоподобный номер.
 */
function profileRows(session: DemoSession | null): SettingRowSpec[] {
  return [
    {
      id: "name",
      icon: User,
      title: session?.name ?? "",
      note: session === null ? "" : session.role === "agent" ? "агент агентства" : "руководитель агентства",
      trailingIcon: Pencil,
      action: "Изменить имя",
    },
    {
      id: "phone",
      icon: Phone,
      title: "—",
      note: "рабочий телефон",
      trailingIcon: Pencil,
      action: "Изменить рабочий телефон",
    },
    {
      id: "mail",
      icon: Mail,
      title: session?.email ?? "",
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
}

export function MobileProfilePage() {
  const session = useSession()

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Профиль" back />}
      activeTab="more"
      padded={false}
    >
      <MobileSettingsBody>
        <div className="flex w-full flex-col">
          {profileRows(session).map(({ id, ...row }) => (
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
 * **ЛЕНТА ПУСТА, И ЭТО ЕДИНСТВЕННОЕ ЧЕСТНОЕ СОСТОЯНИЕ.** Здесь стояли четыре
 * строки с чужими именами, чужими адресами и чужими суммами — образцы текста
 * из макета, показанные живому человеку как его собственные уведомления.
 * Журнала уведомлений в продукте нет: события никуда не записываются и никому
 * не рассылаются, — а значит показывать в ленте нечего.
 *
 * Вместе со строками ушли группы «Сегодня» и «Ранее» и действие «Прочитать
 * все»: группировать и отмечать прочитанным нечего. Их форма снята замером
 * с файла и вернётся вместе с настоящими событиями, а не раньше.
 *
 * Пустое состояние называет поводы, ради которых продукт вообще пишет
 * человеку, — те же, что перечислены на экране настройки уведомлений,
 * и отсылает туда же. Человек видит не «здесь ничего нет», а «вот чего
 * отсюда ждать и где это включается».
 */
export function MobileNotificationCenterPage() {
  return (
    <MobileScreen
      header={<MobileSectionHeader title="Уведомления" back />}
      activeTab="today"
      padded={false}
    >
      <MobileSettingsBody>
        <MobileEmptyState
          icon={Bell}
          title="Уведомлений нет"
          text="Сюда придут новые объекты по сохранённым поискам, ответы по заявкам на возврат и предупреждение о конце баланса. Что именно приходит, настраивается в «Ещё → Уведомления»."
        />
      </MobileSettingsBody>
    </MobileScreen>
  )
}

/**
 * МОБАЙЛ · Безопасность и сеансы (`hxSFc`).
 *
 * **Экран показывает безопасность, а не настраивает её.** Длина пароля, число
 * попыток и срок кода — решения продукта, одинаковые для всех агентств;
 * притворяться, что человек ими управляет, нечестно.
 *
 * **ЧУЖОГО СЕАНСА В СПИСКЕ БОЛЬШЕ НЕТ.** Здесь стояло второе устройство
 * с городом и временем входа — образец текста из макета, который каждый
 * человек читал как «в мой кабинет заходили с чужого компьютера, вчера
 * вечером». Вместе с ним ушли крестик и «Завершить остальные сеансы»:
 * закрывать нечего, а кнопка, которая после нажатия ничего не меняет, — это
 * тот же обман, только тише.
 *
 * Настоящее действие осталось одно и оно необратимо: сменить пароль. Своё
 * устройство стоит строкой-фактом: закрыть свой же сеанс — это «выйти»,
 * а «Выйти» живёт в «Ещё» и означает другое.
 *
 * Разделы идут с зазором 12, а не вплотную, как на остальных экранах: здесь
 * между ними стоит метка «АКТИВНЫЕ СЕАНСЫ», и сплошной список слипся бы с ней.
 */
export function MobileSecurityPage() {
  const session = useSession()

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Безопасность и сеансы" back />}
      activeTab="more"
      padded={false}
    >
      <MobileSettingsBody>
        <div className="flex w-full flex-col gap-3">
          {/*
            Подпись — последствие, а не дата: когда пароль меняли в последний
            раз, продукт нигде не хранит, а «изменён 12 июня» стояло здесь
            числом из макета. Последствие человеку нужнее даты: он читает его
            до нажатия, а не узнаёт после.
          */}
          <MobileSettingRow
            icon={KeyRound}
            title="Пароль"
            note="смена завершит остальные сеансы"
            trailingIcon={ChevronRight}
            to="/m/change-password"
          />

          <Typography variant="columnHeader" tone="dense">
            АКТИВНЫЕ СЕАНСЫ
          </Typography>

          {/*
            Про это устройство честно известно ровно одно — под какой почтой
            с него вошли. Ни модели, ни города, ни времени начала сеанса продукт
            не знает: стоявшие здесь раньше три значения были выдумкой, которую
            человек читал как показание системы.
          */}
          <MobileSettingRow
            icon={Smartphone}
            title="Это устройство"
            note={session?.email}
            passive
          />

          <Typography variant="metaText" tone="dense">
            Пока в списке только это устройство: вход с другого телефона или
            компьютера сюда ещё не приходит.
          </Typography>

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
