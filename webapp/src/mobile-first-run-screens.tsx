import { Gift, Search } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import { MobileAuthLogo, MobileBottomNav, PhoneFrame } from "@/features/cabinet"
import { plural } from "@/features/listings"
import { formatDay, useNow, useWorkspace } from "@/features/workspace"
import { cn } from "@/lib/utils"

/**
 * Первый вход в «Сёрчь» на телефоне: три экрана, которые человек видит
 * ровно один раз в жизни.
 *
 * Снято с кадров `rlhGF`, `vuURe`, `Iyb4W`.
 *
 * **Общее у трёх экранов — они ничего не спрашивают.** Ни карты, ни анкеты,
 * ни выбора тарифа. Продукт продаёт себя выдачей, а не формой: сначала
 * покажи объекты, потом бери деньги. Поэтому на всех трёх ровно одно
 * действие, и оно ведёт в поиск.
 *
 * **Второе общее: ни одного чужого имени.** Название агентства, имя вошедшего,
 * остаток пробных раскрытий и список поисков берутся из сеанса и из работы
 * агентства. Раньше здесь стояли образцы текста из макета — «Невский
 * проспект», «Дмитрий», «Смирнова Ирина», «ИС», — и человек, только что
 * заведший своё агентство, читал на первом же экране чужое название.
 * Агентства-витрины в продукте больше нет, значит и подставлять нечего.
 */

/**
 * Кадр телефона на десктопной подложке: 390 × 844 по центру.
 *
 * Форма взята с `mobile-search-screen.tsx` и `mobile-call-screen.tsx` —
 * стенд смотрят в обычном браузере рядом с макетом, поэтому экран телефона
 * стоит внутри рамки, а не занимает окно.
 *
 * Готовые каркасы `MobileScreen` и `MobileAuthScreen` сюда не встают:
 * у обоих высота `h-svh` (окно браузера, а не 844) и жёстко зашитые поля
 * тела, а у моих кадров поля свои — [32, 16] с зазором 28 у экранов входа
 * и 16 с зазором 20 у первого поиска.
 */
function MobilePhoneFrame({
  slot,
  children,
}: {
  slot: string
  children: ReactNode
}) {
  return (
    <PhoneFrame slot={slot}>
      {children}
    </PhoneFrame>
  )
}

/**
 * Шапка кабинета в пробном режиме (`i0hSua`).
 *
 * Геометрия — та же, что у общей `MobileHeader`: 56, поля [0, 16], зазор 10,
 * логотип, распорка, счёт, аватар 28.
 *
 * **Почему не переиспользована общая шапка.** `MobileHeader` печатает счёт
 * деньгами — `groupDigits(balance) + " ₽"`. На этом экране счёт называется
 * раскрытиями, и это не оговорка: пока агентство не заплатило, у него нет
 * рублей на счету, у него есть пробные раскрытия. «5 ₽» соврало бы про
 * состояние счёта, а дописать в закрытый компонент режим счёта — правка
 * общего компонента, которой эта задача не касается.
 */
function MobileTrialHeader({
  trials,
  initials,
}: {
  /**
   * Остаток пробных раскрытий словами: «5 раскрытий». Пустая строка — пробных
   * не осталось, и тогда в шапке не стоит ничего: «0 раскрытий» на экране
   * первого шага сообщает о нехватке, а не о счёте.
   */
  trials: string
  /** Инициалы вошедшего. Пусто — аватар остаётся пустым кружком: это честнее
   *  подставленных чужих букв. */
  initials: string
}) {
  return (
    <header
      data-slot="mobile-trial-header"
      className="flex h-header w-full shrink-0 items-center gap-2.5 border-b border-line-2 bg-surface px-4"
    >
      <div className="flex items-center gap-2">
        <Typography variant="panelTitle" tone="default">
          Сёрчь
        </Typography>
        {/* Точка — единственное место, где в продукте живёт яркий акцент. */}
        <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
      </div>

      <div className="h-px flex-1" />

      {trials === "" ? null : (
        <Typography variant="metaStrong" tone="secondary">
          {trials}
        </Typography>
      )}

      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fg text-surface">
        <Typography variant="avatarInitials" tone="current">
          {initials}
        </Typography>
      </span>
    </header>
  )
}

/**
 * МОБАЙЛ · Первый поиск (`rlhGF`).
 *
 * Экран поиска до того, как в нём что-либо задано: 390 × 844, шапка 56,
 * тело с полями 16 и зазором 20, нижняя навигация 72 на вкладке «Поиск».
 *
 * **Четырёх готовых наборов здесь больше нет.** «148 объектов от
 * собственников», «191 объект за сутки», «203 объекта в районе», «6 объектов
 * в подборке» были образцами текста из макета: по тем же условиям в базе
 * продукта лежит 0, 107 и 13 объектов, а подборки у нового агентства нет
 * вовсе (замерено чтением `src/data/listings.ts`). При этом ни одна строка
 * никуда не вела — мобильной выдачи под собственным адресом в продукте нет, —
 * то есть экран показывал живому человеку четыре неверных числа и четыре
 * мёртвые кнопки. Пересчитать наборы на месте нельзя: условия набора — это
 * фильтр выдачи, и вторая копия правил фильтра разошлась бы с первой молча.
 *
 * Вместо них стоит то, что у человека действительно появится, — его
 * сохранённые поиски. Пока их нет, на месте списка объяснение, откуда они
 * здесь берутся: пустой экран обязан говорить, чем он наполнится.
 *
 * **Плашка сверху — единственное место продукта, где счёт назван
 * не деньгами.** Остаток пробных раскрытий приходит из сеанса: пока карта
 * не привязана, рублей на счету нет, и показывать их было бы враньём. Тон
 * предупреждающий, а не праздничный — это ограниченный ресурс, а не подарок,
 * хотя значок в файле именно подарочный.
 */
export function MobileFirstSearchPage() {
  // Экран за охраной кабинета: без сеанса сюда не попасть. Поэтому запасные
  // значения — ноль и пустая строка, а не чужое имя с чужим счётом.
  const session = useSession()
  const workspace = useWorkspace()
  const now = useNow()

  const trial = session?.trial ?? 0
  const searches = workspace.savedSearches

  return (
    <MobilePhoneFrame slot="mobile-first-search">
      <MobileTrialHeader
        trials={
          trial > 0 ? `${trial} ${plural(trial, "раскрытие", "раскрытия", "раскрытий")}` : ""
        }
        initials={session?.initials ?? ""}
      />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-y-auto p-4">
        {/* Плашки нет, когда пробные кончились: обещать бесплатное там, где
            за раскрытие уже списывают 199 ₽, — самая дорогая ложь продукта. */}
        {trial > 0 ? (
          <div className="flex w-full shrink-0 items-start gap-2.5 rounded-lg bg-warn-tint p-3">
            <Gift aria-hidden className="size-4 shrink-0 text-warn-text" strokeWidth={2} />
            <Typography variant="denseText" tone="warn">
              {`На счету ${trial} ${plural(trial, "пробное раскрытие", "пробных раскрытия", "пробных раскрытий")}. Потратьте их на реальные объекты.`}
            </Typography>
          </div>
        ) : null}

        <div className="flex w-full shrink-0 flex-col gap-1.5">
          <Typography variant="cardPrice" tone="default" as="h1">
            С чего начать поиск
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Введите адрес, метро или район. Выдача появится сразу, смотреть её
            можно бесплатно.
          </Typography>
        </div>

        {/*
          Строка поиска 48 / r-12 / подпись 16 — не `TextField`: тот собран
          по ряду «Поле 40» доски состояний и идёт 40 / r-10 / 14. Здесь
          другая ступень контрола, а не другое оформление того же, поэтому
          поле собрано на месте, а не продавлено через className.

          Граница на покое — `border-control`, на фокусе она уступает место
          кольцу 2 графитом: так в `TextField`, и две границы разом
          не рисуются.
        */}
        <div className="flex h-ctl-lg w-full shrink-0 items-center gap-2.5 rounded-xl bg-surface px-3.5 outline-solid outline-1 -outline-offset-1 outline-border-control focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-fg">
          <Search aria-hidden className="size-4.5 shrink-0 text-text-dense" strokeWidth={2} />
          <Typography asChild variant="rowPrice" tone="default">
            <input
              type="search"
              aria-label="Адрес, метро или район"
              placeholder="Адрес, метро или район"
              className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-dense"
            />
          </Typography>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3">
          <Typography variant="columnHeader" tone="dense">
            СОХРАНЁННЫЕ ПОИСКИ
          </Typography>

          {searches.length === 0 ? (
            <Typography variant="denseText" tone="secondary">
              Пока ни одного. Задайте условия в выдаче и сохраните их — поиск
              встанет сюда и будет искать сам.
            </Typography>
          ) : (
            searches.map((search) => (
              // Строка не нажимается и стрелки не несёт: открывать поиск
              // на телефоне пока некуда, а стрелка обещала бы переход,
              // которого нет. Появится мобильная выдача — строка станет
              // ссылкой, и обещание будет выполнено.
              <div
                key={search.id}
                data-slot="mobile-saved-search"
                className="flex h-14 w-full shrink-0 items-center gap-2.5 rounded-lg bg-surface px-3.5 outline-solid outline-1 -outline-offset-1 outline-line-2"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Typography variant="strongText" tone="default">
                    {search.name}
                  </Typography>
                  <Typography variant="metaText" tone="dense">
                    {`сохранён ${formatDay(search.createdAt, now)}`}
                  </Typography>
                </span>
              </div>
            ))
          )}
        </div>

        {/* Распорка низа из файла: список прижат к верху, а не растянут
            по экрану. */}
        <div className="flex-1" />
      </div>

      <MobileBottomNav activeId="search" />
    </MobilePhoneFrame>
  )
}

/**
 * Список «что дальше» на экранах первого входа (`aCtMY`, `qNonW`).
 *
 * Поля [14, 0], зазор 4, разделитель `line-2` **между** пунктами, а не вокруг
 * них: у первого пункта в файле обводка задана без толщины и потому
 * не рисуется — проверено выгрузкой разметки из Pencil.
 *
 * Полей по бокам нет намеренно. Это не карточки, а строки текста: рамка
 * вокруг каждой превратила бы объяснение в три плитки, которые хочется
 * нажать, — а нажимать здесь нечего.
 */
function FirstRunSteps({ items }: { items: { key: string; value: string }[] }) {
  return (
    <div data-slot="first-run-steps" className="flex w-full shrink-0 flex-col">
      {items.map((item, index) => (
        <div
          key={item.key}
          className={cn(
            "flex w-full flex-col gap-1 py-3.5",
            index > 0 && "border-t border-line-2",
          )}
        >
          <Typography variant="numericDense" tone="default">
            {item.key}
          </Typography>
          <Typography variant="denseText" tone="secondary">
            {item.value}
          </Typography>
        </div>
      ))}
    </div>
  )
}

/**
 * Общий каркас двух экранов первого входа (`vuURe`, `Iyb4W`).
 *
 * Оба кадра нарисованы одной раскладкой: логотип 56, тело с полями [32, 16]
 * и зазором 28, крупный заголовок с подзаголовком, список из трёх пунктов,
 * одно действие 48, распорка, правовая строка внизу.
 *
 * Разводить их по двум копиям было бы враньём о продукте: это один и тот же
 * разговор, у которого меняется собеседник.
 *
 * Правовая строка прижата к низу распоркой, а не приклеена: экраны входа
 * короче 844, и без распорки строка висела бы под кнопкой посреди пустоты.
 */
function FirstRunScreen({
  slot,
  title,
  subtitle,
  steps,
  action,
  actionTo,
}: {
  slot: string
  title: string
  subtitle: string
  steps: { key: string; value: string }[]
  action: string
  /** Экран, куда ведёт единственное действие. У обоих кадров он свой. */
  actionTo: "/m/first-run/search" | "/m/saved-searches"
}) {
  const navigate = useNavigate()

  return (
    <MobilePhoneFrame slot={slot}>
      <MobileAuthLogo />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-7 overflow-y-auto px-4 py-8">
        <div className="flex w-full shrink-0 flex-col gap-3">
          <Typography variant="cardPrice" tone="default" as="h1">
            {title}
          </Typography>
          <Typography variant="uiText" tone="secondary">
            {subtitle}
          </Typography>
        </div>

        <FirstRunSteps items={steps} />

        {/* Единственное действие экрана: 48 / pill / 16 белым по графиту.
            Красной она быть не может — ничего не списывает.

            Переход сделан кнопкой, а не ссылкой, вынужденно: у закрытой кнопки
            продукта `asChild` не работает — подпись печатается отдельным узлом,
            и Slot остаётся без единственного потомка. Пока это так, кнопку
            нельзя открыть в новой вкладке; лечится правкой самой кнопки. */}
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() => void navigate({ to: actionTo })}
        >
          {action}
        </Button>

        <div className="flex-1" />

        <Typography variant="metaText" tone="dense">
          Оператор персональных данных. Стоп-лист исполняется у всех сотрудников
          сразу.
        </Typography>
      </div>
    </MobilePhoneFrame>
  )
}

/**
 * МОБАЙЛ · Первый вход, агентство создано (`vuURe`).
 *
 * Первый экран руководителя сразу после регистрации агентства.
 *
 * **Экран снимает главный страх, а не поздравляет.** Подзаголовок говорит
 * прямо: карта не нужна, 3 000 ₽ спишется только когда вы решите продолжить.
 * Это ответ на вопрос, который человек задаёт себе в эту самую секунду, —
 * «меня уже начали доить?».
 *
 * Три пункта отвечают на «что дальше» в порядке денег: смотреть выдачу
 * бесплатно, звать людей за те же деньги, платить только за номер. Возврат
 * за посредника назван здесь же, на первом экране, а не спрятан в правилах:
 * это главное обещание продукта, и оно должно прозвучать до первой траты.
 *
 * **Название агентства — то, которое человек только что ввёл.** В заголовке
 * стоял «Невский проспект» из макета, и первое, что видел руководитель после
 * регистрации, было чужое название вместо своего. Названия нет только без
 * сеанса, а без сеанса охрана сюда не пускает: тогда заголовок просто молчит
 * о названии, а не выдумывает его.
 */
export function MobileAgencyCreatedPage() {
  const session = useSession()
  const agency = session?.agency ?? ""
  const trial = session?.trial ?? 0

  return (
    <FirstRunScreen
      slot="mobile-agency-created"
      title={agency === "" ? "Агентство создано" : `Агентство «${agency}» создано`}
      subtitle={
        trial > 0
          ? `${trial} ${plural(trial, "раскрытие", "раскрытия", "раскрытий")} уже на счёте, карта не нужна. Подписка 3 000 ₽ спишется только когда вы решите продолжить.`
          : "Карта не нужна. Подписка 3 000 ₽ спишется только когда вы решите продолжить."
      }
      steps={[
        {
          key: "1 · Задайте первый поиск",
          value:
            "Район, цена, этаж, время до метро. Выдача появится сразу, смотреть её можно бесплатно.",
        },
        /*
          «2 · Пригласите агентов» выключено 10.08.2026 (узел `ZJFdg`).

          Экран отвечает на вопрос «что делать в первые шестьдесят секунд»,
          а приглашение агентов — не первая минута: человек ещё не видел
          ни одной выдачи и не знает, звать ли кого-то в продукт, который
          пока не показал себя. Шаг никуда не делся — он живёт в разделе
          «Сотрудники», куда руководитель придёт сам, когда захочет.

          Шагов осталось два, и оба — про то, ради чего сюда пришли:
          задать поиск и раскрыть первый контакт.
        */
        {
          // Число пробных раскрытий названо в подзаголовке и здесь не
          // повторяется: два места с одним числом расходятся на первой же
          // трате, и одно из них начинает врать.
          key: "2 · Раскройте первый контакт",
          value:
            "199 ₽ за номер собственника. Пробные раскрытия не стоят ничего. Если попался посредник, вернём в одно нажатие.",
        },
      ]}
      action="Открыть поиск"
      // Первый поиск — следующий и единственный шаг руководителя: экран,
      // где выдача ещё не задана, но объекты уже есть.
      actionTo="/m/first-run/search"
    />
  )
}

/**
 * МОБАЙЛ · Второй сотрудник, первый вход (`Iyb4W`).
 *
 * Тот же каркас, что у руководителя, но разговор другой.
 *
 * **Онбординг не повторяется — агентство уже настроено.** Второму сотруднику
 * незачем слушать про подписку и приглашения: он ничего из этого не решает.
 * Пункты пронумерованы не цифрами, а названы вещами, которые лично у него
 * отличаются: свой лимит, чужие готовые поиски, общий счёт.
 *
 * Последний пункт — самый неприятный и потому самый нужный: деньги общие,
 * и коллеги видят, кто какой контакт брал. Сказать это до первой траты
 * честнее, чем оставить человека выяснять на разборе.
 *
 * **Все три пункта теперь отвечают про это агентство, а не про макетное.**
 * Стояли «Дмитрий», «Невский проспект», лимит «5 раскрытий», руководитель
 * «Смирнова Ирина» и два готовых поиска «Расселение, центр» и «Доли
 * и комнаты» — ни одного из них в продукте нет. Имя и агентство приходят
 * из сеанса, лимит и руководитель — из списка людей агентства, поиски — из
 * сохранённых. Чего нет, о том пункт говорит прямо, а не подставляет
 * правдоподобное.
 */
export function MobileSecondEmployeePage() {
  const session = useSession()
  const workspace = useWorkspace()

  const name = session?.name ?? ""
  const agency = session?.agency ?? ""

  /**
   * Дневной лимит — свойство сотрудника, а не сеанса: его ставит руководитель
   * в карточке человека, и лежит он в списке людей агентства.
   *
   * Нет записи о сотруднике или лимит не задан — обе эти вещи для человека
   * означают одно и то же: сегодня его никто не ограничивает. Разводить их
   * двумя разными строками значило бы объяснять устройство хранилища вместо
   * ответа на вопрос «сколько я могу раскрыть».
   */
  const limit = workspace.people.find((person) => person.email === session?.email)?.limit ?? null
  const owner = workspace.people.find((person) => person.role === "owner")
  const searches = workspace.savedSearches
  const listed = searches.slice(0, 3).map((search) => `«${search.name}»`).join(", ")
  const rest = searches.length - 3

  const place = agency === "" ? "в агентстве" : `в агентстве «${agency}»`

  return (
    <FirstRunScreen
      slot="mobile-second-employee"
      title={name === "" ? `Вы ${place}` : `${name}, вы ${place}`}
      subtitle="Агентство уже настроено. Ниже то, что отличается лично у вас."
      steps={[
        {
          key: "Ваш лимит на сегодня",
          value: `${
            limit === null
              ? "Дневной лимит не задан"
              : `${limit} ${plural(limit, "раскрытие", "раскрытия", "раскрытий")}`
          }. Обнуляется в 00:00. Изменить может только ${owner?.name || "руководитель агентства"}.`,
        },
        {
          key: "Поиски агентства",
          value:
            searches.length === 0
              ? "Пока ни одного. Сохранённый поиск виден всем сотрудникам сразу — заведите свой, и коллеги начнут с него."
              : `${listed}${rest > 0 ? ` и ещё ${rest}` : ""}. Свои поиски заводите рядом.`,
        },
        {
          key: "Счёт",
          value:
            "Общий. Деньги агентства, не ваши. Коллеги видят, кто какой контакт брал.",
        },
      ]}
      action="Открыть поиски агентства"
      // Сохранённые поиски: раздел «ПОИСКИ АГЕНТСТВА» на том экране —
      // это ровно те поиски, что названы вторым пунктом выше.
      actionTo="/m/saved-searches"
    />
  )
}
