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
 */
export function RegisterPage() {
  const navigate = useNavigate()
  const [agency, setAgency] = useState("Агентство «Невский проспект»")
  const [city, setCity] = useState("Санкт-Петербург")
  const [inn, setInn] = useState("7806154392")
  const [name, setName] = useState("Смирнова Ирина Владимировна")
  const [email, setEmail] = useState("i.smirnova@nevsky.ru")
  const [phone, setPhone] = useState("+7 900 000-57-66")
  const [password, setPassword] = useState("")
  const [offer, setOffer] = useState(false)
  const [consent, setConsent] = useState(false)

  const ready = offer && consent && agency.trim() !== "" && email.trim() !== ""

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
          <AuthField label="НАЗВАНИЕ АГЕНТСТВА" value={agency} onChange={setAgency} name="agency" />
          <AuthField label="ГОРОД" value={city} onChange={setCity} name="city" />
        </div>
        <div className="flex w-194 gap-5">
          <AuthField
            label="ИНН"
            value={inn}
            onChange={setInn}
            name="inn"
            hint="проверим в ЕГРЮЛ автоматически"
          />
          <AuthField label="ФИО РУКОВОДИТЕЛЯ" value={name} onChange={setName} name="name" />
        </div>
        <div className="flex w-194 gap-5">
          <AuthField
            label="РАБОЧИЙ E-MAIL"
            value={email}
            onChange={setEmail}
            name="email"
            type="email"
            autoComplete="email"
            hint="на него придёт подтверждение"
          />
          <AuthField
            label="ТЕЛЕФОН"
            value={phone}
            onChange={setPhone}
            name="phone"
            type="tel"
            autoComplete="tel"
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
            placeholderText="Придумайте пароль"
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
 * «ИНН 7801234567 не нашёлся в ЕГРЮЛ. Проверьте цифры или напишите
 * на hello@serch.ru». Второй адрес в тексте — не вежливость, а выход
 * из тупика: если ИНН верный, а ЕГРЮЛ молчит, человеку больше некуда идти.
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
          <AuthField label="НАЗВАНИЕ АГЕНТСТВА" value="Агентство «Невский проспект»" />
          <AuthField label="ГОРОД" value="Санкт-Петербург" />
        </div>
        <div className="flex w-194 gap-5">
          <AuthField
            label="ИНН"
            value="7801234567"
            error="ИНН 7801234567 не нашёлся в ЕГРЮЛ. Проверьте цифры или напишите на hello@serch.ru."
          />
          <AuthField label="ФИО РУКОВОДИТЕЛЯ" value="Смирнова Ирина Владимировна" />
        </div>
        <div className="flex w-194 gap-5">
          <AuthField
            label="РАБОЧИЙ E-MAIL"
            value="i.smirnova@nevsky.ru"
            error="На эту почту уже создано агентство. Войдите или восстановите пароль."
          />
          <AuthField label="ТЕЛЕФОН" value="+7 900 000-57-66" />
        </div>
        <div className="w-194">
          <AuthField label="ПАРОЛЬ" value="Придумайте пароль" placeholder hint="не короче десяти знаков" />
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

export function ForgotPage() {
  return (
    <AuthShell
      title="Восстановление пароля"
      subtitle="Укажите рабочую почту. Пришлём ссылку для смены пароля, она действует один час."
    >
      <Fields>
        <div className="w-194">
          <AuthField label="РАБОЧИЙ E-MAIL" value="i.smirnova@nevsky.ru" />
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
