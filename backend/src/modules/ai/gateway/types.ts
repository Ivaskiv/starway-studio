import {
type AgentDefinition,
type EngineeringTask,
type IAIProvider,
type IRuntimeLogger,
} from '@starway/ai'
import type { ModelStrategyTier } from '@starway/ai/providers/models'

import type { ModelProvider } from '../../ai-assistant/promptCompiler.js'
import {
type AssistantDecision,
} from '../../assistant/decision-engine.js'
import type { StrictTelegramIntent } from '../../telegram-mentor/services/strict-system.js'
import { STRICT_KNOWLEDGE_BASE } from '../../telegram-mentor/services/strict-system.js'
import type { TelegramAiRequestContext } from '../../telegram-mentor/services/context/request.js'
import {
type CanonicalGatewayAgentKey,
} from '../agentRegistry.js'

export type TelegramGatewayBot = 'user' | 'coach' | 'support' | 'admin'

export type TelegramGatewayIntent =
  | 'telegram_intelligence'
  | 'telegram_echo'
  | 'telegram_assistant'

export interface TelegramAgentGatewayRequest {
  bot: TelegramGatewayBot
  intent: TelegramGatewayIntent
  chatId: string
  userId?: string | null
  message: string
  messageType?: string | null
  requestContext?: TelegramAiRequestContext | null
  requestId?: string | null
}

export interface TelegramAgentGatewayResult<TPayload = Record<string, unknown>> {
  bot: TelegramGatewayBot
  intent: TelegramGatewayIntent
  agentId: AgentDefinition['id']
  taskId: string
  artifact: {
    id: string
    type: string
    summary: string
    payload: TPayload
    metadata?: Record<string, unknown>
  }
}

export interface TargetedGatewayAgentTestRequest {
  key: CanonicalGatewayAgentKey
  bot: TelegramGatewayBot
  chatId: string
  userId?: string | null
  message: string
  messageType?: string | null
  requestContext?: TelegramAiRequestContext | null
  requestId?: string | null
}

export interface IAgentGateway {
  execute(input: TelegramAgentGatewayRequest): Promise<TelegramAgentGatewayResult>
}

export interface TelegramAgentGatewayDependencies {
  runtimeExecutor?: IRuntimeGatewayExecutor
  logger?: IRuntimeLogger
  aiProvider?: IAIProvider
}

export interface CanonicalPromptAgentExecutionInput {
  agentKey: Extract<CanonicalGatewayAgentKey, 'assistant' | 'content' | 'sales' | 'coach' | 'funnel' | 'mentor'>
  systemPrompt: string
  userPrompt: string
  strategyTier: ModelStrategyTier
  contentType: string
  preferredProvider?: ModelProvider
  userId?: string | null
  taskId?: string
  taskDescription?: string
  objective?: string
  contextSummary?: string
  taskMetadata?: Record<string, unknown>
}

export interface CanonicalPromptAgentExecutionResult {
  content: string
  metadata?: Record<string, unknown>
}

export interface RuntimeGatewayExecutionInput {
  agentDefinition: AgentDefinition
  task: EngineeringTask
}

export interface IRuntimeGatewayExecutor {
  execute(input: RuntimeGatewayExecutionInput): Promise<TelegramAgentGatewayResult['artifact']>
  invalidatePromptCache?(): Promise<void>
}

export const TELEGRAM_INTELLIGENCE_CATEGORIES: StrictTelegramIntent[] = [
  'about_focus',
  'about_absystem',
  'about_course',
  'pricing',
  'not_ready_to_buy',
  'technical_issue',
  'general_inquiry',
  'out_of_scope',
  'unknown',
]

export type ClassificationTaskInput = {
  text: string
  categories: StrictTelegramIntent[]
  instructions?: string
}

export type EchoTaskInput = {
  message: string
}

export type AssistantTaskInput = {
  userMessage: string
  userContext: {
    profile: Record<string, unknown>
    subscription: Record<string, unknown>
    lifecycle: Record<string, unknown>
  }
  conversationContext: {
    history: string[]
    journal: string[]
  }
  goals: string[]
  wheel: Record<string, unknown>
  knowledgeBase: typeof STRICT_KNOWLEDGE_BASE
  decision: AssistantDecision | null
  orchestration: {
    selectedAgent: string
    delegated: boolean
    specialistInstructions: string | null
    capability: string
  }
}

export type ClassificationArtifactPayload = {
  category?: string
  confidence?: number
  provider?: string
  model?: string
  tokensUsed?: number
  allowedCategories?: StrictTelegramIntent[]
}

export type EchoArtifactPayload = {
  message?: string
}

export type AssistantArtifactPayload = {
  response?: string
  suggestions?: string[]
  followUp?: string
  provider?: string
  model?: string
  tokensUsed?: number
}

export type RuntimeTelemetry = {
  provider: string
  model: string
  latency: number
  promptTokens: number
  completionTokens: number
  cachedTokens: number
  estimatedCost: number
  actualCost: number
  timestamp: string
  user: string | null
}

export type BuiltAssistantTaskInput = {
  input: AssistantTaskInput
  decisionDurationMs: number | null
}
