import type {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { RootState } from '@/app/store';
import { clearAuth, setCredentials } from '@/features/auth/services/auth.slice';
import { getRefreshToken, hasSessionHint } from '@/features/auth/services/token';
import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp';
import type { User } from '@/features/user/types/user.types';
import { TAG_TYPES } from '@/app/tagTypes';

type ApiTagType = (typeof TAG_TYPES)[number];

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<string | number | boolean | null | undefined>;

type QueryParams = Record<string, QueryValue>;

type RefreshResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

type AuthUserWithExpert = User & {
  expertId?: string | null;
};

type ApiMode = 'auto' | 'local' | 'remote';

const DEFAULT_REMOTE_API_URL = 'https://starway-backend.vercel.app/api';

const getApiMode = (): ApiMode => {
  const rawMode = import.meta.env.VITE_API_MODE?.trim().toLowerCase();
  if (rawMode === 'local' || rawMode === 'remote') return rawMode;
  return 'auto';
};

const normalizeApiBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_REMOTE_API_URL;
  if (/\/api$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api`;
};

const getApiBaseUrl = (): string => {
  const mode = getApiMode();
  const remoteApiUrl =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    import.meta.env.VITE_API_URL?.trim() ||
    DEFAULT_REMOTE_API_URL;
  const remoteUrl = normalizeApiBaseUrl(remoteApiUrl);

  if (mode === 'local') return '/api';
  if (mode === 'remote') return remoteUrl;
  if (import.meta.env.DEV) return '/api';
  return remoteUrl;
};

const API_MODE = getApiMode();
const API_BASE_URL = getApiBaseUrl();

export const resolveApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL === '/api') return `/api${normalizedPath}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const getTelegramMiniAppAuthHeader = () => {
  if (typeof window === 'undefined') return null;

  const initData = (window as {
    Telegram?: {
      WebApp?: {
        initData?: string
      }
    }
  }).Telegram?.WebApp?.initData?.trim();

  if (!initData) return null;
  return `tma ${initData}`;
};

function logAuthTrace(event: string, data: Record<string, unknown> = {}): void {
  if (!import.meta.env.DEV) return;
  console.info('[AUTH_TRACE]', {
    event,
    at: new Date().toISOString(),
    ...data,
  });
}

function canProbeCookieSessionWithoutTokens(): boolean {
  if (typeof window === 'undefined') return false;
  const hasTelegramInitData = Boolean(
    (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData?.trim(),
  );
  return hasSessionHint() || hasTelegramInitData;
}

console.info('[api] configuration', {
  mode: API_MODE,
  baseUrl: API_BASE_URL,
});

const REFRESH_IGNORED_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/social',
  '/auth/telegram',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

const NO_REFRESH_URLS = [
  '/telegram/status',
  '/analytics/stats',
  '/user/state',
  '/access/me',
  '/access/state',
  '/products/my',
  '/trial/status',
  '/wheel/latest',
  '/wheel/cooldown',
];

const getAuthUser = (state: RootState): AuthUserWithExpert | null =>
  (state.auth.user as AuthUserWithExpert | null) ?? null;

const getAccessToken = (state: RootState): string | null => state.auth.accessToken ?? null;

const getExpertId = (state: RootState): string | null => getAuthUser(state)?.expertId ?? null;

const getRequestPath = (args: string | FetchArgs): string => {
  const rawUrl = typeof args === 'string' ? args : args.url;
  const [pathWithoutQuery] = rawUrl.split('?');

  if (pathWithoutQuery.startsWith('http://') || pathWithoutQuery.startsWith('https://')) {
    try {
      return new URL(pathWithoutQuery).pathname;
    } catch {
      return pathWithoutQuery;
    }
  }

  return pathWithoutQuery.startsWith('/') ? pathWithoutQuery : `/${pathWithoutQuery}`;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const accessToken = getAccessToken(state);
    const expertId = getExpertId(state);
    const skipAccessToken = headers.get('x-skip-access-token') === '1';
    const miniAppAuthHeader = getTelegramMiniAppAuthHeader()
    const isMiniAppRuntime =
      typeof window !== 'undefined' && isTelegramMiniApp(window.location.pathname)

    if (skipAccessToken) {
      headers.delete('x-skip-access-token');
    }

    if (miniAppAuthHeader && isMiniAppRuntime) {
      headers.set('Authorization', miniAppAuthHeader)
    } else if (accessToken && !skipAccessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    } else {
      if (miniAppAuthHeader) {
        headers.set('Authorization', miniAppAuthHeader)
      }
    }

    if (expertId) {
      headers.set('x-expert-id', expertId);
    }

    return headers;
  },
});

type RawBaseQueryResult = Awaited<ReturnType<typeof rawBaseQuery>>;

let refreshPromise: Promise<boolean> | null = null;
let telegramMiniAppRecoveryPromise: Promise<boolean> | null = null;

const refreshAccessToken = async (
  api: BaseQueryApi,
  extraOptions: object,
): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  const refreshArgs = refreshToken
    ? {
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
        headers: { 'x-refresh-token': refreshToken },
      }
    : {
        url: '/auth/refresh',
        method: 'POST',
      };

  if (!refreshToken && import.meta.env.DEV) {
    console.info('[api] trying cookie-only refresh');
  }

  const refreshResponse = await rawBaseQuery(
    refreshArgs,
    api,
    extraOptions,
  );

  if (refreshResponse.data) {
    const { accessToken, refreshToken, user } = refreshResponse.data as RefreshResponse;
    api.dispatch(setCredentials({ user, accessToken, refreshToken }));
    logAuthTrace('refreshFinished', { ok: true, unauthorizedSource: null });
    return true;
  }
  const refreshStatus = (refreshResponse.error as { status?: unknown } | undefined)?.status;
  const isDefinitiveAuthFailure = refreshStatus === 401 || refreshStatus === 403;
  if (isDefinitiveAuthFailure) {
    // FIX 2026-05-25: clear auth only on definitive refresh auth failure.
    api.dispatch(clearAuth());
    logAuthTrace('refreshFinished', { ok: false, unauthorizedSource: 'refresh_unauthorized', status: refreshStatus });
    return false;
  }
  // FIX 2026-05-25: preserve local session on transient network/backend failures.
  logAuthTrace('refreshFinished', { ok: false, unauthorizedSource: 'refresh_transient', status: refreshStatus });
  return false;
};

const getTelegramMiniAppInitData = (): string => {
  if (typeof window === 'undefined') return '';

  return (window as {
    Telegram?: {
      WebApp?: {
        initData?: string;
      };
    };
  }).Telegram?.WebApp?.initData?.trim() ?? '';
};

const isTelegramMiniAppRuntime = (): boolean =>
  isTelegramMiniApp() && Boolean(getTelegramMiniAppInitData());

const recoverTelegramMiniAppSession = async (
  api: BaseQueryApi,
  extraOptions: object,
): Promise<boolean> => {
  const initData = getTelegramMiniAppInitData();
  if (!initData || !isTelegramMiniAppRuntime()) {
    return false;
  }

  if (!telegramMiniAppRecoveryPromise) {
    telegramMiniAppRecoveryPromise = (async () => {
      const socialResponse = await rawBaseQuery(
        {
          url: '/auth/telegram',
          method: 'POST',
          headers: {
            'x-skip-access-token': '1',
          },
          body: { initData },
        },
        api,
        extraOptions,
      );

      if (!socialResponse.data) {
        return false;
      }

      const socialData = socialResponse.data as Partial<RefreshResponse> & { refreshToken?: string };
      const socialUser = socialData.user ?? null;
      const socialToken = typeof socialData.accessToken === 'string' ? socialData.accessToken : null;
      const socialRefreshToken = typeof socialData.refreshToken === 'string' ? socialData.refreshToken : undefined;

      if (!socialUser || !socialToken) {
        return false;
      }

      api.dispatch(setCredentials({ user: socialUser, accessToken: socialToken, refreshToken: socialRefreshToken }));
      return true;
    })().finally(() => {
      telegramMiniAppRecoveryPromise = null;
    });
  }

  return telegramMiniAppRecoveryPromise;
};

const runWithSingleRefresh = async (
  api: BaseQueryApi,
  extraOptions: object,
): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(api, extraOptions).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  object,
  FetchBaseQueryMeta
> = async (args, api, extraOptions): Promise<RawBaseQueryResult> => {
  const requestPathForLog = getRequestPath(args);
  const isDnaRequest =
    requestPathForLog.includes('/ai/sales-assistant') ||
    requestPathForLog.includes('/admin/content-studio');
  if (isDnaRequest && import.meta.env.DEV) {
    console.log('[DNA][api] request', { path: requestPathForLog });
  }
  let result = await rawBaseQuery(args, api, extraOptions);

  if (isDnaRequest && result.error) {
    console.error('[DNA][api] error', { path: requestPathForLog, status: (result.error as { status?: unknown }).status });
  }

  const responseStatus = (result.error as { status?: unknown } | undefined)?.status
  const isAuthFailure = responseStatus === 401 || responseStatus === 403

  if (!isAuthFailure) {
    return result;
  }

  const requestPath = getRequestPath(args);
  if (REFRESH_IGNORED_PATHS.has(requestPath)) {
    if (requestPath === '/auth/refresh') {
      api.dispatch(clearAuth());
    }
    return result;
  }

  if (NO_REFRESH_URLS.some(path => requestPath.includes(path))) {
    return result;
  }

  if (responseStatus === 403 && !isTelegramMiniAppRuntime()) {
    return result;
  }

  const state = api.getState() as RootState;
  const accessToken = getAccessToken(state);
  const refreshToken = getRefreshToken();
  const allowCookieSessionProbe = canProbeCookieSessionWithoutTokens();

  logAuthTrace('routeGuardTriggered', {
    tokenFound: Boolean(accessToken || refreshToken),
    refreshStarted: true,
    unauthorizedSource: requestPath,
  });

  if (!accessToken && !refreshToken && !allowCookieSessionProbe) {
    // FIX 2026-05-25: keep hard clear only when no recoverable hints exist.
    api.dispatch(clearAuth());
    logAuthTrace('logoutReason', { reason: 'no_tokens_no_recovery_hint', path: requestPath });
    return result;
  }

  const didRefresh = await runWithSingleRefresh(api, extraOptions);
  if (!didRefresh) {
    const didTelegramRecover = await recoverTelegramMiniAppSession(api, extraOptions);
    if (didTelegramRecover) {
      result = await rawBaseQuery(args, api, extraOptions);
      return result;
    }

    if (!accessToken && !refreshToken) {
      api.dispatch(clearAuth());
      logAuthTrace('logoutReason', { reason: 'cookie_probe_failed', path: requestPath });
    }
    return result;
  }

  result = await rawBaseQuery(args, api, extraOptions);
  return result;
};

export const buildGetQuery = <TArg = void>(
  url: string | ((arg: TArg) => string),
  options?: {
    params?: (arg: TArg) => QueryParams | undefined;
  },
) => {
  return (arg: TArg): string | FetchArgs => {
    const resolvedUrl = typeof url === 'function' ? url(arg) : url;
    const params = options?.params?.(arg);

    if (!params) {
      return resolvedUrl;
    }

    return {
      url: resolvedUrl,
      params,
    };
  };
};

export const buildPostMutation = <TBody>(
  url: string | ((body: TBody) => string),
) => {
  return (body: TBody): FetchArgs => ({
    url: typeof url === 'function' ? url(body) : url,
    method: 'POST',
    body,
  });
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: TAG_TYPES,
  keepUnusedDataFor: 300,
  refetchOnFocus: false,
  refetchOnReconnect: false,
  endpoints: () => ({}),
});

type ExampleStatusResponse = {
  ok: boolean;
  timestamp: string;
};

type ExampleCreateRequest = {
  name: string;
};

type ExampleCreateResponse = {
  id: string;
  name: string;
  createdAt: string;
};

export const coreApi = api.injectEndpoints({
  endpoints: builder => ({
    getSystemStatus: builder.query<ExampleStatusResponse, void>({
      query: buildGetQuery('/system/status'),
      providesTags: ['User' satisfies ApiTagType],
    }),
    createSystemItem: builder.mutation<ExampleCreateResponse, ExampleCreateRequest>({
      query: buildPostMutation('/system/items'),
      invalidatesTags: ['User' satisfies ApiTagType],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSystemStatusQuery,
  useCreateSystemItemMutation,
} = coreApi;

export type {
  ApiTagType,
  QueryParams,
  QueryValue,
  ExampleStatusResponse,
  ExampleCreateRequest,
  ExampleCreateResponse,
};

export {
  API_BASE_URL,
  REFRESH_IGNORED_PATHS,
};

export default api;
