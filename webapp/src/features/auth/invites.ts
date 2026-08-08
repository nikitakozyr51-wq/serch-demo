/**
 * Приглашения в агентство — в браузере, пока нет сервера.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЗАЧЕМ ЭТОТ ФАЙЛ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Путь «руководитель позвал агента» не начинался вовсе. Кнопка «Пригласить»
 * звала серверную функцию, та первым делом спрашивала базу — а демонстрация
 * собирается БЕЗ базы намеренно (`scripts/build-demo.mjs` затирает ключи), —
 * и человек читал красную плашку «Приглашение не создалось: База не настроена».
 * Ссылки не было и не могло быть.
 *
 * Здесь приглашение живёт тем же способом, что и всё остальное в
 * демонстрации: записью в браузере. Экран приглашения при этом не меняется
 * ни на пиксель — меняется только то, откуда берётся ключ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧТО ЭТО НЕ ЧИНИТ И ПОЧЕМУ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Ссылка работает только на том же компьютере.** Хранилище браузера чужому
 * устройству недоступно, и никакая хитрость это не обходит: агент, открывший
 * ссылку на своём телефоне, приглашения не найдёт. Это ограничение
 * демонстрации без сервера, и оно названо в `docs/DATA.md`, а не спрятано.
 *
 * Показать путь целиком это позволяет — открыть ссылку в другом окне того же
 * браузера, — а обещать больше было бы враньём.
 */

const KEY = "serch.invites"

/** Сколько живёт приглашение. Семь дней — ровно то, что обещает экран. */
const LIFETIME = 7 * 24 * 60 * 60 * 1000

export type Invite = {
  token: string
  /** Почта владельца агентства: она же ключ пространства, куда зовут. */
  agencyKey: string
  /** Название агентства — его увидит приглашённый до того, как войдёт. */
  agency: string
  /** Как руководитель записал приглашённого. */
  name: string
  /** Почта, на которую зовут. */
  email: string
  role: "owner" | "agent"
  /** Дневной лимит раскрытий. `null` — без лимита. */
  limit: number | null
  createdAt: number
  /** Когда приняли. `undefined` — ещё висит. */
  acceptedAt?: number
}

type Invites = Record<string, Invite>

function read(): Invites {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Invites) : {}
  } catch {
    return {}
  }
}

function save(all: Invites) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Приватный режим: приглашение живёт до закрытия вкладки.
  }
}

/**
 * Ключ приглашения.
 *
 * Не криптография и не притворяется ею: настоящий ключ выдаёт сервер, а
 * здесь он всего лишь должен быть непохож на соседний, чтобы ссылки не
 * путались. Случайности браузера для этого достаточно.
 */
function newToken(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("")
}

/** Завести приглашение. Возвращает готовую запись с ключом. */
export function createInvite(input: Omit<Invite, "token" | "createdAt" | "acceptedAt">): Invite {
  const invite: Invite = { ...input, token: newToken(), createdAt: Date.now() }
  const all = read()
  all[invite.token] = invite
  save(all)
  return invite
}

/** Почему приглашение не принять. `null` — принимается. */
export type InviteProblem = "not-found" | "expired" | "used"

/**
 * Найти приглашение по ключу из ссылки.
 *
 * Три отказа разведены намеренно: «не найдено», «истекло» и «уже принято» —
 * это три разных разговора с человеком, и одна общая ошибка на всех
 * оставила бы его гадать, что делать дальше.
 */
export function findInvite(token: string): { invite: Invite } | { problem: InviteProblem } {
  const invite = read()[token]
  if (invite === undefined) return { problem: "not-found" }
  if (invite.acceptedAt !== undefined) return { problem: "used" }
  if (Date.now() - invite.createdAt > LIFETIME) return { problem: "expired" }
  return { invite }
}

/** Отметить приглашение принятым: второй раз по той же ссылке не войти. */
export function markInviteAccepted(token: string) {
  const all = read()
  const invite = all[token]
  if (invite === undefined) return
  all[token] = { ...invite, acceptedAt: Date.now() }
  save(all)
}

/** Непринятые приглашения агентства — их показывает список сотрудников. */
export function pendingInvites(agencyKey: string): Invite[] {
  const key = agencyKey.trim().toLowerCase()
  return Object.values(read()).filter(
    (invite) =>
      invite.agencyKey === key
      && invite.acceptedAt === undefined
      && Date.now() - invite.createdAt <= LIFETIME,
  )
}
