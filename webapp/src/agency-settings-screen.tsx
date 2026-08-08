import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import {
  applyViewToAll,
  requestDeletion,
  saveRequisites,
  transferOwner,
  useSession,
} from "@/features/auth"
import {
  accountingDocument,
  download,
  fileName,
  formatDay,
  useNow,
  useWorkspace,
} from "@/features/workspace"
import {
  AgencyShell,
  ApplyViewDialog,
  DeleteAgencyDialog,
  FormField,
  RequisitesDialog,
  SettingRow,
  TransferOwnerDialog,
} from "@/features/agency"
import { notifyDone, notifyError } from "@/platform/notify"
import { useDensity } from "@/platform/density"
import { useExitValue } from "@/platform/motion"

/**
 * АГЕНТСТВО · Настройки агентства.
 *
 * Снято с `cNIZP`. Две колонки: слева реквизиты, справа правила агентства.
 * Вкладок нет — экран открывается отдельно, а не листается вместе с журналами.
 *
 * **Ответственный за данные — не формальность, а человек с фамилией.** Он
 * подписывает согласия и отвечает на запросы субъектов персональных данных.
 * Роль передаётся кнопкой, а не переназначается втихую: если её некому нести,
 * это должно быть видно.
 *
 * **Удаление агентства сказано полностью, включая неудобное:** данные удаляются
 * за три рабочих дня, а журнал доступа хранится год по закону. Не написать
 * вторую половину было бы обманом — и всплыла бы она в худший момент.
 *
 * **Ни одного чужого реквизита на экране больше нет.** Название, ответственный
 * и дата подписи согласия берутся из сеанса и из списка сотрудников. Раньше
 * здесь стояли образцы из макета — «Невский проспект», ИНН 7806154392, адрес
 * на Свердловской набережной, Смирнова Ирина Владимировна, — и живой человек
 * читал их как реквизиты своего агентства. Незаполненное поле с подсказкой
 * «что сюда вписать» честнее правдоподобной подстановки: по чужому ИНН
 * выставят счёт, а по чужой фамилии отправят запрос субъекта персональных
 * данных.
 */

/**
 * Правило агентства одним значением из перечисленных.
 *
 * Выбор живёт здесь, а не приходит сверху: правило меняют на этом экране
 * и больше нигде, и сохранять его пока некуда. Чип, который не двигается
 * от нажатия, руководитель читает как «настройка не работает».
 */
function RuleChips({ options, initial }: { options: string[]; initial: string }) {
  const [value, setValue] = useState(initial)

  return (
    <>
      {options.map((option) => (
        <SelectChip
          key={option}
          label={option}
          selected={option === value}
          onClick={() => setValue(option)}
        />
      ))}
    </>
  )
}

/** Какое из четырёх окон открыто. Одновременно бывает только одно. */
type OpenDialog = "none" | "requisites" | "transfer" | "view" | "delete"

export function AgencySettingsPage() {
  const session = useSession()
  const workspace = useWorkspace()
  const [dense] = useDensity()
  const [open, setOpen] = useState<OpenDialog>("none")

  /**
   * Окна руководителя уходят, а не пропадают.
   *
   * Все четыре живут на одном состоянии, поэтому и держатся одним хуком.
   * Какое именно окно уходит, `open` в момент закрытия уже не знает — он стал
   * «none», — и последнее открытое придерживает `useExitValue` ровно на те
   * 120 мс, что идёт уход.
   */
  const dialog = useExitValue(open === "none" ? null : open)
  const shown = dialog.value

  /**
   * Реквизиты живут в базе, а до неё — нигде.
   *
   * Без сервера сохранять их некуда: колонки есть только в базе, а в браузере
   * они пережили бы ровно до смены устройства. Поэтому окно открывается
   * с тем, что уже записано, и пустые поля здесь — не ошибка, а «ещё
   * не заполняли».
   */
  const [requisites, setRequisites] = useState({ legalName: "", inn: "", legalAddress: "" })

  /**
   * Кому можно передать роль и кого коснётся раскатка вида — все, кроме себя.
   *
   * Себя в списке быть не может по обеим причинам сразу: передать роль себе
   * бессмысленно, а свой вид человек и так меняет переключателем.
   */
  const colleagues = workspace.people.filter(
    (person) => person.email.trim().toLowerCase() !== (session?.email ?? "").trim().toLowerCase(),
  )

  /** Отчитаться о том, что сделал сервер. Молча такие действия проходить не должны. */
  const report = (done: string) => (failed: string | null) => {
    if (failed === null) notifyDone(done)
    else notifyError(failed)
    setOpen("none")
  }
  const now = useNow()
  // Экран за охраной, без сеанса сюда не попасть. Пустая строка — не «на всякий
  // случай», а единственный запасной вариант: подставить сюда чужое название
  // значило бы вернуть ту самую подмену, из-за которой этот экран и правили.
  const agencyName = session?.agency ?? ""

  // Пустые кавычки «» в подписи читаются как поломка вёрстки, а не как
  // отсутствие названия. Тогда подпись остаётся без имени агентства.
  const shellNote =
    agencyName === ""
      ? "доступ 3 000 ₽ в месяц · до двадцати сотрудников"
      : `«${agencyName}» · доступ 3 000 ₽ в месяц · до двадцати сотрудников`

  /**
   * Согласие подписывают в момент создания агентства, а создаёт его тот, кто
   * зарегистрировался. Его запись в списке сотрудников — единственная честная
   * дата подписи. Раньше здесь стояло «12.06.2026» из макета: дата-ответ
   * проверяющему, которую никто не проверял и которая совпадала с реальностью
   * только у того, кто зарегистрировался в этот день.
   */
  const signedAt = workspace.people.find((person) => person.role === "owner")?.addedAt
  const consentNote =
    signedAt === undefined
      ? "подписано при создании агентства"
      : `подписано ${formatDay(signedAt, now)} при создании агентства`

  /**
   * Договор и согласие отдаются текстом.
   *
   * PDF без подписи и печати всё равно не документ, а текст открывается
   * везде и виден целиком. Когда появится сервер, подписанный файл придёт
   * оттуда — содержимое останется тем же.
   */
  const downloadContract = () => {
    download(
      fileName("договор", now, "txt"),
      accountingDocument({
        kind: "Договор оказания услуг",
        number: "СЧ-2026",
        at: now,
        agency: agencyName,
        lines: [
          ["Доступ к сервису для агентства целиком, до 20 сотрудников", "3 000 ₽ / мес"],
          ["Раскрытие контакта собственника", "199 ₽ / шт"],
        ],
        total: "по факту использования",
      }),
      "text/plain;charset=utf-8",
    )
  }

  const downloadConsent = () => {
    download(
      fileName("согласие-на-обработку", now, "txt"),
      accountingDocument({
        kind: "Согласие на обработку персональных данных",
        number: "1",
        at: now,
        agency: agencyName,
        lines: [
          ["Оператор", "ООО «Сёрчь»"],
          ["Уведомление в Роскомнадзор", "№ 78-19-004182"],
          ["Цель обработки", "поиск собственников недвижимости"],
        ],
        total: "бессрочно до отзыва",
      }),
      "text/plain;charset=utf-8",
    )
  }

  return (
    <AgencyShell
      activeTab="none"
      title="Настройки агентства"
      note={shellNote}
      action={
        // Договор с агентством отдаётся файлом, а экрана документа в макете нет.
        <Button variant="quiet" size="sm" onClick={downloadContract}>
          Скачать договор
        </Button>
      }
    >
      <div className="flex w-full gap-6">
        <div className="flex w-117 shrink-0 flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            РЕКВИЗИТЫ
          </Typography>
          {/* Реквизиты агентства ещё никто не вводил: при регистрации
              спрашивают только название. Пустое поле с подсказкой «заполните»
              честнее чужого ИНН, подставленного за человека. */}
          <FormField label="НАЗВАНИЕ АГЕНТСТВА" value={agencyName} />
          <FormField label="ИНН" value="" hint="нужен для договора и счетов" />
          <FormField
            label="ЮРИДИЧЕСКИЙ АДРЕС"
            value=""
            hint="подставится из ЕГРЮЛ после проверки ИНН"
          />
          <div className="flex">
            {/* Правка реквизитов открывает окно `cXuHY`. Форма с проверкой
                ИНН по ЕГРЮЛ нарисована, а сверка появится на стороне сервера:
                здесь поля и сохранение. */}
            <Button
              variant="quiet"
              size="md"
              data-action="правка реквизитов агентства"
              onClick={() => setOpen("requisites")}
            >
              Изменить реквизиты
            </Button>
          </div>

          <div className="h-3" />

          <Typography variant="columnHeader" tone="dense">
            ОТВЕТСТВЕННЫЙ ЗА ДАННЫЕ
          </Typography>
          <div className="flex w-full flex-col gap-0.5">
            {/* Ответственный — тот, кто завёл агентство: другого источника нет,
                пока роль никому не передавали. Прочерк вместо имени, если
                сеанса нет: «роль некому нести» обязано быть видно, а чужая
                фамилия под словами «отвечает на запросы субъектов» — это
                подстава конкретного человека, а не заполнение кадра. */}
            <Typography variant="numericDense" tone="default">
              {session?.name ?? "—"}
            </Typography>
            <Typography variant="metaText" tone="dense">
              руководитель · подписывает согласия и отвечает на запросы субъектов
              персональных данных
            </Typography>
          </div>
          <div className="flex">
            {/* Ответственного выбирают из сотрудников — окно `B3hBi`.
                Роль неразрывна с руководительской: ролей в системе две. */}
            <Button
              variant="quiet"
              size="md"
              data-action="передана роль ответственного за данные"
              onClick={() => setOpen("transfer")}
            >
              Передать роль
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Typography variant="columnHeader" tone="dense">
            ПРАВИЛА АГЕНТСТВА
          </Typography>

          <SettingRow
            title="Дневной лимит раскрытий по умолчанию"
            note="применяется к новым сотрудникам"
            control={
              <RuleChips
                options={["5 в сутки", "25 в сутки", "Без лимита"]}
                initial="25 в сутки"
              />
            }
          />
          <SettingRow
            title="Автопополнение баланса"
            note="выставлять счёт при остатке меньше 2 000 ₽"
            control={
              <RuleChips
                options={["Включено", "По порогу", "Выключено"]}
                initial="По порогу"
              />
            }
          />
          <SettingRow
            title="Плотность по умолчанию"
            note="строка выдачи 88 px или 64 px"
            control={<RuleChips options={["Просторно", "Плотно"]} initial="Просторно" />}
          />
          <SettingRow
            title="Кто видит журнал доступа"
            note="каждое раскрытие: кто, когда и по какому объекту"
            control={
              <RuleChips
                options={["Руководитель", "Все сотрудники"]}
                initial="Руководитель"
              />
            }
          />
          <SettingRow
            title="Вид по умолчанию для агентства"
            note="плотность и набор полей для всех сотрудников"
            control={
              // Раскатка меняет ЧУЖИЕ экраны, и прежний выбор каждого
              // не сохраняется — отменить нечем. Поэтому перед ней окно
              // `fmHiq` с числом и именами, а не молчаливое применение.
              <Button
                variant="quiet"
                size="sm"
                data-action="вид по умолчанию применён ко всем сотрудникам"
                onClick={() => setOpen("view")}
              >
                Применить ко всем
              </Button>
            }
          />
          <SettingRow
            title="Согласие на обработку персональных данных"
            note={consentNote}
            control={
              <Button variant="quiet" size="sm" onClick={downloadConsent}>
                Скачать копию
              </Button>
            }
          />
          <SettingRow
            last
            title="Удаление агентства"
            note="данные удаляются за три рабочих дня, журнал доступа хранится год по закону"
            control={
              // Самое необратимое действие кабинета — и потому единственное,
              // где кнопка подтверждения залита цветом ошибки. Окно `d7JoII`
              // перечисляет всё, что пропадёт, включая то, о чём человек
              // не подумает: ссылки на подборки у клиентов.
              <Button
                variant="quiet"
                size="sm"
                data-action="запрошено удаление агентства"
                onClick={() => setOpen("delete")}
              >
                Запросить удаление
              </Button>
            }
          />
        </div>
      </div>

      {dialog.mounted && shown === "requisites" ? (
        <RequisitesDialog
          leaving={dialog.leaving}
          legalName={requisites.legalName || (session?.agency ?? "")}
          inn={requisites.inn}
          legalAddress={requisites.legalAddress}
          onClose={() => setOpen("none")}
          onSave={(next) => {
            setRequisites(next)
            void saveRequisites(next).then(report("Реквизиты сохранены"))
          }}
        />
      ) : null}

      {dialog.mounted && shown === "transfer" ? (
        <TransferOwnerDialog
          leaving={dialog.leaving}
          ownerName={session?.name ?? ""}
          people={colleagues.map((person) => ({
            id: person.id,
            name: person.name,
            note: `${person.role === "owner" ? "руководитель" : "агент"} · ${
              person.limit === null ? "без лимита" : `лимит ${person.limit} в сутки`
            }`,
          }))}
          onClose={() => setOpen("none")}
          onTransfer={(id) => void transferOwner(id).then(report("Роль передана"))}
        />
      ) : null}

      {dialog.mounted && shown === "view" ? (
        <ApplyViewDialog
          leaving={dialog.leaving}
          dense={dense}
          people={colleagues.map((person) => person.name)}
          onClose={() => setOpen("none")}
          onApply={() =>
            void applyViewToAll(dense ? "compact" : "spacious").then(
              report("Вид поставлен всем сотрудникам"),
            )
          }
        />
      ) : null}

      {dialog.mounted && shown === "delete" ? (
        <DeleteAgencyDialog
          leaving={dialog.leaving}
          agency={session?.agency ?? ""}
          onClose={() => setOpen("none")}
          onRequest={() =>
            void requestDeletion().then(
              report("Запрос на удаление принят: данные удалим за три рабочих дня"),
            )
          }
        />
      ) : null}
    </AgencyShell>
  )
}
