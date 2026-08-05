import { Link, useNavigate } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import { AgencyChip, AgencyShell, DataTable, FormField } from "@/features/agency"
import { OwnerAvatar } from "@/features/listings"
import { cn } from "@/lib/utils"

/**
 * КАБИНЕТ · Агентство → Сотрудники.
 *
 * Снято с `u7anli`. Пять человек, одно приглашение.
 *
 * **Ролей ровно две: руководитель и агент.** «Стажёр» — не роль, а поле
 * «дневной лимит раскрытий» в карточке сотрудника. Это не мелочь: третья роль
 * потянула бы за собой отдельную матрицу прав, а лимит решает ту же задачу
 * одним числом, которое видно прямо в таблице.
 *
 * **Лимит покрашен по смыслу.** «без лимита» и «25» идут приглушённым: это
 * норма. «5» — графитом: у человека стоит ограничение, и руководитель должен
 * видеть это, не открывая карточку.
 *
 * **Отключённый сотрудник теряет доступ, но не уносит работу.** Раскрытые им
 * контакты, статусы и история касаний остаются агентству — за них заплачено.
 */

type Staff = {
  id: string
  initials: string
  name: string
  contacts: string
  role: string
  limit: string
  /** Лимит ограничен: значение графитом, а не приглушённым. */
  limited?: boolean
  disclosed: string
  spent: string
  lastSeen: string
  /** Давно не заходил: статус на тинте внимания. */
  stale?: boolean
}

const STAFF: Staff[] = [
  {
    id: "smirnova",
    initials: "ИС",
    name: "Смирнова Ирина",
    contacts: "i.smirnova@nevsky.ru · +7 900 000-57-66",
    role: "Руководитель",
    limit: "без лимита",
    disclosed: "64",
    spent: "12 736 ₽",
    lastSeen: "сегодня, 09:12",
  },
  {
    id: "lebedev",
    initials: "МЛ",
    name: "Лебедев Максим",
    contacts: "m.lebedev@nevsky.ru · +7 900 000-48-13",
    role: "Агент",
    limit: "25",
    disclosed: "52",
    spent: "10 348 ₽",
    lastSeen: "сегодня, 08:47",
  },
  {
    id: "titova",
    initials: "АТ",
    name: "Титова Анна",
    contacts: "a.titova@nevsky.ru · +7 900 000-95-21",
    role: "Агент",
    limit: "25",
    disclosed: "38",
    spent: "7 562 ₽",
    lastSeen: "вчера, 18:20",
  },
  {
    id: "gusev",
    initials: "ПГ",
    name: "Гусев Пётр",
    contacts: "p.gusev@nevsky.ru · +7 900 000-71-40",
    role: "Агент",
    limit: "5",
    limited: true,
    disclosed: "18",
    spent: "3 582 ₽",
    lastSeen: "сегодня, 10:04",
  },
  {
    id: "korolev",
    initials: "ДК",
    name: "Королёв Дмитрий",
    contacts: "d.korolev@nevsky.ru · +7 900 000-23-30",
    role: "Агент",
    limit: "5",
    limited: true,
    disclosed: "6",
    spent: "1 194 ₽",
    lastSeen: "23.07, 12:40",
    stale: true,
  },
]

/**
 * Кто в агентстве на самом деле.
 *
 * В своём агентстве — один человек: тот, кто его завёл. Ни раскрытий, ни
 * потраченных денег, ни «последнего входа вчера»: агентству пять минут от
 * роду. Чужие пятеро остаются во входе в «Невский проспект» — там они и
 * нужны, чтобы показать заполненную таблицу.
 */
function useStaff(): Staff[] {
  const session = useSession()

  if (session?.kind !== "own") return STAFF

  return [
    {
      id: "owner",
      initials: session.initials,
      name: session.name,
      contacts: session.email,
      role: "Руководитель",
      limit: "без лимита",
      disclosed: "0",
      spent: "0 ₽",
      lastSeen: "сейчас",
    },
  ]
}

export function AgencyStaffPage() {
  const staff = useStaff()

  return (
    <AgencyShell
      activeTab="staff"
      title="Сотрудники"
      note={
        staff.length === 1
          ? "один человек · приглашений нет"
          : "пять человек · одно приглашение"
      }
      action={
        // Формы приглашения на большом экране в макете нет — она нарисована
        // только для телефона. Рисовать её здесь по памяти значило бы
        // придумать продукт, поэтому действие названо и молчит.
        <Button variant="primary" size="sm" data-action="приглашение агента в агентство">
          Пригласить агента
        </Button>
      }
    >
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
                <Typography variant="metaText" tone="dense">
                  {person.contacts}
                </Typography>
              </div>
            </Link>,
            <Typography key="role" variant="denseText" tone="default">
              {person.role}
            </Typography>,
            <Typography
              key="limit"
              variant="denseText"
              tone={person.limited ? "default" : "dense"}
            >
              {person.limit}
            </Typography>,
            <Typography key="disclosed" variant="denseText" tone="default">
              {person.disclosed}
            </Typography>,
            <Typography key="spent" variant="numericDense" tone="default">
              {person.spent}
            </Typography>,
            <Typography key="seen" variant="denseText" tone="secondary">
              {person.lastSeen}
            </Typography>,
            <AgencyChip key="status" label="Активен" tone={person.stale ? "attention" : "calm"} />,
          ],
        }))}
      />

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
 * подмена означала бы смену человека. Телефон видят коллеги в журнале
 * и клиенты в подборке, его сотрудник меняет сам.
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

  return (
    <AgencyShell
      activeTab="none"
      title="Гусев Пётр"
      note="агент · в агентстве с 12 июня 2026 · последний вход сегодня в 10:04"
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

          <FormField label="ИМЯ И ФАМИЛИЯ" value="Гусев Пётр" />
          <FormField
            label="ТЕЛЕФОН"
            value="+7 900 000-71-40"
            hint="его видят коллеги в журнале и клиенты в подборке"
          />
          <FormField
            label="РАБОЧИЙ E-MAIL"
            value="p.gusev@nevsky.ru"
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
              Открыть его выдачу
            </Button>
          </div>

          <div className="h-3" />

          <Typography variant="columnHeader" tone="dense">
            Последний вход
          </Typography>
          <div className="flex w-full flex-col gap-1">
            <Typography variant="numericDense" tone="default">
              Сегодня в 10:04
            </Typography>
            <Typography variant="metaText" tone="dense">
              Санкт-Петербург · 31.184.238.14 · Chrome, Windows
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
              note="за 30 дней раскрыл 18 контактов на 3 582 ₽"
              options={["5 в сутки", "25 в сутки", "Без лимита"]}
              initial="5 в сутки"
            />
            <RightRow
              title="Роль"
              note="ролей ровно две, безлимит только у руководителя"
              options={["Агент", "Руководитель"]}
              initial="Агент"
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
              note="подписано 12.06.2026 при принятии приглашения"
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
