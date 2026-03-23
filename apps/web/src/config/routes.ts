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
  AI_FUNNEL_LANDING: '/ai-funnel',
  HELP: '/help',
  PRODUCT_INFO_BASE: '/products',
  RESET_PASSWORD: '/reset-password',
  
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
  
  // ==========================================
  // PRODUCTS & MARKETPLACE
  // ==========================================
  PRODUCTS: '/dashboard/products',
  PRODUCT_CREATION: '/dashboard/product-create',
  AI_GENERATOR: '/dashboard/ai-generator',
  AI_FUNNEL_BUILDER: '/dashboard/ai-funnel',
  AI_PRODUCER_CONSOLE: '/dashboard/ai-producer-console',
  AI_PRODUCER_ASSISTANT: '/producer/assistant',
  ADMIN_ROLES: '/dashboard/admin/roles',
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
  '/ai-funnel': {
    title: 'AI Funnel Landing',
    requiresAuth: false,
    requiresPaid: false,
  },
  '/dashboard': {
    title: 'Кабінет',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/ai-mentor': {
    title: 'AI Ментор',
    description: 'Інтелектуальний асистент для досягнення цілей',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/mentor/landing': {
    title: 'AI Ментор - Вітання',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/mentor/setup': {
    title: 'AI Ментор - Налаштування',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/mentor/workspace': {
    title: 'AI Ментор - Робоча область',
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
  '/dashboard/streak': {
    title: 'Streak',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/vision': {
    title: 'Бачення життя',
    description: 'Визначте вашу точку Б',
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
  '/dashboard/ai-generator': {
    title: 'AI Генератор',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/ai-funnel': {
    title: 'AI Воронка',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/ai-producer-console': {
    title: 'AI Producer Console',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/dashboard/admin/roles': {
    title: 'Управління ролями',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/producer/assistant': {
    title: 'AI Producer Assistant',
    requiresAuth: true,
    requiresPaid: false,
  },
  '/reset-password': {
    title: 'Скидання пароля',
    requiresAuth: false,
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
    ROUTES.AI_FUNNEL_LANDING,
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
    ROUTES.AI_GENERATOR,
    ROUTES.AI_FUNNEL_BUILDER,
    ROUTES.AI_PRODUCER_CONSOLE,
    ROUTES.AI_PRODUCER_ASSISTANT,
  ],
} as const;
