import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { useOwnAgency } from "@/features/auth"
import { AgencyEmpty, AgencyShell, DataTable } from "@/features/agency"

/**
 * АГЕНТСТВО · Согласия и отказы.
 *
 * Снято с `H6amtE`. Это фильтр журнала: запросы подтверждения и отметки
 * об отказе.
 *
 * **Цветных чипов здесь нет ни одного, и это решение.** Исход сказан словом —
 * «Подтверждено», «Отказ от звонков», «Нет ответа 48 часов», «Раньше 30 дней
 * нельзя». Раскрасить их зелёным и красным значило бы предложить читать экран
 * по цвету, а тут читают по существу: разница между «нет ответа» и «отказ»
 * юридическая, а не эмоциональная.
 *
 * **«Повторный запрос заблокирован» — не ошибка, а работающее правило.**
 * Повторно спрашивать согласие раньше тридцати дней нельзя, и продукт
 * не даёт этого сделать, а не полагается на память агента.
 */

type ConsentEvent = {
  id: string
  when: string
  who: string
  what: string
  object: string
  answer: string
  channel: string
}

const EVENTS: ConsentEvent[] = [
  { id: "1", when: "24.07, 15:40", who: "Смирнова Ирина", what: "Запрос подтверждения", object: "Науки пр., 17", answer: "Подтверждено", channel: "SMS" },
  { id: "2", when: "24.07, 12:05", who: "Гусев Пётр", what: "Запрос подтверждения", object: "Светлановский пр., 62", answer: "Ждём ответа", channel: "SMS" },
  { id: "3", when: "23.07, 18:30", who: "Титова Анна", what: "Отметка «просил не звонить»", object: "Кузнецовская ул., 44", answer: "Отказ от звонков", channel: "звонок" },
  { id: "4", when: "23.07, 14:02", who: "Смирнова Ирина", what: "Запрос подтверждения", object: "Гражданский пр., 114", answer: "Подтверждено", channel: "SMS" },
  { id: "5", when: "22.07, 16:50", who: "Лебедев Максим", what: "Запрос подтверждения", object: "наб. Обводного канала, 108", answer: "Нет ответа 48 часов", channel: "SMS" },
  { id: "6", when: "22.07, 11:12", who: "Гусев Пётр", what: "Повторный запрос заблокирован", object: "Пионерская ул., 21", answer: "Раньше 30 дней нельзя", channel: "не отправлен" },
  { id: "7", when: "21.07, 10:20", who: "Титова Анна", what: "Отметка «просил не звонить»", object: "Передовиков ул., 21", answer: "Отказ от звонков", channel: "звонок" },
  { id: "8", when: "20.07, 15:00", who: "Смирнова Ирина", what: "Запрос подтверждения", object: "Наставников пр., 34", answer: "Подтверждено", channel: "SMS" },
  { id: "9", when: "19.07, 12:44", who: "Лебедев Максим", what: "Запрос подтверждения", object: "Ленская ул., 6", answer: "Нет ответа 48 часов", channel: "SMS" },
  { id: "10", when: "18.07, 09:55", who: "Гусев Пётр", what: "Запрос подтверждения", object: "Бухарестская ул., 32", answer: "Подтверждено", channel: "SMS" },
  { id: "11", when: "17.07, 17:31", who: "Титова Анна", what: "Запрос подтверждения", object: "Есенина ул., 32", answer: "Подтверждено", channel: "SMS" },
  { id: "12", when: "16.07, 13:10", who: "Смирнова Ирина", what: "Отказ через serch.ru/stop", object: "Софийская ул., 47", answer: "Отказ от звонков", channel: "страница" },
]

/**
 * Чипы этого экрана взяты из журнала доступа и здесь ничего не сужают.
 *
 * Экран уже сам по себе фильтр журнала — «запросы подтверждения и отметки
 * об отказе», — и раскрытий контактов в нём нет ни одного. Поэтому выбор
 * переключается, но таблица не режется: показать пустую таблицу по чипу
 * «Только раскрытия» значило бы соврать, будто раскрытия сюда попадают.
 */
const FILTERS = ["Все сотрудники", "30 дней", "Все действия", "Только раскрытия"] as const

export function AgencyConsentsPage() {
  const [filter, setFilter] = useState<string>("30 дней")
  // Своё агентство ещё никому не звонило, поэтому и согласий с отказами
  // в нём нет. Показывать здесь чужой журнал — значит приписать новому
  // агентству разговоры, которых не было.
  const own = useOwnAgency()

  return (
    <AgencyShell
      activeTab="consents"
      title="Согласия и отказы"
      note="фильтр журнала: запросы подтверждения и отметки об отказе"
      action={
        // Выгрузка для проверяющего: файла в макете нет, действие названо.
        <Button variant="secondary" size="sm" data-action="выгружены согласия и отказы для проверки">
          Выгрузить для проверки
        </Button>
      }
    >
      <div className="flex w-full shrink-0 items-center gap-2">
        {FILTERS.map((label) => (
          <SelectChip
            key={label}
            label={label}
            selected={label === filter}
            onClick={() => setFilter(label)}
          />
        ))}
        <div className="h-px flex-1" />
        <Typography variant="metaText" tone="dense">
          {own
            ? "нет событий за 30 дней"
            : "12 событий за 30 дней · 5 подтверждений, 3 отказа, 2 без ответа, 1 ждём ответа, 1 заблокирован"}
        </Typography>
      </div>

      {own ? (
        <AgencyEmpty
          title="Журнал пуст"
          text="Сюда попадают запросы подтверждения и отметки об отказе — по одной строке на каждое обращение к собственнику. Первая запись появится после первого раскрытия контакта в выдаче."
          note="Журнал нельзя очистить или отредактировать: он существует затем, чтобы ответить проверяющему, кто и когда обращался к человеку."
        />
      ) : (
      <DataTable
        columns={[
          { head: "ДАТА И ВРЕМЯ", width: "w-col-144" },
          { head: "КТО ИНИЦИИРОВАЛ", width: "w-col-168" },
          { head: "ЧТО ПРОИЗОШЛО", width: "w-col-216" },
          { head: "ОБЪЕКТ" },
          { head: "ОТВЕТ", width: "w-col-216", numeric: true },
          { head: "КАНАЛ", width: "w-col-120", numeric: true },
        ]}
        rows={EVENTS.map((event) => ({
          id: event.id,
          cells: [
            <Typography key="when" variant="denseText" tone="secondary">{event.when}</Typography>,
            <Typography key="who" variant="denseText" tone="secondary">{event.who}</Typography>,
            <Typography key="what" variant="denseText" tone="secondary">{event.what}</Typography>,
            <Typography key="object" variant="denseText" tone="default">{event.object}</Typography>,
            <Typography key="answer" variant="numericDense" tone="default">{event.answer}</Typography>,
            <Typography key="channel" variant="denseText" tone="dense">{event.channel}</Typography>,
          ],
        }))}
      />
      )}
    </AgencyShell>
  )
}
