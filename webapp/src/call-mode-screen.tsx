import { Copy, Phone, X } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/controls/Button"
import { Checkbox } from "@/components/controls/Checkbox"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { demoPhone, useSession, useSessionActions } from "@/features/auth"
import { useHotkeys } from "@/features/cabinet"
import { notifyDone, notifyError } from "@/platform/notify"
import {
  addToStopList,
  callQueue,
  recordCall,
  todayTally,
  useNow,
  useWorkspace,
  type CallOutcome,
} from "@/features/workspace"
import { MarketDeviation, OwnerAvatar, plural } from "@/features/listings"

/**
 * КАБИНЕТ · Режим «Прозвон».
 *
 * Снято с `pR6T1`: 1440 × 1024. **Ни шапки кабинета, ни сайдбара здесь нет** —
 * режим занимает окно целиком. Это не оплошность макета, а его суть: агент
 * идёт по списку подряд, и всё, что уводит в сторону, из окна убрано.
 * Выход — единственная дверь, слева вверху, с подписью «Esc».
 *
 * Панель 56 с полями [0, 20]; слева выход, название режима и источник списка,
 * посередине полоса прогресса «7 из 24», справа счёт дня. Тело делится
 * на объект 980 и панель фиксации 460 с волосяной линией между ними.
 *
 * **Панель фиксации — форма, которую заполняют во время разговора, а не после.**
 * Отсюда её устройство: чипы вместо полей, горячие клавиши на том, что жмут
 * каждый раз, значения по умолчанию «не спросил» вместо пустоты. «Обязательно»
 * стоит только у результата — остальное можно не заполнить, и это нормально.
 *
 * Собрано ровно как в файле по решению владельца. Его собственная заметка
 * `xoCxy` про время и фотографию оставлена в макете как есть и здесь не
 * учитывалась: правится она в файле, а не в коде.
 */

/** Полоса прогресса: трек 200 × 4 и заполнение по числу пройденных. */
function CallProgress({ done, total }: { done: number; total: number }) {
  const percent = Math.max(0, Math.min(100, Math.round((done / total) * 100)))

  return (
    <div
      data-slot="call-progress"
      role="img"
      aria-label={`${done} из ${total}`}
      className="h-1 w-50 overflow-hidden rounded-full bg-warm"
    >
      <span aria-hidden className="block h-full rounded-full bg-fg" style={{ width: `${percent}%` }} />
    </div>
  )
}

/** Факт об объекте: значение 14/600 и подпись 12/500 под ним. */
function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <Typography variant="controlLabel" tone="default">
        {value}
      </Typography>
      <Typography variant="metaText" tone="dense">
        {label}
      </Typography>
    </div>
  )
}

/**
 * Группа фиксации: метка капслоком, необязательное примечание справа
 * и один-два ряда чипов.
 *
 * **Ряды заданы явно, а не автопереносом.** В файле их разбивка нарисована
 * руками, и автоперенос дал бы другую: чипы разной ширины ложатся иначе.
 */
function FixGroup({
  title,
  note,
  rows,
}: {
  title: string
  /** Примечание красным справа от метки: «обязательно». */
  note?: string
  rows: ReactNode[]
}) {
  return (
    <div data-slot="fix-group" className="flex w-full flex-col gap-3">
      <div className="flex h-5 w-full items-center gap-2 pb-1">
        <Typography variant="columnHeader" tone="dense">
          {title}
        </Typography>
        {note === undefined ? null : (
          <Typography variant="metaStrong" tone="destructive">
            {note}
          </Typography>
        )}
      </div>
      {rows.map((row, index) => (
        <div key={index} className="flex w-full items-center gap-2">
          <>{row}</>
        </div>
      ))}
    </div>
  )
}

/**
 * Строка квалификации: только нижняя линия, метка слева, значение справа.
 *
 * Значение по умолчанию — **«не спросил»**, а не пустота. Пустое поле читается
 * как «данных нет», а «не спросил» говорит правду: вопрос не задавали.
 * Разница важна руководителю, который потом смотрит, о чём агент забывает.
 */
function QualificationField({ label, value }: { label: string; value: string }) {
  return (
    <div
      data-slot="qualification"
      className="flex h-ctl-md min-w-0 flex-1 items-center justify-between gap-2 border-b border-line-2"
    >
      <Typography variant="uiText" tone="dense">
        {label}
      </Typography>
      <Typography variant="uiText" tone="dense">
        {value}
      </Typography>
    </div>
  )
}

const DIAL = [
  ["Дозвонился", "Не взял трубку", "Автоответчик"],
  ["Номер не существует", "Попал не туда"],
]

const ANSWERED = ["Собственник", "Агент, посредник", "Родственник"]

const REMIND = [
  ["завтра", "через 3 дня", "через неделю"],
  ["через 2 недели", "через месяц", "дата и время"],
]

/**
 * Номер собственника. Вынесен в одно место, потому что его не только
 * показывают, но и копируют: два разных написания одного номера — это
 * ошибка, которую никто не заметит до звонка не тому человеку.
 */
/**
 * Адрес объекта прозвона.
 *
 * Живёт константой, потому что нужен в двух местах: на карточке слева
 * и в адресе выхода — `Esc` возвращает выдачу на эту строку.
 */
/** Объект по умолчанию — для стенда сверки, который открывает прозвон без списка. */
const OBJECT_ADDRESS = "Ленская ул., 10"

const PHONE = "+7 900 000-99-87"

export function CallModeScreenPage() {
  const navigate = useNavigate()
  const [result, setResult] = useState<string | null>("В работе")
  /** Заметка о звонке. Обнуляется вместе с панелью при переходе к следующему. */
  const [note, setNote] = useState("Третий заход. В 14:20 и 15:05 не взял трубку.")
  /**
   * Дозвон и кто снял трубку — по одному значению на группу: агент не мог
   * одновременно дозвониться и попасть на автоответчик.
   */
  const [dial, setDial] = useState<string | null>(null)
  const [answered, setAnswered] = useState<string | null>(null)
  /** Когда напомнить. В макете выбрано «дата и время» — с этого и начинаем. */
  const [remind, setRemind] = useState<string | null>("дата и время")
  /**
   * Просьба не звонить. Обратного хода нет — ровно так, как написано под самой
   * отметкой: номер уходит в стоп-лист агентства, и снять её не может никто.
   * В демонстрации она ведёт себя так же, иначе показ обещал бы неправду.
   */
  const [doNotCall, setDoNotCall] = useState(false)
  const [index, setIndex] = useState(0)

  /**
   * СПИСОК, ПО КОТОРОМУ ИДЁТ ПРОЗВОН.
   *
   * Раньше объект был один и тот же двадцать четыре раза: счётчик двигался,
   * полоса росла, а карточка слева не менялась никогда. Теперь список
   * настоящий — это раскрытые контакты, по которым ещё не звонили, плюс
   * назначенные на сегодня перезвоны. То есть ровно то, ради чего режим
   * и существует: пройти подряд то, за что заплачено.
   */
  const workspace = useWorkspace()
  const now = useNow()
  const session = useSession()
  const actions = useSessionActions()

  // Правило очереди живёт в `features/workspace`: по нему же «Сегодня»
  // решает, жива ли кнопка «Прозвон». Две копии разъехались бы на первой
  // правке, и кнопка вела бы в пустой режим.
  const queue = useMemo(() => callQueue(workspace, now), [workspace, now])

  /**
   * Позиция прижимается к длине очереди на каждой отрисовке.
   *
   * Очередь укорачивается прямо во время работы: записал исход — объект из
   * неё ушёл. Без этого счётчик показывал «2 из 1», а карточка — пустоту.
   */
  const position = queue.length === 0 ? 0 : Math.min(index, queue.length - 1)
  const address = queue[position] ?? OBJECT_ADDRESS
  const listing = ALL_ROWS.find((item) => item.address === address)
  const phone = queue.length === 0 ? PHONE : demoPhone(address)
  /**
   * Что записано по последнему звонку.
   *
   * **Теперь исход уходит в журнал по-настоящему.** Раньше он жил в состоянии
   * экрана и исчезал при уходе: агент отмечал «дозвонился», возвращался
   * в выдачу — и объект снова выглядел нетронутым. Журнал звонков появился,
   * и из него собираются «Сегодня», статус строки в выдаче и вся
   * эффективность.
   */
  const [recorded, setRecorded] = useState<string | null>(null)

  /**
   * Записать исход разговора.
   *
   * Заметка, кто ответил и назначенный перезвон уходят вместе с ним: они
   * отвечают на вопрос «на чём остановились», и порознь бесполезны.
   */
  const save = (outcome: CallOutcome, label: string) => {
    setRecorded(label)
    if (queue.length === 0) return

    recordCall({
      address,
      outcome,
      answered: answered ?? undefined,
      note: note.trim() || undefined,
      remindAt: outcome === "отложен" ? now + 24 * 60 * 60 * 1000 : undefined,
      by: session?.name ?? "",
    })

    // Просьба не звонить — необратима и уходит в стоп-лист агентства сразу,
    // а не «после сохранения»: между отметкой и записью человек может уйти
    // с экрана, и тогда просьба потеряется.
    if (doNotCall) addToStopList(address)
  }

  /**
   * Сохранить то, что выбрано чипом «РЕЗУЛЬТАТ», и уйти к следующему.
   *
   * ═══════════════════════════════════════════════════════════════════════
   *
   * Это главная кнопка экрана, и до этой правки она НЕ ЗАПИСЫВАЛА ЗВОНОК —
   * только перелистывала объект. Выглядело как сохранение: панель очистилась,
   * объект сменился. В журнале при этом не появлялось ничего, «Сегодня»
   * оставалось пустым, а объект продолжал висеть в «взяты в работу,
   * не прозвонены». Комментарий рядом уверял, что «хранилища за демонстрацией
   * нет», хотя журнал звонков к тому времени уже был написан и клавиши 2 и 3
   * им пользовались.
   *
   * **Исход берётся из чипа, а не из нажатой клавиши.** Иначе появлялось бы
   * два разных способа записать один звонок, дающих разные исходы: человек
   * выбирает «Отказ» мышью, жмёт большую кнопку — и в журнал уходит «в работе».
   */
  const OUTCOMES: Record<string, CallOutcome> = {
    "В работе": "в работе",
    Прозвонен: "дозвонился",
    Отказ: "отказ",
  }

  function saveAndNext() {
    const label = result ?? "В работе"
    save(OUTCOMES[label] ?? "в работе", label)
    goNext()
  }

  /**
   * К следующему объекту с чистой панелью.
   *
   * Панель обнуляется не «для порядка»: следующий звонок — другой человек,
   * и чужие отметки в форме превращаются в ложную запись о нём. Карточка
   * слева при этом не меняется: объект в макете один, и подменять его
   * выдуманными — врать про данные, которых в демонстрации нет.
   */
  function goNext() {
    setIndex((current) => Math.min(current + 1, Math.max(queue.length - 1, 0)))
    setDial(null)
    setAnswered(null)
    setResult("В работе")
    setNote("")
    setRemind("дата и время")
    setDoNotCall(false)
  }

  /**
   * Клавиатура прозвона.
   *
   * **После «2» и «3» — авто-переход к следующему объекту.** Агент делает
   * тридцать-пятьдесят звонков за смену, и лишнее нажатие «дальше» после
   * каждого — это тридцать-пятьдесят лишних нажатий. «1» перехода не даёт:
   * «в работе» значит, что с объектом ещё продолжат работать сейчас.
   *
   * **`Esc` возвращает в список, а не наверх.** Позиция передаётся адресом,
   * иначе агент после каждого звонка теряет место и ищет строку заново.
   */
  useHotkeys({
    "1": () => setResult("В работе"),
    /**
     * «2» и «3» переводят к следующему объекту **и обнуляют панель**.
     *
     * Раньше они двигали только счётчик: номер объекта менялся, а отметки
     * предыдущего звонка оставались в форме. Следующий звонок — другой
     * человек, и чужие отметки в его карточке превращаются в ложную запись
     * о нём. `goNext()` для того и написан, но эти два обработчика его
     * не звали.
     */
    // Клавиша двигает и чип тоже: чип — единственный источник исхода для
    // большой кнопки, и разойтись им нельзя. Иначе человек жмёт «3», видит
    // выбранным «В работе» и не понимает, что записалось.
    "2": () => {
      setResult("Прозвонен")
      save("дозвонился", "Прозвонен")
      goNext()
    },
    "3": () => {
      setResult("Отказ")
      save("отказ", "Отказ")
      goNext()
    },
    j: () => setIndex((current) => Math.min(current + 1, Math.max(queue.length - 1, 0))),
    k: () => setIndex((current) => Math.max(current - 1, 0)),
    /**
     * `N` открывает заметку — она обещана и в спеке, и в нарисованной карте
     * клавиш, а обработчика не было вовсе: единственная клавиша карты,
     * которая просто не существовала.
     *
     * Поле заметки живёт в панели фиксации, поэтому клавиша не «создаёт»
     * ничего нового, а ставит в него фокус — то же, что сделала бы мышь.
     */
    n: () => {
      const note = document.querySelector<HTMLElement>('[data-slot="call-note"]')
      note?.focus()
    },
    /**
     * `C` — «Скопировать номер». Клавиша названа в спеке свободной именно
     * под это действие, а кнопка «Скопировать» в панели уже работает.
     */
    c: () => {
      const copy = document.querySelector<HTMLButtonElement>('[data-key="c"]')
      copy?.click()
    },
    /**
     * `⏎` и `H` написаны на самих кнопках внизу панели, и до сих пор эти
     * подписи обещали то, чего не было. Панель фиксации — форма, а в форме
     * `Enter` значит «готово, дальше».
     *
     * Исключение — выход: когда человек дошёл до двери табом, `Enter` обязан
     * открыть её, а не сохранить звонок. Хук гасит собственное действие
     * браузера, поэтому нажатие возвращается руками.
     */
    Enter: () => {
      const focused = document.activeElement
      if (focused instanceof HTMLAnchorElement) {
        focused.click()
        return
      }
      saveAndNext()
    },
    /**
     * `H` — «Отложить»: объект уходит на потом, и агент идёт дальше.
     *
     * Отличается от «дальше» тем, что результат ставится «Отложен», а не
     * остаётся прежним: иначе в журнале звонок выглядел бы как «в работе»,
     * хотя человек его сознательно пропустил.
     */
    h: () => {
      save("отложен", "Отложен")
      goNext()
    },
    /**
     * `Esc` возвращает в выдачу **на то же место**.
     *
     * Адрес объекта уезжает параметром: выдача ставит на него курсор
     * и не заставляет искать строку заново. Без этого агент теряет позицию
     * после каждого звонка — на тридцатом это уже не мелочь.
     */
    Escape: () =>
      void navigate({
        to: "/search",
        search: { at: address },
      }),
  })

  return (
    <div className="flex h-svh w-full flex-col bg-bg">
      {/* Панель режима: своя, а не шапка кабинета — поля 20 против 24. */}
      <div
        data-slot="call-bar"
        data-last-result={recorded ?? undefined}
        className="flex h-header w-full shrink-0 items-center gap-4 border-b border-line-2 bg-surface px-5"
      >
        {/* Выход — ссылка, а не кнопка. Прозвон открывают из выдачи и в неё же
            возвращаются: ссылку можно открыть в новой вкладке, скопировать
            и вернуться назад браузером, а кнопка ничего этого не умеет.
            Тот же адрес даёт `Esc` — второй путь к той же двери. */}
        <Link
          to="/search"
          data-slot="call-exit"
          className="-mx-2 flex cursor-pointer items-center gap-2 rounded-sm bg-transparent px-2 py-0.5 text-text-2 transition-colors duration-120 outline-none hover:bg-warm active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <X aria-hidden className="size-4" strokeWidth={2} />
          <Typography variant="numericDense" tone="current">
            Выйти
          </Typography>
          <Typography variant="metaText" tone="dense">
            Esc
          </Typography>
        </Link>

        <span aria-hidden className="h-4.5 w-px bg-line-2" />

        <Typography variant="controlLabel" tone="default">
          Прозвон
        </Typography>
        <Typography variant="denseText" tone="dense">
          Красногвардейский · 2-к · 6–15 млн
        </Typography>

        <CallProgress done={index} total={24} />
        <Typography variant="numericDense" tone="default">
          {queue.length === 0 ? "нечего прозванивать" : `${position + 1} из ${queue.length}`}
        </Typography>

        <div className="h-px flex-1" />

        <div className="flex items-center gap-4">
          {[
            ["9", "звонков"],
            ["2", "диалога"],
            ["1", "встреча"],
          ].map(([value, label]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <Typography variant="numericDense" tone="default">
                {value}
              </Typography>
              <Typography variant="denseText" tone="dense">
                {label}
              </Typography>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Объект: один широкий кадр, факты в строку, номер и скрипт. */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-7">
          <div className="h-76 w-full shrink-0 rounded-2xl bg-line-1" />

          <div className="flex w-full flex-col gap-1.5">
            <div className="flex w-full items-center gap-3">
              <Typography variant="cardPrice" tone="default">
                8,6 млн ₽
              </Typography>
              <MarketDeviation percent={-12} />
              <Typography variant="denseText" tone="dense">
                148 тыс ₽/м² · медиана 24 аналогов в радиусе 700 м: 9,8 млн ₽
              </Typography>
            </div>
            <Typography variant="rowPrice" tone="default">
              {listing ? `${listing.address}${listing.meta}` : `${address} · 2-комн · 58 м² · 4/9 эт`}
            </Typography>
            <Typography variant="denseText" tone="dense">
              Ладожская · 6 мин пешком · Красногвардейский район
            </Typography>
          </div>

          <div className="flex h-10 w-full shrink-0 items-center gap-6">
            <Fact value="42 дня" label="в выдаче, медиана по СПб 112" />
            <span aria-hidden className="h-7.5 w-px shrink-0 bg-line-2" />
            <Fact value="3 · 2 · 1" label="публикации, площадки, номер" />
            <span aria-hidden className="h-7.5 w-px shrink-0 bg-line-2" />
            <Fact value="Средние" label="признаки собственника" />
            <span aria-hidden className="h-7.5 w-px shrink-0 bg-line-2" />
            <Fact value="24.07, 14:12" label="контакт раскрыт тобой, 199 ₽" />
          </div>

          {/* Кто уже касался: две попытки сегодня и почему второй раз
              деньги не спишутся. */}
          <div className="flex w-full shrink-0 items-center gap-2.5 rounded-lg bg-warm px-3.5 py-3">
            <OwnerAvatar initials="ИС" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Typography variant="numericDense" tone="default">
                Две попытки дозвона сегодня, обе без ответа
              </Typography>
              <Typography variant="metaText" tone="dense">
                14:20 и 15:05 · перезвон назначен на 16:00 · повторное списание невозможно
              </Typography>
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center gap-4">
            <Typography variant="cardPrice" tone="default">
              {phone}
            </Typography>
            {/*
              Звонок уходит в звонилку системы через `tel:`.

              Своего окна у звонка нет ни в макете, ни в продукте, и рисовать
              его здесь значило бы выдумать экран и обещать телефонию,
              которой у нас нет. `tel:` — не выдумка: это то, чем набирает
              сам телефон, и на компьютере без телефонии браузер честно
              ничего не сделает.

              Панель фиксации уже открыта — мы в ней и находимся, — поэтому
              второе действие решения владельца («и сразу панель записи»)
              здесь выполнено самим экраном.
            */}
            <Button
              variant="primary"
              size="lg"
              data-action="звонок собственнику"
              onClick={() => {
                window.location.href = `tel:${phone.replace(/[^+\d]/g, "")}`
              }}
              iconLeft={<Phone aria-hidden className="size-4" strokeWidth={2} />}
            >
              Позвонить
            </Button>
            {/*
              Обновление 04.08: «Скопировать» — вторичная вне строки списка,
              и класс у неё свой: 48 / r-control / 16, тёплая, без границы.
              Ранг в ряду несёт заливка, а не высота, поэтому она одной высоты
              с «Позвонить» и отличается только тем, что тёплая.
              Ширина не назначается, а вырастает из кегля и полей: 113 → 152.

              Кнопка кладёт номер в буфер обмена. Раньше на экране от этого не
              менялось ничего, и человек нажимал второй и третий раз, не понимая,
              сработало ли. Спека движения назвала это прямо: клавиша `C`
              вносится «вместе с тостом подтверждения». Сообщение и есть
              подтверждение — единственное место в прозвоне, где оно уместно.

              Отказ буфера (браузер без разрешения) больше не гасится молча:
              человек должен узнать, что номера у него нет, до того как начнёт
              его набирать по памяти. Режим прозвона при этом не падает.
            */}
            <Button
              variant="quiet"
              size="lg"
              data-key="c"
              data-action="номер скопирован"
              onPointerDown={() => {
                void navigator.clipboard
                  ?.writeText(phone)
                  .then(() => notifyDone("Номер скопирован"))
                  .catch(() => notifyError("Браузер не дал скопировать номер"))
              }}
              iconLeft={<Copy aria-hidden className="size-4" strokeWidth={2} />}
            >
              Скопировать
            </Button>
          </div>

          <div className="w-140 shrink-0">
            <Typography variant="metaText" tone="dense">
              Звони по объекту на Ленской, 10. Разговор о других услугах агентства
              без согласия собственника, нарушение ст. 15 152-ФЗ
            </Typography>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-4">
            <Typography variant="columnHeader" tone="dense">
              КАК ЗВОНИТЬ
            </Typography>
            <div className="flex w-full flex-col gap-3">
              {[
                [
                  "Первая фраза",
                  "«Здравствуйте, я по вашему объявлению на Ленской, 10. Звоню только по этому объекту.»",
                ],
                [
                  "Мотивация",
                  "42 дня в выдаче и два снижения цены, последнее сегодня на 400 тыс ₽: вероятно, важен срок, а не цена.",
                ],
                [
                  "Если «я сам продам»",
                  "«Понимаю. У меня 24 аналога в радиусе 700 метров за 60 дней, покажу цифры, дальше решайте сами.»",
                ],
                [
                  "Если «уже с агентством»",
                  "«Тогда не отвлекаю. Если договор закончится и объект останется, наберу через месяц, хорошо?»",
                ],
              ].map(([role, line]) => (
                <div key={role} className="flex w-full items-start gap-3">
                  <div className="w-35 shrink-0">
                    <Typography variant="metaText" tone="dense">
                      {role}
                    </Typography>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Typography variant="denseText" tone="secondary">
                      {line}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Панель фиксации: 460, заполняется по ходу разговора. */}
        <div
          data-slot="fix-panel"
          className="flex w-115 shrink-0 flex-col gap-6 overflow-y-auto border-l border-line-2 bg-surface px-5 pt-5 pb-4"
        >
          <div className="flex h-5 w-full items-center gap-2.5">
            <Typography variant="controlLabel" tone="default">
              Фиксация звонка
            </Typography>
            <div className="h-px flex-1" />
            <Typography variant="metaText" tone="dense">
              отмечай по ходу разговора
            </Typography>
          </div>

          {/* Выбор в группе один и не снимается пустотой: ошибся — нажми
              соседний чип. Пустая группа значит «не отмечал», и путать её
              с «отметил и передумал» руководителю ни к чему. */}
          <FixGroup
            title="ДОЗВОН"
            rows={DIAL.map((row) =>
              row.map((label) => (
                <SelectChip
                  key={label}
                  label={label}
                  selected={dial === label}
                  onClick={() => setDial(label)}
                />
              )),
            )}
          />

          <FixGroup
            title="КТО ОТВЕТИЛ"
            rows={[
              ANSWERED.map((label) => (
                <SelectChip
                  key={label}
                  label={label}
                  selected={answered === label}
                  onClick={() => setAnswered(label)}
                />
              )),
            ]}
          />

          {/* Единственная обязательная группа: без результата звонок
              не считается сделанным. */}
          <FixGroup
            title="РЕЗУЛЬТАТ"
            note="обязательно"
            rows={[
              [
                <SelectChip
                  key="1"
                  label="В работе"
                  hotkey="1"
                  selected={result === "В работе"}
                  onClick={() => setResult("В работе")}
                />,
                <SelectChip
                  key="2"
                  label="Прозвонен"
                  hotkey="2"
                  selected={result === "Прозвонен"}
                  onClick={() => setResult("Прозвонен")}
                />,
                <SelectChip
                  key="3"
                  label="Отказ"
                  hotkey="3"
                  selected={result === "Отказ"}
                  onClick={() => setResult("Отказ")}
                />,
              ],
            ]}
          />

          <FixGroup
            title="КВАЛИФИКАЦИЯ"
            rows={[
              [
                <QualificationField key="own" label="В собственности" value="не спросил" />,
                <QualificationField key="alt" label="Альтернатива" value="не спросил" />,
              ],
              [
                <QualificationField key="bargain" label="Готов к торгу" value="не спросил" />,
                <QualificationField key="show" label="Показывает" value="не спросил" />,
              ],
            ]}
          />

          {/* «дата и время» в продукте открывает календарь. Календаря в макете
              нет, поэтому чип просто выбирается — как и остальные пять. */}
          <FixGroup
            title="НАПОМНИТЬ"
            rows={REMIND.map((row) =>
              row.map((label) => (
                <SelectChip
                  key={label}
                  label={label}
                  selected={remind === label}
                  onClick={() => setRemind(label)}
                />
              )),
            )}
          />

          <div className="flex w-full flex-col gap-3">
            <div className="flex h-5 w-full items-center pb-1">
              <Typography variant="columnHeader" tone="dense">
                ЗАМЕТКА
              </Typography>
            </div>
            {/* Поле заметки залито фоном страницы, а не белым: оно вписано
                в панель, а не положено на неё.

                Поле настоящее, а не нарисованное: заметку пишут во время
                разговора, и клавиша `N` ставит в него фокус, не отрывая
                руку от клавиатуры. Нарисованный прямоугольник с текстом
                выглядел бы так же и не принимал бы ни буквы. */}
            <Typography asChild variant="denseText">
              <textarea
                data-slot="call-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={1}
                // Поле, а не коробка: линия снизу, ни заливки, ни рамки по
                // кругу, ни бокового отступа — правило формы от 05.08. Фокус
                // сказан самой линией: она становится графитовой и вдвое
                // толще, и высота от этого не едет.
                className="flex h-12 w-full resize-none border-0 border-b border-solid border-border-control bg-transparent py-2.5 text-text-dense outline-none transition-colors hover:border-text-2 focus-visible:border-b-2 focus-visible:border-fg"
              />
            </Typography>
          </div>

          <div className="h-px w-full bg-line-1" />

          {/*
            Особый исход отделён линией не для красоты: отметка уводит номер
            в стоп-лист всего агентства и снять её нельзя. Такое не ставят
            в один ряд с «перезвонить через неделю».
          */}
          <div className="flex w-full items-start gap-2.5">
            {/* Отметка ставится и не снимается: подпись под ней обещает именно
                это. Демонстрация, где галочку можно снять обратно, показывала
                бы не тот продукт, который потом придёт агентству. */}
            <Checkbox
              aria-label="Собственник просил не звонить"
              checked={doNotCall}
              onCheckedChange={(next) => {
                if (next) setDoNotCall(true)
              }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Typography variant="denseText" tone="secondary">
                Собственник просил не звонить
              </Typography>
              <Typography variant="metaText" tone="dense">
                номер уйдёт в стоп-лист всего агентства, снять отметку нельзя
              </Typography>
            </div>
          </div>

          {/*
            Возврат за брак живёт в диалоге «Вернуть 199 ₽» — те самые четыре
            причины. Диалог нарисован, но всплывает поверх этого экрана,
            а собственного адреса у него нет: `/dialogs` — стенд для сверки
            с макетом, и уводить туда агента посреди разговора нельзя.
            Поэтому действие названо и не рисует ничего.
          */}
          {/*
            Возврат оформляется НЕ УХОДЯ из разговора.

            Раньше кнопка уводила в журнал возвратов — а тот встречал человека
            надписью «возврат отмечается кнопкой в панели фиксации звонка», то
            есть отправлял ровно туда, откуда он пришёл. Кольцо замыкалось, а
            заметка, исход и «кто ответил» стирались: это память экрана, и уход
            с него её убивает.

            Причина здесь одна и объективная — «ответил не собственник»: она
            в лимит спорных возвратов не считается, и выбирать её незачем.
            Окно с четырьмя причинами в файле нарисовано, но места его вызова
            из прозвона в кадрах нет, и придумывать это место я не стал.
          */}
          <button
            type="button"
            onClick={() => {
              const outcome = actions.refund(address, "Ответил не собственник", true)
              if (outcome === "ok") notifyDone("Вернули 199 ₽ на счёт агентства")
              else if (outcome === "already") notifyError("За этот контакт возврат уже брали")
              else notifyError("Возврат оформляется за оплаченное раскрытие")
            }}
            // Возврат денег — действие, а не подпись, и оно молчало.
            // Заливка занимает ровно ширину строки: своего поля у контрола
            // нет, а добавлять его значило бы сдвинуть подпись с её места.
            className="flex w-full cursor-pointer items-center gap-2 rounded-sm bg-transparent transition-colors duration-120 outline-none hover:bg-warm active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="numericDense" tone="secondary">
              Брак, вернуть 199 ₽
            </Typography>
            <Typography variant="metaText" tone="dense">
              ответил не собственник
            </Typography>
          </button>

          <div className="flex-1" />

          {/*
            Обе кнопки внизу записывают звонок и переводят к следующему объекту
            с чистой панелью. Разница в исходе: «сохранить» пишет то, что
            выбрано чипом, «отложить» — «отложен», иначе отложенный объект
            остался бы в журнале «в работе», хотя человек его сознательно
            пропустил.

            Отклик на прижатие, а не на отпускание: подсветка нажатия у кнопки
            есть, и отставать от неё действие не должно.
          */}
          <div className="flex h-12 w-full shrink-0 items-center gap-2.5">
            <div className="flex min-w-0 flex-1">
              <Button
                variant="primary"
                size="lg"
                block
                onPointerDown={saveAndNext}
                iconRight={
                  <span className="opacity-70">
                    <Typography variant="metaText" tone="current">
                      ⏎
                    </Typography>
                  </span>
                }
              >
                Сохранить и к следующему
              </Button>
            </div>
            <Button
              variant="quiet"
              size="lg"
              onPointerDown={() => {
                save("отложен", "Отложен")
                goNext()
              }}
              iconRight={
                <Typography variant="metaText" tone="dense">
                  H
                </Typography>
              }
            >
              Отложить
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
