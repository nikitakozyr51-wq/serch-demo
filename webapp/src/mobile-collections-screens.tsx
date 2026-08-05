import { Link, useNavigate } from "@tanstack/react-router"
import { useId, useState } from "react"
import { Bookmark, Plus, Share2 } from "lucide-react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useOwnAgency } from "@/features/auth"
import { MobileEmptyState, MobileScreen, MobileSectionHeader, MobileSheet } from "@/features/cabinet"
import { ListingPhoto } from "@/features/listings"
import { cn } from "@/lib/utils"

/**
 * ПОДБОРКИ на телефоне: список, подборка изнутри, создание и публичная
 * страница для клиента.
 *
 * Снято с кадров `sFBTe`, `L10Ikr`, `nVXGr`, `MHLlO`.
 *
 * **Вся экономика подборок держится на одном правиле: на публичной странице
 * телефона собственника нет ни в каком виде.** Иначе цена контакта обнулялась
 * бы первой же пересылкой — агент отдал ссылку, клиент переслал знакомому,
 * знакомый позвонил собственнику сам. Поэтому правило сказано трижды и в трёх
 * разных местах: агенту — в сводке подборки, агенту при создании — текстом,
 * который нельзя снять галочкой, и клиенту — внизу публичной страницы.
 *
 * Три первых экрана живут в кабинете и стоят на нижней навигации. Четвёртый
 * не кабинет вовсе: у него своя шапка, нет вкладок, и телефон на нём ровно
 * один — агента.
 */

/** Шесть комнат подборки «Расселение, Лиговка». Одни и те же объекты видят агент и клиент — по-разному. */
const OBJECTS = [
  {
    id: "ligovsky-44",
    address: "Лиговский пр., 44",
    price: "6,4 млн ₽",
    // Агенту в строку помещается метро с адресом, клиенту метро идёт отдельной строкой.
    agentMeta: "комната 18 м² в 4-к · 3/5 эт · Лиговский пр. 4 мин",
    clientMeta: "комната 18 м² в 4-к · 3/5 эт",
    clientMetro: "Лиговский проспект, 4 мин пешком",
  },
  {
    id: "marata-12",
    address: "ул. Марата, 12",
    price: "5,8 млн ₽",
    agentMeta: "комната 16 м² в 5-к · 2/6 эт · Владимирская 7 мин",
    clientMeta: "комната 16 м² в 5-к · 2/6 эт",
    clientMetro: "Владимирская, 7 мин пешком",
  },
  {
    id: "razezzhaya-26",
    address: "Разъезжая ул., 26",
    price: "7,1 млн ₽",
    agentMeta: "комната 21 м² в 4-к · 4/5 эт · Достоевская 6 мин",
    clientMeta: "комната 21 м² в 4-к · 4/5 эт",
    clientMetro: "Достоевская, 6 мин пешком",
  },
  {
    id: "svechnoy-9",
    address: "Свечной пер., 9",
    price: "4,9 млн ₽",
    agentMeta: "комната 14 м² в 6-к · 1/5 эт · Лиговский пр. 9 мин",
    clientMeta: "комната 14 м² в 6-к · 1/5 эт",
    clientMetro: "Лиговский проспект, 9 мин пешком",
  },
  {
    id: "borovaya-31",
    address: "Боровая ул., 31",
    price: "6,9 млн ₽",
    agentMeta: "комната 19 м² в 3-к · 5/5 эт · Обводный канал 11 мин",
    clientMeta: "комната 19 м² в 3-к · 5/5 эт",
    clientMetro: "Обводный канал, 11 мин пешком",
  },
  {
    id: "tambovskaya-8",
    address: "Тамбовская ул., 8",
    price: "5,2 млн ₽",
    agentMeta: "комната 15 м² в 5-к · 2/5 эт · Обводный канал 8 мин",
    clientMeta: "комната 15 м² в 5-к · 2/5 эт",
    clientMetro: "Обводный канал, 8 мин пешком",
  },
]

/**
 * Чип «Открыта» (`mrzcW`): 32, поля [0, 8], радиус 8, зелёная плашка.
 *
 * Свой, а не `StatusChip`: тот несёт восемь состояний объекта — «В работе»,
 * «Раскрыт», «Стоп-лист». Здесь речь не об объекте, а о ссылке подборки,
 * и набор у неё другой. Геометрия совпадает с телефонным `StatusChip`
 * один в один, потому что она общая для чипов на телефоне, а не потому,
 * что это тот же чип.
 */
function CollectionLinkChip({ label }: { label: string }) {
  return (
    <span
      data-slot="collection-link-chip"
      className="inline-flex h-8 shrink-0 items-center rounded-md bg-ok-tint px-2 text-ok-text"
    >
      <Typography variant="chipLabel" tone="current">
        {label}
      </Typography>
    </span>
  )
}

/**
 * Значок-действие в шапке раздела: «плюс» и «поделиться».
 *
 * **Расхождение с полом касания.** В файле значок нарисован 24 × 24 и стоит
 * впритык к правому полю шапки; пол касания на телефоне — 44. Воспроизведено
 * как в файле: менять размер значит менять раскладку шапки, а это решение
 * владельца, а не вёрстки.
 *
 * **Два значка ведут себя по-разному, и это не небрежность.** За «плюсом»
 * нарисован экран — лист «Новая подборка», — и «плюс» ссылка. За «поделиться»
 * экрана нет: на десктопе это кнопка «Скопировать публичную ссылку», то есть
 * действие без окна. Значок поэтому называет, что случится, и ничего
 * не рисует.
 */

/** Общий вид обоих значков: ссылка и кнопка обязаны выглядеть одинаково. */
const HEADER_ICON_CLASS =
  "flex size-6 shrink-0 cursor-pointer items-center justify-center bg-transparent text-fg outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"

/** «Плюс»: ведёт на лист «Новая подборка». */
function HeaderIconLink({
  label,
  icon,
  to,
}: {
  label: string
  icon: React.ReactNode
  to: "/m/collections/new"
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      data-slot="mobile-header-action"
      className={HEADER_ICON_CLASS}
    >
      <>{icon}</>
    </Link>
  )
}

/** «Поделиться»: копирует ссылку, окна для этого нет. */
function HeaderIconAction({
  label,
  icon,
  action,
}: {
  label: string
  icon: React.ReactNode
  /** Что произойдёт при нажатии. Окна для этого в файле нет. */
  action: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-action={action}
      data-slot="mobile-header-action"
      className={HEADER_ICON_CLASS}
    >
      <>{icon}</>
    </button>
  )
}

const COLLECTIONS = [
  {
    id: "rassel-ligovka",
    name: "Расселение, Лиговка",
    meta: "6 объектов · открыта 124 раза, сегодня в 11:05",
    linkState: "Открыта",
  },
  {
    id: "krasnogvardeysky",
    name: "Красногвардейский до 10",
    meta: "4 объекта · ссылка не открывалась, создана вчера",
  },
  {
    id: "nevsky-kovalevy",
    name: "Невский, 2-к для Ковалёвых",
    meta: "3 объекта · открыта 8 раз, 22.07",
  },
  {
    id: "doli-komnaty",
    name: "Доли и комнаты, отбор",
    meta: "2 объекта · ссылка не создана, 19.07",
  },
]

/**
 * МОБАЙЛ · Подборки (`sFBTe`).
 *
 * Шапка 56 с заголовком и «плюсом», тело с полями [8, 16, 0, 16], четыре
 * строки по 88 с волосяной линией снизу, нижняя навигация 72.
 *
 * **Список отвечает на один вопрос: работает ли ссылка.** Поэтому вторая
 * строка каждой подборки — не описание и не автор, а судьба ссылки:
 * «открыта 124 раза», «ссылка не открывалась», «ссылка не создана». Для агента
 * это единственная разница между подборкой, которая продаёт, и папкой,
 * про которую забыли. Чип «Открыта» стоит только там, где клиент реально
 * заходил: на четырёх строках зелёное пятно перестало бы что-либо значить.
 *
 * На десктопе это таблица с шестью колонками — автор, обновлена, просмотров,
 * ссылка. На 390 колонок нет вовсе, и всё, кроме имени и судьбы ссылки,
 * ушло внутрь подборки.
 */
export function MobileCollectionsPage() {
  // Свой кабинет начинается пустым: чужие строки сюда не переходят.
  const own = useOwnAgency()

  return (
    <MobileScreen
      activeTab="collections"
      padded={false}
      header={
        <MobileSectionHeader
          title="Подборки"
          action={
            <HeaderIconLink
              label="Новая подборка"
              to="/m/collections/new"
              icon={<Plus aria-hidden className="size-6" strokeWidth={2} />}
            />
          }
        />
      }
    >
      <div className="flex w-full flex-col px-4 pt-2">
        {/* Строка — ссылка внутрь подборки. Подборка изнутри нарисована одна,
            «Расселение, Лиговка», и в демонстрации она стоит за любой строкой
            списка: показывать три мёртвые строки и одну живую хуже. */}
        {own ? (
          <MobileEmptyState
            icon={Bookmark}
            title="Подборок пока нет"
            text="Подборка — это ссылка клиенту на отобранные объекты. Телефон собственника в ней скрыт всегда."
          />
        ) : (
          COLLECTIONS.map((collection) => (
            <Link
              key={collection.id}
              to="/m/collections/inside"
              data-slot="mobile-collection-row"
              // Линия снизу нарисована внутренней тенью, а не рамкой: в файле
              // обводка идёт внутрь и высоту строки не меняет.
              className="flex w-full cursor-pointer items-center gap-3 bg-transparent py-4 text-left shadow-[inset_0_-1px_0_var(--line-2)] outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg"
            >
              {/* Обложка 56 — кадр первого объекта. Кадра может не быть,
                  и это обычное состояние слота, а не сбой. */}
              <div className="size-14 shrink-0 overflow-hidden rounded-md">
                <ListingPhoto alt={collection.name} size="small" reason="no-photos" />
              </div>
  
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex w-full items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Typography variant="rowPrice" tone="default">
                      {collection.name}
                    </Typography>
                  </div>
                  {collection.linkState === undefined ? null : (
                    <CollectionLinkChip label={collection.linkState} />
                  )}
                </div>
                <Typography variant="denseText" tone="secondary">
                  {collection.meta}
                </Typography>
              </div>
            </Link>
          ))
        )}
      </div>
    </MobileScreen>
  )
}

/**
 * МОБАЙЛ · Подборка изнутри (`L10Ikr`).
 *
 * Шапка 56 со стрелкой назад и значком «поделиться», сводка, шесть строк
 * по 80 с волосяной линией снизу, кроме последней.
 *
 * **Сводка объясняет клиентскую страницу до того, как агент нажмёт «поделиться».**
 * Две строки: что уже случилось со ссылкой («открыта 124 раза») и что увидит
 * клиент («фото, цену и адрес; телефон собственника не показывается»). Второе
 * важнее первого: агент отдаёт ссылку человеку со стороны и обязан знать,
 * что именно он отдаёт.
 *
 * **Перетаскивания здесь нет.** На десктопе у каждой строки слева ручка
 * захвата — порядок объектов агент задаёт сам, и клиент видит тот же порядок.
 * На телефоне ручки нет: в файле её не нарисовали, и порядок на 390
 * не меняют. Это осознанная потеря, а не забытая деталь.
 */
export function MobileCollectionInsidePage() {
  return (
    <MobileScreen
      activeTab="collections"
      padded={false}
      header={
        <MobileSectionHeader
          title="Расселение, Лиговка"
          back
          action={
            <HeaderIconAction
              label="Поделиться ссылкой"
              action="Копирует публичную ссылку подборки"
              icon={<Share2 aria-hidden className="size-6" strokeWidth={2} />}
            />
          }
        />
      }
    >
      <div className="flex w-full flex-col px-4 pt-2">
        <div className="flex w-full flex-col gap-1 pt-3 pb-4 shadow-[inset_0_-1px_0_var(--line-2)]">
          <Typography variant="denseText" tone="secondary">
            6 объектов · ссылка открыта 124 раза
          </Typography>
          <Typography variant="metaText" tone="dense">
            Клиент видит фото, цену и адрес. Телефон собственника на публичной
            странице не показывается.
          </Typography>
        </div>

        {OBJECTS.map((object, index) => (
          <div
            key={object.id}
            data-slot="mobile-collection-object"
            className={cn(
              "flex w-full items-center gap-3 py-3",
              // Под последней строкой линии нет: список кончился, и делить
              // больше нечего.
              index < OBJECTS.length - 1 && "shadow-[inset_0_-1px_0_var(--line-2)]",
            )}
          >
            <div className="size-14 shrink-0 overflow-hidden rounded-md">
              <ListingPhoto alt={object.address} size="small" reason="no-photos" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Typography variant="strongText" tone="default">
                {object.address}
              </Typography>
              <Typography variant="metaText" tone="dense">
                {object.agentMeta}
              </Typography>
            </div>

            {/* Цена держит колонку 88 и выключена вправо: шесть цен подряд
                читаются столбиком, а не вразнобой за концом адреса. */}
            <div className="w-22 shrink-0">
              <Typography variant="strongText" tone="default" align="end">
                {object.price}
              </Typography>
            </div>
          </div>
        ))}
      </div>
    </MobileScreen>
  )
}

/** Кому открыта подборка. Набор закрыт двумя значениями — третьего в файле нет. */
type CollectionAccess = "link" | "agency"

const ACCESS_OPTIONS: { id: CollectionAccess; label: string }[] = [
  { id: "link", label: "Ссылка для клиента" },
  { id: "agency", label: "Только внутри агентства" },
]

/**
 * МОБАЙЛ · Новая подборка (`nVXGr`).
 *
 * Лист снизу: скрим, радиус 24 сверху, поля [12, 20, 32, 20], зазор 20.
 * Внутри три группы с зазором 8 — название, доступ, действия.
 *
 * **Главное правило подборок стоит вторым абзацем и не имеет переключателя:**
 * «Клиент увидит объекты без контактов собственников. Это правило снять
 * нельзя». Галочки «показать телефон» здесь нет и не будет — на ней держится
 * цена контакта. Выбор ниже совсем о другом: кому вообще открыта подборка,
 * клиенту по ссылке или только своим.
 *
 * Подсказка под названием говорит, что название увидит клиент. Без неё агент
 * пишет служебное «Ковалёвы, торг до 6», и это уходит человеку.
 */
export function MobileNewCollectionPage() {
  const [access, setAccess] = useState<CollectionAccess>("link")
  const nameFieldId = useId()
  // Кнопки листа переносят на нарисованные экраны, но ссылками стать не могут:
  // `Button` закрыт для className, а его `asChild` заворачивает ссылку внутрь
  // подписи, и вид кнопки достаётся не ссылке. Поэтому переход здесь через
  // маршрутизатор — это по-прежнему настоящий переход, только без открытия
  // в новой вкладке.
  const navigate = useNavigate()

  return (
    <MobileSheet
      title="Новая подборка"
      text="Клиент увидит объекты без контактов собственников. Это правило снять нельзя."
    >
      {/* Одна обёртка с зазором 20: лист даёт своим детям зазор 8, а между
          группами в файле стоит 20 — тот же шаг, что между хватом,
          заголовком и содержимым. */}
      <div className="flex w-full flex-col gap-5">
        <div className="flex w-full flex-col gap-2">
          <Typography
            as="label"
            variant="columnHeader"
            tone="dense"
            htmlFor={nameFieldId}
          >
            НАЗВАНИЕ ПОДБОРКИ
          </Typography>

          {/*
            Поле 48 с радиусом 12 на фоне `bg` — не `TextField`: тот 40,
            с радиусом 10, белый и с границей контрола. Другая высота, другой
            радиус, другая заливка — значит другой контрол, а не настройка
            существующего.
          */}
          <Typography asChild variant="controlLabelLg">
            <input
              id={nameFieldId}
              defaultValue="Расселение, Лиговка"
              className="h-ctl-lg w-full rounded-xl bg-bg px-4 text-fg outline-solid outline-1 -outline-offset-1 outline-line-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            />
          </Typography>

          <Typography variant="metaText" tone="dense">
            клиент увидит это название на странице подборки
          </Typography>
        </div>

        <div
          role="radiogroup"
          aria-label="Кому открыта подборка"
          className="flex w-full flex-col gap-2"
        >
          {ACCESS_OPTIONS.map((option) => {
            const selected = option.id === access
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-slot="collection-access"
                // Отклик на нажатие пальцем, а не на отпускание: выбор
                // должен подсветиться в тот момент, когда палец коснулся.
                onPointerDown={() => setAccess(option.id)}
                onClick={() => setAccess(option.id)}
                className={cn(
                  "flex h-ctl-lg w-full cursor-pointer items-center gap-3 rounded-xl px-4",
                  "outline-solid outline-1 -outline-offset-1 outline-border-control",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                  selected ? "bg-warm" : "bg-transparent",
                )}
              >
                {/* Выбранный кружок в файле залит графитом целиком, без белого
                    просвета внутри. Так и воспроизведено. */}
                <span
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 rounded-full",
                    selected
                      ? "bg-fg"
                      : "bg-transparent outline-solid outline-1 -outline-offset-1 outline-border-control",
                  )}
                />
                <Typography variant="uiText" tone="default">
                  {option.label}
                </Typography>
              </button>
            )
          })}
        </div>

        <div className="flex w-full flex-col gap-2">
          {/* Создали — и оказались внутри подборки, а не вернулись в список:
              дальше агент собирает в неё объекты, а не смотрит на папку. */}
          <Button
            variant="primary"
            size="lg"
            block
            onClick={() => void navigate({ to: "/m/collections/inside" })}
          >
            Создать подборку
          </Button>
          {/* Лист закрывается возвратом к списку: под ним нарисован он. */}
          <Button
            variant="quiet"
            size="lg"
            block
            onClick={() => void navigate({ to: "/m/collections" })}
          >
            Отмена
          </Button>
        </div>
      </div>
    </MobileSheet>
  )
}

/**
 * МОБАЙЛ · Подборка для клиента (`MHLlO`).
 *
 * Публичная страница вне кабинета: шапка 56 с логотипом и именем агентства,
 * тело с полями [24, 16] и зазором 28, липкая полоса снизу с агентом и одной
 * кнопкой.
 *
 * **Это единственный экран продукта, который видит не агент, а его клиент**, —
 * и он собран по другим правилам. Фотография во всю ширину и 240 в высоту
 * вместо кадра 56, адрес и цена одной ступенью 20, между объектами 28 вместо
 * волосяной линии. Клиент не сравнивает шесть строк глазами по колонке, он
 * листает и смотрит.
 *
 * **Телефона собственника здесь нет ни у одного объекта, и это сказано вслух
 * внизу страницы.** Телефон на странице ровно один — агента, в липкой полосе,
 * которая не уезжает при прокрутке. Ссылка живёт своей жизнью после пересылки,
 * поэтому адрес страницы напечатан текстом: человек, которому её переслали,
 * видит, где он находится.
 */
export function MobileClientCollectionPage() {
  return (
    <div
      data-slot="mobile-client-collection"
      className="flex min-h-svh w-full flex-col bg-bg"
    >
      <header
        data-slot="client-collection-header"
        className="flex h-header w-full shrink-0 items-center gap-3 bg-surface px-4 shadow-[inset_0_-1px_0_var(--line-2)]"
      >
        <div className="flex items-center gap-1.5">
          <Typography variant="panelTitle" tone="default">
            Сёрчь
          </Typography>
          <span aria-hidden className="size-1.5 rounded-full bg-accent-bright" />
        </div>
        <div className="h-px flex-1" />
        {/* Имя агентства, а не агента: клиент пришёл по ссылке и должен
            понимать, чья это страница, ещё до того, как долистает до подписи. */}
        <Typography variant="metaText" tone="dense">
          «Невский проспект»
        </Typography>
      </header>

      <div className="flex w-full flex-1 flex-col gap-7 px-4 py-6">
        <div className="flex w-full flex-col gap-2">
          <Typography variant="cardPrice" tone="default" as="h1">
            Расселение, Лиговка
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Шесть объектов, отобранных для вас
          </Typography>
        </div>

        <div className="flex w-full flex-col gap-7">
          {OBJECTS.map((object) => (
            <div
              key={object.id}
              data-slot="client-collection-object"
              className="flex w-full flex-col gap-3"
            >
              <div className="h-60 w-full overflow-hidden rounded-2xl">
                <ListingPhoto alt={object.address} size="large" reason="no-photos" />
              </div>

              <div className="flex w-full flex-col gap-1">
                <div className="flex w-full items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Typography variant="panelTitle" tone="default" as="h2">
                      {object.address}
                    </Typography>
                  </div>
                  {/* Цена той же ступенью, что адрес: клиенту они равны,
                      и ни одна не важнее другой. */}
                  <Typography variant="panelTitle" tone="default" as="span" align="end">
                    {object.price}
                  </Typography>
                </div>
                <Typography variant="denseText" tone="dense">
                  {object.clientMeta}
                </Typography>
                <Typography variant="denseText" tone="dense">
                  {object.clientMetro}
                </Typography>
              </div>
            </div>
          ))}
        </div>

        <Typography variant="metaText" tone="dense">
          Телефон собственника на этой странице не показывается. По любому объекту
          звоните своему агенту.
        </Typography>

        <Typography variant="metaText" tone="dense">
          serch.ru/p/rassel-ligovka-8f3a
        </Typography>
      </div>

      {/* Полоса липкая, а не прижатая: страница длинная, и агент с кнопкой
          обязаны быть под пальцем на любом объекте, а не только в конце. */}
      <div
        data-slot="client-collection-agent"
        className="sticky bottom-0 flex w-full items-center gap-3 bg-surface px-4 pt-3 pb-6 shadow-[inset_0_1px_0_var(--line-2)]"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Typography variant="panelTitle" tone="default" as="span">
            Смирнова Ирина
          </Typography>
          <Typography variant="denseText" tone="dense">
            +7 900 000-57-66
          </Typography>
        </div>
        {/* Кнопка названа и молчит: клиент уходит из продукта в свой мессенджер
            или в звонок, и экрана для этого у нас нет и быть не может. */}
        <Button
          variant="primary"
          size="lg"
          data-action="Пишет агенту: клиент уходит в свой мессенджер"
        >
          Написать
        </Button>
      </div>
    </div>
  )
}
