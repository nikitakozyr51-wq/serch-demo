import { Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { Typography } from "@/components/typography"
import { useSession, useSessionActions } from "@/features/auth"
import { cn } from "@/lib/utils"

/**
 * Меню аватара — компонент `C Меню аватара` (`eoCoZ`), состояние в контексте
 * `СОСТОЯНИЕ · Меню аватара` (`iE9b7`).
 *
 * **ЭТО ОТМЕНА ОБХОДНОГО РЕШЕНИЯ.** Раньше аватар вёл прямо на «Политику
 * входа»: меню в файле нарисовано не было, а придумывать его я не имел права,
 * и выбор был между «аватар никуда не ведёт» и «аватар ведёт хоть куда-то».
 * Теперь меню нарисовано, и обходное решение снимается (передача 05.08.2026,
 * раздел 4).
 *
 * Геометрия из файла: ширина 260, заливка `surface`, радиус `r-media` 16,
 * рамка `line-2`, **тени нет**. Правый край совпадает с правым краем аватара,
 * отступ 8 от низа шапки.
 *
 * Строки: высота 40, форма капсулы, **заливки в покое нет**, при наведении
 * `warm`. «Выйти из аккаунта» набран `err-text` — это единственное действие
 * меню, после которого человек теряет доступ к экрану, на котором стоит.
 *
 * Шапка меню — имя и почта — НЕ НАЖИМАЕТСЯ. Это подпись, отвечающая на вопрос
 * «под кем я вошёл», а не пункт: строка, которая выглядит как остальные, но
 * ничего не делает, — самый частый способ соврать в меню.
 */

/** Пункт меню: капсула 40 без заливки в покое. */
function MenuRow({
  children,
  to,
  onClick,
  danger = false,
}: {
  children: string
  to?: "/profile" | "/profile/login-policy"
  onClick?: () => void
  danger?: boolean
}) {
  const className = cn(
    "flex h-10 w-full cursor-pointer items-center rounded-full bg-transparent px-3 text-left",
    "transition-colors hover:bg-warm active:bg-warm-press",
    "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-fg",
    danger ? "text-err-text" : "text-fg",
  )

  const label = (
    <Typography variant="controlLabel" tone="current">
      {children}
    </Typography>
  )

  if (to !== undefined) {
    return (
      <Link to={to} role="menuitem" className={className} onClick={onClick}>
        <>{label}</>
      </Link>
    )
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={onClick}>
      <>{label}</>
    </button>
  )
}

function AvatarMenu({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false)
  const session = useSession()
  const { signOut } = useSessionActions()
  const navigate = useNavigate()
  const root = useRef<HTMLDivElement>(null)

  /**
   * Закрытие по `Escape` и по нажатию мимо.
   *
   * Слушается `pointerdown`, а не `click`: закрытие обязано происходить в тот
   * же момент, что и остальной отклик интерфейса. На `click` меню закрывалось
   * бы после отпускания кнопки — то есть заметно позже, чем человек решил.
   */
  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.stopPropagation()
      setOpen(false)
    }
    const onDown = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target)) return
      setOpen(false)
    }

    document.addEventListener("keydown", onKey, true)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [open])

  return (
    <div ref={root} className="relative flex items-center">
      <button
        type="button"
        data-slot="user-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Меню профиля"
        onClick={() => setOpen((was) => !was)}
        // Аватар залит графитом, поэтому отклик идёт по той же лестнице,
        // что у главной кнопки: `fg → fg-hover → fg-press`. Прежде он молчал,
        // а это единственная дверь в профиль и выход из аккаунта.
        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-fg transition-colors duration-120 outline-none hover:bg-fg-hover active:bg-fg-press focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        <Typography variant="metaStrong" tone="inverse">
          {initials}
        </Typography>
      </button>

      {open ? (
        <div
          data-slot="avatar-menu"
          role="menu"
          aria-label="Профиль"
          className="absolute top-full right-0 z-50 mt-2 flex w-65 flex-col rounded-2xl border border-line-2 bg-surface p-2"
        >
          {/* Подпись, а не пункт: не нажимается и не подсвечивается.

              Имя и почта — только из сеанса. Здесь стояли запасные значения
              из макета, и это было худшее место для них: меню профиля человек
              открывает, чтобы убедиться, под кем он вошёл. Чужое имя ровно
              в этом месте отвечает на вопрос неправильно.

              Запасного значения не осталось вовсе: меню живёт в шапке
              кабинета, а кабинет закрыт охраной — без сеанса сюда не попасть,
              и подставлять нечего. */}
          <div className="flex flex-col gap-0.5 px-3 py-2">
            <Typography variant="controlLabel" tone="default">
              <>{session?.name ?? ""}</>
            </Typography>
            <Typography variant="metaText" tone="dense">
              <>{session?.email ?? ""}</>
            </Typography>
          </div>

          <span aria-hidden className="my-1 h-px w-full bg-line-2" />

          <MenuRow to="/profile" onClick={() => setOpen(false)}>
            Профиль и настройки
          </MenuRow>
          <MenuRow to="/profile/login-policy" onClick={() => setOpen(false)}>
            Политика входа
          </MenuRow>

          <span aria-hidden className="my-1 h-px w-full bg-line-2" />

          <MenuRow
            danger
            onClick={() => {
              setOpen(false)
              signOut()
              void navigate({ to: "/login", search: { returnTo: undefined } })
            }}
          >
            Выйти из аккаунта
          </MenuRow>
        </div>
      ) : null}
    </div>
  )
}

export { AvatarMenu }
