import { Link, useNavigate } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Checkbox } from "@/components/controls/Checkbox"
import { Typography } from "@/components/typography"
import {
  AuthField,
  AuthShell,
  hasAccounts,
  readPasswordResetToken,
  signIn,
  signUp,
} from "@/features/auth"

/**
 * ВХОД · экраны входа, регистрации и восстановления.
 *
 * Снято с `tIplu`, `V3seY`, `J0pPv`, `C1oCj`, `G6S9d`. Все пять сидят
 * на одном каркасе и различаются заголовком, полями и действием.
 *
 * **Правая панель одна на все экраны, и это осознанно.** Человек может попасть
 * сюда с любого шага — из письма, по ссылке от коллеги, после сброса пароля, —
 * и на каждом ему нужен один и тот же ответ: что внутри, сколько стоит,
 * что защищает его базу. Менять этот ответ от экрана к экрану значило бы
 * рассказывать разное разным людям.
 */

/**
 * Ряд действий: главная кнопка и пара «вопрос — ссылка» справа.
 *
 * **Ссылка справа — единственная дорога между входом и регистрацией.** Человек,
 * попавший не туда, обязан перейти одним нажатием, а не искать выход
 * в подвале. Поэтому это настоящая ссылка, а не подпись: её можно открыть
 * в новой вкладке и вернуться назад кнопкой браузера.
 */
function Actions({
  primary,
  question,
  link,
  linkTo,
  onPrimary,
  disabled,
}: {
  primary: string
  question: string
  link: string
  linkTo?: string
  onPrimary?: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex w-full items-center gap-5">
      <Button variant="primary" size="lg" onClick={onPrimary} disabled={disabled}>
        {primary}
      </Button>
      <div className="flex items-center gap-1.5">
        <Typography variant="denseText" tone="dense">
          {question}
        </Typography>
        {linkTo ? (
          <Typography asChild variant="numericDense" tone="default">
            <Link
              to={linkTo}
              className="cursor-pointer underline-offset-2 hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              {link}
            </Link>
          </Typography>
        ) : (
          <Typography variant="numericDense" tone="default">
            {link}
          </Typography>
        )}
      </div>
    </div>
  )
}

/** Строка согласия: чекбокс, текст и ссылка на документ. */
function Consent({
  text,
  link,
  checked = false,
  onChange,
}: {
  text: string
  link: string
  checked?: boolean
  onChange?: (next: boolean) => void
}) {
  return (
    <div className="flex w-full items-center gap-2.5">
      <Checkbox checked={checked} onCheckedChange={(next) => onChange?.(Boolean(next))} />
      <Typography variant="denseText" tone="default">
        {text}
      </Typography>
      <Typography variant="denseText" tone="dense">
        {link}
      </Typography>
    </div>
  )
}

function Fields({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col gap-5">{children}</div>
}

/**
 * Подсказки полей регистрации.
 *
 * **В полях стояли образцы текста из макета** — название чужого агентства,
 * чужие ИНН, ФИО и почта. Дизайнер написал их, чтобы кадр не был пустым,
 * а человек читал их как чью-то настоящую запись и отправлял форму, не глядя.
 * Подсказка говорит, ЧТО вписать, и не притворяется данными.
 *
 * Строки одни на живую форму и на её же экран с ошибкой: там поля нарисованные,
 * и подсказка служит им значением. Две копии этих слов разъехались бы молча.
 */
const HINTS = {
  agency: "как называется ваше агентство",
  city: "город, в котором работаете",
  inn: "десять цифр",
  name: "фамилия, имя и отчество",
  email: "почта, на которую заводим агентство",
  phone: "номер для связи",
  password: "Придумайте пароль",
} as const

/** Длина пароля, которую требует вход агентства. Сказана подсказкой поля. */
const PASSWORD_MIN = 10

/**
 * Сколько знаков дописать — словом, а не цифрой.
 *
 * В кадре `vSKGt` ошибка звучит «Добавьте ещё четыре», и число там названо
 * словом не случайно: весь продукт говорит «не короче десяти знаков»,
 * «четыре готовых пресета», «пять пробных раскрытий». Цифра посреди фразы
 * читается как код ошибки, а не как совет.
 *
 * Само число при этом настоящее. Кадр нарисован для пароля в шесть знаков,
 * и списать его слово в слово значило бы обещать «добавьте ещё четыре» тому,
 * кто ввёл два. Остаток считается, а таблица переводит его в слово.
 */
const MISSING_WORD = [
  "один",
  "два",
  "три",
  "четыре",
  "пять",
  "шесть",
  "семь",
  "восемь",
  "девять",
] as const

/**
 * Пароль короче нужного — вернуть текст ошибки, иначе `null`.
 *
 * Проверка местная и до отправки: длина пароля — это правило, которое браузер
 * знает сам, и гонять его на сервер, чтобы услышать то же самое, значит
 * заставить человека ждать отказа, который был известен в момент ввода.
 */
function shortPassword(password: string): string | null {
  const missing = PASSWORD_MIN - password.length
  if (missing <= 0) return null
  const word = MISSING_WORD[missing - 1] ?? "десять"
  return `Пароль короче ${PASSWORD_MIN} знаков. Добавьте ещё ${word} — так требует политика входа агентства.`
}

/**
 * Вход в кабинет.
 *
 * **Форма живая, но пароль не проверяется, и это осознанно.** За кабинетом
 * пока нет сервера: демонстрация показывает продукт агентствам до того, как
 * написан бэкенд. Проверять пароль в браузере — значит выдумывать
 * безопасность, которой нет.
 *
 * ПОЧТА ПРИ ЭТОМ ПРОВЕРЯЕТСЯ ПО-НАСТОЯЩЕМУ. Витрины «Невский проспект»
 * больше нет — агентство заводит сам человек, — и вход ищет агентство с этой
 * почтой среди заведённых на этом компьютере. Не нашёл — говорит об этом и
 * предлагает создать. Вход, который пускает кого угодно куда угодно, — не
 * вход, а кнопка «показать картинку».
 *
 * Поле пустое: подставлять чужую почту, под которой ничего не заведено,
 * значит вести человека в ошибку с первого нажатия.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  const enter = () => {
    void signIn(email, password).then((failed) => {
      if (failed === null) {
        void navigate({ to: "/searches" })
        return
      }
      showRefusal(failed)
    })
  }

  /**
   * Отказ во входе.
   *
   * Формулировка отвечает на вопрос «что мне делать», а не пересказывает
   * ошибку сервера. Человек на этом экране не отлаживает продукт — он хочет
   * войти. Сообщение сервера при этом не прячется: без базы оно вообще
   * не приходит, а с базой «Invalid login credentials» ничего не объясняет
   * тому, кто просто ошибся раскладкой.
   */
  const showRefusal = (reason: string) => {
    setError(
      reason.toLowerCase().includes("credential") || reason.toLowerCase().includes("password")
        ? "Почта или пароль не подошли. Проверьте раскладку и заглавные буквы."
        : hasAccounts()
          ? "Агентства с такой почтой нет. Проверьте адрес или создайте агентство."
          : "На этом компьютере ещё не заводили агентство. Создайте — это займёт минуту.",
    )
  }

  return (
    <AuthShell
      title="Вход в кабинет"
      subtitle="Рабочая почта и пароль. Если вас пригласили в агентство, ссылка на вход пришла в письме."
    >
      <Fields>
        <div className="w-194">
          <AuthField
            label="РАБОЧИЙ E-MAIL"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(next) => {
              setEmail(next)
              setError(null)
            }}
            placeholderText="почта, на которую заводили агентство"
            error={error ?? undefined}
          />
        </div>
        <div className="w-194">
          <AuthField
            label="ПАРОЛЬ"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            hint="забыли пароль?"
          />
        </div>
      </Fields>
      <div className="h-7" />
      <Actions
        primary="Войти"
        question="Ещё нет агентства?"
        link="Создать"
        linkTo="/register"
        onPrimary={enter}
      />
    </AuthShell>
  )
}

/**
 * Создание агентства.
 *
 * **Кнопка выключена, пока не отмечены оба согласия.** Это не придирка формы:
 * продукт продаёт контакты живых людей, и согласие на обработку данных —
 * ровно то, чем он защищён по 152-ФЗ. Нажать «Создать агентство», не отметив
 * его, нельзя нигде, включая демонстрацию.
 *
 * После создания человек попадает не в общую выдачу, а на экран первого входа:
 * пустое агентство и пять пробных раскрытий — другое состояние продукта,
 * а не та же выдача с другим числом в шапке.
 *
 * **ФОРМА ПУСТАЯ.** Раньше в ней лежало заполненное чужое агентство из макета,
 * и человек создавал себе агентство с чужим названием, ИНН и почтой, ни разу
 * не коснувшись полей. То, что он вводит здесь, потом стоит в шапке кабинета
 * и в журнале раскрытий — вписать это может только он сам.
 *
 * **Кадр `vSKGt` «почта занята и слабый пароль» — это ЭТОТ экран, а не ещё
 * один.** Нарисованы два отказа сразу: под «РАБОЧИЙ E-MAIL» и под «ПАРОЛЬ»,
 * у обоих полей линия снизу становится красной и толщиной 2. Собирать под
 * него отдельную страницу значило бы завести второй экран регистрации,
 * который разъедется с первым в первую же правку формы, — поэтому кадр
 * собран состоянием: оба отказа наступают по-настоящему.
 */
export function RegisterPage() {
  const navigate = useNavigate()
  const [agency, setAgency] = useState("")
  const [city, setCity] = useState("")
  const [inn, setInn] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [offer, setOffer] = useState(false)
  const [consent, setConsent] = useState(false)
  /** Отказ сервера при создании агентства. Без базы не появляется никогда. */
  const [error, setError] = useState<string | null>(null)
  /**
   * Отказы, у которых есть своё поле (`vSKGt`).
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Раньше обе эти причины валились в общую строку над формой — и человек
   * читал «проверьте почту и пароль», глядя на семь полей, из которых
   * ошибочны два. В кадре ошибка стоит ПОД своим полем и красит его линию:
   * взгляд идёт к тому месту, которое надо править, а не к началу формы.
   *
   * Строка над формой при этом осталась: у отказов без своего поля — сеть
   * упала, база отказала — её и держат. Разложить всё по полям нельзя,
   * а прятать нельзя тем более.
   */
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Имя теперь тоже обязательно. Пока поле было заполнено макетом, пустым оно
  // не бывало; теперь бывает — а без имени кабинет подписал бы человека словом
  // «Руководитель» и поставил бы это же слово в журнал раскрытий рядом
  // с каждым списанием.
  //
  // Пароль в этом списке появился вместе с проверкой его длины. Без него
  // «Создать агентство» заводило агентство с пустым паролем, а войти в него
  // потом было нечем: вход спрашивает пароль. Плюс отказ «добавьте ещё
  // столько-то знаков» на пустом поле читался бы издевательством.
  const ready =
    offer
    && consent
    && agency.trim() !== ""
    && email.trim() !== ""
    && name.trim() !== ""
    && password !== ""

  const create = () => {
    if (!ready) return
    // Отказ прошлой попытки снимается в момент новой: строка над формой,
    // пережившая нажатие, читалась бы как ответ на него.
    setError(null)

    // Длину пароля браузер знает сам, и спрашивать о ней сервер незачем.
    // Проверка стоит до отправки: иначе агентство успело бы завестись,
    // а отказ пришёл бы после.
    const weak = shortPassword(password)
    setPasswordError(weak)
    if (weak !== null) return

    void signUp({ name, email, agency, password }).then((failed) => {
      // «confirm-email» — не отказ, а другой путь: письмо ушло, человек идёт
      // его открывать. С выключенным подтверждением почты этого не бывает.
      if (failed === "confirm-email") {
        void navigate({ to: "/check-mail" })
        return
      }
      if (failed !== null) {
        // Занятая почта — единственный отказ, про который точно известно,
        // какое поле виновато. Остальные идут строкой над формой.
        if (failed.toLowerCase().includes("already")) {
          setEmailError(
            "Эта почта уже привязана к другому агентству. Войдите или попросите руководителя пригласить вас.",
          )
          return
        }
        setError(
          "Агентство не создалось. Проверьте почту и пароль — пароль не короче десяти знаков.",
        )
        return
      }
      void navigate({ to: "/first-run/agency" })
    })
  }

  return (
    <AuthShell
      narrow
      title="Создайте агентство"
      subtitle="Пять минут и никакой карты. Пробные раскрытия уже на счету — позвоните первому собственнику сегодня."
      stepsLabel="ЧТО БУДЕТ ДАЛЬШЕ"
    >
      <Fields>
        {/* Отказ сервера стоит над полями, а не под кнопкой: человек читает
            сверху вниз, и причина обязана попасться раньше, чем он второй раз
            нажмёт «Создать». */}
        {error === null ? null : (
          <div className="w-194 text-err-text">
            <Typography variant="uiText" tone="current">
              <>{error}</>
            </Typography>
          </div>
        )}
        <div className="flex w-194 gap-5">
          <AuthField
            label="НАЗВАНИЕ АГЕНТСТВА"
            value={agency}
            onChange={setAgency}
            name="agency"
            placeholderText={HINTS.agency}
          />
          <AuthField
            label="ГОРОД"
            value={city}
            onChange={setCity}
            name="city"
            placeholderText={HINTS.city}
          />
        </div>
        <div className="flex w-194 gap-5">
          <AuthField
            label="ИНН"
            value={inn}
            onChange={setInn}
            name="inn"
            placeholderText={HINTS.inn}
            hint="проверим в ЕГРЮЛ автоматически"
          />
          <AuthField
            label="ФИО РУКОВОДИТЕЛЯ"
            value={name}
            onChange={setName}
            name="name"
            placeholderText={HINTS.name}
          />
        </div>
        <div className="flex w-194 gap-5">
          {/* Правка почты гасит отказ по ней же: человек уже исправляет то,
              на что ему указали, и красная линия под рукой мешает читать
              собственный ввод. Ошибка вернётся, если и новая почта занята. */}
          <AuthField
            label="РАБОЧИЙ E-MAIL"
            value={email}
            onChange={(next) => {
              setEmail(next)
              setEmailError(null)
            }}
            name="email"
            type="email"
            autoComplete="email"
            placeholderText={HINTS.email}
            hint="на него придёт подтверждение"
            error={emailError ?? undefined}
          />
          <AuthField
            label="ТЕЛЕФОН"
            value={phone}
            onChange={setPhone}
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholderText={HINTS.phone}
          />
        </div>
        <div className="w-194">
          <AuthField
            label="ПАРОЛЬ"
            value={password}
            onChange={(next) => {
              setPassword(next)
              setPasswordError(null)
            }}
            name="password"
            type="password"
            autoComplete="new-password"
            placeholderText={HINTS.password}
            hint="не короче десяти знаков"
            error={passwordError ?? undefined}
          />
        </div>
      </Fields>

      <div className="h-6.5" />

      <div className="flex w-full flex-col gap-3">
        <Consent
          text="Принимаю оферту"
          link="прочитать оферту"
          checked={offer}
          onChange={setOffer}
        />
        <Consent
          text="Даю согласие на обработку моих персональных данных"
          link="отдельный документ, ст. 10.1 152-ФЗ"
          checked={consent}
          onChange={setConsent}
        />
      </div>

      <div className="h-7" />
      <Actions
        primary="Создать агентство"
        question="Уже есть агентство?"
        link="Войти"
        linkTo="/login"
        onPrimary={create}
        disabled={!ready}
      />
    </AuthShell>
  )
}

/**
 * Регистрация с ошибками проверки.
 *
 * **Ошибка говорит, что именно не так и что делать**, а не «проверьте данные»:
 * «Такого ИНН нет в ЕГРЮЛ. Проверьте цифры или напишите на hello@serch.ru».
 * Второй адрес в тексте — не вежливость, а выход из тупика: если ИНН верный,
 * а ЕГРЮЛ молчит, человеку больше некуда идти.
 *
 * **Номер из текста ошибки убран, и поля стоят с подсказками.** Раньше экран
 * показывал заполненное чужое агентство и называл вслух чужой ИНН — цифры были
 * образцом из макета, а читались как настоящая запись. Экран существует, чтобы
 * показать ВИД ошибки, и для этого чужие данные не нужны.
 */
export function RegisterErrorPage() {
  return (
    <AuthShell
      narrow
      title="Создайте агентство"
      subtitle="Пять минут и никакой карты. Пробные раскрытия уже на счету — позвоните первому собственнику сегодня."
      stepsLabel="ЧТО БУДЕТ ДАЛЬШЕ"
    >
      <Fields>
        <div className="flex w-194 gap-5">
          <AuthField label="НАЗВАНИЕ АГЕНТСТВА" value={HINTS.agency} placeholder />
          <AuthField label="ГОРОД" value={HINTS.city} placeholder />
        </div>
        <div className="flex w-194 gap-5">
          <AuthField
            label="ИНН"
            value={HINTS.inn}
            placeholder
            error="Такого ИНН нет в ЕГРЮЛ. Проверьте цифры или напишите на hello@serch.ru."
          />
          <AuthField label="ФИО РУКОВОДИТЕЛЯ" value={HINTS.name} placeholder />
        </div>
        <div className="flex w-194 gap-5">
          <AuthField
            label="РАБОЧИЙ E-MAIL"
            value={HINTS.email}
            placeholder
            error="На эту почту уже создано агентство. Войдите или восстановите пароль."
          />
          <AuthField label="ТЕЛЕФОН" value={HINTS.phone} placeholder />
        </div>
        <div className="w-194">
          <AuthField label="ПАРОЛЬ" value={HINTS.password} placeholder hint="не короче десяти знаков" />
        </div>
      </Fields>

      <div className="h-6.5" />

      <div className="flex w-full flex-col gap-3">
        <Consent text="Принимаю оферту" link="прочитать оферту" />
        <Consent
          text="Даю согласие на обработку моих персональных данных"
          link="отдельный документ, ст. 10.1 152-ФЗ"
        />
      </div>

      <div className="h-7" />
      <Actions primary="Создать агентство" question="Уже есть агентство?" link="Войти" />
    </AuthShell>
  )
}

/**
 * Ссылка отправлена (`l94q2r`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Адрес в подзаголовке — тот, который человек только что ввёл сам.**
 * В кадре на его месте стоит `i.smirnova@nevsky.ru` — образец из макета,
 * и он же стоял на «Проверьте почту», пока его оттуда не убрали. Здесь
 * настоящий адрес взять НЕОТКУДА, кроме как из формы напротив: сеанса нет —
 * человек как раз потерял пароль, — а сервер, знающий его почту, ещё
 * не написан. Поэтому экран и собран состоянием формы, а не отдельной
 * страницей: страница не знала бы, кому ушло письмо, и назвала бы чужой ящик.
 *
 * **«Отправить ссылку ещё раз» возвращает к форме, а не шлёт второе письмо.**
 * Второго письма без сервера не будет, а плашка «отправлено ещё раз» была бы
 * выдумкой. Возврат честнее и полезнее: человек видит адрес, который указал,
 * и может его поправить — опечатка в адресе и есть самая частая причина,
 * по которой письмо «не пришло». То же решение уже принято на телефоне,
 * в `MobileCheckMailPage`.
 *
 * Совет про «Спам» — подпись, а не кнопка: нажимать в нём нечего. В кадре он
 * одной строкой 13/500 приглушённым, без выделенного слова.
 */
function RecoveryLinkSent({ mailbox, onAgain }: { mailbox: string; onAgain: () => void }) {
  return (
    <AuthShell
      title="Ссылка отправлена"
      subtitle={`Письмо со ссылкой ушло на ${mailbox}. Ссылка живёт час и открывается один раз.`}
      stepsLabel="ЧТО БУДЕТ ДАЛЬШЕ"
    >
      {/* Полей нет вовсе: человеку нечего вводить, он ждёт письма. */}
      <div className="flex items-center gap-5">
        <Button variant="primary" size="lg" onClick={onAgain}>
          Отправить ссылку ещё раз
        </Button>
        <Typography variant="denseText" tone="dense">
          Письмо не пришло за 5 минут — проверьте папку «Спам».
        </Typography>
      </div>
    </AuthShell>
  )
}

/**
 * Восстановление пароля.
 *
 * В поле стоит подсказка, а не чужой адрес. Подставленная почта из макета
 * читалась как «мы уже знаем, кто вы»: человек нажимал «Прислать ссылку»,
 * и письмо ушло бы не ему.
 *
 * **Поле живое, и без адреса кнопка не нажимается.** Пока поле было
 * нарисованным, «Прислать ссылку» ничего не делала — то есть экран
 * восстановления не восстанавливал. Теперь у него два состояния: форма
 * и «Ссылка отправлена» (`l94q2r`), и второе знает, куда ушло письмо,
 * только потому, что первое спросило.
 */
export function ForgotPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  if (sent) return <RecoveryLinkSent mailbox={email.trim()} onAgain={() => setSent(false)} />

  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Укажите рабочую почту. Пришлём ссылку для смены пароля, она действует один час."
    >
      <Fields>
        <div className="w-194">
          <AuthField
            label="РАБОЧИЙ E-MAIL"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholderText="почта, на которую заводили агентство"
          />
        </div>
      </Fields>
      <div className="h-7" />
      <Actions
        primary="Прислать ссылку"
        question="Вспомнили пароль?"
        link="Войти"
        linkTo="/login"
        onPrimary={() => setSent(true)}
        disabled={email.trim() === ""}
      />
    </AuthShell>
  )
}

/**
 * Ссылка перестала работать (`EA0qM`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Тупик с выходом, а не сообщение об ошибке.** Ссылка одноразовая и живёт
 * час — значит человек, пришедший по вчерашнему письму, упрётся в этот экран
 * не по своей вине и без единой подсказки, что делать. Поэтому главное
 * действие здесь не «назад», а «Прислать новую ссылку»: оно возвращает
 * на восстановление пароля, где человек назовёт почту и получит живую ссылку.
 *
 * Вторым выходом стоит вход: пароль часто вспоминается ровно в ту секунду,
 * когда сломалась ссылка, и заставлять человека ещё раз идти через почту
 * было бы наказанием за хорошую память.
 *
 * Причина названа обеими возможными: «уже использована или устарела».
 * Какая из двух — знает сервер, которого за экраном нет, и выбрать одну
 * значило бы угадать: человеку, открывшему ссылку второй раз, сказать
 * «устарела» — это отправить его ждать нового письма вместо того, чтобы
 * объяснить, что письмо у него уже было.
 */
function RecoveryLinkDead({ onAgain }: { onAgain: () => void }) {
  return (
    <AuthShell
      title="Ссылка перестала работать"
      subtitle="Ссылка живёт час и открывается один раз. Эта уже использована или устарела — пришлём новую на ту же почту."
    >
      {/* Полей нет: менять пароль пока нечем, сначала нужна рабочая ссылка. */}
      <Actions
        primary="Прислать новую ссылку"
        question="Вспомнили пароль?"
        link="Войти"
        linkTo="/login"
        onPrimary={onAgain}
      />
    </AuthShell>
  )
}

/**
 * Новый пароль.
 *
 * **Сказано неудобное следствие:** после смены пароля все активные сеансы
 * этого сотрудника завершатся, включая мобильные. Человек должен узнать
 * об этом до нажатия, а не после того, как у него вылетит телефон.
 *
 * **Мёртвая ссылка — состояние этого экрана, а не отдельный адрес.** Ключ
 * восстановления приезжает в хвосте ссылки из письма, и читает его
 * `readPasswordResetToken`. Ключа нет — подтверждать смену пароля нечем,
 * и «Сохранить и войти» упирается ровно в то, что нарисовано в `EA0qM`.
 * Это не имитация отказа: без ключа смена пароля действительно невозможна,
 * а страница, заведённая под такой отказ отдельно, открывалась бы по адресу,
 * на который никакое письмо не ведёт.
 */
export function NewPasswordPage() {
  const navigate = useNavigate()
  const [dead, setDead] = useState(false)

  if (dead) return <RecoveryLinkDead onAgain={() => void navigate({ to: "/forgot" })} />

  const save = () => {
    if (readPasswordResetToken(window.location) === "") {
      setDead(true)
      return
    }
    // Ключ есть — но подтверждает смену сервер, которого за экраном пока нет.
    // Поэтому ведём на вход: человек входит новым паролем сам. Открыть кабинет
    // здесь значило бы пустить внутрь по непроверенной ссылке.
    void navigate({ to: "/login", search: { returnTo: undefined } })
  }

  return (
    <AuthShell
      title="Новый пароль"
      subtitle="Ссылка одноразовая. После смены пароля все активные сеансы этого сотрудника завершатся, включая мобильные."
    >
      <Fields>
        <div className="w-194">
          <AuthField label="НОВЫЙ ПАРОЛЬ" value="••••••••••••" hint="не короче десяти знаков" />
        </div>
        <div className="w-194">
          <AuthField label="ПОВТОРИТЕ ПАРОЛЬ" value="••••••••••••" />
        </div>
      </Fields>
      <div className="h-7" />
      <Actions
        primary="Сохранить и войти"
        question="Что-то пошло не так?"
        link="Написать в поддержку"
        onPrimary={save}
      />
    </AuthShell>
  )
}
