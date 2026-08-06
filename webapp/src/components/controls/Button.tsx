import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Кнопка «Сёрчи».
 *
 * Все значения сняты замером с доски `СИСТЕМА · Состояния контролов` (`nXleb`),
 * а не выведены из описания. Доска — спецификация для разработки, не макет.
 *
 * Собрана заново, а не поверх `ui/button`: базовый примитив shadcn несёт
 * `rounded-md` на всех размерах, `focus-visible:ring-3`, `disabled:opacity-50`,
 * `active:translate-y-px` и `shadow-xs`. Каждое из этого проект запрещает,
 * а снять снаружи можно только через `className`, запрещённый у закрытых компонентов.
 *
 * ФОРМА ОТВЕЧАЕТ НА ВОПРОС «ЧТО ЭТО», А НЕ «КАКОЙ ОНО ВЫСОТЫ»
 * (передача 05.08.2026, раздел 1). Всё, что нажимается и совершает действие,
 * — капсула. Прежняя карта из семи радиусов по высоте отменена: она отвечала
 * на вопрос о размере, а человек спрашивает о роли.
 *
 * Лестница закрыта — высота, боковое поле и кегль подписи связаны жёстко:
 *
 *   sm  32 → 28   капсула   поле 24 → 20   14 → 13   вторичная, кнопка в строке
 *   md  40 → 36   капсула   поле 28 → 28   14 → 13   кнопка формы
 *   lg  48 → 44   капсула   поле 36 → 32   16        главная
 *
 * БОКОВОЕ ПОЛЕ = 0,75 ВЫСОТЫ, посаженное на шкалу кратности четырём:
 * 28→20 · 32→24 · 36→28 · 40→28 · 44→32 · 48→36. Числа взяты из таблицы
 * передачи, а не пересчитаны формулой: на 40 формула даёт 30, а замер — 28.
 * Правило не распространяется на чип, сегмент и вкладку — там ширина служит
 * ряду, а не подписи.
 *
 * Высоту и поле переключает плотность: высоту — переменные `--h-*`, поле —
 * вариант `compact`. Кегль переключает `compact` внутри `typography.tsx`.
 * Размеров шрифта здесь нет намеренно: ESLint запрещает типографические
 * утилиты вне компонента Typography.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "cursor-pointer select-none whitespace-nowrap",
    "border border-transparent",
    "transition-colors",
    // Кольцо фокуса графитовое и рисуется снаружи контрола, поэтому не съедает
    // высоту и не сдвигает соседей. Акцент в кольце запрещён: красный в продукте
    // значит «списываются деньги», и больше ничего.
    // `outline-solid` обязателен: базовый `outline-none` выставляет стиль обводки
    // в «нет», и без явного возврата стиля толщина с цветом ничего не рисуют.
    // Без него кольца фокуса не было ни в демонстрации, ни при переходе Tab.
    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-fg",
    // `demo` показывает наведение, фокус и нажатие неподвижно — это нужно
    // полигону, чтобы повторить доску состояний. Селектор дописывается рядом
    // с настоящим псевдоклассом, поэтому значения не раздваиваются:
    // и живое состояние, и его демонстрация берут один и тот же класс.
    "data-[demo=focus]:outline-solid data-[demo=focus]:outline-2 data-[demo=focus]:outline-fg",
    // Выключенное не приглушается прозрачностью: при 0.7 текст проваливается
    // ниже порога контраста. Вместо этого меняются заливка и цвет подписи.
    "disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        /**
         * Главное действие. Графит, не красный: primary денег не списывает.
         * Фокус двойной — сначала зазор 2 px фоном, затем кольцо 2 px графитом,
         * иначе графитовое кольцо слилось бы с самой кнопкой.
         */
        primary: [
          "bg-fg text-surface",
          "hover:bg-fg-hover active:bg-fg-press",
          "data-[demo=hover]:bg-fg-hover data-[demo=press]:bg-fg-press",
          // Двойное кольцо из макета: 2 px фоном как зазор, затем 2 px графитом.
          // Зазор задан явно, а не оставлен «просвечивать» подложку: в файле он
          // залит `bg`, и на белой карточке объекта просвет дал бы другой цвет.
          // Это кольцо, а не тень: глубины оно не создаёт, запрет теней не нарушает.
          "focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_2px_var(--bg)]",
          "data-[demo=focus]:outline-offset-2 data-[demo=focus]:shadow-[0_0_0_2px_var(--bg)]",
          "disabled:bg-warm disabled:text-text-dense",
        ],
        /**
         * Вторичная. Заливка тёплая, граница есть во всех состояниях, кроме фокуса,
         * где её заменяет внешнее кольцо. Подпись на покое приглушена и темнеет
         * при наведении — это в макете, а не вольность.
         */
        secondary: [
          "bg-warm text-text-2 border-border-control",
          "hover:bg-warm-hover hover:text-fg",
          "active:bg-warm-press active:text-fg",
          "data-[demo=hover]:bg-warm-hover data-[demo=hover]:text-fg",
          "data-[demo=press]:bg-warm-press data-[demo=press]:text-fg",
          "focus-visible:outline-offset-0 focus-visible:border-transparent",
          "data-[demo=focus]:outline-offset-0 data-[demo=focus]:border-transparent",
          "disabled:bg-surface disabled:border-border-control disabled:text-text-dense",
        ],
        /**
         * Действие в строке выдачи. Снято с компонента `w2pux` C Кнопка · 32:
         * заливка `fg`, подпись `surface` 14 весом 600, радиус 8.
         *
         * DESIGN.md: «В строке выдачи кнопка тёмная (fg), красной становится
         * на наведении и в выбранной строке». Это единственное место, где
         * красный появляется от наведения, — и оно законно: нажатие здесь
         * списывает 199 ₽. В строке похожих объектов кнопка красной
         * не становится: там раскрытие идёт не главным действием экрана.
         */
        row: [
          "bg-fg text-surface",
          "hover:bg-accent-deep active:bg-accent-hover",
          "data-[demo=hover]:bg-accent-deep data-[demo=press]:bg-accent-hover",
          "focus-visible:outline-offset-2 data-[demo=focus]:outline-offset-2",
          "disabled:bg-warm disabled:text-text-dense",
        ],
        /**
         * Тихая. Тёплая заливка **без границы**, подпись графитом.
         *
         * Отличается от вторичной именно этим: у вторичной есть граница
         * и приглушённая подпись, она спорит за внимание с главным действием.
         * Тихая не спорит — она для того, что делают часто и между делом:
         * «Пополнить», «В подборку», «Скопировать», «Открыть выдачу»,
         * «Отложить», «Сохранить поиск», переключатель вида.
         *
         * Заведена, когда таких кнопок в коде набралось семь штук, написанных
         * руками по отдельности. Правка кнопок в макете стоила бы семи правок
         * вместо одной.
         */
        quiet: [
          "bg-warm text-fg",
          "hover:bg-warm-hover active:bg-warm-press",
          "data-[demo=hover]:bg-warm-hover data-[demo=press]:bg-warm-press",
          "focus-visible:outline-offset-2 data-[demo=focus]:outline-offset-2",
          "disabled:bg-surface disabled:text-text-dense",
        ],
        /** Без заливки — для действий внутри строки, где заливка дала бы третью поверхность. */
        ghost: [
          "bg-transparent text-fg",
          "hover:bg-warm active:bg-warm-press",
          "focus-visible:outline-offset-0",
          "disabled:bg-transparent disabled:text-text-dense",
        ],
        /**
         * Единственное место продукта, где кнопка красная, — «Раскрыть контакт · 199 ₽».
         * Красный здесь значит «сейчас спишутся деньги». Ни «Позвонить», ни кнопка
         * в строке похожих его не получают: их нажатие стоит ноль.
         */
        money: [
          "bg-accent-deep text-surface",
          "hover:bg-accent-hover active:bg-accent-hover",
          "focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_2px_var(--bg)]",
          "data-[demo=focus]:outline-offset-2 data-[demo=focus]:shadow-[0_0_0_2px_var(--bg)]",
          "disabled:bg-warm disabled:text-text-dense",
        ],
        /**
         * Запрос идёт. Отдельный вариант, а не надстройка над выключенным:
         * иначе пришлось бы перебивать `disabled:`-классы важностью.
         * Заливка `line-3`, подпись остаётся тёмной — кнопка не «погасла»,
         * она занята, и подпись об этом говорит.
         */
        pending: "bg-line-3 text-fg disabled:bg-line-3 disabled:text-fg",
      },
      size: {
        sm: "h-ctl-sm rounded-full px-6 compact:px-5",
        md: "h-ctl-md rounded-full px-7",
        lg: "h-ctl-lg rounded-full px-9 compact:px-8",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "sm",
    },
  }
)

type ButtonVariants = VariantProps<typeof buttonVariants>

type ButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "className" | "style" | "children"
> &
  ButtonVariants & {
    children: ReactNode
    /** Значок слева от подписи. Зазор до подписи 8 — микро-шкала. */
    iconLeft?: ReactNode
    /** Значок справа: счётчик, шеврон, стрелка. */
    iconRight?: ReactNode
    /**
     * Запрос идёт. Кнопка выключается и заливается `line-3`, подпись остаётся
     * тёмной. Подпись при этом обязана говорить, чего ждём: не «Отправить»,
     * а «Проверяем ИНН…» — так на доске состояний.
     */
    pending?: boolean
    /** Отдать разметку дочернему элементу — ссылке, пункту меню. */
    asChild?: boolean
    /**
     * Занять всю ширину слота вместо ширины по содержимому.
     *
     * Нужно там, где кнопка стоит в колонке фиксированной ширины: в строке
     * выдачи колонка действия 144, и «Раскрыть · 199 ₽» с «Открыть · 0 ₽»
     * обязаны встать на одной ширине, иначе колонка перестаёт быть колонкой.
     */
    block?: boolean
    /**
     * Показать состояние неподвижно. Только для полигона `/kitchen-sink`,
     * где доска состояний воспроизводится колонками. В продукте не применять:
     * там эти состояния возникают сами от мыши и клавиатуры.
     */
    demo?: "hover" | "focus" | "press"
  }

function Button({
  variant,
  size,
  children,
  iconLeft,
  iconRight,
  pending = false,
  asChild = false,
  block = false,
  demo,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const labelVariant = size === "lg" ? "controlLabelLg" : "controlLabel"
  const resolvedVariant = pending ? "pending" : (variant ?? "secondary")

  return (
    <Comp
      data-slot="button"
      data-variant={resolvedVariant}
      data-size={size ?? "sm"}
      data-pending={pending || undefined}
      data-demo={demo}
      type={asChild ? undefined : type}
      disabled={asChild ? undefined : disabled || pending}
      aria-busy={pending || undefined}
      // Через `cn`, а не напрямую: `block` дописывает ширину поверх набора
      // размера, и конфликты утилит разрешает `cn`, а не порядок в собранном
      // CSS. Так уже ловили радиус 12 вместо 999, когда pill стоял только
      // у главного действия.
      className={cn(buttonVariants({ variant: resolvedVariant, size }), block && "w-full")}
      {...props}
    >
      {iconLeft}
      <Typography variant={labelVariant}>{children}</Typography>
      {iconRight}
    </Comp>
  )
}

export { Button }
export type { ButtonProps }
