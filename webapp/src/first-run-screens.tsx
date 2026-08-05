import { Link, useNavigate } from "@tanstack/react-router"
import { Gift, Search } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { CabinetPage, CabinetShell } from "@/features/cabinet"
import { AGENCY } from "./cabinet-demo-nav"

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
 * **Второе правило: про деньги говорится сразу и без уловок.** «Пять раскрытий
 * уже на счёте, карта не нужна» и «3 000 ₽ спишется только когда вы решите
 * продолжить» стоят в первом абзаце, а не в сноске. Человек, который узнаёт
 * про списание на третьем экране, чувствует себя обманутым, даже если списания
 * не было.
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
 * **Сохранённых поисков нет, а заголовок раздела в сайдбаре стоит.** Это
 * не забытая пустота: человек видит, куда лягут его поиски, и плюс рядом,
 * которым их заводят. Поиски агентства при этом уже есть — руководитель
 * настроил их раньше, чем пришёл агент.
 *
 * **Готовые наборы — не украшение, а обход пустого поля.** Первый поиск самый
 * трудный: человек не знает, что вводить. Четыре набора отвечают на это
 * числом объектов, а не обещанием: «148 объектов от собственников» проверяемо,
 * «попробуйте наш умный поиск» — нет.
 */
export function FirstSearchPage() {
  const navigate = useNavigate()

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
    <CabinetShell activeId="search" trial={5} savedSearches={[]} agencySearches={AGENCY}>
      <CabinetPage rhythm="sparse">
        <TrialNotice>
          На счету 5 пробных раскрытий. Потратьте их на реальные объекты, а не на пробные
          звонки.
        </TrialNotice>

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
                key={preset.title}
                to="/search"
                data-slot="preset-card"
                className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-lg border border-line-2 bg-surface p-4 text-left hover:bg-warm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
              >
                <Typography variant="strongText" tone="default">
                  {preset.title}
                </Typography>
                <Typography variant="metaText" tone="dense">
                  {preset.note}
                </Typography>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex w-185 shrink-0 flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            Поиски агентства, уже настроенные руководителем
          </Typography>
          <div className="flex w-full flex-col">
            {AGENCY_SEARCHES.map((search) => (
              <Link
                key={search.title}
                to="/search"
                data-slot="agency-search-row"
                className="flex h-14 w-full cursor-pointer items-center gap-3 border-b border-line-2 bg-transparent text-left hover:bg-warm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <Typography variant="strongText" tone="default">
                    {search.title}
                  </Typography>
                  <Typography variant="metaText" tone="dense">
                    {search.terms}
                  </Typography>
                </span>
                <span className="h-px flex-1" />
                <Typography variant="denseText" tone="dense">
                  {search.fresh}
                </Typography>
              </Link>
            ))}
          </div>
        </section>
      </CabinetPage>
    </CabinetShell>
  )
}

const PRESETS = [
  { title: "Петроградский, 2-к, до 15 млн", note: "148 объектов от собственников" },
  { title: "Вся вторичка, добавлено сегодня", note: "191 объект за сутки" },
  { title: "Комнаты и доли, Центральный", note: "203 объекта в районе" },
  { title: "Расселение", note: "6 объектов в подборке" },
]

const AGENCY_SEARCHES = [
  {
    title: "Расселение, центр",
    terms: "Центральный, Адмиралтейский · комнаты и доли",
    fresh: "4 новых",
  },
  { title: "Доли и комнаты", terms: "весь Петербург · до 5 млн", fresh: "2 новых" },
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
 * Сайдбар пуст ниже пяти разделов: ни сохранённых поисков, ни агентских.
 * Агентство создано минуту назад, и заводить для него заголовки не о чем.
 */
export function AgencyEmptyPage() {
  const navigate = useNavigate()

  return (
    <CabinetShell activeId="" trial={5}>
      <CabinetPage>
        <ScreenIntro
          title="Агентство «Невский проспект» создано"
          lead="Пять раскрытий уже на счёте, карта не нужна. Подписка 3 000 ₽ спишется только когда вы решите продолжить."
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
 */
export function SecondEmployeePage() {
  const navigate = useNavigate()

  return (
    <CabinetShell activeId="" initials="ДК">
      <CabinetPage>
        <ScreenIntro
          title="Дмитрий, вы в агентстве «Невский проспект»"
          lead="Агентство уже настроено. Ниже то, что отличается лично у вас."
          leadWidth="wide"
        />

        <div className="relative flex w-full items-start gap-6">
          <Fact
            label="Ваш лимит на сегодня"
            value="5 раскрытий"
            note="Обнуляется в 00:00. Изменить может только Смирнова Ирина."
          />
          <Fact
            label="Поиски агентства"
            value="Два готовых"
            note="«Расселение, центр» и «Доли и комнаты». Свои поиски заводите рядом."
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
          {/* Поиски агентства открываются в общей выдаче: отдельного экрана
              «поиски агентства» в кабинете нет, они живут строками в сайдбаре
              рядом с выдачей. */}
          <Button
            variant="primary"
            size="md"
            onClick={() => void navigate({ to: "/search" })}
          >
            Открыть поиски агентства
          </Button>
        </div>
      </CabinetPage>
    </CabinetShell>
  )
}
