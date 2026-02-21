import {
  CreateWheelAssessmentInput,
  WheelAnalysis,
  WheelAssessment,
} from '@/features/wheel/types/wheel.types';
import { api } from '@/services/api';

type WheelCooldown = {
  canFill: boolean;
  daysLeft: number;
};

type WheelHistoryResponse = {
  success: boolean;
  count: number;
  wheels: unknown[];
};

const safeScores = (value: unknown): Array<{ categoryId: string; score: number; comment?: string }> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      categoryId: String(item?.categoryId ?? ''),
      score: Number(item?.score ?? 0),
      comment: item?.comment ? String(item.comment) : undefined,
    }))
    .filter(item => item.categoryId && Number.isFinite(item.score));
};

const normalizeWheel = (raw: any): WheelAssessment => {
  const scores = safeScores(raw?.scores);
  const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
  const averageScore = scores.length ? totalScore / scores.length : 0;

  return {
    id: String(raw?.id ?? ''),
    userId: String(raw?.userId ?? ''),
    scores,
    totalScore,
    averageScore,
    // fix code_x: backend stores weakest/focus only; map to UI-friendly strengths/gaps.
    strengths: raw?.focusSphere ? [String(raw.focusSphere)] : [],
    gaps: raw?.weakestSphere ? [String(raw.weakestSphere)] : [],
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
          return { error: result.error };
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

    getWheelPdf: builder.mutation<Blob, string>({
      query: wheelId => ({
        url: `/wheel/${wheelId}/pdf`,
        method: 'GET',
        responseHandler: async response => response.blob(),
      }),
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
  useGetWheelPdfMutation,
  useSendWheelTelegramReminderMutation,
  useConnectTelegramProfileMutation,
} = wheelApi;
