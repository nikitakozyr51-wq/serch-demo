import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { TextField } from "@/components/controls/TextField"
import { Typography } from "@/components/typography"
import { plural } from "@/features/listings"
import { cn } from "@/lib/utils"
import { addToCollection, createCollection, useWorkspace } from "./store"

/**
 * «В какую подборку?» — окно выбора после клавиши `B` или кнопки в строке.
 *
 * **Почему окно, а не мгновенное добавление.** Подборка адресована конкретному
 * клиенту: «Расселение, Лиговка» и «Семье с детьми» — разные списки, и объект,
 * попавший не туда, всплывёт на встрече. Молчаливое добавление «в последнюю»
 * экономит одно нажатие и стоит доверия к экрану, который клиент увидит.
 *
 * **Первая подборка создаётся прямо здесь.** Раньше её нельзя было завести
 * вовсе: кнопка «Новая подборка» на экране подборок не имела обработчика, а у
 * нового агентства список пуст — то есть путь замыкался в тупик. Поэтому поле
 * имени стоит в этом же окне, а не отсылает на другой экран.
 *
 * Форма собрана из уже существующего языка кабинета: сцена с затемнением
 * `#1e1e1e59`, панель `surface` радиусом 16, поле 24 — та же, что у остальных
 * диалогов продукта.
 */
function CollectionPicker({
  address,
  by,
  onClose,
  leaving = false,
}: {
  /**
   * Что кладут: один адрес или несколько.
   *
   * Массив появился вместе с выделением строк (кадр `SUsxy`): панель
   * выбранного кладёт двенадцать объектов разом. Отдельного окна для этого
   * заводить нельзя — оно разошлось бы с одиночным на первой же правке
   * списка подборок, — поэтому окно одно и умеет оба случая.
   */
  address: string | readonly string[]
  /** Кто собирает подборку. Приходит свойством, а не из сеанса: пространство
   *  агентства не должно знать про вход — иначе два модуля начинают зависеть
   *  друг от друга по кругу. */
  by: string
  onClose: () => void
  /** Окно уходит: 120 мс после закрытия. Решение о жизни узла — у выдачи. */
  leaving?: boolean
}) {
  const workspace = useWorkspace()
  const [name, setName] = useState("")

  const addresses = typeof address === "string" ? [address] : address

  const put = (id: string) => {
    for (const item of addresses) addToCollection(id, item)
    onClose()
  }

  const create = () => {
    const clean = name.trim()
    if (!clean) return
    const collection = createCollection(clean, by)
    for (const item of addresses) addToCollection(collection.id, item)
    onClose()
  }

  return (
    <div
      data-slot="collection-picker"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]",
        leaving ? "scrim-out" : "scrim-in",
      )}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-label="Добавить в подборку"
        className={cn(
          "flex w-130 flex-col gap-4 rounded-2xl bg-surface p-6",
          leaving ? "motion-out" : "motion-in",
        )}
      >
        <div className="flex flex-col gap-1">
          <Typography variant="panelTitle" tone="default" as="h2">
            В какую подборку
          </Typography>
          {/* Один объект называется адресом, дюжина — числом: двенадцать
              адресов в подзаголовке окна не читаются вовсе. */}
          <Typography variant="metaText" tone="dense">
            {addresses.length === 1
              ? addresses[0]
              : `${addresses.length} ${plural(addresses.length, "объект", "объекта", "объектов")}`}
          </Typography>
        </div>

        {workspace.collections.length === 0 ? (
          <Typography variant="uiText" tone="secondary">
            Подборок пока нет. Назовите первую — по клиенту, для которого
            собираете: так её потом легко найти среди десятка.
          </Typography>
        ) : (
          <div className="flex max-h-64 flex-col overflow-y-auto">
            {workspace.collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => put(collection.id)}
                className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-full bg-transparent px-3 text-left transition-colors hover:bg-warm active:bg-warm-press outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-fg"
              >
                <div className="min-w-0 flex-1">
                  <Typography variant="controlLabel" tone="default">
                    {collection.name}
                  </Typography>
                </div>
                <Typography variant="metaText" tone="dense">
                  {addresses.every((item) => collection.items.includes(item))
                    ? "уже здесь"
                    : `${collection.items.length}`}
                </Typography>
              </button>
            ))}
          </div>
        )}

        <TextField
          label="НОВАЯ ПОДБОРКА"
          value={name}
          placeholder="Например: Расселение, Лиговка"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") create()
          }}
        />

        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={create} disabled={name.trim() === ""}>
            Создать и добавить
          </Button>
          <Button variant="quiet" size="md" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  )
}

export { CollectionPicker }
