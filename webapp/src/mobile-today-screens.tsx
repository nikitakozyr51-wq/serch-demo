import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"
import type { MouseEvent, ReactNode } from "react"
import {
  AlarmClock,
  ArrowLeft,
  CalendarCheck,
  Mic,
  Sun,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useOwnAgency, useSession, useSessionActions } from "@/features/auth"
import { MobileBottomNav, MobileEmptyState, MobileHeader, MobileSectionHeader, PhoneFrame } from "@/features/cabinet"
import { ListingPhoto, MarketDeviation } from "@/features/listings"
import { notifyDone, notifyError } from "@/platform/notify"
import { recordCall, useNow, type CallOutcome } from "@/features/workspace"
import { cn } from "@/lib/utils"

/**
 * Четыре экрана дня и лист фильтров: `BhGA4`, `cOYqC`, `EKtRe`, `jvGY2`, `gFIin`.
 *
 * Все пять сняты замером с файла Pencil. Общее у них одно: телефон 390 × 844,
 * шапка 56, нижняя навигация 72 — и на этом сходство кончается, потому что
 * каждый экран решает свою задачу и берёт свою раскладку.
 */

/* ────────────────────────────────────────────────────────────────────────── */
/*  Общие части этого файла                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Кадр телефона на десктопном стенде.
 *
 * Форма взята у уже собранных `mobile-search-screen.tsx` и `mobile-call-screen.tsx`:
 * 390 × 844 по центру страницы, чтобы экран можно было смотреть в обычном
 * браузере рядом с макетом. Общий каркас `MobileScreen` здесь не подходит —
 * он растянут на `h-svh` и на стенде занял бы весь монитор.
 */
function PhoneStand({ slot, children }: { slot: string; children: ReactNode }) {
  return (
    <PhoneFrame slot={slot}>
      {children}
    </PhoneFrame>
  )
}

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
 * Чип-капсула 44.
 *
 * Общий `SelectChip` сюда не подошёл: у него высота 28, радиус 8 и подпись 13 —
 * он живёт в десктопной форме рядом с полями ввода. Здесь в файле нарисована
 * капсула 44 с полями 16 и подписью 14/500, и это другой контрол, а не тот же
 * с другими числами. Палец берёт 44, а не 28, — на телефоне ступеней ниже
 * сорока четырёх нет.
 *
 * Граница невыбранного чипа в файле трёх разных цветов: `border-control`
 * у условий, которые можно добавить, `line-3` в форме записи результата
 * и `line-2` у подсказок метро. Разница воспроизведена как есть и вынесена
 * в отчёт: смысла у трёх оттенков не читается.
 */
type ChipEdge = "control" | "line-2" | "line-3"

function TouchChip({
  label,
  selected = false,
  edge = "control",
  onPress,
}: {
  label: string
  selected?: boolean
  edge?: ChipEdge
  onPress?: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      data-slot="touch-chip"
      data-selected={selected || undefined}
      className={cn(
        "flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full px-4 whitespace-nowrap",
        "outline-solid outline-1 -outline-offset-1",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg",
        /*
          Отклик на касание. На телефоне наведения не существует, поэтому
          нажатие берёт СРАЗУ вторую ступень лестницы — ту же, что берёт
          строка выдачи в `.row-tap`: `surface → warm-hover`, `fg → fg-press`.
          Первая ступень на касании была бы почти не видна: палец закрывает
          собой ровно то место, которое подсветилось.

          Спека, раздел 5: «Отклик на касание, а не на отпускание. Подсветка
          мгновенно». Время действия уже приходит по `pointerdown` через
          `pressProps`; здесь — то, что человек при этом видит.
        */
        "transition-colors duration-120",
        selected
          ? "bg-fg text-surface outline-fg active:bg-fg-press"
          : cn(
              "bg-surface text-fg active:bg-warm-hover",
              edge === "control" && "outline-border-control",
              edge === "line-2" && "outline-line-2",
              edge === "line-3" && "outline-line-3",
            ),
      )}
      {...(onPress ? pressProps(onPress) : {})}
    >
      <Typography variant="uiText" tone="current">
        <>{label}</>
      </Typography>
    </button>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  МОБАЙЛ · Сегодня                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Экран `BhGA4`. Тело с полями 16 и зазором 12, список карточек с зазором 8.
 *
 * **Это не выдача, а список обязательств.** В выдаче объект описан тем, что
 * он такое: цена, метро, площадь, признаки собственника. Здесь у каждой
 * карточки есть четвёртая строка, которой в выдаче нет вовсе, — что уже было:
 * «Вы раскрыли в 14:12, дважды без ответа», «Анна Т. вчера в 18:40: ждёт
 * звонка после 17:00». И пятая — когда: «Сегодня, 16:00», «2 дня без звонка».
 * Экран отвечает на вопрос «что я обещал», а не «что есть на рынке».
 *
 * Поэтому и признаков собственника здесь нет, и тройки публикаций нет,
 * и кнопка одна — «Позвонить» за 0 ₽. Раскрывать нечего: контакт уже куплен,
 * иначе объект бы сюда не попал.
 *
 * **Срок покрашен смыслом, а не украшением.** Графит — обычный срок на сегодня,
 * охра — просрочка («2 дня без звонка»), приглушённый серый — стоп-лист,
 * где срока нет вовсе. Три состояния, три цвета из семантики, и ни одного
 * лишнего значка.
 */

type TodayCard = {
  price: string
  deviation: number
  address: string
  meta: string
  /** Что уже было с этим объектом: касания, чужие обещания, запрет. */
  touch: string
  /** Когда звонить. Пустая строка не бывает: без срока карточке здесь нечего делать. */
  due: string
  dueTone: "default" | "secondary" | "warn"
  /** Звонить запрещено — собственник в стоп-листе агентства. */
  blocked?: boolean
  /** Почему запрещено. Только у заблокированной карточки. */
  reason?: string
}

const TODAY_CARDS: TodayCard[] = [
  {
    price: "8,6 млн ₽",
    deviation: -12,
    address: "Ленская ул., 10",
    meta: "Ладожская · 6 мин · 2-комн 58 м²",
    touch: "Вы раскрыли в 14:12, дважды без ответа",
    due: "Сегодня, 16:00",
    dueTone: "default",
  },
  {
    price: "12,8 млн ₽",
    deviation: -12,
    address: "Гражданский пр., 114",
    meta: "Академическая · 8 мин · 3-комн 71 м²",
    touch: "Анна Т. вчера в 18:40: ждёт звонка после 17:00",
    due: "Сегодня, 17:00",
    dueTone: "default",
  },
  {
    price: "12,4 млн ₽",
    deviation: 0,
    address: "Стахановцев ул., 14",
    meta: "Новочеркасская · 5 мин · 3-комн 74 м²",
    touch: "Собственник просил не звонить · 12 июля",
    due: "стоп-лист",
    dueTone: "secondary",
    blocked: true,
    reason: "Собственник просил не звонить — стоп-лист агентства",
  },
  {
    price: "6,3 млн ₽",
    deviation: -9,
    address: "Дальневосточный пр., 68",
    meta: "Пр. Большевиков · 9 мин · 1-комн 36 м²",
    touch: "Максим Л. взял 22.07, звонков нет",
    due: "2 дня без звонка",
    dueTone: "warn",
  },
]

function TodayCardRow({ card }: { card: TodayCard }) {
  return (
    <article
      data-slot="today-card"
      data-blocked={card.blocked || undefined}
      className="flex w-full gap-3 rounded-2xl bg-surface px-3 py-2"
    >
      {/* Кадр 72 держит левую колонку. Ссылки на снимок у стенда нет,
          и слот честно показывает, что фотографии нет, — это обычное
          состояние объекта, а не сбой загрузки. */}
      <div className="size-18 shrink-0 overflow-hidden rounded-lg outline-solid outline-1 -outline-offset-1 outline-line-2">
        <ListingPhoto alt={card.address} size="small" reason="no-photos" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex w-full items-center gap-2">
          <Typography variant="rowPrice" tone="default">
            <>{card.price}</>
          </Typography>
          <MarketDeviation percent={card.deviation} />
        </div>

        <Typography variant="strongText" tone="default">
          <>{card.address}</>
        </Typography>

        <Typography variant="metaText" tone="dense">
          <>{card.meta}</>
        </Typography>

        {/* История касаний идёт темнее меты: это не справка об объекте,
            а то, из-за чего он сегодня в списке. */}
        <Typography variant="metaText" tone="secondary">
          <>{card.touch}</>
        </Typography>

        <div className="flex w-full items-center gap-2">
          <Typography variant="metaStrong" tone={card.dueTone}>
            <>{card.due}</>
          </Typography>
          <div className="h-px flex-1" />

          {card.blocked ? (
            // Кнопка остаётся на месте и не исчезает: пустое место
            // читалось бы как «действие ещё не подгрузилось».
            <span
              data-slot="today-blocked"
              className="flex h-11 shrink-0 items-center justify-center rounded-md bg-warm px-4 text-text-3 outline-solid outline-1 -outline-offset-1 outline-border-control"
            >
              <Typography variant="controlLabel" tone="current">
                Звонок запрещён
              </Typography>
            </span>
          ) : (
            // Ссылка, а не кнопка: звонок открывает экран прозвона, и его надо
            // уметь открыть в новой вкладке и вернуться назад браузером.
            // Имя для читалки несёт адрес: четыре одинаковых «Позвонить»
            // подряд в списке ссылок ничего не различают.
            <Link
              to="/m/call"
              aria-label={`Позвонить: ${card.address}`}
              data-slot="today-call"
              className="flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-fg px-4 text-surface transition-colors duration-120 outline-none active:bg-fg-press focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="controlLabel" tone="current">
                Позвонить
              </Typography>
            </Link>
          )}
        </div>

        {card.reason === undefined ? null : (
          <Typography variant="metaText" tone="dense">
            <>{card.reason}</>
          </Typography>
        )}
      </div>
    </article>
  )
}

export function MobileTodayPage() {
  // Шапка берёт остаток и инициалы из сеанса, а не из констант экрана: иначе
  // раскрытие контакта списывает деньги, которых человек нигде не видит,
  // и продукт выглядит нарисованным. Без сеанса остаются числа стенда.
  const session = useSession()
  // Свой первый день пуст: чужие перезвоны и чужие взятые в работу объекты
  // в новое агентство не переходят.
  const own = useOwnAgency()

  return (
    <PhoneStand slot="mobile-today">
      <MobileHeader
        balance={session?.balance ?? 8610}
        initials={session?.initials ?? "ИС"}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {/* Счёт дня стоит в шапке раздела, а не отдельной строкой:
            на 390 отдельная строка стоила бы 32 px ради четырёх слов. */}
        <div className="flex w-full shrink-0 items-center gap-2">
          <Typography variant="panelTitle" tone="default" as="h1">
            Сегодня
          </Typography>
          <div className="h-px flex-1" />
          <Typography variant="denseText" tone="dense">
            {own ? "смена не начата" : "4 объекта на сегодня"}
          </Typography>
        </div>

        {own ? (
          <MobileEmptyState
            icon={Sun}
            title="Смена не начата"
            text="Сюда попадут перезвоны, назначенные в панели звонка, и объекты, взятые в работу. Начните с поиска: задайте район и цену."
          />
        ) : (
          <div className="flex w-full flex-col gap-2">
            {TODAY_CARDS.map((card) => (
              <TodayCardRow key={card.address} card={card} />
            ))}
          </div>
        )}

        <div aria-hidden className="min-h-0 flex-1" />
      </div>

      <MobileBottomNav activeId="today" />
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  МОБАЙЛ · Записать                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Экран `cOYqC`. Тело с полями 16 и зазором 16, липкая панель сохранения снизу.
 *
 * **Это то, чем на телефоне заменена панель фиксации прозвона.** На десктопе
 * форма стоит справа от объекта, и агент видит разговор и запись одновременно.
 * На 390 так нельзя, и запись стала отдельным экраном, который открывается
 * кнопкой «Записать результат» из прозвона.
 *
 * В шапке вместо заголовка стоит «Отмена», а справа — длительность разговора
 * «звонок 1:12». Это единственный экран продукта, где время идёт само: человек
 * ещё держит трубку, и запись оформляется прямо во время разговора.
 *
 * **Исход разговора — четыре плитки 104, а не список.** Плитка крупная,
 * потому что её жмут одной рукой, не глядя, сразу после «до свидания».
 * Список из четырёх строк по 44 занял бы столько же места и требовал бы
 * прицеливания. Подпись под каждой плиткой договаривает то, что заголовок
 * назвать не успевает: «Это агент» → «вернуть 199 ₽» — то есть нажатие
 * возвращает деньги за раскрытие.
 *
 * Заметка предлагается голосом, а не клавиатурой: печатать после звонка
 * никто не будет, а расшифровка приедет сама.
 */

type Outcome = {
  id: string
  icon: LucideIcon
  title: string
  note: string
}

const OUTCOMES: Outcome[] = [
  { id: "meeting", icon: CalendarCheck, title: "Договорились", note: "о встрече" },
  { id: "callback", icon: AlarmClock, title: "Перезвонить", note: "позже" },
  { id: "refused", icon: X, title: "Отказ", note: "продаёт сам" },
  { id: "agent", icon: Undo2, title: "Это агент", note: "вернуть 199 ₽" },
]

const ANSWERED = ["Собственник", "Агент", "Родственник"]
const REMIND = ["завтра", "через 3 дня", "через неделю"]

function OutcomeTile({
  outcome,
  selected,
  onPress,
}: {
  outcome: Outcome
  selected: boolean
  onPress: () => void
}) {
  const Icon = outcome.icon

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="outcome-tile"
      data-selected={selected || undefined}
      className={cn(
        "flex h-26 min-w-0 flex-1 cursor-pointer flex-col items-start justify-end gap-1.5 rounded-2xl p-3.5 text-left",
        "outline-solid outline-1 -outline-offset-1",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg",
        // Плитка исхода — то, чем заканчивается звонок. Молчать под пальцем
        // ей нельзя тем более: человек жмёт её один раз и должен видеть, что
        // попал. Ступени те же, что у чипа выше.
        "transition-colors duration-120",
        selected
          ? "bg-fg text-surface outline-fg active:bg-fg-press"
          : "bg-surface text-text-2 outline-line-3 active:bg-warm-hover",
      )}
      {...pressProps(onPress)}
    >
      <Icon aria-hidden className="size-5 shrink-0" strokeWidth={2} />
      <Typography variant="controlLabelLg" tone={selected ? "current" : "default"}>
        <>{outcome.title}</>
      </Typography>
      {/* На выбранной плитке подпись гаснет до 70 % белого — так в файле.
          Она объясняет заголовок, а не спорит с ним. */}
      <span className={cn(selected && "opacity-70")}>
        <Typography variant="metaText" tone={selected ? "current" : "dense"}>
          <>{outcome.note}</>
        </Typography>
      </span>
    </button>
  )
}

/** Плитка исхода → запись в журнале. Один список на экран и на журнал. */
const OUTCOME_TO_CALL: Record<string, { outcome: CallOutcome; days: number }> = {
  meeting: { outcome: "дозвонился", days: 0 },
  callback: { outcome: "отложен", days: 1 },
  refused: { outcome: "отказ", days: 0 },
  agent: { outcome: "посредник", days: 0 },
}

/** Через сколько дней напомнить. Подписи чипов — они же сроки. */
const REMIND_DAYS: Record<string, number> = {
  завтра: 1,
  "через 3 дня": 3,
  "через неделю": 7,
}

export function MobileRecordPage() {
  const [outcome, setOutcome] = useState("meeting")
  const [answered, setAnswered] = useState("Собственник")
  const [remind, setRemind] = useState("через 3 дня")
  const navigate = useNavigate()
  const session = useSession()
  const actions = useSessionActions()
  const now = useNow()

  /**
   * О каком объекте запись.
   *
   * Приходит из прозвона параметром. Без него запись некуда положить: адрес —
   * это ключ записи в журнале.
   */
  // Читается мягко и с приведением: маршрут собран общей сборкой
  // `productRoute`, а она типы параметров до экрана не доносит — тот же
  // приём, что на приёме приглашения.
  const search = useSearch({ from: "/m/record", shouldThrow: false }) as { at?: string } | null
  const at = search?.at

  /**
   * Сохранить исход.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * До этой правки кнопка не писала НИЧЕГО: человек отмечал «Договорились»,
   * кто ответил и когда напомнить, жал «Сохранить» — и улетал на стенд,
   * которого в собранной версии не существует. В журнале не появлялось ни
   * исхода, ни перезвона, ни заметки, а плитка «Это агент · вернуть 199 ₽»
   * только красилась. То есть телефонный путь агента заканчивался ничем
   * ровно в той точке, ради которой он и шёл.
   *
   * Запись идёт той же функцией, что на компьютере: два экрана одного дела
   * не могут иметь двух журналов.
   */
  const save = () => {
    if (at === undefined) {
      void navigate({ to: "/m/today" })
      return
    }

    const mapped = OUTCOME_TO_CALL[outcome] ?? { outcome: "в работе" as CallOutcome, days: 0 }
    const days = mapped.days === 0 ? 0 : (REMIND_DAYS[remind] ?? mapped.days)

    recordCall({
      address: at,
      outcome: mapped.outcome,
      answered,
      remindAt: days === 0 ? undefined : now + days * 24 * 60 * 60 * 1000,
      by: session?.name ?? "",
    })

    // «Это агент» — то же самое, что «Брак» на компьютере: за контакт
    // заплатили, а собственника на том конце не оказалось. Деньги возвращает
    // та же единственная дверь, что и везде, с той же проверкой.
    if (outcome === "agent") {
      const returned = actions.refund(at, "Ответил не собственник", true)
      if (returned === "ok") notifyDone("Вернули 199 ₽ на счёт агентства")
      else if (returned === "already") notifyError("За этот контакт возврат уже брали")
    }

    void navigate({ to: "/m/call", search: { at: undefined } })
  }

  return (
    <PhoneStand slot="mobile-record">
      <header
        data-slot="mobile-record-bar"
        className="flex h-header w-full shrink-0 items-center gap-2 border-b border-line-2 bg-surface px-4"
      >
        {/* Стрелка и слово — одна цель нажатия высотой 44. Отдельная стрелка
            шириной 18 пальцем не берётся.

            Отмена возвращает в прозвон — туда, откуда запись и открыли
            кнопкой «Записать результат». Запись при этом пропадает: она
            нигде не сохранена, и в этом весь смысл слова «Отмена». */}
        <Link
          to="/m/call"
          data-slot="mobile-record-cancel"
          // Подложка появляется только под пальцем и гасится отрицательным
          // полем на ту же величину: подпись остаётся стоять там, где стоит
          // в макете. Своей заливки у контрола нет, поэтому нажатие красит
          // фон, а не сдвигает его на ступень.
          className="-mx-2 flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md bg-transparent px-2 text-text-2 transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <ArrowLeft aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
          <Typography variant="strongText" tone="current">
            Отмена
          </Typography>
        </Link>

        <div className="h-px flex-1" />

        <Typography variant="denseText" tone="dense">
          звонок 1:12
        </Typography>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Объект назван двумя строками и без фотографии: человек только что
            с ним разговаривал, узнавать по кадру ему нечего. */}
        <div className="flex w-full flex-col gap-0.5">
          <Typography variant="rowPrice" tone="default">
            Ленская ул., 10
          </Typography>
          <Typography variant="denseText" tone="dense">
            8,6 млн ₽ · 2-комн · 58 м² · собственник
          </Typography>
        </div>

        <Typography variant="columnHeader" tone="dense">
          ЧЕМ КОНЧИЛСЯ ЗВОНОК
        </Typography>

        <div role="radiogroup" aria-label="Чем кончился звонок" className="flex w-full flex-col gap-2.5">
          <div className="flex w-full gap-2.5">
            {OUTCOMES.slice(0, 2).map((item) => (
              <OutcomeTile
                key={item.id}
                outcome={item}
                selected={item.id === outcome}
                onPress={() => setOutcome(item.id)}
              />
            ))}
          </div>
          <div className="flex w-full gap-2.5">
            {OUTCOMES.slice(2).map((item) => (
              <OutcomeTile
                key={item.id}
                outcome={item}
                selected={item.id === outcome}
                onPress={() => setOutcome(item.id)}
              />
            ))}
          </div>
        </div>

        <Typography variant="columnHeader" tone="dense">
          КТО ОТВЕТИЛ
        </Typography>

        <div className="flex w-full gap-2">
          {ANSWERED.map((label) => (
            <TouchChip
              key={label}
              label={label}
              edge="line-3"
              selected={label === answered}
              onPress={() => setAnswered(label)}
            />
          ))}
        </div>

        <Typography variant="columnHeader" tone="dense">
          ЗАМЕТКА
        </Typography>

        {/* Граница `border-control` тут не случайна: это поле ввода,
            просто ввод в него голосовой.

            Экрана записи голоса в макете нет — ни волны, ни таймера, ни
            расшифровки, — поэтому действие названо и не рисует ничего.
            Придумать сюда плашку было бы враньём о готовности. */}
        <button
          type="button"
          data-action="запись заметки голосом"
          data-slot="voice-note"
          className="flex h-12 w-full shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-surface px-4 text-fg transition-colors duration-120 outline-solid outline-1 -outline-offset-1 outline-border-control active:bg-warm-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg"
        >
          <Mic aria-hidden className="size-4.5 shrink-0" strokeWidth={2} />
          <Typography variant="strongText" tone="current">
            Записать голосом
          </Typography>
          <div className="h-px flex-1" />
          <Typography variant="metaText" tone="dense">
            расшифруем в текст
          </Typography>
        </button>

        <Typography variant="columnHeader" tone="dense">
          НАПОМНИТЬ
        </Typography>

        <div className="flex w-full gap-2">
          {REMIND.map((label) => (
            <TouchChip
              key={label}
              label={label}
              edge="line-3"
              selected={label === remind}
              onPress={() => setRemind(label)}
            />
          ))}
        </div>

        <div aria-hidden className="min-h-0 flex-1" />
      </div>

      {/* Панель прижата книзу и не уезжает за формой: сохранение обязано
          оставаться под большим пальцем. Нижнее поле 24 против верхнего 12 —
          под панелью системная полоса жеста. */}
      <div
        data-slot="mobile-record-footer"
        className="flex w-full shrink-0 flex-col border-t border-line-2 bg-surface px-4 pt-3 pb-6"
      >
        {/* Сохранение возвращает в прозвон: агент идёт по списку подряд,
            и после записи ему нужен следующий объект, а не эта же форма.
            Ссылкой кнопка стать не может — см. отчёт про `asChild`. */}
        <Button variant="primary" size="lg" block {...pressProps(save)}>
          Сохранить
        </Button>
      </div>
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  МОБАЙЛ · Загрузка списка                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Экран `EKtRe`. Тело с полями [20, 16] и зазором 16, пять строк-скелетов
 * по 84 с волосяным делителем между ними.
 *
 * **Загрузка называет, чего ждёт, и сколько этого будет.** «Открываем подборки»
 * и «Четыре штуки, обложки подтянутся последними» — две строки, которые
 * превращают ожидание в понятное: человек знает, что приедет четыре карточки
 * и что серые квадраты станут обложками, а не останутся дырами.
 *
 * Скелет повторяет раскладку будущей строки — обложка 56 слева, два текстовых
 * ряда справа, — а не намекает на неё. Когда данные приедут, ничего не прыгнет.
 *
 * **У первой строки делителя нет.** Линия рисуется сверху у строк со второй
 * по пятую, то есть разделяет строки, а не обводит список. Так в файле:
 * у первой строки цвет обводки задан, а толщина — нет.
 */

const LIST_SKELETON_ROWS = [
  { top: "w-43", bottom: "w-56" },
  { top: "w-52", bottom: "w-49" },
  { top: "w-37.5", bottom: "w-60" },
  { top: "w-47.5", bottom: "w-52.5" },
  { top: "w-41", bottom: "w-45" },
]

const LIST_LOADING_TITLE = "Открываем подборки"
const LIST_LOADING_NOTE = "Четыре штуки, обложки подтянутся последними"

export function MobileListLoadingPage() {
  return (
    <PhoneStand slot="mobile-list-loading">
      <MobileSectionHeader title="Подборки" back />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">
        <div className="flex w-full shrink-0 flex-col gap-1">
          <Typography variant="strongText" tone="default">
            <>{LIST_LOADING_TITLE}</>
          </Typography>
          <Typography variant="denseText" tone="dense">
            <>{LIST_LOADING_NOTE}</>
          </Typography>
        </div>

        <div
          role="status"
          aria-busy="true"
          aria-label={`${LIST_LOADING_TITLE}. ${LIST_LOADING_NOTE}`}
          className="flex w-full shrink-0 flex-col"
        >
          {LIST_SKELETON_ROWS.map((row, index) => (
            <div
              key={row.top + row.bottom}
              data-slot="list-skeleton-row"
              className={cn(
                "flex w-full items-center gap-3 py-3.5",
                // Делитель внутренней тенью, а не рамкой: в файле обводка идёт
                // внутрь и высоту строки не меняет, а рамка добавила бы 85-й пиксель.
                index > 0 && "shadow-[inset_0_1px_0_var(--line-1)]",
              )}
            >
              <span aria-hidden className="size-14 shrink-0 rounded-md bg-line-1" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {/* Полоски без радиуса — так в файле. Верхняя светлее нижней:
                    две разные плашки, а не одна с тенью. */}
                <span aria-hidden className={cn("h-3.5 bg-line-1", row.top)} />
                <span aria-hidden className={cn("h-2.5 bg-line-2", row.bottom)} />
              </div>
            </div>
          ))}
        </div>

        <div aria-hidden className="min-h-0 flex-1" />
      </div>

      <MobileBottomNav activeId="collections" />
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  МОБАЙЛ · Загрузка выдачи                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Экран `jvGY2`. Тело с полями 16 и зазором 12, пять карточек-скелетов
 * той же формы, что настоящая строка выдачи на телефоне: радиус 16,
 * волосяная обводка, поля [12, 14], зазор 8.
 *
 * **Скелет копирует карточку по рядам, а не по пятнам.** Первый ряд — адрес
 * и цена по краям, второй — мета, третий — три коротких факта, четвёртый —
 * признак слева и кнопка 120 × 32 справа. Когда выдача приедет, каждая плашка
 * заменится своим содержимым на своём месте.
 *
 * **Строки состояния здесь нет, и это расхождение с загрузкой подборок.**
 * Там над скелетом стоит «Открываем подборки» и сколько их будет, здесь —
 * ничего. Поиск идёт по четырём источникам и ждать его дольше, то есть
 * подпись нужнее именно тут. Воспроизведено как в файле; вынесено в отчёт.
 */

const RESULT_SKELETON_KEYS = ["a", "b", "c", "d", "e"]

/** Плашка скелета выдачи. В файле она `warm` с радиусом 6 — светлее, чем плашки
 *  загрузки подборок, потому что лежит на белой карточке, а не на фоне страницы. */
function ResultPlate({ className }: { className: string }) {
  return <span aria-hidden className={cn("block shrink-0 rounded-sm bg-warm", className)} />
}

export function MobileResultsLoadingPage() {
  return (
    <PhoneStand slot="mobile-results-loading">
      <MobileSectionHeader title="Поиск" />

      <div
        role="status"
        aria-busy="true"
        // Подписи в файле нет, а незрячему человеку экран иначе молчит.
        // Текст живёт только для читалки и на макет не влияет.
        aria-label="Загружаем выдачу"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {RESULT_SKELETON_KEYS.map((key) => (
          <div
            key={key}
            data-slot="results-skeleton-row"
            className="flex w-full shrink-0 flex-col gap-2 rounded-2xl bg-surface px-3.5 py-3 outline-solid outline-1 -outline-offset-1 outline-line-2"
          >
            <div className="flex w-full items-center justify-between">
              <ResultPlate className="h-4 w-37.5" />
              <ResultPlate className="h-4 w-19.5" />
            </div>

            <ResultPlate className="h-3 w-52.5" />

            <div className="flex items-center gap-2">
              <ResultPlate className="h-3 w-13.5" />
              <ResultPlate className="h-3 w-16" />
              <ResultPlate className="h-3 w-10" />
            </div>

            <div className="flex w-full items-center justify-between">
              <ResultPlate className="h-5 w-24" />
              <ResultPlate className="h-8 w-30" />
            </div>
          </div>
        ))}
      </div>

      <MobileBottomNav activeId="search" />
    </PhoneStand>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  МОБАЙЛ · Фильтры листом                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Экран `gFIin`. Тело с полями [24, 16] и зазором 24 между группами,
 * внутри группы зазор 16.
 *
 * **Это то, что открывается кнопкой «Фильтры 7» с экрана выдачи.** На десктопе
 * условия стоят колонкой рядом с выдачей и никогда её не перекрывают. На 390
 * это невозможно, и правило меняет форму: условия занимают весь экран, а внизу
 * стоит «Показать 247 объектов» — число говорит, что получится, ещё до того,
 * как лист закроется. Кнопки «Применить» в продукте нет: счётчик пересчитывается
 * на каждом касании чипа.
 *
 * **«Сбросить 7» несёт то же число, что и кнопка вызова.** Семь — это сколько
 * условий сейчас сужают выдачу, и без него сброс молчал бы о том, что сбрасывать
 * вообще есть что.
 *
 * Чипы разложены по рядам вручную, ровно как в файле: «Красногвардейский» стоит
 * один в первом ряду, а «Невский», «Калининский» и «+ район» — во втором.
 * Автоматический перенос дал бы другую разбивку на другом шрифте.
 *
 * **Назван листом, а нарисован экраном.** Ни затемнения, ни хвата, ни скруглённого
 * верха — вместо них шапка 56 с крестиком. Общий `MobileSheet` поэтому не подошёл;
 * расхождение имени и формы вынесено в отчёт.
 */

type FilterChipSpec = {
  id: string
  label: string
  selected: boolean
  edge: ChipEdge
}

type FilterGroup = {
  label: string
  rows: FilterChipSpec[][]
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    label: "РАЙОН",
    rows: [
      [{ id: "krasnogv", label: "Красногвардейский", selected: true, edge: "control" }],
      [
        { id: "nevsky", label: "Невский", selected: true, edge: "control" },
        { id: "kalinin", label: "Калининский", selected: true, edge: "control" },
        { id: "more-district", label: "+ район", selected: false, edge: "control" },
      ],
    ],
  },
  {
    label: "МЕТРО",
    rows: [
      [
        { id: "ligovsky", label: "Лиговский проспект", selected: true, edge: "line-2" },
        { id: "obvodny", label: "Обводный канал", selected: false, edge: "line-2" },
      ],
      [
        { id: "vosstaniya", label: "Площадь Восстания", selected: false, edge: "line-2" },
        { id: "more-station", label: "+ станция", selected: false, edge: "line-2" },
      ],
      [
        { id: "walk-10", label: "до 10 мин", selected: true, edge: "control" },
        { id: "walk-20", label: "до 20 мин", selected: false, edge: "control" },
      ],
    ],
  },
]

const FLOOR_GROUP: FilterGroup = {
  label: "ЭТАЖ",
  rows: [
    [
      { id: "not-first", label: "не первый", selected: true, edge: "control" },
      { id: "not-last", label: "не последний", selected: false, edge: "control" },
    ],
  ],
}

function FilterChipRows({
  group,
  selection,
  onToggle,
}: {
  group: FilterGroup
  selection: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  return (
    <section className="flex w-full flex-col gap-4">
      <Typography variant="columnHeader" tone="dense">
        <>{group.label}</>
      </Typography>
      {group.rows.map((row) => (
        <div key={row[0].id} className="flex w-full gap-2">
          {row.map((chip) => (
            <TouchChip
              key={chip.id}
              label={chip.label}
              edge={chip.edge}
              selected={selection[chip.id] ?? chip.selected}
              onPress={() => onToggle(chip.id)}
            />
          ))}
        </div>
      ))}
    </section>
  )
}

/** Все чипы листа одним списком: их перебирают и переключение, и сброс. */
const ALL_FILTER_CHIPS = [...FILTER_GROUPS, FLOOR_GROUP].flatMap((group) =>
  group.rows.flat(),
)

export function MobileFiltersSheetPage() {
  const [selection, setSelection] = useState<Record<string, boolean>>({})
  const navigate = useNavigate()

  const toggle = (id: string) =>
    setSelection((current) => {
      const spec = ALL_FILTER_CHIPS.find((chip) => chip.id === id)
      const now = current[id] ?? spec?.selected ?? false
      return { ...current, [id]: !now }
    })

  /**
   * Сброс снимает все условия разом.
   *
   * Числа «7» в кнопке сброса и «247» в подвале при этом не пересчитываются:
   * они сняты с макета, а за листом нет выдачи, по которой можно считать.
   * Это расхождение названо в отчёте — счётчик, живущий отдельно от условий,
   * рано или поздно соврёт человеку.
   */
  const reset = () =>
    setSelection(Object.fromEntries(ALL_FILTER_CHIPS.map((chip) => [chip.id, false])))

  return (
    <PhoneStand slot="mobile-filters-sheet">
      <header
        data-slot="mobile-filters-bar"
        className="flex h-header w-full shrink-0 items-center gap-3 border-b border-line-2 bg-surface px-4"
      >
        {/* Крестик 24 — так в файле. По вертикали цель растянута до 44,
            по горизонтали остаётся 24: шире её не сделать, не сдвинув заголовок.

            Закрытие возвращает в выдачу — лист поверх неё и открывался. */}
        <Link
          to="/m/search"
          aria-label="Закрыть фильтры"
          data-slot="mobile-filters-close"
          className="flex h-11 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent text-fg transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <X aria-hidden className="size-6" strokeWidth={2} />
        </Link>

        <Typography variant="controlLabelLg" tone="default" as="h1">
          Фильтры
        </Typography>

        <div className="h-px flex-1" />

        <button
          type="button"
          data-slot="mobile-filters-reset"
          className="-mx-2 flex h-11 shrink-0 cursor-pointer items-center rounded-md bg-transparent px-2 text-fg transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          {...pressProps(reset)}
        >
          <Typography variant="strongText" tone="current">
            Сбросить 7
          </Typography>
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        {FILTER_GROUPS.map((group) => (
          <FilterChipRows
            key={group.label}
            group={group}
            selection={selection}
            onToggle={toggle}
          />
        ))}

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            РЯДОМ С АДРЕСОМ
          </Typography>
          {/* Граница `line-2`, а не `border-control`: это не поле ввода,
              а показ уже выбранного адреса с отдельным действием. */}
          <div className="flex h-12 w-full shrink-0 items-center gap-3 rounded-xl bg-surface px-4 outline-solid outline-1 -outline-offset-1 outline-line-2">
            <div className="min-w-0 flex-1">
              <Typography variant="rowPrice" tone="default">
                Лиговский пр., 44 · 1 км
              </Typography>
            </div>
            {/* Экрана выбора адреса в макете нет — ни карты, ни подсказок
                при вводе. Действие названо и ничего не рисует. */}
            <button
              type="button"
              data-action="изменить адрес поиска"
              data-slot="filters-address-edit"
              className="-mx-2 flex h-11 shrink-0 cursor-pointer items-center rounded-md bg-transparent px-2 text-fg transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="tabActive" tone="current">
                Изменить
              </Typography>
            </button>
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            ЦЕНА, ₽
          </Typography>
          <div className="flex w-full gap-3">
            {[
              { label: "Цена от", value: "6 000 000" },
              { label: "Цена до", value: "до 15 млн" },
            ].map((field) => (
              <Typography key={field.label} asChild variant="rowPrice" tone="default">
                <input
                  aria-label={field.label}
                  defaultValue={field.value}
                  data-slot="filters-price"
                  className="h-12 min-w-0 flex-1 rounded-xl bg-surface px-4 outline-solid outline-1 -outline-offset-1 outline-border-control focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg"
                />
              </Typography>
            ))}
          </div>
        </section>

        <FilterChipRows group={FLOOR_GROUP} selection={selection} onToggle={toggle} />
      </div>

      <div
        data-slot="mobile-filters-footer"
        className="flex w-full shrink-0 flex-col border-t border-line-2 bg-surface px-4 pt-3 pb-6"
      >
        {/* Кнопки «Применить» в продукте нет: лист закрывается показом выдачи,
            и это тот же адрес, что за крестиком. */}
        <Button
          variant="primary"
          size="lg"
          block
          {...pressProps(() => void navigate({ to: "/m/search" }))}
        >
          Показать 247 объектов
        </Button>
      </div>
    </PhoneStand>
  )
}
