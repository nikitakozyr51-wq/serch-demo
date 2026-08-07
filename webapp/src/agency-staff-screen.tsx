import { Link, useNavigate } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import { AgencyChip, AgencyEmpty, AgencyShell, DataTable, FormField } from "@/features/agency"
import { OwnerAvatar, groupDigits, plural } from "@/features/listings"
import { formatMoment, paidDisclosures, useWorkspace } from "@/features/workspace"
import { cn } from "@/lib/utils"

/**
 * КАБИНЕТ · Агентство → Сотрудники.
 *
 * Снято с `u7anli`.
 *
 * **В таблице только те, кто действительно работает в агентстве.** Раньше
 * здесь стояли пятеро выдуманных сотрудников с чужими именами, почтами и
 * суммами — образец текста из макета, попавший в продукт как данные. Витрины
 * «Невский проспект» больше нет: агентство состоит из того, кто его завёл, и
 * тех, кого он позвал, а раскрытия и деньги считаются по журналу работы.
 *
 * **Ролей ровно две: руководитель и агент.** «Стажёр» — не роль, а поле
 * «дневной лимит раскрытий» в карточке сотрудника. Это не мелочь: третья роль
 * потянула бы за собой отдельную матрицу прав, а лимит решает ту же задачу
 * одним числом, которое видно прямо в таблице.
 *
 * **Лимит покрашен по смыслу.** «без лимита» идёт приглушённым: это норма.
 * Число — графитом: у человека стоит ограничение, и руководитель должен
 * видеть это, не открывая карточку.
 *
 * **Отключённый сотрудник теряет доступ, но не уносит работу.** Раскрытые им
 * контакты, статусы и история касаний остаются агентству — за них заплачено.
 */

/** Строка таблицы: то, что агентство действительно знает о человеке. */
type Staff = {
  id: string
  initials: string
  name: string
  email: string
  /** Руководитель или агент — третьей роли в продукте нет. */
  owner: boolean
  /** Дневной лимит раскрытий. `null` — без лимита. */
  limit: number | null
  /** Раскрыто контактов — посчитано по журналу, а не вписано. */
  disclosed: number
  /** Потрачено рублей — тоже посчитано. */
  spent: number
  /** Когда человек появился в агентстве. 0 — неизвестно. */
  addedAt: number
  /** Это тот, кто смотрит кабинет сейчас. */
  self: boolean
}

/**
 * Кто в агентстве на самом деле.
 *
 * Люди лежат в журнале работы. Раскрытия и потраченное в карточке человека
 * НЕ хранятся, а считаются по его раскрытиям: вписанное число разъехалось бы
 * с журналом на первом же возврате.
 *
 * Запасной источник — сеанс. Он нужен агентствам, заведённым до появления
 * журнала: людей в нём нет, а человек за экраном есть, и таблица без него
 * соврала бы, что в агентстве ноль сотрудников. Чего сеанс не знает — даты
 * появления, — того и не показывает; лимита у заведшего агентство нет по
 * правилу продукта, а не по умолчанию.
 */
function useStaff(): Staff[] {
  const session = useSession()
  const workspace = useWorkspace()

  const tally = (name: string) => ({
    disclosed: workspace.disclosures.filter((item) => item.by === name).length,
    // «Потрачено» считается тем же правилом, что и везде в кабинете: пробные
    // и возвращённые раскрытия деньгами не были.
    spent: paidDisclosures(workspace)
      .filter((item) => item.by === name)
      .reduce((sum, item) => sum + item.amount, 0),
  })

  if (workspace.people.length > 0) {
    return workspace.people.map((person) => ({
      id: person.id,
      initials: person.initials,
      name: person.name,
      email: person.email,
      owner: person.role === "owner",
      limit: person.limit,
      addedAt: person.addedAt,
      self: person.email === session?.email,
      ...tally(person.name),
    }))
  }

  if (session === null) return []

  return [
    {
      id: "owner",
      initials: session.initials,
      name: session.name,
      email: session.email,
      owner: session.role === "owner",
      limit: null,
      addedAt: 0,
      self: true,
      ...tally(session.name),
    },
  ]
}

export function AgencyStaffPage() {
  const navigate = useNavigate()
  const staff = useStaff()

  return (
    <AgencyShell
      activeTab="staff"
      title="Сотрудники"
      // Число считается по таблице, а не пишется рядом с ней: подпись «пять
      // человек» над одной строкой — это ложь на экране, где руководитель
      // проверяет, кто у него работает. Приглашений нет ни одного, потому что
      // приглашать пока нечем.
      note={`${staff.length} ${plural(staff.length, "человек", "человека", "человек")} · приглашений нет`}
      action={
        // Формы приглашения на большом экране в макете нет — она нарисована
        // только для телефона. Рисовать её здесь по памяти значило бы
        // придумать продукт, поэтому действие названо и молчит.
        <Button variant="primary" size="sm" data-action="приглашение агента в агентство" onClick={() => void navigate({ to: "/agency/invite" })}>
          Пригласить агента
        </Button>
      }
    >
      {staff.length === 0 ? (
        <AgencyEmpty
          title="В агентстве пока никого"
          text="Здесь появятся люди агентства: тот, кто его завёл, и агенты, которых он позвал. Рядом с каждым — дневной лимит раскрытий, сколько контактов он открыл и на какую сумму."
          note="Раскрытия и деньги считаются по журналу работы: вписать их руками нельзя ни руководителю, ни нам."
        />
      ) : (
        <DataTable
          columns={[
            { head: "СОТРУДНИК" },
            { head: "РОЛЬ", width: "w-col-120" },
            { head: "ЛИМИТ В ДЕНЬ", width: "w-col-120", numeric: true },
            { head: "РАСКРЫТО", width: "w-col-96", numeric: true },
            { head: "ПОТРАЧЕНО", width: "w-col-120", numeric: true },
            { head: "ПОСЛЕДНИЙ ВХОД", width: "w-col-144", numeric: true },
            { head: "СТАТУС", width: "w-col-120", numeric: true },
          ]}
          rows={staff.map((person) => ({
            id: person.id,
            cells: [
              // Карточка сотрудника открывается отсюда — так сказано в её
              // описании. Ссылка, а не кнопка: руководитель держит несколько
              // человек открытыми в соседних вкладках, сравнивая лимиты.
              <Link
                key="who"
                to="/agency/staff/person"
                className="flex min-w-0 cursor-pointer items-center gap-2.5 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
              >
                <OwnerAvatar initials={person.initials} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Typography variant="numericDense" tone="default">
                    {person.name}
                  </Typography>
                  {/* Почта — единственный контакт, который кабинет о сотруднике
                      знает. Телефона в записи о человеке нет, и дорисовывать
                      его рядом с настоящей почтой нельзя. */}
                  <Typography variant="metaText" tone="dense">
                    {person.email}
                  </Typography>
                </div>
              </Link>,
              <Typography key="role" variant="denseText" tone="default">
                {person.owner ? "Руководитель" : "Агент"}
              </Typography>,
              <Typography
                key="limit"
                variant="denseText"
                tone={person.limit === null ? "dense" : "default"}
              >
                {person.limit === null ? "без лимита" : String(person.limit)}
              </Typography>,
              <Typography key="disclosed" variant="denseText" tone="default">
                {String(person.disclosed)}
              </Typography>,
              <Typography key="spent" variant="numericDense" tone="default">
                {`${groupDigits(person.spent)} ₽`}
              </Typography>,
              // Входы кабинет не записывает: сервера за ним нет. Про того, кто
              // смотрит экран, известно, что он здесь сейчас; про остальных —
              // прочерк, а не правдоподобное «вчера, 18:20».
              <Typography key="seen" variant="denseText" tone="secondary">
                {person.self ? "сейчас" : "—"}
              </Typography>,
              <AgencyChip key="status" label="Активен" tone="calm" />,
            ],
          }))}
        />
      )}

      <div className="w-150 shrink-0">
        <Typography variant="metaText" tone="dense">
          Ролей две: руководитель и агент. «Стажёр» это не роль, а поле «дневной лимит
          раскрытий» в карточке сотрудника. Отключённый сотрудник теряет доступ,
          но его объекты, статусы и история касаний остаются агентству.
        </Typography>
      </div>
    </AgencyShell>
  )
}

/**
 * АГЕНТСТВО · Карточка сотрудника (`t6b58y`).
 *
 * **Экран без вкладок: он открывается из таблицы сотрудников и возвращает
 * обратно.** Полоса разделов здесь была бы враньём — карточка не пятый раздел
 * агентства, а его подстраница.
 *
 * **Права выражены чипами, а не переключателями.** «5 в сутки · 25 в сутки ·
 * Без лимита», «Агент · Руководитель», «Только свои · Все агентства» —
 * руководитель видит весь набор возможных значений сразу, а не одно текущее.
 * Переключатель показал бы «включено/выключено» и заставил гадать, что будет
 * в другом положении.
 *
 * **Три вещи здесь необратимы, и они собраны внизу, а не разбросаны:**
 * отметка «просил не звонить» не снимается никем, отключение доступа
 * завершает сеансы сразу, а раскрытые контакты остаются агентству.
 *
 * **Почта заблокирована, телефон — нет.** Почта — это вход в кабинет, и её
 * подмена означала бы смену человека. Телефон сотрудник меняет сам — но
 * запись о человеке его пока не хранит, поэтому вместо номера стоит прочерк,
 * а не образец из макета.
 */

/**
 * Строка права: что настраивается, зачем — и чипы выбора справа.
 *
 * **Выбранное значение живёт в строке, а не приходит извне.** Право — это
 * одно значение из перечисленных, и переключение его на месте единственное,
 * что здесь может произойти: сохранять некуда, сервера за экраном нет.
 * Чип, который не двигается от нажатия, — это картинка, а не право.
 */
function RightRow({
  title,
  note,
  options,
  initial,
  action,
  last = false,
}: {
  title: string
  note: string
  /** Все возможные значения права. Руководитель видит набор целиком, а не текущее. */
  options?: string[]
  /** Значение на входе — то, что стоит у сотрудника сейчас. */
  initial?: string
  /** Действие справа вместо чипов: ссылка на журнал, выгрузка, отключение. */
  action?: ReactNode
  last?: boolean
}) {
  const [value, setValue] = useState(initial)

  return (
    <div
      data-slot="right-row"
      className={cn("flex min-h-16 w-full items-center gap-4 py-2", !last && "border-b border-line-2")}
    >
      <div className="flex w-80 shrink-0 flex-col gap-0.5">
        <Typography variant="numericDense" tone="default">
          {title}
        </Typography>
        <Typography variant="metaText" tone="dense">
          {note}
        </Typography>
      </div>
      <div className="h-px flex-1" />
      {options === undefined ? null : (
        <div
          role="radiogroup"
          aria-label={title}
          className="flex shrink-0 items-center gap-2"
        >
          {options.map((option) => (
            <SelectChip
              key={option}
              label={option}
              selected={option === value}
              onClick={() => setValue(option)}
            />
          ))}
        </div>
      )}
      {action === undefined ? null : <>{action}</>}
    </div>
  )
}

export function AgencyPersonPage() {
  const navigate = useNavigate()
  const staff = useStaff()

  /**
   * Кого открыли — из адреса не следует: у `/agency/staff/person` параметра
   * нет. Пока агентство состоит из одного человека, того, кто его завёл,
   * двусмысленности в этом нет. Появятся приглашённые агенты — адресу
   * понадобится параметр, и это правка маршрутов, а не карточки.
   */
  const person = staff.find((item) => item.self) ?? staff[0]

  if (person === undefined) {
    return (
      <AgencyShell
        activeTab="none"
        title="Сотрудник"
        note="карточка открывается из таблицы сотрудников"
      >
        <AgencyEmpty
          title="Карточка не открыта"
          text="Сюда попадают права и лимиты конкретного человека: дневной лимит раскрытий, роль, доступ к подборкам агентства. Открывается строкой в таблице сотрудников."
          action={
            <Button
              variant="quiet"
              size="md"
              onClick={() => void navigate({ to: "/agency/staff" })}
            >
              К списку сотрудников
            </Button>
          }
        />
      </AgencyShell>
    )
  }

  // Дата появления в агентстве известна только из журнала работы. Сеанс её
  // не знает — тогда фраза идёт без даты, а не с выдуманной.
  const since = person.addedAt === 0 ? "" : formatMoment(person.addedAt)
  const role = person.owner ? "руководитель" : "агент"

  return (
    <AgencyShell
      activeTab="none"
      title={person.name}
      note={since === "" ? role : `${role} · в агентстве с ${since}`}
      action={
        // Отключение необратимо и требует подтверждения, которого в макете нет.
        // Отключать человека без вопроса опаснее, чем не отключить вовсе.
        <Button variant="quiet" size="sm" data-action="доступ сотрудника отключён">
          Отключить доступ
        </Button>
      }
    >
      <div className="flex w-full items-start gap-6">
        <div className="flex w-117 shrink-0 flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            Данные сотрудника
          </Typography>

          <FormField label="ИМЯ И ФАМИЛИЯ" value={person.name} />
          <FormField
            label="ТЕЛЕФОН"
            value="—"
            hint="телефон сотрудника кабинет пока не хранит"
          />
          <FormField
            label="РАБОЧИЙ E-MAIL"
            value={person.email}
            hint="почту меняет только руководитель"
            locked
          />

          <div className="flex">
            {/*
              Выдача сотрудника — это обычная выдача, и она нарисована.
              Ведём переходом маршрутизатора, а не ссылкой: кнопка проекта
              закрыта и `asChild` в ней не работает — Radix ждёт одного
              ребёнка, а кнопка всегда рисует три. Починка в её файле,
              не здесь.
            */}
            <Button
              variant="quiet"
              size="md"
              onClick={() => void navigate({ to: "/search" })}
            >
              Открыть выдачу
            </Button>
          </div>

          <div className="h-3" />

          <Typography variant="columnHeader" tone="dense">
            Последний вход
          </Typography>
          {/* Входы никто не записывает: сервера за кабинетом нет, а город,
              устройство и адрес входа браузер о чужом человеке знать не может.
              Про того, кто смотрит экран, известно только то, что он здесь
              сейчас, — остальное прочерк, а не правдоподобная строка. */}
          <div className="flex w-full flex-col gap-1">
            <Typography variant="numericDense" tone="default">
              {person.self ? "Сейчас" : "—"}
            </Typography>
            <Typography variant="metaText" tone="dense">
              Город, устройство и адрес входа кабинет пока не записывает
            </Typography>
          </div>

          <div className="flex">
            {/* Завершение чужих сеансов выкидывает человека из работы прямо
                сейчас. Экрана подтверждения в макете нет — действие названо. */}
            <Button
              variant="quiet"
              size="md"
              data-action="завершены все сеансы сотрудника"
            >
              Завершить сеансы сотрудника
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            Права и лимиты
          </Typography>

          <div className="flex w-full flex-col">
            <RightRow
              title="Дневной лимит раскрытий"
              // Руководитель ставит лимит, глядя на то, что человек уже
              // потратил. Число берётся из журнала: пока раскрытий нет,
              // честнее сказать это словами, чем показать «0 контактов на 0 ₽».
              note={
                person.disclosed === 0
                  ? "раскрытий за ним пока не числится"
                  : `раскрыл ${person.disclosed} ${plural(person.disclosed, "контакт", "контакта", "контактов")} на ${groupDigits(person.spent)} ₽`
              }
              options={["5 в сутки", "25 в сутки", "Без лимита"]}
              initial={person.limit === null ? "Без лимита" : `${person.limit} в сутки`}
            />
            <RightRow
              title="Роль"
              note="ролей ровно две, безлимит только у руководителя"
              options={["Агент", "Руководитель"]}
              initial={person.owner ? "Руководитель" : "Агент"}
            />
            <RightRow
              title="Доступ к подборкам агентства"
              note="может ли открывать чужие подборки"
              options={["Только свои", "Все агентства"]}
              initial="Только свои"
            />
            <RightRow
              title="Стартовый экран"
              note="агенту доступны «Сегодня» и «Поиск»"
              options={["Сегодня", "Поиск"]}
              initial="Поиск"
            />
            <RightRow
              title="Стоп-лист"
              note="может отметить «просил не звонить», снять отметку не может никто"
              action={
                // Журнал отказов агентства нарисован и живёт по своему адресу.
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => void navigate({ to: "/agency/refusals" })}
                >
                  Открыть журнал
                </Button>
              }
            />
            <RightRow
              title="Согласие на обработку данных сотрудника"
              // Согласие даётся один раз и в разный момент: тот, кто завёл
              // агентство, подписал его при регистрации, приглашённый агент —
              // приняв приглашение. Дата берётся из журнала, а не из макета.
              note={
                since === ""
                  ? `подписано ${person.owner ? "при создании агентства" : "при принятии приглашения"}`
                  : `подписано ${since} ${person.owner ? "при создании агентства" : "при принятии приглашения"}`
              }
              action={
                <Button
                  variant="quiet"
                  size="sm"
                  data-action="скачана копия согласия сотрудника"
                >
                  Скачать копию
                </Button>
              }
            />
            <RightRow
              title="Если сотрудник уходит"
              note="раскрытые им контакты остаются у агентства, сеансы завершаются сразу"
              action={
                <Button variant="quiet" size="sm" data-action="доступ сотрудника отключён">
                  Отключить
                </Button>
              }
              last
            />
          </div>
        </div>
      </div>
    </AgencyShell>
  )
}
