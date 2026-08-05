import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, ChevronRight, LockOpen, MapPin, Phone } from "lucide-react"
import { useState } from "react"
import type { MouseEvent, ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSession, useSessionActions } from "@/features/auth"
import { MobileBottomNav, MobileHeader } from "@/features/cabinet"
import {
  ListingPhoto,
  MarketDeviation,
  StatusChip,
  type ListingStatus,
} from "@/features/listings"
import { cn } from "@/lib/utils"

/**
 * МОБАЙЛ · Объект и похожие — пять экранов одной ветки.
 *
 * Ветка начинается строкой выдачи и кончается решением: звонить или нет.
 * Карточка объекта до раскрытия продаёт контакт, после раскрытия отдаёт номер,
 * похожие подставляют замену, когда этот объект не подошёл или уже занят.
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
 * Кадр телефона на десктопном стенде: 390 × 844 по центру.
 * Ровно тот же, что у `mobile-search-screen` и `mobile-call-screen`, —
 * стенд смотрят в обычном браузере рядом с макетом.
 */
function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full items-start justify-center bg-line-1 p-10">
      <div
        data-slot="mobile-screen"
        className="flex h-[844px] w-[390px] flex-col overflow-hidden bg-bg outline-solid outline-1 -outline-offset-1 outline-line-2"
      >
        <>{children}</>
      </div>
    </div>
  )
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
type BackTarget = "/screen/mobile" | "/m/object"

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
        className="flex shrink-0 cursor-pointer items-center gap-2 bg-transparent text-text-2 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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
 * **Смена статуса на телефоне не нарисована.** На десктопе статус меняют
 * из строки выдачи клавишей и меню, здесь ни листа, ни меню в файле нет.
 * Действие названо и не рисует ничего: выдуманный список статусов обещал бы
 * работу, которой за ним нет.
 */
function StatusButton() {
  return (
    <button
      type="button"
      data-action="сменить статус объекта"
      data-slot="mobile-status-button"
      className="flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-md bg-warm px-4 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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
  return (
    <div className="relative h-55 w-full shrink-0">
      <ListingPhoto alt={address} size="large" reason="no-photos" />
      <span
        data-slot="mobile-photo-counter"
        className="absolute top-45 left-[318px] flex items-center rounded-sm bg-fg/80 px-2.5 py-1 text-surface"
      >
        <Typography variant="numericMeta" tone="current">
          1 / 5
        </Typography>
      </span>
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
function ObjectMap({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-action="открыть маршрут в картах"
      data-slot="mobile-object-map"
      className="flex h-33 w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-line-2 bg-warm outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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

/**
 * Отклонение от рынка в строке похожего объекта: 13/600 одной строкой.
 *
 * Собрано отдельно от `MarketDeviation`, потому что там отклонение идёт 12/600
 * двумя узлами с зазором 4, а в списке похожих файл рисует его одним текстом
 * на ступень крупнее. Полосы те же, что у `MarketDeviation`, и берутся из
 * одного закона: ±5 % — мёртвая зона со словами «≈ рынок», дешевле — зелёное
 * со знаком ▼, дороже — красное со знаком ▲.
 *
 * Знак пишется всегда: цвет не может быть единственным носителем смысла.
 */
function SimilarDeviation({ percent }: { percent: number }) {
  if (Math.abs(percent) <= 5) {
    return (
      <Typography variant="numericDense" tone="dense">
        ≈ рынок
      </Typography>
    )
  }

  const cheaper = percent < 0

  return (
    <Typography variant="numericDense" tone={cheaper ? "ok" : "destructive"}>
      {`${cheaper ? "▼ −" : "▲ +"}${Math.abs(percent)} %`}
    </Typography>
  )
}

/**
 * Пара кадров «что с чем сравнили»: подпись 11/600 и два снимка рядом.
 *
 * **Это ядро продукта, а не украшение.** Похожесть считает своя модель,
 * и пара кадров — единственное, чем она может объяснить свой вывод человеку:
 * кухня против кухни, комната против комнаты. Без пары строка «похоже»
 * остаётся утверждением, которое нечем проверить.
 */
function ComparedPair({
  caption,
  address,
  width,
  photoHeight,
}: {
  caption: string
  address: string
  /** 164 на карточке объекта, 148 в списке похожих. Так в файле. */
  width: string
  photoHeight: string
}) {
  return (
    <div className={cn("flex shrink-0 flex-col gap-1.5", width)}>
      <Typography variant="columnHeader" tone="dense">
        {caption}
      </Typography>
      <div className="flex w-full gap-1">
        <div className={cn("min-w-0 flex-1", photoHeight)}>
          <ListingPhoto alt="Кадр этого объекта" size="small" reason="no-photos" />
        </div>
        <div className={cn("min-w-0 flex-1", photoHeight)}>
          <ListingPhoto alt={`Кадр объекта ${address}`} size="small" reason="no-photos" />
        </div>
      </div>
    </div>
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
    <PhoneFrame>
      <ObjectBackBar label="К списку" to="/screen/mobile" status="disclosed" />

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

          <ObjectMap label="Ленская ул., 10 · открыть маршрут" />

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
            {...pressProps(() => void navigate({ to: "/screen/mobile-call" }))}
          >
            Позвонить
          </Button>
        </div>
        <StatusButton />
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
/** Объект этой карточки. Раскрытие списывает деньги именно за него. */
const BEFORE_ADDRESS = "Ленская ул., 6"

export function MobileObjectBeforePage() {
  const actions = useSessionActions()

  return (
    <PhoneFrame>
      <ObjectBackBar label="К списку" to="/screen/mobile" status="new" />

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-bg">
        <ObjectPhoto address={BEFORE_ADDRESS} />

        <div className="flex w-full flex-1 flex-col gap-4 p-4">
          <div className="flex w-full shrink-0 items-center gap-2.5">
            <Typography variant="cardPrice" tone="default">
              8,8 млн ₽
            </Typography>
            <MarketDeviation percent={-10} />
          </div>

          <Typography variant="rowPrice" tone="default" as="h1">
            Ленская ул., 6 · 2-комн · 57 м² · 8/9 эт
          </Typography>

          <Typography variant="denseText" tone="dense">
            Ладожская · 5 мин пешком · Красногвардейский район
          </Typography>

          <ObjectMap label="Ленская ул., 6 · открыть маршрут" />

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
                      "h-[5px] w-5 rounded-bar",
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
            значило бы соврать адресом. Поэтому списание видно там, где живут
            деньги: в шапке «Сегодня» и в балансе. Названо в отчёте.
          */}
          <Button
            variant="money"
            size="lg"
            block
            iconLeft={<LockOpen aria-hidden className="size-4.5" strokeWidth={2} />}
            {...pressProps(() => void actions.disclose(BEFORE_ADDRESS))}
          >
            Раскрыть контакт · 199 ₽
          </Button>
        </div>
        <StatusButton />
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
    <PhoneFrame>
      <ObjectBackBar label="К списку" to="/screen/mobile" status="disclosed" />

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

          <div className="flex w-full flex-col gap-3">
            {SIMILAR_CARDS.map((card) => (
              // Карточка без радиуса: в файле у неё прямые углы, хотя строка
              // выдачи и список похожих идут с радиусом 16. Так в файле.
              <div
                key={card.address}
                data-slot="mobile-similar-card"
                className="flex w-full flex-col gap-2.5 bg-surface p-3 outline-solid outline-1 -outline-offset-1 outline-line-1"
              >
                <div className="flex w-full gap-3">
                  <ComparedPair
                    caption={card.caption}
                    address={card.address}
                    width="w-41"
                    photoHeight="h-15"
                  />
                  {/* Цена выключена вправо: она отвечает паре кадров слева,
                      и обе колонки читаются от краёв к середине. */}
                  <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
                    <Typography variant="rowPrice" tone="default">
                      {card.price}
                    </Typography>
                    <SimilarDeviation percent={card.deviation} />
                  </div>
                </div>

                <Typography variant="rowPrice" tone="default">
                  {card.address}
                </Typography>
                <Typography variant="denseText" tone="dense">
                  {card.meta}
                </Typography>
                {/* «Чем похоже» темнее меты: это вывод модели, а не паспорт
                    объекта, и он не должен теряться среди фактов. */}
                <Typography variant="denseText" tone="secondary">
                  {card.why}
                </Typography>

                {/* Раскрытие похожего списывает деньги за его собственный
                    адрес, а не за объект, из карточки которого он показан. */}
                <Button
                  variant="primary"
                  size="md"
                  block
                  {...pressProps(() => void actions.disclose(card.address))}
                >
                  {card.action}
                </Button>
              </div>
            ))}
          </div>

          <Link
            to="/m/similar"
            data-slot="mobile-similar-more"
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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
            {...pressProps(() => void navigate({ to: "/screen/mobile-call" }))}
          >
            Позвонить
          </Button>
        </div>
        <StatusButton />
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
    <PhoneFrame>
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
                  selected
                    ? "border-fg bg-fg text-surface"
                    : "border-line-2 bg-surface text-fg",
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
          {rows.map((row, index) => (
            <div
              key={row.address}
              data-slot="mobile-similar-row"
              className={cn(
                "flex w-full flex-col gap-2 px-3.5 py-3",
                // Делитель внутренней тенью, а не рамкой: рамка растила бы
                // каждую строку на пиксель, и список поехал бы вниз.
                index > 0 && "shadow-[inset_0_1px_0_var(--line-1)]",
              )}
            >
              <div className="flex w-full gap-2.5">
                <ComparedPair
                  caption={row.caption}
                  address={row.address}
                  width="w-37"
                  photoHeight="h-11"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Typography variant="rowPrice" tone="default">
                    {row.address}
                  </Typography>
                  <Typography variant="denseText" tone="dense">
                    {row.meta}
                  </Typography>
                </div>
              </div>

              <div className="flex h-8 w-full items-center gap-2">
                <Typography variant="rowPrice" tone="default">
                  {row.price}
                </Typography>
                <SimilarDeviation percent={row.deviation} />
                <div className="h-px flex-1" />
                {/*
                  Две разные кнопки под одной формой. «Раскрыть · 199 ₽»
                  покупает контакт и трогает счёт агентства. «Открыть · 0 ₽»
                  не покупает ничего — контакт уже оплачен, и остаётся только
                  открыть карточку с номером.
                */}
                <Button
                  variant="primary"
                  size="sm"
                  {...pressProps(() => {
                    if (row.paid) {
                      void navigate({ to: "/m/object" })
                      return
                    }
                    void actions.disclose(row.address)
                  })}
                >
                  {row.action}
                </Button>
              </div>
            </div>
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
    <PhoneFrame>
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
                  className="flex shrink-0 cursor-pointer items-center bg-transparent text-fg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
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
