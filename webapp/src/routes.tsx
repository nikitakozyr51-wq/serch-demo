import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router'

import { hasSession } from '@/features/auth'
import { loginPath, platformTwin } from '@/features/cabinet'
import { RootLayout } from './root-layout'

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: lazyRouteComponent(() => import('./pages'), 'NotFoundPage'),
})

/**
 * Корень кабинета: вошёл — «Сегодня», не вошёл — вход.
 *
 * Раньше здесь стояла шаблонная главная, проверяющая сеанс на сервере.
 * Сервера за демонстрацией нет, и человек, пришедший с лендинга, упирался
 * в «Session check is temporarily unavailable» вместо продукта.
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  component: lazyRouteComponent(() => import('./cabinet-entry'), 'CabinetEntryPage'),
})

/**
 * Вход — продуктовый, а не шаблонный.
 *
 * Раньше по `/login` открывалась страница из заготовки проекта, а собранный
 * по макету экран жил на `/screen/login`, то есть на стенде. Для владельца
 * это выглядело так, будто вход не сделан: он открывал очевидный адрес
 * и видел чужую вёрстку.
 *
 * Шаблонные экраны входа остались на своих прежних адресах `/signup`,
 * `/forgot-password`, `/reset-password`: они умеют разговаривать с сервером,
 * и когда сервер появится, форма продукта возьмёт их логику. До тех пор
 * продуктовый вход честно живёт без сервера — см. `demo-session.ts`.
 */
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: returnToSearch,
  // Вход тоже выбирает экран по устройству: на 390 десктопный кадр
  // 1440 × 1024 даёт боковую прокрутку и нечитаемую форму.
  beforeLoad: () => {
    const twin = platformTwin('/login')
    if (twin !== null) throw redirect({ to: twin, replace: true })
  },
  component: lazyRouteComponent(() => import('./auth-screens'), 'LoginPage'),
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  validateSearch: returnToSearch,
  component: lazyRouteComponent(() => import('./pages'), 'SignupPage'),
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: lazyRouteComponent(() => import('./pages'), 'ForgotPasswordPage'),
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: lazyRouteComponent(() => import('./pages'), 'ResetPasswordPage'),
})

const userWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'userWorkspace',
  component: lazyRouteComponent(() => import('./pages'), 'UserWorkspaceLayout'),
})

const userHomeRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app',
  component: lazyRouteComponent(() => import('./pages'), 'UserHomePage'),
})

const userProfileRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/profile',
  component: lazyRouteComponent(() => import('./pages'), 'UserProfilePage'),
})

const userSettingsRoute = createRoute({
  getParentRoute: () => userWorkspaceRoute,
  path: '/app/settings',
  component: lazyRouteComponent(() => import('./pages'), 'UserSettingsPage'),
})

const adminWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'adminWorkspace',
  component: lazyRouteComponent(() => import('./pages'), 'AdminWorkspaceLayout'),
})

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin',
  component: lazyRouteComponent(() => import('./pages'), 'AdminDashboardPage'),
})

const adminUsersRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/users',
  component: lazyRouteComponent(() => import('./pages'), 'AdminUsersPage'),
})

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminWorkspaceRoute,
  path: '/admin/settings',
  component: lazyRouteComponent(() => import('./pages'), 'AdminSettingsPage'),
})

// Полигон контролов. Существует только в режиме разработки: это поверхность
// для сверки с доской `СИСТЕМА · Состояния контролов`, а не страница продукта.
const kitchenSinkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kitchen-sink',
  component: lazyRouteComponent(
    () => import('./kitchen-sink'),
    'KitchenSinkPage',
  ),
})

// Экран выдачи, собранный из готовых частей на числах из DEMO-DATA.md.
// Тоже только для разработки: настоящий маршрут появится, когда за экраном
// будут данные, а не заглушки.
const searchScreenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/search',
  // Стенд показывает девять замеренных строк и только их: снимок для сверки
  // с макетом обязан быть одинаковым сегодня и через месяц. Продуктовый
  // `/search` показывает всю базу — там фильтрам есть что сужать.
  component: lazyRouteComponent(
    () => import('./search-stand'),
    'SearchStandPage',
  ),
})

// Состояния выдачи: загрузка, ошибка источника и шесть пустых. Собраны рядом
// не для красоты — их легко перепутать, а различаться они обязаны по смыслу,
// а не по оформлению. Стенд показывает их разом, чтобы это было видно.
const statesScreenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/states',
  component: lazyRouteComponent(
    () => import('./states-screen'),
    'StatesScreenPage',
  ),
})

// МОБАЙЛ · Поиск и выдача, 390 × 844. Отдельный маршрут, а не адаптив:
// это другая вёрстка с другим порядком фактов, а не сжатая десктопная.
const mobileSearchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/mobile',
  component: lazyRouteComponent(
    () => import('./mobile-search-screen'),
    'MobileSearchScreenPage',
  ),
})

// КАБИНЕТ · Карточка объекта — до раскрытия. Экран, отвечающий на один
// вопрос: звонить или нет. Собран как доказательство, а не как паспорт.
const objectCardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/object',
  component: lazyRouteComponent(
    () => import('./object-card-screen'),
    'ObjectCardScreenPage',
  ),
})

// Парная карточка: что человек получает за 199 ₽. Отдельный маршрут,
// потому что в файле это отдельный экран, а не состояние первого.
const objectCardDisclosedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/object-disclosed',
  component: lazyRouteComponent(
    () => import('./object-card-disclosed-screen'),
    'ObjectCardDisclosedPage',
  ),
})

// КАБИНЕТ · Сегодня. Рабочий день агента: с чего начать, что подвисло
// и что нового пришло по сохранённым поискам.
const todayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/today',
  component: lazyRouteComponent(() => import('./today-screen'), 'TodayScreenPage'),
})

// Карта экранов: путь агента по шагам со ссылками на собранное.
// Точка входа для сверки — с неё видно всё сразу.
const screenMapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen',
  component: lazyRouteComponent(() => import('./screen-map'), 'ScreenMapPage'),
})

// КАБИНЕТ · Режим «Прозвон». Полноэкранный: ни шапки, ни сайдбара —
// агент идёт по списку подряд, и всё, что уводит в сторону, убрано.
const callModeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/call',
  component: lazyRouteComponent(() => import('./call-mode-screen'), 'CallModeScreenPage'),
})

// МОБАЙЛ · Прозвон. Панели фиксации здесь нет — вместо неё кнопка,
// которая её открывает: на 390 две колонки не встают.
const mobileCallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/mobile-call',
  component: lazyRouteComponent(
    () => import('./mobile-call-screen'),
    'MobileCallScreenPage',
  ),
})

// КАБИНЕТ · Агентство → Отказы. Реестр номеров, которым агентство
// навсегда запретило себе звонить. Снять отметку нельзя ни одной ролью.
const agencyRefusalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/agency-refusals',
  component: lazyRouteComponent(
    () => import('./agency-refusals-screen'),
    'AgencyRefusalsPage',
  ),
})

const agencyStaffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/agency-staff',
  component: lazyRouteComponent(() => import('./agency-staff-screen'), 'AgencyStaffPage'),
})

// Экран руководителя: куда уходят деньги агентства. Первым идёт не метрика,
// а простой — он единственный говорит, что можно сделать сегодня.
const agencyEfficiencyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/agency-efficiency',
  component: lazyRouteComponent(
    () => import('./agency-efficiency-screen'),
    'AgencyEfficiencyPage',
  ),
})

const agencyAccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/agency-access',
  component: lazyRouteComponent(() => import('./agency-access-screen'), 'AgencyAccessPage'),
})

const agencyConsentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/agency-consents',
  component: lazyRouteComponent(() => import('./agency-consents-screen'), 'AgencyConsentsPage'),
})

const agencySettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/agency-settings',
  component: lazyRouteComponent(() => import('./agency-settings-screen'), 'AgencySettingsPage'),
})

const agencyPlanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/screen/agency-plan',
  component: lazyRouteComponent(() => import('./agency-plan-screen'), 'AgencyPlanPage'),
})

// ВХОД · пять экранов на одном каркасе. Правая панель одна на все:
// человек может попасть сюда с любого шага, и ответ ему нужен один и тот же.
const authScreenRoutes = (
  [
    ['/screen/login', 'LoginPage'],
    ['/screen/register', 'RegisterPage'],
    ['/screen/register-error', 'RegisterErrorPage'],
    ['/screen/forgot', 'ForgotPage'],
    ['/screen/new-password', 'NewPasswordPage'],
  ] as const
).map(([path, name]) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: lazyRouteComponent(() => import('./auth-screens'), name),
  }),
)

// БАЛАНС · деньги показаны движением, а не остатком: таблицу можно читать
// снизу вверх как выписку.
const balanceRoutes = (
  [
    ['/screen/balance', 'BalanceChargesPage'],
    ['/screen/balance-refunds', 'BalanceRefundsPage'],
  ] as const
).map(([path, name]) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: lazyRouteComponent(() => import('./balance-screens'), name),
  }),
)

// ПОДБОРКИ · публичная страница живёт вне кабинета: телефон на ней ровно
// один — агента. В этом вся её экономика.
const collectionRoutes = (
  [
    ['/screen/collections', 'CollectionsPage'],
    ['/screen/collection', 'CollectionInsidePage'],
    ['/screen/collection-public', 'PublicCollectionPage'],
    ['/screen/collection-off', 'CollectionOffPage'],
  ] as const
).map(([path, name]) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: lazyRouteComponent(() => import('./collections-screens'), name),
  }),
)

/**
 * Продуктовые адреса кабинета.
 *
 * До этого все экраны жили под `/screen/…` — это стенды для сверки с макетом,
 * а не продукт: по ним нельзя ходить, их нельзя дать человеку и нельзя
 * открыть в новой вкладке. Здесь те же экраны получают адреса, по которым
 * их зовут в жизни, и на них ссылается сайдбар.
 *
 * Стендовые адреса остаются: карта экранов ими пользуется, и по ним удобно
 * открывать состояния, которых в продукте ещё нет за отсутствием данных.
 */
// `const TPath` сохраняет литерал адреса: без него помощник стирает путь
// до `string`, маршрутизатор перестаёт знать список адресов, и переход
// по `/search` из кода перестаёт проверяться типами.
/**
 * Адреса, открытые всем.
 *
 * Всё остальное в продукте — кабинет, и туда без сеанса нельзя. Список
 * ведётся здесь, а не флагом у каждого маршрута: забытый флаг открывает
 * экран с деньгами агентства, а забытая строка в этом списке всего лишь
 * просит войти — ошибка в безопасную сторону.
 *
 * `/m/collections/client` открыт намеренно: это страница, которую агент
 * отправляет клиенту, и клиент в кабинет не входит.
 */
const PUBLIC = new Set<string>([
  '/register',
  '/register/error',
  '/forgot',
  '/new-password',
  '/confirm-code',
  '/check-mail',
  '/invite',
  '/access-closed',
  '/m/login',
  '/m/login/error',
  '/m/register',
  '/m/forgot',
  '/m/new-password',
  '/m/confirm-code',
  '/m/confirm-code/error',
  '/m/check-mail',
  '/m/invite',
  '/m/access-closed',
  '/m/collections/client',
  '/dialogs',
])

function productRoute<TModule extends Record<string, unknown>, const TPath extends string>(
  path: TPath,
  load: () => Promise<TModule>,
  name: keyof TModule & string,
) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path,
    /**
     * Экран, подходящий устройству, выбирается ДО отрисовки.
     *
     * Раньше это делал эффект после первого кадра — и дрался с охраной
     * кабинета, которая рисует переход на вход прямо во время отрисовки.
     * Двое переходов подряд перебрасывали управление друг другу, пока React
     * не останавливал это словами «Maximum update depth exceeded», и экран
     * оставался белым.
     */
    beforeLoad: () => {
      const twin = platformTwin(path)
      if (twin !== null) throw redirect({ to: twin, replace: true })

      /**
       * Дверь кабинета.
       *
       * Раньше охрана жила внутри каркаса `CabinetShell`, и разделы
       * агентства мимо неё проходили: `AgencyShell` — другой каркас. Без
       * сеанса там показывались чужие данные целиком. Теперь дверь стоит
       * на маршруте: мимо неё не пройти ни одному экрану.
       */
      if (!PUBLIC.has(path) && !hasSession()) {
        throw redirect({ to: loginPath(), search: { returnTo: undefined }, replace: true })
      }
    },
    component: lazyRouteComponent(load, name),
  })
}

const productRoutes = [
  /**
   * Главная кабинета — сохранённые поиски.
   *
   * Раньше вход вёл на «Сегодня». У агентства, созданного минуту назад,
   * этот экран пуст, и продукт начинался с пустоты. Теперь начинается
   * с вопроса «что вы ищете» и четырёх готовых ответов.
   */
  productRoute('/searches', () => import('./searches-screen'), 'SearchesPage'),
  productRoute('/today', () => import('./today-screen'), 'TodayScreenPage'),
  /**
   * Выдача помнит, куда вернуть курсор.
   *
   * `Esc` из прозвона и из карточки возвращает сюда, приложив адрес объекта
   * параметром `at`. Спека движения требует именно этого: «Esc возвращает
   * на то же место списка, а не на верх — иначе агент теряет позицию после
   * каждого звонка». На тридцатом звонке за смену это уже не мелочь.
   */
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/search',
    // Тип с необязательным ключом, а не `string | undefined`: иначе
    // маршрутизатор требует передавать `search` при каждом переходе
    // на выдачу, включая те девять мест, где возвращать некуда.
    //
    // `saved` — какой сохранённый поиск открыли. Условия при этом не едут
    // в адресе: они уже лежат в журнале работы, и дублировать их значило бы
    // завести второй источник правды, который разъедется с первым при первой
    // же правке условий.
    validateSearch: (search: Record<string, unknown>): { at?: string; saved?: string } => ({
      ...(typeof search.at === 'string' ? { at: search.at } : {}),
      ...(typeof search.saved === 'string' ? { saved: search.saved } : {}),
    }),
    component: lazyRouteComponent(() => import('./search-screen'), 'SearchScreenPage'),
  }),
  /**
   * Карточка объекта — того, на который нажали.
   *
   * Адрес уезжает параметром `at`. До этого карточка была одна на всю базу:
   * адрес стоял в ней константой, и все 260 строк выдачи вели в одну и ту же
   * квартиру. Тот же приём, что у выдачи выше, и по той же причине.
   */
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/object',
    validateSearch: (search: Record<string, unknown>): { at?: string } =>
      typeof search.at === 'string' ? { at: search.at } : {},
    component: lazyRouteComponent(() => import('./object-card-screen'), 'ObjectCardScreenPage'),
  }),
  /** Раскрытая карточка — того же объекта, за который заплатили. */
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/object/disclosed',
    validateSearch: (search: Record<string, unknown>): { at?: string } =>
      typeof search.at === 'string' ? { at: search.at } : {},
    component: lazyRouteComponent(
      () => import('./object-card-disclosed-screen'),
      'ObjectCardDisclosedPage',
    ),
  }),
  productRoute('/call', () => import('./call-mode-screen'), 'CallModeScreenPage'),
  productRoute('/balance', () => import('./balance-screens'), 'BalanceChargesPage'),
  productRoute('/balance/refunds', () => import('./balance-screens'), 'BalanceRefundsPage'),
  productRoute('/balance/top-ups', () => import('./balance-screens'), 'BalanceTopUpsPage'),
  productRoute('/balance/documents', () => import('./balance-screens'), 'BalanceDocumentsPage'),
  productRoute('/balance/top-up', () => import('./balance-screens'), 'BalanceTopUpPage'),
  productRoute('/collections', () => import('./collections-screens'), 'CollectionsPage'),
  productRoute('/collections/inside', () => import('./collections-screens'), 'CollectionInsidePage'),
  productRoute('/agency', () => import('./agency-efficiency-screen'), 'AgencyEfficiencyPage'),
  productRoute('/agency/staff', () => import('./agency-staff-screen'), 'AgencyStaffPage'),
  productRoute('/agency/invite', () => import('./agency-invite-screen'), 'AgencyInvitePage'),
  productRoute('/agency/staff/person', () => import('./agency-staff-screen'), 'AgencyPersonPage'),
  productRoute('/agency/refusals', () => import('./agency-refusals-screen'), 'AgencyRefusalsPage'),
  productRoute('/agency/access', () => import('./agency-access-screen'), 'AgencyAccessPage'),
  productRoute('/agency/consents', () => import('./agency-consents-screen'), 'AgencyConsentsPage'),
  productRoute('/agency/settings', () => import('./agency-settings-screen'), 'AgencySettingsPage'),
  productRoute('/agency/plan', () => import('./agency-plan-screen'), 'AgencyPlanPage'),
  productRoute('/profile', () => import('./profile-security-screen'), 'ProfilePage'),
  productRoute('/profile/login-policy', () => import('./profile-security-screen'), 'LoginPolicyPage'),
  productRoute('/dialogs', () => import('./dialog-screens'), 'DialogsPage'),
  // Первый вход. Адреса отдельные, а не состояние `/search`: эти экраны
  // человек видит один раз, и их надо уметь открыть по ссылке — и чтобы
  // показать владельцу, и чтобы проверить браузером.
  productRoute('/first-run/search', () => import('./first-run-screens'), 'FirstSearchPage'),
  productRoute('/first-run/agency', () => import('./first-run-screens'), 'AgencyEmptyPage'),
  productRoute('/first-run/employee', () => import('./first-run-screens'), 'SecondEmployeePage'),
]

/**
 * Продуктовый вход вместо шаблонного.
 *
 * `/login` и `/register` — это дверь, по которой человек приходит с сайта,
 * и она обязана быть нашей, а не шаблонной. Шаблонные страницы входа остаются
 * жить на своих адресах `/signup`, `/forgot-password`, `/reset-password`
 * до тех пор, пока за формами не появится настоящая отправка: они умеют
 * разговаривать с бэкендом, а наши пока только выглядят.
 *
 * То есть сейчас продуктовый экран красивый и мёртвый, а шаблонный
 * некрасивый и живой. Меняем их местами тогда, когда наш научится
 * отправлять форму, а не раньше.
 */
const authProductRoutes = [
  productRoute('/register', () => import('./auth-screens'), 'RegisterPage'),
  productRoute('/register/error', () => import('./auth-screens'), 'RegisterErrorPage'),
  productRoute('/forgot', () => import('./auth-screens'), 'ForgotPage'),
  productRoute('/new-password', () => import('./auth-screens'), 'NewPasswordPage'),
  productRoute('/confirm-code', () => import('./auth-more-screens'), 'ConfirmCodePage'),
  productRoute('/check-mail', () => import('./auth-more-screens'), 'CheckMailPage'),
  productRoute('/invite', () => import('./auth-more-screens'), 'InvitePage'),
  productRoute('/access-closed', () => import('./auth-more-screens'), 'AccessClosedPage'),
]


/**
 * Кабинет на телефоне.
 *
 * Адреса живут под `/m/`, а не подменяют десктопные по ширине окна: телефон
 * в «Сёрчи» — **не сжатый десктоп, а другой набор экранов**. У него своя
 * нижняя навигация из пяти вкладок вместо сайдбара, фильтры листом вместо
 * колонки, панель фиксации звонка кнопкой вместо второй колонки. Показывать
 * это по медиазапросу значило бы держать два интерфейса в одном дереве
 * и ломать оба при каждой правке.
 *
 * Отдельные адреса дают ещё одно: любой мобильный экран открывается ссылкой
 * рядом с кадром Pencil — иначе сверять их было бы нечем.
 */
const mobileRoutes = [
  productRoute('/m/today', () => import('./mobile-today-screens'), 'MobileTodayPage'),
  productRoute('/m/record', () => import('./mobile-today-screens'), 'MobileRecordPage'),
  productRoute('/m/list-loading', () => import('./mobile-today-screens'), 'MobileListLoadingPage'),
  productRoute('/m/results-loading', () => import('./mobile-today-screens'), 'MobileResultsLoadingPage'),
  productRoute('/m/filters', () => import('./mobile-today-screens'), 'MobileFiltersSheetPage'),

  /**
   * Прозвон на телефоне.
   *
   * Экран был собран, объявлен парой десктопного в `TWINS` — и НЕ имел
   * маршрута. То есть на телефоне прозвон физически не открывался: переход
   * с `/call` вёл на адрес, которого нет. Дыру нашла перепись кабинета,
   * а не глаз: она обходит все адреса подряд и спрашивает, открылся ли.
   */
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/m/call',
    validateSearch: (search: Record<string, unknown>): { at?: string } =>
      typeof search.at === 'string' ? { at: search.at } : {},
    beforeLoad: () => {
      if (!hasSession()) {
        throw redirect({ to: loginPath(), search: { returnTo: undefined }, replace: true })
      }
    },
    component: lazyRouteComponent(
      () => import('./mobile-call-screen'),
      'MobileCallScreenPage',
    ),
  }),
  /**
   * Выдача на телефоне.
   *
   * Экран был собран, пара объявлена в `TWINS` — маршрута не было. То есть
   * человек, открывший поиск с телефона, попадал на адрес, которого нет.
   * Это второй случай той же поломки после прозвона, и оба раза её нашла
   * не рука, а сверка: у КАЖДОГО адреса из пары обязан быть маршрут.
   * Проверка ниже теперь держит это правило.
   */
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/m/search',
    validateSearch: (search: Record<string, unknown>): { at?: string; saved?: string } => ({
      ...(typeof search.at === 'string' ? { at: search.at } : {}),
      ...(typeof search.saved === 'string' ? { saved: search.saved } : {}),
    }),
    beforeLoad: () => {
      if (!hasSession()) {
        throw redirect({ to: loginPath(), search: { returnTo: undefined }, replace: true })
      }
    },
    component: lazyRouteComponent(
      () => import('./mobile-search-screen'),
      'MobileSearchScreenPage',
    ),
  }),
  productRoute('/m/object', () => import('./mobile-object-screens'), 'MobileObjectPage'),
  productRoute('/m/object/before', () => import('./mobile-object-screens'), 'MobileObjectBeforePage'),
  productRoute('/m/object/similar', () => import('./mobile-object-screens'), 'MobileObjectSimilarPage'),
  productRoute('/m/similar', () => import('./mobile-object-screens'), 'MobileSimilarListPage'),
  productRoute('/m/taken', () => import('./mobile-object-screens'), 'MobileTakenByColleaguesPage'),

  productRoute('/m/balance', () => import('./mobile-balance-screens'), 'MobileBalancePage'),
  productRoute('/m/balance/refunds', () => import('./mobile-balance-screens'), 'MobileBalanceRefundsPage'),
  productRoute('/m/balance/top-ups', () => import('./mobile-balance-screens'), 'MobileBalanceTopUpsPage'),
  productRoute('/m/balance/documents', () => import('./mobile-balance-screens'), 'MobileBalanceDocumentsPage'),
  productRoute('/m/balance/top-up', () => import('./mobile-balance-screens'), 'MobileTopUpPage'),
  productRoute('/m/balance/refund', () => import('./mobile-balance-screens'), 'MobileRefundRequestPage'),

  productRoute('/m/agency', () => import('./mobile-agency-screens'), 'MobileAgencyPage'),
  productRoute('/m/agency/staff', () => import('./mobile-agency-screens'), 'MobileStaffPage'),
  productRoute('/m/agency/refusals', () => import('./mobile-agency-screens'), 'MobileRefusalsPage'),
  productRoute('/m/agency/access', () => import('./mobile-agency-screens'), 'MobileAccessLogPage'),
  productRoute('/m/agency/consents', () => import('./mobile-agency-screens'), 'MobileConsentsPage'),
  productRoute('/m/agency/settings', () => import('./mobile-agency-screens'), 'MobileAgencySettingsPage'),

  productRoute('/m/agency/person', () => import('./mobile-agency-people-screens'), 'MobilePersonPage'),
  productRoute('/m/agency/invite', () => import('./mobile-agency-people-screens'), 'MobileInviteAgentPage'),
  productRoute('/m/agency/plan', () => import('./mobile-agency-people-screens'), 'MobilePlanPage'),

  productRoute('/m/collections', () => import('./mobile-collections-screens'), 'MobileCollectionsPage'),
  productRoute('/m/collections/inside', () => import('./mobile-collections-screens'), 'MobileCollectionInsidePage'),
  productRoute('/m/collections/new', () => import('./mobile-collections-screens'), 'MobileNewCollectionPage'),
  productRoute('/m/collections/client', () => import('./mobile-collections-screens'), 'MobileClientCollectionPage'),

  productRoute('/m/more', () => import('./mobile-more-screens'), 'MobileMorePage'),
  productRoute('/m/profile', () => import('./mobile-more-screens'), 'MobileProfilePage'),
  productRoute('/m/notifications', () => import('./mobile-more-screens'), 'MobileNotificationSettingsPage'),
  productRoute('/m/notifications/center', () => import('./mobile-more-screens'), 'MobileNotificationCenterPage'),
  productRoute('/m/security', () => import('./mobile-more-screens'), 'MobileSecurityPage'),
  productRoute('/m/change-password', () => import('./mobile-more-screens'), 'MobileChangePasswordPage'),

  productRoute('/m/saved-searches', () => import('./mobile-search-extra-screens'), 'MobileSavedSearchesPage'),
  productRoute('/m/save-search', () => import('./mobile-search-extra-screens'), 'MobileSaveSearchPage'),
  productRoute('/m/global-search', () => import('./mobile-search-extra-screens'), 'MobileGlobalSearchPage'),
  productRoute('/m/bulk-disclosure', () => import('./mobile-search-extra-screens'), 'MobileBulkDisclosurePage'),
  productRoute('/m/bulk-panel', () => import('./mobile-search-extra-screens'), 'MobileBulkPanelPage'),
  productRoute('/m/push', () => import('./mobile-search-extra-screens'), 'MobilePushPage'),

  productRoute('/m/first-run/search', () => import('./mobile-first-run-screens'), 'MobileFirstSearchPage'),
  productRoute('/m/first-run/agency', () => import('./mobile-first-run-screens'), 'MobileAgencyCreatedPage'),
  productRoute('/m/first-run/employee', () => import('./mobile-first-run-screens'), 'MobileSecondEmployeePage'),

  productRoute('/m/login', () => import('./mobile-auth-screens'), 'MobileLoginPage'),
  productRoute('/m/login/error', () => import('./mobile-auth-screens'), 'MobileLoginErrorPage'),
  productRoute('/m/register', () => import('./mobile-auth-screens'), 'MobileRegisterPage'),
  productRoute('/m/forgot', () => import('./mobile-auth-screens'), 'MobileForgotPage'),
  productRoute('/m/new-password', () => import('./mobile-auth-screens'), 'MobileNewPasswordPage'),

  productRoute('/m/confirm-code', () => import('./mobile-auth-more-screens'), 'MobileConfirmCodePage'),
  productRoute('/m/confirm-code/error', () => import('./mobile-auth-more-screens'), 'MobileConfirmCodeErrorPage'),
  productRoute('/m/check-mail', () => import('./mobile-auth-more-screens'), 'MobileCheckMailPage'),
  productRoute('/m/invite', () => import('./mobile-auth-more-screens'), 'MobileInvitePage'),
  productRoute('/m/access-closed', () => import('./mobile-auth-more-screens'), 'MobileAccessClosedPage'),
]

/**
 * Что живёт всегда, а что только в разработке.
 *
 * **Продукт обязан существовать в собранной версии.** До этой правки все
 * девяносто с лишним экранов кабинета были завёрнуты в проверку «идёт ли
 * разработка» — и в собранной демонстрации их не существовало вовсе.
 * Человек, нажавший на лендинге «Создать агентство», попадал на адрес,
 * которого нет, и видел ошибку проверки сеанса вместо регистрации.
 *
 * Ловилось это только на сборке: в разработке всё было на месте, а сборка,
 * типы и тесты про мёртвый адрес ничего не знают.
 *
 * Стенды — `/screen/…`, полигон контролов и карта экранов — остаются
 * только в разработке. Они существуют, чтобы сверять экраны с макетом,
 * и людям, которым показывают продукт, там делать нечего.
 */
const productRouteTree = [
  ...productRoutes,
  ...mobileRoutes,
  ...authProductRoutes,
]

const standRoutes = [
  kitchenSinkRoute,
  searchScreenRoute,
  statesScreenRoute,
  mobileSearchRoute,
  objectCardRoute,
  objectCardDisclosedRoute,
  todayRoute,
  callModeRoute,
  mobileCallRoute,
  agencyRefusalsRoute,
  agencyStaffRoute,
  agencyEfficiencyRoute,
  agencyAccessRoute,
  agencyConsentsRoute,
  agencySettingsRoute,
  agencyPlanRoute,
  ...authScreenRoutes,
  ...balanceRoutes,
  ...collectionRoutes,
  screenMapRoute,
]

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  ...productRouteTree,
  ...(import.meta.env.DEV ? standRoutes : []),
  userWorkspaceRoute.addChildren([
    userHomeRoute,
    userProfileRoute,
    userSettingsRoute,
  ]),
  adminWorkspaceRoute.addChildren([
    adminDashboardRoute,
    adminUsersRoute,
    adminSettingsRoute,
  ]),
])

/**
 * Кабинет живёт во вложенной папке, а не на корне.
 *
 * Одна ссылка на весь продукт: лендинг на корне, кабинет под `/app/`.
 * Маршрутизатору надо сказать об этом отдельно — иначе он будет считать,
 * что `/app/search` это раздел `app`, а не корень кабинета, и покажет
 * страницу «не найдено» по любому адресу.
 *
 * Значение берётся из того же места, что и пути к скриптам, — из `base`
 * сборки. В разработке оно равно `/app/`, на GitHub Pages —
 * `/serch-demo/app/`. Хвостовой слэш маршрутизатор не любит, поэтому снят.
 */
const basepath = import.meta.env.BASE_URL.replace(/\/+$/, '')

export const router = createRouter({ routeTree, basepath })

function returnToSearch(search: Record<string, unknown>) {
  return {
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
