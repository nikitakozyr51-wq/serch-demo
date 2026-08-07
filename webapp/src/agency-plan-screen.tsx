import { Typography } from "@/components/typography"
import { useSession } from "@/features/auth"
import { AgencyShell } from "@/features/agency"
import { plural } from "@/features/listings"
import { useWorkspace } from "@/features/workspace"

/**
 * АГЕНТСТВО · Тариф и подписка.
 *
 * Снято с `AcGYf`. Единственный экран раздела без строки заголовка и без
 * вкладок: он ничего не листает и никуда не ведёт, он отвечает на один вопрос —
 * сколько это стоит.
 *
 * **Три числа и всё.** 3 000 ₽ за агентство целиком, занятые места из двадцати,
 * 199 ₽ за контакт. Ни калькулятора, ни сравнения тарифов, ни «выберите план»:
 * тариф один, и выбирать нечего. Экран, на котором нечего выбирать, не должен
 * притворяться, что выбор есть.
 *
 * **Цены общие, места свои.** Обе суммы одинаковы у любого агентства и потому
 * записаны здесь; сколько мест занято, знает только состав этого агентства —
 * оттуда число и берётся. Раньше на его месте стояли «6 из 20», «Свободно
 * 14 мест» и «Следующее списание 1 августа»: образец текста из макета,
 * который показывался каждому вошедшему как его собственный счёт.
 *
 * **Даты списания на экране нет.** Платёжного сервиса за этим экраном пока
 * не стоит, значит «когда спишут» взять неоткуда. Прочерк отвечает на этот
 * вопрос честно, правдоподобная дата отвечает на него враньём.
 *
 * **Раскрытия списываются со счёта, а не с подписки** — это сказано сноской
 * под ценой, а не мелким шрифтом в договоре. Две разные суммы в месяц,
 * и путать их дорого.
 */

/**
 * Мест в тарифе.
 *
 * Названо один раз: то же число объясняет блок «Двадцать первый» внизу экрана,
 * и два разъехавшихся «двадцать» сделали бы экран противоречащим самому себе.
 */
const SEATS = 20

type PlanNumber = {
  label: string
  value: string
  what: string
  note: string
}

export function AgencyPlanPage() {
  const session = useSession()
  // Сколько мест занято — из состава агентства, а не из числа в макете:
  // нарисованное число разошлось бы с правдой после первого же приглашения.
  const { people } = useWorkspace()

  // Руководитель занимает место, даже если состав ещё не записан: он и есть
  // тот, кто сейчас смотрит на этот экран. Ноль занятых мест при живом сеансе
  // означал бы агентство без единого человека — это не пустота, а поломка
  // записи, и показывать её как факт нельзя.
  const taken = session === null ? people.length : Math.max(people.length, 1)
  const free = Math.max(SEATS - taken, 0)

  const numbers: PlanNumber[] = [
    {
      label: "ПОДПИСКА",
      value: "3 000 ₽",
      what: "в месяц за агентство целиком",
      // Дату следующего списания знает платёжный сервис, а его нет.
      note: "—",
    },
    {
      label: "МЕСТА",
      value: `${taken} из ${SEATS}`,
      what: "сотрудников подключено",
      note:
        free === 0
          ? "Свободных мест нет"
          : `Свободно ${free} ${plural(free, "место", "места", "мест")}`,
    },
    {
      label: "РАСКРЫТИЯ",
      value: "199 ₽",
      what: "за контакт собственника",
      note: "Списывается со счёта, не с подписки",
    },
  ]

  return (
    <AgencyShell
      activeTab="none"
      title="Тариф и подписка"
      note={
        // Имя агентства — из сеанса. Кабинет закрыт охраной, и без сеанса сюда
        // не попасть; на всякий случай подпись тогда просто короче, а не
        // называет чужое агентство вместо вашего.
        session === null
          ? "Подписку видит и меняет только руководитель."
          : `Агентство «${session.agency}». Подписку видит и меняет только руководитель.`
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
