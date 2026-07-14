// frontend/src/config/routes.ts

/**
 * 🗺️ ЦЕНТРАЛІЗОВАНА КОНФІГУРАЦІЯ РОУТІВ
 * Single source of truth для всіх шляхів в додатку
 * 
 * Чому це потрібно:
 * - Type-safe навігація (TypeScript перевірить опечатки)
 * - Легко змінити шлях в одному місці
 * - Консистентність між menu.ts та App.tsx
 */

export const ROUTE_NAMESPACES = {
  APP: '/app',
  MINIAPP: '/miniapp',
  ADMIN: '/admin',
} as const

export function toAppRoutePath(path: string): string {
  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    return `${ROUTE_NAMESPACES.APP}${path}`
  }

  return path
}

export function normalizeDashboardRoutePath(path: string): string {
  if (path === ROUTE_NAMESPACES.APP) {
    return '/dashboard'
  }

  if (path.startsWith(`${ROUTE_NAMESPACES.APP}/dashboard`)) {
    return path.slice(ROUTE_NAMESPACES.APP.length)
  }

  return path
}

export const ROUTES = {
  // ==========================================
  // PUBLIC ROUTES
  // ==========================================
  HOME: '/',
  LOGIN: '/login',
  PRICING: '/pricing',
  TELEGRAM_SUCCESS: '/auth/telegram/success',
  MAGIC_LOGIN: '/auth/magic',
  ONBOARDING_START: '/onboarding/start',
  ONBOARDING_CONTINUE: '/onboarding/continue',
  AI_FUNNEL_LANDING: '/',
  HELP: '/help',
  AB_TEST: '/ab-test',
  AB_TEST_QUIZ: '/ab-test/quiz',
  WELCOME_TEST: '/welcome-test',
  PRODUCT_INFO_BASE: '/products',
  RESET_PASSWORD: '/reset-password',
  APP: ROUTE_NAMESPACES.APP,
  MINIAPP: ROUTE_NAMESPACES.MINIAPP,
  ADMIN: ROUTE_NAMESPACES.ADMIN,
  
  // ==========================================
  // DASHBOARD
  // ==========================================
  DASHBOARD: toAppRoutePath('/dashboard'),
  
  // ==========================================
  // AI MENTOR ECOSYSTEM
  // ==========================================
  AI_MENTOR: toAppRoutePath('/dashboard/ai-mentor'),
  MENTOR_LANDING: toAppRoutePath('/dashboard/mentor/landing'),
  MENTOR_SETUP: toAppRoutePath('/dashboard/mentor/setup'),
  MENTOR_WORKSPACE: toAppRoutePath('/dashboard/mentor/workspace'),
  
  // ==========================================
  // CORE MODULES (FREE + TRIAL)
  // ==========================================
  WHEEL: toAppRoutePath('/dashboard/wheel'),
  WHEEL_START: '/wheel/start',
  CYCLE: toAppRoutePath('/dashboard/cycle'),         // Daily cycle
  PROGRESS: toAppRoutePath('/dashboard/progress'),   // Analytics
  JOURNAL: toAppRoutePath('/dashboard/journal'),
  CALENDAR: toAppRoutePath('/dashboard/calendar'),
  MICROTASKS: toAppRoutePath('/dashboard/microtasks'),
  TASKS: toAppRoutePath('/dashboard/tasks'),
  STREAK: toAppRoutePath('/dashboard/streak'),       // Streak tracker
  
  // ==========================================
  // ADVANCED MODULES (PAID)
  // ==========================================
  VISION: toAppRoutePath('/dashboard/vision'),
  GOALS: toAppRoutePath('/dashboard/goals'),
  ACTIONS: toAppRoutePath('/dashboard/actions'),
  ZOOM: toAppRoutePath('/dashboard/zoom'),
  CONSULTATION: toAppRoutePath('/dashboard/consultation'),
  MENTORSHIP: toAppRoutePath('/dashboard/mentorship'),
  COURSES: toAppRoutePath('/dashboard/courses'),
  
  // ==========================================
  // USER & SETTINGS
  // ==========================================
  PROFILE: toAppRoutePath('/dashboard/profile'),
  SETTINGS: toAppRoutePath('/dashboard/settings'),
  SUBSCRIPTION: toAppRoutePath('/dashboard/subscription'),
  NOTIFICATIONS: toAppRoutePath('/dashboard/notifications'),
  
  // ==========================================
  // PRODUCTS & MARKETPLACE
  // ==========================================
  PRODUCTS: toAppRoutePath('/dashboard/products'),
  PRODUCT_CREATION: toAppRoutePath('/dashboard/product-create'),
  AI_GENERATOR: toAppRoutePath('/dashboard/products'),
  AI_FUNNEL_BUILDER: toAppRoutePath('/dashboard/products'),
  AI_PRODUCER_CONSOLE: toAppRoutePath('/dashboard/products'),
  AI_PRODUCER_ASSISTANT: toAppRoutePath('/dashboard/products'),
  ADMIN_ROLES: toAppRoutePath('/dashboard/admin/roles'),
  ADMIN_STUDIO: toAppRoutePath('/dashboard/admin/studio'),
  DEV_ROUTES: '/dev/routes',

} as const;

/**
 * Type для всіх можливих шляхів
 */
export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];

/**
 * Helper для перевірки чи шлях існує
 */
export function isValidRoute(path: string): path is RoutePath {
  return Object.values(ROUTES).includes(path as RoutePath);
}

/**
 * Метадата для роутів (для хлібних крихт, SEO, тощо)
 */
type RouteMeta = {
  title: string;
  description?: string;
  requiresAuth: boolean;
  requiresPaid: boolean;
}

export const ROUTE_METADATA: Record<string, RouteMeta> & Record<RoutePath, RouteMeta> = {
  '/': {
    title: 'Головна',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/login': {
    title: 'Вхід',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/pricing': {
    title: 'Ціни',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/auth/telegram/success': {
    title: 'Telegram success',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/auth/magic': {
    title: 'Magic login',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/onboarding/start': {
    title: 'Початок системи',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/onboarding/continue': {
    title: 'Продовження після Telegram',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/help': {
    title: 'Допомога',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/ab-test': {
    title: 'AB Test Landing',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/ab-test/result': {
    title: 'AB Test Result',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/test': {
    title: 'AB Test Quiz',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/test/result': {
    title: 'AB Test Result',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/ab-test/quiz': {
    title: 'AB Test Quiz',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/products': {
    title: 'Продукти Starway',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/app': {
    title: 'App',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/admin': {
    title: 'Admin',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.DASHBOARD]: {
    title: 'Кабінет',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.AI_MENTOR]: {
    title: 'ABsystem',
    description: 'Менторський простір для досягнення цілей',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.MENTOR_LANDING]: {
    title: 'ABsystem - Вітання',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.MENTOR_SETUP]: {
    title: 'ABsystem - Налаштування',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.MENTOR_WORKSPACE]: {
    title: 'ABsystem - Робоча область',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.WHEEL]: {
    title: 'Колесо балансу',
    description: 'Оцініть баланс життєвих сфер',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/wheel/start': {
    title: 'Wheel Start',
    description: 'Стартовий екран колеса балансу',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.CYCLE]: {
    title: 'Щоденний цикл',
    description: 'Фіксація стану та виборів',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.PROGRESS]: {
    title: 'Прогрес',
    description: 'Аналітика та статистика',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.JOURNAL]: {
    title: 'Журнал',
    description: 'Календар активностей і системних подій',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.CALENDAR]: {
    title: 'Календар',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.MICROTASKS]: {
    title: 'Мікрозавдання',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.TASKS]: {
    title: 'Мікрозавдання',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.STREAK]: {
    title: 'Streak',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.VISION]: {
    title: 'Точка Б',
    description: 'Сформуйте вашу точку Б',
    requiresAuth: true,
    requiresPaid: true,
  },
  [ROUTES.GOALS]: {
    title: 'Цілі',
    requiresAuth: true,
    requiresPaid: true,
  },
  [ROUTES.ACTIONS]: {
    title: 'Дії',
    requiresAuth: true,
    requiresPaid: true,
  },
  [ROUTES.ZOOM]: {
    title: 'Zoom-сесії',
    requiresAuth: true,
    requiresPaid: true,
  },
  [ROUTES.CONSULTATION]: {
    title: 'Консультації',
    requiresAuth: true,
    requiresPaid: true,
  },
  [ROUTES.MENTORSHIP]: {
    title: 'Менторство',
    requiresAuth: true,
    requiresPaid: true,
  },
  [ROUTES.COURSES]: {
    title: 'Курси',
    requiresAuth: true,
    requiresPaid: true,
  },
  [ROUTES.PROFILE]: {
    title: 'Профіль',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.SETTINGS]: {
    title: 'Налаштування',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.NOTIFICATIONS]: {
    title: 'Повідомлення',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.SUBSCRIPTION]: {
    title: 'Підписка',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.PRODUCTS]: {
    title: 'Продукти',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.PRODUCT_CREATION]: {
    title: 'Створення продукту',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.ADMIN_ROLES]: {
    title: 'Управління ролями',
    requiresAuth: true,
    requiresPaid: false,
  },
  [ROUTES.ADMIN_STUDIO]: {
    title: 'Master Panel',
    requiresAuth: true,
    requiresPaid: false,
  },
  [toAppRoutePath('/dashboard/admin/revenue')]: {
    title: 'Аналітика',
    requiresAuth: true,
    requiresPaid: false,
  },
  [toAppRoutePath('/dashboard/admin/transfer-ownership')]: {
    title: 'Transfer Ownership',
    requiresAuth: true,
    requiresPaid: false,
  },
  [toAppRoutePath('/dashboard/telegram')]: {
    title: 'Telegram',
    requiresAuth: true,
    requiresPaid: false,
  },
  [toAppRoutePath('/dashboard/students')]: {
    title: 'Користувачі',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/reset-password': {
    title: 'Скидання пароля',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/miniapp': {
    title: 'Mini App',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dev/routes': {
    title: 'Routes QA',
    requiresAuth: false,
    requiresPaid: false,
  },
};

/**
 * Групування роутів за категоріями (для меню)
 */
export const ROUTE_GROUPS = {
  public: [
    ROUTES.HOME,
    ROUTES.HELP,
  ],
  dashboard: [
    ROUTES.DASHBOARD,
  ],
  core: [
    ROUTES.WHEEL,
    ROUTES.CYCLE,
    ROUTES.PROGRESS,
    ROUTES.STREAK,
  ],
  mentor: [
    ROUTES.AI_MENTOR,
    ROUTES.MENTOR_LANDING,
    ROUTES.MENTOR_SETUP,
    ROUTES.MENTOR_WORKSPACE,
  ],
  advanced: [
    ROUTES.VISION,
    ROUTES.GOALS,
    ROUTES.ACTIONS,
    ROUTES.ZOOM,
    ROUTES.CONSULTATION,
    ROUTES.MENTORSHIP,
    ROUTES.COURSES,
  ],
  user: [
    ROUTES.PROFILE,
    ROUTES.SETTINGS,
    ROUTES.SUBSCRIPTION,
  ],
  marketplace: [
    ROUTES.PRODUCTS,
  ],
} as const;
