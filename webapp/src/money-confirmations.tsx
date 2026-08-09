import { useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

import { Button } from "@/components/controls/Button"
import { DialogCard } from "@/components/DialogCard"
import { Typography } from "@/components/typography"
import { DISCLOSURE_PRICE, useSession } from "@/features/auth"
import { MobileSheet } from "@/features/cabinet"
import { groupDigits, plural } from "@/features/listings"
import {
  SUBJECTIVE_REFUND_LIMIT,
  accountingDocument,
  download,
  fileName,
  subjectiveRefunds,
  useNow,
  useWorkspace,
} from "@/features/workspace"
import { cn } from "@/lib/utils"

/**
 * Что человек видит СРАЗУ ПОСЛЕ того, как деньги двинулись.
 *
 * Пять кадров: `ZmKkW` и `l9WNps` — баланс пополнен, `LFBew` и `m0ATRJ` —
 * заявка на возврат отправлена, `exztG` — лимит возвратов исчерпан.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ЭТО ОКНА, А НЕ ВСПЛЫВАЮЩИЕ СООБЩЕНИЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Правило записано в `platform/notify`: деньги оставляют постоянный след, и
 * всплывашка, исчезающая через четыре секунды, даёт ощущение следа вместо
 * следа. Человек только что распорядился чужими деньгами — деньгами агентства,
 * а не своими, — и обязан прочитать три вещи, не торопясь: сколько ушло или
 * вернулось, что стало с остатком, где теперь лежит запись об этом.
 *
 * До этого файла подтверждений не было ни одного: пополнение на компьютере
 * молча меняло число в шапке, пополнение на телефоне не делало вообще ничего,
 * а возврат отвечал тостом «Вернули 199 ₽ на счёт агентства» — ровно тем, что
 * запрещено.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ОБЕ ПЛАТФОРМЫ В ОДНОМ ФАЙЛЕ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * У окна и у листа разная геометрия, но ОДНА фраза: «Возврат 199 ₽ по объекту
 * Ленская ул., 10…» набрана в `LFBew` и в `m0ATRJ` слово в слово. Разведи их
 * по файлам — и первая же правка формулировки разойдётся между компьютером
 * и телефоном, а человек получит два разных обещания про одни и те же деньги.
 * Поэтому текст живёт функцией, а платформы — двумя оболочками вокруг неё.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * РАСХОЖДЕНИЯ С КАДРАМИ, НАЗВАННЫЕ ВСЛУХ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. **Тени у окна нет.** В `JHW4q` стоит `#1E1E1E40`, смещение 24, размытие
 *    60. Теней в продукте нет вовсе — это позиция, записанная в `DialogCard`
 *    и в полке сообщений, и одно окно её не отменяет.
 * 2. **Кнопки взяты с доски контролов, а не с компонентов `VafEG`/`EDAmG`.**
 *    В компонентах кадра боковое поле 16 и 24, на доске `СИСТЕМА · Состояния
 *    контролов` — 28 и 36. Доска в этом проекте старше: по ней собрана
 *    закрытая лестница `Button`, и подгонять её под два устаревших компонента
 *    значило бы сдвинуть каждую кнопку продукта.
 * 3. **На телефоне текст идёт 14-м кеглем, а не 15-м.** В `l9WNps` и `m0ATRJ`
 *    объяснение набрано 15/500 — ступени, которой в лестнице проекта нет
 *    (11 · 12 · 13 · 14 · 16 · 20 · 28 · 40). Третий кадр той же серии,
 *    `exztG`, набран 14-м, и компонент-родитель `SItir` тоже 14-м: пятнадцатый
 *    здесь описка двух экземпляров, а не решение.
 * 4. **Зазор заголовка и текста на телефоне 8, а не 14.** По той же причине:
 *    8 стоит в самом компоненте `SItir` и в `exztG`, 14 — в двух экземплярах.
 *    На компьютере наоборот: 14 стоит в обоих кадрах, и он воспроизведён.
 */

/** «143 раскрытия» — рубли переведены в работу отдела, а не оставлены рублями. */
function disclosuresFor(amount: number) {
  const count = Math.floor(amount / DISCLOSURE_PRICE)
  return `${count} ${plural(count, "раскрытие", "раскрытия", "раскрытий")}`
}

/**
 * «20 000 ₽ зачислены. На счету 28 610 ₽, это 143 раскрытия…» — из `ZmKkW`.
 *
 * Оба числа настоящие: сумма приходит из нажатой кнопки, остаток — из сеанса
 * уже ПОСЛЕ зачисления. Вписанные 20 000 и 28 610 были образцом текста кадра
 * и не двигались бы ни от одного пополнения.
 */
function topUpDoneText(amount: number, balance: number) {
  return `${groupDigits(amount)} ₽ зачислены. На счету ${groupDigits(balance)} ₽, это ${disclosuresFor(balance)}. Деньги не сгорают и не имеют срока.`
}

/**
 * «Возврат 199 ₽ по объекту Ленская ул., 10…» — из `LFBew` и `m0ATRJ`.
 *
 * **Причина решает, что здесь написано, и в кадре нарисован только один
 * из двух исходов.** Кадр говорит «причина объективная, поэтому деньги
 * вернулись сразу» — но объективность возврата не свойство экрана, а свойство
 * выбранной причины: «номера не существует» и «объект уже продан» объективны,
 * «оказался посредник» — суждение агента, и оно тратит лимит. Показывать
 * второму исходу текст первого значило бы скрыть от агентства, что оно
 * потратило одну из двенадцати попыток за месяц.
 *
 * Слова второй ветки не выдуманы: они собраны из уже написанного в продукте —
 * «объективная закрывается сразу, субъективная в течение часа и считается
 * в лимит» (окно `gJdnV`) и «лимит возвратов по субъективным причинам: N
 * из 12 за 30 дней» (шапка вкладки возвратов).
 */
function refundSentText(
  amount: number,
  address: string,
  objective: boolean,
  subjectiveUsed: number,
) {
  const head = `Возврат ${groupDigits(amount)} ₽ по объекту ${address}.`
  const tail = "Запись появилась в разделе «Баланс → Возвраты»."

  if (objective) {
    return `${head} Причина объективная, поэтому деньги вернулись на счёт агентства сразу. ${tail}`
  }

  return `${head} Причина субъективная, поэтому возврат считается в лимит: ${subjectiveUsed} из ${SUBJECTIVE_REFUND_LIMIT} за тридцать дней. Деньги вернулись на счёт агентства сразу. ${tail}`
}

/**
 * Счёт на это пополнение — настоящим файлом.
 *
 * Кнопка «Скачать счёт» стоит в подтверждении второй, и без файла она была бы
 * подписью: человек только что перевёл двадцать тысяч и просит бумагу для
 * бухгалтерии. Собрать её сервер не нужен — все числа уже на экране, а печать
 * и подпись всё равно придут позже.
 *
 * Номер совпадает с номером строки в журнале пополнений (`total - index`,
 * у самого свежего пополнения он равен их числу). Иначе бухгалтер получил бы
 * два разных номера на один платёж: один в списке, другой в файле.
 */
function useTopUpInvoice() {
  const session = useSession()
  const workspace = useWorkspace()
  const now = useNow()

  return (amount: number) => {
    download(
      fileName("счёт-на-пополнение", now, "txt"),
      accountingDocument({
        kind: "Счёт",
        number: String(workspace.topUps.length),
        at: now,
        agency: session?.agency ?? "",
        lines: [
          ["Пополнение счёта агентства", `${groupDigits(amount)} ₽`],
          [`Раскрытий по ${DISCLOSURE_PRICE} ₽`, String(Math.floor(amount / DISCLOSURE_PRICE))],
        ],
        total: `${groupDigits(amount)} ₽`,
      }),
      "text/plain;charset=utf-8",
    )
  }
}

/* ── Компьютер: окно состояния (`VWzRF`) ──────────────────────────────────── */

/**
 * Каркас обоих окон: затемнение, карточка 520, текстовый блок, ряд кнопок.
 *
 * Снято с `VWzRF`: затемнение `#1e1e1e59`, карточка по центру, поля 24,
 * радиус 16, зазор 20 между текстом и подвалом, зазор 8 между кнопками,
 * кнопки прижаты вправо распоркой.
 *
 * Заголовок и объяснение стоят на 14 друг от друга, а не на 20, — так в обоих
 * кадрах. Это один блок текста, а не два соседних блока, и он обязан читаться
 * абзацем.
 */
function MoneyStateDialog({
  label,
  title,
  text,
  quiet,
  confirm,
  leaving = false,
  onClose,
}: {
  /** Чем окно называется для чтения с экрана. */
  label: string
  title: string
  text: string
  /** Кнопка слева: тёплая заливка, графитовая подпись. */
  quiet: { label: string; onPress: () => void }
  /** Кнопка справа: графит. Не акцент — акцент означает «списываются деньги»,
   *  а здесь деньги уже двинулись, и звать нажать ещё раз нечем. */
  confirm: { label: string; onPress: () => void }
  /**
   * Окно уходит: 120 мс, которые оно ещё стоит на экране после закрытия.
   *
   * Решение о жизни узла принимает экран, а не окно: снять себя оно не может.
   * Без этих 120 мс подтверждение пропадало бы за один кадр — а исчезновение
   * видно лучше появления, потому что человек уже смотрит именно туда.
   */
  leaving?: boolean
  onClose: () => void
}) {
  /**
   * Escape закрывает окно.
   *
   * У подтверждения нет крестика, а само оно приходит без спроса — сразу после
   * нажатия. Единственный выход, который человек пробует не глядя, это Escape,
   * и не ответить на него значит запереть его в окне, которое ничего не просит.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      data-slot="dialog-scrim"
      aria-label={label}
      // Затемнение гаснет быстрее, чем приезжает карточка: сначала фон,
      // потом содержимое. Тот же порядок, что у окон агентства.
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]",
        leaving ? "scrim-out" : "scrim-in",
      )}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={cn("h-fit", leaving ? "motion-out" : "motion-in")}>
        <DialogCard rhythm="medium">
          <div className="flex w-full flex-col gap-3.5">
            <Typography variant="panelTitle" tone="default" as="h2">
              <>{title}</>
            </Typography>
            <Typography variant="uiText" tone="secondary">
              <>{text}</>
            </Typography>
          </div>

          <div className="flex w-full items-center gap-2">
            <div className="h-px flex-1" />
            <Button variant="quiet" size="md" onClick={quiet.onPress}>
              <>{quiet.label}</>
            </Button>
            <Button variant="primary" size="md" onClick={confirm.onPress}>
              <>{confirm.label}</>
            </Button>
          </div>
        </DialogCard>
      </div>
    </div>
  )
}

/**
 * СОСТОЯНИЕ · Баланс пополнен (`ZmKkW`).
 *
 * **Остаток читается из сеанса, а не передаётся снаружи.** Окно встаёт после
 * зачисления, и его задача — показать счёт таким, каким он стал. Приняв
 * остаток числом, оно однажды показало бы остаток «до».
 */
function TopUpDoneDialog({
  amount,
  leaving = false,
  onClose,
}: {
  /** Сколько зачислили. Единственное, чего окно не может узнать само. */
  amount: number
  /** Окно уходит. Держит его на экране лишние 120 мс экран пополнения. */
  leaving?: boolean
  onClose: () => void
}) {
  const session = useSession()
  const navigate = useNavigate()
  const invoice = useTopUpInvoice()
  const balance = session?.balance ?? 0

  return (
    <MoneyStateDialog
      label="Баланс пополнен"
      title="Баланс пополнен"
      text={topUpDoneText(amount, balance)}
      quiet={{ label: "Скачать счёт", onPress: () => invoice(amount) }}
      // «Вернуться в выдачу», а не «Закрыть»: пополняют, чтобы работать
      // дальше, и продукт называет следующий шаг вместо того, чтобы
      // оставить человека на форме, которая ему больше не нужна.
      confirm={{ label: "Вернуться в выдачу", onPress: () => void navigate({ to: "/search" }) }}
      leaving={leaving}
      onClose={onClose}
    />
  )
}

/**
 * СОСТОЯНИЕ · Заявка на возврат отправлена (`LFBew`).
 *
 * Окно 520 × 210 — на двадцать выше, чем у пополнения, потому что объяснение
 * занимает три строки, а не две.
 */
function RefundSentDialog({
  amount,
  address,
  objective,
  leaving = false,
  onClose,
}: {
  amount: number
  address: string
  /** Объективная причина в лимит не считается — от этого зависит текст. */
  objective: boolean
  /** Окно уходит. Держит его на экране лишние 120 мс тот экран, что позвал. */
  leaving?: boolean
  onClose: () => void
}) {
  const workspace = useWorkspace()
  const now = useNow()
  const navigate = useNavigate()

  return (
    <MoneyStateDialog
      label="Заявка на возврат отправлена"
      title="Заявка отправлена"
      text={refundSentText(amount, address, objective, subjectiveRefunds(workspace, now))}
      quiet={{ label: "Понятно", onPress: onClose }}
      confirm={{
        label: "Открыть возвраты",
        onPress: () => void navigate({ to: "/balance/refunds" }),
      }}
      leaving={leaving}
      onClose={onClose}
    />
  )
}

/* ── Телефон: лист состояния (`SItir`) ────────────────────────────────────── */

/**
 * МОБАЙЛ · Баланс пополнен (`l9WNps`).
 *
 * Лист приходит ПОВЕРХ формы пополнения, а не вместо неё: затемнение должно
 * затемнять тот экран, с которого ушли деньги, иначе человек теряет место,
 * где он был. Позиционирование стоит обёрткой снаружи — сам лист закрыт
 * и своей раскладкой распоряжается сам.
 */
function TopUpDoneSheet({ amount }: { amount: number }) {
  const session = useSession()
  const navigate = useNavigate()
  const invoice = useTopUpInvoice()
  const balance = session?.balance ?? 0

  return (
    <div className="fixed inset-0 z-50">
      <MobileSheet title="Баланс пополнен" text={topUpDoneText(amount, balance)}>
        <Button
          variant="primary"
          size="lg"
          block
          onClick={() => void navigate({ to: "/m/search" })}
        >
          Вернуться в выдачу
        </Button>
        <Button variant="quiet" size="lg" block onClick={() => invoice(amount)}>
          Скачать счёт
        </Button>
      </MobileSheet>
    </div>
  )
}

/**
 * МОБАЙЛ · Заявка на возврат отправлена (`m0ATRJ`).
 *
 * Лист не встаёт поверх листа заявки, а ЗАМЕНЯЕТ его: два одинаковых листа
 * друг на друге читаются как заедание, а форма заявки после отправки не нужна.
 * Так же нарисовано и в кадре — под затемнением пусто.
 */
function RefundSentSheet({
  amount,
  address,
  objective,
  onClose,
}: {
  amount: number
  address: string
  objective: boolean
  /** «Понятно» — уйти туда, откуда пришли за возвратом. */
  onClose: () => void
}) {
  const workspace = useWorkspace()
  const now = useNow()
  const navigate = useNavigate()

  return (
    <MobileSheet
      title="Заявка отправлена"
      text={refundSentText(amount, address, objective, subjectiveRefunds(workspace, now))}
    >
      <Button
        variant="primary"
        size="lg"
        block
        onClick={() => void navigate({ to: "/m/balance/refunds" })}
      >
        Открыть возвраты
      </Button>
      <Button variant="quiet" size="lg" block onClick={onClose}>
        Понятно
      </Button>
    </MobileSheet>
  )
}

/**
 * МОБАЙЛ · Лимит возвратов исчерпан (`exztG`).
 *
 * **Деньги здесь НЕ вернулись, и лист об этом говорит первой строкой.** Это
 * единственный из пяти кадров, где денежное действие не состоялось: двенадцать
 * спорных возвратов за тридцать дней уже взяты, и заявка уходит человеку
 * на разбор. Показать её тем же «Заявка отправлена» значило бы пообещать
 * возврат, которого не будет ещё сутки.
 *
 * Слово «Двенадцать» в тексте — это `SUBJECTIVE_REFUND_LIMIT`. Числом
 * из константы его не подставить (в кадре оно прописью, а превращателя
 * чисел в слова в продукте нет), поэтому связь названа здесь: поменяется
 * лимит — поменяется и слово.
 */
function RefundLimitSheet({ onCancel }: { onCancel: () => void }) {
  return (
    <MobileSheet
      title="Лимит возвратов исчерпан"
      text="Двенадцать субъективных возвратов за тридцать дней использованы. Заявка уйдёт на ручной разбор, ответим за сутки."
    >
      {/* Очереди ручного разбора в продукте нет: заявку принимает человек
          поддержки, которого за демонстрацией не стоит. Действие названо
          атрибутом — это честнее выдуманного «отправлено». */}
      <Button
        variant="primary"
        size="lg"
        block
        data-action="отправить заявку на возврат на ручной разбор"
      >
        Отправить на разбор
      </Button>
      {/* «Отмена» возвращает к списку причин, а не уводит с экрана: причина
          могла быть выбрана спорная по ошибке, а объективная лимита
          не тратит — и тогда деньги вернутся сразу. */}
      <Button variant="quiet" size="lg" block onClick={onCancel}>
        Отмена
      </Button>
    </MobileSheet>
  )
}

export {
  RefundLimitSheet,
  RefundSentDialog,
  RefundSentSheet,
  TopUpDoneDialog,
  TopUpDoneSheet,
}
