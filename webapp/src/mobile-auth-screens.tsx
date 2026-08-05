import { Link, useNavigate } from "@tanstack/react-router"
import { useId } from "react"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { signIn, signUp } from "@/features/auth"
import { MobileAuthLogo } from "@/features/cabinet"
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

/** Значение поля показано столько раз, сколько точек нарисовано в файле. */
const MASK_10 = "•".repeat(10)
const MASK_12 = "•".repeat(12)

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
    <div className="flex min-h-svh w-full items-start justify-center bg-line-1 p-10">
      <div
        data-slot="mobile-auth-screen"
        className="flex h-[844px] w-[390px] flex-col overflow-hidden bg-bg outline-solid outline-1 -outline-offset-1 outline-line-2"
      >
        <MobileAuthLogo />
        <div className="flex min-h-0 w-full flex-1 flex-col gap-8 overflow-y-auto px-4 py-8">
          <>{children}</>
        </div>
      </div>
    </div>
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
 * МОБАЙЛ · Вход (`XNGWj`).
 *
 * Вход в кабинет агентства, а не регистрация: сюда приходят по приглашению,
 * и подзаголовок сразу отвечает на единственный вопрос человека — какой
 * из своих адресов вводить.
 *
 * «Восстановить пароль» стоит под полем пароля, а не в подвале: искать
 * его начинают ровно в тот момент, когда пароль не вспомнился.
 */
export function MobileLoginPage() {
  const navigate = useNavigate()

  /**
   * Вход не проверяет пароль: за кабинетом нет сервера, и проверять его
   * в браузере значило бы выдумывать безопасность, которой нет.
   */
  const enter = () => {
    signIn()
    void navigate({ to: "/m/today" })
  }

  return (
    <MobileAuthFrame>
      <AuthHeading
        title="Вход в кабинет"
        text="Тот же адрес, на который пришло приглашение от агентства."
      />

      <div className="flex w-full flex-col gap-4">
        <AuthField
          label="ПОЧТА"
          type="email"
          autoComplete="email"
          defaultValue="i.smirnova@nevsky.ru"
        />
        <AuthField
          label="ПАРОЛЬ"
          type="password"
          autoComplete="current-password"
          defaultValue={MASK_10}
          link={<AuthLink to="/m/forgot">Восстановить пароль</AuthLink>}
        />
      </div>

      <Button variant="primary" size="lg" block onClick={enter}>
        Войти
      </Button>

      <AuthSpacer />

      <AuthLegal>
        Оператор персональных данных. Стоп-лист исполняется у всех сотрудников
        сразу.
      </AuthLegal>
    </MobileAuthFrame>
  )
}

/**
 * МОБАЙЛ · Вход, ошибка (`Qra5j`).
 *
 * Отдельный кадр, а не состояние первого: в файле он нарисован целиком.
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
  const navigate = useNavigate()

  const enter = () => {
    signIn()
    void navigate({ to: "/m/today" })
  }

  return (
    <MobileAuthFrame>
      <AuthHeading
        title="Вход в кабинет"
        text="Тот же адрес, на который пришло приглашение от агентства."
      />

      <div className="flex w-full flex-col gap-4">
        <AuthField
          label="ПОЧТА"
          type="email"
          autoComplete="email"
          defaultValue="i.smirnova@nevsky.ru"
        />
        {/* Порядок узлов взят из файла: ссылка стоит между полем и ошибкой,
            а не после неё. */}
        <AuthField
          label="ПАРОЛЬ"
          type="password"
          autoComplete="current-password"
          defaultValue={MASK_10}
          link={<AuthLink to="/m/forgot">Восстановить пароль</AuthLink>}
          error="Почта или пароль не подошли. Осталось три попытки, потом вход закроется на пятнадцать минут."
        />
      </div>

      <Button variant="primary" size="lg" block onClick={enter}>
        Войти
      </Button>

      <AuthSpacer />

      <AuthLegal>
        Оператор персональных данных. Стоп-лист исполняется у всех сотрудников
        сразу.
      </AuthLegal>
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

  /**
   * Создание агентства ведёт на первый вход, а не в рабочий кабинет:
   * у нового агентства пустые списки и пять пробных раскрытий, и показывать
   * ему чужую заполненную выдачу — врать в первую же минуту.
   */
  const create = () => {
    signUp({ name: "", email: "", agency: "" })
    void navigate({ to: "/m/first-run/agency" })
  }

  return (
    <MobileAuthFrame>
      <AuthHeading
        title="Создайте агентство"
        text="Пять минут, и вы увидите выдачу по своему району. Без звонка менеджера."
      />

      <div className="flex w-full flex-col gap-4">
        <AuthField
          label="НАЗВАНИЕ АГЕНТСТВА"
          type="text"
          autoComplete="organization"
          defaultValue="Агентство «Невский проспект»"
        />
        <AuthField
          label="ИНН"
          type="text"
          inputMode="numeric"
          defaultValue="7806154392"
          hint="проверим в ЕГРЮЛ автоматически"
        />
        <AuthField
          label="РАБОЧАЯ ПОЧТА"
          type="email"
          autoComplete="email"
          defaultValue="i.smirnova@nevsky.ru"
        />
        {/* Единственное пустое поле экрана: пароль придумывают здесь,
            остальное уже известно из приглашения. */}
        <AuthField
          label="ПАРОЛЬ"
          type="password"
          autoComplete="new-password"
          placeholder="Придумайте пароль"
        />
      </div>

      <Button variant="primary" size="lg" block onClick={create}>
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

  /** Ссылка ушла — человек попадает на экран «проверьте почту». */
  const send = () => void navigate({ to: "/m/check-mail" })

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
          defaultValue="i.smirnova@nevsky.ru"
        />
      </div>

      <Button variant="primary" size="lg" block onClick={send}>
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

  /** Новый пароль сохранён — человек сразу внутри, повторный вход не нужен. */
  const save = () => {
    signIn()
    void navigate({ to: "/m/today" })
  }

  return (
    <MobileAuthFrame>
      <AuthHeading
        title="Новый пароль"
        text="Ссылка одноразовая. После смены пароля все активные сеансы этого сотрудника завершатся, включая мобильные."
      />

      <div className="flex w-full flex-col gap-4">
        <AuthField
          label="НОВЫЙ ПАРОЛЬ"
          type="password"
          autoComplete="new-password"
          defaultValue={MASK_12}
          hint="не короче десяти знаков"
        />
        <AuthField
          label="ПОВТОРИТЕ ПАРОЛЬ"
          type="password"
          autoComplete="new-password"
          defaultValue={MASK_12}
          hint="должен совпадать с новым"
        />
      </div>

      <Button variant="primary" size="lg" block onClick={save}>
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
