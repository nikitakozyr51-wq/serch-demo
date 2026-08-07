import { useState, type ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { TextField } from "@/components/controls/TextField"
import { Typography } from "@/components/typography"
import { DialogCard } from "@/components/DialogCard"
import { cn } from "@/lib/utils"

/**
 * Четыре окна руководителя: реквизиты, передача роли, вид всем, удаление.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ОДНИМ ФАЙЛОМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Все четыре — окна одного экрана (`агентство → настройки`), у всех одна
 * форма: 520 в ширину, поля 24, текстовый блок сверху, ряд кнопок снизу
 * справа. Разводить их по файлам значило бы четыре раза повторить каркас
 * и однажды разойтись в отступах.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ У ВСЕХ ЧЕТЫРЁХ ЕСТЬ ПОДТВЕРЖДЕНИЕ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Каждое из этих действий либо необратимо, либо меняет ЧУЖИЕ экраны.
 * Отмены у них нет и быть не может: прежние значения не сохраняются.
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
function DialogScrim({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      data-slot="dialog-scrim"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="motion-in h-fit">{children}</div>
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
}: {
  legalName: string
  inn: string
  legalAddress: string
  onSave: (next: { legalName: string; inn: string; legalAddress: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(legalName)
  const [tax, setTax] = useState(inn)
  const [address, setAddress] = useState(legalAddress)

  return (
    <DialogScrim label="Реквизиты агентства" onClose={onClose}>
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
}: {
  ownerName: string
  /** Кому можно передать: все, кроме себя. */
  people: { id: string; name: string; note: string }[]
  onTransfer: (personId: string) => void
  onClose: () => void
}) {
  const [chosen, setChosen] = useState<string | null>(people[0]?.id ?? null)

  return (
    <DialogScrim label="Передать роль" onClose={onClose}>
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
}: {
  /** Какой вид раскатывается. */
  dense: boolean
  /** Кого это коснётся: все, кроме себя. */
  people: string[]
  onApply: () => void
  onClose: () => void
}) {
  const word = (count: number) => {
    if (count % 10 === 1 && count % 100 !== 11) return `${count} сотрудника`
    return `${count} сотрудников`
  }

  return (
    <DialogScrim label="Поставить вид всем" onClose={onClose}>
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
}: {
  agency: string
  onRequest: () => void
  onClose: () => void
}) {
  return (
    <DialogScrim label="Удалить агентство" onClose={onClose}>
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

export { ApplyViewDialog, DeleteAgencyDialog, RequisitesDialog, TransferOwnerDialog }
