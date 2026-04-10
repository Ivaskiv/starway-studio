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

export const ROUTES = {
  // ==========================================
  // PUBLIC ROUTES
  // ==========================================
  HOME: '/',
  LOGIN: '/login',
  TELEGRAM_SUCCESS: '/auth/telegram/success',
  ONBOARDING_START: '/onboarding/start',
  ONBOARDING_CONTINUE: '/onboarding/continue',
  AI_FUNNEL_LANDING: '/',
  HELP: '/help',
  PRODUCT_INFO_BASE: '/products',
  RESET_PASSWORD: '/reset-password',
  MINIAPP: '/miniapp',
  
  // ==========================================
  // DASHBOARD
  // ==========================================
  DASHBOARD: '/dashboard',
  
  // ==========================================
  // AI MENTOR ECOSYSTEM
  // ==========================================
  AI_MENTOR: '/dashboard/ai-mentor',
  MENTOR_LANDING: '/dashboard/mentor/landing',
  MENTOR_SETUP: '/dashboard/mentor/setup',
  MENTOR_WORKSPACE: '/dashboard/mentor/workspace',
  
  // ==========================================
  // CORE MODULES (FREE + TRIAL)
  // ==========================================
  WHEEL: '/dashboard/wheel',
  WHEEL_START: '/wheel/start',
  CYCLE: '/dashboard/cycle',         // Daily cycle
  PROGRESS: '/dashboard/progress',   // Analytics
  JOURNAL: '/dashboard/journal',
  CALENDAR: '/dashboard/calendar',
  MICROTASKS: '/dashboard/microtasks',
  TASKS: '/dashboard/tasks',
  STREAK: '/dashboard/streak',       // Streak tracker
  
  // ==========================================
  // ADVANCED MODULES (PAID)
  // ==========================================
  VISION: '/dashboard/vision',
  GOALS: '/dashboard/goals',
  ACTIONS: '/dashboard/actions',
  ZOOM: '/dashboard/zoom',
  CONSULTATION: '/dashboard/consultation',
  MENTORSHIP: '/dashboard/mentorship',
  COURSES: '/dashboard/courses',
  
  // ==========================================
  // USER & SETTINGS
  // ==========================================
  PROFILE: '/dashboard/profile',
  SETTINGS: '/dashboard/settings',
  SUBSCRIPTION: '/dashboard/subscription',
  NOTIFICATIONS: '/dashboard/notifications',
  
  // ==========================================
  // PRODUCTS & MARKETPLACE
  // ==========================================
  PRODUCTS: '/dashboard/products',
  PRODUCT_CREATION: '/dashboard/product-create',
  AI_GENERATOR: '/dashboard/products',
  AI_FUNNEL_BUILDER: '/dashboard/products',
  AI_PRODUCER_CONSOLE: '/dashboard/products',
  AI_PRODUCER_ASSISTANT: '/dashboard/products',
  ADMIN_ROLES: '/dashboard/admin/roles',
  ADMIN_STUDIO: '/dashboard/admin/studio',
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
export const ROUTE_METADATA: Record<RoutePath, {
  title: string;
  description?: string;
  requiresAuth: boolean;
  requiresPaid: boolean;
}> = {
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
  '/auth/telegram/success': {
    title: 'Telegram success',
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
  '/products': {
    title: 'Продукти Starway',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/dashboard': {
    title: 'Кабінет',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/ai-mentor': {
    title: 'ABsystem',
    description: 'Менторський простір для досягнення цілей',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/mentor/landing': {
    title: 'ABsystem - Вітання',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/mentor/setup': {
    title: 'ABsystem - Налаштування',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/mentor/workspace': {
    title: 'ABsystem - Робоча область',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/wheel': {
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
  '/dashboard/cycle': {
    title: 'Щоденний цикл',
    description: 'Фіксація стану та виборів',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/progress': {
    title: 'Прогрес',
    description: 'Аналітика та статистика',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/journal': {
    title: 'Журнал',
    description: 'Календар активностей і системних подій',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/calendar': {
    title: 'Календар',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/microtasks': {
    title: 'Мікрозавдання',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/tasks': {
    title: 'Мікрозавдання',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/streak': {
    title: 'Streak',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/vision': {
    title: 'Точка Б',
    description: 'Сформуйте вашу точку Б',
    requiresAuth: true,
    requiresPaid: true,
  },
  '/dashboard/goals': {
    title: 'Цілі',
    requiresAuth: true,
    requiresPaid: true,
  },
  '/dashboard/actions': {
    title: 'Дії',
    requiresAuth: true,
    requiresPaid: true,
  },
  '/dashboard/zoom': {
    title: 'Zoom-сесії',
    requiresAuth: true,
    requiresPaid: true,
  },
  '/dashboard/consultation': {
    title: 'Консультації',
    requiresAuth: true,
    requiresPaid: true,
  },
  '/dashboard/mentorship': {
    title: 'Менторство',
    requiresAuth: true,
    requiresPaid: true,
  },
  '/dashboard/courses': {
    title: 'Курси',
    requiresAuth: true,
    requiresPaid: true,
  },
  '/dashboard/profile': {
    title: 'Профіль',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/settings': {
    title: 'Налаштування',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/notifications': {
    title: 'Повідомлення',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/subscription': {
    title: 'Підписка',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/products': {
    title: 'Продукти',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/product-create': {
    title: 'Створення продукту',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/admin/roles': {
    title: 'Управління ролями',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/admin/studio': {
    title: 'Master Panel',
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
