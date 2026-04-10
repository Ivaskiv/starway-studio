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
import type { User } from '@/features/user/types/user.types';
import { TAG_TYPES } from '@/app/tagTypes';
import { getTelegramMiniAppAuthHeader } from '@/lib/miniapp/apiClient';

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

const getApiBaseUrl = (): string => {
  const mode = getApiMode();
  const remoteUrl = import.meta.env.VITE_API_URL?.trim() || DEFAULT_REMOTE_API_URL;

  if (mode === 'local') return '/api';
  if (mode === 'remote') return remoteUrl;
  if (import.meta.env.DEV) return '/api';
  return remoteUrl;
};

const API_MODE = getApiMode();
const API_BASE_URL = getApiBaseUrl();

console.info('[api] configuration', {
  mode: API_MODE,
  baseUrl: API_BASE_URL,
});

const REFRESH_IGNORED_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

const NO_REFRESH_URLS = [
  '/telegram/status',
  '/analytics/stats',
  '/user/state',
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

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    } else {
      const miniAppAuthHeader = getTelegramMiniAppAuthHeader()
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

const refreshAccessToken = async (
  api: BaseQueryApi,
  extraOptions: object,
): Promise<boolean> => {
  const refreshResponse = await rawBaseQuery(
    {
      url: '/auth/refresh',
      method: 'POST',
    },
    api,
    extraOptions,
  );

  if (refreshResponse.data) {
    const { accessToken, user } = refreshResponse.data as RefreshResponse;
    api.dispatch(setCredentials({ user, accessToken }));
    return true;
  }

  api.dispatch(clearAuth());
  return false;
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
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) {
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

  const state = api.getState() as RootState;
  if (!getAccessToken(state)) {
    api.dispatch(clearAuth());
    return result;
  }

  const didRefresh = await runWithSingleRefresh(api, extraOptions);
  if (!didRefresh) {
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
