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

export interface AgentPromptReadRecord {
  agentKey: string
  capabilityType: 'LIVE_AGENT' | 'PROMPT_ONLY' | 'KNOWLEDGE_TOOL'
  promptId: string
  editablePrompt: boolean
  reason?: string
  promptContent: string | null
  content: string | null
  source: 'db' | 'filesystem' | null
  version: number | null
  sourceFiles: string[]
}

export interface AgentDetailRecord extends AgentPromptReadRecord {
  name: string
  runtimeRegistered: boolean
  runtimeStatus: 'active' | 'running' | 'pending' | null
  providerPolicy: string | null
  analysisState: 'idle'
}

export interface RuntimeAgentTestResult {
  testRunId: string | null
  agentKey: string
  provider: string | null
  model: string | null
  passed: boolean
  output: Record<string, unknown> | null
  errors: string[]
}

export interface AgentRegressionCaseResult {
  id: string
  passed: boolean
  error?: string
}

export interface RuntimeAgentRegressionResult {
  regressionRunId: string | null
  passed: boolean
  cases: AgentRegressionCaseResult[]
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

    getAgent: builder.query<AgentDetailRecord, { key: string }>({
      query: ({ key }) => ({
        url: `/admin/agents/${key}`,
      }),
    }),

    getAgentPrompt: builder.query<AgentPromptReadRecord, { key: string }>({
      query: ({ key }) => ({
        url: `/admin/agents/${key}/prompt`,
      }),
    }),

    runRuntimeAgentTest: builder.mutation<
      RuntimeAgentTestResult,
      {
        key: string
        promptContent: string
        testInput: {
          message: string
          messageType?: string | null
        }
      }
    >({
      query: ({ key, ...body }) => ({
        url: `/admin/agents/${key}/test`,
        method: 'POST',
        body,
      }),
    }),

    runRuntimeAgentRegressionTest: builder.mutation<
      RuntimeAgentRegressionResult,
      { key: string; promptContent: string }
    >({
      query: ({ key, ...body }) => ({
        url: `/admin/agents/${key}/regression-test`,
        method: 'POST',
        body,
      }),
    }),

    createPromptVersion: builder.mutation<
      { prompt: PromptVersionRecord },
      {
        name: string
        content: string
        isActive?: boolean
        agentKey?: string
        promptId?: string
        validationState?: 'passed' | 'failed' | 'idle'
        analysisState?: 'passed' | 'failed' | 'idle'
        testState?: 'passed' | 'failed' | 'idle'
        regressionState?: 'passed' | 'failed' | 'idle'
        testRunId?: string | null
        regressionRunId?: string | null
      }
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
  useGetAgentQuery,
  useGetAgentPromptQuery,
  useRunRuntimeAgentTestMutation,
  useRunRuntimeAgentRegressionTestMutation,
  useCreatePromptVersionMutation,
  useActivatePromptVersionMutation,
  useDeletePromptVersionMutation,
  useAnalyzePromptImpactMutation,
  useRunCompatibilityCheckMutation,
} = adminApi;
