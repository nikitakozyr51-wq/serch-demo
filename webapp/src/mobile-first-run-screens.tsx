import { ChevronRight, Gift, Search } from "lucide-react"
import { useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { MobileAuthLogo, MobileBottomNav } from "@/features/cabinet"
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
    <div className="flex min-h-svh w-full items-start justify-center bg-line-1 p-10">
      <div
        data-slot={slot}
        className="flex h-[844px] w-[390px] flex-col overflow-hidden bg-bg outline-solid outline-1 -outline-offset-1 outline-line-2"
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Шапка кабинета в пробном режиме (`i0hSua`).
 *
 * Геометрия — та же, что у общей `MobileHeader`: 56, поля [0, 16], зазор 10,
 * логотип, распорка, счёт, аватар 28.
 *
 * **Почему не переиспользована общая шапка.** `MobileHeader` печатает счёт
 * деньгами — `groupDigits(balance) + " ₽"`. В файле на этом экране написано
 * «5 раскрытий», и это не оговорка: пока агентство не заплатило, у него нет
 * рублей на счету, у него есть пять пробных раскрытий. «5 ₽» соврало бы про
 * состояние счёта, а дописать в закрытый компонент режим счёта — правка
 * общего компонента, которой эта задача не касается.
 */
function MobileTrialHeader({
  trials,
  initials,
}: {
  /** Остаток пробных раскрытий словами: «5 раскрытий». */
  trials: string
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

      <Typography variant="metaStrong" tone="secondary">
        {trials}
      </Typography>

      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fg text-surface">
        <Typography variant="avatarInitials" tone="current">
          {initials}
        </Typography>
      </span>
    </header>
  )
}

/**
 * Готовые наборы условий на экране первого поиска (`B1m8xr`).
 *
 * **Ни один набор никуда не ведёт, и это осознанно.** Набор открывает выдачу,
 * а мобильной выдачи под собственным адресом в продукте пока нет: собранный
 * кадр живёт на стенде. Строки названы действием и молчат — до того дня,
 * когда у выдачи появится адрес. Отправить человека с телефона на десктопную
 * выдачу значило бы сломать первый же его шаг в продукте.
 */
const PRESETS = [
  { title: "Петроградский, 2-к, до 15 млн", note: "148 объектов от собственников" },
  { title: "Вся вторичка, добавлено сегодня", note: "191 объект за сутки" },
  { title: "Комнаты и доли, Центральный", note: "203 объекта в районе" },
  { title: "Расселение", note: "6 объектов в подборке" },
]

/**
 * МОБАЙЛ · Первый поиск (`rlhGF`).
 *
 * Экран поиска до того, как в нём что-либо задано: 390 × 844, шапка 56,
 * тело с полями 16 и зазором 20, нижняя навигация 72 на вкладке «Поиск».
 *
 * **Это не пустое состояние, и общий `MobileEmptyState` сюда не подходит.**
 * Пустое состояние говорит «здесь ничего нет» и предлагает одно действие.
 * Здесь всё наоборот: поиск ещё не задан, но объекты уже есть — 148, 191,
 * 203 штуки, — и четыре готовых набора дают человеку увидеть выдачу раньше,
 * чем он научится формулировать условия. Агент из агентства не хочет
 * настраивать фильтры в первую минуту, он хочет увидеть, что тут вообще
 * лежит.
 *
 * Наборы стоят строками 56 со стрелкой, а не чипами: у каждого есть подпись
 * с числом объектов, и без неё набор не отличить от соседнего.
 *
 * **Плашка сверху — единственное место продукта, где счёт назван
 * не деньгами.** «5 пробных раскрытий» вместо суммы: пока карта не привязана,
 * рублей на счету нет, и показывать их было бы враньём. Тон предупреждающий,
 * а не праздничный — это ограниченный ресурс, а не подарок, хотя значок
 * в файле именно подарочный.
 */
export function MobileFirstSearchPage() {
  return (
    <MobilePhoneFrame slot="mobile-first-search">
      <MobileTrialHeader trials="5 раскрытий" initials="ИС" />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="flex w-full shrink-0 items-start gap-2.5 rounded-lg bg-warn-tint p-3">
          <Gift aria-hidden className="size-4 shrink-0 text-warn-text" strokeWidth={2} />
          <Typography variant="denseText" tone="warn">
            На счету 5 пробных раскрытий. Потратьте их на реальные объекты.
          </Typography>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-1.5">
          <Typography variant="cardPrice" tone="default" as="h1">
            С чего начать поиск
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Введите адрес, метро или район либо возьмите готовый набор.
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
            ГОТОВЫЕ НАБОРЫ
          </Typography>

          {PRESETS.map((preset) => (
            <button
              key={preset.title}
              type="button"
              data-slot="mobile-preset"
              data-action={`Открыть выдачу по набору «${preset.title}»`}
              className="flex h-14 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-lg bg-surface px-3.5 text-left outline-solid outline-1 -outline-offset-1 outline-line-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Typography variant="strongText" tone="default">
                  {preset.title}
                </Typography>
                <Typography variant="metaText" tone="dense">
                  {preset.note}
                </Typography>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-text-dense"
                strokeWidth={2}
              />
            </button>
          ))}
        </div>

        {/* Распорка низа из файла: наборы прижаты к верху, а не растянуты
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
 */
export function MobileAgencyCreatedPage() {
  return (
    <FirstRunScreen
      slot="mobile-agency-created"
      title="Агентство «Невский проспект» создано"
      subtitle="Пять раскрытий уже на счёте, карта не нужна. Подписка 3 000 ₽ спишется только когда вы решите продолжить."
      steps={[
        {
          key: "1 · Задайте первый поиск",
          value:
            "Район, цена, этаж, время до метро. Выдача появится сразу, смотреть её можно бесплатно.",
        },
        {
          key: "2 · Пригласите агентов",
          value:
            "До двадцати человек за те же 3 000 ₽. Дневной лимит раскрытий у каждого свой, ставит его руководитель.",
        },
        {
          key: "3 · Раскройте первый контакт",
          value:
            "199 ₽ за номер собственника. Первые пять бесплатно. Если попался посредник, вернём в одно нажатие.",
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
 */
export function MobileSecondEmployeePage() {
  return (
    <FirstRunScreen
      slot="mobile-second-employee"
      title="Дмитрий, вы в агентстве «Невский проспект»"
      subtitle="Агентство уже настроено. Ниже то, что отличается лично у вас."
      steps={[
        {
          key: "Ваш лимит на сегодня",
          value:
            "5 раскрытий. Обнуляется в 00:00. Изменить может только Смирнова Ирина.",
        },
        {
          key: "Поиски агентства",
          value:
            "Два готовых: «Расселение, центр» и «Доли и комнаты». Свои поиски заводите рядом.",
        },
        {
          key: "Счёт",
          value:
            "Общий. Деньги агентства, не ваши. Коллеги видят, кто какой контакт брал.",
        },
      ]}
      action="Открыть поиски агентства"
      // Сохранённые поиски: раздел «ПОИСКИ АГЕНТСТВА» на том экране —
      // это ровно те два поиска, что названы третьим пунктом выше.
      actionTo="/m/saved-searches"
    />
  )
}
