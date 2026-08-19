import { api } from '@/services/api';
import type { AdminSettings } from '@/features/user/types/profile.types';

export interface AdminProduct {
  id: string;
  branding: {
    name: string;
    description?: string;
  };
  status: 'published' | 'draft';
  total_users: number;
  revenue: number;
}

export interface PromptVersionRecord {
  id: string;
  name: string;
  version: number;
  content: string;
  parsedContent?: unknown;
  isActive: boolean;
  createdAt: string;
  source: 'db' | 'filesystem';
}

export interface RuntimeAgentRecord {
  key: string
  runtimeAgentId: string
  promptId: string
  capability: string
  objective: string
  buildInputKind: 'classification' | 'echo' | 'assistant'
  name: string
  icon: string
  category: 'marketing' | 'sales' | 'ops'
  description: string
  status: 'active' | 'running' | 'pending'
  isSystem: boolean
  sourceFiles: string[]
}

export interface RuntimeAgentTestResult {
  ok: boolean
  result: {
    bot: string
    intent: string
    agentId: string
    taskId: string
    artifact: {
      id: string
      type: string
      summary: string
      payload: Record<string, unknown>
      metadata?: Record<string, unknown>
    }
  }
}

export interface PromptImpactDependencyCard {
  name: string;
  severity: 'high' | 'medium' | 'low';
  reason: string;
  affectedPrompts: string[];
}

export interface PromptImpactCheck {
  title: string;
  body: string;
  tone: 'info' | 'warning' | 'success';
}

export interface PromptImpactAnalysisRecord {
  ok?: boolean;
  promptName: string;
  promptVersion: number;
  promptVersionId: string;
  summary: string;
  recommendation: string;
  warnings: string[];
  dependencies: PromptImpactDependencyCard[];
  checks: PromptImpactCheck[];
  analyzedAt: string;
}

export interface CompatibilityCheckRequest {
  type: 'compatibility_check'
  item: Record<string, unknown>
  relatedItems: Array<Record<string, unknown>>
  checkRules: string[]
}

export const adminApi = api.injectEndpoints({
  endpoints: builder => ({
    getAdminSettings: builder.query<AdminSettings, string>({
      query: adminId => ({
        url: `/admin/${adminId}/settings`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'AdminSettings', id }],
    }),

    getAdminProducts: builder.query<AdminProduct[], void>({
      query: () => '/admin/products',
      providesTags: ['AdminProducts'],
    }),

    getPromptVersions: builder.query<{ prompts: PromptVersionRecord[] }, { name?: string } | void>({
      query: (args) => ({
        url: '/admin/prompts',
        params: args?.name ? { name: args.name } : undefined,
      }),
      providesTags: ['PromptVersions'],
    }),

    getRuntimeAgents: builder.query<{ agents: RuntimeAgentRecord[] }, void>({
      query: () => ({
        url: '/admin/agents',
      }),
      providesTags: ['PromptVersions'],
    }),

    runRuntimeAgentTest: builder.mutation<
      RuntimeAgentTestResult,
      { key: string; message: string; messageType?: string | null }
    >({
      query: ({ key, ...body }) => ({
        url: `/admin/agents/${key}/test`,
        method: 'POST',
        body,
      }),
    }),

    createPromptVersion: builder.mutation<
      { prompt: PromptVersionRecord },
      { name: string; content: string; isActive?: boolean }
    >({
      query: (body) => ({
        url: '/admin/prompts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PromptVersions'],
    }),

    activatePromptVersion: builder.mutation<{ ok: boolean; id: string }, string>({
      query: (id) => ({
        url: `/admin/prompts/${id}/activate`,
        method: 'PUT',
      }),
      invalidatesTags: ['PromptVersions'],
    }),

    deletePromptVersion: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `/admin/prompts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PromptVersions'],
    }),

    analyzePromptImpact: builder.mutation<PromptImpactAnalysisRecord, { promptName: string }>({
      query: (body) => ({
        url: '/admin/prompts/analyze-impact',
        method: 'POST',
        body,
      }),
    }),

    runCompatibilityCheck: builder.mutation<PromptImpactAnalysisRecord, CompatibilityCheckRequest>({
      query: (body) => ({
        url: '/admin/prompts/analyze-impact',
        method: 'POST',
        body,
      }),
    }),

    updateAdminSettings: builder.mutation<AdminSettings, { adminId: string; settings: AdminSettings }>({
      query: ({ adminId, settings }) => ({
        url: `/admin/${adminId}/settings`,
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: (result, error, { adminId }) => [{ type: 'AdminSettings', id: adminId }],
    }),
  }),
});

export const {
  useGetAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
  useGetAdminProductsQuery,
  useGetPromptVersionsQuery,
  useGetRuntimeAgentsQuery,
  useRunRuntimeAgentTestMutation,
  useCreatePromptVersionMutation,
  useActivatePromptVersionMutation,
  useDeletePromptVersionMutation,
  useAnalyzePromptImpactMutation,
  useRunCompatibilityCheckMutation,
} = adminApi;
