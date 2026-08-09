import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { groupDigits, plural } from "./plural"

/**
 * КАБИНЕТ · Панель массовых действий.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ПОЛОСА СНИЗУ, А НЕ ОКНО ПО ЦЕНТРУ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Кадр `aT2KC` описывает себя словами «появляется снизу поверх выдачи, список
 * сдвигается вверх на её высоту, Esc снимает выбор» — а нарисован был диалогом
 * по центру. Расхождение формы с собственной подписью решено в пользу подписи:
 * дизайн перерисовал панель полосой (кадр `SUsxy`, 08.08.2026), и собрана она
 * здесь именно такой.
 *
 * Разница не косметическая. Окно по центру закрывает то, что человек выбрал,
 * и заставляет держать выбор в голове; полоса снизу оставляет список видимым —
 * и он ужимается ровно на её высоту, а не уезжает под неё.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАМЕРЫ (`SUsxy` → `I3jY3`)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Панель: ширина по контейнеру, высота 98, заливка `surface`, граница только
 * сверху 1 px `line-2`, вертикально, зазор 10, поля [16, 0].
 * Строка счёта: зазор 12, «Выбрано 12 объектов» 16/600 графитом, распорка,
 * «Снять выбор · Esc» 13/500 приглушённым.
 * Цена: 13/500 `text-2` во всю ширину.
 * Действия: четыре вторичные кнопки 32 и главная 40 справа.
 *
 * Список при этом ужимается с 856 до 748: 98 панели плюс 10 зазора.
 */
function SelectionBar({
  count,
  payable,
  price,
  onClear,
  onDisclose,
  onCollection,
  onExport,
  onStatus,
  onAssign,
}: {
  /** Сколько объектов отмечено. */
  count: number
  /** За сколько из них придётся заплатить: остальные агентство уже раскрывало. */
  payable: number
  /** Сколько спишется всего, в рублях. */
  price: number
  onClear: () => void
  onDisclose: () => void
  onCollection: () => void
  onExport: () => void
  /** Открыть окно смены статуса у выбранных. */
  onStatus: () => void
  /** Открыть окно назначения выбранных агенту. */
  onAssign: () => void
}) {
  const alreadyPaid = count - payable

  return (
    <div
      data-slot="selection-bar"
      /*
        Панель 137, в кадре 128 — и это не промах, а разница мерок.

        Ритм совпадает точно: поля 16, зазоры 10, три ряда. Расходятся
        высоты текстовых строк. Pencil меряет текст глифовым боксом — 19
        у шестнадцатого кегля и 16 у тринадцатого; продукт ставит их по
        закрытой лестнице интерлиньяжа — 24 и 20. Девять пикселей набегают
        отсюда.

        Подгонять нечем: сжать строку до 19 значит вынуть шестнадцатый
        кегль из лестницы, по которой набран весь кабинет. Список забирает
        эти девять сам — он тянется, а не стоит числом.
      */
      className="flex w-full shrink-0 flex-col gap-2.5 border-t border-line-2 bg-surface py-4"
    >
      <div className="flex w-full items-center gap-3">
        <Typography variant="rowPrice" tone="default">
          {`Выбрано ${count} ${plural(count, "объект", "объекта", "объектов")}`}
        </Typography>
        <div className="h-px flex-1" />
        {/* Подпись называет и клавишу: снять выбор мышью и с клавиатуры —
            одно и то же действие, и человек не должен угадывать, есть ли оно. */}
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <Typography variant="denseText" tone="dense">
            Снять выбор · Esc
          </Typography>
        </button>
      </div>

      {/*
        Цена названа ДО нажатия и вместе с причиной, по которой она меньше
        ожидаемой. «Раскрытие спишет 1 791 ₽ за девять контактов: три объекта
        коллеги уже раскрывали, за них деньги не спишутся» — это единственное
        место продукта, где одним нажатием уходит больше тысячи рублей, и
        человек обязан прочитать сумму раньше, чем она спишется.
      */}
      <Typography variant="denseText" tone="secondary">
        {payable === 0
          ? `Все ${count} ${plural(count, "контакт", "контакта", "контактов")} агентство уже раскрывало — списания не будет.`
          : alreadyPaid === 0
            ? `Раскрытие спишет ${groupDigits(price)} ₽ за ${payable} ${plural(payable, "контакт", "контакта", "контактов")}.`
            : `Раскрытие спишет ${groupDigits(price)} ₽ за ${payable} ${plural(payable, "контакт", "контакта", "контактов")}: ${alreadyPaid} ${plural(alreadyPaid, "объект", "объекта", "объектов")} коллеги уже раскрывали, за них деньги не спишутся.`}
      </Typography>

      <div className="flex w-full items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onCollection}>
          В подборку
        </Button>
        {/*
          Окна массовой смены статуса и назначения агенту в файле НЕ
          нарисованы — кадры `a9lIk` и `jUJgJ` числятся несобранными. Действие
          названо и ничего не рисует: выдумать сюда своё окно значило бы
          завести второй способ менять статус, расходящийся с панелью прозвона.
        */}
        <Button variant="secondary" size="sm" onClick={onStatus}>
          Сменить статус
        </Button>
        <Button variant="secondary" size="sm" onClick={onAssign}>
          Назначить агенту
        </Button>
        <Button variant="secondary" size="sm" onClick={onExport}>
          Экспорт
        </Button>
        <div className="h-px flex-1" />
        <Button variant="money" size="md" disabled={payable === 0} onClick={onDisclose}>
          {`Раскрыть ${payable} ${plural(payable, "контакт", "контакта", "контактов")} · ${groupDigits(price)} ₽`}
        </Button>
      </div>
    </div>
  )
}

export { SelectionBar }
