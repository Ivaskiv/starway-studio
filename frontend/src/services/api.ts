// frontend/src/services/api.ts
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/app/store';
import { clearAuth, setCredentials } from '@/features/auth/services/auth.slice';
import { TAG_TYPES } from '@/shared/types/tagTypes';


/* ===============================
   API URL
================================ */
const getApiUrl = (): string => {
  if (import.meta.env.DEV) {
    console.log('[API Config] Development mode - using proxy: /api');
    return '/api';
  }
  const url = import.meta.env.VITE_API_URL || 'https://starway-backend.vercel.app/api';
  console.log('[API Config] Production URL:', url);
  return url;
};
/* ===============================
   BASE QUERY
================================ */
const baseQuery = fetchBaseQuery({
  baseUrl: getApiUrl(),
  credentials: 'include', // refresh cookie
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token = state.auth.accessToken;
    const expertId = (state.auth.user as { expertId?: string } | null)?.expertId;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (expertId) {
      headers.set('x-expert-id', expertId);
    }

    return headers;
  },
});

/* ===============================
   BASE QUERY WITH REAUTH
================================ */
let isRefreshing = false;
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // ── Якщо не 401 — повертаємо одразу ──────────────
  if (result.error?.status !== 401) {
    return result;
  }

  // ── 401 отримано ─────────────────────────────────
  const url         = typeof args === 'string' ? args : args.url;
  if(
    url.startsWith('/auth/login') || 
    url.startsWith('/auth/register') || 
    url.startsWith('/auth/refresh') ||
    url.startsWith('/auth/forgot-password') ||
    url.startsWith('/auth/reset-password')
  ){
    api.dispatch(clearAuth());
    return result;
  }
  if (isRefreshing) {
    return result;
  }

  isRefreshing = true; 
  try {
    const refreshResult = await baseQuery(
      { url: '/auth/refresh', method: 'POST' },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      // ✅ Refresh успішний
      const { accessToken, user } = refreshResult.data as { 
        accessToken: string; 
        user: any };
      console.log('[API] ✅ Refresh successful');
      api.dispatch(setCredentials({ user, accessToken }));

      // Повторюємо оригінальний запит з новим токеном
      result = await baseQuery(args, api, extraOptions);
      console.log('[API] ✅ Original request retried');

    } else {
      // Refresh провалився — logout
      console.log('[API] ❌ Refresh failed — logging out');
      api.dispatch(clearAuth());
    }
  } finally {
    isRefreshing = false;
  }

  return result;
};

/* ===============================
   RTK API
================================ */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
});

export default api;
