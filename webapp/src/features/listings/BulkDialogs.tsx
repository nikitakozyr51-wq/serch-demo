import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { DialogCard } from "@/components/DialogCard"
import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Два окна панели выбранного: сменить статус и назначить агенту.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Оба были нарисованы (`a9lIk`, `jUJgJ`) и оба не открывались: в панели
 * выбранного у этих кнопок стоял только атрибут `data-action` — подпись
 * «вот что должно случиться», то есть намерение вместо исполнения. Человек
 * выделял двенадцать объектов, нажимал «Сменить статус» и не получал ничего.
 *
 * Живут в одном файле, потому что вызываются из одного места и делят форму:
 * окно 520, поля 24, текстовый блок сверху, ряд кнопок снизу справа.
 */

/**
 * СОСТОЯНИЕ · Сменить статус (`a9lIk`).
 *
 * Окно 520 × 450. Четыре статуса строками по 44 с зазором 8, подпись 14 —
 * выбранный весом 600, остальные 500.
 *
 * **Стоп-листа в списке нет, и это главное в окне.** Он приходит от
 * собственника через `serch.ru/stop` и снимается только им; поставить его
 * руками нельзя никому, включая руководителя. Будь он пятой строкой,
 * агентство однажды поставило бы его само — и объект исчез бы из работы
 * навсегда без ведома собственника.
 */
const STATUSES = [
  { id: "free", label: "Свободен" },
  { id: "in-progress", label: "В работе" },
  { id: "called", label: "Прозвонен" },
  { id: "refused", label: "Отказ" },
] as const

type StatusId = (typeof STATUSES)[number]["id"]

function BulkStatusDialog({
  count,
  onApply,
  onClose,
}: {
  /** Сколько объектов выделено. Число уходит в заголовок и на кнопку. */
  count: number
  onApply: (status: StatusId, label: string) => void
  onClose: () => void
}) {
  const [chosen, setChosen] = useState<StatusId>("in-progress")
  const label = STATUSES.find((item) => item.id === chosen)?.label ?? ""

  return (
    <div
      data-slot="dialog-scrim"
      aria-label="Сменить статус"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="motion-in h-fit">
        <DialogCard rhythm="medium">
          <Typography variant="panelTitle" tone="default" as="h2">
            <>{`Сменить статус у ${count} ${count === 1 ? "объекта" : "объектов"}`}</>
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Статус виден всем сотрудникам агентства. Раскрытые контакты
            и заметки при смене не теряются.
          </Typography>

          <div className="flex w-full flex-col gap-2">
            {STATUSES.map((status) => {
              const active = status.id === chosen
              return (
                <button
                  key={status.id}
                  type="button"
                  data-slot="status-option"
                  data-selected={active || undefined}
                  aria-pressed={active}
                  onClick={() => setChosen(status.id)}
                  className={cn(
                    "flex h-11 w-full cursor-pointer items-center rounded-lg px-3.5 transition-colors duration-120",
                    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                    active ? "bg-warm" : "bg-transparent hover:bg-warm active:bg-warm-hover",
                  )}
                >
                  <Typography
                    variant={active ? "controlLabel" : "uiText"}
                    tone={active ? "default" : "secondary"}
                  >
                    {status.label}
                  </Typography>
                </button>
              )
            })}
          </div>

          {/* Сноска из кадра. Она объясняет отсутствие пятой строки —
              и потому обязательна: без неё человек ищет стоп-лист в списке. */}
          <Typography variant="metaText" tone="dense">
            Стоп-лист руками не ставится: он приходит от собственника через
            serch.ru/stop и снимается только им.
          </Typography>

          <div className="flex w-full items-center gap-2.5">
            <div className="h-px flex-1" />
            <Button variant="quiet" size="md" onClick={onClose}>
              Отмена
            </Button>
            <Button size="md" onClick={() => onApply(chosen, label)}>
              <>{`Поставить «${label}»`}</>
            </Button>
          </div>
        </DialogCard>
      </div>
    </div>
  )
}

/**
 * СОСТОЯНИЕ · Назначить объект агенту (`jUJgJ`).
 *
 * Окно 520 × 204: заголовок, объяснение, ряд кнопок.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * НАЗВАННОЕ РАСХОЖДЕНИЕ С КАДРОМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **В кадре нет выбора агента.** Текст говорит «перейдёт в работу выбранному
 * агенту», но чем выбирать — не нарисовано: окно состоит из двух абзацев
 * и двух кнопок. Собрать его буквально значит собрать окно, которое ничего
 * не может: «Назначить» кому?
 *
 * Список людей взят из уже существующего языка, а не выдуман: ровно так
 * выбирают человека в окне передачи роли (`B3hBi`) — строка 56 с кружком
 * выбора слева. Это и есть правило продукта «новый экран собирается
 * из существующего», а не изобретение приёма.
 *
 * Спрошено у дизайн-чата. Появится кадр с выбором — заменим на него.
 */
function AssignAgentDialog({
  count,
  people,
  onAssign,
  onClose,
}: {
  count: number
  /** Кому можно назначить: сотрудники агентства. */
  people: { id: string; name: string; note: string }[]
  onAssign: (personId: string, name: string) => void
  onClose: () => void
}) {
  const [chosen, setChosen] = useState<string | null>(people[0]?.id ?? null)
  const name = people.find((person) => person.id === chosen)?.name ?? ""

  return (
    <div
      data-slot="dialog-scrim"
      aria-label="Назначить объект агенту"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="motion-in h-fit">
        <DialogCard rhythm="medium">
          <Typography variant="panelTitle" tone="default" as="h2">
            <>{count === 1 ? "Назначить объект агенту" : `Назначить ${count} объектов агенту`}</>
          </Typography>
          <Typography variant="uiText" tone="secondary">
            <>
              {`${count === 1 ? "Объект перейдёт" : "Объекты перейдут"} в работу выбранному агенту, и ${
                count === 1 ? "он появится" : "они появятся"
              } у него на экране «Сегодня». Статус объекта принадлежит агентству, а не человеку.`}
            </>
          </Typography>

          {people.length === 0 ? (
            <Typography variant="denseText" tone="dense">
              Назначать некому: в агентстве вы один. Пригласите сотрудника
              в разделе «Агентство → Сотрудники».
            </Typography>
          ) : (
            <div className="flex w-full flex-col">
              {people.map((person) => {
                const active = person.id === chosen
                return (
                  <button
                    key={person.id}
                    type="button"
                    data-slot="agent-option"
                    data-selected={active || undefined}
                    aria-pressed={active}
                    onClick={() => setChosen(person.id)}
                    className="flex h-14 w-full cursor-pointer items-center gap-3 rounded-lg bg-transparent px-3 transition-colors duration-120 outline-none hover:bg-warm active:bg-warm-hover focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                  >
                    {/* Кружок выбора 18 — тот же, что в окне передачи роли. */}
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
                        active ? "border-fg" : "border-border-control",
                      )}
                    >
                      {active ? <span className="size-2.5 rounded-full bg-fg" /> : null}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                      <Typography variant="controlLabel" tone="default">
                        {person.name}
                      </Typography>
                      <Typography variant="metaText" tone="dense">
                        {person.note}
                      </Typography>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex w-full items-center gap-2.5">
            <div className="h-px flex-1" />
            <Button variant="quiet" size="md" onClick={onClose}>
              Отмена
            </Button>
            <Button
              size="md"
              disabled={chosen === null}
              onClick={() => chosen !== null && onAssign(chosen, name)}
            >
              Назначить
            </Button>
          </div>
        </DialogCard>
      </div>
    </div>
  )
}

export { AssignAgentDialog, BulkStatusDialog }
export type { StatusId }
