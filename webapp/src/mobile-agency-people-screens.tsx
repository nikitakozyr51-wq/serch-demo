import { Link, useNavigate } from "@tanstack/react-router"
import { Fragment, useState } from "react"
import { Mail, Users } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { DAILY_LIMITS, dailyLimitCost, dailyLimitWord } from "@/features/agency"
import { useSession } from "@/features/auth"
import {
  MobileBottomNav,
  MobileEmptyState,
  MobileSectionHeader,
  PhoneFrame,
} from "@/features/cabinet"
import { groupDigits } from "@/features/listings"
import { useNow, useWorkspace } from "@/features/workspace"
import type { Person, Workspace } from "@/features/workspace"
import { cn } from "@/lib/utils"
import { DisableStaffSheet } from "@/mobile-agency-sheets"
import { MobileField, MobileOverlaySheet, SheetChoiceRow } from "@/mobile-sheet-parts"

/**
 * Агентство на телефоне: люди и тариф.
 *
 * Три кадра одной темы — `yDYOE` «Карточка сотрудника», `NMEod` «Пригласить
 * агента», `T59AML` «Тариф и подписка». Все три живут за вкладкой «Ещё»:
 * пяти корневым разделам телефона места не хватило, и всё, что касается
 * агентства целиком, спрятано за одним пунктом.
 *
 * Общее у трёх: шапка раздела 56, тело с полями по 16 и зазором 20,
 * нижняя навигация 72. Отличается только вертикальное поле тела —
 * 24 у людей и 20 у тарифа. Так в файле.
 */

/**
 * Кадр телефона на десктопном стенде: 390 × 844 по центру.
 *
 * Форма взята у `mobile-search-screen` и `mobile-call-screen`, чтобы стенд
 * читался одинаково на всех мобильных экранах. Общий `MobileScreen`
 * из `@/features/cabinet` здесь не подходит: он занимает высоту окна,
 * а эти три экрана прижимают действия к низу кадра 844 — вне этой высоты
 * распорка теряет смысл.
 */
function PersonScreen({
  header,
  activeTab,
  children,
}: {
  header: ReactNode
  activeTab: string
  children: ReactNode
}) {
  return (
    <PhoneFrame slot="mobile-screen">
      <>{header}</>
      {children}
      <MobileBottomNav activeId={activeTab} />
    </PhoneFrame>
  )
}

/**
 * Слово справа в шапке: «К списку», «Отмена».
 *
 * В файле это голый текст 14/600 без подложки и без рамки. Область касания
 * растянута до 44 по высоте — видимого следа это не оставляет, но палец
 * попадает в слово, а не мимо: строчка высотой 20 на телефоне не берётся.
 *
 * **Это ссылка, а не кнопка.** Оба слова говорят одно и то же — «верни меня
 * к списку сотрудников», — и список нарисован отдельным экраном со своим
 * адресом. Ссылка открывается в новой вкладке и переживает возврат назад;
 * кнопка ни того, ни другого не умеет.
 */
function HeaderAction({ label, to }: { label: string; to: "/m/agency/staff" }) {
  return (
    <Link
      to={to}
      data-slot="mobile-header-action"
      className="-mx-2 flex h-11 shrink-0 cursor-pointer items-center rounded-md bg-transparent px-2 transition-colors duration-120 outline-none active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <Typography variant="strongText" tone="secondary">
        {label}
      </Typography>
    </Link>
  )
}

// Поле формы телефона переехало в `mobile-sheet-parts`: тот же контрол
// понадобился листу реквизитов агентства, и вторая копия разошлась бы
// с первой на первой же правке. Здесь оно теперь берётся оттуда.

// ─────────────────────────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000

/**
 * Роль и лимит одной строкой: «агент · дневной лимит 5 в сутки».
 *
 * Безлимит бывает только у руководителя — это правило продукта, и в карточке
 * оно видно без открытия прав: `limit === null` и есть безлимит.
 *
 * Лимит приходит отдельным доводом, а не берётся из записи о человеке:
 * руководитель меняет его тут же, листом снизу, и строка обязана показать
 * новое число сразу, а не то, что лежало в журнале до нажатия.
 */
function roleAndLimit(person: Person, limit: number | null): string {
  const role = person.role === "owner" ? "руководитель" : "агент"
  const suffix = limit === null ? "без лимита" : `дневной лимит ${limit} в сутки`
  return `${role} · ${suffix}`
}

/**
 * Счёт по одному сотруднику за тридцать дней.
 *
 * **Числа считаются, а не вписываются.** До этой правки здесь стоял столбик
 * из семи значений сотрудника, нарисованного в Pencil для примера: 18
 * раскрытий, 6 дозвонов, «стоимость встречи 3 582 ₽». Это был образец текста
 * дизайнера, а показывали его живым руководителям как отчёт о работе живого
 * человека.
 *
 * **Порядок столбика прежний и он не случайный:** сверху то, за что
 * заплачено (раскрытия), ниже — что из этого вышло (дозвоны, отказы,
 * возвраты), последней строкой деньги. Руководитель читает сверху вниз
 * и в конце получает цену работы.
 *
 * **Строк стало пять вместо семи.** «Диалогов» и «Встреч» убраны: в словаре
 * исходов продукта («в работе», «дозвонился», «не дозвонился», «отказ»,
 * «посредник», «отложен») ни диалога отдельно от дозвона, ни встречи нет.
 * Вместе с ними ушла «стоимость встречи» — делить деньги не на что. Ровно
 * так же и по той же причине воронка в `derive.ts` живёт без строки «Встреч»:
 * вечно нулевая строка читается как поломка, а не как ноль.
 *
 * Считается здесь, а не в `derive.ts`, потому что разреза по сотруднику там
 * пока нет, а заводить общий счёт ради одного экрана значит придумывать
 * общность, которой ещё не случилось. Появится второй такой экран — счёт
 * переедет туда.
 *
 * Сверка идёт по имени: журналы помнят автора именем (`by`), другого ключа
 * у них нет.
 */
function tallyOf(workspace: Workspace, person: Person, now: number) {
  const since = now - 30 * DAY
  const mine = <T extends { by: string; at: number }>(items: T[]) =>
    items.filter((item) => item.by === person.name && item.at >= since)

  const disclosures = mine(workspace.disclosures)
  const calls = mine(workspace.calls)

  return [
    { name: "Раскрыто контактов", value: String(disclosures.length) },
    {
      name: "Дозвонов",
      value: String(calls.filter((item) => item.outcome === "дозвонился").length),
    },
    {
      name: "Отказов",
      value: String(calls.filter((item) => item.outcome === "отказ").length),
    },
    { name: "Возвратов", value: String(mine(workspace.refunds).length) },
    {
      name: "Потрачено",
      // Пробные и возвращённые раскрытия не считаются: за первые не платили,
      // за вторые деньги вернулись на счёт.
      value: `${groupDigits(
        disclosures
          .filter((item) => !item.trial && !item.refunded)
          .reduce((sum, item) => sum + item.amount, 0),
      )} ₽`,
    },
  ]
}

/**
 * МОБАЙЛ · Сменить дневной лимит (`mCblr`).
 *
 * Лист снизу поверх карточки сотрудника: радиус 24 только сверху, поля
 * [12, 20, 32, 20], зазор 20, хват 36 × 5. Внутри — заголовок 20/600,
 * объяснение, три строки выбора по 60 с кружком 20 и сноска, всё с зазором 14;
 * два действия во всю ширину внизу, главное сверху.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМА ЛИСТА БОЛЬШЕ НЕ СОБИРАЕТСЯ ЗДЕСЬ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Скрим, радиус, поля, хват, жест и ряд действий переехали в
 * `MobileOverlaySheet`, строка выбора — в `SheetChoiceRow`. Этот лист был
 * их первым экземпляром; когда к нему добавилось ещё восемь, копия формы
 * в каждом означала бы девять мест правки на одно изменение листа.
 *
 * Общий `MobileSheet` из `@/features/cabinet` сюда по-прежнему не встаёт:
 * он целый экран со своим адресом — `h-svh` и возврат в историю, — а этот
 * лист лежит поверх карточки внутри кадра 390 × 844 и закрывается её
 * состоянием. Отсюда `position="absolute"`.
 *
 * **Отмена стоит второй кнопкой, а не крестиком.** Смена чужого лимита —
 * решение о чужих деньгах, и выйти из него нужно так же явно, как войти.
 */
function LimitSheet({
  person,
  limit,
  onSave,
  onClose,
}: {
  /** Чей лимит меняют. Имя стоит в заголовке: лимит не бывает «вообще». */
  person: string
  limit: number | null
  onSave: (limit: number | null) => void
  onClose: () => void
}) {
  const [chosen, setChosen] = useState<number | null>(limit)

  return (
    <MobileOverlaySheet
      label="Дневной лимит раскрытий"
      title={`Дневной лимит · ${person}`}
      text={`Сколько контактов агент может раскрыть за сутки. Счётчик обнуляется в 00:00, неизрасходованное не переносится. Сейчас ${dailyLimitWord(limit)}.`}
      // Текст, выбор и сноска идут одной группой с зазором 14, а зазор 20
      // остаётся между группой, хватом и рядом действий. Так в кадре.
      rhythm="medium"
      position="absolute"
      onClose={onClose}
      actions={
        <>
          <Button variant="primary" size="lg" block onClick={() => onSave(chosen)}>
            Сохранить лимит
          </Button>
          <Button variant="quiet" size="lg" block onClick={onClose}>
            Отмена
          </Button>
        </>
      }
    >
      <div
        role="radiogroup"
        aria-label="Дневной лимит раскрытий"
        className="flex w-full flex-col gap-2"
      >
        {DAILY_LIMITS.map((option) => (
          <SheetChoiceRow
            key={option.label}
            label={option.label}
            note={option.note}
            selected={option.value === chosen}
            onSelect={() => setChosen(option.value)}
          />
        ))}
      </div>

      {/* Сноска на телефоне короче, чем на большом экране, — так в кадре.
          Потолок дня в рублях дописан к ней и пересчитывается на каждое
          нажатие: лимит здесь про чужие деньги, а не про число строк. */}
      <Typography variant="metaText" tone="dense">
        <>
          {`Без лимита стоит снимать осознанно: каждое раскрытие тратит общий счёт агентства. ${dailyLimitCost(chosen)}`}
        </>
      </Typography>
    </MobileOverlaySheet>
  )
}

/**
 * МОБАЙЛ · Карточка сотрудника (`yDYOE`).
 *
 * Экран отвечает на один вопрос руководителя: что этот человек сделал
 * за месяц и стоит ли менять ему лимит. Поэтому вся середина — столбик
 * чисел, а два действия внизу прижаты к краю кадра распоркой.
 *
 * **Ответ на этот вопрос теперь можно дать не выходя с экрана.** «Изменить
 * лимит» открывает лист `mCblr` поверх карточки: столбик чисел остаётся
 * за затемнением, и решение принимается рядом с тем, из-за чего оно принято.
 * «Отключить» открывает лист `GIv2U` — тем же способом и по той же причине.
 *
 * **Возврата стрелкой здесь нет — есть слово «К списку».** На телефоне
 * в карточку приходят из списка сотрудников, и слово говорит, куда
 * вернёшься, а стрелка только что вернёшься.
 *
 * **Почта нарисована карточкой, но действия у неё в файле нет.** Ни нажатия,
 * ни состояния — поэтому строка собрана неподвижной: письмо по касанию здесь
 * не выдумано. Телефона в карточке больше нет: продукт хранит у сотрудника
 * имя, почту, роль и лимит, а номер, стоявший в макете, был образцом текста
 * дизайнера.
 *
 * **Чьё имя показывается.** Адрес карточки никого не называет — в файле
 * нарисован один кадр, — поэтому берётся первый приглашённый агент
 * агентства. Себя здесь показывать нечем: своё имя и свой лимит человек
 * смотрит в профиле, а «Отключить» самого себя — не действие.
 */
export function MobilePersonPage() {
  const workspace = useWorkspace()
  const now = useNow()
  const navigate = useNavigate()

  const person = workspace.people.find((item) => item.role === "agent")

  /**
   * Какой лист открыт. Одновременно бывает только один: оба накрывают карточку
   * целиком, и два затемнения друг на друге читались бы как заедание.
   */
  const [sheet, setSheet] = useState<"none" | "limit" | "disable">("none")

  /**
   * Лимит, поменянный в этом сеансе.
   *
   * `undefined` — не трогали, и тогда показывается то, что лежит в журнале.
   * Отличать «не трогали» от «поставили без лимита» приходится третьим
   * значением: `null` здесь занят и означает именно безлимит.
   *
   * Записать выбор некуда: порта «поставить сотруднику лимит» в слое работы
   * пока нет. Поэтому строка под именем меняется сразу, а плашки «сохранено»
   * нет — врать о записи на сервер нечем.
   */
  const [limit, setLimit] = useState<number | null | undefined>(undefined)
  const shownLimit = limit === undefined ? (person?.limit ?? null) : limit

  return (
    <PersonScreen
      activeTab="more"
      header={
        <MobileSectionHeader
          title="Сотрудник"
          action={<HeaderAction label="К списку" to="/m/agency/staff" />}
        />
      }
    >
      {person === undefined ? (
        <MobileEmptyState
          icon={Users}
          title="В агентстве вы один"
          text="Карточка появится, когда агент примет приглашение: в ней видно, сколько контактов он раскрыл за тридцать дней, на какую сумму и чем кончились его звонки."
          action={
            // Переход маршрутизатором, а не ссылкой: кнопка проекта закрыта,
            // `asChild` в ней не работает — Radix ждёт одного ребёнка,
            // а кнопка всегда рисует три. Так же сделано в карточке
            // сотрудника на большом экране.
            <Button
              variant="quiet"
              size="lg"
              onClick={() => void navigate({ to: "/m/agency/invite" })}
            >
              Пригласить агента
            </Button>
          }
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
          <div className="flex w-full shrink-0 items-center gap-3">
            {/* Инициалы вместо фотографии: снимок сотрудника продукт не хранит,
                а пустой кружок ничего бы не говорил. */}
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-warm">
              <Typography variant="panelTitle" tone="default" as="span">
                {person.initials}
              </Typography>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Typography variant="panelTitle" tone="default">
                {person.name}
              </Typography>
              <Typography variant="denseText" tone="dense">
                {roleAndLimit(person, shownLimit)}
              </Typography>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2">
            <div
              data-slot="mobile-contact-row"
              // Обводка внутрь, а не рамка: в файле она высоту не меняет.
              className="flex h-ctl-lg w-full items-center gap-2.5 rounded-xl bg-surface px-3.5 outline-solid outline-1 -outline-offset-1 outline-line-2"
            >
              <Mail aria-hidden className="size-4 shrink-0 text-text-dense" strokeWidth={2} />
              <Typography variant="uiText" tone="default">
                {person.email}
              </Typography>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2">
            <Typography variant="columnHeader" tone="dense">
              ЗА ТРИДЦАТЬ ДНЕЙ
            </Typography>
            {tallyOf(workspace, person, now).map((stat) => (
              <div
                key={stat.name}
                data-slot="mobile-stat-row"
                // Волосяная линия снизу нарисована внутренней тенью: рамка
                // добавила бы 45-й пиксель к строке 44. Линия есть и у последней
                // строки — так в файле, столбик заканчивается чертой.
                className="flex h-11 w-full shrink-0 items-center gap-2.5 shadow-[inset_0_-1px_0_var(--line-1)]"
              >
                <Typography variant="uiText" tone="secondary">
                  {stat.name}
                </Typography>
                <div className="h-px flex-1" />
                <Typography variant="numeric" tone="default">
                  {stat.value}
                </Typography>
              </div>
            ))}
          </div>

          {/* Распорка: действия стоят у нижнего края кадра, под большим пальцем,
              а не сразу за столбиком чисел. */}
          <div className="flex-1" />

          {/*
            «Изменить лимит» открывает лист `mCblr`, «Отключить» — лист `GIv2U`.
            Отключение перестало быть только названным действием: подтверждение
            для него нарисовано, и без него человек терял бы доступ к общему
            счёту от одного касания, сделанного большим пальцем на ходу.
          */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <Button variant="primary" size="lg" block onClick={() => setSheet("limit")}>
              Изменить лимит
            </Button>
            {/*
              «Отключить» — не вторичная кнопка системы: у той тёплая заливка
              и радиус 12, а здесь белая заливка и капсула. Отключение человека
              — вещь редкая и тяжёлая, и в файле она нарочно выглядит пустой
              рамкой, а не готовым к нажатию контролом.
            */}
            <button
              type="button"
              data-slot="mobile-outline-action"
              onClick={() => setSheet("disable")}
              className="flex h-ctl-lg w-full cursor-pointer items-center justify-center rounded-full bg-surface transition-colors duration-120 outline-solid outline-1 -outline-offset-1 outline-border-control active:bg-warm-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="controlLabelLg" tone="secondary">
                Отключить
              </Typography>
            </button>
          </div>
        </div>
      )}

      {/* Листы лежат поверх кадра абсолютом, а не внутри прокручиваемого тела:
          затемнение обязано накрыть и шапку, и нижнюю навигацию. */}
      {person !== undefined && sheet === "limit" ? (
        <LimitSheet
          person={person.name}
          limit={shownLimit}
          onClose={() => setSheet("none")}
          onSave={(next) => {
            setLimit(next)
            setSheet("none")
          }}
        />
      ) : null}

      {person !== undefined && sheet === "disable" ? (
        <DisableStaffSheet
          person={person.name}
          position="absolute"
          onClose={() => setSheet("none")}
          // Порта «снять человеку доступ» в слое входа пока нет: ни в журнале
          // работы, ни в базе. Кнопка листа поэтому называет действие атрибутом
          // — так же, как на большом экране. Появится порт — его вызов встанет
          // сюда, а лист не изменится.
          onDisable={() => setSheet("none")}
        />
      ) : null}
    </PersonScreen>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const INVITE_LIMITS = ["5", "25", "50"]

/**
 * МОБАЙЛ · Пригласить агента (`NMEod`).
 *
 * Форма из трёх решений: кто, куда написать и сколько раскрытий в день.
 * Больше на телефоне не спрашивается — роль, отдел и права выдаются потом
 * в карточке.
 *
 * **Лимит выбирается чипами, а не вводится числом.** Три готовых ответа
 * закрывают почти все случаи, а клавиатура на телефоне отняла бы пол-экрана
 * ради двух цифр. Подсказка под чипами говорит главное: безлимита у агента
 * не бывает.
 *
 * **Блок «Что будет дальше» стоит до кнопки, а не после.** Приглашение
 * тратит чужие деньги — раскрытия агент берёт с общего баланса агентства, —
 * и об этом читают до нажатия, а не в письме потом.
 */
export function MobileInviteAgentPage() {
  const [limit, setLimit] = useState(INVITE_LIMITS[0])

  return (
    <PersonScreen
      activeTab="more"
      header={
        <MobileSectionHeader
          title="Пригласить агента"
          action={<HeaderAction label="Отмена" to="/m/agency/staff" />}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
        {/*
          Поля пустые, и это правка по существу, а не оформление. В макете
          в них стояли имя и почта человека, придуманного дизайнером, чтобы
          кадр не был пустым, — и в продукте руководитель видел форму, уже
          заполненную чужими данными. Приглашение уходит письмом живому
          человеку, и подставленный чужой адрес здесь опаснее, чем неудобство
          пустого поля.
        */}
        <MobileField label="ФАМИЛИЯ И ИМЯ" />
        <MobileField label="РАБОЧАЯ ПОЧТА" type="email" />

        <div className="flex w-full shrink-0 flex-col gap-2">
          <Typography variant="columnHeader" tone="dense">
            ДНЕВНОЙ ЛИМИТ РАСКРЫТИЙ
          </Typography>
          {/*
            Чип лимита — не чип фильтра: тот 28 в высоту и живёт в колонке
            условий, а этот 44 и делит строку на три равные доли. Ступень 44
            здесь обязательна: это единственный контрол формы, который жмут
            пальцем без клавиатуры.
          */}
          <div
            role="radiogroup"
            aria-label="Дневной лимит раскрытий"
            className="flex w-full gap-2"
          >
            {INVITE_LIMITS.map((value) => {
              const selected = value === limit
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-slot="mobile-limit-chip"
                  data-selected={selected || undefined}
                  // Отклик на нажатие, а не на отпускание: выбор виден в тот
                  // момент, когда палец коснулся чипа.
                  onPointerDown={() => setLimit(value)}
                  className={cn(
                    "flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full",
                    "outline-solid outline-1 -outline-offset-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                    "transition-colors duration-120",
                    selected
                      ? "bg-fg text-surface outline-fg active:bg-fg-press"
                      : "bg-surface text-text-2 outline-border-control active:bg-warm-hover",
                  )}
                >
                  <Typography variant={selected ? "controlLabel" : "uiText"} tone="current">
                    {value}
                  </Typography>
                </button>
              )
            })}
          </div>
          <Typography variant="metaText" tone="dense">
            Новому агенту по умолчанию 5. Лимит меняется в любой момент. Безлимит есть
            только у руководителя и агенту не выдаётся.
          </Typography>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-1.5 rounded-lg bg-warm p-3.5">
          <Typography variant="strongText" tone="default">
            Что будет дальше
          </Typography>
          <Typography variant="metaText" tone="dense">
            На почту уйдёт ссылка со сроком 7 дней. Агент задаст пароль и подпишет
            согласие на обработку своих данных. Раскрытия он тратит с общего баланса
            агентства.
          </Typography>
        </div>

        <div className="flex-1" />

        {/*
          Кнопка названа и никуда не ведёт. Экрана «приглашение отправлено»
          в файле нет, а вернуть на список сотрудников значило бы сделать
          отправку неотличимой от «Отмены» в шапке: на глаз произошло бы
          одно и то же, хотя во втором случае агенту ничего не ушло.
        */}
        <Button
          variant="primary"
          size="lg"
          block
          data-action="Отправляет приглашение на рабочую почту, ссылка живёт 7 дней"
        >
          Отправить приглашение
        </Button>
      </div>
    </PersonScreen>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

/** Мест в тарифе. Это условие продукта, оно же названо словами внизу экрана. */
const SEATS = 20

type PlanFact = {
  label: string
  value: string
  unit: string
  /** Последствие под числом. Пусто — сказать нечего, и тогда строки нет. */
  note?: string
}

/**
 * Три факта тарифа. Каждый набран одинаково: подпись капслоком, крупное
 * число, единица и одна строка последствия. Число всегда отвечает на вопрос
 * подписи, а последняя строка — на невысказанный «а дальше что».
 *
 * **Цены — условия продукта, а занятые места — работа агентства.** 3 000 ₽
 * за агентство и 199 ₽ за контакт стоят здесь так же, как на экране входа
 * (`PRICES` в `AuthShell`): они не зависят от того, кто вошёл. А «6 из 20»
 * и «следующее списание 1 августа» зависели — и были неправдой: чужой счёт
 * чужого агентства, попавший в код образцом текста из Pencil. Теперь места
 * считаются по сотрудникам, а вместо выдуманной даты списания стоит то, что
 * известно на самом деле, — остаток пробных раскрытий.
 */
function planFacts(taken: number, trial: number): PlanFact[] {
  return [
    {
      label: "ПОДПИСКА",
      value: "3 000 ₽",
      unit: "в месяц за агентство целиком",
      // Дату следующего списания знает платёжный сервис, которого нет.
      // Пока идёт пробный период, честно сказать можно только про него;
      // когда он кончится, строки не будет вовсе — это лучше правдоподобной
      // даты, по которой человек станет ждать списания.
      note: trial > 0 ? `Пробный период: бесплатных раскрытий осталось ${trial}` : undefined,
    },
    {
      label: "МЕСТА",
      value: `${taken} из ${SEATS}`,
      unit: "сотрудников подключено",
      note: `Свободно мест: ${SEATS - taken}`,
    },
    {
      label: "РАСКРЫТИЯ",
      value: "199 ₽",
      unit: "за контакт собственника",
      note: "Списывается со счёта, не с подписки",
    },
  ]
}

/**
 * МОБАЙЛ · Тариф и подписка (`T59AML`).
 *
 * Экран из трёх чисел, разделённых линиями: сколько стоит подписка, сколько
 * занято мест и сколько стоит одно раскрытие. Таблицы нет — на 390 колонка
 * подписей и колонка значений не встают рядом, и факт разворачивается
 * в столбик: подпись, число, единица, последствие.
 *
 * **Третий факт объясняет, что раскрытия и подписка — разные деньги.**
 * Это главное недоразумение продукта: люди считают, что 3 000 ₽ включают
 * контакты. Строка «Списывается со счёта, не с подписки» стоит ради него.
 *
 * **Переход на расширенный доступ — не апселл, а ответ на упор в потолок.**
 * Блок появляется последним и говорит цену за агентство целиком, а не
 * за сотрудника: цена продукта не растёт от найма.
 */
export function MobilePlanPage() {
  const session = useSession()
  const workspace = useWorkspace()

  // Вошедший человек — уже занятое место, даже если журнал сотрудников пуст:
  // так бывает у записи, сделанной до появления журнала. Ноль занятых мест
  // у агентства, в которое кто-то вошёл, был бы не осторожностью, а ошибкой.
  const taken = Math.max(workspace.people.length, 1)

  return (
    <PersonScreen activeTab="more" header={<MobileSectionHeader title="Тариф" />}>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
        {planFacts(taken, session?.trial ?? 0).map((fact) => (
          <Fragment key={fact.label}>
            <div className="flex w-full shrink-0 flex-col gap-3">
              <Typography variant="columnHeader" tone="dense">
                {fact.label}
              </Typography>
              <Typography variant="cardPrice" tone="default">
                {fact.value}
              </Typography>
              <Typography variant="denseText" tone="secondary">
                {fact.unit}
              </Typography>
              {fact.note === undefined ? null : (
                <Typography variant="denseText" tone="secondary">
                  {fact.note}
                </Typography>
              )}
            </div>
            {/* Делитель фактов. В файле он на четыре единицы светлее `line-1`,
                но такого цвета в палитре проекта нет и заведён он не будет:
                разница между #e7e5e0 и #ebe9e5 не видна, а лишний цвет линии
                виден в системе навсегда. */}
            <div aria-hidden className="h-px w-full shrink-0 bg-line-1" />
          </Fragment>
        ))}

        <div className="flex w-full shrink-0 flex-col gap-3">
          <Typography variant="rowPrice" tone="default">
            Больше двадцати сотрудников
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Дальше включается расширенный доступ: 6 000 ₽ в месяц до пятидесяти
            человек. Цена по-прежнему за агентство целиком, а не за сотрудника.
          </Typography>
          {/* Смена тарифа — счёт и договор, а не экран: в файле за этой
              кнопкой ничего не нарисовано, поэтому она названа и молчит. */}
          <Button
            variant="primary"
            size="lg"
            block
            data-action="Переводит агентство на расширенный доступ: 6 000 ₽ в месяц до пятидесяти человек"
          >
            Перейти на расширенный
          </Button>
        </div>
      </div>
    </PersonScreen>
  )
}
