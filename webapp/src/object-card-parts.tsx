import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import { CabinetShell, useHotkeys } from "@/features/cabinet"
import { CollectionPicker } from "@/features/workspace"
import {
  CountPair,
  FactChip,
  FillBar,
  ListingPhoto,
  MarketDeviation,
  MiniTable,
  OwnerSignal,
  StatusChip,
  TitledBlock,
  type ListingStatus,
  type MiniTableRow,
  type OwnerStrength,
} from "@/features/listings"

/**
 * Общие части карточки объекта.
 *
 * Карточек две — до раскрытия (`Fo8gk`) и после (`NKj5L`), — и форма у них
 * общая. **Но это разные объекты, а не два состояния одного.** До раскрытия
 * показана Ленская ул., 6 за 8,8 млн ₽; после — Ленская ул., 10 за 8,6 млн ₽.
 * Первая сборка переиспользовала данные первой карточки на второй, и экран
 * сам себе противоречил: цифры от одного объекта, рамка разговора — от другого.
 *
 * Поэтому здесь живёт форма, а содержание приходит пропсами. Ни одного
 * зашитого числа: зашитое число рано или поздно уезжает на чужой экран.
 */

/**
 * Вторичное действие панели: подпись 14/600 и буква горячей клавиши 12/500.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Все четыре теперь работают.** Раньше они несли только атрибут
 * `data-action` — «вот что должно случиться, когда появится окно», — и
 * человек нажимал на них впустую. Владелец назвал это прямо: «ничего
 * не кликается».
 *
 * Окон для «Статуса», «Напомнить» и «Заметки» действительно нет: в файле
 * они спецификация, а не кадр. Но выдумывать их и не понадобилось — все
 * три поля уже существуют в панели фиксации звонка (`S4mya`), которая
 * нарисована и собрана. Кнопка ведёт туда, где это делается, а не
 * открывает вторую копию того же самого.
 *
 * «В подборку» — единственное, что происходит на месте: окно выбора
 * подборки нарисовано и собрано.
 */
function PanelAction({
  label,
  hotkey,
  action,
  onAction,
}: {
  label: string
  hotkey: string
  /** Что случится. Остаётся атрибутом: по нему проверка узнаёт действие. */
  action: string
  onAction: () => void
}) {
  return (
    <Button
      variant="quiet"
      size="sm"
      data-action={action}
      onClick={onAction}
      iconRight={
        <Typography variant="metaText" tone="dense">
          {hotkey}
        </Typography>
      }
    >
      {label}
    </Button>
  )
}

/**
 * Каркас экрана: шапка кабинета, сайдбар, панель карточки и прокручиваемое тело.
 *
 * Панель несёт позицию в списке и стрелки: карточка открыта из выдачи,
 * и вернуться в неё нужно, не потеряв место. Волосяная линия снизу обязательна —
 * без неё панель сливается с телом и перестаёт читаться как панель.
 */
function CardShell({
  position,
  address,
  children,
}: {
  position: string
  /**
   * Адрес объекта, которому принадлежит карточка.
   *
   * Без него действия панели не знают, к чему относятся: «В подборку»
   * добавила бы неизвестно что, а «Статус» открыл бы панель звонка
   * по чужому объекту.
   */
  address: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const session = useSession()
  const [collecting, setCollecting] = useState(false)

  /** Куда ведут «Статус», «Напомнить» и «Заметка»: панель фиксации звонка. */
  const openCallPanel = () => {
    void navigate({ to: "/call", search: { at: address } })
  }
  // Разбираем «9 из 247» на число и всё остальное: стрелки двигают позицию,
  // а не подпись. Позиция живёт в состоянии, потому что клавиша ← должна
  // делать ровно то же, что шаговая кнопка, — иначе это два разных продукта.
  const [index, setIndex] = useState(() => Number.parseInt(position, 10))
  const total = Number.parseInt(position.split(" из ")[1] ?? "0", 10)

  const step = (delta: number) =>
    setIndex((current) => Math.min(total, Math.max(1, current + delta)))

  /**
   * `←` и `→` листают текущий список, `Esc` возвращает в выдачу.
   *
   * **Esc возвращает на то же место, а не на верх списка.** Так записано
   * в спеке движения: агент, теряющий позицию после каждого объекта,
   * перестаёт пользоваться клавиатурой на втором десятке.
   */
  useHotkeys({
    ArrowLeft: () => step(-1),
    ArrowRight: () => step(1),
    Escape: () => void navigate({ to: "/search" }),
  })

  return (
    <CabinetShell activeId="search">
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div
            data-slot="card-panel"
            className="flex h-12 w-full shrink-0 items-center gap-4 border-b border-line-2 bg-surface px-6"
          >
            {/* «К выдаче» — ссылка, а не кнопка, и это не мелочь: выдачу
                открывают в соседней вкладке и возвращаются в неё кнопкой
                «назад». Кнопка ни того, ни другого не умеет. Esc делает
                то же самое с клавиатуры. */}
            <Link
              to="/search"
              className="flex cursor-pointer items-center gap-2 text-text-2 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <ArrowLeft aria-hidden className="size-4" strokeWidth={2} />
              <Typography variant="numericDense" tone="current">
                К выдаче
              </Typography>
            </Link>

            <span aria-hidden className="h-4.5 w-px bg-line-2" />

            <Typography variant="denseText" tone="dense">
              {index} из {total}
            </Typography>

            <div className="flex items-center gap-1">
              {[ChevronUp, ChevronDown].map((Icon, position) => (
                // Шаговая кнопка 28 × 28: рамка без заливки, только значок.
                // Это не кнопка действия — она не запускает ничего, а листает
                // список, как стрелки в плеере. Ступени контрола начинаются
                // с 32, и вписывать её туда — значит сломать обе.
                <button
                  key={position}
                  type="button"
                  data-slot="step-button"
                  aria-label={position === 0 ? "Предыдущий объект" : "Следующий объект"}
                  onPointerDown={() => step(position === 0 ? -1 : 1)}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-line-2 bg-transparent text-text-2 outline-none hover:bg-warm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg"
                >
                  <Icon aria-hidden className="size-3.5" strokeWidth={2} />
                </button>
              ))}
            </div>

            <div className="h-px flex-1" />

            <div className="flex items-center gap-2">
              <PanelAction
                label="В подборку"
                hotkey="B"
                action="добавить объект в подборку"
                onAction={() => setCollecting(true)}
              />
              <PanelAction
                label="Статус"
                hotkey="S"
                action="сменить статус объекта"
                onAction={openCallPanel}
              />
              <PanelAction
                label="Напомнить"
                hotkey="H"
                action="назначить перезвон"
                onAction={openCallPanel}
              />
              <PanelAction
                label="Заметка"
                hotkey="N"
                action="написать заметку по объекту"
                onAction={openCallPanel}
              />
            </div>
          </div>

          <div className="flex w-full flex-1 flex-col gap-8 p-6">{children}</div>
        </div>

        {collecting ? (
          <CollectionPicker
            address={address}
            by={session?.name ?? ""}
            onClose={() => setCollecting(false)}
          />
        ) : null}
    </CabinetShell>
  )
}

/**
 * Медиа: главный кадр 564 × 376 и четыре миниатюры 135 × 90.
 *
 * На четвёртой миниатюре стоит затемнение и плашка «ещё 12 фото» — иначе
 * человек считает, что кадров ровно пять, и не открывает остальные.
 *
 * Фотографий здесь нет намеренно. В макете стоят снимки со стока, а продукт
 * кадры не хранит: они живут ссылкой на площадку и исчезают вместе
 * с объявлением. Пока ссылок нет, слот показывает честную заглушку.
 */
function CardMedia({ more }: { more: string }) {
  return (
    <div className="flex w-[564px] shrink-0 flex-col gap-2">
      <div className="h-[376px] w-full overflow-hidden rounded-2xl">
        <ListingPhoto alt="Кадр объекта" size="large" reason="no-photos" />
      </div>
      <div className="flex w-full gap-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            data-slot="card-thumb"
            className="relative h-[90px] w-[135px] shrink-0 overflow-hidden rounded-2xl"
          >
            <ListingPhoto alt="Кадр объекта" size="medium" reason="no-photos" />
            {index === 3 ? (
              <>
                <span aria-hidden className="absolute inset-0 bg-fg/65" />
                <span className="absolute right-2.5 bottom-2.5 flex h-6 items-center rounded-sm bg-fg/80 px-2 text-surface">
                  <Typography variant="metaStrong" tone="current">
                    {more}
                  </Typography>
                </span>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

type CardHeadingData = {
  price: string
  deviation: number
  perMeter: string
  status: ListingStatus
  address: string
  metro: string
}

/**
 * Заголовок объекта: цена, отклонение, цена за метр, состояние, адрес и метро.
 * Чип состояния прижат к правому краю колонки распоркой — так в файле,
 * и так он читается как ярлык объекта, а не как часть строки цены.
 */
function CardHeading({ data }: { data: CardHeadingData }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-3">
        <Typography variant="cardPrice" tone="default">
          {data.price}
        </Typography>
        <MarketDeviation percent={data.deviation} />
        <Typography variant="denseText" tone="dense">
          {data.perMeter}
        </Typography>
        <div className="h-px flex-1" />
        <StatusChip status={data.status} />
      </div>
      <div className="flex w-full flex-col gap-1">
        <Typography variant="rowPrice" tone="default">
          {data.address}
        </Typography>
        <Typography variant="denseText" tone="dense">
          {data.metro}
        </Typography>
      </div>
    </div>
  )
}

type OwnerSignalsData = {
  strength: OwnerStrength
  publications: number
  platforms: number
  phones: number
}

/**
 * Признаки собственника: шкала с крупной оценкой и тройка антидубля.
 *
 * Тройка сгруппирована зазором 16 внутри себя и отделена от шкалы зазором 24:
 * это два разных высказывания, а не четыре равных элемента подряд.
 */
function CardOwnerSignals({ data }: { data: OwnerSignalsData }) {
  return (
    <TitledBlock title="ПРИЗНАКИ СОБСТВЕННИКА">
      <div className="flex w-full items-center gap-6">
        <OwnerSignal
          strength={data.strength}
          publications={data.publications}
          platforms={data.platforms}
          phones={data.phones}
          place="card"
        />
        <div className="flex items-center gap-4">
          <CountPair value={String(data.publications)} label="объявления" />
          <CountPair value={String(data.platforms)} label="площадки" />
          <CountPair value={String(data.phones)} label="номер" />
        </div>
      </div>
    </TitledBlock>
  )
}

/**
 * Строка источника данных: обведённый контрол 40 с радиусом 10.
 *
 * Шеврон обещает раскрытие, но раскрытого состояния в файле нет: шесть полей
 * по ст. 18 ч. 3 152-ФЗ там названы числом, а не перечислены. Сочинять их
 * я не стал — юридический текст выдумывать нельзя тем более. Действие названо
 * `data-action` и ничего не рисует, пока состав полей не придёт из файла.
 */
function CardSourceRow() {
  return (
    <div
      data-action="раскрыть состав полей источника данных"
      className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line-2 px-3.5"
    >
      <Typography variant="numericDense" tone="default">
        Источник данных
      </Typography>
      <Typography variant="metaText" tone="dense">
        шесть полей по ст. 18 ч. 3 152-ФЗ
      </Typography>
      <div className="h-px flex-1" />
      <ChevronDown aria-hidden className="size-4 text-text-dense" strokeWidth={2} />
    </div>
  )
}

/** Блок «почему такая цена»: основание словами и таблица аналогов. */
function WhyPriceBlock({ title, reason, rows }: { title: string; reason: string; rows: MiniTableRow[] }) {
  return (
    <TitledBlock title={title}>
      <div className="flex w-full flex-col gap-4">
        <Typography variant="denseText" tone="secondary">
          {reason}
        </Typography>
        <MiniTable
          columns={[
            { head: "АНАЛОГ", width: "w-[174px]" },
            { head: "ЦЕНА", width: "w-[78px]" },
            { head: "₽/М²", width: "w-23" },
          ]}
          tones={["secondary", "dense", "dense"]}
          rows={rows}
        />
      </div>
    </TitledBlock>
  )
}

/** Блок «сколько висит и как менялась цена». */
function AgeAndPriceBlock({
  days,
  median,
  rows,
  honest,
}: {
  days: string
  median: string
  rows: MiniTableRow[]
  honest: string
}) {
  const daysNumber = Number.parseInt(days, 10)
  const medianNumber = Number.parseInt(median.replace(/\D+/g, ""), 10)

  return (
    <TitledBlock title="СРОК В ВЫДАЧЕ И ИСТОРИЯ ЦЕНЫ">
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full items-center gap-2.5">
            <Typography variant="controlLabel" tone="default">
              {days}
            </Typography>
            <Typography variant="metaText" tone="dense">
              {median}
            </Typography>
          </div>
          <FillBar filled={daysNumber} total={medianNumber} />
        </div>
        <div className="h-2" />
        <MiniTable
          columns={[
            { head: "ДАТА", width: "w-12" },
            { head: "ЦЕНА", width: "w-[78px]" },
            { head: "ЧТО ИЗМЕНИЛОСЬ", width: "w-[218px]" },
          ]}
          tones={["dense", "dense", "secondary"]}
          rows={rows}
          lastLine
        />
        {/* Ритм до честной строки 8, а не 16: она продолжает таблицу,
            а не начинает новый блок. */}
        <div className="h-2" />
        <Typography variant="metaText" tone="dense">
          {honest}
        </Typography>
      </div>
    </TitledBlock>
  )
}

const HOUSE_FACTS = [
  "1969 год",
  "панельный",
  "серия 1-ЛГ-602",
  "9 этажей",
  "лифт есть",
  "мусоропровод есть",
]

/** Блок «что за дом»: чипы фактов из ГИС ЖКХ и кто обслуживает. */
function HouseBlock() {
  return (
    <TitledBlock title="ДОМ · ГИС ЖКХ, БЕЗ ПЕРСОНАЛЬНЫХ ДАННЫХ">
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full flex-wrap gap-2">
          {HOUSE_FACTS.map((fact) => (
            <FactChip key={fact} label={fact} />
          ))}
        </div>
        <Typography variant="metaText" tone="dense">
          УК «Ржевка-сервис» · данные обновлены 18.07.2026
        </Typography>
      </div>
    </TitledBlock>
  )
}

/** Блок «по фото»: как склеены дубли. */
function ByPhotoBlock({ text }: { text: string }) {
  return (
    <TitledBlock title="ПО ФОТО">
      <Typography variant="denseText" tone="secondary">
        {text}
      </Typography>
    </TitledBlock>
  )
}

/**
 * Три колонки доказательств шириной 368 с волосяными разделителями
 * фиксированной высоты 328 в промежутках.
 *
 * **Состав колонок задаётся снаружи**, потому что он разный на двух карточках:
 * до раскрытия это «почему цена», «срок и история», «дом» + «по фото»;
 * после раскрытия первую колонку занимает «как звонить», и остальное
 * пересобирается вокруг неё. Скрипт разговора — то, ради чего доказательства
 * и перестроены: до оплаты он бесполезен, после становится главным.
 */
function CardColumns({ columns }: { columns: ReactNode[] }) {
  return (
    <div className="relative flex w-full gap-6">
      {columns.map((column, index) => (
        <div key={index} className="flex w-[368px] shrink-0 flex-col gap-6">
          <>{column}</>
        </div>
      ))}
      <span aria-hidden className="absolute top-0 left-[380px] h-82 w-px bg-line-1" />
      <span aria-hidden className="absolute top-0 left-[772px] h-82 w-px bg-line-1" />
    </div>
  )
}

export {
  AgeAndPriceBlock,
  ByPhotoBlock,
  CardColumns,
  CardHeading,
  CardMedia,
  CardOwnerSignals,
  CardShell,
  CardSourceRow,
  HouseBlock,
  PanelAction,
  WhyPriceBlock,
}
export type { CardHeadingData, OwnerSignalsData }
