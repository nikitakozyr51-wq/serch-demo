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
import { RouteError, RoutePending } from './route-fallbacks'

const rootRoute = createRootRoute({
  component: RootLayout,
  /**
   * Неверный адрес показывает продукт, а не строительные леса.
   *
   * Стояла заготовка из шаблона: «Page not found» по-английски, с кнопкой
   * «Return to workspace» и проверкой сеанса на сервере, которого у кабинета
   * нет. Без сервера она к тому же падала в англоязычную карточку про
   * сессию — то есть человек, ошибившийся в адресе, видел чужую вёрстку
   * на чужом языке.
   */
  notFoundComponent: lazyRouteComponent(
    () => import('./auth-more-screens'),
    'NotFoundScreen',
  ),
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
  getParentRoute: () => cabinetLayoutRoute,
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
  // Стенд мобильной выдачи — ребёнок мобильного каркаса, как и продуктовая
  // вкладка: нижнюю навигацию теперь рисует каркас, и без него стенд мерил
  // бы экран без неё. Кадр `waJiE` нарисован С навигацией.
  getParentRoute: () => mobileLayoutRoute,
  path: '/screen/mobile',
  // Стенд показывает три замеренные строки и только их: снимок для сверки
  // обязан быть одинаковым сегодня и через месяц. Продуктовый `/m/search`
  // показывает всю базу.
  component: lazyRouteComponent(
    () => import('./mobile-search-stand'),
    'MobileSearchStandPage',
  ),
})

// КАБИНЕТ · Карточка объекта — до раскрытия. Экран, отвечающий на один
// вопрос: звонить или нет. Собран как доказательство, а не как паспорт.
const objectCardRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
  path: '/screen/object',
  component: lazyRouteComponent(
    () => import('./object-card-screen'),
    'ObjectCardScreenPage',
  ),
})

// Парная карточка: что человек получает за 199 ₽. Отдельный маршрут,
// потому что в файле это отдельный экран, а не состояние первого.
const objectCardDisclosedRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
  path: '/screen/object-disclosed',
  component: lazyRouteComponent(
    () => import('./object-card-disclosed-screen'),
    'ObjectCardDisclosedPage',
  ),
})

// КАБИНЕТ · Сегодня. Рабочий день агента: с чего начать, что подвисло
// и что нового пришло по сохранённым поискам.
const todayRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
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
  getParentRoute: () => cabinetLayoutRoute,
  path: '/screen/agency-refusals',
  component: lazyRouteComponent(
    () => import('./agency-refusals-screen'),
    'AgencyRefusalsPage',
  ),
})

const agencyStaffRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
  path: '/screen/agency-staff',
  component: lazyRouteComponent(() => import('./agency-staff-screen'), 'AgencyStaffPage'),
})

// Экран руководителя: куда уходят деньги агентства. Первым идёт не метрика,
// а простой — он единственный говорит, что можно сделать сегодня.
const agencyEfficiencyRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
  path: '/screen/agency-efficiency',
  component: lazyRouteComponent(
    () => import('./agency-efficiency-screen'),
    'AgencyEfficiencyPage',
  ),
})

const agencyAccessRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
  path: '/screen/agency-access',
  component: lazyRouteComponent(() => import('./agency-access-screen'), 'AgencyAccessPage'),
})

const agencyConsentsRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
  path: '/screen/agency-consents',
  component: lazyRouteComponent(() => import('./agency-consents-screen'), 'AgencyConsentsPage'),
})

const agencySettingsRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
  path: '/screen/agency-settings',
  component: lazyRouteComponent(() => import('./agency-settings-screen'), 'AgencySettingsPage'),
})

const agencyPlanRoute = createRoute({
  getParentRoute: () => cabinetLayoutRoute,
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
  // Тупик протухшего приглашения и отключённая подборка открыты БЕЗ входа.
  // Человек с мёртвой ссылкой в кабинет не входил, а клиент подборки —
  // не сотрудник агентства вовсе. Без этого охрана уведёт обоих на вход,
  // и экран, объясняющий, что случилось, не увидит никто.
  // У истёкшего сеанса сеанса нет по определению: без этой строки охрана
  // уведёт человека на вход, и экран, объясняющий, что случилось,
  // не покажется никогда.
  '/session-expired',
  '/m/session-expired',
  '/invite/expired',
  '/m/invite/expired',
  '/m/collections/off',
  '/dialogs',
])

function productRoute<TModule extends Record<string, unknown>, const TPath extends string>(
  path: TPath,
  load: () => Promise<TModule>,
  name: keyof TModule & string,
  /**
   * Что экран читает из адреса.
   *
   * Почти всем экранам это не нужно, поэтому необязательно. Нужно ровно
   * там, где адрес несёт данные: ключ приглашения, адрес объекта, номер
   * сохранённого поиска.
   */
  extra?: { validateSearch: (search: Record<string, unknown>) => Record<string, unknown> },
) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path,
    ...(extra ?? {}),
    /**
     * Экран, подходящий устройству, выбирается ДО отрисовки.
     *
     * Раньше это делал эффект после первого кадра — и дрался с охраной
     * кабинета, которая рисует переход на вход прямо во время отрисовки.
     * Двое переходов подряд перебрасывали управление друг другу, пока React
     * не останавливал это словами «Maximum update depth exceeded», и экран
     * оставался белым.
     */
    beforeLoad: guardOf(path),
    component: lazyRouteComponent(load, name),
  })
}

/**
 * Выбор экрана по устройству и дверь кабинета — одной проверкой.
 *
 * Вынесено из `productRoute`, потому что ровно то же самое нужно экранам
 * под каркасом кабинета (`cabinetRoute` ниже). Две копии этой проверки
 * разъехались бы на первом же новом публичном адресе.
 */
function guardOf(path: string) {
  return () => {
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
  }
}

/**
 * Безадресный слой кабинета: шапка, боковое меню, палитра.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * У него нет своего адреса — только `id`. Он существует ровно затем, чтобы
 * у всех экранов кабинета появился ОБЩИЙ родитель, который между переходами
 * не меняется. Пока родителя не было, каждый переход менял тип компонента
 * в одной позиции дерева, и React сносил кабинет целиком — вместе с шапкой,
 * меню и счётчиком денег. Это и была «дёрганность».
 *
 * Подробности и следствия — в `features/cabinet/CabinetFrame.tsx`
 * и в законе движения `docs/MOTION.md`.
 */
const cabinetLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'cabinet',
  // Через общий вход раздела, а не напрямую в файл: правило границ модулей
  // держит проверка `architecture:check`, и обойти её значило бы завести
  // первую зависимость от внутренностей чужого раздела.
  component: lazyRouteComponent(() => import('./features/cabinet'), 'CabinetFrame'),
})

/**
 * Безадресный слой мобильного кабинета: тело и нижняя навигация.
 *
 * Та же операция, что у десктопного каркаса, и по той же причине: навигация
 * была вмонтирована в каждый экран и умирала на каждом переключении вкладки.
 * Подробности — в `features/cabinet/MobileFrame.tsx`.
 */
const mobileLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'mobile',
  component: lazyRouteComponent(() => import('./features/cabinet'), 'MobileFrame'),
})

/** Экран одной из пяти мобильных вкладок: рисуется внутри общего каркаса. */
function mobileTabRoute<TModule extends Record<string, unknown>, const TPath extends string>(
  path: TPath,
  load: () => Promise<TModule>,
  name: keyof TModule & string,
  extra?: { validateSearch: (search: Record<string, unknown>) => Record<string, unknown> },
) {
  return createRoute({
    getParentRoute: () => mobileLayoutRoute,
    path,
    ...(extra ?? {}),
    beforeLoad: guardOf(path),
    component: lazyRouteComponent(load, name),
  })
}

/**
 * Экран, который рисуется ВНУТРИ каркаса кабинета.
 *
 * Отличается от `productRoute` ровно одним — родителем. Всё остальное
 * (выбор экрана по устройству, дверь, ленивая загрузка) общее.
 *
 * Такие экраны больше не несут `<CabinetShell>` сами: каркас теперь этажом
 * выше, а экран отдаёт только своё тело.
 */
function cabinetRoute<TModule extends Record<string, unknown>, const TPath extends string>(
  path: TPath,
  load: () => Promise<TModule>,
  name: keyof TModule & string,
  extra?: { validateSearch: (search: Record<string, unknown>) => Record<string, unknown> },
) {
  return createRoute({
    getParentRoute: () => cabinetLayoutRoute,
    path,
    ...(extra ?? {}),
    beforeLoad: guardOf(path),
    component: lazyRouteComponent(load, name),
  })
}

/**
 * Экраны кабинета — все под одним каркасом.
 *
 * Массив целиком становится детьми `cabinetLayoutRoute`, поэтому шапка,
 * боковое меню и палитра между этими адресами не пересобираются.
 *
 * Полноэкранный прозвон сюда не входит: у него нет ни шапки, ни меню
 * по решению файла, и общий каркас ему только мешал бы.
 */
const cabinetRoutes = [
  /**
   * Главная кабинета — сохранённые поиски.
   *
   * Раньше вход вёл на «Сегодня». У агентства, созданного минуту назад,
   * этот экран пуст, и продукт начинался с пустоты. Теперь начинается
   * с вопроса «что вы ищете» и четырёх готовых ответов.
   */
  cabinetRoute('/searches', () => import('./searches-screen'), 'SearchesPage'),
  cabinetRoute('/today', () => import('./today-screen'), 'TodayScreenPage'),
  /**
   * Выдача помнит, куда вернуть курсор.
   *
   * `Esc` из прозвона и из карточки возвращает сюда, приложив адрес объекта
   * параметром `at`. Спека движения требует именно этого: «Esc возвращает
   * на то же место списка, а не на верх — иначе агент теряет позицию после
   * каждого звонка». На тридцатом звонке за смену это уже не мелочь.
   */
  createRoute({
    getParentRoute: () => cabinetLayoutRoute,
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
    getParentRoute: () => cabinetLayoutRoute,
    path: '/object',
    validateSearch: (search: Record<string, unknown>): { at?: string } =>
      typeof search.at === 'string' ? { at: search.at } : {},
    component: lazyRouteComponent(() => import('./object-card-screen'), 'ObjectCardScreenPage'),
  }),
  /** Раскрытая карточка — того же объекта, за который заплатили. */
  createRoute({
    getParentRoute: () => cabinetLayoutRoute,
    path: '/object/disclosed',
    validateSearch: (search: Record<string, unknown>): { at?: string } =>
      typeof search.at === 'string' ? { at: search.at } : {},
    component: lazyRouteComponent(
      () => import('./object-card-disclosed-screen'),
      'ObjectCardDisclosedPage',
    ),
  }),
  cabinetRoute('/balance', () => import('./balance-screens'), 'BalanceChargesPage'),
  cabinetRoute('/balance/refunds', () => import('./balance-screens'), 'BalanceRefundsPage'),
  cabinetRoute('/balance/top-ups', () => import('./balance-screens'), 'BalanceTopUpsPage'),
  cabinetRoute('/balance/documents', () => import('./balance-screens'), 'BalanceDocumentsPage'),
  cabinetRoute('/balance/top-up', () => import('./balance-screens'), 'BalanceTopUpPage'),
  cabinetRoute('/collections', () => import('./collections-screens'), 'CollectionsPage'),
  cabinetRoute('/collections/inside', () => import('./collections-screens'), 'CollectionInsidePage'),
  cabinetRoute('/agency', () => import('./agency-efficiency-screen'), 'AgencyEfficiencyPage'),
  cabinetRoute('/agency/staff', () => import('./agency-staff-screen'), 'AgencyStaffPage'),
  cabinetRoute('/agency/invite', () => import('./agency-invite-screen'), 'AgencyInvitePage'),
  cabinetRoute('/agency/staff/person', () => import('./agency-staff-screen'), 'AgencyPersonPage'),
  cabinetRoute('/agency/refusals', () => import('./agency-refusals-screen'), 'AgencyRefusalsPage'),
  cabinetRoute('/agency/access', () => import('./agency-access-screen'), 'AgencyAccessPage'),
  cabinetRoute('/agency/consents', () => import('./agency-consents-screen'), 'AgencyConsentsPage'),
  cabinetRoute('/agency/settings', () => import('./agency-settings-screen'), 'AgencySettingsPage'),
  cabinetRoute('/agency/plan', () => import('./agency-plan-screen'), 'AgencyPlanPage'),
  cabinetRoute('/profile', () => import('./profile-security-screen'), 'ProfilePage'),
  cabinetRoute('/profile/login-policy', () => import('./profile-security-screen'), 'LoginPolicyPage'),
  // Первый вход. Адреса отдельные, а не состояние `/search`: эти экраны
  // человек видит один раз, и их надо уметь открыть по ссылке — и чтобы
  // показать владельцу, и чтобы проверить браузером.
  cabinetRoute('/first-run/search', () => import('./first-run-screens'), 'FirstSearchPage'),
  cabinetRoute('/first-run/agency', () => import('./first-run-screens'), 'AgencyEmptyPage'),
  cabinetRoute('/first-run/employee', () => import('./first-run-screens'), 'SecondEmployeePage'),
]

/**
 * Экраны без каркаса кабинета.
 *
 * Прозвон занимает окно целиком — ни шапки, ни бокового меню: агент идёт
 * по списку подряд, и всё, что уводит в сторону, из кадра убрано. Так
 * нарисовано в файле, и общий каркас здесь был бы прямым нарушением.
 */
const fullScreenRoutes = [
  productRoute('/call', () => import('./call-mode-screen'), 'CallModeScreenPage'),
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
  /**
   * Приём приглашения.
   *
   * Ключ приходит в адресе: `/invite?token=…`. Без него экран остаётся
   * на месте, но принимать нечего — и он говорит об этом прямо, вместо
   * того чтобы завести человеку пустое агентство и оставить приглашение
   * висеть непринятым.
   *
   * Телефонный двойник `/m/invite` подставляется тем же `productRoute`,
   * поэтому маршрут собирается им, а не голым `createRoute`.
   */
  /**
   * Ссылка приглашения истекла — тупик, у которого есть выход.
   *
   * Живёт своим адресом, а не состоянием `/invite`: человек приходит
   * по ссылке из письма, и ссылка либо рабочая, либо нет. Показывать
   * ему форму приёма, которая всё равно откажет, значит заставить
   * заполнить её впустую.
   */
  /**
   * Три тупика на двух платформах: нет прав, нет связи, сеанс истёк.
   *
   * Свои адреса, а не состояния чужих экранов: на каждый из трёх человека
   * приводит разная причина, и объяснять её посреди чужого экрана значит
   * прятать объяснение.
   */
  productRoute('/no-rights', () => import('./dead-end-screens'), 'NoRightsPage'),
  productRoute('/m/no-rights', () => import('./dead-end-screens'), 'MobileNoRightsPage'),
  productRoute('/offline', () => import('./dead-end-screens'), 'OfflinePage'),
  productRoute('/m/offline', () => import('./dead-end-screens'), 'MobileOfflinePage'),
  productRoute('/session-expired', () => import('./dead-end-screens'), 'SessionExpiredPage'),
  productRoute('/m/session-expired', () => import('./dead-end-screens'), 'MobileSessionExpiredPage'),
  productRoute('/m/object/delisted', () => import('./mobile-object-screens'), 'MobileObjectDelistedPage'),
  productRoute('/m/object/duplicates', () => import('./mobile-object-screens'), 'MobileDuplicatesPage'),
  productRoute('/invite/expired', () => import('./invite-expired-screens'), 'InviteExpiredPage'),
  productRoute('/m/invite/expired', () => import('./invite-expired-screens'), 'MobileInviteExpiredPage'),
  productRoute('/m/collections/off', () => import('./mobile-collections-screens'), 'MobileCollectionOffPage'),
  productRoute('/invite', () => import('./auth-more-screens'), 'InvitePage', {
    validateSearch: (search: Record<string, unknown>): { token?: string } =>
      typeof search.token === 'string' ? { token: search.token } : {},
  }),
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
  /**
   * Запись исхода на телефоне знает, о каком объекте речь.
   *
   * Без параметра экран записывал бы звонок «вообще»: адрес — это ключ
   * записи в журнале, и без него исход некуда положить.
   */
  productRoute('/m/record', () => import('./mobile-today-screens'), 'MobileRecordPage', {
    validateSearch: (search: Record<string, unknown>): { at?: string } =>
      typeof search.at === 'string' ? { at: search.at } : {},
  }),
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
  /**
   * Карточка объекта на телефоне — того, на который нажали.
   *
   * Параметр тот же, что у компьютерной карточки, и по той же причине:
   * без него все строки выдачи вели в одну и ту же квартиру. На телефоне
   * это стоило дороже — там в одну квартиру вёл ещё и прозвон.
   */
  productRoute('/m/object', () => import('./mobile-object-screens'), 'MobileObjectPage', {
    validateSearch: (search: Record<string, unknown>): { at?: string } =>
      typeof search.at === 'string' ? { at: search.at } : {},
  }),
  productRoute('/m/object/before', () => import('./mobile-object-screens'), 'MobileObjectBeforePage', {
    validateSearch: (search: Record<string, unknown>): { at?: string } =>
      typeof search.at === 'string' ? { at: search.at } : {},
  }),
  productRoute('/m/object/similar', () => import('./mobile-object-screens'), 'MobileObjectSimilarPage'),
  productRoute('/m/similar', () => import('./mobile-object-screens'), 'MobileSimilarListPage'),
  productRoute('/m/taken', () => import('./mobile-object-screens'), 'MobileTakenByColleaguesPage'),

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

  productRoute('/m/collections/inside', () => import('./mobile-collections-screens'), 'MobileCollectionInsidePage'),
  productRoute('/m/collections/new', () => import('./mobile-collections-screens'), 'MobileNewCollectionPage'),
  productRoute('/m/collections/client', () => import('./mobile-collections-screens'), 'MobileClientCollectionPage'),

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
  /**
   * Кабинет — одним поддеревом под общим каркасом.
   *
   * Это и есть та самая правка, из-за которой шапка и боковое меню перестают
   * пересобираться при смене раздела: у всех экранов кабинета общий родитель,
   * и совпадение этого родителя между переходами сохраняется.
   */
  ...fullScreenRoutes,
  ...mobileRoutes,
  ...authProductRoutes,
]

/**
 * Доска диалогов — стенд, а не страница продукта.
 *
 * Она показывает восемь окон карточками в колонку, чтобы их можно было
 * сверить с файлом рядом. Человеку в кабинете смотреть там нечего: каждое
 * из этих окон он встречает на своём месте и по своему действию.
 *
 * До этой правки доска уезжала в сборку как обычный адрес и была открыта
 * без входа. Семь «мёртвых кнопок» переписи сидели именно на ней — карточки
 * окон нажимаются, но ведут в никуда, потому что это витрина, а не работа.
 */
const dialogsStandRoute = productRoute(
  '/dialogs',
  () => import('./dialog-screens'),
  'DialogsPage',
)

/**
 * Стенды, которые показывают экран КАБИНЕТА.
 *
 * Они обязаны нести тот же каркас, что продукт: в Pencil эти кадры нарисованы
 * целиком — 1440 с шапкой 56 и боковым меню 240, — и стенд без каркаса меряет
 * не тот экран. Проверка это и поймала: карточка объекта на стенде вышла
 * шириной 1440 вместо 1200, когда каркас переехал на маршруты.
 */
const cabinetStandRoutes = [
  searchScreenRoute,
  objectCardRoute,
  objectCardDisclosedRoute,
  todayRoute,
  agencyRefusalsRoute,
  agencyStaffRoute,
  agencyEfficiencyRoute,
  agencyAccessRoute,
  agencyConsentsRoute,
  agencySettingsRoute,
  agencyPlanRoute,
]

/** Стенды вне кабинета: полигон, состояния, телефон, прозвон, карта экранов. */
const standRoutes = [
  dialogsStandRoute,
  kitchenSinkRoute,
  statesScreenRoute,
  callModeRoute,
  mobileCallRoute,
  ...authScreenRoutes,
  ...balanceRoutes,
  ...collectionRoutes,
  screenMapRoute,
]


/**
 * Пять мобильных вкладок — дети общего каркаса.
 *
 * Вынесены из общего списка мобильных маршрутов не по смыслу, а по родителю:
 * нижняя навигация живёт в каркасе, и только эти пять её показывают.
 * Внутренние экраны телефона остаются детьми корня и несут навигацию сами.
 */
const mobileTabRoutes = [
  mobileSearchRoute,
  mobileTabRoute('/m/today', () => import('./mobile-today-screens'), 'MobileTodayPage'),
  mobileTabRoute('/m/balance', () => import('./mobile-balance-screens'), 'MobileBalancePage'),
  mobileTabRoute('/m/collections', () => import('./mobile-collections-screens'), 'MobileCollectionsPage'),
  mobileTabRoute('/m/more', () => import('./mobile-more-screens'), 'MobileMorePage'),
  createRoute({
    getParentRoute: () => mobileLayoutRoute,
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
]

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  /**
   * Кабинет — одним поддеревом под общим каркасом.
   *
   * Собирается здесь, а не в `productRouteTree`, только потому, что стенды
   * кабинета объявлены ниже по файлу: порядок объявлений, а не смысл.
   */
  /**
   * Мобильные вкладки — своим поддеревом под своим каркасом.
   *
   * Нижняя навигация живёт в нём и переживает переключение вкладки.
   */
  mobileLayoutRoute.addChildren(mobileTabRoutes),
  cabinetLayoutRoute.addChildren([
    ...cabinetRoutes,
    // Стенды кабинета — тоже его дети: иначе они рисуются без шапки и меню
    // и меряют не тот экран, который нарисован в файле.
    ...(import.meta.env.DEV ? cabinetStandRoutes : []),
  ]),
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

/**
 * Маршрутизатор с нарисованными состояниями загрузки и срыва.
 *
 * Экраны едут отдельными кусками кода, и у этой езды два исхода, которые
 * до сих пор не были нарисованы: пока едет — было пусто, не доехало —
 * вылетала ошибка. Оба разобраны в `route-fallbacks.tsx`.
 *
 * `defaultPendingMs` 150 — то же число, что у скелетона выдачи, и по той же
 * причине: переход быстрее полутора десятых секунды человек читает как
 * мгновенный, и «загружаю» на нём только мигает. `defaultPendingMinMs` 300
 * держит показанное состояние, чтобы оно не мелькнуло и не исчезло, —
 * мигание раздражает сильнее самой задержки.
 */
export const router = createRouter({
  routeTree,
  basepath,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultPendingMs: 150,
  defaultPendingMinMs: 300,
})

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
