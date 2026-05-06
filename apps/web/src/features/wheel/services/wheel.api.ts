import {
  CreateWheelAssessmentInput,
  WheelAnalysis,
  WheelAssessment,
  type WheelSphereId,
  WHEEL_CATEGORIES,
  isWheelSphereId,
  normalizeWheelAnalysis,
  normalizeWheelAssessment,
} from '@/features/wheel/types/wheel.types';
import { api } from '@/services/api';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

type WheelCooldown = {
  canFill: boolean;
  regenCount: number;
  regenLeft: number;
  nextWheelAt: string | null;
  lastWheelAt: string | null;
};

type WheelHistoryResponse = {
  success: boolean;
  count: number;
  wheels: unknown[];
};

type WheelScoreMap = Partial<Record<WheelSphereId, { score: number; note?: string; comment?: string }>>;

type ResultWithStatus = {
  status?: number | string
}

function getCategoryId(value: unknown) {
  return isWheelSphereId(value) ? value : null
}

function getResultStatus(value: unknown) {
  return value && typeof value === 'object'
    ? Reflect.get(value, 'status')
    : undefined
}

const buildScoreMap = (value: unknown): WheelScoreMap => {
  const map: WheelScoreMap = {};
  if (Array.isArray(value)) {
    for (const item of value) {
      const categoryId = getCategoryId(
        typeof item === 'object' && item !== null ? Reflect.get(item, 'categoryId') : undefined
      );
      if (!categoryId) continue;
      const parsedScore = Number(
        typeof item === 'object' && item !== null ? Reflect.get(item, 'score') : 0
      );
      if (!Number.isFinite(parsedScore)) continue;
      const note = typeof item === 'object' && item !== null ? Reflect.get(item, 'note') : undefined
      const comment = typeof item === 'object' && item !== null ? Reflect.get(item, 'comment') : undefined
      map[categoryId] = {
        score: parsedScore,
        note: typeof note === 'string' ? note : typeof comment === 'string' ? comment : undefined,
        comment: typeof comment === 'string' ? comment : undefined,
      };
    }
  } else if (value && typeof value === 'object') {
    for (const [key, rawScore] of Object.entries(value)) {
      if (!isWheelSphereId(key)) continue
      const score = Number(rawScore ?? 0);
      if (!Number.isFinite(score)) continue;
      map[key] = { score };
    }
  }
  return map;
};

const findWeakest = (scores: WheelAssessment['scores']) =>
  scores.reduce((min, current) => (current.score < min.score ? current : min), scores[0]);

const findFocus = (scores: WheelAssessment['scores'], weakest: WheelAssessment['scores'][number]) => {
  const candidates = scores.filter((score) => score.categoryId !== weakest.categoryId && score.score >= 7);
  return candidates.sort((a, b) => b.score - a.score)[0] ?? weakest;
};

const normalizeWheel = (raw: unknown): WheelAssessment => {
  const scoreMap = buildScoreMap(
    typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'scores') : undefined
  );
  const scores = WHEEL_CATEGORIES.map(category => ({
    categoryId: category.id,
    score: Math.max(0, Math.min(10, Number(scoreMap[category.id]?.score ?? 0))),
    note: scoreMap[category.id]?.note ?? scoreMap[category.id]?.comment,
    comment: scoreMap[category.id]?.comment,
  }));
  const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
  const averageScore = scores.length ? totalScore / scores.length : 0;
  const weakest = scores.length ? findWeakest(scores) : null;
  const focus = weakest && scores.length ? findFocus(scores, weakest) : null;

  return normalizeWheelAssessment({
    id: typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'id') : '',
    userId: typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'userId') : '',
    scores,
    totalScore,
    averageScore,
    strengths: focus ? [focus.categoryId] : [],
    gaps: weakest ? [weakest.categoryId] : [],
    createdAt:
      typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'createdAt') : new Date().toISOString(),
    completedAt:
      typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'updatedAt') : undefined,
    notes:
      typeof raw === 'object' && raw !== null
        ? Reflect.get(raw, 'note') ?? Reflect.get(raw, 'analysis')
        : undefined,
  });
};

export const wheelApi = api.injectEndpoints({
  endpoints: builder => ({
    /* =========================
       Latest assessment
    ========================== */
    getLatestWheelAssessment: builder.query<WheelAssessment | null, string>({
      // fix code_x: convert backend 404 (no wheel yet) into successful null state.
      queryFn: async (_userId, _api, _extraOptions, fetchWithBQ) => {
        const result = await fetchWithBQ({ url: '/wheel/latest' });
        if ('error' in result) {
          const status = getResultStatus(result.error);
          if (import.meta.env.DEV && status === 403) {
            console.info('[wheel/latest] blocked', {
              status,
              error: result.error,
            })
          }
          if (status === 404) return { data: null };
        const error: FetchBaseQueryError =
          result.error ?? ({ status: 'FETCH_ERROR', error: 'Fetch failed' });
        return { error };
        }

        const payload =
          result.data && typeof result.data === 'object'
            ? result.data
            : null;
        const wheel = payload ? Reflect.get(payload, 'wheel') : null
        if (!wheel) return { data: null };
        return { data: normalizeWheel(wheel) };
      },
      keepUnusedDataFor: 300,
      providesTags: ['Wheel'],
    }),

    /* =========================
       Create assessment
    ========================== */
    createWheelAssessment: builder.mutation<WheelAssessment, CreateWheelAssessmentInput>({
      query: body => ({
        url: '/wheel',
        method: 'POST',
        body,
      }),
      // fix code_x: backend create endpoint returns { success, wheel }.
      transformResponse: (response: { wheel: unknown }) => normalizeWheel(response.wheel),
      invalidatesTags: ['Wheel', 'WheelCooldown'],
    }),

    /* =========================
       Cooldown (anti-abuse)
    ========================== */
    getWheelCooldown: builder.query<WheelCooldown, string | void>({
      query: () => ({
        url: '/wheel/cooldown',
      }),
      providesTags: ['WheelCooldown'],
    }),

    getWheelHistory: builder.query<WheelAssessment[], { userId: string; limit?: number }>({
      query: ({ limit = 12 }) => ({
        url: '/wheel/history',
        params: { limit },
      }),
      transformResponse: (response: WheelHistoryResponse) =>
        Array.isArray(response?.wheels) ? response.wheels.map(normalizeWheel) : [],
      providesTags: ['Wheel'],
    }),

    /* =========================
       Analysis (AI)
    ========================== */
    getWheelAnalysis: builder.query<WheelAnalysis, string>({
      query: () => ({
        url: '/wheel/analytics',
      }),
      transformResponse: (response: { analytics: unknown }) =>
        normalizeWheelAnalysis(response.analytics),
      providesTags: ['WheelAnalysis'],
    }),

    sendWheelTelegramReminder: builder.mutation<{ success: boolean; message?: string }, string>({
      query: wheelId => ({
        url: `/wheel/${wheelId}/telegram-reminder`,
        method: 'POST',
      }),
    }),

    connectTelegramProfile: builder.mutation<
      { success: boolean; message?: string },
      { username?: string; chatId?: string }
    >({
      query: ({ username, chatId }) => ({
        url: '/social/connect',
        method: 'POST',
        body: {
          provider: 'telegram',
          username: username?.trim() || undefined,
          externalId: chatId?.trim() || '',
        },
      }),
    }),
  }),
});

export const {
  useGetLatestWheelAssessmentQuery,
  useCreateWheelAssessmentMutation,
  useGetWheelHistoryQuery,
  useGetWheelCooldownQuery,
  useGetWheelAnalysisQuery,
  useSendWheelTelegramReminderMutation,
  useConnectTelegramProfileMutation,
} = wheelApi;
