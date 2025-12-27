// packages/frontend/src/services/api.ts

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

// API URL з .env або fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Custom base query з автоматичним logout при 401
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  
  const baseQuery = fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers) => {
      // Автоматично додаємо токен до кожного запиту
      const token = localStorage.getItem('starway_auth_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  });

  // Виконуємо запит
  const result = await baseQuery(args, api, extraOptions);

  // Якщо 401 - автоматично розлогінюємо
  if (result.error && result.error.status === 401) {
    localStorage.removeItem('starway_auth_token');
    window.location.href = '/auth';
  }

  return result;
};

// ЄДИНИЙ API для всього проекту
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  
  // Всі можливі теги для кешування
  tagTypes: [
    'User',      // Користувачі
    'Funnel',    // Воронки
    'MiniApp',   // Мініапки
    'AI',        // AI генерація
    'Product',   // Продукти
    'Analytics', // Аналітика
  ],
  
  // Endpoints додаються через injectEndpoints у інших файлах
  endpoints: () => ({}),
});