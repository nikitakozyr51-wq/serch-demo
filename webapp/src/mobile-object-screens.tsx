import { Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router"
import { ArrowLeft, Ban, ChevronRight, LockOpen, MapPin, Phone, PhoneOff } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useState } from "react"
import type { MouseEvent, ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { DISCLOSURE_PRICE, useSession, useSessionActions } from "@/features/auth"
import {
  MobileBottomNav,
  MobileEmptyState,
  MobileHeader,
  MobileSectionHeader,
  PhoneFrame,
} from "@/features/cabinet"
import {
  ListingPhoto,
  photoFor,
  photosFor,
  MarketDeviation,
  PhotoViewer,
  SimilarRow,
  StatusChip,
  type ListingStatus,
} from "@/features/listings"
import { useWorkspace } from "@/features/workspace"
import { notifyDone, notifyError } from "@/platform/notify"
import { maskedPhone } from "@/lib/demo-phone"
import { cn } from "@/lib/utils"
import { PhoneSheet } from "./phone-sheet"

/**
 * МОБАЙЛ · Объект и похожие — девять экранов одной ветки.
 *
 * Ветка начинается строкой выдачи и кончается решением: звонить или нет.
 * Карточка объекта до раскрытия продаёт контакт, после раскрытия отдаёт номер,
 * похожие подставляют замену, когда этот объект не подошёл или уже занят.
 *
 * Четыре из девяти — не карточка, а ответ «работать нельзя» или «вот почему
 * цена такая»: `OPyW3` контакт отозван, `b9LMVr` стоп-лист, `Xea2j` объект
 * снят с продажи, `EdWNY` дубли объекта и откуда цена.
 *
 * **На телефоне у карточки объекта нет нижней навигации.** Она заменена липкой
 * панелью с одним действием: пока человек внутри объекта, переключаться некуда,
 * а панель держит под большим пальцем то единственное, ради чего он сюда зашёл.
 * На экранах-списках («Похожие», «Разобрано коллегами») навигация возвращается:
 * там человек уже не внутри объекта, а снова выбирает.
 */

/**
 * Отклик приходит по `pointerdown`, а не по `click`.
 *
 * Между нажатием и щелчком на телефоне лежит больше сотни миллисекунд, и палец
 * за это время успевает решить, что контрол не сработал. Щелчок остаётся ради
 * клавиатуры: браузер шлёт его с `detail === 0`, и только такой обрабатывается
 * вторым — иначе мышь считалась бы дважды.
 */
function pressProps(onPress: () => void) {
  return {
    onPointerDown: onPress,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (event.detail === 0) onPress()
    },
  }
}


/**
 * Шапка возврата: 56, поля [0, 16], зазор 8, стрелка 18 и подпись 14/600
 * вторичным цветом.
 *
 * **Это не `MobileSectionHeader`.** У шапки раздела заголовок 20/600 графитом —
 * она называет, где человек находится. Здесь подпись мельче и приглушена,
 * потому что называет не это место, а то, **куда вернуться**: «К списку»,
 * «Ленская ул., 10». Разница смысловая, а не декоративная, и в файле она
 * нарисована двумя разными шапками.
 */
/** Куда возвращает шапка. Адресов ровно два — других выходов у ветки нет. */
type BackTarget = "/m/search" | "/m/object"

function ObjectBackBar({
  label,
  to,
  status,
}: {
  label: string
  /** Адрес возврата. Подпись его называет словами: «К списку», «Ленская ул., 10». */
  to: BackTarget
  /** Ярлык объекта справа. На экране списка похожих его нет. */
  status?: ListingStatus
}) {
  return (
    <header
      data-slot="mobile-back-bar"
      className="flex h-header w-full shrink-0 items-center gap-2 border-b border-line-2 bg-surface px-4"
    >
      {/* Стрелка и подпись — одна цель нажатия, а не две: в файле они стоят
          вплотную и читаются как один возврат. Высота цели 20 против пола 44 —
          расхождение с файлом названо в отчёте, геометрия оставлена как в нём.

          Возврат — ссылка, а не кнопка: подпись называет конкретное место,
          и человек вправе открыть его в новой вкладке. */}
      <Link
        to={to}
        data-slot="mobile-back"
        // Возврат — самый нажимаемый контрол ветки объекта, и он молчал.
        // Подложка появляется только под пальцем, поле гасится отрицательным
        // на ту же величину: подпись стоит там же, где в макете.
        className="-mx-2 flex shrink-0 cursor-pointer items-center gap-2 rounded-md bg-transparent px-2 py-1 text-text-2 transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        <ArrowLeft aria-hidden className="size-4.5" strokeWidth={2} />
        <Typography variant="controlLabel" tone="current">
          {label}
        </Typography>
      </Link>

      {status === undefined ? null : (
        <>
          <div className="h-px flex-1" />
          <StatusChip status={status} tall />
        </>
      )}
    </header>
  )
}

/**
 * Липкая панель действия: поля [12, 16, 24, 16], зазор 10.
 *
 * Нижнее поле 24 против верхнего 12 — под панелью системная полоса жеста,
 * и кнопка, прижатая к краю, ловилась бы вместе с ней.
 *
 * Волосяная линия сверху нарисована внутренней тенью, а не рамкой: в файле
 * обводка идёт внутрь и высоту панели не меняет, рамкой панель стала бы 85.
 * Это линия, а не глубина, — запрет теней не нарушен.
 */
function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      data-slot="mobile-action-bar"
      className="flex w-full shrink-0 items-center gap-2.5 bg-surface px-4 pt-3 pb-6 shadow-[inset_0_1px_0_var(--line-2)]"
    >
      <>{children}</>
    </div>
  )
}

/**
 * Кнопка «Статус» в липкой панели: 44, радиус 8, тёплая заливка.
 *
 * Собрана руками, а не вариантом `Button`: лестница кнопок закрыта тремя
 * ступенями 32 / 40 / 48, а здесь нарисована 44. На телефоне 44 — пол касания,
 * и файл ставит вторичное действие ровно на него, не поднимая до 48,
 * чтобы оно не спорило с главным.
 *
 * **Ведёт в панель фиксации звонка** — туда, где статус и ставится.
 *
 * Отдельного листа со списком статусов на телефоне в файле нет, и выдумывать
 * его не понадобилось: панель фиксации нарисована, собрана и уже содержит
 * и статус, и заметку, и перезвон. Вторая форма для того же самого означала
 * бы два способа отметить один звонок — и два расходящихся журнала.
 *
 * Раньше кнопка была нарисована и молчала.
 */
function StatusButton({ address }: { address: string }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      data-action="сменить статус объекта"
      onClick={() => void navigate({ to: "/m/call", search: { at: address } })}
      data-slot="mobile-status-button"
      className="flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-warm px-4 transition-colors duration-120 outline-none active:bg-warm-press focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <Typography variant="controlLabel" tone="default">
        Статус
      </Typography>
    </button>
  )
}

/**
 * Кадр объекта 220 во всю ширину со счётчиком «1 / 5».
 *
 * Фотографий продукт не хранит — кадр живёт ссылкой на площадку и исчезает
 * вместе с объявлением, — поэтому слот показывает честную заглушку, как
 * на карточке объекта в вебе.
 *
 * Счётчик обязателен: без него человек считает, что кадр один, и не листает.
 */
function ObjectPhoto({ address }: { address: string }) {
  const shots = photosFor(address, 12)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative h-55 w-full shrink-0">
      {/*
        Кадр нажимается, и это не украшение: счётчик под ним прямо говорит,
        что кадров больше одного. Пока нажатия не было, счётчик обещал листание,
        которого не существовало, — и обещал его на телефоне, где листают
        пальцем по самому снимку, а не мышью по стрелке.

        Счётчик считает по настоящей пачке, а не по числу «5» из макета:
        число в макете было образцом, а не фактом.
      */}
      <button
        type="button"
        data-slot="mobile-photo"
        aria-label={`Открыть кадры объекта ${address}`}
        disabled={shots.length === 0}
        onClick={() => setOpen(true)}
        className="size-full cursor-pointer bg-transparent p-0 outline-none disabled:cursor-default focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg"
      >
        <ListingPhoto src={photoFor(address)} alt={address} size="large" reason="no-photos" />
      </button>
      {shots.length === 0 ? null : (
        <span
          data-slot="mobile-photo-counter"
          className="pointer-events-none absolute right-3 bottom-3 flex items-center rounded-md bg-fg/80 px-2.5 py-1 text-surface"
        >
          <Typography variant="numericMeta" tone="current">
            {`1 / ${shots.length}`}
          </Typography>
        </span>
      )}
      {open ? (
        <PhotoViewer
          shots={shots}
          startAt={0}
          address={address}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}

/**
 * Карта как одно нажатие: 132, радиус 16, тёплая плашка с волосяной рамкой.
 *
 * Настоящей карты на телефоне нет — она съела бы половину экрана ради того,
 * что человек и так знает. Вместо неё плашка, которая уводит в маршрут.
 *
 * Маршрут строит телефон, а не продукт: это переход в чужое приложение,
 * и экрана под него в макете нет. Действие названо и ничего не рисует.
 */
function ObjectMap({ label, address }: { label: string; address: string }) {
  return (
    <button
      type="button"
      data-action="открыть маршрут в картах"
      // Маршрут строит телефон, а не продукт: `geo:` — стандартная ссылка,
      // которую система отдаёт установленным картам. Своего экрана карт
      // у продукта нет и быть не должно — это чужое приложение, и делать
      // его копию значило бы соревноваться с Яндексом в картах.
      //
      // Раньше кнопка была нарисована и молчала. Владелец назвал это
      // «ничего не кликается», и был прав: карта, которая не открывается,
      // хуже её отсутствия.
      onClick={() => {
        window.location.href = `geo:0,0?q=${encodeURIComponent(`Санкт-Петербург, ${address}`)}`
      }}
      data-slot="mobile-object-map"
      className="flex h-33 w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-line-2 bg-warm transition-colors duration-120 outline-none active:bg-warm-press focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <MapPin aria-hidden className="size-5 text-text-2" strokeWidth={2} />
      <Typography variant="numericDense" tone="secondary">
        {label}
      </Typography>
    </button>
  )
}

/**
 * Что уже было с этим объектом: поля 12, зазор 4, радиус 10, тёплая плашка.
 *
 * Верхняя строка — вывод, нижняя — основание. Именно в таком порядке:
 * агент читает первую строку и решает, звонить ли, а вторая нужна только тем,
 * кто усомнился.
 */
function TouchBlock({ headline, detail }: { headline: string; detail: string }) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-1 rounded-lg bg-warm p-3">
      <Typography variant="numericDense" tone="default">
        {headline}
      </Typography>
      <Typography variant="metaText" tone="dense">
        {detail}
      </Typography>
    </div>
  )
}


/* ────────────────────────────────────────────────────────────────────────────
   Объект, по которому работать нельзя: `OPyW3` и `b9LMVr`
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Экран вместо карточки: значок, заголовок, объяснение, один выход.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Снято с `OPyW3` и `b9LMVr`, нарисованных одним скелетом: шапка 56
 * с заголовком «Объект», тело 716 с содержимым по центру (значок 32,
 * заголовок 20/600, объяснение 14/500, действие 48 — зазор 16 между всеми
 * четырьмя, поля [32, 24]), нижняя навигация 72 с подсвеченным «Поиском».
 *
 * Это ровно компонент `I4XYhB` («C Экран-состояние, телефон»), уже собранный
 * как `MobileEmptyState`, — поэтому здесь оболочка, а не вторая копия
 * пустого состояния.
 *
 * **Это состояние КАРТОЧКИ, а не отдельный адрес.** На компьютере то же самое
 * нарисовано колонкой действия (`JpcQn`, `vEqRl`): карточка остаётся,
 * а платная кнопка в ней заменяется объяснением. На 390 колонки нет, объяснять
 * поверх карточки нечем, и файл заменяет весь экран. Смысл один: человек
 * пришёл к объекту и должен узнать, почему по нему нельзя работать, — и это
 * то самое обещание, которое выдача уже даёт («карточка открывается у любого
 * объекта, включая объект из стоп-листа»).
 *
 * **Шапка без стрелки назад — как в кадре.** Выход один и назван кнопкой:
 * «Вернуться в выдачу». У экрана, где делать нечего, двух выходов не бывает.
 */
function ObjectBlockedScreen({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon
  title: string
  text: string
}) {
  const navigate = useNavigate()

  return (
    <PhoneFrame slot="mobile-screen">
      <MobileSectionHeader title="Объект" />

      <MobileEmptyState
        icon={Icon}
        title={title}
        text={text}
        action={
          <Button
            variant="primary"
            size="lg"
            {...pressProps(() => void navigate({ to: "/m/search" }))}
          >
            Вернуться в выдачу
          </Button>
        }
      />

      <MobileBottomNav activeId="search" />
    </PhoneFrame>
  )
}

/**
 * МОБАЙЛ · Контакт отозван (`OPyW3`).
 *
 * Собственник воспользовался `serch.ru/stop` и отозвал согласие. Деньги
 * за раскрытие вернулись сами: агентство заплатило за контакт, которого больше
 * нет, и держать эти 199 ₽ было бы платой за пустоту.
 *
 * Сумма берётся из `DISCLOSURE_PRICE`, а не набрана текстом: цена раскрытия
 * в продукте одна, и поменяется она в одном месте.
 */
function ObjectRevokedScreen() {
  return (
    <ObjectBlockedScreen
      // Значок взят из кадра `OPyW3`. Компьютерный близнец `JpcQn` рисует
      // на этом же месте замок, а стоп-листу отдаёт `phone-off`, — то есть
      // пара значков на двух платформах разная. Расхождение файла с самим
      // собой; здесь воспроизведён телефонный кадр, а пару надо свести
      // одним решением, когда соберут `JpcQn` и `vEqRl`. Названо в отчёте.
      icon={PhoneOff}
      title="Контакт отозван собственником"
      text={`Собственник отозвал согласие. Списание ${DISCLOSURE_PRICE} ₽ вернулось на счёт агентства.`}
    />
  )
}

/**
 * МОБАЙЛ · Стоп-лист (`b9LMVr`).
 *
 * **Скрыт у всего агентства, а не у одного агента.** Отметку поставил кто-то
 * из коллег по итогу разговора либо сам собственник — и она действует на всех
 * сразу. Иначе второй агент позвонил бы человеку, который уже просил
 * не звонить, и штраф пришёл бы агентству, а не площадке.
 */
function ObjectStopListScreen() {
  return (
    <ObjectBlockedScreen
      icon={Ban}
      title="Собственник просил не звонить"
      text="Номер в стоп-листе, звонить нельзя. Контакт скрыт у всего агентства."
    />
  )
}

/**
 * МОБАЙЛ · Объект (`OGEg8`) — контакт уже раскрыт.
 *
 * Номер стоит крупным в теле, а не в панели: он и есть результат покупки,
 * и его читают глазами, набирая на другом телефоне. Кнопка «Позвонить»
 * графитовая, а не красная: её нажатие уже ничего не списывает.
 *
 * Из десктопной карточки сюда не переехало ничего из доказательств — ни трёх
 * колонок, ни таблиц аналогов, ни истории цены. После раскрытия они больше
 * не нужны: решение принято, осталось позвонить.
 */
export function MobileObjectPage() {
  const navigate = useNavigate()

  return (
    <PhoneFrame slot="mobile-screen">
      <ObjectBackBar label="К списку" to="/m/search" status="disclosed" />

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-bg">
        <ObjectPhoto address="Ленская ул., 10" />

        <div className="flex w-full flex-1 flex-col gap-4 p-4">
          <div className="flex w-full shrink-0 items-center gap-2.5">
            <Typography variant="cardPrice" tone="default">
              8,6 млн ₽
            </Typography>
            <MarketDeviation percent={-12} />
          </div>

          <Typography variant="rowPrice" tone="default" as="h1">
            Ленская ул., 10 · 2-комн · 58 м² · 4/9 эт
          </Typography>

          <Typography variant="denseText" tone="dense">
            Ладожская · 6 мин пешком · Красногвардейский район
          </Typography>

          <ObjectMap label="Ленская ул., 10 · открыть маршрут" address="Ленская ул., 10" />

          <TouchBlock
            headline="Вы звонили сегодня дважды, обе без ответа"
            detail="не дозвонился, две попытки · повторное списание невозможно"
          />

          <Typography variant="cardPrice" tone="default">
            +7 900 000-99-87
          </Typography>

          <div className="flex-1" />
        </div>
      </div>

      <StickyActionBar>
        <div className="min-w-0 flex-1">
          {/* Ведёт в прозвон — экран, где номер стоит под большим пальцем
              и рядом лежит запись результата. Ссылкой кнопка стать не может:
              см. отчёт про сломанный `asChild`. */}
          <Button
            variant="primary"
            size="lg"
            block
            iconLeft={<Phone aria-hidden className="size-4.5" strokeWidth={2} />}
            {...pressProps(() => void navigate({ to: "/m/call", search: {} }))}
          >
            Позвонить
          </Button>
        </div>
        <StatusButton address="Ленская ул., 10" />
      </StickyActionBar>
    </PhoneFrame>
  )
}

/**
 * МОБАЙЛ · Объект, до раскрытия (`MSLPo`) — контакт ещё не куплен.
 *
 * Тот же каркас, но другой объект: Ленская ул., 6 за 8,8 млн ₽. Это не два
 * состояния одной карточки, а две разные карточки, и данные у них разные —
 * так же, как на десктопе.
 *
 * Вместо номера здесь стоит то, что человек покупает: признаки собственника
 * и обещание возврата. Признаки отвечают на вопрос «это точно не агентство»,
 * возврат снимает страх «а если всё-таки агентство». Красная кнопка —
 * единственное место продукта, где красный значит «сейчас спишутся деньги».
 */
/** Объект этой карточки, когда адрес не пришёл ссылкой. */
const BEFORE_ADDRESS = "Ленская ул., 6"

/**
 * Сказать, чем кончилось раскрытие.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Раскрывают на телефоне из трёх мест: карточка до раскрытия, блок похожих
 * и полный список похожих. Все три выбрасывали ответ и не показывали ничего:
 * списали, не списали, кончились деньги — экран не менялся, а шапки со счётом
 * у этих экранов нет. Человек жал кнопку снова и снова.
 *
 * Правило живёт одной функцией, а не тремя копиями: копии разъедутся на
 * четвёртом месте, и одно из них снова замолчит.
 */
function tellDisclosure(
  result: "already" | "trial" | "paid" | "no-money" | "limit",
  navigate: ReturnType<typeof useNavigate>,
) {
  if (result === "paid") notifyDone("Списали 199 ₽, контакт раскрыт")
  else if (result === "trial") notifyDone("Раскрыто, пробное раскрытие")
  else if (result === "already") notifyDone("Контакт уже раскрыт, второй раз не списываем")
  else if (result === "limit") {
    /*
      Дневной лимит кончился — и это отказ агентства, а не отказ денег.

      Нарисованное окно `HRED4` показывать отсюда нечем: карточка объекта
      его не несёт, а заводить второй экземпляр в чужом файле значило бы
      получить две разные правды об одном правиле. Сообщение называет
      причину точно, и человек понимает, что дело не в счёте, — иначе он
      пойдёт просить пополнение, которое ничего не изменит.
    */
    notifyError("Дневной лимит раскрытий исчерпан — попросите руководителя поднять его")
  } else {
    notifyError("На счету агентства не хватает денег")
    void navigate({ to: "/m/balance/top-up" })
  }
}

export function MobileObjectBeforePage() {
  const actions = useSessionActions()
  const navigate = useNavigate()
  const workspace = useWorkspace()

  /**
   * Какой объект раскрывают.
   *
   * Карточка была одна на всю базу: адрес стоял константой, и любая строка
   * выдачи вела в одну и ту же квартиру — а раскрытие списывало деньги
   * именно за неё. То есть человек платил не за тот объект, который выбрал.
   */
  const search = useSearch({ from: "/m/object/before", shouldThrow: false }) as
    | { at?: string }
    | null
  const address = search?.at ?? BEFORE_ADDRESS
  const row = ALL_ROWS.find((item) => item.address === address)

  /**
   * Раскрытие говорит, чем кончилось.
   *
   * Раньше ответ выбрасывался (`void actions.disclose(...)`), и экран не
   * менялся ничем: списали, не списали, кончились деньги — тишина. Человек
   * жал кнопку второй и третий раз. Шапки со счётом у этой карточки нет,
   * поэтому сообщение здесь — единственный способ узнать про свои деньги.
   *
   * Кадра «карточка на телефоне после раскрытия» в файле нет, поэтому
   * экран не подменяется: сообщение и переход на пополнение при нехватке —
   * ровно то, что можно сделать, ничего не выдумывая.
   */
  const disclose = () => tellDisclosure(actions.disclose(address), navigate)

  /*
    Два ответа вместо карточки — и оба обязаны стоять ПЕРЕД ней.

    ═══════════════════════════════════════════════════════════════════════

    Карточка до раскрытия продаёт контакт: красная кнопка «Раскрыть · 199 ₽»
    и обещание вернуть деньги. Показать её у объекта, чей собственник просил
    не звонить или отозвал согласие, значит взять 199 ₽ за номер, по которому
    звонить нельзя. Выдача это уже знает и рисует в строке плашку вместо
    кнопки; карточка знала это только на компьютере.

    Стоп-лист читается из работы агентства (`workspace.stopList`) И из статуса
    строки: отметку мог поставить коллега в панели звонка, а могла принести
    сама база. Отзыв согласия — только факт о собственнике, работой агентства
    он не ставится, поэтому берётся из строки.
  */
  const stopped = workspace.stopList.includes(address) || row?.status === "stop-list"
  if (stopped) return <ObjectStopListScreen />
  if (row?.status === "revoked") return <ObjectRevokedScreen />

  return (
    <PhoneFrame slot="mobile-screen">
      <ObjectBackBar label="К списку" to="/m/search" status="new" />

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-bg">
        <ObjectPhoto address={address} />

        <div className="flex w-full flex-1 flex-col gap-4 p-4">
          <div className="flex w-full shrink-0 items-center gap-2.5">
            <Typography variant="cardPrice" tone="default">
              {row?.price ?? "8,8 млн ₽"}
            </Typography>
            <MarketDeviation percent={row?.deviation ?? -10} />
          </div>

          <Typography variant="rowPrice" tone="default" as="h1">
            {row ? `${row.address}${row.meta}` : `${address} · 2-комн · 57 м² · 8/9 эт`}
          </Typography>

          <Typography variant="denseText" tone="dense">
            Ладожская · 5 мин пешком · Красногвардейский район
          </Typography>

          <ObjectMap label="Ленская ул., 6 · открыть маршрут" address="Ленская ул., 6" />

          <TouchBlock
            headline="По этому объекту из агентства ещё не звонили"
            detail="проверено по пяти сотрудникам, история касаний с 05.07"
          />

          {/*
            Признаки собственника собраны руками, а не компонентом `OwnerSignal`:
            у того три готовых места, и ни одно не совпадает с этим. В файле
            сегмент 20 (как в строке выдачи), а оценка 14/600 графитом
            (как на карточке) — четвёртая пара, которой в компоненте нет.
            Тройка антидубля стоит отдельным столбцом справа и переносится
            в три строки: так в файле, расхождение названо в отчёте.
          */}
          <div className="flex w-full shrink-0 flex-col gap-2">
            <Typography variant="columnHeader" tone="dense">
              ПРИЗНАКИ СОБСТВЕННИКА
            </Typography>
            <div className="flex w-full items-center gap-2.5">
              <div className="flex shrink-0 items-center gap-1">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    aria-hidden
                    className={cn(
                      "h-[5px] w-5 rounded-full",
                      index < 2 ? "bg-fg" : "bg-line-2",
                    )}
                  />
                ))}
              </div>
              <Typography variant="controlLabel" tone="default">
                Средние
              </Typography>
              <div className="h-px flex-1" />
              <div className="min-w-0 flex-1">
                <Typography variant="denseText" tone="dense">
                  2 объявления · 2 площадки · 1 номер
                </Typography>
              </div>
            </div>
          </div>

          {/* Обещание возврата стоит до кнопки, а не после: обещание, прочитанное
              после списания, уже никого не успокаивает. */}
          <Typography variant="metaText" tone="dense">
            Спишем 199 ₽. Вернём в один клик, если это не собственник.
          </Typography>

          <div className="flex-1" />
        </div>
      </div>

      <StickyActionBar>
        <div className="min-w-0 flex-1">
          {/*
            Нажатие списывает 199 ₽ со счёта агентства (или тратит пробное
            раскрытие) и записывает объект в раскрытые — это настоящий сеанс,
            а не подпись под кнопкой. Второй раз за тот же адрес не спишется:
            правило продукта, а не защита от двойного нажатия.

            **Экрана «раскрыто» у этой карточки в макете нет.** Соседний
            `/m/object` — другой объект, а не её продолжение, и уводить туда
            значило бы соврать адресом. Поэтому итог говорится сообщением,
            а деньги видны там, где они живут: в «Сегодня» и в балансе.
          */}
          <Button
            variant="money"
            size="lg"
            block
            iconLeft={<LockOpen aria-hidden className="size-4.5" strokeWidth={2} />}
            {...pressProps(disclose)}
          >
            Раскрыть контакт · 199 ₽
          </Button>
        </div>
        <StatusButton address={address} />
      </StickyActionBar>
    </PhoneFrame>
  )
}

/** Похожие объекты в карточке: две карточки и вход в полный список. */
const SIMILAR_CARDS = [
  {
    caption: "КУХНЯ И КУХНЯ",
    price: "9,2 млн ₽",
    deviation: -7,
    address: "Партизанская ул., 15",
    meta: "Красногвардейский · 2-комн · 56 м² · 6/9",
    why: "панельный 1969-го, школа в 200 м",
    action: "Раскрыть · 199 ₽",
  },
  {
    caption: "КОМНАТА И КОМНАТА",
    price: "9,1 млн ₽",
    deviation: -11,
    address: "Гражданский пр., 92",
    meta: "Калининский · 2-комн · 55 м² · 5/9",
    why: "двор без проезда, парк в 300 м",
    action: "Раскрыть · 199 ₽",
  },
]

/**
 * МОБАЙЛ · Объект, похожие (`f5qg35`) — низ той же карточки, прокрученный вниз.
 *
 * Блок начинается волосяной линией сверху: это шов, а не рамка, — выше
 * продолжается карточка объекта. Липкая панель та же самая и никуда не делась:
 * человек листает похожие, но звонить всё ещё может по этому объекту.
 *
 * Подзаголовок называет условие похожести словами — «та же комнатность,
 * цена ±15 %». Без него список выглядит колдовством, а он считается моделью
 * по понятным правилам, и правило имеет право быть написанным.
 *
 * Кнопка раскрытия здесь графитовая, а не красная, и это не оплошность:
 * в списке похожих раскрытие не главное действие экрана. Красная кнопка одна
 * на экран, и она в липкой панели.
 */
export function MobileObjectSimilarPage() {
  const actions = useSessionActions()
  const navigate = useNavigate()

  return (
    <PhoneFrame slot="mobile-screen">
      <ObjectBackBar label="К списку" to="/m/search" status="disclosed" />

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-bg">
        <div
          data-slot="mobile-similar-block"
          className="flex w-full shrink-0 flex-col gap-3 px-4 pt-5 pb-4 shadow-[inset_0_1px_0_var(--line-2)]"
        >
          <div className="flex w-full flex-col gap-1">
            <Typography variant="columnHeader" tone="dense">
              ПОХОЖИЕ ОБЪЕКТЫ · 8
            </Typography>
            <Typography variant="denseText" tone="dense">
              Та же комнатность, цена ±15 %. Район — в каждой строке.
            </Typography>
          </div>

          {/* Строки лежат на одной поверхности и разделены волосяной линией,
              без зазора между ними: список, а не стопка карточек. */}
          <div className="flex w-full flex-col overflow-hidden rounded-2xl">
            {SIMILAR_CARDS.map((card) => (
              <SimilarRow
                key={card.address}
                address={card.address}
                compareWith="Ленская ул., 10"
                caption={card.caption}
                price={card.price}
                deviation={card.deviation}
                meta={card.meta}
                why={card.why}
                actionLabel={card.action}
                charges
                // Похожий объект открывается, а не только покупается. Открытие
                // ничего не стоит и обязано быть первым действием строки.
                onOpen={() =>
                  void navigate({ to: "/m/object/before", search: { at: card.address } })
                }
                // Раскрытие похожего списывает деньги за его собственный
                // адрес, а не за объект, из карточки которого он показан.
                onAction={() => tellDisclosure(actions.disclose(card.address), navigate)}
              />
            ))}
          </div>

          <Link
            to="/m/similar"
            data-slot="mobile-similar-more"
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-transparent transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="controlLabel" tone="default">
              Ещё 6 похожих
            </Typography>
            <ChevronRight aria-hidden className="size-4 text-text-2" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <StickyActionBar>
        <div className="min-w-0 flex-1">
          {/* Панель принадлежит объекту, а не списку похожих: звонят
              по-прежнему тому, чью карточку человек открыл. */}
          <Button
            variant="primary"
            size="lg"
            block
            iconLeft={<Phone aria-hidden className="size-4.5" strokeWidth={2} />}
            {...pressProps(() => void navigate({ to: "/m/call", search: {} }))}
          >
            Позвонить
          </Button>
        </div>
        <StatusButton address="Ленская ул., 10" />
      </StickyActionBar>
    </PhoneFrame>
  )
}

/** Пересортировка списка похожих. Выбран всегда ровно один способ. */
const SIMILAR_SORTS = ["Похожие", "Тот же дом", "Дешевле"]

/** Полный список похожих на Ленскую ул., 10. */
const SIMILAR_ROWS = [
  {
    caption: "КУХНЯ И КУХНЯ",
    address: "Ленская ул., 6",
    meta: "Красногвардейский · 2-комн · 57 м² · 8/9",
    price: "8,8 млн ₽",
    // То же число, что в подписи, только цифрой: по нему сортирует «Дешевле».
    millions: 8.8,
    deviation: -10,
    action: "Раскрыть · 199 ₽",
  },
  {
    caption: "КУХНЯ И КУХНЯ",
    address: "Партизанская ул., 15",
    meta: "Красногвардейский · 2-комн · 56 м² · 6/9",
    price: "9,2 млн ₽",
    millions: 9.2,
    deviation: -7,
    action: "Раскрыть · 199 ₽",
  },
  {
    caption: "КОМНАТА И КОМНАТА",
    address: "Гражданский пр., 92",
    meta: "Калининский · 2-комн · 55 м² · 5/9",
    price: "9,1 млн ₽",
    millions: 9.1,
    deviation: -11,
    action: "Раскрыть · 199 ₽",
  },
  {
    caption: "КУХНЯ И КУХНЯ",
    address: "Демьяна Бедного ул., 24",
    meta: "Калининский · 2-комн · 54 м² · 3/9",
    price: "9,8 млн ₽",
    millions: 9.8,
    deviation: 0,
    // Контакт по этому объекту уже оплачен агентством: платить второй раз
    // за тот же номер продукт не даёт, поэтому «Открыть · 0 ₽».
    action: "Открыть · 0 ₽",
    paid: true,
  },
]

/**
 * МОБАЙЛ · Похожие на Ленскую ул., 10 (`GUrdB`) — полный список.
 *
 * Заголовок называет коридор цен числами — «7,31–9,89 млн ₽», — а не словом
 * «похожие»: агент проверяет границы выборки, прежде чем ей верить.
 *
 * Пересортировка тремя чипами, а не выпадающим списком: три способа помещаются
 * в строку, а список требует двух нажатий вместо одного. Строки идут одной
 * карточкой с волосяными делителями внутри — так десять объектов читаются
 * списком, а не десятью карточками.
 */
export function MobileSimilarListPage() {
  const actions = useSessionActions()
  const navigate = useNavigate()
  const [sort, setSort] = useState(SIMILAR_SORTS[0])

  /**
   * «Дешевле» действительно пересобирает список по цене.
   *
   * «Похожие» — порядок модели, он и лежит в файле. «Тот же дом» ничего
   * не двигает: в демонстрационных строках нет дома, по которому их можно
   * было бы сравнить, а придумывать порядок ради красивого нажатия нельзя.
   * Названо в отчёте.
   */
  const rows =
    sort === "Дешевле"
      ? [...SIMILAR_ROWS].sort((a, b) => a.millions - b.millions)
      : SIMILAR_ROWS

  return (
    <PhoneFrame slot="mobile-screen">
      <ObjectBackBar label="Ленская ул., 10" to="/m/object" />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex w-full shrink-0 flex-col gap-1">
          <Typography variant="panelTitle" tone="default" as="h1">
            Похожие — 8 объектов
          </Typography>
          <Typography variant="denseText" tone="dense">
            7,31–9,89 млн ₽ — коридор ±15 %. Двухкомнатные. Район в каждой строке.
          </Typography>
        </div>

        {/* Ряд объявлен высотой 32, а чипы в нём нарисованы по 44 и выступают
            за него на 6 сверху и снизу. Воспроизведено как в файле;
            расхождение названо в отчёте. */}
        <div className="flex h-8 w-full shrink-0 items-center gap-2">
          {SIMILAR_SORTS.map((label) => {
            const selected = label === sort
            return (
              <button
                key={label}
                type="button"
                data-slot="mobile-sort-chip"
                aria-pressed={selected}
                className={cn(
                  "flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-md border px-3",
                  "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                  "transition-colors duration-120",
                  selected
                    ? "border-fg bg-fg text-surface active:border-fg-press active:bg-fg-press"
                    : "border-line-2 bg-surface text-fg active:bg-warm-hover",
                )}
                {...pressProps(() => setSort(label))}
              >
                <Typography variant="controlLabel" tone="current">
                  {label}
                </Typography>
              </button>
            )
          })}
        </div>

        <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-surface">
          {rows.map((row) => (
            <SimilarRow
              key={row.address}
              address={row.address}
              compareWith="Ленская ул., 10"
              caption={row.caption}
              price={row.price}
              deviation={row.deviation}
              meta={row.meta}
              actionLabel={row.action}
              // Красный ровно там, где спишутся деньги. У уже раскрытого
              // контакта действие бесплатное, и кнопка тёмная.
              charges={!row.paid}
              wide
              onOpen={() =>
                void navigate({
                  to: row.paid ? "/m/object" : "/m/object/before",
                  search: { at: row.address },
                })
              }
              onAction={() => {
                if (row.paid) {
                  void navigate({ to: "/m/object", search: { at: row.address } })
                  return
                }
                tellDisclosure(actions.disclose(row.address), navigate)
              }}
            />
          ))}
        </div>
      </div>

      <MobileBottomNav activeId="search" />
    </PhoneFrame>
  )
}

/** Выдача, в которой не осталось ни одного свободного объекта. */
const TAKEN_ROWS = [
  { address: "Марата ул., 34", trace: "Максим Л. · 09:14 · продаёт сам" },
  { address: "Рубинштейна ул., 15", trace: "Анна Т. · 09:41 · уже с агентством" },
  { address: "Жуковского ул., 8", trace: "Анна Т. · 10:02 · встреча 4 августа" },
  {
    address: "Восстания ул., 22",
    trace: "Максим Л. · 10:28 · не дозвонился, 3 попытки",
  },
  { address: "Некрасова ул., 40", trace: "Пётр Г. · 11:07 · уже с агентством" },
  {
    address: "Маяковского ул., 11",
    trace: "Пётр Г. · 11:33 · перезвонить после 5 августа",
  },
  {
    address: "Пушкинская ул., 7",
    trace: "Анна Т. · 12:15 · приходите с покупателем",
  },
  { address: "Стремянная ул., 19", trace: "Максим Л. · 12:49 · продано" },
  { address: "Колокольная ул., 6", trace: "Дмитрий К. · 13:20 · уже с агентством" },
]

/**
 * МОБАЙЛ · Поиск, разобрано коллегами (`N4Dwv`).
 *
 * **Это не пустое состояние, а самое дорогое из них.** Объекты нашлись, все
 * двенадцать, но каждый уже оплачен агентством и взят коллегой. Продукт обязан
 * сказать это прямо, иначе агент купит контакт, за который агентство уже
 * заплатило, — и вторым звонком испортит собственника.
 *
 * Поэтому в каждой строке стоит имя коллеги, время касания и **исход**:
 * «продаёт сам», «уже с агентством», «встреча 4 августа». Исход и есть польза:
 * по нему видно, стоит ли вообще возвращаться к этому объекту.
 *
 * Справа в каждой строке — «Похожие». Единственный выход из этого экрана ведёт
 * не к чужому объекту, а к замене: список без выхода превращает находку
 * в тупик.
 */
export function MobileTakenByColleaguesPage() {
  // Остаток и инициалы — из сеанса: то же правило, что в шапке кабинета.
  const session = useSession()

  return (
    <PhoneFrame slot="mobile-screen">
      <MobileHeader
        balance={session?.balance ?? 8610}
        initials={session?.initials ?? "ИС"}
      />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex w-full shrink-0 flex-col gap-1">
          <Typography variant="panelTitle" tone="default" as="h1">
            Все 12 объектов уже у коллег
          </Typography>
          <Typography variant="denseText" tone="dense">
            «Невский, комнаты, за 24 часа» · контакты уже оплачены агентством
          </Typography>
        </div>

        <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-surface">
          {TAKEN_ROWS.map((row, index) => (
            <div
              key={row.address}
              data-slot="mobile-taken-row"
              className={cn(
                "flex h-16 w-full flex-col justify-center gap-0.5 px-3.5",
                index > 0 && "shadow-[inset_0_1px_0_var(--line-1)]",
              )}
            >
              <div className="flex w-full items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Typography variant="rowPrice" tone="default">
                    {row.address}
                  </Typography>
                </div>
                {/* В файле это просто текст 13/600. Здесь — ссылка: нажатие
                    уводит к похожим, и такое нажатие обязано быть контролом
                    с фокусом и именем. Геометрия не тронута, цель касания
                    остаётся 20 против пола 44 — расхождение в отчёте.

                    Это единственный выход с экрана: чужой объект открывать
                    незачем, а замена — то, ради чего сюда пришли. */}
                <Link
                  to="/m/similar"
                  data-slot="mobile-taken-similar"
                  aria-label={`Похожие на ${row.address}`}
                  className="-mx-2 flex shrink-0 cursor-pointer items-center rounded-md bg-transparent px-2 py-1 text-fg transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                >
                  <Typography variant="numericDense" tone="current">
                    Похожие
                  </Typography>
                </Link>
              </div>
              <Typography variant="denseText" tone="dense">
                {row.trace}
              </Typography>
            </div>
          ))}
        </div>
      </div>

      <MobileBottomNav activeId="search" />
    </PhoneFrame>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   МОБАЙЛ · Объект снят с продажи (`Xea2j`)
   ──────────────────────────────────────────────────────────────────────── */

/**
 * МОБАЙЛ · Объект снят с продажи (`Xea2j`) — близнец окна `Y7IyON`.
 *
 * Лист 213 поверх затемнения: хват, блок текста 76 с зазором 8, кнопки.
 *
 * **Это не отказ и не блокировка — это конец объявления.** Собственник продал
 * или передумал, объявление снято, и продукту больше нечего наблюдать.
 * Поэтому обе строки текста говорят про деньги и про историю, а не про запрет:
 * контакт, за который агентство уже заплатило, остаётся в его истории,
 * а новых списаний по исчезнувшему объекту не будет.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ДВА НАЗВАННЫХ РАСХОЖДЕНИЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. **Вторая кнопка в кадре обрезана.** Лист нарисован высотой 213 — ровно
 *    под одну кнопку, — а внутри лежат две, и «Отмена» вылезает за нижний край.
 *    Компьютерный близнец `Y7IyON` рисует обе, и обе собраны: лист без отмены
 *    не давал бы человеку остаться на карточке и досмотреть историю объекта.
 * 2. **Дата 23.07 взята из кадра.** Когда объявление сняли, продукт не хранит:
 *    поля «снят с продажи» в базе нет вовсе. Появится наблюдение за жизнью
 *    объявления — дата придёт оттуда, и эта строка станет считаться.
 */
export function MobileObjectDelistedPage() {
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <PhoneFrame slot="mobile-screen" surface="none">
      <PhoneSheet label="Объект снят с продажи">
        <div className="flex w-full flex-col gap-2">
          <Typography variant="panelTitle" tone="default" as="h2">
            Объект снят с продажи
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Собственник снял объявление 23.07. Контакт остаётся в истории
            агентства, новых списаний не будет.
          </Typography>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            block
            {...pressProps(() => void navigate({ to: "/m/search" }))}
          >
            Вернуться в выдачу
          </Button>
          {/* «Отмена» — остаться там, откуда пришли: на карточке объекта
              ещё лежит история звонков и раскрытий, и она никуда не делась.
              Возврат в историю, а не на назначенный адрес: в снятый объект
              приходят и из выдачи, и из подборки, и из «Сегодня». */}
          <Button
            variant="quiet"
            size="lg"
            block
            {...pressProps(() => router.history.back())}
          >
            Отмена
          </Button>
        </div>
      </PhoneSheet>
    </PhoneFrame>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
   МОБАЙЛ · Дубли объекта, откуда цена (`EdWNY`)
   ──────────────────────────────────────────────────────────────────────── */

/**
 * Объект, на котором показан разбор дублей.
 *
 * Взят из кадра целиком — адрес, четыре площадки, четыре цены. В базе
 * демонстрации такого объекта нет, и подставлять разбор к настоящему объекту
 * нельзя: цен по каждой площадке продукт не хранит, есть только счётчики
 * «объявлений · площадок · номеров». Придумать четыре цены живому объекту
 * значило бы показать выдуманную арифметику как факт рынка.
 */
const DUPLICATE_ADDRESS = "Тихорецкий пр., 5"

/**
 * Четыре объявления одного объекта.
 *
 * **Номера собраны `maskedPhone`, а не взяты из кадра.** В `EdWNY` стоят
 * +7 911, +7 981 и +7 921 — настоящие петербургские диапазоны, и любой из этих
 * номеров прямо сейчас может быть чьим-то. Запрет записан в `lib/demo-phone.ts`
 * и относится ко всей демонстрации, а не к отдельным экранам. Форма при этом
 * сохранена ровно как в кадре: код, точки, две последние цифры.
 *
 * Первые две строки берут ОДИН ключ и потому показывают один номер — на этом
 * держится весь вывод листа: номер, который встречается дважды и стоит при
 * самой низкой цене, и есть собственник.
 */
const DUPLICATE_ROWS: {
  platform: string
  price: string
  /** Ключ номера. Одинаковый ключ — одинаковый номер, см. `demoPhone`. */
  key: string
  note: string
  /** Это объявление собственника. Единственная зелёная метка листа. */
  owner: boolean
}[] = [
  {
    platform: "Авито",
    price: "9,4 млн ₽",
    key: DUPLICATE_ADDRESS,
    note: "Собственник",
    owner: true,
  },
  {
    platform: "Домклик",
    price: "9,4 млн ₽",
    key: DUPLICATE_ADDRESS,
    note: "Тот же номер",
    owner: false,
  },
  {
    platform: "Циан",
    price: "9,6 млн ₽",
    key: `${DUPLICATE_ADDRESS} · Циан`,
    note: "Дороже на 200 тыс",
    owner: false,
  },
  {
    platform: "Яндекс",
    price: "9,9 млн ₽",
    key: `${DUPLICATE_ADDRESS} · Яндекс`,
    note: "Дороже на 500 тыс",
    owner: false,
  },
]

/**
 * МОБАЙЛ · Дубли объекта, откуда цена (`EdWNY`) — близнец окна `V5ZdL`.
 *
 * Лист 549: хват, блок 412 с внутренним зазором 12 (заголовок, объяснение,
 * таблица 248, вывод), ряд кнопок.
 *
 * **Это ядро продукта, показанное человеку.** Склейка дублей — то, чем «Сёрчь»
 * отличается от четырёх вкладок с площадками: один объект вместо четырёх
 * объявлений и один звонок вместо четырёх. Лист объясняет не «мы склеили»,
 * а КАК это проверить самому: номер, который повторяется и стоит при самой
 * низкой цене, принадлежит собственнику, остальные накинули свою комиссию.
 *
 * **Зелёным светится только «Собственник».** В компьютерном кадре `V5ZdL`
 * зелёных меток две из четырёх, а надбавки идут `warn`; на телефоне цвет один
 * на весь лист, остальное приглушено. Телефонный кадр здесь строже, и он
 * воспроизведён: на 390 четыре цветные метки столбиком читаются как светофор,
 * а вывод у листа один.
 *
 * **Строки разделены линией, а не обведены рамкой.** В кадре у каждой строки
 * полная обводка, но текст стоит вплотную к её левому и правому краю — рамка
 * коллизится с содержимым, то есть нарисована как разделитель, а не как
 * коробка. Воспроизведена горизонтальная линия, которая и читается.
 *
 * **Главная кнопка названа действием и намеренно ничего не списывает:**
 * объекта «Тихорецкий пр., 5» в базе нет, и раскрытие записало бы в работу
 * агентства покупку контакта у несуществующего собственника.
 */
export function MobileDuplicatesPage() {
  const router = useRouter()

  return (
    <PhoneFrame slot="mobile-screen" surface="none">
      <PhoneSheet label="Один объект, четыре объявления">
        <div className="flex w-full flex-col gap-3">
          <Typography variant="panelTitle" tone="default" as="h2">
            Один объект, четыре объявления
          </Typography>
          <Typography variant="uiText" tone="secondary">
            <>{`${DUPLICATE_ADDRESS} · 1-комн · 42 м² · 2/9. Три разных номера, но собственник один.`}</>
          </Typography>

          <div className="flex w-full flex-col">
            {DUPLICATE_ROWS.map((row, index) => (
              <div
                key={row.platform}
                data-slot="duplicate-row"
                className={cn(
                  "flex w-full items-center gap-3 py-2.5",
                  // Делитель внутренней тенью, а не рамкой: рамка растила бы
                  // каждую строку на пиксель, и таблица поехала бы вниз.
                  index > 0 && "shadow-[inset_0_1px_0_var(--line-2)]",
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Typography variant="strongText" tone="default">
                    {row.platform}
                  </Typography>
                  <Typography variant="denseText" tone="dense">
                    <>{maskedPhone(row.key)}</>
                  </Typography>
                </div>
                {/* Цена и метка выключены вправо: колонка цен читается
                    столбиком, а метка отвечает именно своей цене. */}
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <Typography variant="strongText" tone="default">
                    {row.price}
                  </Typography>
                  <Typography variant="metaStrong" tone={row.owner ? "ok" : "dense"}>
                    {row.note}
                  </Typography>
                </div>
              </div>
            ))}
          </div>

          <Typography variant="denseText" tone="dense">
            Номер, который встречается дважды и стоит при самой низкой цене,
            и есть собственник. Два других накинули цену.
          </Typography>
        </div>

        <div className="flex w-full flex-col gap-2">
          {/*
            Кнопка графитовая, а не красная, хотя нажатие стоит денег.
            Так нарисовано и так же собрано подтверждение массового раскрытия:
            акцент оставлен единственной кнопке карточки объекта, где раскрытие
            и есть главное действие экрана. Здесь главное — разбор цены.
          */}
          <Button
            variant="primary"
            size="lg"
            block
            data-action={`Списать ${DISCLOSURE_PRICE} ₽ и раскрыть контакт собственника`}
          >
            <>{`Раскрыть · ${DISCLOSURE_PRICE} ₽`}</>
          </Button>
          <Button
            variant="quiet"
            size="lg"
            block
            {...pressProps(() => router.history.back())}
          >
            Отмена
          </Button>
        </div>
      </PhoneSheet>
    </PhoneFrame>
  )
}
