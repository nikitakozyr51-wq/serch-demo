import { Link, useNavigate } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Checkbox } from "@/components/controls/Checkbox"
import { Typography } from "@/components/typography"
import { AuthField, AuthShell, hasAccounts, signIn, signUp } from "@/features/auth"

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
    if (signIn(email)) {
      void navigate({ to: "/today" })
      return
    }

    // Формулировка отвечает на вопрос «что мне делать», а не сообщает об
    // отказе. Человек на этом экране не отлаживает продукт — он хочет войти.
    setError(
      hasAccounts()
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

  // Имя теперь тоже обязательно. Пока поле было заполнено макетом, пустым оно
  // не бывало; теперь бывает — а без имени кабинет подписал бы человека словом
  // «Руководитель» и поставил бы это же слово в журнал раскрытий рядом
  // с каждым списанием.
  const ready =
    offer && consent && agency.trim() !== "" && email.trim() !== "" && name.trim() !== ""

  const create = () => {
    if (!ready) return
    signUp({ name, email, agency })
    void navigate({ to: "/first-run/agency" })
  }

  return (
    <AuthShell
      narrow
      title="Создайте агентство"
      subtitle="Пять минут и никакой карты. Пробные раскрытия уже на счету — позвоните первому собственнику сегодня."
      stepsLabel="ЧТО БУДЕТ ДАЛЬШЕ"
    >
      <Fields>
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
          <AuthField
            label="РАБОЧИЙ E-MAIL"
            value={email}
            onChange={setEmail}
            name="email"
            type="email"
            autoComplete="email"
            placeholderText={HINTS.email}
            hint="на него придёт подтверждение"
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
            onChange={setPassword}
            name="password"
            type="password"
            autoComplete="new-password"
            placeholderText={HINTS.password}
            hint="не короче десяти знаков"
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
 * Восстановление пароля.
 *
 * В поле стоит подсказка, а не чужой адрес. Подставленная почта из макета
 * читалась как «мы уже знаем, кто вы»: человек нажимал «Прислать ссылку»,
 * и письмо ушло бы не ему.
 */
export function ForgotPage() {
  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Укажите рабочую почту. Пришлём ссылку для смены пароля, она действует один час."
    >
      <Fields>
        <div className="w-194">
          <AuthField label="РАБОЧИЙ E-MAIL" value="почта, на которую заводили агентство" placeholder />
        </div>
      </Fields>
      <div className="h-7" />
      <Actions primary="Прислать ссылку" question="Вспомнили пароль?" link="Войти" />
    </AuthShell>
  )
}

/**
 * Новый пароль.
 *
 * **Сказано неудобное следствие:** после смены пароля все активные сеансы
 * этого сотрудника завершатся, включая мобильные. Человек должен узнать
 * об этом до нажатия, а не после того, как у него вылетит телефон.
 */
export function NewPasswordPage() {
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
      <Actions primary="Сохранить и войти" question="Что-то пошло не так?" link="Написать в поддержку" />
    </AuthShell>
  )
}
