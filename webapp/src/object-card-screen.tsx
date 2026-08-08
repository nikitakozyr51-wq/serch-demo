import { useNavigate, useSearch } from "@tanstack/react-router"
import { Users } from "lucide-react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { ALL_ROWS } from "@/data/search-rows"
import { useSessionActions } from "@/features/auth"
import { Reveal } from "@/platform/motion"
import {
  AgeAndPriceBlock,
  ByPhotoBlock,
  CardColumns,
  CardHeading,
  CardMedia,
  CardOwnerSignals,
  CardShell,
  CardSourceRow,
  HouseBlock,
  WhyPriceBlock,
} from "./object-card-parts"

/**
 * КАБИНЕТ · Карточка объекта — до раскрытия.
 *
 * Снято с `Fo8gk`: экран 1440 × 1024, панель 48, тело с полями 24 и зазором 32,
 * верх из медиа 564 и колонки решения 564 через 24, ниже три колонки по 368.
 * Объект — **Ленская ул., 6**, 8,8 млн ₽, −10 % к рынку, 19 дней в выдаче.
 *
 * **Экран отвечает на один вопрос: звонить или нет.** Поэтому он устроен как
 * доказательство, а не как паспорт объекта: сперва цена и отклонение, потом
 * признаки собственника, потом — кто из агентства уже касался объекта,
 * и только после этого кнопка со списанием.
 *
 * Блок «кто уже касался» стоит **перед** кнопкой не случайно. Это то, ради чего
 * агентство и платит: он снимает второй звонок собственнику и второе списание
 * за тот же контакт. Поставь его после кнопки — и он не сработает ни разу.
 */

/**
 * Адрес объекта одной строкой.
 *
 * Он же ключ раскрытия в сеансе: по нему видно, за какой контакт агентство
 * уже платило, и второй раз деньги за него не спишутся — ни с этого экрана,
 * ни из выдачи, ни у коллеги.
 */
/**
 * Объект по умолчанию — тот, что нарисован в макете.
 *
 * Нужен стенду сверки: он открывает карточку без параметра, и там обязан
 * стоять ровно замеренный объект. В продукте адрес всегда приходит из выдачи.
 */
const FALLBACK = "Ленская ул., 6"

const ANALOGUES = [
  { id: "nastavnikov", cells: ["Наставников пр., 34", "10,1 млн ₽", "180 тыс ₽/м²"], strongAt: 1 },
  { id: "peredovikov", cells: ["Передовиков ул., 21", "9,8 млн ₽", "166 тыс ₽/м²"], strongAt: 1 },
  { id: "lenskaya-10", cells: ["Ленская ул., 10", "8,6 млн ₽", "148 тыс ₽/м²"], strongAt: 1 },
]

const PRICE_HISTORY = [
  { id: "20-07", cells: ["20.07", "8,8 млн ₽", "без изменений"], strongAt: 1 },
  { id: "12-07", cells: ["12.07", "8,8 млн ₽", "без изменений"], strongAt: 1 },
  { id: "05-07", cells: ["05.07", "8,8 млн ₽", "первое наблюдение"], strongAt: 1 },
]

/**
 * Цена за метр из строки выдачи.
 *
 * Считается, а не хранится: два числа про одно и то же — цена и цена за метр —
 * разъезжаются на первом же изменении цены, и разъезжаются молча.
 */
function perMeterOf(row: { priceValue: number; area: number }): string {
  const value = Math.round(row.priceValue / row.area / 1000)
  return `${value} тыс ₽/м²`
}

export function ObjectCardScreenPage() {
  const navigate = useNavigate()
  const actions = useSessionActions()

  /**
   * Какой объект открыт.
   *
   * Адрес приезжает параметром из выдачи. Раньше он стоял здесь константой,
   * и все 260 строк вели в одну и ту же квартиру — владелец назвал это прямо:
   * «не могу выйти на карточку товара».
   *
   * Цена, метро, площадь и отклонение берутся из той же строки выдачи, что
   * человек видел секунду назад. Иначе карточка показывала бы другие числа
   * про тот же объект, и это заметно сразу.
   */
  const { at } = useSearch({ from: "/object", shouldThrow: false }) ?? { at: undefined }
  const address = at ?? FALLBACK
  const row = ALL_ROWS.find((item) => item.address === address)

  /**
   * Раскрытие контакта: 199 ₽ уходят со счёта агентства, и человек попадает
   * на карточку с номером — четвёртый шаг пути агента.
   *
   * **Это кнопка, а не ссылка, и намеренно.** Ссылку браузер открывает средней
   * кнопкой мыши и подгружает заранее; деньги имеет право списывать только
   * осознанное нажатие. Списание видно счётчиком в шапке — так записано
   * в спеке движения: деньги оставляют постоянный след, а не тост на четыре
   * секунды.
   *
   * Если на счету не хватает, ведём на пополнение: экран пополнения нарисован,
   * а окна отказа в файле нет, и выдумывать его я не стал.
   */
  const discloseContact = () => {
    const result = actions.disclose(address)
    void navigate(
      result === "no-money"
        ? { to: "/balance/top-up" }
        : { to: "/object/disclosed", search: { at: address } },
    )
  }

  return (
    <CardShell position="9 из 247" address={address}>
      <div className="flex w-full gap-6">
        {/* Плашка «ещё N фото» не передаётся: снимков у объекта нет,
            и обещать их нечем. Вернётся вместе с настоящими фотографиями. */}
        <CardMedia address={address} />

        <div className="flex min-w-0 flex-1 flex-col">
          <CardHeading
            data={{
              price: row?.price ?? "8,8 млн ₽",
              deviation: row?.deviation ?? -10,
              perMeter: row ? perMeterOf(row) : "154 тыс ₽/м²",
              status: "new",
              address: row ? `${row.address}${row.meta}` : `${address} · 2-комн · 57 м² · 8/9 эт`,
              metro: row
                ? `${row.metro} · ${row.districtName} район`
                : "Ладожская · 5 мин пешком · Красногвардейский район",
            }}
          />

          <div className="h-6" />
          <CardOwnerSignals
            data={{ strength: "medium", publications: 2, platforms: 2, phones: 1 }}
          />
          <div className="h-6" />

          {/* Блок «кто уже касался» и кнопка приезжают последними в правой
              колонке — в том порядке, в каком экран и читают: сперва
              доказательства, потом решение. */}
          <Reveal className="flex w-full items-center gap-2.5 rounded-lg bg-warm px-3.5 py-3">
            <Users aria-hidden className="size-4 shrink-0 text-text-2" strokeWidth={2} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Typography variant="numericDense" tone="default">
                По этому объекту из агентства ещё не звонили
              </Typography>
              <Typography variant="metaText" tone="dense">
                проверено по пяти сотрудникам, история касаний с 05.07
              </Typography>
            </div>
          </Reveal>

          <div className="h-6" />

          <Reveal className="flex w-full flex-col gap-2">
            {/* Единственная красная кнопка продукта: красный значит «сейчас
                спишутся деньги». Капсула закреплена за списанием и за главным
                действием — больше нигде её нет. */}
            <Button variant="money" size="lg" block onClick={discloseContact}>
              Раскрыть контакт · 199 ₽
            </Button>
            {/* Обещание возврата стоит под кнопкой, а не в справке: человек
                читает его в момент решения, а не когда пойдёт искать правила. */}
            <Typography variant="metaText" tone="dense">
              Спишем 199 ₽. Вернём в один клик, если это не собственник.
            </Typography>
          </Reveal>

          <div className="flex-1" />

          <CardSourceRow />
        </div>
      </div>

      <CardColumns
        columns={[
          <WhyPriceBlock
            key="why"
            title="ПОЧЕМУ −10 % К РЫНКУ"
            reason="Медиана 24 аналогов в радиусе 700 м, 2-комн, 54–62 м², за 60 дней: 9,8 млн ₽. Этот объект: 8,8 млн ₽. Пересчитано сегодня в 06:00."
            rows={ANALOGUES}
          />,
          <AgeAndPriceBlock
            key="age"
            days="19 дней в выдаче"
            median="медиана по городу 112 дней"
            rows={PRICE_HISTORY}
            honest="Наблюдаем с 05.07.2026 на Авито и Циан. Что было раньше, мы не знаем."
          />,
          <div key="house" className="flex w-full flex-col gap-6">
            <HouseBlock />
            <ByPhotoBlock text="Авито и Циан. Склеены в один объект, звонить нужно один раз." />
          </div>,
        ]}
      />
    </CardShell>
  )
}
