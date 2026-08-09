import { useEffect, useId, useRef, useState } from "react"
import type { ComponentPropsWithoutRef, PointerEvent, ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Общие части листов телефона: сам лист поверх экрана, строка выбора и поле.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Лист снизу нарисован в файле компонентом `SItir`, и в коде он уже был —
 * `MobileSheet` из `@/features/cabinet`. Но `MobileSheet` это ЦЕЛЫЙ ЭКРАН
 * со своим адресом: он занимает `h-svh` и закрывается возвратом в историю
 * браузера. Восемь листов, собранных здесь, открываются ПОВЕРХ экрана,
 * у которого они не адрес, а состояние: строка настроек, кнопка на карточке
 * сотрудника, отказ платежа. Возвращать историю им некуда.
 *
 * Второй такой лист в продукте уже жил — `LimitSheet` на карточке сотрудника,
 * — и был точной копией первого. Третьей копии не будет: форма листа живёт
 * здесь одним компонентом, а восемь листов отличаются только содержимым.
 *
 * **Что нужно сделать дальше (не в этом файле).** `MobileSheet` и этот лист
 * обязаны стать одним компонентом в `features/cabinet/MobileParts.tsx`
 * с необязательным `onClose`: пока их два, правка формы листа стоит двух
 * правок. Файл общий, и правится он не отсюда.
 */

/**
 * Лист снизу поверх экрана (`SItir`).
 *
 * Замер: затемнение `#1e1e1e59`, лист с радиусом 24 **только сверху**, поля
 * [12, 20, 32, 20], зазор 20, хват 36 × 5 цветом `line-2`. Действия во всю
 * ширину, главное сверху, между ними 8.
 *
 * Нижнее поле 32 против верхнего 12: под листом системная полоса жеста,
 * и кнопка, прижатая к краю, ловилась бы вместе с ней.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО ЗДЕСЬ СДЕЛАНО ИНАЧЕ, ЧЕМ В ДВУХ ПРЕДЫДУЩИХ ЛИСТАХ, И ПОЧЕМУ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Тянется хват, а не весь лист.** У `MobileSheet` и у `LimitSheet` жест
 * висит на всём листе, а вместе с ним `touch-none` — прокрутка внутри листа
 * запрещена. Двум листам из восьми это смертельно: «Реквизиты агентства»
 * 699 в высоту, «Передать роль» 679, и на телефоне с экраном 667 нижняя
 * кнопка оказалась бы недостижимой. Лист, который нельзя прокрутить, хуже
 * листа, который тянется только за хват. Область захвата растянута
 * абсолютом на 30 px и раскладку не двигает: хват в файле 5 px, пальцем
 * в него не попасть.
 *
 * **Escape закрывает.** Лист смотрят и с компьютера — на стенде и в узком
 * окне, — а он модальный: не ответить на Escape значит запереть человека
 * в окне, у которого нет крестика.
 */
function MobileOverlaySheet({
  label,
  title,
  text,
  rhythm = "tight",
  position = "fixed",
  actions,
  onClose,
  children,
}: {
  /** Чем лист называется для чтения с экрана. Обычно совпадает с заголовком. */
  label: string
  title: string
  /** Объяснение под заголовком. Одна-две строки, 14/500 приглушённым. */
  text: string
  /**
   * Зазор внутри текстового блока: 8 у короткого листа, 14 у длинного.
   *
   * Так в файле, и это не произвол. У листа из заголовка и объяснения это
   * один абзац, и 8 держат его абзацем. Как только между ними встают поля
   * или список выбора, блок перестаёт быть абзацем и расстояние растёт
   * до 14 — тем же зазором, что у окна на компьютере.
   */
  rhythm?: "tight" | "medium"
  /**
   * Где лист лежит: `fixed` — поверх окна (экраны `MobileScreen`),
   * `absolute` — внутри кадра 390 × 844 (экраны на стенде `PhoneFrame`).
   * В `h-svh` лист стенда уехал бы за нижний край рамки.
   */
  position?: "fixed" | "absolute"
  /** Кнопки во всю ширину. Главная сверху, отмена под ней. */
  actions: ReactNode
  onClose: () => void
  /** Что стоит между объяснением и действиями: поля, список, сноска. */
  children?: ReactNode
}) {
  /**
   * Лист идёт за пальцем.
   *
   * Хват 36 × 5 обещает, что лист тянется. Обещание без движения — ложь
   * интерфейса: человек тянет, ничего не происходит, и он решает, что экран
   * сломан. Смещение хранится состоянием и переписывается на каждое движение,
   * а не задаётся анимацией фиксированной длины: лист, который потянули
   * обратно, обязан пойти за пальцем, а не доигрывать.
   *
   * Порог 96 — примерно четверть типичной высоты листа. Ниже него лист
   * возвращается на место за 200 мс, выше — закрывается. Тянуть можно только
   * вниз: `Math.max(0, …)` отсекает попытку утащить лист вверх, растянутого
   * на пол-экрана листа в файле не нарисовано.
   */
  const [drag, setDrag] = useState<number | null>(null)
  const [arrived, setArrived] = useState(false)
  const startRef = useRef(0)

  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    startRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag(0)
  }

  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (drag === null) return
    setDrag(Math.max(0, event.clientY - startRef.current))
  }

  const onPointerUp = () => {
    if (drag === null) return
    if (drag > 96) onClose()
    setDrag(null)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      data-slot="mobile-sheet-scrim"
      // Затемнение только проявляется, без сдвига: приезжать здесь положено
      // листу, а фону — гаснуть. `.motion-in` поднимает узел на 8 px и слой
      // во всю высоту экрана 120 мс держал бы у края незатемнённую полоску.
      className={cn(
        "scrim-in flex flex-col justify-end bg-[#1e1e1e59]",
        position === "fixed" ? "fixed inset-0 z-50" : "absolute inset-0 z-10",
      )}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-slot="mobile-sheet"
        // Приезд снимается сразу по окончании: анимация с `fill-mode: both`
        // держит `transform` навсегда и по правилам каскада бьёт даже
        // встроенный стиль — то есть лист перестал бы слушаться пальца.
        onAnimationEnd={(event) => {
          if (event.currentTarget === event.target) setArrived(true)
        }}
        // Пока палец на экране — ни перехода: лист стоит ровно там, где палец.
        // Отпустили — возвращается за 200 мс.
        style={
          drag === null ? undefined : { transform: `translateY(${drag}px)`, transition: "none" }
        }
        className={cn(
          "flex max-h-full w-full flex-col gap-5 overflow-y-auto overscroll-contain",
          "rounded-t-3xl bg-surface px-5 pt-3 pb-8",
          arrived ? "transition-transform duration-200" : "sheet-in",
        )}
      >
        <div className="relative flex w-full shrink-0 justify-center">
          <span aria-hidden className="h-[5px] w-9 rounded-full bg-line-2" />
          {/* Невидимая область захвата: сам хват 5 px, пальцем в него
              не попасть. Абсолют, поэтому раскладку не двигает. */}
          <span
            aria-hidden
            data-slot="mobile-sheet-grip"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="absolute inset-x-0 -inset-y-2.5 cursor-grab touch-none"
          />
        </div>

        <div
          className={cn(
            "flex w-full shrink-0 flex-col",
            rhythm === "tight" ? "gap-2" : "gap-3.5",
          )}
        >
          <Typography variant="panelTitle" tone="default" as="h2">
            <>{title}</>
          </Typography>
          <Typography variant="uiText" tone="secondary">
            <>{text}</>
          </Typography>
          <>{children}</>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2">
          <>{actions}</>
        </div>
      </div>
    </div>
  )
}

/**
 * Строка выбора в листе: 60 / r-10 с кружком 20 слева.
 *
 * Замер снят с `mCblr` (дневной лимит) и `iWj2M` (передача роли) — строка
 * в них одна и та же: выбранная тёплая с границей `border-control`,
 * остальные белые с `line-2`, кружок выбранной залит графитом.
 *
 * Строка 60, а не 56 как на компьютере: сюда попадают пальцем. Граница
 * собрана внутренней тенью, а не рамкой: рамка добавила бы 61-й пиксель,
 * а `outline` в этом проекте занят кольцом фокуса.
 */
function SheetChoiceRow({
  label,
  note,
  selected,
  onSelect,
}: {
  label: string
  note: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="sheet-choice"
      // Отклик на нажатие, а не на отпускание: между ними на телефоне больше
      // сотни миллисекунд, и палец успевает решить, что строка не сработала.
      // Щелчок остаётся ради клавиатуры — браузер шлёт его с `detail === 0`,
      // и только такой обрабатывается вторым, иначе мышь считалась бы дважды.
      onPointerDown={onSelect}
      onClick={(event) => {
        if (event.detail === 0) onSelect()
      }}
      className={cn(
        "row-tap flex h-15 w-full cursor-pointer items-center gap-3 rounded-lg px-4 text-left",
        "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        selected
          ? "bg-warm shadow-[inset_0_0_0_1px_var(--border-control)]"
          : "bg-surface shadow-[inset_0_0_0_1px_var(--line-2)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-5 shrink-0 rounded-full border",
          selected ? "border-fg bg-fg" : "border-line-3 bg-surface",
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Typography variant={selected ? "controlLabel" : "uiText"} tone="default">
          <>{label}</>
        </Typography>
        <Typography variant="denseText" tone="dense">
          <>{note}</>
        </Typography>
      </span>
    </button>
  )
}

/**
 * Поле формы на телефоне: метка, поле 48 радиусом 12, подсказка под ним.
 *
 * Общий `TextField` не подошёл: он собран под десктоп — 40, радиус 10,
 * поля 12, значение кеглем 14. На телефоне поле выше, потому что в него
 * попадают пальцем, и значение крупнее, потому что мельче 16 браузер
 * телефона приближает экран сам при постановке курсора.
 *
 * **Названное расхождение с кадром `TIJHR`.** В листе реквизитов поле
 * нарисовано подчёркиванием — волосяная линия снизу, без рамки и радиуса.
 * Взята коробка: она уже собрана по кадру `NMEod` (приглашение агента)
 * и является формой поля на телефоне. Две разные формы поля на одной
 * платформе — расхождение, которое видно человеку; расхождение с одним
 * кадром видно только рядом с макетом. Кадр здесь спорит сам с собой,
 * и выигрывает то, что уже собрано.
 */
function MobileField({
  label,
  hint,
  ...props
}: Omit<ComponentPropsWithoutRef<"input">, "className" | "style" | "id"> & {
  label: string
  /** Строка под полем: что сюда вписать и что с этим будет. */
  hint?: string
}) {
  const fieldId = useId()

  return (
    <div data-slot="mobile-field" className="flex w-full shrink-0 flex-col gap-2">
      <Typography as="label" variant="columnHeader" tone="dense" htmlFor={fieldId}>
        <>{label}</>
      </Typography>
      {/*
        Значение набрано 16/600 вместо 16/500 из файла: в лестнице кабинета
        ступени 16 весом 500 нет, а трогать общий модуль типографики ради
        одного поля — цена выше пользы. Расхождение видно только рядом
        с макетом.
      */}
      <Typography asChild variant="rowPrice">
        <input
          id={fieldId}
          data-slot="mobile-field-input"
          className={cn(
            "h-ctl-lg w-full rounded-xl bg-surface px-3.5 text-fg",
            "border border-border-control transition-colors",
            "placeholder:text-text-dense",
            "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-fg focus-visible:border-transparent",
          )}
          {...props}
        />
      </Typography>
      {hint === undefined ? null : (
        <Typography variant="metaText" tone="dense">
          <>{hint}</>
        </Typography>
      )}
    </div>
  )
}

export { MobileField, MobileOverlaySheet, SheetChoiceRow }
