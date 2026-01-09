// packages/frontend/src/services/api.ts
// services/api.ts (базовий API)

import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

// Custom base query з автоматичним logout при 401
const baseQueryWithReauth: BaseQueryFn<string | 
FetchArgs, unknown, FetchBaseQueryError> = 
async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('starway_auth_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  const result = await baseQuery(args, api, extraOptions);

  // Автоматичний logout при 401
  if (result.error && result.error.status === 401) {
    localStorage.removeItem('starway_auth_token');
  }

  return result;
};

// Базовий API - endpoints додаються через injectEndpoints
// packages/frontend/src/services/api.ts

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    // ============ CORE ENTITIES ============
    'User',              // Користувачі (super_admin, funnel_admin, user)
    'Funnel',            // Воронки
    'Product',           // Продукти (курси, навчання)
    'MiniApp',           // Telegram Mini Apps / Web Apps
    
    // ============ CONTENT & STRUCTURE ============
    'Step',              // Кроки воронки (послідовність)
    'Block',             // Блоки контенту (текст, відео, завдання)
    'Module',            // Модулі курсу (групи уроків)
    'Lesson',            // Уроки/лекції
    'Task',              // Завдання для користувачів
    'Quiz',              // Квізи/тести
    
    // ============ AI GENERATION ============
    'AI',                // AI генерація (промпти, аналіз)
    'AIAnalysis',        // AI аналіз воронок
    'AIPrompt',          // Збережені промпти користувачів
    'AITemplate',        // AI шаблони для генерації
    
    // ============ ANALYTICS & TRACKING ============
    'Analytics',         // Загальна аналітика
    'Conversion',        // Конверсії по воронках
    'Engagement',        // Залученість користувачів
    'Retention',         // Утримання користувачів
    'Revenue',           // Фінансова аналітика
    'ABTest',            // A/B тестування
    
    // ============ GAMIFICATION ============
    'Achievement',       // Досягнення (badges)
    'Level',             // Рівні користувачів
    'Points',            // Бали/очки
    'Leaderboard',       // Таблиця лідерів
    'Streak',            // Серії (щоденна активність)
    'Reward',            // Винагороди
    'Challenge',         // Виклики/челенджі
    
    // ============ PROGRESS & STATE ============
    'UserProgress',      // Прогрес користувача по курсу
    'StepProgress',      // Прогрес по кроках
    'LessonProgress',    // Прогрес по урокам
    'Completion',        // Завершені елементи
    'Bookmark',          // Закладки користувача
    'Note',              // Нотатки користувача
    
    // ============ INTEGRATIONS ============
    'TelegramBot',       // Telegram бот налаштування
    'TelegramChannel',   // Telegram канали
    'SocialMedia',       // Інші соцмережі (Instagram, Facebook)
    'Payment',           // Платіжні системи (WayForPay, LiqPay)
    'Email',             // Email інтеграції (SendPulse)
    'Webhook',           // Webhook налаштування
    'API',               // Зовнішні API інтеграції
    
    // ============ USER MANAGEMENT ============
    'Subscription',      // Підписки користувачів
    'Access',            // Права доступу
    'Invitation',        // Запрошення користувачів
    'Team',              // Команди (для колаборації)
    'Role',              // Ролі користувачів
    
    // ============ CONTENT DELIVERY ============
    'Notification',      // Сповіщення
    'Message',           // Повідомлення (чат-боти)
    'Email',             // Email розсилки
    'Schedule',          // Розклад публікацій
    'Automation',        // Автоматизації (тригери)
    
    // ============ MONETIZATION ============
    'Pricing',           // Тарифні плани
    'Coupon',            // Промокоди
    'Transaction',       // Транзакції
    'Invoice',           // Рахунки
    'Refund',            // Повернення коштів
    
    // ============ SETTINGS & CONFIG ============
    'Setting',           // Налаштування системи
    'Theme',             // Теми оформлення
    'Template',          // Шаблони воронок
    'Blueprint',         // Блюпринти (готові рішення)
    'WhiteLabel',        // White-label налаштування
    
    // ============ MEDIA & ASSETS ============
    'Media',             // Медіа файли (зображення, відео)
    'File',              // Файли користувачів
    'Avatar',            // Аватари
    
    // ============ FEEDBACK & SUPPORT ============
    'Review',            // Відгуки
    'Rating',            // Рейтинги
    'Comment',           // Коментарі
    'Support',           // Тікети підтримки
    'FAQ',               // Часті питання
    
    // ============ SYSTEM ============
    'Log',               // Логи системи
    'Error',             // Помилки
    'Backup',            // Бекапи
    'Chat',
    'Stats', 
    'Funnels', 
    'Users',
    'AIMentor',
    'Wheel',
     'Profile',
    'Sessions',
    'Gamification',
    'Goals',
    'Weekly',
    'Monthly',
    'Metrics',
    'Courses',
    'Notifications',
    'Subscription',
  ],
  endpoints: () => ({}),
});



