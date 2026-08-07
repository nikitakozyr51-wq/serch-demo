import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"
import { MarketDeviation } from "./MarketDeviation"
import { OwnerAvatar } from "./OwnerAvatar"
import { OwnerSignal, type OwnerStrength } from "./OwnerSignal"
import { StatusChip, type ListingStatus } from "./StatusChip"

/**
 * Строка выдачи.
 *
 * Геометрия снята с компонента `jsW77` C Строка выдачи v2: ширина 908,
 * высота 88, зазор между блоками 32, поля [0, 16], заливка `surface`,
 * волосяная линия `line-2` снизу.
 *
 * Четыре блока с закреплёнными ширинами:
 *   объект        тянется
 *   собственник   132
 *   кто и статус  120
 *   действие      144
 *
 * **Строка двухстрочная, а не табличная.** Причина записана в DESIGN.md:
 * на 1440 в плоской таблице адресу остаётся 184 px — двадцать три знака
 * кириллицы, чего не хватает даже на «Новочеркасский пр., 47».
 *
 * Приглушать строку целиком нельзя. При непрозрачности 0.7 `text-dense`
 * превращается в цвет с контрастом 2,77 при норме 4,5, а зелёный бейдж
 * отклонения — 2,97. Приглушаются перечисленные узлы и только до `text-dense`
 * на своём фоне: мета, подпись публикаций, инициалы. Заголовок, цена, бейдж
 * отклонения и кнопка остаются в полную силу.
 */

/** Что можно сделать со строкой. Блокирующие состояния платной кнопки не получают никогда. */
type ListingAction =
  /** Контакт не оплачен: «Раскрыть · 199 ₽». Единственное платное действие строки. */
  | { kind: "disclose"; price: number }
  /** Агентство уже оплатило: повторное открытие стоит 0 ₽ и списания не делает. */
  | { kind: "open" }
  /**
   * Собственник в стоп-листе, отозвал согласие или по объекту оформлен возврат.
   *
   * `quiet` гасит подпись с `text-2` до `text-dense`. В файле так набрана ровно
   * одна из трёх плашек — «Контакт отозван». Правила, которое выводило бы этот
   * тон из смысла, в файле нет, поэтому он и передаётся строкой, а не считается.
   */
  | { kind: "blocked"; label: string; quiet?: boolean }

type ListingRowProps = {
  address: string
  /** Цена целиком, как в источнике: «8,6 млн ₽». Числа не выдумываются. */
  price: string
  /** Отклонение от медианы аналогов в процентах. */
  deviation: number
  /** Сколько времени назад объект появился: «14 минут назад». */
  freshness: string
  /** Метро, этаж, площадка: «Ладожская 6 мин · 4/9 · Авито». */
  meta: string
  strength: OwnerStrength
  publications: number
  platforms: number
  phones: number
  /** Инициалы коллеги, который взял объект. Пусто — никто не брал. */
  takenBy?: string
  status?: ListingStatus
  action: ListingAction
  /**
   * Выбранная строка. В файле она белая с рамкой 1 px графитом по всем сторонам,
   * а не тёплая: тёплая заливка занята блокирующим состоянием, и двум разным
   * смыслам один фон давать нельзя. Кнопка в выбранной строке остаётся тёмной —
   * красной её делает только наведение.
   */
  selected?: boolean
  onOpen?: () => void
  onAction?: () => void
}

/**
 * Блокирующее действие: «Просил не звонить», «Возврат оформлен», «Контакт отозван».
 *
 * Это плашка ровно тех же габаритов, что и кнопка — 144 × 32, радиус 8,
 * поля [0, 16], рамка `border-control`, подпись 14 весом 600. Раньше здесь стоял
 * голый текст 12/500, и колонка действия в трёх строках из девяти проваливалась.
 *
 * Кнопкой она при этом не является и не должна ею выглядеть на ощупь:
 * ни курсора, ни наведения, ни фокуса. Слот занят — но занят сообщением
 * о том, почему действия нет, а не выключенной кнопкой.
 *
 * **Поля 8, а не 16, и это осознанное расхождение с номиналом файла.**
 * В макете у плашки поля [0, 16], но подпись «Просил не звонить» шириной 121
 * в кадре 144 в эти поля не влезает и вылезает за них — то есть сам файл
 * здесь коллизится. Подпись отцентрована, поэтому нарисованный результат
 * совпадает с макетом до пикселя; отличается только номинальный отступ,
 * который в макете всё равно не соблюдён. Названо вслух, а не спрятано.
 */
function BlockedAction({ label, quiet }: { label: string; quiet?: boolean }) {
  return (
    <div
      data-slot="blocked-action"
      className="flex h-ctl-sm w-full items-center justify-center rounded-md border border-border-control px-2"
    >
      <Typography variant="controlLabel" tone={quiet ? "dense" : "secondary"}>
        {label}
      </Typography>
    </div>
  )
}

function ListingRow({
  address,
  price,
  deviation,
  freshness,
  meta,
  strength,
  publications,
  platforms,
  phones,
  takenBy,
  status,
  action,
  selected = false,
  onOpen,
  onAction,
}: ListingRowProps) {
  const blocked = action.kind === "blocked"

  return (
    <div
      data-slot="listing-row"
      data-selected={selected || undefined}
      data-blocked={blocked || undefined}
      // Открыть карточку можно у ЛЮБОГО объекта, включая тот, чей собственник
      // просил не звонить: просмотр ничего не стоит и ничего не нарушает, а
      // карточка как раз и объясняет, почему по этому объекту работать нельзя.
      // Запрет относится к действию — кнопка раскрытия остаётся выключенной.
      onClick={onOpen}
      className={cn(
        // Поле строки переключается плотностью само: 16 в просторном, 12
        // в плотном. Числом оно бы осталось просторным навсегда — так и было.
        "flex h-row-obj w-full items-center gap-8 px-cell",
        // Отклик на наведение и нажатие. Правило одно на все нажимаемые строки
        // кабинета и живёт в `index.css`: строка обязана темнеть под пальцем
        // раньше, чем сменится экран.
        //
        // Палец на заблокированной строке тоже курсор-указатель. Прежде его
        // там не было — и строка, у которой карточка открывается, выглядела
        // мёртвой. Запрет относится к раскрытию контакта, а не к просмотру.
        "row-tap cursor-pointer",
        // Три подложки, три разных смысла, и путать их нельзя:
        // белая — обычная строка, тёплая — блокирующее состояние,
        // белая с рамкой графитом — выбранная. Последняя строка списка
        // линии снизу не несёт: её край задаёт скругление панели.
        selected
          ? "border border-fg bg-surface"
          : cn("border-b border-line-2 last:border-b-0", blocked ? "bg-warm" : "bg-surface"),
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex w-full items-center gap-2">
          {/* Обрезки здесь нет и быть не может: в файле оба текста заданы
              с переносом, а DESIGN.md многоточие запрещает прямо. */}
          <div className="min-w-0 flex-1">
            <Typography variant="rowPrice" tone="default">
              {address}
            </Typography>
          </div>
          {/*
            Цена выключена вправо — в файле это текстовый блок с правой
            выключкой, поэтому колонка цен читается столбиком.

            **В плотном режиме клетка ШИРЕ, а не уже: 88 → 104.** Это
            единственное, чем плотная строка отличается от просторной по
            составу, и различие снято замером обоих кадров (`ghwPj` и
            `ZOB5K`). Причина видна на самих кадрах: поле строки падает
            с 16 до 12, и цена в 88 начинает касаться отклонения. Owner
            описал это как «текст слипается».

            Заодно отменяю то, что было записано в плане: «плотный режим
            сводит карточку в одну строку». Замер говорит обратное —
            в плотном кадре блок объекта те же 46 px в две строки, что
            и в просторном. Сжимается высота строки и поля, а не состав.
          */}
          <div className="flex w-22 shrink-0 justify-end compact:w-26">
            <Typography variant="rowPrice" tone="default">
              {price}
            </Typography>
          </div>
          <div className="w-16 shrink-0">
            <MarketDeviation percent={deviation} />
          </div>
        </div>
        <div className="flex w-full items-center gap-1.5">
          <Typography variant="metaText" tone="dense">
            {freshness}
          </Typography>
          <div className="min-w-0 flex-1">
            <Typography variant="metaText" tone="dense">
              {meta}
            </Typography>
          </div>
        </div>
      </div>

      <div className="w-33 shrink-0">
        <OwnerSignal
          strength={strength}
          publications={publications}
          platforms={platforms}
          phones={phones}
        />
      </div>

      <div className="flex w-30 shrink-0 items-center gap-3">
        <OwnerAvatar initials={takenBy} />
        {status ? <StatusChip status={status} /> : null}
      </div>

      {/* Колонка действия — 144, и содержимое занимает её целиком, а не жмётся
          по тексту: иначе подписи «Раскрыть · 199 ₽» и «Открыть · 0 ₽» встают
          на разной ширине и колонка перестаёт быть колонкой. */}
      <div className="flex w-36 shrink-0">
        {action.kind === "blocked" ? (
          <BlockedAction label={action.label} quiet={action.quiet} />
        ) : (
          <Button
            variant="row"
            size="sm"
            block
            onClick={(event) => {
              event.stopPropagation()
              onAction?.()
            }}
          >
            {action.kind === "disclose" ? `Раскрыть · ${action.price} ₽` : "Открыть · 0 ₽"}
          </Button>
        )}
      </div>
    </div>
  )
}

export { ListingRow }
export type { ListingRowProps, ListingAction }
