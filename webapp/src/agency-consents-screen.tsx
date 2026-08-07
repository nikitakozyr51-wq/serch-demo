import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import {
  csv,
  download,
  fileName,
  formatMoment,
  lastCall,
  useNow,
  useWorkspace,
} from "@/features/workspace"
import { AgencyEmpty, AgencyShell, DataTable } from "@/features/agency"

/**
 * АГЕНТСТВО · Согласия и отказы.
 *
 * Снято с `H6amtE`. Это фильтр журнала: запросы подтверждения и отметки
 * об отказе.
 *
 * **Цветных чипов здесь нет ни одного, и это решение.** Исход сказан словом —
 * «Отказ от звонков», — а не цветом. Раскрасить его красным значило бы
 * предложить читать экран по настроению, а тут читают по существу: разница
 * между «нет ответа» и «отказ» юридическая, а не эмоциональная.
 *
 * **В журнале только то, что продукт умеет делать сегодня.** Раньше здесь
 * лежали двенадцать строк из макета: запросы подтверждения по SMS, ответы
 * «Нет ответа 48 часов», «Повторный запрос заблокирован». Ни одного из этих
 * действий продукт не совершает — SMS никто не отправляет, тридцатидневную
 * блокировку повторного запроса никто не считает, — а строки показывались
 * живым людям как история их собственного агентства. Настоящее событие здесь
 * ровно одно: отметка «просил не звонить», которую агент ставит в панели
 * звонка. Когда запросы подтверждения появятся, они добавятся сюда записями,
 * а не текстом.
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
  const now = useNow()
  /**
   * Согласия и отказы — тот же журнал, но про обращения к человеку.
   * Сюда попадают отметки «просил не звонить»: они единственные из этого
   * набора, которые продукт умеет ставить сегодня.
   *
   * Время и автор берутся из записи о звонке, в котором отметку и поставили:
   * сам стоп-лист хранит только адрес. Подставить вместо неизвестного момента
   * текущий значило бы датировать все отказы одной минутой — той, в которую
   * человек открыл экран, — и журнал перестал бы отвечать на «когда».
   */
  const workspace = useWorkspace()
  const events: ConsentEvent[] = workspace.stopList.map((address, index) => {
    const call = lastCall(workspace, address)
    return {
      id: `stop-${index}`,
      when: call ? formatMoment(call.at) : "—",
      who: call?.by.trim() || "—",
      what: "Отметка «просил не звонить»",
      object: address,
      answer: "Отказ от звонков",
      channel: "звонок",
    }
  })

  /** Выгрузка для проверяющего: те же строки, что на экране, без телефонов. */
  const exportConsents = () => {
    download(
      fileName("согласия-и-отказы", now),
      csv(
        ["Дата и время", "Кто инициировал", "Что произошло", "Объект", "Ответ", "Канал"],
        events.map((e) => [e.when, e.who, e.what, e.object, e.answer, e.channel]),
      ),
    )
  }

  return (
    <AgencyShell
      activeTab="consents"
      title="Согласия и отказы"
      note="фильтр журнала: запросы подтверждения и отметки об отказе"
      action={
        // Выгрузка для проверяющего: файла в макете нет, действие названо.
        <Button variant="secondary" size="sm" onClick={exportConsents}>
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
        {/* Число считается по показанному, а срок из подписи убран: отметка
            «просил не звонить» не снимается никогда, поэтому «за 30 дней»
            здесь было бы сроком, которого у этих записей нет. */}
        <Typography variant="metaText" tone="dense">
          {events.length === 0 ? "Событий нет" : `${events.length} событий`}
        </Typography>
      </div>

      {events.length === 0 ? (
        <AgencyEmpty
          title="Журнал пуст"
          text="Сюда попадают отметки об отказе — по строке на каждого собственника, который просил больше не звонить. Первая появится, когда в панели звонка отметят «просил не звонить»: этот объект после отметки исчезает из очереди обзвона навсегда."
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
        rows={events.map((event) => ({
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
