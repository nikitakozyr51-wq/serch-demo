import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { useOwnAgency } from "@/features/auth"
import {
  csv,
  download,
  fileName,
  formatMoment,
  useNow,
  useWorkspace,
} from "@/features/workspace"
import { AgencyEmpty, AgencyShell, DataTable } from "@/features/agency"

/**
 * КАБИНЕТ · Агентство → Журнал доступа.
 *
 * Снято с `mCjJV`. Каждое обращение к контакту — с автором, временем и IP.
 *
 * **Журнал существует не для контроля сотрудников, а для проверки.** Если
 * собственник спросит, откуда у агентства его номер, ответ должен быть
 * с точностью до минуты и адреса. Поэтому здесь есть IP и выгрузка,
 * и поэтому журнал хранится тридцать дней независимо от того, смотрит ли
 * его кто-нибудь.
 *
 * **Просмотр раскрытого контакта — тоже событие, и он стоит 0 ₽.** Разница
 * между «раскрыл» и «посмотрел уже раскрытое» видна в колонке суммы: 199 ₽
 * платят один раз, остальные обращения бесплатны, но всё равно записаны.
 */

type AccessEvent = {
  id: string
  when: string
  who: string
  action: string
  object: string
  sum: string
  /** Списание было: сумма графитом, а не приглушённая. */
  charged?: boolean
  ip: string
}

const EVENTS: AccessEvent[] = [
  { id: "1", when: "24.07, 15:02", who: "Смирнова Ирина", action: "Просмотр раскрытого контакта", object: "Ленская ул., 10", sum: "0 ₽", ip: "31.184.238.14" },
  { id: "2", when: "24.07, 14:58", who: "Смирнова Ирина", action: "Просмотр раскрытого контакта", object: "Гражданский пр., 114", sum: "0 ₽", ip: "31.184.238.14" },
  { id: "3", when: "24.07, 14:12", who: "Смирнова Ирина", action: "Раскрытие контакта", object: "Ленская ул., 10", sum: "199 ₽", charged: true, ip: "31.184.238.14" },
  { id: "4", when: "24.07, 11:47", who: "Титова Анна", action: "Раскрытие контакта", object: "Индустриальный пр., 26", sum: "199 ₽", charged: true, ip: "95.161.12.207" },
  { id: "5", when: "24.07, 09:38", who: "Гусев Пётр", action: "Раскрытие контакта", object: "Заневский пр., 32", sum: "199 ₽", charged: true, ip: "31.184.238.14" },
  { id: "6", when: "24.07, 11:47", who: "Лебедев Максим", action: "Возврат за брак", object: "Бухарестская ул., 32", sum: "199 ₽", charged: true, ip: "31.184.238.14" },
  { id: "7", when: "24.07, 11:05", who: "Смирнова Ирина", action: "Экспорт подборки, без телефонов", object: "Подборка «Расселение, Лиговка»", sum: "0 ₽", ip: "31.184.238.14" },
  { id: "8", when: "24.07, 10:31", who: "Смирнова Ирина", action: "Просмотр раскрытого контакта", object: "Ленская ул., 10", sum: "0 ₽", ip: "95.161.12.207" },
  { id: "9", when: "24.07, 10:04", who: "Гусев Пётр", action: "Просмотр раскрытого контакта", object: "Ленская ул., 6", sum: "0 ₽", ip: "31.184.238.14" },
  { id: "10", when: "23.07, 18:12", who: "Смирнова Ирина", action: "Раскрытие контакта", object: "Наставников пр., 34", sum: "199 ₽", charged: true, ip: "31.184.238.14" },
  { id: "11", when: "23.07, 17:20", who: "Титова Анна", action: "Возврат за брак", object: "Пионерская ул., 21", sum: "199 ₽", charged: true, ip: "95.161.12.207" },
  { id: "12", when: "23.07, 16:47", who: "Лебедев Максим", action: "Раскрытие контакта", object: "наб. Обводного канала, 108", sum: "199 ₽", charged: true, ip: "31.184.238.14" },
]

/**
 * Чипы журнала — один выбранный за раз.
 *
 * Три из четырёх значений означают «показать всё»: сотрудники все, период
 * тридцать дней, действия любые — в демонстрации это одна и та же дюжина
 * событий. Сужает выдачу ровно одно, «Только раскрытия», и именно оно отвечает
 * на вопрос, ради которого журнал открывают: за что списаны деньги.
 */
const FILTERS = ["Все сотрудники", "30 дней", "Все действия", "Только раскрытия"] as const

export function AgencyAccessPage() {
  const [filter, setFilter] = useState<string>("30 дней")
  // В своём агентстве журнал начинается с нуля: обращаться к контактам ещё
  // никто не успел.
  const own = useOwnAgency()
  const now = useNow()
  /**
   * Журнал собирается из работы агентства, а не стоит константой.
   *
   * Каждое раскрытие и каждый звонок оставляют здесь строку — это и есть
   * ответ проверяющему на вопрос «откуда у вас номер этого человека».
   * IP браузер знать не может, и выдумывать его нельзя: вместо числа стоит
   * прочерк, а не правдоподобная ложь.
   */
  const workspace = useWorkspace()
  const mine: AccessEvent[] = own
    ? [
        ...workspace.disclosures.map((item) => ({
          id: item.id,
          when: formatMoment(item.at),
          who: item.by,
          action: item.refunded ? "Возврат за брак" : "Раскрытие контакта",
          object: item.address,
          sum: item.trial ? "0 ₽" : `${item.amount} ₽`,
          charged: !item.trial,
          ip: "—",
        })),
        ...workspace.calls.map((item) => ({
          id: item.id,
          when: formatMoment(item.at),
          who: item.by,
          action: `Звонок: ${item.outcome}`,
          object: item.address,
          sum: "0 ₽",
          ip: "—",
        })),
      ].sort((a, b) => (a.when < b.when ? 1 : -1))
    : EVENTS

  const all = mine
  const events =
    filter === "Только раскрытия"
      ? all.filter((event) => event.action === "Раскрытие контакта")
      : all

  /**
   * Выгрузка настоящая: файл собирается из показанных строк и уходит на диск.
   *
   * Телефонов в нём нет — это правило продукта, а не упрощение: файл, который
   * можно унести с собой, не должен уносить контакты собственников.
   */
  const exportLog = () => {
    download(
      fileName("журнал-доступа", now),
      csv(
        ["Дата и время", "Сотрудник", "Действие", "Объект", "Сумма", "IP"],
        events.map((event) => [event.when, event.who, event.action, event.object, event.sum, event.ip]),
      ),
    )
  }

  return (
    <AgencyShell
      activeTab="access"
      title="Журнал доступа"
      note="каждое обращение к контакту, с автором, временем и IP"
      action={
        // Журнал выгружается по запросу проверяющего; экрана выгрузки в макете
        // нет, поэтому действие названо и ничего не рисует.
        <Button variant="quiet" size="sm" onClick={exportLog}>
          Выгрузить журнал
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
        {/* Число в подписи считается по показанному, а не написано в макете:
            подпись «12 событий» под пятью строками — это ложь на экране,
            который существует ради точности. */}
        <Typography variant="metaText" tone="dense">
          {events.length === 0
            ? "Событий нет · журнал хранится 30 дней и выгружается по запросу"
            : `Показаны последние ${events.length} событий · журнал хранится 30 дней и выгружается по запросу`}
        </Typography>
      </div>

      {events.length === 0 ? (
        <AgencyEmpty
          title="Записей пока нет"
          text="Журнал наполняется сам: каждое раскрытие контакта, каждый просмотр номера и каждая выгрузка попадают сюда строкой с автором, временем и адресом объекта."
          note="Записи хранятся 30 дней и выгружаются по запросу проверяющего. Удалить строку нельзя ни руководителю, ни нам."
        />
      ) : (
      <DataTable
        columns={[
          { head: "ДАТА И ВРЕМЯ", width: "w-col-144" },
          { head: "СОТРУДНИК", width: "w-col-168" },
          { head: "ДЕЙСТВИЕ", width: "w-col-216" },
          { head: "ОБЪЕКТ" },
          { head: "СУММА", width: "w-col-96", numeric: true },
          { head: "IP", width: "w-col-120", numeric: true },
        ]}
        rows={events.map((event) => ({
          id: event.id,
          cells: [
            <Typography key="when" variant="denseText" tone="secondary">{event.when}</Typography>,
            <Typography key="who" variant="denseText" tone="secondary">{event.who}</Typography>,
            <Typography key="action" variant="denseText" tone="default">{event.action}</Typography>,
            <Typography key="object" variant="denseText" tone="default">{event.object}</Typography>,
            <Typography key="sum" variant="numericDense" tone={event.charged ? "default" : "dense"}>
              {event.sum}
            </Typography>,
            <Typography key="ip" variant="denseText" tone="dense">{event.ip}</Typography>,
          ],
        }))}
      />
      )}
    </AgencyShell>
  )
}
