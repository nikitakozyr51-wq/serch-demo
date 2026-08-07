import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
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
 * **Бесплатное обращение — тоже событие.** Разница видна в колонке суммы:
 * 199 ₽ платят один раз за раскрытие, а звонки по уже раскрытому номеру
 * стоят 0 ₽, но всё равно записаны. Строки берутся из работы агентства:
 * пока раскрытий и звонков нет, журнал честно пуст. Отдельного события
 * «посмотрел уже раскрытый контакт» кабинет пока не пишет — как только оно
 * появится в рабочем хранилище, оно встанет сюда само.
 */

type AccessEvent = {
  id: string
  /**
   * Момент события числом, а не готовой строкой.
   *
   * Журнал сортируется по времени, а строки вида «24.07, 15:02» сравниваются
   * как текст и разъезжаются на границе месяца: «01.08» встанет ниже «31.07».
   * Форматируем только на показ и в выгрузку.
   */
  at: number
  who: string
  action: string
  object: string
  sum: string
  /** Списание было: сумма графитом, а не приглушённая. */
  charged?: boolean
  ip: string
}

/**
 * Чипы журнала — один выбранный за раз.
 *
 * Три из четырёх значений означают «показать всё»: сотрудники все, период
 * тридцать дней, действия любые — журнал и так пишет всех и хранится тридцать
 * дней, так что сужать им нечего. Сужает выдачу ровно одно, «Только
 * раскрытия», и именно оно отвечает на вопрос, ради которого журнал
 * открывают: за что списаны деньги.
 */
const FILTERS = ["Все сотрудники", "30 дней", "Все действия", "Только раскрытия"] as const

export function AgencyAccessPage() {
  const [filter, setFilter] = useState<string>("30 дней")
  const now = useNow()
  /**
   * Журнал целиком собирается из работы агентства.
   *
   * Каждое раскрытие и каждый звонок оставляют здесь строку — это и есть
   * ответ проверяющему на вопрос «откуда у вас номер этого человека».
   * У нового агентства журнал начинается с нуля: обращаться к контактам ещё
   * никто не успел, и вместо чужих строк экран показывает пустое состояние.
   * IP браузер знать не может, и выдумывать его нельзя: вместо числа стоит
   * прочерк, а не правдоподобная ложь.
   */
  const workspace = useWorkspace()
  const all: AccessEvent[] = [
    ...workspace.disclosures.map((item) => ({
      id: item.id,
      at: item.at,
      who: item.by,
      action: item.refunded ? "Возврат за брак" : "Раскрытие контакта",
      object: item.address,
      sum: item.trial ? "0 ₽" : `${item.amount} ₽`,
      charged: !item.trial,
      ip: "—",
    })),
    ...workspace.calls.map((item) => ({
      id: item.id,
      at: item.at,
      who: item.by,
      action: `Звонок: ${item.outcome}`,
      object: item.address,
      sum: "0 ₽",
      ip: "—",
    })),
  ].sort((a, b) => b.at - a.at)

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
        events.map((event) => [
          formatMoment(event.at),
          event.who,
          event.action,
          event.object,
          event.sum,
          event.ip,
        ]),
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
          text="Журнал наполняется сам: каждое раскрытие контакта и каждый звонок по нему попадают сюда строкой — с автором, временем и адресом объекта. Раскройте первый контакт в выдаче, и первая строка появится здесь."
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
            <Typography key="when" variant="denseText" tone="secondary">{formatMoment(event.at)}</Typography>,
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
