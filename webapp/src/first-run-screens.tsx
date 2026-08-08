import { Link, useNavigate } from "@tanstack/react-router"
import { Gift, Search } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import { CabinetPage, CabinetShell, useCabinetNav } from "@/features/cabinet"
import { plural } from "@/features/listings"
import { useWorkspace } from "@/features/workspace"

/**
 * Первый вход: три экрана, которые человек видит один раз в жизни.
 *
 * `uCehD` — агент открыл поиск, а искать ещё нечего.
 * `EF9xj` — руководитель только что создал агентство.
 * `O1hIO7` — второй сотрудник вошёл в уже настроенное агентство.
 *
 * **Общее правило всех трёх: экран не поздравляет, а показывает следующий шаг.**
 * Ни одного «Добро пожаловать», ни одной иллюстрации. Пустой кабинет — это
 * не праздник, а работа, которую ещё не начали, и единственное, что человеку
 * нужно, — понять, куда нажать.
 *
 * **Второе правило: про деньги говорится сразу и без уловок.** Остаток пробных
 * раскрытий и «3 000 ₽ спишется только когда вы решите продолжить» стоят
 * в первом абзаце, а не в сноске. Человек, который узнаёт про списание
 * на третьем экране, чувствует себя обманутым, даже если списания не было.
 *
 * **Третье правило появилось позже двух первых и стоило дороже: на экране
 * стоит только то, что известно про вошедшего.** Здесь жили образцы текста
 * из макета — агентство «Невский проспект», руководитель «Смирнова Ирина»,
 * сотрудник «Дмитрий», два готовых поиска агентства, «5 раскрытий» числом
 * в коде. В Pencil это заполнитель кадра, в продукте — чужие данные, которые
 * человек читает как свои. Название агентства, имя, инициалы и остаток
 * пробных раскрытий берутся из сеанса, лимит и руководитель — из журнала
 * работы; чего нет, то не показывается вовсе.
 */

/** Плашка пробного старта: 56, тёплый песок, значок и одна строка. */
function TrialNotice({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="trial-notice"
      className="flex h-14 w-full shrink-0 items-center gap-2.5 rounded-lg bg-warn-tint px-4"
    >
      <Gift aria-hidden className="size-4 shrink-0 text-warn-text" strokeWidth={2} />
      <Typography variant="uiText" tone="warn">
        {children}
      </Typography>
    </div>
  )
}

/** Заголовок экрана и лид под ним. Ширина лида закреплена: 564 или 760. */
function ScreenIntro({
  title,
  lead,
  leadWidth,
}: {
  title: string
  lead: string
  leadWidth: "narrow" | "wide"
}) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-2">
      <Typography variant="cardPrice" tone="default" as="h1">
        {title}
      </Typography>
      <div className={leadWidth === "narrow" ? "w-141" : "w-190"}>
        <Typography variant="uiText" tone="secondary">
          {lead}
        </Typography>
      </div>
    </div>
  )
}

/**
 * ВХОД · Первый поиск (`uCehD`).
 *
 * **Заголовок раздела в сайдбаре стоит, даже когда поисков нет.** Это
 * не забытая пустота: человек видит, куда лягут его поиски. Сами поиски
 * сайдбар берёт из работы агентства — экран их больше не подменяет.
 *
 * **Поисков агентства на этом экране нет, и это исправление, а не пропуск.**
 * Здесь стояли «Расселение, центр» и «Доли и комнаты» под заголовком «уже
 * настроенные руководителем» — две строки из макета, которых никакой
 * руководитель не заводил. Общие поиски агентства не могут существовать,
 * пока работа лежит в браузере одного человека: чужой браузер их не увидит.
 * Раздел вернётся вместе с сервером.
 *
 * **Готовые наборы — не украшение, а обход пустого поля.** Первый поиск самый
 * трудный: человек не знает, что вводить, и четыре названия показывают, какими
 * бывают условия. Числа объектов под ними убраны: «148 объектов от
 * собственников» — цифра из макета, а в базе весь Петроградский — 26 объектов.
 * Счёт вернётся, когда набор начнёт сужать выдачу и его станет чем измерить.
 */
export function FirstSearchPage() {
  const navigate = useNavigate()
  const session = useSession()

  /**
   * Пробные раскрытия берутся из сеанса, а не из числа рядом с плашкой.
   *
   * Пятёрка в коде повторяла пятёрку в макете: человек, потративший два
   * раскрытия, всё равно читал «на счету 5». Когда пробные кончились, плашки
   * нет вовсе — обещание, которое нечем выполнить, лучше не показывать.
   */
  const trial = session?.trial ?? 0

  /**
   * «Найти» ведёт в выдачу и ничего не сужает.
   *
   * Условие, набранное в поле, пока никуда не передаётся: у адреса `/search`
   * нет параметров, и сочинять их ради демонстрации значило бы обещать
   * фильтрацию, которой за экраном нет. Поле при этом настоящее — в него
   * печатают, — а кнопка честно открывает тот экран, который обещает.
   */
  const find = () => void navigate({ to: "/search" })

  return (
    <CabinetShell activeId="search">
      <CabinetPage rhythm="sparse">
        {trial === 0 ? null : (
          <TrialNotice>
            {`На счету ${trial} ${plural(trial, "пробное раскрытие", "пробных раскрытия", "пробных раскрытий")}. Лучше потратить их на реальные объекты, а не на пробные звонки.`}
          </TrialNotice>
        )}

        <ScreenIntro
          title="С чего начать поиск"
          lead="Введите адрес, метро или район либо возьмите готовый набор. Фильтры перестроятся сами."
          leadWidth="narrow"
        />

        {/* Строка поиска здесь своя, а не шапочная: 740 × 48 против 420 × 40.
            Это главное действие экрана, и оно обязано быть крупнее того же
            действия в шапке, которое доступно всегда.

            Поле настоящее, а не нарисованное: первое, что человек делает
            на этом экране, — печатает. Кольцо фокуса берёт вся строка и
            заменяет границу, а не добавляется к ней, иначе строка подпрыгнула
            бы на два пикселя в тот момент, когда в неё встали курсором. */}
        <div className="flex h-ctl-lg w-185 shrink-0 items-center gap-3 rounded-xl border border-border-control bg-surface px-4 focus-within:border-transparent focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-fg">
          <Search aria-hidden className="size-4.5 shrink-0 text-text-dense" strokeWidth={2} />
          <Typography asChild variant="controlLabelLg" tone="default">
            <input
              type="search"
              aria-label="Адрес, метро или район"
              placeholder="Адрес, метро или район"
              className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-dense"
            />
          </Typography>
          <Button variant="primary" size="sm" onClick={find}>
            Найти
          </Button>
        </div>

        <section className="flex w-full shrink-0 flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            Готовые наборы
          </Typography>
          {/* Набор — это ссылка в выдачу, а не кнопка: человек имеет право
              открыть его в новой вкладке и вернуться назад, не потеряв экран
              первого входа. Выдачу набор пока не сужает — см. `find`. */}
          <div className="flex w-full items-stretch gap-6">
            {PRESETS.map((preset) => (
              <Link
                key={preset}
                to="/search"
                data-slot="preset-card"
                className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-lg border border-line-2 bg-surface p-4 text-left transition-colors duration-120 hover:bg-warm active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
              >
                <Typography variant="strongText" tone="default">
                  {preset}
                </Typography>
              </Link>
            ))}
          </div>
        </section>
      </CabinetPage>
    </CabinetShell>
  )
}

/**
 * Названия наборов — примеры условий, а не данные о ком-то.
 *
 * Подписи с числом объектов у них были и ушли вместе с остальными образцами
 * из макета: набор пока не сужает выдачу, значит и считать в нём нечего.
 */
const PRESETS = [
  "Петроградский, 2-к, до 15 млн",
  "Вся вторичка, добавлено сегодня",
  "Комнаты и доли, Центральный",
  "Расселение",
]

/**
 * Шаг первого входа: номер, объяснение и действие.
 *
 * Кнопка выключена влево по верхнему краю, а не по центру строки: строки
 * разной высоты, и кнопка, гуляющая по вертикали, ломает колонку действий.
 */
function Step({
  number,
  title,
  note,
  action,
}: {
  number: string
  title: string
  note: string
  action?: ReactNode
}) {
  return (
    <div
      data-slot="first-run-step"
      className="flex w-full items-start gap-4 border-b border-line-1 py-5"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warm">
        <Typography variant="numericDense" tone="default">
          {number}
        </Typography>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Typography variant="rowPrice" tone="default">
          {title}
        </Typography>
        <span className="w-175">
          <Typography variant="uiText" tone="secondary">
            {note}
          </Typography>
        </span>
      </span>
      {action === undefined ? null : <>{action}</>}
    </div>
  )
}

/**
 * КАБИНЕТ · Первый вход, агентство пустое (`EF9xj`).
 *
 * **У третьего шага кнопки нет, и это не пропуск.** Первые два шага —
 * настройка, их делают отсюда. Раскрытие контакта делают в выдаче, над живым
 * объектом, а не с обучающего экрана: кнопка «Раскрыть» здесь означала бы
 * списание вслепую.
 *
 * Ниже пяти разделов сайдбар пуст: ни одного сохранённого поиска, ни одного
 * агентского. Агентство создано минуту назад, и заводить в нём нечего —
 * заголовки разделов при этом стоят и показывают, куда всё ляжет.
 */
export function AgencyEmptyPage() {
  const navigate = useNavigate()
  const session = useSession()

  // Название агентства человек ввёл сам минуту назад. Подставлять сюда чужое
  // значило бы поздравить его с созданием не его агентства.
  const agency = session?.agency ?? ""
  const trial = session?.trial ?? 0

  return (
    <CabinetShell activeId="">
      <CabinetPage>
        <ScreenIntro
          title={agency === "" ? "Агентство создано" : `Агентство «${agency}» создано`}
          lead={
            trial > 0
              ? `${trial} ${plural(trial, "раскрытие", "раскрытия", "раскрытий")} уже на счёте, карта не нужна. Подписка 3 000 ₽ спишется только когда вы решите продолжить.`
              : "Пробные раскрытия уже потрачены. Подписка 3 000 ₽ спишется только когда вы решите продолжить."
          }
          leadWidth="wide"
        />

        <div className="flex w-full flex-col">
          <Step
            number="1"
            title="Задайте первый поиск"
            note="Район, цена, этаж, время до метро. Выдача появится сразу, смотреть её можно бесплатно."
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() => void navigate({ to: "/search" })}
              >
                Открыть поиск
              </Button>
            }
          />
          <Step
            number="2"
            title="Пригласите агентов"
            note="До двадцати человек за те же 3 000 ₽. Дневной лимит раскрытий у каждого свой, ставит его руководитель."
            action={
              // Приглашают со страницы сотрудников: там список тех, кто уже
              // в агентстве, и там же лимит на день. Отдельного экрана
              // приглашения в кабинете нет, и выдумывать его незачем.
              <Button
                variant="quiet"
                size="md"
                onClick={() => void navigate({ to: "/agency/staff" })}
              >
                Пригласить
              </Button>
            }
          />
          <Step
            number="3"
            title="Раскройте первый контакт"
            note="199 ₽ за номер собственника. Первые пять бесплатно. Если попался посредник, вернём в одно нажатие."
          />
        </div>
      </CabinetPage>
    </CabinetShell>
  )
}

/** Колонка факта: подпись капслоком, крупное значение и объяснение. */
function Fact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="w-50">
        <Typography variant="columnHeader" tone="dense">
          {label}
        </Typography>
      </div>
      <Typography variant="cardPrice" tone="default">
        {value}
      </Typography>
      <Typography variant="denseText" tone="secondary">
        {note}
      </Typography>
    </div>
  )
}

/**
 * КАБИНЕТ · Второй сотрудник, первый вход (`O1hIO7`).
 *
 * **Экран отвечает на три вопроса нового сотрудника, и ни на один лишний.**
 * Сколько я могу раскрыть сегодня; что уже настроено до меня; чьи деньги
 * я трачу. Всё остальное он найдёт сам — а эти три вещи, не сказанные вслух,
 * превращаются в неловкий разговор с руководителем на второй день.
 *
 * Третий факт — «Общий. Деньги агентства, не ваши. Коллеги видят, кто какой
 * контакт брал» — единственное место продукта, где мы прямо говорим человеку,
 * что его работа видна другим. Сказать это лучше в первую минуту, чем дать
 * узнать из отчёта.
 *
 * Разделители 1 × 110 стоят по центру зазоров, а не сбоку колонок: в файле
 * их x равны 380 и 772 при колонках 368 и зазоре 24.
 *
 * **Все три факта считаются, а не пишутся.** В макете тут стояли «5 раскрытий»,
 * «Изменить может только Смирнова Ирина» и «Два готовых: „Расселение, центр“
 * и „Доли и комнаты“» — образцы кадра. Экран, который врёт новому сотруднику
 * про его лимит в первую минуту, портит ровно то, ради чего он сделан: доверие
 * к тому, что тут написано. Лимит и руководитель берутся из журнала работы,
 * имя и агентство — из сеанса, поиски агентства — из того же источника,
 * что и сайдбар.
 */
export function SecondEmployeePage() {
  const navigate = useNavigate()
  const session = useSession()
  const workspace = useWorkspace()
  // Поиски агентства спрашиваем у сайдбара, а не заводим второй список:
  // разъехавшиеся источники здесь уже стоили владельцу нерабочих строк
  // в меню — см. `useCabinetNav`.
  /**
   * `undefined` у поисков агентства означает «раздела нет вовсе» — так
   * подписан контракт сайдбара. Экран второго сотрудника перечисляет их
   * фактом, и для него «раздела нет» и «раздел пуст» — одно и то же:
   * поисков не видно ни в том, ни в другом случае.
   */
  const { agencySearches } = useCabinetNav()
  const agencyList = agencySearches ?? []

  /**
   * Здороваемся именем в том виде, в каком его ввели.
   *
   * Резать «Королёв Дмитрий» на имя и фамилию ради обращения по имени — это
   * гадание: порядок слов человек выбирает сам, и половина обращений вышла бы
   * по фамилии. Формальность дешевле ошибки в первом же слове экрана.
   */
  const agency = session?.agency ?? ""
  const name = session?.name ?? ""
  const title =
    agency === ""
      ? "Вы в агентстве"
      : name === ""
        ? `Вы в агентстве «${agency}»`
        : `${name}, вы в агентстве «${agency}»`

  // Себя ищем по почте: имя человек меняет, почта — ключ агентства.
  const me = workspace.people.find((person) => person.email === session?.email)
  const owner = workspace.people.find((person) => person.role === "owner")

  /**
   * Лимита нет — это не ноль и не прочерк.
   *
   * `null` в журнале означает «раскрывай сколько нужно», и так заведён тот,
   * кто создал агентство. Прочерк остаётся только для случая, когда человека
   * в журнале ещё нет: тогда про его лимит мы честно ничего не знаем.
   */
  const limitValue =
    me === undefined
      ? "—"
      : me.limit === null
        ? "Без лимита"
        : `${me.limit} ${plural(me.limit, "раскрытие", "раскрытия", "раскрытий")}`

  const limitNote =
    me === undefined
      ? "Дневной лимит ставит руководитель агентства."
      : me.limit === null
        ? "Раскрывать можно столько, сколько нужно: лимита на вас не ставили."
        : owner === undefined
          ? "Обнуляется в 00:00. Ставит его руководитель агентства."
          : owner.email === session?.email
            ? "Обнуляется в 00:00. Менять его можете только вы."
            : `Обнуляется в 00:00. Изменить может только ${owner.name}.`

  return (
    <CabinetShell activeId="">
      <CabinetPage>
        <ScreenIntro
          title={title}
          lead="Агентство уже настроено. Ниже то, что отличается лично у вас."
          leadWidth="wide"
        />

        <div className="relative flex w-full items-start gap-6">
          <Fact label="Ваш лимит на сегодня" value={limitValue} note={limitNote} />
          <Fact
            label="Поиски агентства"
            value={
              agencyList.length === 0
                ? "Пока нет"
                : `${agencyList.length} ${plural(agencyList.length, "поиск", "поиска", "поисков")}`
            }
            note={
              agencyList.length === 0
                ? "Появятся в левом меню, когда руководитель их настроит."
                : agencyList.map((search) => `«${search.label}»`).join(" · ")
            }
          />
          <Fact
            label="Счёт"
            value="Общий"
            note="Деньги агентства, не ваши. Коллеги видят, кто какой контакт брал."
          />

          {/* Линии живут поверх раскладки, а не в потоке: встань они между
              колонками — колонки перестали бы быть равными. */}
          <span aria-hidden className="absolute top-0 left-95 h-27.5 w-px bg-line-1" />
          <span aria-hidden className="absolute top-0 left-193 h-27.5 w-px bg-line-1" />
        </div>

        <div className="flex w-full pt-2">
          {/* Кнопка ведёт в общую выдачу и называется тем, что открывает.
              «Открыть поиски агентства» она называлась, пока рядом стояли
              два выдуманных поиска; вести в выдачу и обещать чужие условия —
              разные вещи, и вторая перестала быть правдой. */}
          <Button
            variant="primary"
            size="md"
            onClick={() => void navigate({ to: "/search" })}
          >
            Открыть поиск
          </Button>
        </div>
      </CabinetPage>
    </CabinetShell>
  )
}
