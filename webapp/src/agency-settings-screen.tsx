import { useState } from "react"

import { Button } from "@/components/controls/Button"
import { SelectChip } from "@/components/controls/SelectChip"
import { Typography } from "@/components/typography"
import { useOwnAgency, useSession } from "@/features/auth"
import { accountingDocument, download, fileName, useNow } from "@/features/workspace"
import { AgencyShell, FormField, SettingRow } from "@/features/agency"

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

export function AgencySettingsPage() {
  const session = useSession()
  // Через `useOwnAgency`, а не по полю сеанса: только эта функция знает про
  // стенд сверки, который обязан показывать замеренные данные независимо от
  // того, кто вошёл. Прямая проверка поля оставляла стенд пустым.
  const own = useOwnAgency()
  const now = useNow()
  const agencyName = own ? (session?.agency ?? "") : "Невский проспект"

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
      note={
        own
          ? `«${session?.agency ?? ""}» · доступ 3 000 ₽ в месяц · до двадцати сотрудников`
          : "«Невский проспект» · доступ 3 000 ₽ в месяц · до двадцати сотрудников"
      }
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
          {/* Реквизиты своего агентства ещё никто не вводил: при регистрации
              спрашивают только название. Пустое поле с подсказкой «заполните»
              честнее чужого ИНН, подставленного за человека. */}
          <FormField
            label="НАЗВАНИЕ АГЕНТСТВА"
            value={own ? session?.agency ?? "" : "Невский проспект"}
          />
          <FormField
            label="ИНН"
            value={own ? "" : "7806154392"}
            hint={own ? "нужен для договора и счетов" : "проверен в ЕГРЮЛ 12.06.2026"}
          />
          <FormField
            label="ЮРИДИЧЕСКИЙ АДРЕС"
            value={
              own ? "" : "Санкт-Петербург, Свердловская наб., 44, литера А, помещение 3-Н"
            }
            hint={own ? "подставится из ЕГРЮЛ после проверки ИНН" : "совпадает с данными ЕГРЮЛ"}
            locked={!own}
          />
          <div className="flex">
            {/* Реквизиты сверены с ЕГРЮЛ, и правка их — отдельная форма
                с повторной проверкой ИНН. В макете её нет. */}
            <Button variant="quiet" size="md" data-action="правка реквизитов агентства">
              Изменить реквизиты
            </Button>
          </div>

          <div className="h-3" />

          <Typography variant="columnHeader" tone="dense">
            ОТВЕТСТВЕННЫЙ ЗА ДАННЫЕ
          </Typography>
          <div className="flex w-full flex-col gap-0.5">
            <Typography variant="numericDense" tone="default">
              {own ? session?.name ?? "" : "Смирнова Ирина Владимировна"}
            </Typography>
            <Typography variant="metaText" tone="dense">
              руководитель · подписывает согласия и отвечает на запросы субъектов
              персональных данных
            </Typography>
          </div>
          <div className="flex">
            {/* Ответственного за данные выбирают из сотрудников — списка
                для выбора в макете нет, поэтому действие только названо. */}
            <Button
              variant="quiet"
              size="md"
              data-action="передана роль ответственного за данные"
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
              // Раскатка вида на всех сотрудников меняет чужие экраны, и в макете
              // нет ни подтверждения, ни отчёта о том, к кому это применилось.
              <Button
                variant="quiet"
                size="sm"
                data-action="вид по умолчанию применён ко всем сотрудникам"
              >
                Применить ко всем
              </Button>
            }
          />
          <SettingRow
            title="Согласие на обработку персональных данных"
            note="подписано 12.06.2026 при создании агентства"
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
              // Самое необратимое действие кабинета. Без экрана подтверждения
              // выполнять его по нажатию нельзя, поэтому оно только названо.
              <Button variant="quiet" size="sm" data-action="запрошено удаление агентства">
                Запросить удаление
              </Button>
            }
          />
        </div>
      </div>
    </AgencyShell>
  )
}
