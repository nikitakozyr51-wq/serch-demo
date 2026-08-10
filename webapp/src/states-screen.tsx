import { useNavigate } from "@tanstack/react-router"
import { useState, type ReactNode } from "react"

import { Typography } from "@/components/typography"
import {
  ListingRow,
  ListingsEmptyState,
  ListingsSkeleton,
  MobileListingRow,
  ResultsHeaderShell,
  SourceErrorNotice,
} from "@/features/listings"

/**
 * СОСТОЯНИЯ ВЫДАЧИ — стенд.
 *
 * Восемь состояний, снятых с файла поимённо: загрузка `pG4yw`, ошибка
 * источника `g6EnZ` и шесть пустых — `UYQoT`, `Yz08U`, `jxTTf`, `ctYlA`,
 * `IhrBR`, `a6C5P`, `cTCZL`.
 *
 * **Собраны рядом намеренно.** Пустых состояний не одно и не четыре, а шесть,
 * и они не делят один текст: у каждого своя причина, свой виноватый и своё
 * действие. Два из них — «Похожих не нашлось» и «В коридоре никого нет» —
 * **неразличимы по шапке** и расходятся только телом. Значит в коде причину
 * нельзя решать по строке результата, и увидеть это можно только положив
 * их рядом.
 *
 * Все кадры 940 × 560 — размер стенда состояний в файле, а не выдумка.
 *
 * **Кнопки внутри кадров нажимаются, но стенд в ответ ничего не рисует.**
 * Почти каждое действие пустого состояния несёт условия: «Петроградский, 2-к,
 * до 15 млн», «снять „до 8 млн“», «шире, ±30 %». Продуктовый адрес `/search`
 * условий пока не принимает — параметров у него нет, — и переход по нему
 * показал бы не ту выдачу, которую обещает подпись. Соврать переходом хуже,
 * чем назвать действие, поэтому нажатие пишет имя произошедшего на кадр
 * атрибутом `data-action`: его видно в разметке и по нему пишутся проверки.
 * Исключение одно — «Открыть поиск»: у него условий нет, и он честно ведёт
 * на выдачу.
 */

/** Кадр стенда: 940 × 560, поля 16, зазор 12, рамка `line-2`. */
function Stage({
  id,
  name,
  action,
  children,
}: {
  id: string
  name: string
  /** Что произошло в кадре по последнему нажатию. Ничего не рисует. */
  action?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <Typography variant="columnHeader" tone="dense">
          {id}
        </Typography>
        <Typography variant="denseText" tone="secondary">
          {name}
        </Typography>
      </div>
      {/*
        Обводка, а не рамка. В Pencil `strokeAlignment: inner` рисует линию
        внутрь и содержимое не сжимает; CSS-рамка сжимает, и колонки скелета
        уезжали на 2 px против настоящей строки. Обводка со сдвигом внутрь —
        точная модель того, что делает файл.
      */}
      <div
        data-check={`state-${id}|rest`}
        data-action={action}
        className="flex h-[560px] w-[940px] flex-col gap-3 rounded-2xl bg-bg p-4 outline-solid outline-1 -outline-offset-1 outline-line-2"
      >
        {children}
      </div>
    </div>
  )
}

/** Четыре строки выдачи под плашкой ошибки. Источники честно без Авито. */
const ROWS_WITHOUT_AVITO = [
  {
    address: "Ленская ул., 10",
    price: "8,6 млн ₽",
    deviation: -12,
    freshness: "14 минут",
    meta: "· Ладожская 6 мин · 2-к · 58 м² · 4/9 · Циан",
    strength: "medium" as const,
    publications: 3,
    platforms: 2,
    phones: 1,
    takenBy: "ИС",
    status: "in-progress" as const,
    action: { kind: "open" as const },
  },
  {
    address: "Стахановцев ул., 14",
    price: "12,4 млн ₽",
    deviation: 0,
    freshness: "1 час",
    meta: "· Новочеркасская 8 мин · 3-к · 74 м² · 2/5 · Домклик",
    strength: "strong" as const,
    publications: 1,
    platforms: 1,
    phones: 1,
    status: "stop-list" as const,
    action: { kind: "blocked" as const, label: "Просил не звонить" },
  },
  {
    address: "Дальневосточный пр., 68",
    price: "6,3 млн ₽",
    deviation: -9,
    freshness: "3 часа",
    meta: "· Пр. Большевиков 9 мин · 1-к · 36 м² · 3/12 · Яндекс",
    strength: "strong" as const,
    publications: 1,
    platforms: 1,
    phones: 1,
    takenBy: "МЛ",
    status: "refused" as const,
    action: { kind: "open" as const },
  },
  {
    address: "Передовиков ул., 21",
    price: "9,8 млн ₽",
    deviation: -6,
    freshness: "5 часов",
    meta: "· Ладожская 9 мин · 2-к · 59 м² · 7/9 · Аренда-Питер",
    strength: "strong" as const,
    publications: 1,
    platforms: 1,
    phones: 1,
    takenBy: "ИС",
    status: "disclosed" as const,
    action: { kind: "open" as const },
  },
]

export function StatesScreenPage() {
  // Имя последнего действия по каждому кадру. Кадров восемь, и каждый помнит
  // своё: иначе нажатие в одном стирало бы след в другом, а стенд для того
  // и собран, чтобы состояния можно было сверять одновременно.
  const [marked, setMarked] = useState<Record<string, string>>({})
  const mark = (stage: string, what: string) => () => {
    setMarked((current) => ({ ...current, [stage]: what }))
  }

  /**
   * «Открыть поиск» ведёт на выдачу.
   *
   * Ссылкой это не сделано не по выбору: кнопку рисует общий компонент
   * пустого состояния, и он умеет только `onClick`. Как только у пустого
   * состояния появится адрес вместо обработчика, здесь встанет `Link` —
   * тогда действие можно будет открыть в новой вкладке.
   */
  const navigate = useNavigate()
  const openSearch = () => {
    void navigate({ to: "/search" })
  }

  return (
    <div className="flex min-h-svh w-full flex-col gap-10 bg-bg p-10">
      <div className="flex flex-col gap-1">
        <Typography variant="display" tone="default" as="h1">
          Состояния выдачи
        </Typography>
        <Typography variant="uiText" tone="secondary">
          Восемь кадров по 940 × 560, снятых с файла. Пустых состояний шесть,
          и они различаются причиной, а не оформлением.
        </Typography>
      </div>

      <Stage id="pG4yw" name="Загрузка выдачи">
        <ListingsSkeleton />
      </Stage>

      <Stage id="g6EnZ" name="Ошибка источника" action={marked["g6EnZ"]}>
        <ResultsHeaderShell title="Показано 180 объектов из трёх источников" dense />
        <SourceErrorNotice
          title="Авито не ответил за 10 секунд"
          text="Выдача собрана из Циан, Домклик и Яндекса. Обычно там 247 объектов, сейчас 180: часть объявлений вы не видите."
          actions={[
            {
              id: "retry",
              label: "Повторить",
              primary: true,
              onClick: mark("g6EnZ", "спросить Авито ещё раз и пересобрать выдачу"),
            },
            {
              id: "without",
              label: "Искать без Авито",
              onClick: mark("g6EnZ", "искать по трём источникам без Авито"),
            },
          ]}
        />
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface">
          {ROWS_WITHOUT_AVITO.map((row) => (
            <ListingRow
              key={row.address}
              {...row}
              onOpen={mark("g6EnZ", `открыть карточку объекта: ${row.address}`)}
              onAction={mark("g6EnZ", `открыть контакт: ${row.address} · 0 ₽`)}
            />
          ))}
        </div>
      </Stage>

      <Stage id="UYQoT" name="Пусто, первый вход" action={marked["UYQoT"]}>
        <ListingsEmptyState
          headerTitle="Начните с района"
          headerNote="у вас пока нет ни одного сохранённого поиска"
          title="Начните с района"
          text="Четыре готовых пресета собраны по тому, что чаще всего ищут в Санкт-Петербурге. Выберите любой, дальше фильтр можно менять как угодно."
          actions={[
            {
              id: "preset",
              label: "Петроградский, 2-к, до 15 млн",
              primary: true,
              onClick: mark("UYQoT", "открыть выдачу пресетом: Петроградский, 2-к, до 15 млн"),
            },
            {
              id: "today",
              label: "Вся вторичка, добавлено сегодня",
              onClick: mark("UYQoT", "открыть выдачу пресетом: вся вторичка, добавлено сегодня"),
            },
          ]}
          footnote="Комнаты и доли, Центральный · Расселение · Снизили цену за 3 дня"
        />
      </Stage>

      <Stage id="Yz08U" name="Пусто, перефильтровали" action={marked["Yz08U"]}>
        <ListingsEmptyState
          headerTitle="Ничего не найдено"
          headerNote="Приморский · до 8 млн · от 60 м² · не первый этаж"
          title="Ничего не найдено"
          text="Слишком узко сошлись три условия. Снимите «до 8 млн», и вернётся 84 объекта: в Приморском районе от 60 м² медиана 11,4 млн ₽."
          chips={[
            { id: "price", label: "до 8 млн", culprit: true },
            { id: "area", label: "от 60 м²" },
            { id: "district", label: "Приморский" },
          ]}
          actions={[
            {
              id: "drop",
              label: "Снять «до 8 млн»",
              primary: true,
              onClick: mark("Yz08U", "снять условие «до 8 млн», показать 84 объекта"),
            },
            {
              id: "subscribe",
              label: "Подписаться на этот поиск",
              onClick: mark("Yz08U", "подписаться на поиск: Приморский, от 60 м², не первый этаж"),
            },
          ]}
        />
      </Stage>

      <Stage id="jxTTf" name="Поиск без результата" action={marked["jxTTf"]}>
        <ListingsEmptyState
          headerTitle="Ничего не найдено"
          headerNote="по строке «Кузнецовская 44» совпадений нет"
          title="Такого объекта у нас нет"
          text="Мы ищем по адресу, телефону и номеру объявления. Если объект есть на площадке, но его нет здесь, скорее всего он размещён посредником и отсеян на входе."
          actions={[
            {
              id: "district",
              label: "Искать по району",
              primary: true,
              onClick: mark("jxTTf", "открыть выдачу по району вместо строки «Кузнецовская 44»"),
            },
            {
              id: "filtered",
              label: "Показать отсеянные",
              onClick: mark("jxTTf", "показать отсеянных посредников, доступно только руководителю"),
            },
          ]}
          footnote="Отсеянные видны только руководителю и только со ссылкой на объявление"
        />
      </Stage>

      <Stage id="IhrBR" name="Похожих не нашлось" action={marked["IhrBR"]}>
        <ListingsEmptyState
          headerTitle="Похожих не нашлось"
          headerNote="по объекту Ленская ул., 10 · 2-комн · 8,6 млн ₽"
          title="Сравнивать не по чему"
          text="У этого объявления пять кадров, и все пять — планировки и снимки двора. Комнат на них нет, поэтому подобрать похожие по виду не из чего."
          actions={[
            {
              id: "numeric",
              label: "Искать по цене и комнатности",
              primary: true,
              onClick: mark("IhrBR", "открыть выдачу: 2-комн, 7,3–9,9 млн ₽, Санкт-Петербург"),
            },
          ]}
          note="Откроется выдача: 2-комн, 7,3–9,9 млн ₽, Санкт-Петербург"
        />
      </Stage>

      <Stage id="a6C5P" name="В коридоре никого нет" action={marked["a6C5P"]}>
        <ListingsEmptyState
          headerTitle="Похожих не нашлось"
          headerNote="по объекту Ленская ул., 10 · 2-комн · 8,6 млн ₽"
          title="В коридоре цены никого нет"
          text="Двухкомнатных в коридоре 7,31–9,89 млн ₽ по городу сейчас нет ни одной, кроме этой. Сравнивать не с чем — это про базу, а не про объект."
          actions={[
            {
              id: "wider",
              label: "Искать шире, ±30 %",
              primary: true,
              onClick: mark("a6C5P", "расширить коридор до ±30 %: 6,02–11,18 млн ₽"),
            },
          ]}
          note="Расширит коридор до ±30 %: 6,02–11,18 млн ₽"
        />
      </Stage>

      {/*
        Мобильная строка стоит здесь же, а не на отдельном стенде: рядом
        с десктопной видно, что это не сжатая копия, а другой порядок фактов.
        Ширина 358 — из файла, это ширина списка внутри экрана 390.
      */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <Typography variant="columnHeader" tone="dense">
            G37qjO
          </Typography>
          <Typography variant="denseText" tone="secondary">
            Строка выдачи, телефон — 358 × 96
          </Typography>
        </div>
        <div
          data-check="mobile-row|rest"
          data-action={marked["G37qjO"]}
          className="flex w-[390px] flex-col gap-2 bg-bg p-4"
        >
          <MobileListingRow
            address="Ленская ул., 10"
            price="8,6 млн ₽"
            deviation={-12}
            meta="14 минут · Ладожская 6 мин · 2-к · 58 м² · 4/9"
            strength="medium"
            publications={3}
            platforms={2}
            phones={1}
            takenBy="ИС"
            status="in-progress"
            actionLabel="Открыть · 0 ₽"
            onOpen={mark("G37qjO", "открыть карточку объекта: Ленская ул., 10")}
            onAction={mark("G37qjO", "открыть контакт: Ленская ул., 10 · 0 ₽")}
          />
          {/* Мета на телефоне короче десктопной: у длинных адресов этаж
              из неё убран, иначе она уходит в третью строку и карточка растёт.
              Так в файле — «1 час · Новочеркасская 8 мин · 3-к · 74 м²». */}
          <MobileListingRow
            address="Стахановцев ул., 14"
            price="12,4 млн ₽"
            deviation={0}
            meta="1 час · Новочеркасская 8 мин · 3-к · 74 м²"
            strength="strong"
            publications={1}
            platforms={1}
            phones={1}
            status="stop-list"
            actionLabel="Просил не звонить"
            blocked
          />
        </div>
      </div>

      <Stage id="cTCZL" name="Сегодня пусто, смена не начата" action={marked["cTCZL"]}>
        <ListingsEmptyState
          headerTitle="На сегодня ничего не назначено"
          headerNote="ни одного перезвона и ни одного объекта в работе"
          title="Смена ещё не началась"
          text="Перезвоны появятся здесь, как только вы назначите время в панели фиксации звонка. Пока можно начать с поиска: по вашим сохранённым фильтрам за ночь пришло девятнадцать новых объектов."
          actions={[
            { id: "search", label: "Открыть поиск", primary: true, onClick: openSearch },
            {
              id: "night",
              label: "Показать новые за ночь",
              onClick: mark("cTCZL", "открыть выдачу: 19 новых объектов по сохранённым поискам"),
            },
          ]}
          footnote="Или продолжите вчерашнее: три объекта раскрыты и ещё не прозвонены"
        />
      </Stage>
    </div>
  )
}
