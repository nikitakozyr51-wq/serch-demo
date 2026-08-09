import { useState, type ReactNode } from "react"
import { DAILY_LIMITS, dailyLimitCost, dailyLimitWord } from "./daily-limit"

import { Button } from "@/components/controls/Button"
import { TextField } from "@/components/controls/TextField"
import { Typography } from "@/components/typography"
import { DialogCard } from "@/components/DialogCard"
import { cn } from "@/lib/utils"

/**
 * Пять окон руководителя: реквизиты, передача роли, вид всем, удаление
 * и дневной лимит сотрудника.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ОДНИМ ФАЙЛОМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Первые четыре — окна одного экрана (`агентство → настройки`), у всех одна
 * форма: 520 в ширину, поля 24, текстовый блок сверху, ряд кнопок снизу
 * справа. Разводить их по файлам значило бы четыре раза повторить каркас
 * и однажды разойтись в отступах. Пятое окно открывается с другого экрана
 * (`агентство → сотрудники`), но собрано из той же рамки и того же ряда
 * кнопок — увезти его в отдельный файл значило бы скопировать туда скрим,
 * подвал и обе строки выбора.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ У ВСЕХ ПЯТИ ЕСТЬ ПОДТВЕРЖДЕНИЕ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Каждое из этих действий либо необратимо, либо меняет ЧУЖИЕ экраны и ЧУЖИЕ
 * деньги. Отмены у них нет и быть не может: прежние значения не сохраняются.
 * Поэтому окно называет последствие раньше, чем показывает кнопку, —
 * и называет числом и именами, а не словом «некоторые».
 */

/**
 * Скрим и окно по центру.
 *
 * Скрим `#1e1e1e59` снят с кадров, окно 520. Нажатие мимо окна закрывает
 * его — это отмена по умолчанию, и она обязана быть у всего, что нельзя
 * отменить после.
 */
function DialogScrim({
  label,
  onClose,
  leaving = false,
  children,
}: {
  label: string
  onClose: () => void
  /**
   * Окно уходит: 120 мс, которые оно ещё стоит на экране после закрытия.
   *
   * Решение о жизни узла принимает экран настроек — он держит состояние
   * «какое окно открыто». Скрим только рисует уход: снять себя с экрана
   * он не может, его убирают снаружи.
   */
  leaving?: boolean
  children: ReactNode
}) {
  return (
    <div
      data-slot="dialog-scrim"
      aria-label={label}
      // Затемнение идёт быстрее карточки в обе стороны: сначала гаснет фон,
      // потом приезжает содержимое, и наоборот при уходе.
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]",
        leaving ? "scrim-out" : "scrim-in",
      )}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={cn("h-fit", leaving ? "motion-out" : "motion-in")}>{children}</div>
    </div>
  )
}

/** Ряд кнопок внизу справа: отмена и главное действие. */
function DialogFooter({
  onCancel,
  confirm,
  danger = false,
  disabled = false,
  onConfirm,
}: {
  onCancel: () => void
  confirm: string
  /** Действие необратимо и опасно: заливка ошибки вместо графита. */
  danger?: boolean
  disabled?: boolean
  onConfirm: () => void
}) {
  return (
    <div className="flex w-full items-center gap-2.5">
      <div className="h-px flex-1" />
      <Button variant="quiet" size="md" onClick={onCancel}>
        Отмена
      </Button>
      {/*
        Опасное действие заливается цветом ошибки, а не акцентом.

        Акцент в этом продукте означает «списываются деньги», и красить им
        удаление агентства значило бы смешать два разных красных: один
        зовёт нажать, другой предупреждает.
      */}
      <Button
        variant={danger ? "danger" : "primary"}
        size="md"
        disabled={disabled}
        onClick={onConfirm}
      >
        {confirm}
      </Button>
    </div>
  )
}

/**
 * СОСТОЯНИЕ · Реквизиты агентства (`cXuHY`).
 *
 * Окно 520 × 542. Три поля по 88 — метка 11/600, поле 40, подсказка 12/500.
 *
 * **Менять их задним числом нельзя, и об этом сказано в самом окне.**
 * Документы за закрытые месяцы остаются с прежними данными: счёт, который
 * бухгалтер уже оплатил, не может изменить получателя.
 */
function RequisitesDialog({
  legalName,
  inn,
  legalAddress,
  onSave,
  onClose,
  leaving = false,
}: {
  legalName: string
  inn: string
  legalAddress: string
  onSave: (next: { legalName: string; inn: string; legalAddress: string }) => void
  onClose: () => void
  /** Окно уходит. Держит его на экране лишние 120 мс экран настроек. */
  leaving?: boolean
}) {
  const [name, setName] = useState(legalName)
  const [tax, setTax] = useState(inn)
  const [address, setAddress] = useState(legalAddress)

  return (
    <DialogScrim label="Реквизиты агентства" onClose={onClose} leaving={leaving}>
      <DialogCard rhythm="medium">
        <Typography variant="panelTitle" tone="default" as="h2">
          Реквизиты агентства
        </Typography>
        <Typography variant="uiText" tone="secondary">
          Они печатаются в счёте, акте и счёте-фактуре. Менять их задним числом
          нельзя: документы за закрытые месяцы останутся с прежними данными.
        </Typography>

        {[
          {
            label: "НАЗВАНИЕ АГЕНТСТВА",
            value: name,
            set: setName,
            hint: "как в ЕГРЮЛ, оно попадёт в счёт и акт",
          },
          { label: "ИНН", value: tax, set: setTax, hint: "проверим в ЕГРЮЛ автоматически" },
          {
            label: "ЮРИДИЧЕСКИЙ АДРЕС",
            value: address,
            set: setAddress,
            hint: "адрес из выписки, для счетов и закрывающих",
          },
        ].map((field) => (
          <div key={field.label} className="flex w-full flex-col gap-1.5">
            <Typography variant="columnHeader" tone="dense">
              <>{field.label}</>
            </Typography>
            <TextField
              value={field.value}
              onChange={(event) => field.set(event.target.value)}
              aria-label={field.label}
            />
            <Typography variant="metaText" tone="dense">
              <>{field.hint}</>
            </Typography>
          </div>
        ))}

        <Typography variant="metaText" tone="dense">
          Название юрлица и ИНН сверяются с ЕГРЮЛ при сохранении. Если не
          сходится — счёт не выставится, и это защита вас, а не формальность.
        </Typography>

        <DialogFooter
          onCancel={onClose}
          confirm="Сохранить реквизиты"
          // Пустое название или пустой ИНН делают счёт невыставимым, и
          // сохранять такое значит откладывать отказ на потом.
          disabled={name.trim() === "" || tax.trim() === ""}
          onConfirm={() =>
            onSave({ legalName: name.trim(), inn: tax.trim(), legalAddress: address.trim() })
          }
        />
      </DialogCard>
    </DialogScrim>
  )
}

/**
 * СОСТОЯНИЕ · Передать роль (`B3hBi`).
 *
 * Окно 520 × 474. Список людей по 56 с кружком выбора 18 слева.
 *
 * **Роль ответственного за данные неразрывна с руководительской**, потому что
 * ролей в системе ровно две. Тот, кому передали, становится руководителем;
 * передавший — агентом. Об этом сказано в самом окне, а не в справке: человек
 * должен узнать это до нажатия, а не после.
 */
function TransferOwnerDialog({
  ownerName,
  people,
  onTransfer,
  onClose,
  leaving = false,
}: {
  ownerName: string
  /** Кому можно передать: все, кроме себя. */
  people: { id: string; name: string; note: string }[]
  onTransfer: (personId: string) => void
  onClose: () => void
  /** Окно уходит. Держит его на экране лишние 120 мс экран настроек. */
  leaving?: boolean
}) {
  const [chosen, setChosen] = useState<string | null>(people[0]?.id ?? null)

  return (
    <DialogScrim label="Передать роль" onClose={onClose} leaving={leaving}>
      <DialogCard rhythm="medium">
        <Typography variant="panelTitle" tone="default" as="h2">
          Передать роль ответственного за данные
        </Typography>
        <Typography variant="uiText" tone="secondary">
          <>
            {`Сейчас ответственный — ${ownerName}: он подписывает согласия и отвечает на запросы собственников. Ролей в системе ровно две, поэтому роль неразрывна с руководительской: тот, кому вы её передадите, станет руководителем агентства, а вы — агентом.`}
          </>
        </Typography>

        {people.length === 0 ? (
          <Typography variant="denseText" tone="dense">
            Передать роль некому: в агентстве вы один. Сначала пригласите
            сотрудника.
          </Typography>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {people.map((person) => {
              const active = person.id === chosen
              return (
                <button
                  key={person.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-slot="transfer-target"
                  onClick={() => setChosen(person.id)}
                  className={cn(
                    "row-tap flex h-14 w-full cursor-pointer items-center gap-4 rounded-lg px-4 text-left",
                    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                    active ? "bg-warm" : "bg-surface",
                  )}
                >
                  {/* Кружок 18: выбранный залит графитом, остальные пустые
                      с границей. Так в кадре, и это правильно — выбор здесь
                      единственный, а не набор. */}
                  <span
                    aria-hidden
                    className={cn(
                      "size-4.5 shrink-0 rounded-full border",
                      active ? "border-fg bg-fg" : "border-border-control bg-surface",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Typography variant="numericDense" tone="default">
                      <>{person.name}</>
                    </Typography>
                    <Typography variant="metaText" tone="dense">
                      <>{person.note}</>
                    </Typography>
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <Typography variant="metaText" tone="dense">
          Из интерфейса это необратимо. Вернуть роль сможет только новый
          руководитель или поддержка по письму с реквизитами юрлица.
        </Typography>

        <DialogFooter
          onCancel={onClose}
          confirm="Передать роль"
          disabled={chosen === null}
          onConfirm={() => chosen !== null && onTransfer(chosen)}
        />
      </DialogCard>
    </DialogScrim>
  )
}

/**
 * СОСТОЯНИЕ · Поставить вид всем (`fmHiq`).
 *
 * Окно 520 × 227 — самое маленькое из четырёх, потому что решение простое,
 * а последствие одно.
 *
 * **Подтверждение, а не молчаливое применение с отменой.** Действие меняет
 * чужие экраны, а прежние значения не сохраняются: отменять нечем. Поэтому
 * окно называет число и перечисляет поимённо — «некоторые сотрудники»
 * не позволяет решить, стоит ли оно того.
 */
function ApplyViewDialog({
  dense,
  people,
  onApply,
  onClose,
  leaving = false,
}: {
  /** Какой вид раскатывается. */
  dense: boolean
  /** Кого это коснётся: все, кроме себя. */
  people: string[]
  onApply: () => void
  onClose: () => void
  /** Окно уходит. Держит его на экране лишние 120 мс экран настроек. */
  leaving?: boolean
}) {
  const word = (count: number) => {
    if (count % 10 === 1 && count % 100 !== 11) return `${count} сотрудника`
    return `${count} сотрудников`
  }

  return (
    <DialogScrim label="Поставить вид всем" onClose={onClose} leaving={leaving}>
      <DialogCard>
        <Typography variant="panelTitle" tone="default" as="h2">
          <>{dense ? "Поставить всем плотный вид?" : "Поставить всем просторный вид?"}</>
        </Typography>
        <Typography variant="uiText" tone="secondary">
          <>
            {`Плотность и набор полей заменятся у ${word(people.length)}. Свой выбор каждого не сохраняется: вернуть прежнее можно только вручную, по одному.`}
          </>
        </Typography>
        {people.length === 0 ? null : (
          <Typography variant="denseText" tone="dense">
            <>{people.join(" · ")}</>
          </Typography>
        )}
        <DialogFooter onCancel={onClose} confirm="Поставить всем" onConfirm={onApply} />
      </DialogCard>
    </DialogScrim>
  )
}

/**
 * СОСТОЯНИЕ · Удалить агентство (`d7JoII`).
 *
 * Окно 520 × 224, кнопка залита цветом ошибки `#a7463e`.
 *
 * **Самое необратимое действие продукта.** Окно перечисляет всё, что
 * пропадёт, включая то, о чём человек не подумает: ссылки на подборки
 * у клиентов перестанут открываться. Клиент об этом не узнает — он просто
 * увидит, что страница не открывается.
 */
function DeleteAgencyDialog({
  agency,
  onRequest,
  onClose,
  leaving = false,
}: {
  agency: string
  onRequest: () => void
  onClose: () => void
  /** Окно уходит. Держит его на экране лишние 120 мс экран настроек. */
  leaving?: boolean
}) {
  return (
    <DialogScrim label="Удалить агентство" onClose={onClose} leaving={leaving}>
      <DialogCard>
        <Typography variant="panelTitle" tone="default" as="h2">
          <>{`Удалить агентство «${agency}»?`}</>
        </Typography>
        <Typography variant="uiText" tone="secondary">
          Доступ пропадёт у всех сотрудников сразу. Сохранённые поиски и
          подборки удаляются, ссылки на подборки у клиентов перестают
          открываться. Остаток счёта возвращается на счёт юрлица. Отменить
          нельзя.
        </Typography>
        <DialogFooter
          onCancel={onClose}
          confirm="Удалить агентство"
          danger
          onConfirm={onRequest}
        />
      </DialogCard>
    </DialogScrim>
  )
}

/**
 * СОСТОЯНИЕ · Сменить дневной лимит (`C2B6w`).
 *
 * Окно 520 × 434. Текстовый блок с зазором 14 — заголовок 20/600, объяснение
 * 14/500, три строки выбора по 56 с кружком 18 и сноска, — а под ним на 20
 * ряд кнопок. Строки выбора: выбранная тёплая с границей `border-control`,
 * остальные белые с `line-2`; кружок выбранной залит графитом.
 *
 * **Это чужие деньги, и окно называет последствие числом.** Нарисованная
 * сноска говорит, что раскрытия тратят общий счёт агентства; к ней добавлен
 * потолок дня в рублях, который пересчитывается на каждое нажатие. Без него
 * окно сообщало бы про «общий счёт» и оставляло руководителя умножать
 * 25 на 199 самому — а именно это умножение и есть решение, которое он
 * здесь принимает.
 *
 * **Выбор не применяется молча.** Лимит меняет ЧУЖУЮ работу: агент, у
 * которого сутки кончились, перестаёт видеть телефоны посреди обзвона.
 * Поэтому окно, а не чип в строке таблицы.
 */
function DailyLimitDialog({
  person,
  limit,
  onSave,
  onClose,
  leaving = false,
}: {
  /** Чей лимит меняют. Имя стоит в заголовке: лимит не бывает «вообще». */
  person: string
  /** Что стоит сейчас. `null` — без лимита. */
  limit: number | null
  onSave: (limit: number | null) => void
  onClose: () => void
  /** Окно уходит. Держит его на экране лишние 120 мс экран сотрудников. */
  leaving?: boolean
}) {
  const [chosen, setChosen] = useState<number | null>(limit)

  return (
    <DialogScrim label="Дневной лимит раскрытий" onClose={onClose} leaving={leaving}>
      <DialogCard rhythm="medium">
        {/*
          Четыре блока идут одной группой с зазором 14, а не детьми карточки.
          Так в кадре: между текстом и подвалом 20, внутри текста 14. Ритм
          карточки закрыт тремя ступенями (16 · 20 · 24), и подменять его
          снаружи нельзя — зато вложить свою группу можно, и тогда оба
          расстояния остаются замеренными.
        */}
        <div className="flex w-full flex-col gap-3.5">
          <Typography variant="panelTitle" tone="default" as="h2">
            <>{`Дневной лимит · ${person}`}</>
          </Typography>
          <Typography variant="uiText" tone="secondary">
            <>
              {`Сколько контактов агент может раскрыть за сутки. Счётчик обнуляется в 00:00, неизрасходованное не переносится. Сейчас ${dailyLimitWord(limit)}.`}
            </>
          </Typography>

          <div
            role="radiogroup"
            aria-label="Дневной лимит раскрытий"
            className="flex w-full flex-col gap-2"
          >
            {DAILY_LIMITS.map((option) => {
              const active = option.value === chosen
              return (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-slot="daily-limit-option"
                  onClick={() => setChosen(option.value)}
                  // Граница собрана внутренней тенью, а не рамкой: рамка
                  // добавила бы 57-й пиксель к строке 56, а `outline`
                  // в этом проекте занят кольцом фокуса.
                  className={cn(
                    "row-tap flex h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-4 text-left",
                    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                    active
                      ? "bg-warm shadow-[inset_0_0_0_1px_var(--border-control)]"
                      : "bg-surface shadow-[inset_0_0_0_1px_var(--line-2)]",
                  )}
                >
                  {/* Кружок 18: выбранный залит графитом, остальные пустые
                      с границей `line-3`. Выбор здесь единственный, а не
                      набор, — поэтому круг, а не квадрат. */}
                  <span
                    aria-hidden
                    className={cn(
                      "size-4.5 shrink-0 rounded-full border",
                      active ? "border-fg bg-fg" : "border-line-3 bg-surface",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Typography
                      variant={active ? "controlLabel" : "uiText"}
                      tone="default"
                    >
                      <>{option.label}</>
                    </Typography>
                    <Typography variant="metaText" tone="dense">
                      <>{option.note}</>
                    </Typography>
                  </span>
                </button>
              )
            })}
          </div>

          <Typography variant="metaText" tone="dense">
            <>
              {`Без лимита стоит снимать осознанно: каждое раскрытие тратит общий счёт агентства, а не личный. ${dailyLimitCost(chosen)}`}
            </>
          </Typography>
        </div>

        <DialogFooter
          onCancel={onClose}
          confirm="Сохранить лимит"
          onConfirm={() => onSave(chosen)}
        />
      </DialogCard>
    </DialogScrim>
  )
}

export {
  ApplyViewDialog,
  DailyLimitDialog,
  DeleteAgencyDialog,
  RequisitesDialog,
  TransferOwnerDialog,
}
