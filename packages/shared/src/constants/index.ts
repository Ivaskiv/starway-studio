// shared/src/constants/index.ts

export * from './roles';
export * from './permissions';
export * from './errors';

// Додаткові константи
export const APP_NAME = 'Starway Studio';
export const APP_VERSION = '1.0.0';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Tokens
export const ACCESS_TOKEN_EXPIRY = '15m'; // 15 хвилин
export const REFRESH_TOKEN_EXPIRY = '7d'; // 7 днів
export const EMAIL_VERIFICATION_TOKEN_EXPIRY = '24h'; // 24 години
export const PASSWORD_RESET_TOKEN_EXPIRY = '1h'; // 1 година

// Rate limiting
export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 хвилин
export const RATE_LIMIT_MAX_REQUESTS = 100; // 100 запитів

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// AI Mentor
export const WHEEL_OF_LIFE_CATEGORIES = [
  'Здоров\'я',
  'Кар\'єра',
  'Фінанси',
  'Відносини',
  'Родина',
  'Особистий розвиток',
  'Дозвілля',
  'Духовність'
];

export const MORNING_QUESTIONS = [
  'Як ти спав сьогодні?',
  'Що ти плануєш сьогодні досягти?',
  'Який твій настрій та рівень енергії?',
  'Які 3 найважливіші завдання на сьогодні?'
];

export const EVENING_QUESTIONS = [
  'Що вдалося досягти сьогодні?',
  'Що було найкращим у цьому дні?',
  'Що можна було зробити краще?',
  'За що ти вдячний сьогодні?',
  'Який твій настрій зараз?'
];

// Gamification
export const POINTS_PER_LEVEL = 1000;
export const STREAK_BONUS_MULTIPLIER = 1.5;

export const BADGE_RARITIES = {
  common: { color: '#9CA3AF', multiplier: 1 },
  rare: { color: '#3B82F6', multiplier: 2 },
  epic: { color: '#8B5CF6', multiplier: 3 },
  legendary: { color: '#F59E0B', multiplier: 5 }
};