import { Lock } from "lucide-react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useOwnAgency } from "@/features/auth"
import { AgencyChip, AgencyEmpty, AgencyShell, DataTable } from "@/features/agency"

/**
 * КАБИНЕТ · Агентство → Отказы (стоп-лист).
 *
 * Снято с `Y2Up0t`. Таблица на двенадцать номеров: кто отметил, когда,
 * когда номер будет удалён и в каком он состоянии.
 *
 * **Снять отказ из интерфейса нельзя ни агенту, ни руководителю.** Это главная
 * строка экрана, и она стоит плашкой над таблицей, а не в справке: иначе
 * стоп-лист не имеет смысла. С 01.09.2025 звонок без согласия абонента
 * наказывается штрафом юрлицу от 300 тысяч до миллиона рублей, и отвечает
 * агентство, а не площадка.
 *
 * **Номера показаны частично скрытыми** — «+7 (9••) •••-••-67». Стоп-лист
 * существует, чтобы по этим номерам не звонили, поэтому он и не показывает,
 * куда звонить. Последние две цифры оставлены, чтобы человек мог сверить
 * свой случай, не получив самого номера.
 *
 * Внизу — то, что легко принять за отговорку, но это правда, которую честнее
 * назвать: государственный самозапрет на рекламные звонки частному сервису
 * недоступен, его отрабатывают операторы связи. Собственный реестр отказов —
 * единственное, что мы можем сделать, и мы навсегда запрещаем себе эти номера.
 */

type Refusal = {
  id: string
  phone: string
  object: string
  who: string
  date: string
  removal: string
  status: "hidden" | "removing" | "removed"
}

const REFUSALS: Refusal[] = [
  { id: "67", phone: "+7 (9••) •••-••-67", object: "Салова ул., 68", who: "Собственник, serch.ru/stop", date: "24.07", removal: "3 рабочих дня, до 29.07", status: "hidden" },
  { id: "12", phone: "+7 (9••) •••-••-12", object: "Тельмана ул., 41", who: "Титова Анна, по звонку", date: "23.07", removal: "30 дней, до 22.08", status: "hidden" },
  { id: "45", phone: "+7 (9••) •••-••-45", object: "Софийская ул., 47", who: "Собственник, serch.ru/stop", date: "22.07", removal: "идёт удаление", status: "removing" },
  { id: "03", phone: "+7 (9••) •••-••-03", object: "Тельмана ул., 41", who: "Лебедев Максим, по звонку", date: "21.07", removal: "30 дней, до 20.08", status: "hidden" },
  { id: "88", phone: "+7 (9••) •••-••-88", object: "Костюшко ул., 9", who: "Собственник, serch.ru/stop", date: "19.07", removal: "исполнено 22.07", status: "removed" },
  { id: "51", phone: "+7 (9••) •••-••-51", object: "Витебский пр., 99", who: "Собственник, serch.ru/stop", date: "18.07", removal: "исполнено 22.07", status: "removed" },
  { id: "29", phone: "+7 (9••) •••-••-29", object: "Передовиков ул., 21", who: "Собственник, serch.ru/stop", date: "16.07", removal: "исполнено 21.07", status: "removed" },
  { id: "74", phone: "+7 (9••) •••-••-74", object: "Димитрова ул., 16", who: "Гусев Пётр, по звонку", date: "15.07", removal: "30 дней, до 14.08", status: "hidden" },
  { id: "16", phone: "+7 (9••) •••-••-16", object: "Бухарестская ул., 8", who: "Собственник, serch.ru/stop", date: "14.07", removal: "исполнено 17.07", status: "removed" },
  { id: "92", phone: "+7 (9••) •••-••-92", object: "Кузнецовская ул., 12", who: "Титова Анна, по звонку", date: "12.07", removal: "30 дней, до 11.08", status: "hidden" },
  { id: "38", phone: "+7 (9••) •••-••-38", object: "Пионерская ул., 4", who: "Собственник, serch.ru/stop", date: "11.07", removal: "исполнено 15.07", status: "removed" },
  { id: "05", phone: "+7 (9••) •••-••-05", object: "Гражданский пр., 92", who: "Лебедев Максим, по звонку", date: "09.07", removal: "30 дней, до 08.08", status: "hidden" },
]

/**
 * Три состояния номера в реестре.
 *
 * «Скрыт» — номер уже не показывается, но лежит у нас; «На удалении» — идёт
 * процесс, поэтому он на тинте внимания; «Удалён» — всё закончилось, действий
 * больше нет, и чип белеет с рамкой.
 */
const STATUS: Record<Refusal["status"], { label: string; tone: "calm" | "attention" | "done" }> = {
  hidden: { label: "Скрыт", tone: "calm" },
  removing: { label: "На удалении", tone: "attention" },
  removed: { label: "Удалён", tone: "done" },
}

export function AgencyRefusalsPage() {
  // Стоп-лист ведёт агентство: сюда попадают собственники, которые просили
  // не звонить именно ему. Своё агентство ещё никому не звонило.
  const own = useOwnAgency()
  const refusals = own ? [] : REFUSALS

  return (
    <AgencyShell
      activeTab="refusals"
      title="Отказы"
      note={own ? "стоп-лист агентства · пока пуст" : "стоп-лист агентства · 12 из 23 номеров"}
      action={
        // Выгрузка стоп-листа для проверяющего: файла в макете нет, и рисовать
        // его подтверждение было бы обещанием того, чего продукт пока не делает.
        <Button variant="quiet" size="sm" data-action="выгружен стоп-лист для проверки">
          Экспорт для проверки
        </Button>
      }
    >
      <div className="flex w-full shrink-0 items-center gap-3 rounded-lg bg-warm px-4 py-3">
        <Lock aria-hidden className="size-4 shrink-0 text-text-2" strokeWidth={2} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Typography variant="numericDense" tone="default">
            Снять отказ из интерфейса нельзя ни агенту, ни руководителю
          </Typography>
          <Typography variant="metaText" tone="dense">
            Иначе стоп-лист не имеет смысла. С 01.09.2025 звонок без согласия абонента
            наказывается штрафом юрлицу от 300 тысяч до 1 миллиона ₽, и отвечает
            агентство, а не площадка.
          </Typography>
        </div>
      </div>

      {refusals.length === 0 ? (
        <AgencyEmpty
          title="Стоп-лист пуст"
          text="Сюда попадает каждый собственник, который просил ему не звонить. Отметка ставится прямо в панели фиксации звонка и действует немедленно: объект исчезает из выдачи агентства, а повторно позвонить по этому номеру продукт не даст."
          note="Снять отметку нельзя ни руководителю, ни нам — в этом её смысл."
        />
      ) : (
      <DataTable
        columns={[
          { head: "НОМЕР", width: "w-col-168" },
          { head: "ОБЪЕКТ" },
          { head: "КТО ОТМЕТИЛ", width: "w-col-216" },
          { head: "ДАТА", width: "w-col-96" },
          { head: "СРОК УДАЛЕНИЯ", width: "w-col-216" },
          { head: "СТАТУС", width: "w-col-120", numeric: true },
        ]}
        rows={refusals.map((row) => ({
          id: row.id,
          cells: [
            <Typography key="phone" variant="numericDense" tone="default">
              {row.phone}
            </Typography>,
            <Typography key="object" variant="denseText" tone="default">
              {row.object}
            </Typography>,
            <Typography key="who" variant="denseText" tone="dense">
              {row.who}
            </Typography>,
            <Typography key="date" variant="denseText" tone="secondary">
              {row.date}
            </Typography>,
            <Typography key="removal" variant="denseText" tone="default">
              {row.removal}
            </Typography>,
            <AgencyChip
              key="status"
              label={STATUS[row.status].label}
              tone={STATUS[row.status].tone}
            />,
          ],
        }))}
      />
      )}

      <div className="w-[900px] shrink-0">
        <Typography variant="metaText" tone="dense">
          Государственный самозапрет на рекламные звонки частному сервису недоступен:
          его отрабатывают операторы связи. Собственный реестр отказов это единственное,
          что мы можем сделать, и мы навсегда запрещаем себе эти номера.
        </Typography>
      </div>
    </AgencyShell>
  )
}
