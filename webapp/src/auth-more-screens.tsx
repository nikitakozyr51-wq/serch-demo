import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { Checkbox } from "@/components/controls/Checkbox"
import { Typography } from "@/components/typography"
import { AuthField, AuthShell, useSessionActions } from "@/features/auth"

/**
 * Оставшиеся экраны входа.
 *
 * Снято с `pIdgz`, `iziCH`, `INCeL`, `RfL9b`. Каркас общий с первыми пятью:
 * форма 920 и тёплая панель 520.
 *
 * **Каждый из четырёх — тупик по своей причине, и ни один не бросает человека.**
 * Код не пришёл — есть «отправить ещё раз». Письмо не пришло — сказано, куда
 * смотреть. Приглашение не ваше — есть «отклонить». Доступ закрыт — есть кому
 * написать, с именем и почтой. Мёртвых концов не бывает: у любого состояния
 * есть следующее действие.
 */

/**
 * Пара «вопрос — действие» под кнопкой.
 *
 * **Нажимаемым здесь бывает не всё, и это видно по коду.** «Отправить ещё раз»
 * и «Отклонить» — действия: у них нет своего экрана, за ними стоит письмо
 * и отзыв приглашения, поэтому они названы через `data-action` и ничего
 * не рисуют. «Проверьте папку «Спам»» — не действие, а совет: нажимать в нём
 * нечего, и кнопкой он быть не должен. Кнопка, которая ничего не делает,
 * врёт человеку ровно один раз — в тот момент, когда он её нажал.
 */
function AuthAside({
  question,
  action,
  /** Что произойдёт по нажатию. Не задано — это подпись, а не действие. */
  dataAction,
}: {
  question: string
  action: string
  dataAction?: string
}) {
  return (
    <span className="flex items-center gap-1.5">
      <Typography variant="denseText" tone="dense">
        {question}
      </Typography>
      {dataAction === undefined ? (
        <Typography variant="numericDense" tone="default">
          {action}
        </Typography>
      ) : (
        <button
          type="button"
          data-action={dataAction}
          className="cursor-pointer bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          <Typography variant="numericDense" tone="default">
            {action}
          </Typography>
        </button>
      )}
    </span>
  )
}

/**
 * Код подтверждения.
 *
 * **Поле обычное, а не четыре ячейки под цифры.** Так в файле, и это к лучшему:
 * ячейки ломают вставку кода из буфера, а именно так его и вводят чаще всего —
 * скопировав из письма.
 */
export function ConfirmCodePage() {
  const navigate = useNavigate()
  const { signIn } = useSessionActions()
  const [code, setCode] = useState("")

  /**
   * Код не проверяется, и подтверждение открывает кабинет.
   *
   * За экраном нет сервера — проверять четыре цифры было бы имитацией защиты,
   * которой нет. Зато сам шаг настоящий: человек вводит код, попадает
   * в «Сегодня» и дальше работает под своим сеансом, а не смотрит картинку.
   */
  const confirm = () => {
    signIn("i.smirnova@nevsky.ru")
    void navigate({ to: "/today" })
  }

  return (
    <AuthShell
      title="Введите код из письма"
      subtitle="Отправили четыре цифры на i.smirnova@nevsky.ru. Код живёт десять минут, повторная отправка через шестьдесят секунд."
      stepsLabel="ПОЧЕМУ МЫ СПРАШИВАЕМ КОД"
    >
      <div className="flex w-160 flex-col gap-5">
        <AuthField
          label="КОД ИЗ ПИСЬМА"
          value={code}
          onChange={setCode}
          name="code"
          autoComplete="one-time-code"
          placeholderText="Введите четыре цифры"
          hint="вход с нового устройства подтверждается кодом"
        />
      </div>

      <div className="h-7" />

      <div className="flex items-center gap-5">
        <Button variant="primary" size="lg" onClick={confirm}>
          Подтвердить вход
        </Button>
        <AuthAside
          question="Письмо не пришло?"
          action="Отправить ещё раз"
          dataAction="код отправлен ещё раз"
        />
      </div>
    </AuthShell>
  )
}

/**
 * Проверьте почту.
 *
 * Полей нет вовсе — человеку нечего вводить, он ждёт письма. Поэтому кнопка
 * **вторичная**: главное действие сейчас не на экране, а в почтовом ящике,
 * и графитовая кнопка звала бы жать её вместо того, чтобы пойти за письмом.
 */
export function CheckMailPage() {
  return (
    <AuthShell
      title="Проверьте почту"
      subtitle="Мы отправили письмо на i.smirnova@nevsky.ru. Перейдите по ссылке из письма, чтобы подтвердить адрес и открыть кабинет. Ссылка живёт двадцать четыре часа."
      stepsLabel="ЧТО БУДЕТ ДАЛЬШЕ"
    >
      <div className="flex items-center gap-5">
        {/* Своего экрана у повторной отправки нет: письмо уходит молча, и
            плашка «письмо отправлено» здесь была бы выдумкой, а не продуктом. */}
        <Button variant="secondary" size="lg" data-action="письмо отправлено ещё раз">
          Отправить письмо ещё раз
        </Button>
        <AuthAside
          question="Письмо не пришло за пять минут?"
          action="Проверьте папку «Спам»"
        />
      </div>
    </AuthShell>
  )
}

/**
 * Приглашение сотрудника.
 *
 * **Роль объяснена до принятия, а не после.** «Вы видите выдачу, свои подборки
 * и свои раскрытия; баланс, отчёты и журнал доступа видит только руководитель» —
 * человек соглашается, понимая границы, и не удивляется потом, что чего-то
 * не видит.
 *
 * Почта из приглашения изменить нельзя: приглашение выписано на неё, и подмена
 * адреса означала бы, что в агентство войдёт не тот, кого звали.
 */
export function InvitePage() {
  const navigate = useNavigate()
  const { signUp } = useSessionActions()
  const [name, setName] = useState("Королёв Дмитрий")
  const [password, setPassword] = useState("")
  const [accepted, setAccepted] = useState(false)

  const ready = accepted && name.trim() !== ""

  /**
   * Принять приглашение — значит завести сеанс и попасть на первый вход
   * сотрудника, а не в общую выдачу.
   *
   * Экран `/first-run/employee` отвечает ровно на те три вопроса, которые
   * возникают у человека в эту секунду: сколько я могу раскрыть, что уже
   * настроено до меня, чьи деньги я трачу.
   *
   * Роль в демонстрационном сеансе одна — руководитель: разделения прав
   * за экранами пока нет, и подделывать его здесь значило бы обещать
   * ограничения, которых продукт ещё не исполняет.
   */
  const accept = () => {
    if (!ready) return
    signUp({ name, email: "d.korolev@nevsky.ru", agency: "Невский проспект" })
    void navigate({ to: "/first-run/employee" })
  }

  return (
    <AuthShell
      title="Ирина приглашает вас в «Невский проспект»"
      subtitle="Роль «агент»: вы видите выдачу, свои подборки и свои раскрытия. Баланс агентства, отчёты и журнал доступа видит только руководитель."
      narrow
      stepsLabel="ЧТО БУДЕТ ДАЛЬШЕ"
      pricesLabel="ЗА ЧТО ПЛАТИТ АГЕНТСТВО"
      prices={[
        {
          value: "199 ₽",
          note: "за раскрытый контакт. Списывается со счёта агентства, не с вашего.",
        },
        {
          value: "3 000 ₽ в месяц",
          note: "за доступ агентства целиком. Вас это не касается.",
        },
      ]}
    >
      <div className="flex w-160 flex-col gap-5">
        <div className="flex w-full gap-5">
          <AuthField label="ФАМИЛИЯ И ИМЯ" value={name} onChange={setName} name="name" />
          {/* Единственное нарисованное поле экрана — и по делу: приглашение
              выписано на этот адрес, и подмена означала бы, что в агентство
              войдёт не тот, кого звали. */}
          <AuthField
            label="РАБОЧИЙ E-MAIL"
            value="d.korolev@nevsky.ru"
            placeholder
            hint="адрес из приглашения, изменить нельзя"
          />
        </div>
        <AuthField
          label="ПАРОЛЬ"
          value={password}
          onChange={setPassword}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholderText="Придумайте пароль"
        />
      </div>

      <div className="h-6.5" />

      {/* Отметка настоящая, и без неё приглашение не принимается. Продукт
          отдаёт телефоны живых людей: согласие на правила работы с контактами —
          это то, чем он защищён, а не формальность экрана. */}
      <div className="flex w-160 items-center gap-2.5">
        <Checkbox
          checked={accepted}
          onCheckedChange={setAccepted}
          aria-label="Принимаю оферту и правила работы с контактами"
        />
        <Typography variant="denseText" tone="default">
          Принимаю оферту и правила работы с контактами
        </Typography>
      </div>

      <div className="h-7" />

      <div className="flex items-center gap-5">
        <Button variant="primary" size="lg" onClick={accept} disabled={!ready}>
          Принять приглашение
        </Button>
        <AuthAside
          question="Это приглашение не для вас?"
          action="Отклонить"
          dataAction="приглашение отклонено"
        />
      </div>
    </AuthShell>
  )
}

/**
 * Доступ закрыт.
 *
 * **Экран отвечает на три вопроса сразу, и это редкий случай, когда так надо.**
 * Первый: дело не в пароле — «почта и пароль верные». Второй: кто закрыл
 * и когда. Третий, который человек постесняется задать: что с моими
 * раскрытиями — «остались у агентства: 199 ₽ за них платило агентство, а не вы».
 *
 * Панель справа здесь короче: цен и состава на ней нет вовсе. Человеку,
 * которого только что отключили, не рассказывают, что входит в тариф.
 */
export function AccessClosedPage() {
  return (
    <AuthShell
      title="Доступ закрыт"
      subtitle="Руководитель агентства «Невский проспект» закрыл ваш доступ 2 августа. Почта и пароль верные — дело не в них. Раскрытые вами контакты остались у агентства: 199 ₽ за них платило агентство, а не вы."
      stepsLabel="ЧТО ЭТО ЗНАЧИТ"
      showPricing={false}
      steps={[
        { title: "Кабинет закрыт", note: "выдача, подборки и журнал больше не открываются" },
        {
          title: "Контакты остались у агентства",
          note: "их раскрывали за деньги агентства, а не за ваши",
        },
        {
          title: "Личные данные — по заявлению",
          note: "имя, почта и телефон удаляются по вашему обращению",
        },
      ]}
      protection="Журнал доступа остаётся у агентства: кто и когда открывал контакты. Это требование закона, а не решение руководителя."
    >
      {/* Оба действия ведут наружу продукта: одно в почту руководителя, второе
          в обращение на удаление данных. Своих экранов у них нет и быть
          не может — человек сюда уже не вернётся, кабинет для него закрыт.
          Поэтому действия названы и ничего не рисуют. */}
      <div className="flex items-center gap-5">
        <Button
          variant="secondary"
          size="lg"
          data-action="письмо руководителю на i.smirnova@nevsky.ru"
        >
          Написать руководителю
        </Button>
        <div className="flex flex-col gap-0.5">
          <Typography variant="denseText" tone="dense">
            Ирина Смирнова · i.smirnova@nevsky.ru
          </Typography>
          <button
            type="button"
            data-action="запрошено удаление персональных данных"
            className="flex cursor-pointer bg-transparent outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <Typography variant="numericDense" tone="default">
              Удалить мои данные
            </Typography>
          </button>
        </div>
      </div>
    </AuthShell>
  )
}
