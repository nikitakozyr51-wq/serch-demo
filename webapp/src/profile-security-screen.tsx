import { useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Button } from "@/components/controls/Button"
import { Typography } from "@/components/typography"
import { useSession, useSessionActions } from "@/features/auth"
import { CabinetPage, CabinetShell } from "@/features/cabinet"

/**
 * ПРОФИЛЬ · Политика входа (`v9Z5fD`).
 *
 * **Экран не настраивает безопасность, а показывает её.** Ни одного
 * переключателя: длина пароля, число попыток, срок кода и срок ссылки —
 * решения продукта, одинаковые для всех агентств. Человеку нужно знать
 * правила, а не менять их, и притворяться, что он ими управляет, нечестно.
 *
 * Настоящих действий здесь три, и все три необратимы: сменить пароль,
 * завершить чужой сеанс, завершить все чужие сеансы. Поэтому они стоят
 * отдельно от строк-фактов, а не рядом с ними.
 *
 * **Свой сеанс завершить нельзя, и место кнопки всё равно занято.** В файле
 * это пустой блок 104 × 32 (`xe1CM`): строки обязаны стоять колонкой, а
 * кнопка «Завершить» на своём же устройстве означала бы «выйти», для чего
 * есть отдельное действие в заголовке.
 */

/** Строка-факт: что и какое значение. Высота 48, волосяная линия снизу. */
function FactRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex h-12 w-full items-center gap-3 border-b border-line-1">
      <Typography variant="uiText" tone="secondary">
        {title}
      </Typography>
      <span className="h-px flex-1" />
      <Typography variant="strongText" tone="default">
        {value}
      </Typography>
    </div>
  )
}

/** Раздел колонки: подпись капслоком и строки под ней. */
function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-4">
      <Typography variant="columnHeader" tone="dense">
        {label}
      </Typography>
      <div className="flex w-full flex-col">{children}</div>
    </section>
  )
}

type Session = {
  device: string
  place: string
  when: string
  /** Текущее устройство: помечено зелёным и не закрывается. */
  current?: boolean
}

const SESSIONS: Session[] = [
  {
    device: "Chrome, Windows",
    place: "Санкт-Петербург · 92.53.114.20",
    when: "сейчас",
    current: true,
  },
  { device: "Safari, iPhone", place: "Санкт-Петербург · 92.53.114.20", when: "24.07, 09:12" },
  { device: "Chrome, Windows", place: "Санкт-Петербург · 178.140.9.71", when: "22.07, 18:40" },
]

/** Сеанс: устройство, место, когда и кнопка закрытия — либо её пустое место. */
function SessionRow({ session }: { session: Session }) {
  return (
    <div className="flex h-16 w-full items-center gap-3 border-b border-line-1">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Typography variant="strongText" tone="default">
            {session.device}
          </Typography>
          {session.current ? (
            <span className="flex h-5 items-center rounded-sm bg-ok-tint px-2">
              <Typography variant="signalLabel" tone="ok">
                это устройство
              </Typography>
            </span>
          ) : null}
        </div>
        <Typography variant="metaText" tone="dense">
          {session.place}
        </Typography>
      </div>
      <Typography variant="denseText" tone="dense">
        {session.when}
      </Typography>
      {session.current ? (
        <span aria-hidden className="h-8 w-26 shrink-0" />
      ) : (
        <Button
          variant="secondary"
          size="sm"
          data-action={`завершить сеанс: ${session.device}`}
        >
          Завершить
        </Button>
      )}
    </div>
  )
}

export function LoginPolicyPage() {
  const navigate = useNavigate()
  const session = useSession()
  const actions = useSessionActions()

  /**
   * Выход настоящий: сеанс стирается, и кабинет закрывается.
   *
   * Ведёт на вход, а не на главную сайта: человек, который только что вышел,
   * чаще всего собирается войти под другим — иначе он просто закрыл бы вкладку.
   */
  const leave = () => {
    actions.signOut()
    void navigate({ to: "/login", search: { returnTo: undefined } })
  }

  return (
    <CabinetShell activeId="">
      <CabinetPage>
        <div className="flex h-7 w-full shrink-0 items-center gap-3">
          <Typography variant="panelTitle" tone="default" as="h1">
            Политика входа
          </Typography>
          <Typography variant="denseText" tone="dense">
            {`${session?.name ?? "Смирнова Ирина"} · руководитель агентства «${session?.agency ?? "Невский проспект"}»`}
          </Typography>
          <span className="h-px flex-1" />
          <Button variant="quiet" size="sm" onClick={leave}>
            Выйти из аккаунта
          </Button>
        </div>

        <div className="flex w-full items-start gap-6">
          <div className="flex w-141 shrink-0 flex-col gap-6">
            <Block label="Пароль">
              <FactRow title="Последняя смена" value="14.06.2026" />
              <FactRow title="Длина пароля" value="не короче 10 знаков" />
              <FactRow title="Попыток входа подряд" value="5, потом пауза 15 минут" />
            </Block>

            <div className="flex">
              {/* Экран смены пароля нарисован только на телефоне (`q2rO9f`).
                  Вести десктоп на мобильный адрес значило бы показать чужую
                  раскладку, поэтому действие названо и ничего не рисует. */}
              <Button variant="quiet" size="md" data-action="сменить пароль">
                Сменить пароль
              </Button>
            </div>

            <Block label="Подтверждение входа">
              <FactRow title="Код на почту" value="4 цифры, живёт 10 минут" />
              <FactRow title="Повторная отправка" value="через 60 секунд" />
              <FactRow title="Ссылка восстановления пароля" value="1 час" />
            </Block>
          </div>

          <div className="flex w-141 shrink-0 flex-col gap-4">
            <Typography variant="columnHeader" tone="dense">
              Активные сеансы
            </Typography>
            <div className="flex w-full flex-col">
              {SESSIONS.map((session) => (
                <SessionRow key={`${session.device} ${session.place} ${session.when}`} session={session} />
              ))}
            </div>
            {/*
              Пояснение стоит между списком и кнопкой, а не под кнопкой:
              «раскрытые контакты и история касаний остаются агентству» —
              это ответ на страх, из-за которого человек не жмёт «Завершить».
              Ответ обязан стоять до кнопки, иначе он опоздал.
            */}
            <Typography variant="metaText" tone="dense">
              Завершение сеанса выкидывает устройство сразу. Раскрытые контакты и история
              касаний остаются агентству: они не привязаны к устройству.
            </Typography>
            <div className="flex">
              <Button
                variant="secondary"
                size="md"
                data-action="завершить все сеансы, кроме текущего"
              >
                Завершить все сеансы, кроме этого
              </Button>
            </div>
          </div>
        </div>
      </CabinetPage>
    </CabinetShell>
  )
}
