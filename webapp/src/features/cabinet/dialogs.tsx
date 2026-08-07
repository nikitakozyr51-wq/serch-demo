import { DialogCard } from "@/components/DialogCard"
import { Typography } from "@/components/typography"

/** Строка карты клавиш: клавиша 52 × 24 и что она делает. */
function HotkeyRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex h-6 w-full items-center gap-3">
      <span className="flex h-6 w-13 shrink-0 items-center justify-center rounded-sm bg-warm">
        <Typography variant="metaStrong" tone="default">
          {keys}
        </Typography>
      </span>
      <Typography variant="denseText" tone="secondary">
        {action}
      </Typography>
    </div>
  )
}

function HotkeyGroup({ label, rows }: { label: string; rows: [string, string][] }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <div className="flex w-full flex-col gap-2">
        {rows.map(([keys, action]) => (
          <HotkeyRow key={action} keys={keys} action={action} />
        ))}
      </div>
    </div>
  )
}

/**
 * Горячие клавиши (`L0qKK`).
 *
 * **Карта открывается «?» и потому не имеет кнопки закрытия в файле.** Диалог
 * справочный: его читают и закрывают Escape, а не «Понятно». Кнопка «Понятно»
 * здесь была бы просьбой подтвердить, что человек всё запомнил.
 */
function HotkeysDialog() {
  return (
    <DialogCard wide rhythm="medium">
      <div className="flex w-full flex-col gap-2">
        <Typography variant="panelTitle" tone="default" as="h2">
          Горячие клавиши
        </Typography>
        <Typography variant="uiText" tone="secondary">
          Открывается клавишей «?» на любом экране кабинета.
        </Typography>
      </div>

      <div className="flex w-full items-start gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <HotkeyGroup
            label="Выдача"
            rows={[
              ["↑ ↓", "Ходить по строкам"],
              ["X", "Выделить строку"],
              ["⇧ ↑ ↓", "Выделить подряд"],
              ["B", "В подборку"],
              ["⇧ P", "Прозвон"],
              ["Esc", "Снять выделение"],
            ]}
          />
          <HotkeyGroup
            label="Везде"
            rows={[
              ["⌘ K", "Командная палитра"],
              ["?", "Эта карта"],
            ]}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <HotkeyGroup
            label="Прозвон"
            rows={[
              ["1", "В работе"],
              ["2", "Прозвонен"],
              ["3", "Отказ"],
              ["H", "Отложить"],
              ["N", "Заметка"],
              ["J K", "Вперёд и назад"],
              ["Esc", "Выйти в список"],
            ]}
          />
        </div>
      </div>
    </DialogCard>
  )
}

export { HotkeysDialog }
