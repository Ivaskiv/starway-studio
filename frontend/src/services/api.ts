// frontend/src/services/api.ts
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { RootState } from '@/app/store';
import { clearAuth, setCredentials } from '@/features/auth/services/auth.slice';
import { TAG_TYPES } from '@/shared/types/tagTypes';
import { User } from '@/features/user/types/user.types';

// ── URL ───────────────────────────────────────────────────────────────────────
const getApiUrl = (): string => {
  if (import.meta.env.DEV) return '/api';
  return import.meta.env.VITE_API_URL ?? 'https://starway-backend.vercel.app/api';
};

// ── RAW BASE QUERY ────────────────────────────────────────────────────────────
// prepareHeaders читає токен зі store при КОЖНОМУ запиті —
// тому після dispatch(setCredentials) retry вже матиме новий токен
const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiUrl(),
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state    = getState() as RootState;
    const token    = state.auth.accessToken;
    const expertId = (state.auth.user as { expertId?: string } | null)?.expertId;
    if (token)    headers.set('Authorization', `Bearer ${token}`);
    if (expertId) headers.set('x-expert-id', expertId);
    return headers;
  },
});

// ── AUTH ENDPOINTS — не запускаємо refresh на них ─────────────────────────────
const AUTH_SKIP = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

// ── REFRESH LOCK — один refresh на всіх паралельних 401 ───────────────────────
let refreshLock: Promise<boolean> | null = null;

// ── BASE QUERY WITH REAUTH ────────────────────────────────────────────────────
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status !== 401) return result;
  const url = typeof args === 'string' ? args : args.url;
  if (AUTH_SKIP.has(url.split('?')[0])) {
    api.dispatch(clearAuth());
    return result;
  }
  if (!refreshLock) {
    refreshLock = (async (): Promise<boolean> => {
      const r = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST' },
        api,
        extraOptions,
      );
      if (r.data) {
        const { accessToken, user } = r.data as {
          accessToken: string;
          user: User;
        };
        api.dispatch(setCredentials({ user, accessToken }));
        return true;
      }
      api.dispatch(clearAuth());
      return false;
    })();
  }
  const ok = await refreshLock;
  refreshLock = null;
  if (ok) result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

// ── RTK QUERY INSTANCE ────────────────────────────────────────────────────────
export const api = createApi({
  reducerPath: 'api',
  baseQuery:   baseQueryWithReauth,
  tagTypes:    TAG_TYPES,
  endpoints:   () => ({}),
});

export default api;
