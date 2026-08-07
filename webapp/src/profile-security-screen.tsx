import { Link, useNavigate } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { TextField } from "@/components/controls/TextField"
import { Typography } from "@/components/typography"
import { AgencyEmpty } from "@/features/agency"
import { setName, useSession, useSessionActions } from "@/features/auth"
import { CabinetPage, CabinetShell } from "@/features/cabinet"
import { useWorkspace, type Person } from "@/features/workspace"
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
 * Настоящее действие здесь одно — сменить пароль, — и оно необратимо.
 * Поэтому стоит отдельно от строк-фактов, а не рядом с ними.
 *
 * **СПИСКА УСТРОЙСТВ БОЛЬШЕ НЕТ.** Здесь стояли три сеанса из макета:
 * «Chrome, Windows», «Санкт-Петербург · 92.53.114.20», «24.07, 09:12».
 * Это образцы текста, которыми дизайнер заполнял кадр, — а живому человеку
 * они называли чужой город и чужой адрес его собственными. Кто ещё вошёл
 * в агентство, знает сервер; сервера пока нет, и браузер о других входах
 * не знает и знать не может. Вместо выдумки стоит пустое состояние, которое
 * говорит, что здесь появится и откуда.
 *
 * Вместе со списком ушли обе кнопки «Завершить»: завершать нечего. Правило
 * про свой сеанс при этом осталось верным — кнопка «Завершить» на своём же
 * устройстве означала бы «выйти», для чего есть отдельное действие
 * в заголовке; в макете под неё оставлено пустое место 104 × 32 (`xe1CM`).
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

/**
 * Дневной лимит словами.
 *
 * `null` в карточке сотрудника означает «без лимита» — так его читают
 * и остальные экраны агентства. Человека в списке может не оказаться
 * (пространство агентства ещё не открыто), и тогда честнее прочерк, чем
 * «без лимита»: это разные вещи.
 */
function limitLabel(person: Person | undefined): string {
  if (person === undefined) return "—"
  return person.limit === null ? "без лимита" : String(person.limit)
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
        <div className="flex min-h-7 w-full shrink-0 items-center gap-3">
          <Typography variant="panelTitle" tone="default" as="h1">
            Профиль
          </Typography>
          {/* Кто вошёл — только из сеанса. Здесь стояли «Смирнова Ирина»
              и «Невский проспект»: образцы из макета, из-за которых человек
              со своим агентством читал в шапке чужое имя. Роль тоже берётся
              из сеанса, а не проставляется «руководитель» всем подряд.
              Без сеанса кабинет закрыт охраной маршрута, поэтому запасной
              вариант — пустая строка, а не правдоподобное имя. */}
          <Typography variant="denseText" tone="dense">
            {session === null
              ? ""
              : `${session.name} · ${session.role === "agent" ? "агент" : "руководитель"} агентства «${session.agency}»`}
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
              {/* Дату последней смены помнит сервер, которого нет. В макете
                  на её месте стоял образец «14.06.2026» — один и тот же день
                  для каждого, кто откроет экран. Прочерк честнее выдуманной
                  даты, а строка остаётся: с сервером ей будет чем заполниться. */}
              <FactRow title="Последняя смена" value="—" />
              <FactRow title="Длина пароля" value="не короче 10 знаков" />
              <FactRow title="Попыток входа подряд" value="5, потом пауза 15 минут" />
            </Block>

            <div className="flex">
              {/*
                Ведёт на экран нового пароля — тот же, которым заканчивается
                восстановление доступа.

                Раньше здесь стояло «экран смены пароля нарисован только
                на телефоне, поэтому кнопка молчит». Это было неверно:
                десктопный `/new-password` существует и собран, а смена
                пароля изнутри кабинета и восстановление снаружи — это
                один и тот же экран «задайте новый пароль».
              */}
              <Link to="/new-password">
                <Button variant="quiet" size="md" data-action="сменить пароль">
                  Сменить пароль
                </Button>
              </Link>
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
            {/*
              Вместо списка — пустое состояние: чужие входы видит сервер,
              которого пока нет, а браузер о них не знает.

              Фраза про раскрытые контакты пережила список и стоит сноской.
              Раньше она объяснялась так: «ответ на страх, из-за которого
              человек не жмёт „Завершить“, обязан стоять до кнопки, иначе он
              опоздал». Кнопки нет, страх остался — человек читает про
              завершение сеансов и думает, не потеряет ли он вместе с ними
              работу. Ответ обязан стоять там же, где вопрос.
            */}
            <AgencyEmpty
              title="Устройства покажет сервер"
              text="Здесь встанет каждый вход в агентство: устройство, город и время — и «Завершить» рядом с чужим. Пока сервера нет, кабинет живёт в этом браузере и о других входах не знает. Свой сеанс закрывается кнопкой «Выйти из аккаунта» наверху."
              note="Завершение сеанса выкидывает устройство сразу. Раскрытые контакты и история касаний остаются агентству: они не привязаны к устройству."
            />
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
 * **Что здесь настоящее, а что нет.** Имя, почта, агентство, роль и остаток
 * пробных раскрытий приходят из сеанса — того самого, который человек завёл
 * при регистрации. Дневной лимит приходит из его же карточки сотрудника.
 * Ни одного значения из макета здесь не осталось: раньше на месте пустого
 * сеанса стояли «Смирнова Ирина» и «Невский проспект», а лимит агента был
 * написан числом 25, взятым из кадра. Телефон и уведомления пока не
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
  const workspace = useWorkspace()
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState("")

  /**
   * Своя карточка сотрудника — по почте: она же ключ агентства.
   *
   * Нужна ради дневного лимита. Раньше он выводился из роли — «агент → 25»,
   * — и это число ничем не подтверждалось: лимит ставит руководитель,
   * и у каждого сотрудника он свой.
   */
  const me = workspace.people.find(
    (person) => person.email.trim().toLowerCase() === (session?.email ?? "").trim().toLowerCase(),
  )

  return (
    <ProfileShell tab="personal">
      <div className="flex w-full items-start gap-6">
        <div className="flex w-141 shrink-0 flex-col gap-6">
          {/* Имя, почта и агентство — из сеанса. На их местах стояли образцы
              из макета: «Смирнова Ирина» и «i.smirnova@nevsky.ru». Прочерк
              вместо чужого имени: кабинет закрыт охраной, и до прочерка
              дело дойти не должно. */}
          <Block label="Кто вы">
            <FactRow title="Имя" value={session?.name ?? "—"} />
            <FactRow title="Почта" value={session?.email ?? "—"} />
            <FactRow
              title="Роль"
              value={session?.role === "agent" ? "Агент" : "Руководитель агентства"}
            />
          </Block>

          {/*
            Правка имени на месте, а не отдельной формой.

            Формы правки в макете нет, и придумывать её незачем: поле здесь
            уже стоит, и превратить его в редактируемое — меньше нового,
            чем завести окно. Имя записывается в журнал вместе с каждым
            раскрытием, поэтому опечатка в фамилии иначе оставалась бы
            во всех записях навсегда.

            Прошлые записи журнала при этом не переписываются: в них стоит
            имя на момент действия, и так и должно быть.
          */}
          <div className="flex w-full items-center gap-3">
            {editingName ? (
              <>
                <div className="w-80">
                  <TextField
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    aria-label="Имя и фамилия"
                    placeholder="Имя и фамилия"
                  />
                </div>
                <Button
                  variant="quiet"
                  size="md"
                  data-action="правка личных данных"
                  onClick={() => {
                    setName(draftName)
                    setEditingName(false)
                  }}
                >
                  Сохранить
                </Button>
                <Button variant="quiet" size="md" onClick={() => setEditingName(false)}>
                  Отмена
                </Button>
              </>
            ) : (
              <Button
                variant="quiet"
                size="md"
                data-action="правка личных данных"
                onClick={() => {
                  setDraftName(session?.name ?? "")
                  setEditingName(true)
                }}
              >
                Изменить имя
              </Button>
            )}
          </div>

          <Block label="Агентство">
            <FactRow title="Название" value={session?.agency ?? "—"} />
            <FactRow title="Дневной лимит раскрытий" value={limitLabel(me)} />
            <FactRow
              title="Осталось пробных раскрытий"
              value={session === null ? "—" : String(session.trial)}
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
