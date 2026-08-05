import { Link } from "@tanstack/react-router"
import { ArrowRight, Check, Clock } from "lucide-react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Карта экранов и путь агента.
 *
 * Страница отвечает на вопрос «как это всё выглядит целиком»: не список
 * маршрутов, а рабочий день агента по шагам, где каждый шаг — ссылка
 * на собранный экран.
 *
 * **Порядок шагов — не выдумка для наглядности, а продуктовое решение.**
 * Продукт обещает «находим сделки, а не ведём их», поэтому путь короткий
 * и заканчивается звонком: увидел, проверил, заплатил, позвонил, записал.
 * Всё, что после звонка, — уже CRM агентства, и туда мы не идём.
 *
 * Живёт только в режиме разработки. Это стенд для сверки, а не страница продукта.
 */

type Step = {
  /** Порядковый номер в пути агента. */
  n: number
  title: string
  /** Что человек делает на этом шаге и какой вопрос закрывает. */
  what: string
  path?: string
  /** Узел в Pencil, с которого снят экран. */
  node?: string
  /** Почему ещё не собран. Пусто — собран. */
  pending?: string
}

const JOURNEY: Step[] = [
  {
    n: 1,
    title: "Сегодня",
    what: "С чего начать день: перезвоны на сегодня, объекты, за которые заплачено и не позвонили, новое по сохранённым поискам.",
    path: "/screen/today",
    node: "kNd9b",
  },
  {
    n: 2,
    title: "Поиск и выдача",
    what: "Четыре площадки одним списком, дубли склеены, посредники отсеяны. Арифметика отсева видна: 892 − 431 − 214 = 247.",
    path: "/screen/search",
    node: "ghwPj · ZOB5K",
  },
  {
    n: 3,
    title: "Карточка объекта",
    what: "Звонить или нет. Цена с объяснением, признаки собственника, кто из агентства уже касался объекта — и только потом кнопка.",
    path: "/screen/object",
    node: "Fo8gk",
  },
  {
    n: 4,
    title: "Контакт раскрыт",
    what: "Что получено за 199 ₽: подтверждение списания, номер, звонок, рамка разговора по закону и фиксация результата.",
    path: "/screen/object-disclosed",
    node: "NKj5L",
  },
  {
    n: 5,
    title: "Режим «Прозвон»",
    what: "Подряд, без возврата в список: объект, звонок, результат, следующий. Ни шапки, ни сайдбара — всё, что уводит в сторону, из окна убрано.",
    path: "/screen/call",
    node: "pR6T1",
  },
]

const STANDS: Step[] = [
  {
    n: 1,
    title: "Состояния выдачи",
    what: "Загрузка со скелетонами, ошибка источника и шесть пустых состояний рядом. Два из них неразличимы по шапке и расходятся только телом.",
    path: "/screen/states",
    node: "pG4yw · g6EnZ · UYQoT · Yz08U · jxTTf · IhrBR · a6C5P · cTCZL",
  },
  {
    n: 2,
    title: "Телефон · выдача",
    what: "Не сжатый десктоп, а другой порядок фактов: фото держит высоту карточки, отклонение спускается на свою строку, фильтры сворачиваются в кнопку.",
    path: "/screen/mobile",
    node: "waJiE · G37qjO · U15v7",
  },
  {
    n: 3,
    title: "Телефон · прозвон",
    what: "Панели фиксации нет — на 390 две колонки не встают. Вместо неё кнопка, которая её открывает; номер и звонок прижаты к низу, под палец.",
    path: "/screen/mobile-call",
    node: "q4uhsx",
  },
  {
    n: 4,
    title: "Полигон контролов",
    what: "Кнопка, поле, чип и чекбокс во всех пяти состояниях — копия доски «СИСТЕМА · Состояния контролов» для сверки замером.",
    path: "/kitchen-sink",
    node: "nXleb",
  },
]

const AGENCY_SCREENS: Step[] = [
  { n: 1, title: "Эффективность", what: "Куда уходят деньги: простой первым, время до звонка главной цифрой, воронка в рублях за встречу.", path: "/screen/agency-efficiency", node: "Iebim" },
  { n: 2, title: "Сотрудники", what: "Пять человек, одно приглашение. Ролей две; «стажёр» — не роль, а дневной лимит.", path: "/screen/agency-staff", node: "u7anli" },
  { n: 3, title: "Отказы", what: "Стоп-лист агентства. Снять отметку нельзя ни одной ролью, и кнопки для этого нет.", path: "/screen/agency-refusals", node: "Y2Up0t" },
  { n: 4, title: "Журнал доступа", what: "Каждое обращение к контакту с автором, временем и IP. Просмотр уже раскрытого — тоже событие, но за 0 ₽.", path: "/screen/agency-access", node: "mCjJV" },
  { n: 5, title: "Согласия и отказы", what: "Запросы подтверждения и отметки об отказе. Ни одного цветного чипа: исход сказан словом.", path: "/screen/agency-consents", node: "H6amtE" },
  { n: 6, title: "Настройки агентства", what: "Реквизиты, ответственный за данные и семь правил. Удаление сказано полностью, включая год хранения журнала.", path: "/screen/agency-settings", node: "cNIZP" },
  { n: 7, title: "Тариф и подписка", what: "Три числа и всё: 3 000 ₽ за агентство, 6 из 20 мест, 199 ₽ за контакт. Выбирать нечего, и экран не притворяется.", path: "/screen/agency-plan", node: "AcGYf" },
  { n: 8, title: "Карточка сотрудника", what: "Права выражены чипами, а не переключателями: руководитель видит весь набор значений сразу. Почта заблокирована — это вход в кабинет; телефон нет.", path: "/agency/staff/person", node: "t6b58y" },
]

const AUTH_SCREENS: Step[] = [
  { n: 1, title: "Вход в кабинет", what: "Почта и пароль. Справа — что внутри, сколько стоит и чем защищена база агентства.", path: "/screen/login", node: "tIplu" },
  { n: 2, title: "Создать агентство", what: "Восемь полей, два согласия, никакой карты. Пробные раскрытия уже на счету.", path: "/screen/register", node: "V3seY" },
  { n: 3, title: "Регистрация · ошибка", what: "Ошибка говорит, что не так и что делать: «ИНН не нашёлся в ЕГРЮЛ, проверьте цифры или напишите на hello@serch.ru».", path: "/screen/register-error", node: "J0pPv" },
  { n: 4, title: "Восстановление пароля", what: "Ссылка действует один час — сказано до нажатия, а не в письме.", path: "/screen/forgot", node: "C1oCj" },
  { n: 5, title: "Новый пароль", what: "Сказано неудобное: после смены все сеансы завершатся, включая мобильные.", path: "/screen/new-password", node: "G6S9d" },
  { n: 6, title: "Код подтверждения", what: "Поле обычное, а не четыре ячейки: код чаще всего вставляют из письма, а ячейки ломают вставку.", path: "/confirm-code", node: "pIdgz" },
  { n: 7, title: "Проверьте почту", what: "Кнопка вторичная нарочно: главное действие сейчас в почтовом ящике, а не на экране.", path: "/check-mail", node: "iziCH" },
  { n: 8, title: "Приглашение", what: "Роль объяснена до принятия, а не после. Почту из приглашения изменить нельзя: иначе в агентство войдёт не тот, кого звали.", path: "/invite", node: "INCeL" },
  { n: 9, title: "Доступ закрыт", what: "Отвечает на три вопроса сразу, включая тот, который постесняются задать: что с моими раскрытиями.", path: "/access-closed", node: "RfL9b" },
  { n: 10, title: "Политика входа", what: "Показывает правила, а не настраивает их: длина пароля и срок кода одинаковы для всех. Свой сеанс завершить нельзя, и место кнопки всё равно занято.", path: "/profile/login-policy", node: "v9Z5fD" },
]

const FIRST_RUN: Step[] = [
  { n: 1, title: "Первый поиск", what: "Сохранённых поисков нет, а заголовок раздела стоит: человек видит, куда они лягут. Готовые наборы отвечают числом объектов, а не обещанием.", path: "/first-run/search", node: "uCehD" },
  { n: 2, title: "Агентство создано", what: "Три шага, и у третьего нет кнопки: раскрытие делают в выдаче над живым объектом, а не с обучающего экрана.", path: "/first-run/agency", node: "EF9xj" },
  { n: 3, title: "Второй сотрудник", what: "Три факта, которые иначе станут неловким разговором на второй день: мой лимит, что настроено до меня, чьи деньги я трачу.", path: "/first-run/employee", node: "O1hIO7" },
  { n: 4, title: "Диалоги", what: "Восемь штук на одной странице. Каждый говорит, что случится с деньгами и какой останется след.", path: "/dialogs", node: "q5xX5 · z9waH · CUY4q · gJdnV · nmULz · q7Yehb · t0M9V9 · L0qKK" },
]

const MONEY_SCREENS: Step[] = [
  { n: 1, title: "Баланс · списания", what: "Деньги показаны движением, а не остатком: в каждой строке видно, сколько осталось после операции. Колонка «чем кончилось» говорит, за что заплатили.", path: "/screen/balance", node: "w0qrBv" },
  { n: 2, title: "Баланс · возвраты", what: "Лимит стоит на субъективных причинах, а не на возвратах вообще: «номер не существует» и «объект продан» в лимит не считаются — ошибся продукт, а не агент.", path: "/screen/balance-refunds", node: "NanKI" },
  { n: 3, title: "Пополнить баланс", what: "Главное действие называется «Скачать счёт», а не «Оплатить»: продукт заканчивает свою часть работы файлом. Сумма переведена в раскрытия прямо под полем.", path: "/balance/top-up", node: "Ve3bF" },
  { n: 4, title: "Документы", what: "Четвёртая вкладка денег, а не отдельный раздел. Колонка «состояние» говорит на языке бухгалтерии: «подписан ЭДО», а не «доступен».", path: "/balance/documents", node: "uz1ET" },
]

const MOBILE_SCREENS: Step[] = [
  { n: 1, title: 'Телефон · Сегодня', what: 'Рабочий день агента в одной колонке: перезвоны, подвисшее и новое. Сайдбара нет — вместо него пять вкладок внизу под палец.', path: '/m/today', node: 'BhGA4' },
  { n: 2, title: 'Телефон · объект', what: 'Карточка объекта и её пара до раскрытия. Фото держит высоту, отклонение спускается на свою строку.', path: '/m/object', node: 'OGEg8 · MSLPo' },
  { n: 3, title: 'Телефон · деньги', what: 'Баланс, возвраты, пополнения, документы, счёт и заявка на возврат — шесть экранов.', path: '/m/balance', node: 'hRN4n · nJc69 · FA4Dt · XxC6e · NhUOQ · B8BQ8' },
  { n: 4, title: 'Телефон · агентство', what: 'Шесть разделов руководителя плюс карточка сотрудника, приглашение и тариф.', path: '/m/agency', node: 'bKoEu · P7DnP · FifB0 · MBinc · r3Jbr · cdYS2' },
  { n: 5, title: 'Телефон · подборки', what: 'Список, подборка изнутри, новая и публичная страница для клиента.', path: '/m/collections', node: 'sFBTe · L10Ikr · nVXGr · MHLlO' },
  { n: 6, title: 'Телефон · ещё', what: 'Профиль, уведомления, центр уведомлений, безопасность и смена пароля.', path: '/m/more', node: 'AJkLF · f3X8BR · jTLZb · lidwQ · hxSFc · q2rO9f' },
  { n: 7, title: 'Телефон · поиски', what: 'Сохранённые поиски, сохранение, глобальный поиск, массовое раскрытие и пуш на блокировке.', path: '/m/saved-searches', node: 'LlJyw · sN5wC · bx94j · liwT8 · vmUET · nZGka' },
  { n: 8, title: 'Телефон · вход', what: 'Десять экранов входа: вход и ошибка, регистрация, восстановление, код, письмо, приглашение, доступ закрыт.', path: '/m/login', node: 'XNGWj · Qra5j · R3opy · eUR7B · Br6g9' },
  { n: 9, title: 'Телефон · первый вход', what: 'Первый поиск, агентство создано, второй сотрудник — те же три экрана, что на десктопе, собранные заново.', path: '/m/first-run/search', node: 'rlhGF · vuURe · Iyb4W' },
]

const AHEAD = [
  "Живые данные: откуда берутся объявления с четырёх площадок",
  "Бэкенд: регистрация, деньги, журнал доступа, реестр отказов",
  "Мобильное приложение на Expo: жесты, листы, пуши",
]

function StepCard({ step }: { step: Step }) {
  const inner = (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-3 rounded-2xl bg-surface p-5",
        "outline-solid outline-1 -outline-offset-1 outline-line-2",
        step.path && "transition-colors hover:outline-fg",
      )}
    >
      <div className="flex w-full items-center gap-2">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            step.pending ? "bg-warm text-text-dense" : "bg-fg text-surface",
          )}
        >
          {step.pending ? (
            <Clock aria-hidden className="size-3.5" strokeWidth={2} />
          ) : (
            <Check aria-hidden className="size-3.5" strokeWidth={2} />
          )}
        </span>
        <Typography variant="rowPrice" tone="default">
          {step.title}
        </Typography>
        <div className="h-px flex-1" />
        {step.path ? (
          <ArrowRight aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
        ) : null}
      </div>

      <Typography variant="denseText" tone="secondary">
        {step.what}
      </Typography>

      <div className="flex-1" />

      <div className="flex w-full items-center gap-2">
        <Typography variant="metaText" tone="dense">
          {step.node ?? "—"}
        </Typography>
        <div className="h-px flex-1" />
        <Typography variant="metaText" tone={step.pending ? "warn" : "ok"}>
          {step.pending ?? "собран"}
        </Typography>
      </div>
    </div>
  )

  if (!step.path) {
    return (
      <div data-slot="map-card" data-pending className="flex">
        <>{inner}</>
      </div>
    )
  }

  return (
    <Link
      to={step.path}
      data-slot="map-card"
      className="flex outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      {inner}
    </Link>
  )
}

export function ScreenMapPage() {
  return (
    <div className="flex min-h-svh w-full justify-center bg-bg p-10">
      <div className="flex w-full max-w-[1152px] flex-col gap-10">
        <div className="flex w-full flex-col gap-2">
          <Typography variant="display" tone="default" as="h1">
            Сёрчь — карта экранов
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Рабочий день агента по шагам. Каждый шаг — собранный экран, снятый
            с Pencil замером, а не на глаз. Внизу каждой карточки стоит узел
            файла, с которого экран снят.
          </Typography>
        </div>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            ПУТЬ АГЕНТА
          </Typography>
          <div className="grid w-full grid-cols-3 gap-4">
            {JOURNEY.map((step) => (
              <StepCard key={step.title} step={step} />
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            СТЕНДЫ ДЛЯ СВЕРКИ
          </Typography>
          <div className="grid w-full grid-cols-3 gap-4">
            {STANDS.map((step) => (
              <StepCard key={step.title} step={step} />
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            АГЕНТСТВО · РАЗДЕЛ РУКОВОДИТЕЛЯ
          </Typography>
          <div className="grid w-full grid-cols-3 gap-4">
            {AGENCY_SCREENS.map((step) => (
              <StepCard key={step.title} step={step} />
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            ДЕНЬГИ
          </Typography>
          <div className="grid w-full grid-cols-3 gap-4">
            {MONEY_SCREENS.map((step) => (
              <StepCard key={step.title} step={step} />
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            ВХОД И РЕГИСТРАЦИЯ
          </Typography>
          <div className="grid w-full grid-cols-3 gap-4">
            {AUTH_SCREENS.map((step) => (
              <StepCard key={step.title} step={step} />
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            ПЕРВЫЙ ВХОД И ДИАЛОГИ
          </Typography>
          <div className="grid w-full grid-cols-3 gap-4">
            {FIRST_RUN.map((step) => (
              <StepCard key={step.title} step={step} />
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            КАБИНЕТ НА ТЕЛЕФОНЕ · 56 ЭКРАНОВ
          </Typography>
          <div className="grid w-full grid-cols-3 gap-4">
            {MOBILE_SCREENS.map((step) => (
              <StepCard key={step.title} step={step} />
            ))}
          </div>
        </section>

        <section className="flex w-full flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            ВПЕРЕДИ
          </Typography>
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-surface p-5 outline-solid outline-1 -outline-offset-1 outline-line-2">
            {AHEAD.map((item) => (
              <div key={item} className="flex w-full items-center gap-2">
                <span aria-hidden className="size-1 shrink-0 rounded-full bg-line-3" />
                <Typography variant="denseText" tone="secondary">
                  {item}
                </Typography>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
