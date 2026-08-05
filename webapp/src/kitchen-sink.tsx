import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Checkbox } from "@/components/controls/Checkbox"
import { FilterChip } from "@/components/controls/FilterChip"
import { TextField } from "@/components/controls/TextField"
import { Typography } from "@/components/typography"
import {
  FilterPanel,
  ListingRow,
  ListingsEmptyState,
  PhotoPlaceholder,
  ResultsHeader,
  ResultTabs,
} from "@/features/listings"

/**
 * Полигон контролов — точная копия доски `СИСТЕМА · Состояния контролов` (`nXleb`).
 *
 * Раскладка снята замером: поля 64 и 120, зазор секций 48, колонки по 180
 * с зазором 24, ячейка состояния 180 × 64, волосяная линия `line-2` сверху ряда,
 * поля ряда [16, 0], отступ шапки таблицы снизу 12.
 *
 * Наведение, фокус и нажатие показаны неподвижно через проп `demo`. Он дописывает
 * тот же класс, что и настоящий псевдокласс, поэтому значения не раздваиваются.
 *
 * Каждая ячейка помечена `data-check="<контрол>|<состояние>"` — по этой метке
 * проверка `design-check` находит контрол и сверяет его с эталоном доски
 * в `design-check/reference/controls.json`. Метка не декоративная: без неё
 * сверка не работает, поэтому её нельзя снимать при правках страницы.
 *
 * Единственное осознанное расхождение с доской: её собственная проза набрана
 * кеглем 15, а это ступень лестницы сайта, которой в кабинете нет. Взят
 * ближайший кабинетный — 14. Контролов это не касается.
 *
 * Страница живёт только в режиме разработки, в сборку не попадает.
 */

// Шесть подписей, а не пять: первая колонка на доске называется «КОНТРОЛ».
// Её отсутствие числовые слои не ловили — размеры сходились, а заголовка
// не было. Поймала проверка надписей.
const COLUMNS = ["КОНТРОЛ", "ПОКОЙ", "НАВЕДЕНИЕ", "ФОКУС", "НАЖАТИЕ", "ВЫКЛЮЧЕН"]
const STATE_KEYS = ["rest", "hover", "focus", "press", "disabled"]

function Row({
  id,
  name,
  spec,
  cells,
}: {
  id: string
  name: string
  spec: string
  cells: ReactNode[]
}) {
  return (
    <div className="flex w-full items-center gap-6 border-t border-line-2 py-4">
      <div className="flex w-45 flex-col gap-1">
        <Typography variant="controlLabel" tone="default">
          {name}
        </Typography>
        <Typography variant="metaText" tone="dense">
          {spec}
        </Typography>
      </div>
      {cells.map((children, index) => (
        <div
          key={STATE_KEYS[index]}
          data-check={`${id}|${STATE_KEYS[index]}`}
          className="flex h-16 w-45 items-center"
        >
          {children}
        </div>
      ))}
    </div>
  )
}

function Example({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex w-[282px] flex-col gap-2.5">
      <Typography variant="controlLabel" tone="default">
        {name}
      </Typography>
      {children}
    </div>
  )
}

export function KitchenSinkPage() {
  return (
    <div className="flex min-h-svh w-full flex-col gap-12 bg-bg px-30 py-16">
      <header className="flex w-full flex-col gap-4">
        <Typography variant="cardPrice" tone="default" as="h1">
          Состояния контролов
        </Typography>
        <div className="max-w-[792px]">
          <Typography variant="uiText" tone="secondary" as="p">
            Покой, наведение, фокус, нажатие и выключен — для каждого контрола.
            Шестое состояние, ошибка, вынесено отдельно: оно держится и приносит
            текст.
          </Typography>
        </div>
      </header>

      <section className="flex w-full flex-col">
        <div className="flex w-full items-center gap-6 pb-3">
          {COLUMNS.map((column) => (
            <div key={column} className="w-45">
              <Typography variant="columnHeader" tone="dense">
                {column}
              </Typography>
            </div>
          ))}
        </div>

        <Row
          id="primary-48"
          name="Primary 48"
          spec="48 · r-pill · 16 · заливка fg"
          cells={[
            <Button variant="primary" size="lg">
              Раскрыть
            </Button>,
            <Button variant="primary" size="lg" demo="hover">
              Раскрыть
            </Button>,
            <Button variant="primary" size="lg" demo="focus">
              Раскрыть
            </Button>,
            <Button variant="primary" size="lg" demo="press">
              Раскрыть
            </Button>,
            <Button variant="primary" size="lg" disabled>
              Раскрыть
            </Button>,
          ]}
        />

        <Row
          id="secondary-32"
          name="Вторичная 32"
          spec="32 · r-8 · 14 · заливка warm"
          cells={[
            <Button variant="secondary" size="sm">
              В подборку
            </Button>,
            <Button variant="secondary" size="sm" demo="hover">
              В подборку
            </Button>,
            <Button variant="secondary" size="sm" demo="focus">
              В подборку
            </Button>,
            <Button variant="secondary" size="sm" demo="press">
              В подборку
            </Button>,
            <Button variant="secondary" size="sm" disabled>
              В подборку
            </Button>,
          ]}
        />

        <Row
          id="input-40"
          name="Инпут 40"
          spec="40 · r-10 · 14 · граница border-control"
          cells={[
            <div className="w-41">
              <TextField defaultValue="Ленская ул." />
            </div>,
            <div className="w-41">
              <TextField defaultValue="Ленская ул." demo="hover" />
            </div>,
            <div className="w-41">
              <TextField defaultValue="Ленская ул." demo="focus" />
            </div>,
            <div className="w-41">
              <TextField defaultValue="Ленская ул." demo="press" />
            </div>,
            <div className="w-41">
              <TextField defaultValue="недоступно" disabled />
            </div>,
          ]}
        />

        <Row
          id="chip-28"
          name="Чип фильтра 28"
          spec="28 · r-pill · 13 · выбран заливкой fg"
          cells={[
            <FilterChip label="Невский" />,
            <FilterChip label="Невский" demo="hover" />,
            <FilterChip label="Невский" demo="focus" />,
            <FilterChip label="Невский" selected />,
            <FilterChip label="Невский" disabled />,
          ]}
        />

        <Row
          id="checkbox-24"
          name="Чекбокс 24"
          spec="24 · r-6 · пол по WCAG 2.5.8"
          cells={[
            <Checkbox checked={false} onCheckedChange={() => undefined} />,
            <Checkbox checked={false} onCheckedChange={() => undefined} demo="hover" />,
            <Checkbox checked={false} onCheckedChange={() => undefined} demo="focus" />,
            <Checkbox checked onCheckedChange={() => undefined} />,
            <Checkbox checked={false} onCheckedChange={() => undefined} disabled />,
          ]}
        />
      </section>

      <section className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2.5">
          <Typography variant="panelTitle" tone="default">
            Строка выдачи
          </Typography>
          <div className="max-w-[894px]">
            <Typography variant="uiText" tone="secondary" as="p">
              Двухстрочная, а не табличная: на 1440 в плоской таблице адресу
              остаётся 184 пикселя — двадцать три знака кириллицы. Числа и адреса
              взяты из DEMO-DATA.md и нигде не выдуманы.
            </Typography>
          </div>
        </div>

        <div className="flex w-full items-start gap-6">
          <div data-check="filter-panel|rest" className="h-[560px]">
            <FilterPanel
              activeCount={7}
              districts={[
                [{ id: "krasnogvardeisky", label: "Красногвардейский", selected: true }],
                [
                  { id: "nevsky", label: "Невский", selected: true },
                  { id: "kalininsky", label: "Калининский", selected: true },
                ],
                [{ id: "add", label: "+ район" }],
              ]}
              price={["6 000 000", "до 15 млн"]}
              area={["от 40", "до 80"]}
              floor={[
                [
                  { id: "not-first", label: "не первый", selected: true },
                  { id: "not-last", label: "не последний" },
                ],
              ]}
              metro={[
                [{ id: "ligovsky", label: "Лиговский проспект", selected: true }],
                [
                  { id: "obvodny", label: "Обводный канал", muted: true },
                  { id: "add-station", label: "+ станция", muted: true },
                ],
                [
                  { id: "walk-10", label: "до 10 мин", selected: true },
                  { id: "walk-20", label: "до 20 мин" },
                ],
              ]}
              nearAddress="Лиговский пр., 44 · 1 км"
              more={[
                [
                  { id: "freshness", label: "Свежесть" },
                  { id: "price-behaviour", label: "Поведение цены" },
                ],
                [
                  { id: "rooms", label: "Комнат" },
                  { id: "type", label: "Тип объекта" },
                ],
              ]}
            />
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {/* Две шапки, потому что их в файле две: просторная несёт только
                заголовок и высоту 40, плотная — арифметику отсева и высоту 36. */}
            <div data-check="results-header|spacious">
              <ResultsHeader listings={892} duplicates={431} intermediaries={214} />
            </div>
            <div data-check="results-header|rest">
            <ResultsHeader listings={892} duplicates={431} intermediaries={214} dense />
          </div>
          <div data-check="result-tabs|rest">
            <ResultTabs
              tabs={[
                { id: "all", label: "Все" },
                { id: "new", label: "Новые, 24 ч" },
                { id: "not-called", label: "Не прозвонены" },
                { id: "taken", label: "Взяли коллеги" },
                { id: "mine", label: "Мои в работе" },
                { id: "cheaper", label: "Снизили цену" },
              ]}
              activeId="all"
              sortLabel="по свежести"
              dense={false}
            />
            </div>
          </div>
        </div>

        <div className="w-[908px]">
          <div data-check="listing-row|rest">
            <ListingRow
              address="Ленская ул., 6"
              price="8,8 млн ₽"
              deviation={-10}
              freshness="19 дней в выдаче"
              meta="Ладожская 5 мин · 2-комн · 57 м² · Авито"
              strength="medium"
              publications={2}
              platforms={2}
              phones={1}
              action={{ kind: "disclose", price: 199 }}
            />
          </div>
          <div data-check="listing-row|selected">
            <ListingRow
              address="Новочеркасский пр., 47"
              price="9,9 млн ₽"
              deviation={18}
              freshness="3 часа назад"
              meta="Новочеркасская 6 мин · 2-комн · 61 м² · Циан"
              strength="medium"
              publications={2}
              platforms={2}
              phones={1}
              selected
              action={{ kind: "disclose", price: 199 }}
            />
          </div>
          <div data-check="listing-row|taken">
            <ListingRow
              address="Гражданский пр., 114"
              price="12,8 млн ₽"
              deviation={-12}
              freshness="1 час назад"
              meta="Академическая 8 мин · 3-комн · 71 м² · Домклик"
              strength="medium"
              publications={2}
              platforms={2}
              phones={1}
              takenBy="АТ"
              status="in-progress"
              action={{ kind: "open" }}
            />
          </div>
          <div data-check="listing-row|blocked">
            <ListingRow
              address="Стахановцев ул., 14"
              price="12,4 млн ₽"
              deviation={0}
              freshness="12.07"
              meta="Новочеркасская 8 мин · 3-комн · 74 м² · Авито"
              strength="strong"
              publications={1}
              platforms={1}
              phones={1}
              status="refused"
              action={{ kind: "blocked", label: "Просил не звонить" }}
            />
          </div>
        </div>
      </section>

      <section className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2.5">
          <Typography variant="panelTitle" tone="default">
            Пустые состояния выдачи
          </Typography>
          <div className="max-w-[894px]">
            <Typography variant="uiText" tone="secondary" as="p">
              Их четыре, и они не делят один шаблон. Разные причины требуют разных
              действий, поэтому «ничего не найдено, попробуйте иначе» здесь
              не бывает: состояние обязано сказать, что именно сделать.
            </Typography>
          </div>
        </div>

        <div className="flex w-full gap-6">
          <div data-check="empty-first|rest" className="h-[440px] w-[560px]">
            <ListingsEmptyState
              headerTitle="Начните с района"
              headerNote="у вас пока нет ни одного сохранённого поиска"
              title="Начните с района"
              text="Четыре готовых пресета собраны по тому, что чаще всего ищут агенты в Петербурге."
              actions={[
                { id: "preset-1", label: "Петроградский, 2-к, до 15 млн", primary: true },
                { id: "preset-2", label: "Вся вторичка, добавлено сегодня" },
              ]}
              footnote="Комнаты и доли, Центральный · Расселение · Снизили цену за 3 дня"
            />
          </div>

          <div data-check="empty-narrow|rest" className="h-[440px] w-[560px]">
            <ListingsEmptyState
              headerTitle="Ничего не найдено"
              headerNote="Приморский · до 8 млн · от 60 м² · не первый этаж"
              title="Ничего не найдено"
              text="Слишком узко сошлись три условия. Снимите «до 8 млн», и вернётся 84 объекта."
              chips={[
                { id: "price", label: "до 8 млн", culprit: true },
                { id: "area", label: "от 60 м²" },
                { id: "district", label: "Приморский" },
              ]}
              actions={[
                { id: "drop", label: "Снять «до 8 млн»", primary: true },
                { id: "subscribe", label: "Подписаться на этот поиск" },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2.5">
          <Typography variant="panelTitle" tone="default">
            Кадра нет — это норма
          </Typography>
          <div className="max-w-[894px]">
            <Typography variant="uiText" tone="secondary" as="p">
              Фотографии продукт не хранит: вектор считается транзитом и удаляется,
              кадр живёт ссылкой на площадку и исчезает вместе с объявлением.
              Поэтому отсутствие кадра — обычное состояние слота, а не сбой загрузки.
              Заглушка не извиняется: она показывает то, что известно про дом
              без фотографии.
            </Typography>
          </div>
        </div>

        <div className="flex w-full items-end gap-6">
          <div data-check="photo-small|rest" className="h-13 w-20">
            <PhotoPlaceholder size="small" reason="no-photos" />
          </div>
          <div data-check="photo-medium|rest" className="h-[90px] w-[135px]">
            <PhotoPlaceholder size="medium" reason="fetch-failed" />
          </div>
          <div data-check="photo-large|rest" className="h-[376px] w-[564px]">
            <PhotoPlaceholder
              size="large"
              reason="listing-removed"
              facts="Панельный 1969 года, серия 1-ЛГ-602, 9 этажей — по ГИС ЖКХ"
            />
          </div>
        </div>
      </section>

      <section className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2.5">
          <Typography variant="panelTitle" tone="default">
            Шестое состояние: ошибка
          </Typography>
          <div className="max-w-[894px]">
            <Typography variant="uiText" tone="secondary" as="p">
              Ошибка стоит особняком и потому вынесена из таблицы. Наведение, фокус
              и нажатие живут доли секунды и ничего не добавляют к контролу. Ошибка
              держится, пока её не исправят, и приносит с собой текст — значит место
              под него закладывается заранее, иначе форма прыгает.
            </Typography>
          </div>
        </div>

        <div className="flex w-full items-start gap-6">
          <Example name="Поле в ошибке">
            <TextField
              label="Код из письма"
              defaultValue="4 8 1 6"
              error="Неверный код. Осталось четыре попытки."
            />
          </Example>

          <Example name="Чекбокс в ошибке">
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full items-start gap-2.5">
                <Checkbox checked={false} onCheckedChange={() => undefined} invalid />
                {/* Подпись согласия в макете занимает две строки (248 × 40),
                    поэтому она набрана переносимой ступенью 13/500, а не
                    подписью чипа: у чипа перенос запрещён по определению. */}
                <Typography variant="denseText" tone="default">
                  Принимаю оферту и правила работы с контактами
                </Typography>
              </div>
              <Typography variant="fieldError" tone="destructive">
                Без согласия аккаунт не создаётся.
              </Typography>
            </div>
          </Example>

          <Example name="Ошибка всей формы">
            <div className="flex w-full flex-col gap-1.5 rounded-lg bg-err-tint px-4 py-3.5">
              {/* Плашка ошибки — бегущий текст: заголовок 14/600, объяснение
                  13/500 в три строки (250 × 60). Обе ступени обязаны
                  переноситься, поэтому взяты не подписи контролов. */}
              <Typography variant="strongText" tone="destructive">
                Не удалось создать агентство
              </Typography>
              <Typography variant="denseText" tone="destructive">
                ИНН 7801234567 не нашёлся в ЕГРЮЛ. Проверьте цифры или напишите на
                hello@serch.ru.
              </Typography>
            </div>
          </Example>

          <Example name="Кнопка ждёт">
            <div className="flex w-full flex-col gap-2.5">
              <Button variant="primary" size="lg" pending>
                Проверяем ИНН…
              </Button>
              <Typography variant="fieldError" tone="dense">
                Пока запрос идёт, кнопка выключена и говорит, чего ждёт. Спиннера без
                слов не бывает.
              </Typography>
            </div>
          </Example>
        </div>
      </section>

      <div className="max-w-[792px]">
        <Typography variant="denseText" tone="secondary" as="p">
          Кольцо фокуса рисуется снаружи контрола и не смещает соседей. Ошибка
          рисуется границей внутрь: она заменяет обычную границу, а не добавляется
          к ней, иначе поле подпрыгивает на два пикселя в момент ошибки.
        </Typography>
      </div>
    </div>
  )
}
