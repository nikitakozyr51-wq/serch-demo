import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// `tracking-normal` здесь стоять не может. Ступень кегля отдаёт свой трекинг
// как значение по умолчанию переменной `--tw-tracking`, а `tracking-normal`
// определяет эту переменную нулём — и вся лестница разрядки перестаёт
// применяться на любом тексте продукта. Ловилось только замером браузером.
const typographyVariants = cva("min-w-0", {
  variants: {
    variant: {
      h1: "font-heading text-4xl leading-tight font-semibold",
      h2: "font-heading text-3xl leading-tight font-semibold",
      h3: "font-heading text-2xl leading-snug font-semibold",
      h4: "font-heading text-xl leading-snug font-semibold",
      h5: "font-heading text-lg leading-snug font-medium",
      h6: "font-heading text-base leading-snug font-medium",
      lead: "text-lg leading-7 font-normal",
      body: "text-base leading-7 font-normal",
      bodySm: "text-sm leading-normal font-normal",
      bodyXs: "text-xs leading-normal font-normal",
      bodySmMedium: "text-sm leading-normal font-medium",
      emphasis: "font-medium",
      bubble: "text-sm leading-relaxed font-normal",
      captionMedium: "text-xs leading-normal font-medium",
      label: "text-sm leading-none font-medium",
      control: "text-sm leading-none font-medium whitespace-nowrap",
      controlXs: "text-xs leading-none font-medium whitespace-nowrap",
      kbd: "font-sans text-xs leading-none font-medium whitespace-nowrap",
      input:
        "text-base leading-normal font-normal md:text-sm file:text-sm file:font-medium",
      caption: "text-xs leading-normal font-normal",
      shortcut: "text-xs leading-normal tracking-widest font-normal",
      code: "font-mono text-sm leading-normal font-medium",
      avatar: "text-sm leading-none font-normal group-data-[size=sm]/avatar:text-xs",
      avatarCount:
        "text-sm leading-none font-normal group-has-data-[size=sm]/avatar-group:text-xs",
      attachmentTitle:
        "text-sm leading-normal font-medium group-data-[size=sm]/attachment:text-xs group-data-[size=xs]/attachment:text-xs",
      calendar:
        "text-sm leading-normal font-normal [&_.rdp-caption_label]:text-sm [&_.rdp-caption_label]:font-medium [&_.rdp-dropdowns]:text-sm [&_.rdp-dropdowns]:font-medium [&_.rdp-week_number]:text-[0.8rem] [&_.rdp-weekday]:text-[0.8rem] [&_.rdp-weekday]:font-normal",
      calendarDay:
        "text-sm leading-none font-normal [&>span]:text-xs",
      commandGroup:
        "text-sm leading-normal font-normal **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:leading-normal **:[[cmdk-group-heading]]:font-medium",
      srOnly: "sr-only",

      // ── Лестница кабинета «Сёрчи», восемь ступеней ─────────────────────
      // 11 · 12 · 13 · 14 · 16 · 20 · 28 · 40. Промежуточных нет.
      // Интерлиньяж и трекинг заданы токенами в index.css, здесь только роль.
      // Начертаний два: 500 и 600. Третьего нет — иерархия делается кеглем
      // и цветом, не толщиной.
      columnHeader: "text-11 font-semibold uppercase",
      metaText: "text-xs font-medium",
      denseText: "text-13 font-medium",
      uiText: "text-sm font-medium",
      // Та же ступень, что у `controlLabel`, но без запрета переноса.
      // Подпись контрола не переносится никогда, бегущий текст — обязан:
      // заголовок сообщения об ошибке и активный пункт навигации набраны
      // 14/600 и в макете стоят с переносом, а не в одну строку.
      strongText: "text-sm font-semibold",
      rowPrice: "text-base font-semibold",
      // Та же ступень 16, но весом 500: заголовок строки настройки.
      // Строка настройки — не значение и не цена, а название места, куда
      // ведёт стрелка; 600 делал бы её равной по весу адресу и цене в выдаче.
      // Снято с `ESvsw/rLbVw`: 16/500, трекинг −0.24.
      settingTitle: "text-base font-medium",
      panelTitle: "text-xl font-semibold",
      // Единица рядом с крупным числом: «20 000 ₽» в поле суммы набрано двумя
      // ступенями одного кегля — число 600, знак валюты 500 и приглушённый.
      // Так знак не спорит с суммой, ради которой поле и существует.
      unitLabel: "text-xl font-medium",
      panelTitleTight: "text-20-tight font-semibold",
      cardPrice: "text-2xl font-semibold",
      display: "text-4xl font-semibold",

      // ── Подписи контролов ──────────────────────────────────────────────
      // Кегль связан с высотой жёстко. В плотном режиме ступени 32 и 40
      // роняют подпись с 14 на 13; ступень 48 остаётся на 16.
      // Снято с доски «СИСТЕМА · Состояния контролов»: подпись кнопки идёт
      // насыщенностью 600, значение поля и подпись чипа — 500.
      chipLabel: "text-xs font-medium whitespace-nowrap",
      chipFilterLabel: "text-13 font-medium whitespace-nowrap",
      controlLabel: "text-sm compact:text-13 font-semibold whitespace-nowrap",
      controlLabelLg: "text-base font-semibold whitespace-nowrap",
      fieldValue: "text-sm font-medium",
      fieldError: "text-xs font-medium",

      // Числа в таблицах и деньги. Моноширинные цифры обязательны:
      // без них колонка сумм перестаёт читаться столбиком.
      numeric: "text-sm font-semibold tabular-nums",
      numericDense: "text-13 font-semibold tabular-nums",
      // Отклонение от рынка: колонка чисел, поэтому фигуры моноширинные.
      // Счётчики сайдбара и слова вроде «Изменить» идут `metaStrong`
      // без них — в файле там пропорциональные знаки, «12» шириной 12 px.
      numericMeta: "text-xs font-semibold tabular-nums",

      // ── Строка выдачи ──────────────────────────────────────────────────
      // Ступень 11 в строке идёт без капслока и без разрядки — это вторая
      // её роль, снята замером с `jsW77`. Разрядку приходится гасить явно:
      // она объявлена значением ступени по умолчанию.
      // Табы выдачи: 13-й кегль, активный весом 600, остальные 500.
      tabActive: "text-13 font-semibold whitespace-nowrap",
      tabLabel: "text-13 font-medium whitespace-nowrap",
      signalLabel: "text-11 font-medium tracking-normal",
      avatarInitials: "text-11 font-semibold tracking-normal",
      // Общая ступень 12/600: счётчики, «Сбросить 7», «Изменить».
      metaStrong: "text-xs font-semibold",
    },
    tone: {
      current: "",
      default: "text-foreground",
      muted: "text-muted-foreground",
      // Три текстовые ступени проекта. `text-3` допустим только от 18.66 px
      // и только как декоративная подпись; всё, что мельче, берёт `dense`.
      secondary: "text-text-2",
      dense: "text-text-dense",
      tertiary: "text-text-3",
      // Семантика. Один цвет, повёрнутый по hue, при постоянных светлоте
      // и насыщенности — тогда успех, внимание и ошибка имеют одинаковый
      // визуальный вес и не спорят с акцентом. Декоративно не применяются.
      ok: "text-ok-text",
      warn: "text-warn-text",
      destructive: "text-destructive",
      primary: "text-primary",
      card: "text-card-foreground",
      popover: "text-popover-foreground",
      sidebar: "text-sidebar-foreground",
      inverse: "text-background",
    },
    align: {
      start: "text-left",
      center: "text-center",
      end: "text-right",
    },
    balance: {
      true: "text-balance",
    },
    pretty: {
      true: "text-pretty",
    },
    truncate: {
      true: "truncate",
    },
    wrap: {
      normal: "",
      nowrap: "whitespace-nowrap",
      break: "break-all",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "current",
  },
})

type TypographyVariant = NonNullable<
  VariantProps<typeof typographyVariants>["variant"]
>

const defaultElementByVariant: Record<TypographyVariant, React.ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  lead: "p",
  body: "p",
  bodySm: "p",
  bodyXs: "p",
  bodySmMedium: "p",
  emphasis: "strong",
  bubble: "span",
  captionMedium: "span",
  label: "span",
  control: "span",
  controlXs: "span",
  kbd: "kbd",
  input: "span",
  caption: "span",
  shortcut: "span",
  code: "code",
  avatar: "span",
  avatarCount: "span",
  attachmentTitle: "span",
  calendar: "div",
  calendarDay: "span",
  commandGroup: "div",
  srOnly: "span",
  columnHeader: "span",
  metaText: "span",
  denseText: "span",
  uiText: "span",
  strongText: "span",
  rowPrice: "span",
  settingTitle: "span",
  panelTitle: "h2",
  unitLabel: "span",
  panelTitleTight: "h2",
  cardPrice: "span",
  display: "span",
  chipLabel: "span",
  chipFilterLabel: "span",
  controlLabel: "span",
  controlLabelLg: "span",
  fieldValue: "span",
  fieldError: "span",
  numeric: "span",
  numericDense: "span",
  numericMeta: "span",
  tabActive: "span",
  tabLabel: "span",
  signalLabel: "span",
  avatarInitials: "span",
  metaStrong: "span",
}

type TypographyOwnProps<TElement extends React.ElementType = "span"> =
  VariantProps<typeof typographyVariants> & {
    as?: TElement
    asChild?: boolean
  }

type TypographyProps<TElement extends React.ElementType = "span"> =
  TypographyOwnProps<TElement> &
    Omit<
      React.ComponentPropsWithoutRef<TElement>,
      keyof TypographyOwnProps<TElement>
    >

function Typography<TElement extends React.ElementType = "span">({
  as,
  asChild = false,
  className,
  variant,
  tone,
  align,
  balance,
  pretty,
  truncate,
  wrap,
  ...props
}: TypographyProps<TElement>) {
  const resolvedVariant = variant ?? "body"
  const Comp = asChild ? Slot.Root : (as ?? defaultElementByVariant[resolvedVariant])
  const slotProps = asChild ? {} : { "data-slot": "typography" }

  return (
    <Comp
      {...slotProps}
      data-variant={resolvedVariant}
      className={cn(
        typographyVariants({
          variant: resolvedVariant,
          tone,
          align,
          balance,
          pretty,
          truncate,
          wrap,
        }),
        className
      )}
      {...props}
    />
  )
}

export { Typography }
export type { TypographyProps }
