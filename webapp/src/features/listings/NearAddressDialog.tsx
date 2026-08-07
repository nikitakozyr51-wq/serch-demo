import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { TextField } from "@/components/controls/TextField"
import { Typography } from "@/components/typography"
import { DialogCard } from "@/components/DialogCard"

/**
 * СОСТОЯНИЕ · Рядом с адресом (`t2YEw`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Окно 520 × 381. Десктопный близнец мобильного листа `Ef25J` — у каждого
 * листа в файле есть пара, и у этого её не было: единственное исключение
 * из полного набора, то есть недосмотр, а не решение.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО СУЖАЕТ, А ЧТО ПОКА НЕТ — СКАЗАНО ПРЯМО
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Адрес сужает по-настоящему**: выдача оставляет объекты, в адресе которых
 * встречается введённое. «Лиговский» оставит весь Лиговский проспект. Это
 * не приближение радиуса, а другой, честный вопрос — и на него база отвечать
 * умеет.
 *
 * **Радиус пока не сужает, и чипы поэтому выключены.** Расстояние по прямой
 * считается от координат, а координат у объектов в базе нет ни одной:
 * в таблице владельца их не было. Включённый чип, который ничего не меняет,
 * хуже выключенного: выключенный говорит правду, включённый её скрывает.
 *
 * Появятся координаты — чипы включатся здесь, и больше нигде ничего менять
 * не придётся.
 */

/** Ступени радиуса с кадра. */
const RADIUS = ["500 м", "1 км", "2 км"] as const

function NearAddressDialog({
  address,
  found,
  onApply,
  onClear,
  onClose,
}: {
  /** Что уже задано. Пусто — ограничения нет. */
  address: string
  /** Сколько объектов видно сейчас: число уходит на кнопку. */
  found: number
  onApply: (next: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(address)

  return (
    <div
      data-slot="dialog-scrim"
      aria-label="Рядом с адресом"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="motion-in h-fit">
        <DialogCard rhythm="medium">
          <Typography variant="panelTitle" tone="default" as="h2">
            Рядом с адресом
          </Typography>
          <Typography variant="uiText" tone="secondary">
            Объекты в радиусе от точки. Нужно, когда район не совпадает с тем,
            что ищет клиент: Лиговский проспект идёт по Центральному
            и Фрунзенскому сразу.
          </Typography>

          <div className="flex w-full flex-col gap-1.5">
            <Typography variant="columnHeader" tone="dense">
              АДРЕС ИЛИ ТОЧКА НА КАРТЕ
            </Typography>
            <TextField
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Адрес или точка на карте"
              placeholder="Лиговский пр., 44"
            />
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <Typography variant="columnHeader" tone="dense">
              РАДИУС
            </Typography>
            <div className="flex w-full items-center gap-2">
              {RADIUS.map((step) => (
                // Выключены, пока у объектов нет координат. Причина написана
                // строкой ниже, а не спрятана в подсказке: человек должен
                // понять её, не наводя мышь.
                <SelectChip key={step} label={step} selected={step === "1 км"} disabled />
              ))}
            </div>
            <Typography variant="metaText" tone="dense">
              Радиус включится, когда у объектов появятся координаты: расстояние
              по прямой считается от точки, а брать её пока неоткуда. Адрес
              сужает выдачу уже сейчас.
            </Typography>
          </div>

          <Typography variant="denseText" tone="dense">
            Район и станция при этом не сбрасываются: фильтры складываются.
          </Typography>

          <div className="flex w-full items-center gap-2.5">
            <div className="h-px flex-1" />
            <Button
              variant="quiet"
              size="md"
              onClick={() => {
                onClear()
                onClose()
              }}
            >
              Убрать ограничение
            </Button>
            <Button
              size="md"
              onClick={() => {
                onApply(draft.trim())
                onClose()
              }}
            >
              <>{`Показать ${found} ${found % 10 === 1 && found % 100 !== 11 ? "объект" : "объектов"}`}</>
            </Button>
          </div>
        </DialogCard>
      </div>
    </div>
  )
}

export { NearAddressDialog }
