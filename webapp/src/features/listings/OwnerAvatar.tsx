import { Typography } from "@/components/typography"
import { cn } from "@/lib/utils"

/**
 * Кружок коллеги, который взял объект.
 *
 * Геометрия снята с компонента `dFVKR` C Аватар коллеги: 24 × 24, заливка
 * `warm`, капсула, инициалы 11/16 весом 600 без разрядки.
 *
 * Круг диаметром 24 — не «пилюля»: у него нет прямой грани, которую можно
 * было бы сделать короче, поэтому запрет на капсулу к нему не относится.
 *
 * Это один из двух ортогональных каналов строки: владелец читается
 * **позиционно**, периферийным зрением, и потому стоит всегда на одном месте.
 * Пусто — значит никто не брал. Именно поэтому у строк без владельца кружок
 * становится прозрачным, а не исчезает: иначе соседний чип уезжает.
 */
type OwnerAvatarProps = {
  /** Инициалы по правилу «имя, фамилия»: ИС, МЛ, АТ, ПГ, ДК. Пусто — никто не брал. */
  initials?: string
}

function OwnerAvatar({ initials }: OwnerAvatarProps) {
  const taken = Boolean(initials)

  return (
    <span
      data-slot="owner-avatar"
      data-taken={taken || undefined}
      aria-hidden={!taken}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
        taken ? "bg-warm" : "bg-transparent",
      )}
    >
      {taken ? (
        <Typography variant="avatarInitials" tone="dense">
          {initials}
        </Typography>
      ) : null}
    </span>
  )
}

export { OwnerAvatar }
export type { OwnerAvatarProps }
