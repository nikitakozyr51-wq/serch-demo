import { Typography } from "@/components/typography"
import { useOwnAgency, useSession } from "@/features/auth"
import { AgencyShell } from "@/features/agency"

/**
 * АГЕНТСТВО · Тариф и подписка.
 *
 * Снято с `AcGYf`. Единственный экран раздела без строки заголовка и без
 * вкладок: он ничего не листает и никуда не ведёт, он отвечает на один вопрос —
 * сколько это стоит.
 *
 * **Три числа и всё.** 3 000 ₽ за агентство целиком, 6 из 20 мест, 199 ₽
 * за контакт. Ни калькулятора, ни сравнения тарифов, ни «выберите план»:
 * тариф один, и выбирать нечего. Экран, на котором нечего выбирать, не должен
 * притворяться, что выбор есть.
 *
 * **Раскрытия списываются со счёта, а не с подписки** — это сказано сноской
 * под ценой, а не мелким шрифтом в договоре. Две разные суммы в месяц,
 * и путать их дорого.
 */

type PlanNumber = {
  label: string
  value: string
  what: string
  note: string
}

const NUMBERS: PlanNumber[] = [
  {
    label: "ПОДПИСКА",
    value: "3 000 ₽",
    what: "в месяц за агентство целиком",
    note: "Следующее списание 1 августа",
  },
  {
    label: "МЕСТА",
    value: "6 из 20",
    what: "сотрудников подключено",
    note: "Свободно 14 мест",
  },
  {
    label: "РАСКРЫТИЯ",
    value: "199 ₽",
    what: "за контакт собственника",
    note: "Списывается со счёта, не с подписки",
  },
]

export function AgencyPlanPage() {
  const session = useSession()
  // Через `useOwnAgency`, а не по полю сеанса: только эта функция знает про
  // стенд сверки, который обязан показывать замеренные данные независимо от
  // того, кто вошёл. Прямая проверка поля оставляла стенд пустым.
  const own = useOwnAgency()

  // Своё агентство только что заведено: подписка ещё не оплачена, а мест
  // занято ровно одно — руководителем. Числа «6 из 20» и «следующее списание
  // 1 августа» здесь были бы чужим счётом.
  const numbers: PlanNumber[] = own
    ? [
        {
          label: "ПОДПИСКА",
          value: "3 000 ₽",
          what: "в месяц за агентство целиком",
          note: "Пробный период: первые пять раскрытий бесплатно",
        },
        {
          label: "МЕСТА",
          value: "1 из 20",
          what: "сотрудников подключено",
          note: "Свободно 19 мест",
        },
        {
          label: "РАСКРЫТИЯ",
          value: "199 ₽",
          what: "за контакт собственника",
          note: "Списывается со счёта, не с подписки",
        },
      ]
    : NUMBERS

  return (
    <AgencyShell
      activeTab="none"
      title="Тариф и подписка"
      note={
        own
          ? `Агентство «${session?.agency ?? ""}». Подписку видит и меняет только руководитель.`
          : "ООО «Невский проспект». Подписку видит и меняет только руководитель."
      }
    >
      {/* Три колонки по 352 с волосяными разделителями в промежутках. */}
      <div className="relative flex w-full gap-6">
        {numbers.map((item) => (
          <div key={item.label} className="flex w-88 shrink-0 flex-col gap-4">
            <Typography variant="columnHeader" tone="dense">
              {item.label}
            </Typography>
            <div className="flex flex-col gap-1">
              <Typography variant="display" tone="default">
                {item.value}
              </Typography>
              <Typography variant="denseText" tone="secondary">
                {item.what}
              </Typography>
            </div>
            <Typography variant="denseText" tone="secondary">
              {item.note}
            </Typography>
          </div>
        ))}
        <span aria-hidden className="absolute top-0 left-[364px] h-30.5 w-px bg-line-1" />
        <span aria-hidden className="absolute top-0 left-[740px] h-30.5 w-px bg-line-1" />
      </div>

      {/*
        Двадцать первый сотрудник — честный ответ на вопрос, который задают
        раньше или позже. Отделён волосяной линией: это не часть тарифа,
        а его граница.
      */}
      <div className="flex w-full flex-col gap-4 border-t border-hairline pt-6">
        <Typography variant="columnHeader" tone="dense">
          ДВАДЦАТЬ ПЕРВЫЙ
        </Typography>
        <Typography variant="denseText" tone="secondary">
          Мест в тарифе двадцать. Двадцать первый сотрудник не добавляется молча
          и не блокирует остальных: приглашение просто не отправится, пока место
          не освободится или тариф не изменится.
        </Typography>
      </div>
    </AgencyShell>
  )
}
