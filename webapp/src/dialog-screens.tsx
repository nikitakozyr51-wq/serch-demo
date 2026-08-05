import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { DialogCard, HotkeysDialog } from "@/features/cabinet"
import { cn } from "@/lib/utils"

/**
 * Диалоги кабинета.
 *
 * Восемь штук: раскрыть пачкой (`q5xX5`), выбрано двенадцать (`z9waH`),
 * чем кончился звонок (`CUY4q`), вернуть 199 ₽ (`gJdnV`), ссылка для клиента
 * (`nmULz`), сохранить поиск (`q7Yehb`), экспорт (`t0M9V9`) и карта горячих
 * клавиш (`L0qKK`). Каркас общий — `JHW4q`: 520 в ширину, поля 24, радиус 16,
 * белая заливка, кнопки внизу справа.
 *
 * **Пять из восьми в файле нарисованы как спецификация, а не как готовый
 * экран.** Вместо трёх кнопок выбора там стоит подпись «ПРИЧИНА: НОМЕР
 * НЕ СУЩЕСТВУЕТ · ЭТО ПОСРЕДНИК · ОБЪЕКТ ПРОДАН · НОМЕР ЧУЖОЙ» и одно поле
 * с выбранным значением. Так и собрано: владелец сказал оставлять как в файле,
 * и придумывать вместо него раскладку переключателей я не стал. Когда дойдёт
 * до живых форм, эта строка превратится в набор чипов — она уже перечисляет
 * весь закрытый список.
 *
 * **Диалог всегда говорит, что случится с деньгами и со следом.** «Спишется
 * 1 791 ₽… Останется 6 819 ₽» и «попадёт в журнал доступа с вашим именем,
 * временем и IP» — не мелкий шрифт для юристов, а предмет решения: человек
 * жмёт кнопку, зная цену и зная, что это видно коллегам.
 *
 * **Нажимается здесь то, у чего есть предмет.** Выбор автора, расписание
 * уведомлений и формат выгрузки живут внутри самого диалога — они и работают
 * по-настоящему. А «Раскрыть 9 контактов» и «Отправить заявку» предмета
 * на стенде не имеют: девять выбранных объектов и раскрытый контакт остались
 * на выдаче, сюда они не приходят. Списать деньги за выдуманный выбор было бы
 * враньём, поэтому такие кнопки названы атрибутом `data-action` — что именно
 * произойдёт, — и не рисуют ничего. Это честнее выдуманного подтверждения.
 */

/**
 * Диалог-подтверждение: заголовок, последствие, поле решения, след и кнопки.
 *
 * **След — обязательная часть, а не сноска.** Каждый из пяти диалогов этого
 * вида заканчивается строкой о том, что останется после нажатия: запись
 * в журнале, лимит возвратов, видимость для коллег. Диалог, который скрывает
 * последствие, экономит секунду и стоит доверия.
 */
function ConfirmDialog({
  title,
  text,
  label,
  value,
  tall = false,
  trace,
  cancel,
  cancelAction,
  confirm,
  confirmAction,
  danger = false,
}: {
  title: string
  text: string
  label: string
  value: string
  /** Поле решения 48 вместо 40: так в диалоге пачки, где значение крупнее. */
  tall?: boolean
  trace: string
  cancel: string
  /** Что случится по отказу. Экрана для этого нет — действие только названо. */
  cancelAction: string
  confirm: string
  /** Что случится по согласию: деньги, заявка, письмо клиенту. */
  confirmAction: string
  /** Нажатие спишет деньги: кнопка красная и в капсуле. */
  danger?: boolean
}) {
  return (
    <DialogCard>
      <Typography variant="panelTitle" tone="default" as="h2">
        {title}
      </Typography>
      <Typography variant="uiText" tone="secondary">
        {text}
      </Typography>

      <div className="flex w-full flex-col gap-1.5">
        <Typography variant="columnHeader" tone="dense">
          {label}
        </Typography>
        <div
          className={cn(
            "flex w-full items-center border border-fg bg-bg px-3.5",
            tall ? "h-ctl-lg rounded-xl" : "h-ctl-md rounded-lg",
          )}
        >
          <Typography variant={tall ? "controlLabelLg" : "strongText"} tone="default">
            {value}
          </Typography>
        </div>
      </div>

      <Typography variant="metaText" tone="dense">
        {trace}
      </Typography>

      <div className="flex w-full items-center gap-2.5">
        <Button variant="quiet" size="md" data-action={cancelAction}>
          {cancel}
        </Button>
        <div className="h-px flex-1" />
        {danger ? (
          <Button variant="money" size="lg" data-action={confirmAction}>
            {confirm}
          </Button>
        ) : (
          <Button variant="primary" size="md" data-action={confirmAction}>
            {confirm}
          </Button>
        )}
      </div>
    </DialogCard>
  )
}

/** Раскрыть пачкой (`q5xX5`). */
function DisclosureBulkDialog() {
  return (
    <ConfirmDialog
      title="Раскрыть 9 контактов"
      text="Спишется 1 791 ₽ с общего баланса агентства. Останется 6 819 ₽, это 34 раскрытия."
      label="Напечатайте сумму списания, 1791, чтобы подтвердить"
      value="1791"
      trace="Каждое раскрытие попадёт в журнал доступа с вашим именем, временем и IP. Возврат за брак остаётся доступным по каждому контакту отдельно."
      cancel="Отмена"
      cancelAction="закрыть диалог, ничего не списывать"
      confirm="Раскрыть 9 контактов"
      confirmAction="раскрыть 9 контактов, списать 1 791 ₽ с баланса агентства"
      danger
    />
  )
}

/** Выбрано 12 объектов (`z9waH`) — описание нижней панели массового действия. */
function SelectionDialog() {
  return (
    <ConfirmDialog
      title="Выбрано 12 объектов"
      text="Что сделать с выбранным. Раскрытие спишет 1 791 ₽ за девять контактов: три объекта коллеги уже раскрывали, за них деньги не спишутся."
      label="Действия"
      value="Раскрыть 9 контактов · В подборку · Сменить статус · Назначить агенту · Снять выбор"
      tall
      trace="Панель появляется снизу поверх выдачи и не перекрывает строки: список сдвигается вверх на её высоту. Esc снимает выбор."
      cancel="Снять выбор"
      cancelAction="снять выбор с 12 объектов"
      confirm="Раскрыть 9 контактов · 1 791 ₽"
      confirmAction="раскрыть 9 контактов из 12 выбранных, списать 1 791 ₽"
      danger
    />
  )
}

/** Чем кончился звонок (`CUY4q`). */
function CallResultDialog() {
  return (
    <ConfirmDialog
      title="Чем кончился звонок"
      text="Гражданский пр., 114 · 3-комн · 71 м² · 12,8 млн ₽. Звонок длился две минуты сорок секунд. Отметьте исход: он попадёт в журнал и станет виден коллегам рядом с объектом."
      label="Исход: в работе · прозвонен · отказ · брак"
      value="Договорились о показе в четверг в 18:00"
      trace="Отдельно от исхода стоит чекбокс «собственник просил не звонить». Он закрывает объект для всего агентства навсегда, снять отметку не может никто, включая руководителя."
      cancel="Позвонить ещё раз"
      cancelAction="набрать собственника ещё раз, исход не сохранять"
      confirm="Сохранить и назначить перезвон"
      confirmAction="сохранить исход звонка и назначить перезвон"
    />
  )
}

/** Вернуть 199 ₽ (`gJdnV`). */
function RefundDialog() {
  return (
    <ConfirmDialog
      title="Вернуть 199 ₽"
      text="Ленская ул., 10 · раскрыто сегодня в 14:12. Причина возврата определяет срок: объективная закрывается сразу, субъективная в течение часа и считается в лимит."
      label="Причина: номер не существует · это посредник · объект продан · номер чужой"
      value="Это посредник, представился агентством"
      trace="Лимит субъективных возвратов: 5 из 12 за 30 дней. Когда лимит исчерпан, заявка уходит на ручной разбор, ответ приходит в тот же день."
      cancel="Отмена"
      cancelAction="закрыть диалог, заявку на возврат не отправлять"
      confirm="Отправить заявку"
      confirmAction="отправить заявку на возврат 199 ₽ за Ленскую ул., 10"
    />
  )
}

/** Ссылка для клиента (`nmULz`). */
function ClientLinkDialog() {
  return (
    <ConfirmDialog
      title="Ссылка для клиента"
      text="Подборка «Расселение, Лиговка» · шесть объектов. Клиент увидит фотографии, адрес, площадь и цену. Телефонов собственников на странице нет."
      label="Ссылка живёт"
      value="7 дней, до 3 августа"
      trace="Открытие ссылки не тратит деньги агентства и не считается раскрытием. Каждое открытие видно в журнале: когда и с какого устройства клиент смотрел подборку."
      cancel="Скопировать ссылку"
      cancelAction="скопировать ссылку на подборку «Расселение, Лиговка»"
      confirm="Отправить клиенту"
      confirmAction="отправить клиенту ссылку на подборку, срок 7 дней"
    />
  )
}

/** Кому виден сохранённый поиск: только мне или всему агентству. */
type SearchAuthor = "personal" | "agency"

/** Как часто сообщать о новых объектах по этому поиску. */
type SearchNotify = "instant" | "morning" | "off"

const NOTIFY_LABEL: Record<SearchNotify, string> = {
  instant: "сразу",
  morning: "раз в день утром",
  off: "не уведомлять",
}

/**
 * Сохранить поиск (`q7Yehb`).
 *
 * **Автор выбирается до сохранения, а не после.** «Личный» и «Агентства» —
 * это два разных места в сайдбаре и два разных круга людей. Переносить поиск
 * из личного в агентский потом было бы отдельной работой, а спросить сейчас
 * стоит одно нажатие.
 *
 * Оба ряда чипов переключаются по-настоящему: это выбор внутри диалога,
 * а не картинка выбора. Что именно сохранится, видно в имени действия
 * на кнопке — оно собирается из того, что выбрано.
 */
function SaveSearchDialog() {
  const [author, setAuthor] = useState<SearchAuthor>("personal")
  const [notify, setNotify] = useState<SearchNotify>("instant")

  return (
    <DialogCard rhythm="loose">
      <div className="flex w-full flex-col gap-1">
        <Typography variant="panelTitle" tone="default" as="h2">
          Сохранить поиск
        </Typography>
        <Typography variant="denseText" tone="dense">
          Красногвардейский, Невский, Калининский · 6–15 млн · не первый этаж · до 10 минут
          пешком
        </Typography>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Typography variant="columnHeader" tone="dense">
          Название
        </Typography>
        <div className="flex h-ctl-md w-full items-center rounded-lg border border-border-control bg-surface px-3">
          <Typography variant="uiText" tone="default">
            Красногвардейский 2-к до 15
          </Typography>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Typography variant="columnHeader" tone="dense">
          Автор
        </Typography>
        <div className="flex items-center gap-2">
          <SelectChip
            label="Личный"
            selected={author === "personal"}
            onClick={() => setAuthor("personal")}
          />
          <SelectChip
            label="Агентства"
            selected={author === "agency"}
            onClick={() => setAuthor("agency")}
          />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Typography variant="columnHeader" tone="dense">
          Уведомлять о новых
        </Typography>
        <div className="flex items-center gap-2">
          <SelectChip
            label="Сразу"
            selected={notify === "instant"}
            onClick={() => setNotify("instant")}
          />
          <SelectChip
            label="Раз в день утром"
            selected={notify === "morning"}
            onClick={() => setNotify("morning")}
          />
          <SelectChip
            label="Выключено"
            selected={notify === "off"}
            onClick={() => setNotify("off")}
          />
        </div>
      </div>

      <Typography variant="metaText" tone="dense">
        Личный поиск видите только вы. Поиск агентства появится в сайдбаре у всех
        сотрудников.
      </Typography>

      <div className="flex w-full items-center gap-2">
        <div className="h-px flex-1" />
        <Button variant="quiet" size="md" data-action="закрыть диалог, поиск не сохранён">
          Отмена
        </Button>
        <Button
          variant="primary"
          size="md"
          data-action={`сохранить поиск «Красногвардейский 2-к до 15»: ${
            author === "personal" ? "личный" : "поиск агентства"
          }, уведомлять ${NOTIFY_LABEL[notify]}`}
        >
          Сохранить поиск
        </Button>
      </div>
    </DialogCard>
  )
}

/**
 * Экспорт (`t0M9V9`).
 *
 * **Первая же строка объясняет, чего в файле не будет.** «Раскрытые контакты
 * в файл не попадают: это условие согласия собственников» — иначе человек
 * скачает файл, не найдёт телефонов и решит, что продукт сломался.
 */
function ExportDialog() {
  // Формат выгрузки — выбор внутри диалога, а не картинка выбора: кружок
  // переезжает на ту строку, по которой нажали, и в имени действия на кнопке
  // видно, какой файл уйдёт человеку.
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx")

  return (
    <DialogCard rhythm="medium">
      <div className="flex w-full flex-col gap-2">
        <Typography variant="panelTitle" tone="default" as="h2">
          Экспорт 12 объектов
        </Typography>
        <Typography variant="uiText" tone="secondary">
          Раскрытые контакты в файл не попадают: это условие согласия собственников. В файле
          адрес, цена, метраж, этаж, статус и кто из коллег работает с объектом.
        </Typography>
      </div>

      <div className="flex w-full flex-col gap-2">
        <FormatOption
          title="Таблица XLSX"
          note="Открывается в Excel и Google Таблицах"
          selected={format === "xlsx"}
          onSelect={() => setFormat("xlsx")}
        />
        <FormatOption
          title="CSV"
          note="Для импорта в свою CRM"
          selected={format === "csv"}
          onSelect={() => setFormat("csv")}
        />
      </div>

      <div className="flex w-full items-center gap-2">
        <div className="h-px flex-1" />
        <Button variant="quiet" size="md" data-action="закрыть диалог, файл не выгружать">
          Отмена
        </Button>
        <Button
          variant="primary"
          size="md"
          data-action={`выгрузить 12 объектов файлом ${format === "xlsx" ? "XLSX" : "CSV"}`}
        >
          Скачать файл
        </Button>
      </div>
    </DialogCard>
  )
}

/**
 * Формат выгрузки: кружок, название и для чего он.
 *
 * Остаётся `div` с ролью переключателя, а не становится кнопкой: у кнопки
 * подпись встаёт по центру, и обе строки — название и пояснение — уехали бы
 * от левого края. Клавиатура при этом работает как у настоящего переключателя:
 * пробел и Enter выбирают.
 */
function FormatOption({
  title,
  note,
  selected = false,
  onSelect,
}: {
  title: string
  note: string
  selected?: boolean
  onSelect?: () => void
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      data-slot="format-option"
      data-selected={selected || undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return
        // Пробел на переключателе выбирает, а не листает страницу.
        event.preventDefault()
        onSelect?.()
      }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border-control px-4 py-3",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        selected ? "bg-warm" : "bg-transparent",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-5 shrink-0 rounded-full border",
          selected ? "border-fg bg-fg" : "border-border-control bg-transparent",
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Typography variant="strongText" tone="default">
          {title}
        </Typography>
        <Typography variant="denseText" tone="secondary">
          {note}
        </Typography>
      </span>
    </div>
  )
}

/**
 * Стенд диалогов.
 *
 * Все восемь на одной странице, чтобы их можно было сверить с файлом разом.
 * В продукте они всплывают поверх экрана; здесь лежат в колонке — сверять
 * геометрию удобнее так, а поведение проверяется на живых экранах.
 */
export function DialogsPage() {
  return (
    <div className="flex min-h-svh w-full flex-col items-start gap-8 bg-bg p-6">
      <Typography variant="cardPrice" tone="default" as="h1">
        Диалоги кабинета
      </Typography>
      <DisclosureBulkDialog />
      <SelectionDialog />
      <CallResultDialog />
      <RefundDialog />
      <ClientLinkDialog />
      <SaveSearchDialog />
      <ExportDialog />
      <HotkeysDialog />
    </div>
  )
}
