import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { TextField } from "@/components/controls/TextField"
import { Typography } from "@/components/typography"
import { AgencyShell, NoticeBar } from "@/features/agency"
import { inviteAgent } from "@/features/auth"
import { plural } from "@/features/listings"
import { useWorkspace } from "@/features/workspace"
import { notifyDone, notifyError } from "@/platform/notify"

/**
 * КАБИНЕТ · Пригласить агента (`B8Irc`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Экран 1440 × 1024, тело 1200 с полем 24. Две колонки: слева форма 740,
 * справа сводка 380 — что именно получит приглашённый.
 *
 * **Сводка не украшение и не повтор формы.** Руководитель приглашает человека
 * к общему счёту: каждое раскрытие агента спишет деньги агентства. Сводка
 * отвечает на единственный вопрос, который здесь важен, — «что он сможет
 * и на сколько», — и отвечает до нажатия, а не после.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * **Письмо не уходит.** Приглашение записывается в базу и получает ключ,
 * но отправить его некому: почтовой службы у продукта нет. Поэтому вместо
 * обещания «письмо ушло» экран показывает ссылку и говорит прямо, что её
 * нужно передать самому. Обещать отправленное письмо, которого не было, —
 * худшее, что можно сделать: человек будет ждать.
 *
 * **Строка в списке сотрудников не появляется.** Приглашённый ещё не
 * сотрудник — он может не принять. Агентство, у которого «пять человек»,
 * из которых двое никогда не входили, врёт своему же руководителю.
 */

/** Ступени дневного лимита. Числа с кадра: 5 по умолчанию, 25, «Другой». */
const LIMITS = [5, 25] as const

export function AgencyInvitePage() {
  const workspace = useWorkspace()
  const navigate = useNavigate()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"agent" | "owner">("agent")
  const [limit, setLimit] = useState<number | null>(5)
  /** Ключ созданного приглашения. Появляется после отправки. */
  const [token, setToken] = useState<string | null>(null)

  const ready = name.trim() !== "" && email.trim().includes("@")

  const invite = () => {
    if (!ready) return
    void inviteAgent(email.trim().toLowerCase(), name.trim(), role === "owner" ? null : limit).then(
      (result) => {
        if ("failed" in result) {
          notifyError(
            result.failed.includes("уже работает")
              ? "Этот человек уже работает в агентстве"
              : `Приглашение не создалось: ${result.failed}`,
          )
          return
        }
        notifyDone("Приглашение создано")
        setToken(result.token)
      },
    )
  }

  /**
   * Ссылка, которую руководитель передаёт сам.
   *
   * Собирается из адреса текущей страницы, а не из записанной константы:
   * кабинет живёт и на своём домене, и на демонстрационном, и вписанный
   * домен отправил бы половину приглашённых не туда.
   */
  const link = token === null ? "" : `${window.location.origin}/app/invite?token=${token}`

  const pending = workspace.people.length

  return (
    <AgencyShell activeTab="staff" title="Пригласить агента" note="ссылка живёт семь дней, лимит и роль меняются позже">
      {/* Возврат к списку сотрудников. Строка 36 со стрелкой 16 — так в кадре:
          приглашение открывают изнутри раздела и возвращаются туда же. */}
      <div className="flex h-9 w-full shrink-0 items-center gap-3">
        <Link
          to="/agency/staff"
          className="flex cursor-pointer items-center gap-3 outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <ArrowLeft aria-hidden className="size-4 shrink-0 text-fg" strokeWidth={2} />
          <Typography variant="denseText" tone="secondary">
            Сотрудники
          </Typography>
        </Link>
        <div className="h-px flex-1" />
        <Typography variant="denseText" tone="dense">
          <>{`Сейчас в агентстве ${pending} ${plural(pending, "человек", "человека", "человек")}`}</>
        </Typography>
      </div>

      <NoticeBar
        rule="Агент видит остаток и только свои списания"
        note="расходы коллег, журнал доступа и отчёты остаются у руководителя"
      />

      <div className="flex w-full shrink-0 items-start gap-8">
        <div className="flex w-185 shrink-0 flex-col gap-8">
          <div className="flex w-full flex-col gap-3">
            <Typography variant="columnHeader" tone="dense">
              КТО
            </Typography>
            <div className="flex w-full gap-4">
              {[
                {
                  label: "ФАМИЛИЯ И ИМЯ",
                  value: name,
                  set: setName,
                  hint: "так его увидят коллеги в журнале",
                },
                {
                  label: "РАБОЧАЯ ПОЧТА",
                  value: email,
                  set: setEmail,
                  hint: "на неё придёт приглашение",
                },
              ].map((field) => (
                <div key={field.label} className="flex min-w-0 flex-1 flex-col gap-1.5">
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
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <Typography variant="columnHeader" tone="dense">
              РОЛЬ
            </Typography>
            <div className="flex w-full gap-2">
              <SelectChip label="Агент" selected={role === "agent"} onClick={() => setRole("agent")} />
              <SelectChip
                label="Руководитель"
                selected={role === "owner"}
                onClick={() => setRole("owner")}
              />
            </div>
            <Typography variant="metaText" tone="dense">
              Ролей ровно две. Руководитель раскрывает без лимита и видит
              отчёты, журнал доступа и отказы.
            </Typography>
          </div>

          {/* Лимит у руководителя не спрашивается: он раскрывает без лимита,
              и поле, которое ни на что не влияет, — обещание настройки. */}
          {role === "owner" ? null : (
            <div className="flex w-full flex-col gap-3">
              <Typography variant="columnHeader" tone="dense">
                ДНЕВНОЙ ЛИМИТ РАСКРЫТИЙ
              </Typography>
              <div className="flex w-full items-center gap-2">
                {LIMITS.map((step) => (
                  <SelectChip
                    key={step}
                    label={String(step)}
                    selected={limit === step}
                    onClick={() => setLimit(step)}
                  />
                ))}
                <SelectChip
                  label="Без лимита"
                  selected={limit === null}
                  onClick={() => setLimit(null)}
                />
              </div>
              <Typography variant="metaText" tone="dense">
                Новому агенту по умолчанию пять. Пять раскрытий это 995 ₽ в день
                с общего счёта агентства.
              </Typography>
            </div>
          )}
        </div>

        {/* Сводка 380: что получит приглашённый. Тёплая плашка с радиусом 16. */}
        <div className="flex w-95 shrink-0 flex-col gap-5 rounded-2xl bg-warm p-5">
          <Typography variant="columnHeader" tone="dense">
            ПРИГЛАШЕНИЕ
          </Typography>
          <Typography variant="cardPrice" tone="default">
            Что получит агент
          </Typography>

          <div className="flex w-full flex-col gap-3">
            {[
              ["Видит", "выдачу и карточки"],
              ["Раскрывает", role === "owner" || limit === null ? "без лимита" : `до ${limit} в день`],
              ["Платит", "общий счёт агентства"],
              ["Не видит", role === "owner" ? "всё видит" : "отчёты и журнал"],
            ].map(([label, value]) => (
              <div key={label} className="flex w-full items-center gap-3">
                <Typography variant="denseText" tone="dense">
                  <>{label}</>
                </Typography>
                <div className="h-px flex-1" />
                <Typography variant="numericDense" tone="default">
                  <>{value}</>
                </Typography>
              </div>
            ))}
          </div>

          <span aria-hidden className="h-px w-full bg-line-2" />

          <Button size="lg" block disabled={!ready} onClick={invite}>
            Отправить приглашение
          </Button>

          {/*
            Честная сноска вместо обещания письма.

            Почтовой службы у продукта нет: приглашение записывается в базу
            и получает ключ, а передать ссылку человек должен сам. Написать
            «письмо ушло» значило бы заставить его ждать письма, которого
            не будет.
          */}
          {token === null ? (
            <Typography variant="metaText" tone="dense">
              Ссылка действует семь дней. Пока агент не принял приглашение,
              он не считается активным и мест не занимает.
            </Typography>
          ) : (
            /*
              Ссылка показывается ЗДЕСЬ и целиком.

              Прежде на этом месте стояло «она в разделе „Сотрудники“» —
              и там её не было. Приглашение записывалось в базу, ключ
              оставался внутри, а руководитель уходил с экрана ни с чем.
              Путь «позвать человека» обрывался на последнем шаге.

              Ссылка выделяется целиком по нажатию: копировать её из строки
              мышью по буквам — это способ передать половину.
            */
            <div className="flex w-full flex-col gap-2">
              <Typography variant="metaText" tone="dense">
                Письма продукт пока не отправляет. Передайте ссылку сотруднику
                сами — любым способом, каким вы с ним уже переписываетесь.
              </Typography>
              <div
                data-action="выделить ссылку приглашения"
                onClick={(event) => {
                  const node = event.currentTarget
                  const range = document.createRange()
                  range.selectNodeContents(node)
                  const selection = window.getSelection()
                  selection?.removeAllRanges()
                  selection?.addRange(range)
                }}
                className="w-full cursor-pointer rounded-lg border border-line-2 bg-surface px-3 py-2 break-all"
              >
                <Typography variant="metaText" tone="default">
                  <>{link}</>
                </Typography>
              </div>
              <Button
                variant="quiet"
                size="md"
                block
                onClick={() => {
                  void navigator.clipboard
                    .writeText(link)
                    .then(() => notifyDone("Ссылка скопирована"))
                    // Буфер обмена закрыт в небезопасном соединении и в части
                    // браузеров. Молчаливый отказ здесь хуже всего: человек
                    // уверен, что скопировал, и вставляет прошлое.
                    .catch(() => notifyError("Скопировать не вышло — выделите ссылку и скопируйте вручную"))
                }}
              >
                Скопировать ссылку
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3">
        <Typography variant="columnHeader" tone="dense">
          КАК РАБОТАЕТ ПРИГЛАШЕНИЕ
        </Typography>
        <div className="flex w-full items-start">
          {[
            [
              "Ссылка живёт семь дней",
              "Если агент не принял приглашение за неделю, отправьте его заново. Старая ссылка перестанет работать.",
            ],
            [
              "Место занимается по факту",
              "Пока приглашение не принято, агент не считается активным и в двадцать мест не входит.",
            ],
            [
              "Отключение обратимо не всё",
              "Сеансы завершатся сразу, раскрытые контакты и история звонков останутся у агентства.",
            ],
          ].map(([title, text], index) => (
            <>
              {index === 0 ? null : (
                <span key={`d${index}`} aria-hidden className="mx-6 h-13 w-px shrink-0 bg-line-1" />
              )}
              <div key={title} className="flex min-w-0 flex-1 flex-col gap-1">
                <Typography variant="numericDense" tone="default">
                  <>{title}</>
                </Typography>
                <Typography variant="metaText" tone="dense">
                  <>{text}</>
                </Typography>
              </div>
            </>
          ))}
        </div>
      </div>

      {token === null ? null : (
        <div className="flex w-full shrink-0">
          <Button variant="quiet" size="md" onClick={() => void navigate({ to: "/agency/staff" })}>
            К списку сотрудников
          </Button>
        </div>
      )}
    </AgencyShell>
  )
}
