import { useNavigate, useRouter } from "@tanstack/react-router"
import { Hourglass, Lock } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/controls/Button"
import { DialogCard } from "@/components/DialogCard"
import { Typography } from "@/components/typography"
import {
  NO_RIGHTS,
  OFFLINE,
  SESSION_EXPIRED,
  noRightsText,
  offlineSheetText,
  sessionExpiredText,
  staleNote,
} from "@/dead-end-text"
import { signOut, useSession } from "@/features/auth"
import {
  CabinetPage,
  CabinetShell,
  MobileEmptyState,
  MobileScreen,
  MobileSectionHeader,
  MobileSheet,
} from "@/features/cabinet"
import { ListingsEmptyState } from "@/features/listings"
import { formatAgo, useNow, useWorkspace } from "@/features/workspace"
import { dismissNotice, notifyError } from "@/platform/notify"

/**
 * ОБЩИЕ ТУПИКИ · нет прав, нет связи, сеанс истёк.
 *
 * Шесть кадров: `pZQYx` / `OjZtb`, `RYNP4` / `r3thk`, `JsVqc` / `h33cyp`.
 * Три состояния на двух платформах, и текст у пар общий — он живёт
 * в `dead-end-text.ts`, здесь только форма.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * У КАЖДОГО ТУПИКА ЕСТЬ СЛЕДУЮЩЕЕ ДЕЙСТВИЕ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Тот же закон, что у «Доступ закрыт» и «Ссылка приглашения истекла»: экран,
 * из которого нельзя пройти дальше, обязан назвать, что делать. «Обратитесь
 * к администратору» здесь нет ни в одном из трёх.
 *
 *   нет прав     написать тому, кто решает, и вернуться к своей работе
 *   нет связи    спросить сеть ещё раз и продолжить с тем, что уже открыто
 *   сеанс истёк  войти заново и заодно поменять время простоя, если два часа мало
 *
 * **У каждой пары действия одинаковые, хотя кадры рисуют разное.** `OjZtb`
 * даёт на телефоне одну кнопку из двух, `h33cyp` — одну из двух. Форма
 * телефона другая, но выбор у человека обязан быть тот же: иначе агент,
 * упёршийся в закрытый раздел с ноутбука, может написать руководителю,
 * а тот же агент с телефона — нет.
 *
 * **Куда возвращает «вернуться» — сведено к одному адресу.** `pZQYx` шлёт
 * в «Сегодня», `OjZtb` — в поиск. Это не разница платформ, а разнобой
 * рисунка: «Сегодня» и есть главный экран кабинета, первый пункт сайдбара
 * и первая вкладка нижней панели. Туда и ведут обе.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ТРИ СОСТОЯНИЯ СОБРАНЫ ВМЕСТЕ, А НЕ ПО РАЗДЕЛАМ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ни одно из трёх не принадлежит разделу. Нет прав — свойство роли, оно
 * встаёт над «Агентством»; нет связи — свойство сети, оно встаёт над любым
 * экраном с данными; сеанс истёк — свойство входа, он встаёт над всем сразу.
 * Разложи их по файлам разделов — и каждое пришлось бы писать по три раза.
 *
 * Панель, лист и окно отданы наружу отдельно от страниц: страницами их
 * открывают со стенда и по адресу, а в продукте их зовут те экраны, поверх
 * которых состояние случилось.
 */

/* ══ Нет прав ═══════════════════════════════════════════════════════════════ */

/**
 * СОСТОЯНИЕ · Нет прав (`pZQYx`), панель.
 *
 * Кадр 940 × 560 — это стенд, внутри которого панель живёт; своей рамки
 * и полей у неё нет (то же правило записано в `ListingsEmptyState`).
 * Панель: белая поверхность, радиус 16, содержимое по центру с зазором 10,
 * значок 24, заголовок 20/600, объяснение 14/500 шириной 560, кнопки
 * с отступом 8 сверху.
 *
 * **Объяснение центрируется абзацем, а не свойством строчного узла.**
 * `uiText` рисуется тегом `span`, и `text-align` на нём ничего не делает —
 * выключка достаётся только блоку. Поэтому здесь `as="p"`.
 */
export function NoRightsPanel() {
  const workspace = useWorkspace()
  const navigate = useNavigate()

  /**
   * Имя руководителя берётся из состава агентства, а не вписывается.
   *
   * В кадре телефона стояло «видит Смирнова Ирина» — образец текста, который
   * агент чужого агентства читал как имя своего начальника. Состав знает
   * настоящее имя; не знает — фразы не будет вовсе.
   */
  const owner = workspace.people.find((person) => person.role === "owner")

  return (
    <div
      data-slot="no-rights"
      className="flex w-full flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl bg-surface px-20"
    >
      {/* Значок приглушённый и один. Закрытая дверь — не беда и не праздник,
          и цветная иллюстрация назначила бы ей настроение, которого нет. */}
      <Lock aria-hidden className="size-6 shrink-0 text-text-dense" strokeWidth={2} />

      <Typography variant="panelTitle" tone="default" align="center" as="h2">
        <>{NO_RIGHTS.title}</>
      </Typography>

      <div className="max-w-140">
        <Typography variant="uiText" tone="secondary" align="center" as="p">
          <>{noRightsText(owner?.name ?? "")}</>
        </Typography>
      </div>

      <div className="flex items-center gap-2 pt-2">
        {/* Письмо уходит не отсюда: почту руководителя знает сервер, а его
            за экраном пока нет. Экрана «письмо ушло» в файле тоже нет,
            и рисовать его значило бы пообещать отправку, которой не было.
            Поэтому действие названо — ровно как на «Доступе закрыт». */}
        <Button variant="primary" size="md" data-action="письмо руководителю агентства">
          <>{NO_RIGHTS.write}</>
        </Button>
        <Button variant="quiet" size="md" onClick={() => void navigate({ to: "/today" })}>
          <>{NO_RIGHTS.leave}</>
        </Button>
      </div>
    </div>
  )
}

/**
 * Страница закрытого раздела на компьютере.
 *
 * Панель встаёт в колонку содержимого кабинета — шапка и сайдбар остаются
 * на месте. Это важнее, чем кажется: агент не «выпал из продукта», он стоит
 * в кабинете и видит все двери, которые ему открыты.
 *
 * Подсветки пункта нет: раздела «Агентство» у агента в меню не существует
 * (`useCabinetNav` его выбрасывает), и подсвечивать нечего.
 */
export function NoRightsPage() {
  return (
    <CabinetShell activeId="">
      <CabinetPage>
        <NoRightsPanel />
      </CabinetPage>
    </CabinetShell>
  )
}

/**
 * МОБАЙЛ · Нет прав (`OjZtb`).
 *
 * Каркас телефона: шапка раздела 56, тело с полями [32, 24] и зазором 16,
 * нижняя навигация 72. Всё это уже собрано компонентом `I4XYhB` —
 * `MobileEmptyState`, — и здесь он взят как есть.
 *
 * **Нижняя навигация остаётся, и она не врёт.** Агенту закрыт один раздел
 * из пяти; остальные четыре открываются с той же панели, и «Ещё» подсвечено
 * потому, что через него в «Агентство» и приходят.
 *
 * **Кнопок две, хотя в кадре одна.** Вторая — «Написать руководителю» —
 * не украшение: без неё телефонный тупик кончается возвратом, то есть
 * ничем. Ширина у обеих по содержимому, как у единственной кнопки кадра,
 * а не во всю строку: во всю строку на телефоне идут кнопки листа, где
 * они и есть всё содержимое.
 */
export function MobileNoRightsPage() {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const owner = workspace.people.find((person) => person.role === "owner")

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Агентство" />}
      activeTab="more"
      padded={false}
    >
      <MobileEmptyState
        icon={Lock}
        title={NO_RIGHTS.title}
        text={noRightsText(owner?.name ?? "")}
        action={
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="primary"
              size="lg"
              data-action="письмо руководителю агентства"
            >
              <>{NO_RIGHTS.write}</>
            </Button>
            <Button variant="quiet" size="lg" onClick={() => void navigate({ to: "/m/today" })}>
              <>{NO_RIGHTS.leave}</>
            </Button>
          </div>
        }
      />
    </MobileScreen>
  )
}

/* ══ Нет связи ══════════════════════════════════════════════════════════════ */

/**
 * Когда пропала связь.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * В кадрах написано «последние данные получены восемь минут назад». Восемь —
 * образец: настоящий возраст данных знает тот слой, который за ними ходит,
 * а его за этими экранами пока нет.
 *
 * Ближайший честный якорь, который есть у браузера, — момент, когда он сам
 * сообщил о потере линии. Пока линии нет, новых данных и не приходило,
 * значит возраст того, что на экране, не меньше этого времени. Когда за
 * выдачей появится сервер, сюда встанет время последнего успешного ответа,
 * и строка не поменяется ни на слово.
 *
 * Связь есть — возвращается `undefined`, и строки возраста нет вовсе.
 * Выдуманная «восьмёрка» в этом месте была бы враньём про свежесть данных,
 * то есть ровно про то, ради чего строка написана.
 */
function useOfflineSince(): number | undefined {
  const [since, setSince] = useState<number | undefined>(() =>
    typeof navigator === "undefined" || navigator.onLine ? undefined : Date.now(),
  )

  useEffect(() => {
    const lost = () => setSince(Date.now())
    // Линия вернулась — возраст обнуляется, а не замирает: следующий раз
    // отсчёт обязан идти от новой потери, а не от позапрошлой.
    const back = () => setSince(undefined)
    window.addEventListener("offline", lost)
    window.addEventListener("online", back)
    return () => {
      window.removeEventListener("offline", lost)
      window.removeEventListener("online", back)
    }
  }, [])

  return since
}

/** Возраст данных словами: «8 минут», «2 часа». Меньше минуты — молчание. */
function useStaleAgo(): string | undefined {
  const since = useOfflineSince()
  const now = useNow()
  if (since === undefined) return undefined
  const minutes = Math.floor((now - since) / 60_000)
  return minutes < 1 ? undefined : formatAgo(minutes)
}

/**
 * Два действия тупика без связи, общие для окна и листа.
 *
 * **«Попробовать снова» действительно спрашивает.** Сети у экрана нет, зато
 * есть браузер: если линия вернулась, человека возвращают туда, откуда он
 * пришёл, — работать. Если не вернулась, он получает ответ сообщением,
 * а не молчащей кнопкой. Кнопка, которая на нажатие не отвечает ничем,
 * читается как поломка поверх поломки.
 *
 * **«Работать с тем, что открыто» — тот же возврат, но без ожидания.**
 * Выдача, уже загруженная в браузер, читается и без сервера; заблокировано
 * только раскрытие контакта, потому что оно тратит деньги и пишет в журнал.
 */
function useOfflineActions() {
  const router = useRouter()

  /**
   * Прошлый ответ снимается перед новым.
   *
   * Сообщение об ошибке не гаснет само — так решено в полке сообщений:
   * ошибку человек обязан прочесть. Значит третье нажатие «Попробовать
   * снова» повесило бы на экран три одинаковые строки, и полка сама стала бы
   * поломкой. Ответ на экране всегда один и относится к последнему нажатию.
   */
  const noticeRef = useRef<number | undefined>(undefined)

  const online = () => typeof navigator === "undefined" || navigator.onLine

  return {
    retry: () => {
      if (online()) {
        router.history.back()
        return
      }
      if (noticeRef.current !== undefined) dismissNotice(noticeRef.current)
      noticeRef.current = notifyError("Связи всё ещё нет")
    },
    keepWorking: () => router.history.back(),
  }
}

/**
 * СОСТОЯНИЕ · Нет связи (`RYNP4`), панель.
 *
 * Кадр повторяет форму пустого состояния выдачи один в один: строка
 * результата 36, панель с радиусом 16, содержимое по центру, подвал 13/500.
 * Поэтому взят уже собранный `ListingsEmptyState`, а не написана седьмая
 * копия той же раскладки — форма общая, содержание своё.
 *
 * **Фраза кадра «выдача, которую вы уже видите, осталась на экране» сюда
 * не перенесена.** Кадр рисует панель пустой, и на пустой панели эта фраза
 * противоречит сама себе. Обещание никуда не делось — его несёт вторая
 * кнопка, которая возвращает ровно к той выдаче.
 */
export function OfflinePanel() {
  const ago = useStaleAgo()
  const { retry, keepWorking } = useOfflineActions()

  return (
    <div data-slot="offline-state" className="flex w-full flex-1 flex-col">
      <ListingsEmptyState
        headerTitle={OFFLINE.header}
        headerNote={ago === undefined ? undefined : staleNote(ago)}
        title={OFFLINE.title}
        text={OFFLINE.blocked}
        actions={[
          { id: "retry", label: OFFLINE.retry, primary: true, onClick: retry },
          { id: "keep", label: OFFLINE.keepWorking, onClick: keepWorking },
        ]}
        footnote={OFFLINE.kept}
      />
    </div>
  )
}

/** Страница «нет связи» на компьютере: панель в колонке содержимого кабинета. */
export function OfflinePage() {
  return (
    <CabinetShell activeId="search">
      <CabinetPage>
        <OfflinePanel />
      </CabinetPage>
    </CabinetShell>
  )
}

/**
 * МОБАЙЛ · Нет связи (`r3thk`).
 *
 * **Здесь форма расходится с компьютером сильнее всего, и это правильно.**
 * На 940 состояние занимает всю панель — выдачи под ним нет. На 390 оно
 * приходит листом снизу ПОВЕРХ экрана: телефон у человека в руке посреди
 * работы, и подменять ему экран целиком значит потерять место, где он был.
 * Затемнение `#1e1e1e59` и хват 36 × 5 — из компонента `SItir`.
 *
 * Три факта, разложенные на компьютере по строке результата, телу и подвалу,
 * идут здесь одним абзацем: других мест на листе нет.
 */
export function MobileOfflinePage() {
  const ago = useStaleAgo()
  const { retry, keepWorking } = useOfflineActions()

  return (
    <MobileSheet title={OFFLINE.title} text={offlineSheetText(ago)}>
      <Button variant="primary" size="lg" block onClick={retry}>
        <>{OFFLINE.retry}</>
      </Button>
      <Button variant="quiet" size="lg" block onClick={keepWorking}>
        <>{OFFLINE.keepWorking}</>
      </Button>
    </MobileSheet>
  )
}

/* ══ Сеанс истёк ════════════════════════════════════════════════════════════ */

/**
 * Куда ведут обе кнопки истёкшего сеанса.
 *
 * **«Изменить время простоя» НЕ закрывает сеанс, а «Войти» — закрывает.**
 * Порядок тут не мелочь: закрой сеанс раньше перехода — и охрана кабинета
 * развернёт человека с экрана настройки обратно на вход, то есть кнопка
 * приведёт не туда, куда обещала. Настройка личная и лежит за входом,
 * поэтому её открывают, пока дверь ещё не захлопнули.
 */
function useSessionExpiredActions(platform: "desktop" | "mobile") {
  const navigate = useNavigate()

  return {
    change: () => {
      if (platform === "mobile") {
        void navigate({ to: "/m/security" })
        return
      }
      void navigate({ to: "/profile/login-policy" })
    },
    enter: () => {
      signOut()
      if (platform === "mobile") {
        void navigate({ to: "/m/login" })
        return
      }
      // Куда человек шёл, знает он, а не эта кнопка: пустой `returnTo` честнее
      // выдуманного адреса — то же решение, что в охране кабинета.
      void navigate({ to: "/login", search: { returnTo: undefined } })
    },
  }
}

/**
 * СОСТОЯНИЕ · Сеанс истёк (`JsVqc`), окно.
 *
 * Затемнение `#1e1e1e59`, карточка 520 с полями 24, радиусом 16 и зазором 16.
 * Подвал: тихая кнопка слева, распорка, графитовая справа.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ПОЧЕМУ ЭТО ОКНО НЕ ЗАКРЫВАЕТСЯ НИ ESCAPE, НИ ЩЕЛЧКОМ ПО ФОНУ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Все остальные окна продукта закрываются обоими способами, и это записано
 * в `MoneyStateDialog`: окно, которое пришло без спроса, обязано отпускать.
 * Здесь — единственное исключение, и оно не про строгость. За окном стоит
 * кабинет, которому больше нельзя верить: числа в нём от прошлого часа,
 * кнопка раскрытия спишет деньги в никуда. Отпустить человека обратно
 * значит показать ему живой на вид, но мёртвый продукт.
 *
 * Тупик от этого не становится ловушкой: выходов из окна два, и оба ведут
 * в работающий продукт.
 *
 * Кнопки взяты с доски `СИСТЕМА · Состояния контролов`, а не с компонентов
 * кадра: в самом `JsVqc` левая кнопка ступени 40, правая 44 — два разных
 * размера в одном ряду. Лестница `Button` закрыта, и обе идут `md`.
 */
export function SessionExpiredDialog({ platform }: { platform: "desktop" | "mobile" }) {
  const session = useSession()
  const { change, enter } = useSessionExpiredActions(platform)

  /**
   * Время простоя — личная настройка вошедшего. Умолчание 120 стоит и здесь,
   * и на экране «Безопасность»: без сеанса спросить не у кого.
   *
   * Словами его переводит `formatAgo` — единственный в продукте
   * превращатель минут в «30 минут · 1 час · 2 часа · 8 часов». Он написан
   * для возраста события, но считает ровно ту же длительность, и заводить
   * второй ради одного экрана значило бы завести второе склонение.
   *
   * В кадре число стоит прописью — «два часа». Прописью его не подставить,
   * а подставленное цифрой оно двигается вместе с настройкой; неподвижная
   * пропись рассказывала бы про два часа тому, кто поставил себе тридцать
   * минут.
   */
  const idle = session?.idleMinutes ?? 120

  return (
    <div
      data-slot="dialog-scrim"
      className="scrim-in fixed inset-0 z-50 flex items-center justify-center bg-[#1e1e1e59]"
    >
      <div className="motion-in h-fit">
        <DialogCard>
          <Typography variant="panelTitle" tone="default" as="h2">
            <>{SESSION_EXPIRED.title}</>
          </Typography>
          <Typography variant="uiText" tone="secondary">
            <>{sessionExpiredText(formatAgo(idle))}</>
          </Typography>
          <Typography variant="metaText" tone="dense">
            <>{SESSION_EXPIRED.hint}</>
          </Typography>

          <div className="flex w-full items-center gap-2.5">
            <Button variant="quiet" size="md" onClick={change}>
              <>{SESSION_EXPIRED.change}</>
            </Button>
            <div className="h-px flex-1" />
            <Button variant="primary" size="md" onClick={enter}>
              <>{SESSION_EXPIRED.enter}</>
            </Button>
          </div>
        </DialogCard>
      </div>
    </div>
  )
}

/**
 * Страница истёкшего сеанса на компьютере.
 *
 * Под затемнением пусто — так нарисовано в кадре, и так честно: показывать
 * сквозь затемнение кабинет, в который уже не пускают, значит дразнить
 * человека экраном, куда он не может вернуться.
 */
export function SessionExpiredPage() {
  return <SessionExpiredDialog platform="desktop" />
}

/**
 * МОБАЙЛ · Сеанс истёк (`h33cyp`).
 *
 * На телефоне это не окно поверх экрана, а сам экран: шапка с именем
 * продукта, песочные часы 32, заголовок, объяснение и действия. Окно 520
 * на 390 не встаёт, а лист снизу здесь был бы неправдой — за листом
 * полагается быть экрану, с которого его позвали, а кабинета за истёкшим
 * сеансом больше нет.
 *
 * **В шапке стоит «Сёрчь», а не название раздела.** Раздела больше нет —
 * человек уже не в кабинете, — и единственное, что шапке осталось сказать,
 * это куда он попал.
 *
 * **Нижняя навигация остаётся, как в кадре, и это не обещание впустую.**
 * Как только сеанс закрыт по-настоящему, охрана кабинета переводит любую
 * вкладку на вход. То есть панель ведёт ровно туда, куда ведёт эта страница.
 */
export function MobileSessionExpiredPage() {
  const session = useSession()
  const { change, enter } = useSessionExpiredActions("mobile")
  const idle = session?.idleMinutes ?? 120

  return (
    <MobileScreen
      header={<MobileSectionHeader title="Сёрчь" />}
      activeTab="today"
      padded={false}
    >
      <MobileEmptyState
        icon={Hourglass}
        title={SESSION_EXPIRED.title}
        text={sessionExpiredText(formatAgo(idle))}
        action={
          <div className="flex flex-col items-center gap-2">
            <Button variant="primary" size="lg" onClick={enter}>
              <>{SESSION_EXPIRED.enter}</>
            </Button>
            {/* Подсказки «настройка лежит в профиле» на телефоне нет — так
                в кадре. Её работу делает кнопка: она не рассказывает, где
                настройка, а открывает её. */}
            <Button variant="quiet" size="lg" onClick={change}>
              <>{SESSION_EXPIRED.change}</>
            </Button>
          </div>
        }
      />
    </MobileScreen>
  )
}
