import { useNavigate, useSearch } from "@tanstack/react-router"
import { Check, Copy, Phone } from "lucide-react"
import { motion } from "motion/react"
import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { demoPhone, useOwnAgency, useSession, useSessionActions } from "@/features/auth"
import { useHotkeys } from "@/features/cabinet"
import { ListingPhoto, TitledBlock, groupDigits } from "@/features/listings"
import { notifyDone, notifyError } from "@/platform/notify"
import { Reveal, SPRING } from "@/platform/motion"
import { disclosureOf, formatMoment, useWorkspace, type Workspace } from "@/features/workspace"
import {
  AgeAndPriceBlock,
  ByPhotoBlock,
  CardColumns,
  CardHeading,
  CardMedia,
  CardShell,
  CardSourceRow,
  HouseBlock,
  WhyPriceBlock,
} from "./object-card-parts"

/**
 * КАБИНЕТ · Карточка объекта — контакт раскрыт.
 *
 * Снято с `NKj5L`: 1440 × 1448. От карточки до раскрытия отличается серединой
 * правой колонки и блоком похожих объектов внизу.
 *
 * **Экран показывает, что человек получил за 199 ₽,** и делает это в том
 * порядке, в каком это нужно агенту: сначала подтверждение списания с датой
 * и временем, потом номер и кнопка звонка, потом фиксация результата.
 *
 * Три вещи здесь не украшения, а обязательства продукта:
 *
 * **«Коллеги откроют этот контакт бесплатно»** — агентство платит за контакт
 * один раз, а не по числу сотрудников. Без этой строки руководитель не узнает,
 * что второй звонок ему ничего не стоит.
 *
 * **Рамка разговора под кнопкой звонка** — прямое требование закона: номер
 * получен для этого объекта, и разговор о других услугах агентства без согласия
 * собственника нарушает 152-ФЗ. Строка стоит там, где её прочитают, —
 * перед звонком, а не в пользовательском соглашении.
 *
 * **«Брак, вернуть 199 ₽» стоит рядом с обычными исходами**, а не прячется
 * в поддержке. Возврат — часть продукта, а не жалоба на него: если под номером
 * оказался посредник, деньги возвращаются в один клик.
 *
 * **Признаков собственника здесь нет, и это тоже решение файла.** До раскрытия
 * они отвечали на вопрос «стоит ли платить». Вопрос снят — блок ушёл, а его
 * место занял номер. Экран не копит блоки, он меняет их по задаче момента.
 *
 * **Первую колонку доказательств занимает «Как звонить».** Это то, ради чего
 * они и перестроены: до оплаты скрипт разговора бесполезен, после — становится
 * главным. Он не общий, а собран по этому объекту: «42 дня в выдаче и снижение
 * на 400 тыс ₽ сегодня: вероятно, важен срок, а не цена». И на два возражения,
 * которые агент услышит чаще всего, готовы ответы.
 *
 * **Это другой объект, а не то же самое после оплаты.** Здесь Ленская ул., 10
 * за 8,6 млн ₽ с отклонением −12 %; на нераскрытой карточке — Ленская ул., 6
 * за 8,8 млн ₽ и −10 %. Первая сборка переиспользовала числа первой карточки,
 * и экран противоречил сам себе: доказательства от одного объекта,
 * рамка разговора — от другого.
 */

/**
 * Чип фиксации результата.
 *
 * Был написан здесь руками, а потом тот же чип понадобился в режиме прозвона —
 * и оказалось, что это один контрол `maUSZ` из файла. Поднят в
 * `components/controls/SelectChip.tsx`; здесь остался только псевдоним,
 * чтобы экран читался своими словами.
 */
function ResultChip({
  label,
  hotkey,
  selected,
  onSelect,
}: {
  label: string
  hotkey: string
  selected: boolean
  onSelect: () => void
}) {
  return <SelectChip label={label} hotkey={hotkey} selected={selected} onClick={onSelect} />
}

/**
 * Строка скрипта: роль реплики и сама реплика.
 *
 * Роль стоит над текстом, а не рядом: агент читает её глазами на бегу,
 * во время разговора, и должен найти нужную реплику за долю секунды.
 */
function ScriptLine({ role, text }: { role: string; text: string }) {
  return (
    <div className="flex w-full flex-col gap-0.5">
      <Typography variant="metaText" tone="dense">
        {role}
      </Typography>
      <Typography variant="denseText" tone="secondary">
        {text}
      </Typography>
    </div>
  )
}

const SCRIPT = [
  {
    role: "Первая фраза",
    text: "«Здравствуйте, я по вашему объявлению на Ленской, 10. Звоню только по этому объекту.»",
  },
  {
    role: "Мотивация",
    text: "42 дня в выдаче и снижение на 400 тыс ₽ сегодня: вероятно, важен срок, а не цена.",
  },
  {
    role: "Если «я сам продам»",
    text: "Не прошу эксклюзив. Скажу, за сколько такие уходят рядом: 24 аналога в радиусе 700 м, медиана 9,8 млн ₽. Дальше решаете вы.",
  },
  {
    role: "Если «уже работаю с агентством»",
    text: "Тогда не отвлекаю. Один вопрос: показы уже были? Если через две недели не сдвинется, наберу ещё раз, если разрешите.",
  },
]

/** Номер собственника. Один на экран: он же в подписи, он же уходит в буфер. */
/**
 * Номер по умолчанию — тот, что нарисован в макете. В продукте номер
 * собирается из адреса объекта функцией `demoPhone`: у каждого объекта он
 * свой, и это видно, когда открываешь два подряд.
 */
const FALLBACK_PHONE = "+7 900 000-99-87"

/**
 * Номер, показанный не полностью: «+7 (9••) •••-••-87».
 *
 * Форма взята из кадра `JpcQn` («Контакт отозван собственником»), где маска
 * уже нарисована. Последние две цифры остаются: по ним агент узнаёт номер
 * в своей истории звонков, а позвонить по ним нельзя.
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  const tail = digits.slice(-2)
  return `+7 (9••) •••-••-${tail}`
}
const FALLBACK_ADDRESS = "Ленская ул., 10"

/**
 * Чем кончился звонок.
 *
 * Исход один, а не набор меток: разговор не может кончиться и отказом,
 * и браком сразу. Цифры — те самые горячие клавиши, что обещаны подписью
 * блока «клавиши 1 2 3 4», и они обязаны делать ровно то же, что мышь.
 */
const RESULTS = [
  { id: "in-work", label: "В работе", hotkey: "1" },
  { id: "called", label: "Прозвонен", hotkey: "2" },
  { id: "refused", label: "Отказ", hotkey: "3" },
  { id: "defect", label: "Брак, вернуть 199 ₽", hotkey: "4" },
] as const

type ResultId = (typeof RESULTS)[number]["id"]

const ANALOGUES = [
  { id: "nastavnikov", cells: ["Наставников пр., 34", "10,1 млн ₽", "180 тыс ₽/м²"], strongAt: 1 },
  { id: "lenskaya-6", cells: ["Ленская ул., 6", "8,8 млн ₽", "154 тыс ₽/м²"], strongAt: 1 },
  { id: "peredovikov", cells: ["Передовиков ул., 21", "9,8 млн ₽", "166 тыс ₽/м²"], strongAt: 1 },
]

const PRICE_HISTORY = [
  { id: "24-07", cells: ["24.07", "8,6 млн ₽", "снижение 400 тыс ₽"], strongAt: 1 },
  { id: "03-07", cells: ["03.07", "9,0 млн ₽", "снижение 200 тыс ₽"], strongAt: 1 },
  { id: "12-06", cells: ["12.06", "9,2 млн ₽", "первое наблюдение"], strongAt: 1 },
]

type SimilarObject = {
  id: string
  compared: string
  address: string
  meta: string
  why: string
  price: string
  deviation: string
  /** Зелёное — дешевле рынка, приглушённое — «≈ рынок». */
  cheaper: boolean
  /**
   * Что делает кнопка строки. `disclose` — контакт не оплачен, нажатие спишет
   * 199 ₽; `open` — агентство за этот номер уже платило, и открыть его стоит
   * ноль. Подпись кнопки выводится отсюда, а не хранится строкой: после
   * раскрытия она обязана смениться сама.
   */
  kind: "disclose" | "open"
}

/**
 * Похожие объекты — ПО ПРАВИЛУ, КОТОРОЕ БЛОК САМ ОБЪЯВЛЯЕТ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Подзаголовок блока говорит: «Та же комнатность, цена ±15 %. Район — в каждой
 * строке». Правило написано, а список под ним стоял тремя вписанными строками:
 * «Партизанская ул., 15», «Гражданский пр., 92», «Демьяна Бедного ул., 24» —
 * при любом открытом объекте. Кнопка «Показать все 3» при этом раскрывала
 * три из трёх, то есть не делала ничего.
 *
 * Теперь список считается по объявленному правилу от того объекта, который
 * открыт. Кадр `NKj5L` рисует три строки и слово «Все» — три и показываются,
 * остальные за кнопкой. Отдельный экран `OKo5j` («Похожие на Ленскую ул., 10»)
 * в файле нарисован и не собран; раскрытие на месте его не заменяет, и когда
 * он появится, кнопка станет ссылкой.
 *
 * Полей `compared` и `why` в базе нет и вывести их нельзя: «КУХНЯ И КУХНЯ» —
 * это редакторское сравнение двух планировок, а планировок в данных нет.
 * Вместо них стоит то, что база знает: чем этот объект отличается от открытого
 * по цене и площади. Придуманное сравнение было бы хуже честного.
 */
const SIMILAR_SPREAD = 0.15

function similarTo(address: string, workspace: Workspace): SimilarObject[] {
  const base = ALL_ROWS.find((item) => item.address === address)
  if (base === undefined) return []

  return ALL_ROWS.filter(
    (row) =>
      row.address !== base.address
      && row.rooms === base.rooms
      && Math.abs(row.priceValue - base.priceValue) <= base.priceValue * SIMILAR_SPREAD,
  ).map((row) => {
    const rubles = row.priceValue - base.priceValue
    const meters = row.area - base.area
    const money =
      rubles === 0
        ? "та же цена"
        : `${rubles < 0 ? "дешевле" : "дороже"} на ${groupDigits(Math.round(Math.abs(rubles) / 1000))} тыс ₽`
    const space =
      meters === 0 ? "та же площадь" : `${meters < 0 ? "меньше" : "больше"} на ${Math.abs(meters)} м²`

    return {
      id: row.address,
      compared: `${row.rooms}-КОМН · ${row.districtName.toUpperCase()}`,
      address: row.address,
      meta: `${row.districtName} · ${row.rooms}-комн · ${row.area} м² · ${row.floor}/${row.floors}`,
      why: `${money}, ${space}`,
      price: row.price,
      deviation: row.deviation === 0 ? "≈ рынок" : `${row.deviation > 0 ? "+" : "−"}${Math.abs(row.deviation)} %`,
      cheaper: row.deviation < 0,
      kind: disclosureOf(workspace, row.address) === undefined ? "disclose" : "open",
    }
  })
}


/**
 * Строка похожего объекта: 1152 × 114, зазор 20, поля [20, 0].
 *
 * Слева пара кадров с подписью, **чем именно похоже** — «КУХНЯ И КУХНЯ».
 * Это ядро продукта: похожесть считается по изображениям, и человек должен
 * видеть, что с чем сравнили, а не верить проценту на слово.
 */
function SimilarRow({
  item,
  paid,
  onAction,
}: {
  item: SimilarObject
  /** Контакт уже оплачен агентством: подпись кнопки становится «Открыть · 0 ₽». */
  paid: boolean
  onAction: () => void
}) {
  return (
    <div
      data-slot="similar-row"
      // Линия сверху и светлая, а не снизу и тёмная: строки разделены
      // так же, как ячейки мини-таблиц, — это список внутри карточки,
      // а не таблица выдачи.
      className="flex h-[114px] w-full items-center gap-5 border-t border-line-1 py-5 first:border-t-0"
    >
      <div className="flex w-42 shrink-0 flex-col gap-1.5">
        <Typography variant="columnHeader" tone="dense">
          {item.compared}
        </Typography>
        <div className="flex w-full gap-1.5">
          {[0, 1].map((index) => (
            <div key={index} className="h-13 w-[81px] shrink-0 overflow-hidden rounded-sm">
              <ListingPhoto alt={item.address} size="small" reason="no-photos" />
            </div>
          ))}
        </div>
      </div>

      {/*
        Адрес и цена в файле набраны кеглем 15, которого нет в закрытой лестнице
        проекта: файл здесь отступает от собственного правила. По решению
        владельца берётся ближайшая ступень — 16, та же, что у адреса везде
        в продукте. Расхождение названо, а не подогнано втихую.
      */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Typography variant="rowPrice" tone="default">
          {item.address}
        </Typography>
        <Typography variant="denseText" tone="dense">
          {item.meta}
        </Typography>
        <Typography variant="denseText" tone="secondary">
          {item.why}
        </Typography>
      </div>

      <div className="flex w-30 shrink-0 flex-col items-end gap-1">
        <Typography variant="rowPrice" tone="default">
          {item.price}
        </Typography>
        <Typography variant="numericDense" tone={item.cheaper ? "ok" : "dense"}>
          {item.deviation}
        </Typography>
      </div>

      {/*
        Ширина по содержимому: «Раскрыть · 199 ₽» шире, чем «Открыть · 0 ₽»,
        и в файле они разной ширины, а не выровнены по одной.

        Здесь была плашка-обманка: нарисованная кнопкой и не нажимаемая.
        Теперь это настоящая кнопка продукта — тот же графит, тот же радиус 8
        и та же подпись, но с наведением, фокусом и нажатием. Графитовая,
        а не красная: в списке похожих раскрытие не главное действие экрана,
        так записано в DESIGN.md.
      */}
      <Button variant="primary" size="sm" onClick={onAction}>
        {paid ? "Открыть · 0 ₽" : "Раскрыть · 199 ₽"}
      </Button>
    </div>
  )
}

export function ObjectCardDisclosedPage() {
  const navigate = useNavigate()
  const actions = useSessionActions()
  const session = useSession()

  /** Чем кончился звонок. Пока не отмечено — ни один чип не выбран. */
  const [result, setResult] = useState<ResultId | null>(null)

  /** За какие контакты агентство уже платило: у этих строк открытие стоит 0 ₽. */
  const opened = session?.disclosed ?? []

  /**
   * Какой объект раскрыт.
   *
   * Приходит параметром с нераскрытой карточки. Номер собирается из адреса,
   * поэтому у каждого объекта он свой — а не один на всю базу, как было.
   */
  const { at } = useSearch({ from: "/object/disclosed", shouldThrow: false }) ?? { at: undefined }
  const [allSimilar, setAllSimilar] = useState(false)
  const address = at ?? FALLBACK_ADDRESS
  const row = ALL_ROWS.find((item) => item.address === address)

  /**
   * НОМЕР ПОКАЗЫВАЕТСЯ ТОЛЬКО ЗА ЗАПИСЬ В ЖУРНАЛЕ.
   *
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Экран отдавал телефон собственника любому, кто набрал адрес руками:
   * агентство с нулём раскрытий и нулём списаний открывало
   * `/object/disclosed` и получало номер вместе с плашкой «списано 199 ₽».
   * Вся экономика продукта — 199 ₽ за контакт, — и это был способ обойти её
   * адресной строкой.
   *
   * Сервера за демонстрацией нет, поэтому дыра сегодня не про безопасность,
   * а про правду показа: экран утверждал списание, которого не было.
   *
   * **Стенд сверки исключение, и по той же причине, что у `useOwnAgency`.**
   * Экраны `/screen/…` обязаны показывать ЗАМЕРЕННУЮ карточку независимо
   * от того, что наработано, — иначе снимок для сверки с кадром меняется
   * после каждого раскрытия. `useOwnAgency()` отвечает ровно на вопрос
   * «это продукт, а не стенд», и второго источника правды тут не нужно.
   */
  const workspace = useWorkspace()
  /**
   * Похожие — от ОТКРЫТОГО объекта, по правилу подзаголовка блока.
   * Пересчитываются вместе с адресом: стрелки листают объекты, и похожие
   * обязаны меняться вместе с ними.
   */
  const similar = similarTo(address, workspace)
  const inProduct = useOwnAgency()
  const paid = disclosureOf(workspace, address)
  const hidden = inProduct && paid === undefined
  const phone = at ? demoPhone(address) : FALLBACK_PHONE

  /**
   * Отметка исхода.
   *
   * **«Брак» — не только метка.** Двумя строками выше экран обещает: «деньги
   * вернутся на баланс агентства», — и они действительно возвращаются,
   * счётчиком в шапке. Обещание, написанное над кнопкой и не выполненное
   * нажатием, — худшее, что может сделать демонстрация.
   *
   * **Возврат зовётся один раз, а проверяется не здесь.** Раньше защитой от
   * второго начисления служила память экрана: человек уходил в выдачу,
   * возвращался (повторное раскрытие того же адреса бесплатно) и получал
   * ещё 199 ₽ — и так сколько угодно раз. Память экрана не переживает
   * перехода, а журнал переживает, поэтому спрашивают теперь журнал.
   *
   * И раньше здесь звалось ПОПОЛНЕНИЕ, а не возврат: деньги возвращались,
   * но в журнал уходила строка «Картой», а список возвратов оставался пустым.
   */
  const choose = (id: ResultId) => {
    setResult(id)
    if (id !== "defect") return

    const outcome = actions.refund(address, "Ответил не собственник", false)
    if (outcome === "ok") notifyDone("Вернули 199 ₽ на счёт агентства")
    else if (outcome === "already") notifyError("За этот контакт возврат уже брали")
    else if (outcome === "limit")
      notifyError("Двенадцать спорных возвратов за месяц уже взяты — напишите в поддержку")
    else notifyError("Возврат оформляется за оплаченное раскрытие")
  }

  // Клавиши берутся из того же списка, что и чипы: разъехаться подписи
  // «клавиши 1 2 3 4» и настоящему обработчику здесь просто негде.
  useHotkeys(
    Object.fromEntries(RESULTS.map((item) => [item.hotkey, () => choose(item.id)] as const)),
  )

  /**
   * Копирование номера.
   *
   * Ничего не рисует: состояния «Скопировано» в файле нет, и придумывать его
   * я не имею права. Номер при этом действительно оказывается в буфере —
   * в этом и состоит работа кнопки.
   */
  const copyPhone = () => {
    void navigator.clipboard?.writeText(phone)
  }

  return (
    <CardShell position="1 из 247" address={address}>
      <div className="flex w-full gap-6">
        {/* Плашка «ещё N фото» не передаётся: снимков у объекта нет,
            и обещать их нечем. Вернётся вместе с настоящими фотографиями. */}
        <CardMedia address={address} />

        <div className="flex min-w-0 flex-1 flex-col">
          <CardHeading
            data={{
              price: row?.price ?? "8,6 млн ₽",
              deviation: row?.deviation ?? -12,
              perMeter: row
                ? `${Math.round(row.priceValue / row.area / 1000)} тыс ₽/м²`
                : "148 тыс ₽/м²",
              status: "in-progress",
              address: row ? `${row.address}${row.meta}` : "Ленская ул., 10 · 2-комн · 58 м² · 4/9 эт",
              metro: row
                ? `${row.metro} · ${row.districtName} район`
                : "Ладожская · 6 мин пешком · Красногвардейский район",
            }}
          />

          <div className="h-6" />

          {/*
            Подтверждение списания — ИЗ ЗАПИСИ ЖУРНАЛА.

            Стояло «Раскрыто тобой 24.07 в 14:12 · списано 199 ₽» вписанной
            строкой, то есть плашка подтверждала списание, которого могло
            не быть вовсе: агентство с нулём раскрытий видело её слово
            в слово. Плашка существует ровно затем, чтобы человек знал, за что
            с него взяли деньги, — и была единственным местом экрана, где
            эти деньги придумывались.
          */}
          <Reveal className="flex w-full items-center gap-2.5 rounded-lg bg-warm px-3.5 py-3">
            <Check aria-hidden className="size-4 shrink-0 text-ok-text" strokeWidth={2} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Typography variant="numericDense" tone="default">
                {hidden
                  ? "Контакт по этому объекту агентство не раскрывало"
                  : paid === undefined
                    ? "Раскрыто тобой 24.07 в 14:12 · списано 199 ₽"
                    : `Раскрыто ${paid.by === session?.name ? "тобой" : paid.by} ${formatMoment(paid.at)} · списано ${paid.amount} ₽`}
              </Typography>
              <Typography variant="metaText" tone="dense">
                {hidden
                  ? "Номер показан не полностью. Он откроется целиком после раскрытия: 199 ₽ спишутся со счёта агентства, и запись появится в журнале доступа."
                  : "Коллеги откроют этот контакт бесплатно. Если это оказался посредник, отметьте «Брак, вернуть 199 ₽» — деньги вернутся на баланс агентства."}
              </Typography>
            </div>
          </Reveal>

          <div className="h-6" />

          {/*
            Номер собственника — то, ради чего заплатили 199 ₽.

            ═══════════════════════════════════════════════════════════════

            Это главный кадр продукта, и до сих пор он просто возникал вместе
            со всем остальным. Здесь номер приезжает ПОСЛЕДНИМ и своим
            движением: чуть крупнее остальных блоков и с бóльшим отскоком —
            единственное место кабинета, где отскок уместен, потому что
            это единственное место, где что-то открывается.

            Задержка 0.12 против общего каскада — не «ещё один блок», а точка,
            в которую экран приходит.
          */}
          <Reveal className="flex w-full flex-col gap-2">
            <div className="flex w-full items-center gap-2.5">
              <motion.span
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...SPRING.enter, bounce: 0.34, delay: 0.12 }}
                className="origin-left"
              >
                <Typography variant="cardPrice" tone={hidden ? "dense" : "default"}>
                  {hidden ? maskPhone(phone) : phone}
                </Typography>
              </motion.span>
              <div className="h-px flex-1" />
              {hidden ? (
                // Дверь на месте, а не спрятана: человек попал сюда по адресу,
                // и ему нужен выход к раскрытию, а не пустое место.
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void navigate({ to: "/object", search: { at: address } })}
                >
                  Раскрыть контакт · 199 ₽
                </Button>
              ) : (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={copyPhone}
                  iconLeft={<Copy aria-hidden className="size-3.5" strokeWidth={2} />}
                >
                  Скопировать
                </Button>
              )}
            </div>

            {/* Звонок продукт не совершает: телефонии в «Сёрчи» нет, а номер
                в демонстрации из зарезервированного диапазона 900 — по нему
                физически некуда дозвониться. Кнопка названа `data-action`
                и ничего не рисует: подставить сюда фальшивое «Идёт вызов»
                значило бы соврать на самом важном экране продукта. */}
            {/*
              Нажатие делает ДВА дела сразу, и это решение владельца:
              «Открывать звонилку и сразу панель записи».

              Причина — в том, как идёт работа. Агент нажимает «Позвонить»,
              телефон начинает набор, и в этот момент он уже говорит.
              Искать после разговора, куда записать исход, поздно: половина
              звонков остаётся незафиксированной, и «Сегодня» врёт.

              `tel:` открывает звонилку системы; на компьютере без телефонии
              браузер просто ничего не сделает, и это честно — обещать
              несуществующую телефонию мы не можем. Панель записи открывается
              в любом случае: она и есть работа.
            */}
            <Button
              variant="primary"
              size="lg"
              block
              data-action="набрать номер собственника"
              onClick={() => {
                window.location.href = `tel:${phone.replace(/[^+\d]/g, "")}`
                void navigate({ to: "/call", search: { at: address } })
              }}
              iconLeft={<Phone aria-hidden className="size-4" strokeWidth={2} />}
            >
              Позвонить
            </Button>

            <Typography variant="metaText" tone="dense">
              Звони по объекту на Ленской, 10. Разговор о других услугах агентства
              без согласия собственника, нарушение ст. 15 152-ФЗ
            </Typography>
          </Reveal>

          <div className="h-6" />

          <Reveal className="w-full">
          <TitledBlock title="ЗАФИКСИРОВАТЬ ЗВОНОК" aside="клавиши 1 2 3 4">
            <div className="flex w-full flex-wrap items-center gap-2">
              {RESULTS.map((item) => (
                <ResultChip
                  key={item.id}
                  label={item.label}
                  hotkey={item.hotkey}
                  selected={result === item.id}
                  onSelect={() => choose(item.id)}
                />
              ))}
            </div>
          </TitledBlock>
          </Reveal>

          <div className="flex-1" />

          <CardSourceRow />
        </div>
      </div>

      <CardColumns
        columns={[
          <TitledBlock key="script" title="КАК ЗВОНИТЬ">
            <div className="flex w-full flex-col gap-2">
              {SCRIPT.map((line) => (
                <ScriptLine key={line.role} role={line.role} text={line.text} />
              ))}
            </div>
          </TitledBlock>,
          <div key="price" className="flex w-full flex-col gap-6">
            <WhyPriceBlock
              title="ПОЧЕМУ −12 % К РЫНКУ"
              reason="Медиана 24 аналогов в радиусе 700 м, 2-комн, 54–62 м², за 60 дней: 9,8 млн ₽. Этот объект: 8,6 млн ₽. Пересчитано сегодня в 06:00."
              rows={ANALOGUES}
            />
            <HouseBlock />
          </div>,
          <div key="age" className="flex w-full flex-col gap-6">
            <AgeAndPriceBlock
              days="42 дня в выдаче"
              median="медиана по городу 112 дней"
              rows={PRICE_HISTORY}
              honest="Наблюдаем с 12.06.2026 на Авито и Циан. Что было раньше, мы не знаем."
            />
            <ByPhotoBlock text="Те же фото найдены в 3 объявлениях. Все склеены в этот объект." />
          </div>,
        ]}
      />

      {/* Похожие объекты появляются только после раскрытия: пока контакт
          не открыт, агенту нечего с ними делать. Волосяная линия сверху
          отделяет их от доказательств — это другой разговор. */}
      <div className="flex w-full flex-col gap-4 border-t border-line-2 pt-8">
        <div className="flex w-full items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Typography variant="columnHeader" tone="dense">
              ПОХОЖИЕ ОБЪЕКТЫ
            </Typography>
            <Typography variant="denseText" tone="dense">
              Та же комнатность, цена ±15 %. Район — в каждой строке.
            </Typography>
          </div>
          {/* Списка всех похожих на десктопе в файле нет — есть только его
              мобильный близнец. Вести с большого экрана на мобильный адрес
              нельзя, выдумывать десктопный экран — тем более, поэтому
              действие названо и ничего не рисует. */}
          {/*
            Список раскрывается на месте, а не уводит на отдельный экран.

            В файле для этого нарисован кадр `КАБИНЕТ · Похожие на Ленскую
            ул., 10`, и он ещё не собран. Раскрытие на месте — не замена ему
            и не выдумка: те же строки, тот же порядок, просто без обрезки.
            Отдельный экран нужен, чтобы на похожие можно было прислать
            ссылку, и он появится вместе со своим адресом.
          */}
          {/*
            Кнопка раскрывает СПИСОК ДЛИННЕЕ ТРЁХ, иначе её нет.

            Здесь она стояла всегда и не делала ничего: в списке было ровно
            три строки, а свёрнутый вид показывал `slice(0, 3)` — те же три.
            Нажатие меняло подпись на «Свернуть» и больше ничего, а атрибут
            рядом обещал «показать все 8 похожих объектов».

            Список теперь считается по правилу, которое блок сам и объявляет
            строкой выше: та же комнатность, цена ±15 %. Значит и число
            в подписи настоящее, и раскрывать есть что.
          */}
          <button
            type="button"
            data-action={`показать все ${similar.length} похожих объектов`}
            onClick={() => setAllSimilar((was) => !was)}
            className="-mx-2 cursor-pointer rounded-sm bg-transparent px-2 py-0.5 transition-colors duration-120 outline-none hover:bg-warm active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="numericDense" tone="default">
              <>{allSimilar ? "Свернуть" : `Показать все ${similar.length}`}</>
            </Typography>
          </button>
        </div>

        <div className="flex w-full flex-col">
          {(allSimilar ? similar : similar.slice(0, 3)).map((item) => {
            const paid = item.kind === "open" || opened.includes(item.address)
            return (
              <SimilarRow
                key={item.id}
                item={item}
                paid={paid}
                onAction={() => {
                  // Оплаченный контакт открывается карточкой и не стоит ничего.
                  if (paid) {
                    void navigate({ to: "/object/disclosed" })
                    return
                  }
                  // Раскрытие отсюда — то же списание, что и на карточке объекта:
                  // 199 ₽ со счёта агентства, счётчик в шапке идёт вниз, а подпись
                  // кнопки сама становится «Открыть · 0 ₽». Никуда не уводим:
                  // человек смотрит список похожих и остаётся в нём.
                  if (actions.disclose(item.address) === "no-money") {
                    void navigate({ to: "/balance/top-up" })
                  }
                }}
              />
            )
          })}
        </div>
      </div>
    </CardShell>
  )
}
