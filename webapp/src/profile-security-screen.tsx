import { Link, useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { useSession, useSessionActions } from "@/features/auth"
import { CabinetPage, CabinetShell } from "@/features/cabinet"
import { cn } from "@/lib/utils"

/**
 * КАБИНЕТ · Профиль — ОДИН РАЗДЕЛ С ДВУМЯ ВКЛАДКАМИ.
 *
 * Было два отдельных экрана: `XqdvJ` «Профиль и настройки» и `v9Z5fD`
 * «Политика входа». Стало — «Профиль» с вкладками «Личные данные» и
 * «Безопасность» (передача 05.08.2026, раздел 4).
 *
 * Почему слияние. Оба экрана отвечали на один вопрос — «что настроено про
 * меня», — но стояли в разных местах меню, и человек, искавший смену пароля,
 * находил её со второго захода. Вкладки собраны формой «Агентства»: высота 36,
 * линия `line-2` снизу, активная 14/600 `fg` с подчёркиванием `fg` 2 px,
 * спящая 14/500 `text-2`. Новой формы не заводится — она уже есть в разделе
 * агентства и работает там же.
 *
 * «Выйти из аккаунта» стоит ОДИН РАЗ, в шапке раздела. Раньше выход
 * дублировался и в шапке, и в меню аватара; два выхода в одном интерфейсе
 * заставляют думать, отличаются ли они.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ВКЛАДКА «БЕЗОПАСНОСТЬ» — бывший `v9Z5fD`.
 *
 * **Экран не настраивает безопасность, а показывает её.** Ни одного
 * переключателя: длина пароля, число попыток, срок кода и срок ссылки —
 * решения продукта, одинаковые для всех агентств. Человеку нужно знать
 * правила, а не менять их, и притворяться, что он ими управляет, нечестно.
 *
 * Настоящих действий здесь три, и все три необратимы: сменить пароль,
 * завершить чужой сеанс, завершить все чужие сеансы. Поэтому они стоят
 * отдельно от строк-фактов, а не рядом с ними.
 *
 * **Свой сеанс завершить нельзя, и место кнопки всё равно занято.** В файле
 * это пустой блок 104 × 32 (`xe1CM`): строки обязаны стоять колонкой, а
 * кнопка «Завершить» на своём же устройстве означала бы «выйти», для чего
 * есть отдельное действие в заголовке.
 */

/** Строка-факт: что и какое значение. Высота 48, волосяная линия снизу. */
function FactRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex h-12 w-full items-center gap-3 border-b border-line-1">
      <Typography variant="uiText" tone="secondary">
        {title}
      </Typography>
      <span className="h-px flex-1" />
      <Typography variant="strongText" tone="default">
        {value}
      </Typography>
    </div>
  )
}

/** Раздел колонки: подпись капслоком и строки под ней. */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-4">
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <div className="flex w-full flex-col">{children}</div>
    </section>
  )
}

type Session = {
  device: string
  place: string
  when: string
  /** Текущее устройство: помечено зелёным и не закрывается. */
  current?: boolean
}

const SESSIONS: Session[] = [
  {
    device: "Chrome, Windows",
    place: "Санкт-Петербург · 92.53.114.20",
    when: "сейчас",
    current: true,
  },
  { device: "Safari, iPhone", place: "Санкт-Петербург · 92.53.114.20", when: "24.07, 09:12" },
  { device: "Chrome, Windows", place: "Санкт-Петербург · 178.140.9.71", when: "22.07, 18:40" },
]

/** Сеанс: устройство, место, когда и кнопка закрытия — либо её пустое место. */
function SessionRow({ session }: { session: Session }) {
  return (
    <div className="flex h-16 w-full items-center gap-3 border-b border-line-1">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Typography variant="strongText" tone="default">
            {session.device}
          </Typography>
          {session.current ? (
            <span className="flex h-5 items-center rounded-sm bg-ok-tint px-2">
              <Typography variant="signalLabel" tone="ok">
                это устройство
              </Typography>
            </span>
          ) : null}
        </div>
        <Typography variant="metaText" tone="dense">
          {session.place}
        </Typography>
      </div>
      <Typography variant="denseText" tone="dense">
        {session.when}
      </Typography>
      {session.current ? (
        <span aria-hidden className="h-8 w-26 shrink-0" />
      ) : (
        <Button
          variant="secondary"
          size="sm"
          data-action={`завершить сеанс: ${session.device}`}
        >
          Завершить
        </Button>
      )}
    </div>
  )
}

/**
 * Оболочка раздела: заголовок, кто вошёл, выход и полоса вкладок.
 *
 * Отдельным компонентом, а не копией на каждой вкладке: заголовок и выход
 * обязаны стоять на обеих одинаково, а копия расходится на первой же правке.
 */
function ProfileShell({ tab, children }: { tab: "personal" | "security"; children: ReactNode }) {
  const navigate = useNavigate()
  const session = useSession()
  const actions = useSessionActions()

  /**
   * Выход настоящий: сеанс стирается, и кабинет закрывается.
   *
   * Ведёт на вход, а не на главную сайта: человек, который только что вышел,
   * чаще всего собирается войти под другим — иначе он просто закрыл бы вкладку.
   */
  const leave = () => {
    actions.signOut()
    void navigate({ to: "/login", search: { returnTo: undefined } })
  }

  const tabClass = (active: boolean) =>
    cn(
      "flex h-9 items-center border-b-2 px-1",
      "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
      active ? "border-fg" : "border-transparent",
    )

  return (
    <CabinetShell activeId="">
      <CabinetPage>
        <div className="flex h-7 w-full shrink-0 items-center gap-3">
          <Typography variant="panelTitle" tone="default" as="h1">
            Профиль
          </Typography>
          <Typography variant="denseText" tone="dense">
            {`${session?.name ?? "Смирнова Ирина"} · руководитель агентства «${session?.agency ?? "Невский проспект"}»`}
          </Typography>
          <span className="h-px flex-1" />
          <Button variant="quiet" size="sm" onClick={leave}>
            Выйти из аккаунта
          </Button>
        </div>

        <nav
          data-slot="profile-tabs"
          aria-label="Разделы профиля"
          className="flex w-full shrink-0 items-center gap-6 border-b border-line-2"
        >
          <Link
            to="/profile"
            aria-current={tab === "personal" ? "page" : undefined}
            className={tabClass(tab === "personal")}
          >
            <Typography
              variant={tab === "personal" ? "strongText" : "uiText"}
              tone={tab === "personal" ? "default" : "secondary"}
            >
              Личные данные
            </Typography>
          </Link>
          <Link
            to="/profile/login-policy"
            aria-current={tab === "security" ? "page" : undefined}
            className={tabClass(tab === "security")}
          >
            <Typography
              variant={tab === "security" ? "strongText" : "uiText"}
              tone={tab === "security" ? "default" : "secondary"}
            >
              Безопасность
            </Typography>
          </Link>
        </nav>

        {children}
      </CabinetPage>
    </CabinetShell>
  )
}

/**
 * Ступени времени простоя. Умолчание — 2 часа: ровно то время, которое
 * называет диалог «Сеанс истёк». Настройка ЛИЧНАЯ, а не агентства: агент
 * в поле и руководитель за столом работают по-разному, и одно число на всех
 * означало бы, что кому-то из них неудобно каждый день.
 */
const IDLE_STEPS = [
  { minutes: 30, label: "30 минут" },
  { minutes: 60, label: "1 час" },
  { minutes: 120, label: "2 часа" },
  { minutes: 480, label: "8 часов" },
] as const

export function LoginPolicyPage() {
  const session = useSession()
  const actions = useSessionActions()
  const idle = session?.idleMinutes ?? 120

  return (
    <ProfileShell tab="security">
        <div className="flex w-full items-start gap-6">
          <div className="flex w-141 shrink-0 flex-col gap-6">
            <Block label="Пароль">
              <FactRow title="Последняя смена" value="14.06.2026" />
              <FactRow title="Длина пароля" value="не короче 10 знаков" />
              <FactRow title="Попыток входа подряд" value="5, потом пауза 15 минут" />
            </Block>

            <div className="flex">
              {/* Экран смены пароля нарисован только на телефоне (`q2rO9f`).
                  Вести десктоп на мобильный адрес значило бы показать чужую
                  раскладку, поэтому действие названо и ничего не рисует. */}
              <Button variant="quiet" size="md" data-action="сменить пароль">
                Сменить пароль
              </Button>
            </div>

            <Block label="Подтверждение входа">
              <FactRow title="Код на почту" value="4 цифры, живёт 10 минут" />
              <FactRow title="Повторная отправка" value="через 60 секунд" />
              <FactRow title="Ссылка восстановления пароля" value="1 час" />
            </Block>

            {/* Единственная НАСТОЯЩАЯ настройка экрана. Остальные строки —
                факты: длина пароля и число попыток одинаковы для всех
                агентств, и притворяться, что человек ими управляет, нечестно.
                Время простоя своё у каждого, поэтому оно и настраивается. */}
            <section className="flex w-full flex-col gap-4">
              <Typography variant="columnHeader" tone="dense">
                Время простоя
              </Typography>
              <div className="flex h-12 w-full items-center gap-3 border-b border-line-1">
                <Typography variant="uiText" tone="secondary">
                  Выходить после простоя
                </Typography>
                <span className="h-px flex-1" />
                <div role="radiogroup" aria-label="Время простоя" className="flex items-center gap-2">
                  {IDLE_STEPS.map((step) => (
                    <SelectChip
                      key={step.minutes}
                      label={step.label}
                      selected={step.minutes === idle}
                      onClick={() => actions.setIdleMinutes(step.minutes)}
                    />
                  ))}
                </div>
              </div>
              <Typography variant="metaText" tone="dense">
                Через это время кабинет попросит войти заново. Настройка личная,
                не агентства.
              </Typography>
            </section>
          </div>

          <div className="flex w-141 shrink-0 flex-col gap-4">
            <Typography variant="columnHeader" tone="dense">
              Активные сеансы
            </Typography>
            <div className="flex w-full flex-col">
              {SESSIONS.map((session) => (
                <SessionRow key={`${session.device} ${session.place} ${session.when}`} session={session} />
              ))}
            </div>
            {/*
              Пояснение стоит между списком и кнопкой, а не под кнопкой:
              «раскрытые контакты и история касаний остаются агентству» —
              это ответ на страх, из-за которого человек не жмёт «Завершить».
              Ответ обязан стоять до кнопки, иначе он опоздал.
            */}
            <Typography variant="metaText" tone="dense">
              Завершение сеанса выкидывает устройство сразу. Раскрытые контакты и история
              касаний остаются агентству: они не привязаны к устройству.
            </Typography>
            <div className="flex">
              <Button
                variant="secondary"
                size="md"
                data-action="завершить все сеансы, кроме текущего"
              >
                Завершить все сеансы, кроме этого
              </Button>
            </div>
          </div>
        </div>
    </ProfileShell>
  )
}

/**
 * КАБИНЕТ · Профиль → Личные данные.
 *
 * Вкладка, которой в коде не существовало вовсе: экран `XqdvJ` был нарисован,
 * но не собран, и аватар вёл мимо него сразу в «Политику входа».
 *
 * **Что здесь настоящее, а что нет.** Имя, почта и агентство приходят из
 * сеанса — того самого, который человек завёл при регистрации. Роль и дата
 * входа в агентство приходят оттуда же. Телефон и уведомления пока не
 * хранятся: за ними нужен сервер, и вместо пустого обещания стоит честная
 * подпись.
 *
 * **Почта не меняется здесь.** Почта — это вход в кабинет, и её подмена
 * означала бы смену человека. Так же устроена карточка сотрудника в разделе
 * агентства: там почта заблокирована по той же причине, и правило обязано
 * быть одним.
 */
export function ProfilePage() {
  const session = useSession()

  return (
    <ProfileShell tab="personal">
      <div className="flex w-full items-start gap-6">
        <div className="flex w-141 shrink-0 flex-col gap-6">
          <Block label="Кто вы">
            <FactRow title="Имя" value={session?.name ?? "Смирнова Ирина"} />
            <FactRow title="Почта" value={session?.email ?? "i.smirnova@nevsky.ru"} />
            <FactRow
              title="Роль"
              value={session?.role === "agent" ? "Агент" : "Руководитель агентства"}
            />
          </Block>

          <div className="flex">
            {/* Форма правки имени в макете не нарисована, и придумывать её
                нельзя. Действие названо и молчит — это честнее плашки
                «сохранено», за которой ничего не сохраняется. */}
            <Button variant="quiet" size="md" data-action="правка личных данных">
              Изменить имя
            </Button>
          </div>

          <Block label="Агентство">
            <FactRow title="Название" value={session?.agency ?? "Невский проспект"} />
            <FactRow
              title="Дневной лимит раскрытий"
              value={session?.role === "agent" ? "25" : "без лимита"}
            />
            <FactRow
              title="Осталось пробных раскрытий"
              value={session ? String(session.trial) : "0"}
            />
          </Block>
        </div>

        <div className="flex w-141 shrink-0 flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            Уведомления
          </Typography>
          <div className="flex w-full flex-col">
            <FactRow title="Новое по сохранённым поискам" value="письмом, раз в час" />
            <FactRow title="Перезвон, назначенный на сегодня" value="письмом, утром" />
            <FactRow title="Баланс кончается" value="письмом, при остатке ниже 1 000 ₽" />
          </div>
          <Typography variant="metaText" tone="dense">
            Настройка уведомлений появится вместе с почтовой рассылкой. Пока
            перечислено то, что продукт обещает присылать, — чтобы было видно,
            о чём речь.
          </Typography>
        </div>
      </div>
    </ProfileShell>
  )
}
