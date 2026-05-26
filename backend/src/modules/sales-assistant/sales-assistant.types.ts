import type { Prisma } from '@starway/db/prisma-client'
import type { ModelProvider } from '@/modules/ai-assistant/promptCompiler.js'
import type { PromptTone } from '@/modules/sales-assistant/prompts/contentType.prompts.js'
import type {
  AgentTone,
  AgentType,
  GenerationMode,
  PresetType,
  ProtocolMode,
} from '@/modules/sales-assistant/agents/agents.registry.js'

export type SalesAssistantGenerateBody = {
  contentType: string
  selectedProtocol: string
  tone?: PromptTone
  selectedOutputs: string[]
  userContext: string
  userRequest: string
  provider?: ModelProvider
  providers?: ModelProvider[]
  enabledModels?: ModelProvider[]
}

export interface GenerateWithAgentsDto {
  audiencePain: string
  targetAction: string
  product?: string
  additionalNotes?: string
  selectedAgents: AgentType[]
  selectedPreset?: PresetType
  userId: string
  protocol?: ProtocolMode
  tone?: AgentTone
  generationMode?: GenerationMode
  accessTier?: 'free' | 'premium' | 'enterprise'
}

export type UpdateSalesAssistantWorkspaceBody = {
  activeProfileId?: string | null
}

export type SalesAssistantWorkspaceResponse = {
  id: string
  isActive: boolean
  allowedModels: string[]
  maxTokensPerMonth: number
  usedTokensThisMonth: number
  activeProfile: {
    id: string
    key: string
    name: string
    description: string | null
    supportedOutputs: string[]
    supportedProtocols: Prisma.JsonValue
  } | null
}
