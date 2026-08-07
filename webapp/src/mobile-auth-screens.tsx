import { Link, useNavigate } from "@tanstack/react-router"
import { useId, useState } from "react"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { hasAccounts, signIn, signUp } from "@/features/auth"
import { MobileAuthLogo, PhoneFrame } from "@/features/cabinet"
import { cn } from "@/lib/utils"

/**
 * МОБАЙЛ · Вход и регистрация. Пять экранов, на которых человек ещё не внутри
 * продукта: `XNGWj`, `Qra5j`, `R3opy`, `eUR7B`, `Br6g9`.
 *
 * Все пять построены одной раскладкой: логотип 56 · тело с полями [32, 16]
 * и зазором 32 · распорка · правовая строка внизу. Нижней навигации нет —
 * переходить ещё некуда, — и логотип остаётся единственным, что говорит,
 * куда человек пришёл.
 *
 * **Распорка обязательна.** Правовая строка прижата к низу экрана, а не идёт
 * следом за кнопкой. Так человек читает её как условие входа, а не как
 * подпись к последнему полю: содержание там про обработку персональных
 * данных и про стоп-лист, и оно относится ко всему экрану сразу.
 */

/**
 * Подсказка в пустом поле почты.
 *
 * В файле здесь стоял конкретный адрес сотрудника выдуманного агентства, и
 * в коде он превратился в предзаполненное значение: человек открывал вход и
 * видел чужую почту как свою. Образец из макета — не данные; подсказка
 * называет РОД адреса, а не адрес.
 */
const EMAIL_HINT = "почта, на которую заводили агентство"

/** Какое поле подсвечено ошибкой и что в ней написано. */
type FieldError = { field: "email" | "password"; text: string }

/**
 * Каркас экрана входа: кадр телефона на десктопном стенде, логотип, тело.
 *
 * Собран здесь, а не взят из `MobileAuthScreen`: у общего каркаса тело идёт
 * с полями 16 и зазором 20, а все пять кадров входа нарисованы с полями
 * [32, 16] и зазором 32. Расхождение названо в отчёте.
 */
function MobileAuthFrame({ children }: { children: ReactNode }) {
  return (
    // Кадр телефона на десктопном экране: 390 × 844 по центру, чтобы стенд
    // можно было смотреть в обычном браузере рядом с макетом.
    <PhoneFrame slot="mobile-auth-screen">
      <MobileAuthLogo />
      <div className="flex min-h-0 w-full flex-1 flex-col gap-8 overflow-y-auto px-4 py-8">
        <>{children}</>
      </div>
    </PhoneFrame>
  )
}

/**
 * Заголовок экрана: обещание 28 и одна строка объяснения 14.
 *
 * Объяснение не украшение: на каждом из пяти экранов оно снимает ровно один
 * страх — «какой адрес вводить», «сколько это займёт», «на сколько живёт
 * ссылка», «что будет с открытыми сеансами».
 */
function AuthHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <Typography variant="cardPrice" tone="default" as="h1">
        {title}
      </Typography>
      <Typography variant="uiText" tone="secondary">
        {text}
      </Typography>
    </div>
  )
}

/**
 * Поле входа: 48 / радиус 12 / поля 16 / значение 16.
 *
 * Это **не** системный `TextField`: тот собран по доске состояний в 40 с
 * радиусом 10, полями 12 и значением 14. Экраны входа набраны на ступень
 * крупнее — человек вводит почту и пароль с телефона в руке, часто на ходу,
 * и попадание пальцем здесь важнее плотности. Расхождение названо в отчёте.
 *
 * Граница нарисована обводкой, а не рамкой: в файле она идёт внутрь и поля
 * остаются ровно 16 от края. Рамка в CSS съела бы этот пиксель, и при ошибке,
 * где толщина растёт с 1 до 2, значение дёрнулось бы вбок.
 */
type AuthFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "className" | "style"
> & {
  /** Метка над полем, капслоком — единственная роль ступени 11. */
  label: string
  /** Подсказка под полем: что проверят, каким должен быть пароль. */
  hint?: string
  /** Ошибка под полем. Заменяет обычную границу на двойную красную. */
  error?: string
  /** Ссылка сразу под полем — так в файле стоит «Восстановить пароль». */
  link?: ReactNode
}

function AuthField({
  label,
  hint,
  error,
  link,
  id,
  ...inputProps
}: AuthFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const messageId = `${fieldId}-message`
  const invalid = Boolean(error)

  return (
    <div data-slot="mobile-auth-field" className="flex w-full flex-col gap-2">
      <Typography as="label" variant="columnHeader" tone="dense" htmlFor={fieldId}>
        {label}
      </Typography>

      <Typography asChild variant="controlLabelLg">
        <input
          id={fieldId}
          aria-invalid={invalid || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            "h-ctl-lg w-full rounded-xl bg-surface px-4 text-fg",
            "placeholder:text-text-dense",
            "outline-solid outline-1 -outline-offset-1 outline-border-control",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg",
            invalid && "outline-2 -outline-offset-2 outline-err-text",
          )}
          {...inputProps}
        />
      </Typography>

      {link === undefined ? null : <>{link}</>}

      {error ? (
        <Typography
          id={messageId}
          variant="fieldError"
          tone="destructive"
          role="alert"
        >
          {error}
        </Typography>
      ) : hint ? (
        <Typography id={messageId} variant="metaText" tone="dense">
          {hint}
        </Typography>
      ) : null}
    </div>
  )
}

/**
 * Ссылка внутри формы: 13 весом 600 графитом, без подчёркивания.
 *
 * В файле у неё нет ни рамки, ни подложки — только вес отличает её от
 * подсказки рядом. Высота выходит 20 против пола касания 44 на телефоне;
 * расхождение оставлено как в файле и названо в отчёте.
 */
function AuthLink({ to, children }: { to?: string; children: ReactNode }) {
  const className =
    "w-fit cursor-pointer bg-transparent text-left outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"

  // С адресом — настоящая ссылка: её открывают в новой вкладке и возвращаются
  // назад кнопкой браузера. Без адреса остаётся подписью: экрана для действия
  // в макете нет, и выдумывать его нельзя.
  if (to) {
    return (
      <Link to={to} data-slot="mobile-auth-link" className={className}>
        <Typography variant="tabActive" tone="default">
          {children}
        </Typography>
      </Link>
    )
  }

  return (
    <span data-slot="mobile-auth-note">
      <Typography variant="tabActive" tone="default">
        {children}
      </Typography>
    </span>
  )
}

/** Распорка, прижимающая правовую строку к низу экрана. */
function AuthSpacer() {
  return <div aria-hidden className="w-full flex-1" />
}

/** Правовая строка: 12 приглушённым, во всю ширину, с переносом. */
function AuthLegal({ children }: { children: ReactNode }) {
  return (
    <Typography variant="metaText" tone="dense">
      {children}
    </Typography>
  )
}

/**
 * Форма входа: почта, пароль, кнопка.
 *
 * Одна на два адреса — `/m/login` и `/m/login/error`. В файле это два кадра,
 * но состояние продукта у них одно: вторая дверь открывается сразу с ошибкой,
 * чтобы её было с чем сверять. Держать вторую копию формы значило бы держать
 * два входа, расходящихся с первой же правки.
 *
 * **Пароль не проверяется, а почта проверяется по-настоящему.** Сервера
 * за кабинетом нет, и проверять пароль в браузере значило бы выдумывать
 * безопасность, которой нет. Зато агентство ищется по почте среди заведённых
 * на этом телефоне — не нашлось, вход честно говорит об этом и показывает
 * дорогу к регистрации, вместо того чтобы пустить в чужой кабинет.
 *
 * Поля пустые. Раньше в них стояли почта и пароль из макета: человек видел
 * чужой адрес как свой, а нажатие «Войти» пускало кого угодно куда угодно.
 */
function MobileLoginForm({ initialError }: { initialError?: FieldError }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<FieldError | null>(initialError ?? null)

  const enter = () => {
    void signIn(email, password).then((failed) => {
      if (failed === null) {
        void navigate({ to: "/m/saved-searches" })
        return
      }
      showRefusal(failed)
    })
  }

  /** Отказ во входе: что делать, а не пересказ ошибки сервера. */
  const showRefusal = (reason: string) => {
    if (reason.toLowerCase().includes("credential") || reason.toLowerCase().includes("password")) {
      setError({ field: "password", text: "Пароль не подошёл. Проверьте раскладку." })
      return
    }

    // Формулировка отвечает на вопрос «что мне теперь делать», а не сообщает
    // об отказе: человек на этом экране не отлаживает продукт, он хочет войти.
    setError({
      field: "email",
      text: hasAccounts()
        ? "Агентства с такой почтой нет. Проверьте адрес или создайте агентство."
        : "На этом телефоне ещё не заводили агентство. Создайте — это займёт минуту.",
    })
  }

  return (
    <>
      <AuthHeading
        title="Вход в кабинет"
        text="Рабочая почта агентства и пароль, который вы придумали при регистрации."
      />

      <div className="flex w-full flex-col gap-4">
        <AuthField
          label="ПОЧТА"
          type="email"
          autoComplete="email"
          placeholder={EMAIL_HINT}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
          error={error?.field === "email" ? error.text : undefined}
        />
        {/* Порядок узлов взят из файла: ссылка стоит между полем и ошибкой,
            а не после неё. */}
        <AuthField
          label="ПАРОЛЬ"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            setError(null)
          }}
          link={<AuthLink to="/m/forgot">Восстановить пароль</AuthLink>}
          error={error?.field === "password" ? error.text : undefined}
        />
      </div>

      <Button variant="primary" size="lg" block onClick={enter}>
        Войти
      </Button>

      {/* Дорога к регистрации появляется ровно там, где человек в неё упёрся.
          В файле её на этом кадре нет, но там ошибка и не звала создавать
          агентство: сказать «создайте» и не дать перехода — тупик. */}
      {error?.field === "email" ? (
        <div className="flex w-full items-center gap-1.5">
          <Typography variant="denseText" tone="secondary">
            Ещё нет агентства?
          </Typography>
          <AuthLink to="/m/register">Создать</AuthLink>
        </div>
      ) : null}

      <AuthSpacer />

      <AuthLegal>
        Оператор персональных данных. Стоп-лист исполняется у всех сотрудников
        сразу.
      </AuthLegal>
    </>
  )
}

/**
 * МОБАЙЛ · Вход (`XNGWj`).
 *
 * Вход в кабинет агентства, а не регистрация. Подзаголовок отвечает на
 * единственный вопрос человека — какой из своих адресов вводить.
 *
 * «Восстановить пароль» стоит под полем пароля, а не в подвале: искать
 * его начинают ровно в тот момент, когда пароль не вспомнился.
 */
export function MobileLoginPage() {
  return (
    <MobileAuthFrame>
      <MobileLoginForm />
    </MobileAuthFrame>
  )
}

/**
 * МОБАЙЛ · Вход, ошибка (`Qra5j`).
 *
 * Тот же вход, открытый сразу в состоянии ошибки: в файле он нарисован
 * отдельным кадром, и по этому адресу его сверяют с макетом.
 *
 * **Ошибка считает попытки вслух.** «Осталось три попытки, потом вход
 * закроется на пятнадцать минут» — это не вежливость, а предупреждение:
 * человек должен успеть остановиться и пойти восстанавливать пароль,
 * а не выяснить про блокировку после неё.
 *
 * Красная граница достаётся только полю пароля: почта в файле остаётся
 * обычной, хотя текст ошибки говорит «почта или пароль». Так система
 * не выдаёт, какое из двух значений неверно.
 */
export function MobileLoginErrorPage() {
  return (
    <MobileAuthFrame>
      <MobileLoginForm
        initialError={{
          field: "password",
          text: "Почта или пароль не подошли. Осталось три попытки, потом вход закроется на пятнадцать минут.",
        }}
      />
    </MobileAuthFrame>
  )
}

/**
 * МОБАЙЛ · Регистрация агентства (`R3opy`).
 *
 * Заводит не человека, а агентство: имя, ИНН, рабочая почта, пароль.
 * Четыре поля — это весь порог входа, и подзаголовок обещает ровно это:
 * «Пять минут, и вы увидите выдачу по своему району. Без звонка менеджера».
 *
 * **ИНН несёт подсказку про ЕГРЮЛ.** Она снимает страх «сейчас попросят
 * прислать документы»: проверка идёт сама, и от человека не нужно ничего,
 * кроме десяти цифр.
 *
 * Правовая строка длиннее, чем на входе: здесь принимают оферту и дают
 * согласие на обработку данных, и номер уведомления РКН стоит рядом,
 * а не спрятан за ссылкой.
 */
export function MobileRegisterPage() {
  const navigate = useNavigate()
  const [agency, setAgency] = useState("")
  const [inn, setInn] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  /**
   * Кнопка ждёт название, почту и пароль.
   *
   * Без этого агентство завелось бы под подставленным именем и почтой,
   * а войти по своей человек потом уже не смог бы: вход ищет агентство
   * ровно по тому адресу, под которым его создали.
   */
  const ready = agency.trim() !== "" && email.trim() !== "" && password !== ""

  /**
   * Создание агентства ведёт на первый вход, а не в рабочий кабинет:
   * у нового агентства пустые списки и пять пробных раскрытий, и показывать
   * ему чужую заполненную выдачу — врать в первую же минуту.
   *
   * Имя человека здесь не спрашивают — в кадре четыре поля, и все про
   * агентство. Руководитель назовёт себя в кабинете, а до тех пор в шапке
   * стоит должность, а не выдуманное имя.
   */
  const create = () => {
    if (!ready) return
    void signUp({ name: "", email, agency, password })
    void navigate({ to: "/m/first-run/agency" })
  }

  return (
    <MobileAuthFrame>
      <AuthHeading
        title="Создайте агентство"
        text="Пять минут, и вы увидите выдачу по своему району. Без звонка менеджера."
      />

      {/* Все поля пустые. Раньше три из четырёх были заполнены названием,
          ИНН и почтой агентства из макета — человек нажимал «Создать» и
          заводил не своё агентство, а чужое. */}
      <div className="flex w-full flex-col gap-4">
        <AuthField
          label="НАЗВАНИЕ АГЕНТСТВА"
          type="text"
          autoComplete="organization"
          value={agency}
          onChange={(event) => setAgency(event.target.value)}
        />
        <AuthField
          label="ИНН"
          type="text"
          inputMode="numeric"
          value={inn}
          onChange={(event) => setInn(event.target.value)}
          hint="проверим в ЕГРЮЛ автоматически"
        />
        <AuthField
          label="РАБОЧАЯ ПОЧТА"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <AuthField
          label="ПАРОЛЬ"
          type="password"
          autoComplete="new-password"
          placeholder="Придумайте пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <Button variant="primary" size="lg" block onClick={create} disabled={!ready}>
        Создать агентство
      </Button>

      <AuthSpacer />

      <AuthLegal>
        Нажимая кнопку, вы принимаете оферту и даёте согласие на обработку
        персональных данных. Оператор персональных данных, уведомление в РКН
        № 78-19-004182.
      </AuthLegal>
    </MobileAuthFrame>
  )
}

/**
 * МОБАЙЛ · Восстановление пароля (`eUR7B`).
 *
 * Одно поле и одна кнопка. Подзаголовок называет срок жизни ссылки — час, —
 * чтобы человек не открывал письмо назавтра и не решил, что продукт сломан.
 *
 * Внизу вместо правовой строки стоит «Вспомнили пароль? Войти» — обратная
 * дорога для тех, кто нажал «Восстановить» по ошибке.
 */
export function MobileForgotPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")

  /**
   * Ссылка ушла — человек попадает на экран «проверьте почту».
   *
   * Пустой адрес кнопку не пускает: экран дальше говорит «мы отправили письмо
   * на почту, которую вы указали», и открывать его, когда не указали ничего,
   * значит соврать в одном предложении дважды.
   */
  const send = () => {
    if (email.trim() === "") return
    void navigate({ to: "/m/check-mail" })
  }

  return (
    <MobileAuthFrame>
      <AuthHeading
        title="Восстановление пароля"
        text="Пришлём ссылку на рабочую почту. Она действует один час."
      />

      <div className="flex w-full flex-col gap-4">
        <AuthField
          label="ПОЧТА"
          type="email"
          autoComplete="email"
          placeholder={EMAIL_HINT}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        block
        onClick={send}
        disabled={email.trim() === ""}
      >
        Прислать ссылку
      </Button>

      <AuthSpacer />

      {/* В файле это один текстовый узел целиком: «Войти» не отличается
          ни цветом, ни весом и не нажимается. Воспроизведено как есть,
          расхождение названо в отчёте. */}
      <AuthLegal>Вспомнили пароль? Войти</AuthLegal>
    </MobileAuthFrame>
  )
}

/**
 * МОБАЙЛ · Новый пароль (`Br6g9`).
 *
 * Экран по ссылке из письма. Подзаголовок предупреждает о последствии,
 * которое иначе стало бы сюрпризом: смена пароля завершает все активные
 * сеансы сотрудника, включая мобильные. Агент, меняющий пароль в поле,
 * должен знать, что его телефон сейчас выкинет из кабинета.
 *
 * У обоих полей подсказки стоят на месте ошибок: правила пароля видны
 * заранее, а не после неудачной попытки.
 *
 * «Что-то пошло не так? Написать в поддержку» — единственный выход
 * с этого экрана: ссылка одноразовая, и назад ходить некуда.
 */
export function MobileNewPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [repeat, setRepeat] = useState("")

  /** Ровно то, что обещают подсказки под полями: десять знаков и совпадение. */
  const ready = password.length >= 10 && password === repeat

  /**
   * После смены пароля человек попадает на вход, а не сразу в кабинет.
   *
   * Раньше отсюда вызывался вход без единого аргумента, и это работать
   * перестало: вход ищет агентство ПО ПОЧТЕ, а экрана нового пароля почта
   * не знает — сюда приходят по ссылке из письма. Открыть кабинет было
   * нечем, и охрана всё равно возвращала человека на вход, просто через
   * мигание пустым экраном.
   */
  const save = () => {
    if (!ready) return
    void navigate({ to: "/m/login" })
  }

  return (
    <MobileAuthFrame>
      <AuthHeading
        title="Новый пароль"
        text="Ссылка одноразовая. После смены пароля все активные сеансы этого сотрудника завершатся, включая мобильные."
      />

      <div className="flex w-full flex-col gap-4">
        {/* Поля пустые: точки, нарисованные в файле, показывали «пароль уже
            введён» — но вводит его здесь человек, и предзаполнять поле
            десятью точками значит подсовывать ему чужой набор знаков. */}
        <AuthField
          label="НОВЫЙ ПАРОЛЬ"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="не короче десяти знаков"
        />
        <AuthField
          label="ПОВТОРИТЕ ПАРОЛЬ"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(event) => setRepeat(event.target.value)}
          hint="должен совпадать с новым"
        />
      </div>

      <Button variant="primary" size="lg" block onClick={save} disabled={!ready}>
        Сохранить и войти
      </Button>

      {/* Зазор 6 — половина ступени. Так в файле: вопрос и ссылка читаются
          одной фразой, а не двумя соседями. */}
      <div className="flex w-full items-center gap-1.5">
        <Typography variant="denseText" tone="secondary">
          Что-то пошло не так?
        </Typography>
        <AuthLink>Написать в поддержку</AuthLink>
      </div>

      <AuthSpacer />

      <AuthLegal>
        Оператор персональных данных. Стоп-лист исполняется у всех сотрудников
        сразу.
      </AuthLegal>
    </MobileAuthFrame>
  )
}
