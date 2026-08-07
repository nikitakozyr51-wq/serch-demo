import { ListFilter } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { FilterChip } from "@/components/controls/FilterChip"
import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Колонка фильтров.
 *
 * Геометрия снята с `I55fb` экрана `ghwPj`: ширина 260, вертикально,
 * зазор между группами 24, поля 14, заливка `surface`, волосяная линия справа.
 * Внутри группы зазор 16, между чипами 8. Чип 28 с радиусом капсулы и полями
 * [0, 12]; поле 32 с радиусом 8 и полями [0, 10]; строка адреса 40 с радиусом 12.
 *
 * Групп семь, а не сколько получится: район, цена, площадь, этаж, метро,
 * рядом с адресом и «ещё фильтры». Состав снят с макета целиком —
 * в первой сборке я обошёлся четырьмя, и это было расхождение.
 *
 * Два правила DESIGN.md действуют здесь буквально:
 *
 * **Фильтры никогда не перекрывают выдачу** — это колонка, а не всплывающая
 * панель: агент видит условия и результат одновременно.
 *
 * **Кнопки «Применить» не существует.** Счётчик найденного пересчитывается
 * на каждом касании контрола. Фильтр обязан описывать выдачу, а не спорить с ней.
 */

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <Typography variant="columnHeader" tone="dense">
      {children}
    </Typography>
  )
}

/**
 * Группа условий: метка и ряды чипов.
 *
 * **Ряды заданы явно, а не автопереносом.** В файле у «Района» три ряда
 * отдельными кадрами — «Красногвардейский» стоит один, — и автоперенос такого
 * не даст: «Красногвардейский» с «Невским» помещаются в 232 с запасом 6 px
 * и склеятся в один ряд. Расхождение видно не на чипе, а на всей колонке:
 * группа выходит 88 вместо 148, и всё, что ниже, уезжает вверх на 60 px.
 *
 * Зазор между рядами 16, между чипами в ряду 8 — это разные числа, и общий
 * `gap` их путал. У «Ещё фильтров» ряды идут через 8: это не условия,
 * а список того, что можно добавить.
 */
function FilterGroup({
  label,
  rows,
  rowGap = "gap-4",
}: {
  label: string
  rows: ReactNode[]
  rowGap?: "gap-4" | "gap-2"
}) {
  return (
    <div data-slot="filter-group" className={cn("flex w-full flex-col", rowGap)}>
      <GroupLabel>{label}</GroupLabel>
      {rows.map((row, index) => (
        // Ряд переносится, когда чипов больше, чем влезает в 231.
        // В файле нарисовано по два-три чипа в ряд, и переносить было нечего;
        // с настоящей базой районов восемь, и без переноса они уезжают
        // за край колонки — фильтр становится нерабочим, а не некрасивым.
        <div key={index} className="flex w-full flex-wrap gap-2">
          <>{row}</>
        </div>
      ))}
    </div>
  )
}

/**
 * Поле диапазона: цена и площадь. Высота 32, радиус 8, поля [0, 10],
 * граница контрола `#8a867f`. Это не чип: значение вводится, а не выбирается.
 *
 * Значение идёт ступенью 13, а не 14: в колонке шириной 232 четырнадцатый
 * кегль не помещается. Заполненное поле графитом, пустое — приглушённым;
 * в макете цена заполнена, а площадь стоит подсказкой.
 */
function RangeField({ value, empty }: { value: string; empty?: boolean }) {
  return (
    <div
      data-slot="range-field"
      className="flex h-ctl-sm min-w-0 flex-1 items-center rounded-md border border-border-control bg-surface px-2.5"
    >
      <Typography variant="denseText" tone={empty ? "dense" : "default"}>
        {value}
      </Typography>
    </div>
  )
}

type ChipOption = {
  id: string
  label: string
  selected?: boolean
  /** Подсказка, а не условие: граница светлее. Так набраны станции метро. */
  muted?: boolean
}

/** Ряды чипов. Разбивка снята с файла, а не отдана автопереносу. */
type ChipRows = ChipOption[][]

type FilterPanelProps = {
  /** Сколько условий сейчас сужают выдачу. Отвечает на «почему так мало нашлось». */
  activeCount: number
  districts: ChipRows
  price: [string, string]
  area: [string, string]
  floor: ChipRows
  metro: ChipRows
  /** Строка «Лиговский пр., 44 · 1 км» с ссылкой «Изменить». */
  nearAddress?: string
  more: ChipRows
  onReset?: () => void
  onToggle?: (group: string, optionId: string) => void
  onChangeAddress?: () => void
  onSaveSearch?: () => void
  /**
   * Колонка показана наложением поверх выдачи, а не встроена в раскладку.
   *
   * Так она живёт на узком экране: место под постоянный столбец там кончилось,
   * но выдача обязана остаться видимой справа — иначе повторяется главная
   * ошибка конкурента, где во время настройки результата не видно.
   */
  overlay?: boolean
}

function FilterPanel({
  activeCount,
  districts,
  price,
  area,
  floor,
  metro,
  nearAddress,
  more,
  onReset,
  onToggle,
  onChangeAddress,
  onSaveSearch,
  overlay = false,
}: FilterPanelProps) {
  const chipRows = (group: string, rows: ChipRows) =>
    rows.map((row) =>
      row.map((option) => (
        <FilterChip
          key={option.id}
          label={option.label}
          selected={option.selected}
          muted={option.muted}
          onClick={() => onToggle?.(group, option.id)}
        />
      )),
    )

  return (
    <aside
      data-slot="filter-panel"
      data-overlay={overlay || undefined}
      // Плотный режим сжимает и колонку: поля 14 → 12, зазор групп 24 → 12.
      className={cn(
        "flex w-filters shrink-0 flex-col gap-6 overflow-y-auto border-r border-line-2 bg-surface p-3.5 compact:gap-3 compact:p-3",
        overlay
          ? // Наложение начинается от края сайдбара и идёт до низа окна.
            // Тень вправо отделяет панель от выдачи, которая остаётся видимой.
            //
            // Тень здесь — расхождение с DESIGN.md, где теней в продукте нет
            // вовсе («мы на позиции Nike, и это позиция, а не пробел»).
            // Расхождение названо и ограничено одним местом: панель ВИСИТ
            // над выдачей, и без тени край панели читается как край экрана,
            // а выдача под ней — как обрезанная.
            "panel-in fixed top-(--height-header) bottom-0 left-(--width-sidebar) z-40 h-auto shadow-[24px_0_60px_-20px_#1e1e1e33]"
          : "h-full",
      )}
    >
      <div className="flex w-full items-center gap-2">
        {/*
          Имя колонки. Оно пропадало: 4 августа сегмент «Продажа | Аренда»
          встал в шапку колонки и вытеснил слово «Фильтры». При жалобе
          «три сущности поиска путаются» безымянная колонка — прямое
          ухудшение, и имя вернулось.

          «Сбросить» при этом уехало вниз, в один ряд с «Сохранить поиск»:
          это действие над всей колонкой, и место ему там, где настройку
          заканчивают, а не там, где начинают.
        */}
        <GroupLabel>Фильтры</GroupLabel>
      </div>

      {/*
        «Только собственники» — свойство продукта, а не фильтр: переключателя
        у него нет и быть не должно. Поэтому здесь строка, а не чекбокс.
        Пояснение в две строки: длиннее оно съедало место у самих условий.
      */}
      <div data-slot="owners-only" className="flex w-full flex-col gap-1">
        <Typography variant="metaStrong" tone="default">
          Только собственники
        </Typography>
        <Typography variant="metaText" tone="dense">
          Посредники отсеяны до выдачи. Выключить нельзя — это и есть продукт.
        </Typography>
      </div>

      <FilterGroup label="Район" rows={chipRows("district", districts)} />

      <div className="flex w-full flex-col gap-4">
        <GroupLabel>Цена, ₽</GroupLabel>
        <div className="flex w-full gap-2">
          <RangeField value={price[0]} />
          <RangeField value={price[1]} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-4">
        <GroupLabel>Площадь, м²</GroupLabel>
        <div className="flex w-full gap-2">
          <RangeField value={area[0]} empty />
          <RangeField value={area[1]} empty />
        </div>
      </div>

      <FilterGroup label="Этаж" rows={chipRows("floor", floor)} />
      <FilterGroup label="Метро" rows={chipRows("metro", metro)} />

      {nearAddress ? (
        <div className="flex w-full flex-col gap-4">
          <GroupLabel>Рядом с адресом</GroupLabel>
          <div
            data-slot="near-address"
            className="flex h-ctl-md w-full items-center gap-2 rounded-xl border border-line-2 bg-surface px-3"
          >
            {/* 232 − 24 поля − 8 зазор = 208, и адрес с «Изменить» занимают
                ровно 145 + 55. Запаса нет: на своих ступенях строка сходится
                впритык, на чужих — расходится. Обрезки здесь быть не должно. */}
            <span className="min-w-0 flex-1">
              <Typography variant="denseText" tone="default">
                {nearAddress}
              </Typography>
            </span>
            <button
              type="button"
              onClick={onChangeAddress}
              className="shrink-0 cursor-pointer bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
            >
              <Typography variant="metaStrong" tone="default">
                Изменить
              </Typography>
            </button>
          </div>
        </div>
      ) : null}

      <FilterGroup label="Ещё фильтры" rows={chipRows("more", more)} rowGap="gap-2" />

      <div className="flex-1" />

      {/*
        Низ колонки: два действия над всей настройкой сразу.

        **Друг под другом, а не в ряд.** В ряд они не помещаются, и это
        не вкусовщина: колонка 260, поля 14 с каждой стороны, «Сохранить
        поиск» со значком занимает 188 из оставшихся 232 — «Сбросить 7»
        рядом не влезает на 34 px. Проверка переполнения назвала это числом
        раньше, чем глаз.

        «Сохранить поиск» главное — оно и есть смысл колонки: условия,
        которые будут приносить новое сами. «Сбросить» под ним подписью,
        а не кнопкой: кнопка одного веса спорила бы с ним за нажатие.
      */}
      <div className="flex w-full shrink-0 flex-col items-center gap-2">
        <Button
          variant="quiet"
          size="md"
          block
          onClick={onSaveSearch}
          iconLeft={<ListFilter aria-hidden className="size-3.5" strokeWidth={2} />}
        >
          Сохранить поиск
        </Button>
        {activeCount === 0 ? null : (
          <button
            type="button"
            data-slot="filter-reset"
            onClick={onReset}
            className="cursor-pointer bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="metaStrong" tone="default">
              <>Сбросить {activeCount}</>
            </Typography>
          </button>
        )}
      </div>
    </aside>
  )
}

export { FilterPanel }
export type { FilterPanelProps, ChipOption }
