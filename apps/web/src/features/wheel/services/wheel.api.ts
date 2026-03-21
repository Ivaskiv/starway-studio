import {
  CreateWheelAssessmentInput,
  WheelAnalysis,
  WheelAssessment,
  WHEEL_CATEGORIES,
} from '@/features/wheel/types/wheel.types';
import { api } from '@/services/api';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

type WheelCooldown = {
  canFill: boolean;
  daysLeft: number;
};

type WheelHistoryResponse = {
  success: boolean;
  count: number;
  wheels: unknown[];
};

type WheelScoreMap = Record<string, { score: number; comment?: string }>;

const buildScoreMap = (value: unknown): WheelScoreMap => {
  const map: WheelScoreMap = {};
  if (Array.isArray(value)) {
    for (const item of value) {
      const categoryId = String(item?.categoryId ?? '').trim();
      if (!categoryId) continue;
      const parsedScore = Number(item?.score ?? 0);
      if (!Number.isFinite(parsedScore)) continue;
      map[categoryId] = {
        score: parsedScore,
        comment: item?.comment ? String(item.comment) : undefined,
      };
    }
  } else if (value && typeof value === 'object') {
    for (const [key, rawScore] of Object.entries(value)) {
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

const normalizeWheel = (raw: any): WheelAssessment => {
  const scoreMap = buildScoreMap(raw?.scores);
  const scores = WHEEL_CATEGORIES.map(category => ({
    categoryId: category.id,
    score: Math.max(0, Math.min(10, Number(scoreMap[category.id]?.score ?? 0))),
    comment: scoreMap[category.id]?.comment,
  }));
  const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
  const averageScore = scores.length ? totalScore / scores.length : 0;
  const weakest = scores.length ? findWeakest(scores) : null;
  const focus = weakest && scores.length ? findFocus(scores, weakest) : null;

  return {
    id: String(raw?.id ?? ''),
    userId: String(raw?.userId ?? ''),
    scores,
    totalScore,
    averageScore,
    strengths: focus ? [focus.categoryId] : [],
    gaps: weakest ? [weakest.categoryId] : [],
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    completedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
    notes: raw?.analysis ? String(raw.analysis) : undefined,
  };
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
          const status = (result.error as { status?: number }).status;
          if (status === 404) return { data: null };
        const error: FetchBaseQueryError =
          result.error ?? ({ status: 'FETCH_ERROR', error: 'Fetch failed' });
        return { error };
        }

        const payload = result.data as { wheel?: unknown | null };
        if (!payload?.wheel) return { data: null };
        return { data: normalizeWheel(payload.wheel) };
      },
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
    getWheelCooldown: builder.query<WheelCooldown, string>({
      query: () => ({
        url: '/wheel/cooldown',
      }),
      transformResponse: (response: any): WheelCooldown => ({
        canFill: Boolean(response?.canFill),
        daysLeft: Number(response?.daysLeft ?? 0),
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
      transformResponse: (response: { analytics: WheelAnalysis }) => response.analytics,
      providesTags: ['WheelAnalysis'],
    }),

    sendWheelTelegramReminder: builder.mutation<{ success: boolean; message?: string }, string>({
      query: wheelId => ({
        url: `/wheel/${wheelId}/remind-telegram`,
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
