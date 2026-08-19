import {
  AgentRegistry,
  type AgentConfiguration,
  type AgentDefinition,
  type IRuntimeLogger,
} from '@starway/ai'

import type { TelegramGatewayBot, TelegramGatewayIntent, TelegramAgentGatewayRequest } from './gateway/index.js'

export type AssistantSpecialistKey =
  | 'assistant'
  | 'mentor'
  | 'content'
  | 'sales'
  | 'coach'
  | 'funnel'

export type CanonicalGatewayAgentKey =
  | 'telegram_intelligence'
  | 'telegram_echo'
  | AssistantSpecialistKey

type RouteMatcher = Readonly<{
  keywords?: readonly string[]
  messageTypes?: readonly string[]
  priority: number
}>

export type CanonicalGatewayAgentCategory = 'marketing' | 'sales' | 'ops'
export type CanonicalGatewayAgentStatus = 'active' | 'running' | 'pending'

type AgentDisplayMeta = Readonly<{
  name: string
  icon: string
  category: CanonicalGatewayAgentCategory
  description: string
  status: CanonicalGatewayAgentStatus
  isSystem: boolean
  sourceFiles: readonly string[]
}>

export type CanonicalGatewayAgentRegistration = Readonly<{
  key: CanonicalGatewayAgentKey
  intent: TelegramGatewayIntent
  runtime: AgentConfiguration
  objective: string
  buildInputKind: 'classification' | 'echo' | 'assistant'
  allowedBots: readonly TelegramGatewayBot[]
  route?: RouteMatcher
  specialistInstructions?: string
  fallbackTo?: AssistantSpecialistKey
  display: AgentDisplayMeta
}>

const INTELLIGENCE_ALLOWED_BOTS: readonly TelegramGatewayBot[] = [
  'user',
  'coach',
  'support',
  'admin',
]

const ASSISTANT_RESPONSE_ARTIFACT_TYPE = 'assistant_response_artifact'
const MENTOR_PROMPT_ID = 'mentor-agent-prompt'
const ASSISTANT_PROMPT_ID = 'assistant-agent-prompt'
const CONTENT_PROMPT_ID = 'content-agent-prompt'
const SALES_PROMPT_ID = 'sales-agent-prompt'
const COACH_PROMPT_ID = 'coach-agent-prompt'
const FUNNEL_PROMPT_ID = 'funnel-agent-prompt'

const CANONICAL_GATEWAY_AGENT_REGISTRATIONS: readonly CanonicalGatewayAgentRegistration[] = [
  {
    key: 'telegram_intelligence',
    intent: 'telegram_intelligence',
    runtime: {
      id: 'classification_agent',
      capability: 'classification',
      prompt: 'classification-agent-prompt',
      artifactType: 'classification_artifact',
    },
    objective: 'Classify the incoming Telegram message for downstream reply selection.',
    buildInputKind: 'classification',
    allowedBots: INTELLIGENCE_ALLOWED_BOTS,
    display: {
      name: 'Telegram Intelligence',
      icon: '🧠',
      category: 'ops',
      description: 'Класифікує вхідні Telegram-повідомлення для downstream reply selection.',
      status: 'active',
      isSystem: true,
      sourceFiles: ['backend/src/modules/telegram-mentor/services/intelligence.service.ts'],
    },
  },
  {
    key: 'telegram_echo',
    intent: 'telegram_echo',
    runtime: {
      id: 'echo_agent',
      capability: 'general_chat',
      prompt: 'echo-agent-prompt',
      artifactType: 'echo_artifact',
    },
    objective: 'Echo the incoming Telegram greeting back to the user.',
    buildInputKind: 'echo',
    allowedBots: INTELLIGENCE_ALLOWED_BOTS,
    display: {
      name: 'Telegram Echo',
      icon: '🪞',
      category: 'ops',
      description: 'Fallback echo-agent для базових Telegram greeting flows.',
      status: 'active',
      isSystem: true,
      sourceFiles: ['backend/src/modules/ai/gateway/index.ts'],
    },
  },
  {
    key: 'coach',
    intent: 'telegram_assistant',
    runtime: {
      id: 'coach_agent',
      capability: 'coach',
      prompt: COACH_PROMPT_ID,
      artifactType: ASSISTANT_RESPONSE_ARTIFACT_TYPE,
    },
    objective: 'Guide the user through emotional resistance, hesitation, or stuckness with one concrete next step.',
    buildInputKind: 'assistant',
    allowedBots: INTELLIGENCE_ALLOWED_BOTS,
    route: {
      priority: 60,
      messageTypes: ['PERSONAL_SITUATION'],
      keywords: ['страх', 'тривог', 'вигоран', 'вигор', 'емоці', 'не можу', 'відклада', 'застряг', 'боюсь'],
    },
    specialistInstructions: 'Focus on coaching resistance into one concrete action. Stay direct, grounded, and practical.',
    fallbackTo: 'assistant',
    display: {
      name: 'Coach Agent',
      icon: '🧭',
      category: 'ops',
      description: 'Працює з опором, емоційним блоком і next-step coaching guidance.',
      status: 'active',
      isSystem: true,
      sourceFiles: ['docs/agents/shared/OPERATING-RULES.md', 'docs/client/svoia-nadya/SKILL-coach.md'],
    },
  },
  {
    key: 'content',
    intent: 'telegram_assistant',
    runtime: {
      id: 'content_agent',
      capability: 'content',
      prompt: CONTENT_PROMPT_ID,
      artifactType: ASSISTANT_RESPONSE_ARTIFACT_TYPE,
    },
    objective: 'Help the user shape content ideas, hooks, structure, and one next publishing action.',
    buildInputKind: 'assistant',
    allowedBots: INTELLIGENCE_ALLOWED_BOTS,
    route: {
      priority: 50,
      keywords: ['контент', 'пост', 'рілс', 'reels', 'stories', 'сторіс', 'caption', 'хук', 'заголов'],
    },
    specialistInstructions: 'Focus on content clarity, narrative structure, and one concrete publishing action.',
    fallbackTo: 'assistant',
    display: {
      name: 'Content Agent',
      icon: '🎬',
      category: 'marketing',
      description: 'Допомагає з hooks, structure і одним concrete publishing action.',
      status: 'active',
      isSystem: true,
      sourceFiles: ['docs/agents/ai-content/SKILL-creative-ads.md', 'docs/agents/ai-content/dna-content-generator-offer.md'],
    },
  },
  {
    key: 'sales',
    intent: 'telegram_assistant',
    runtime: {
      id: 'sales_agent',
      capability: 'sales',
      prompt: SALES_PROMPT_ID,
      artifactType: ASSISTANT_RESPONSE_ARTIFACT_TYPE,
    },
    objective: 'Help the user move a sales conversation forward with one concrete decision or sales action.',
    buildInputKind: 'assistant',
    allowedBots: INTELLIGENCE_ALLOWED_BOTS,
    route: {
      priority: 45,
      keywords: ['продаж', 'офер', 'cta', 'клієнт', 'лід', 'ліди', 'конверс', 'запереч', 'закрит', 'оплат'],
    },
    specialistInstructions: 'Focus on sales movement, objections, CTA clarity, and the shortest path to a real next step.',
    fallbackTo: 'assistant',
    display: {
      name: 'Sales Agent',
      icon: '🎯',
      category: 'sales',
      description: 'Рухається по objections, CTA clarity і shortest path to a sales next step.',
      status: 'active',
      isSystem: true,
      sourceFiles: ['docs/agents/ai-seller/ai-seller-system-prompt.md', 'docs/agents/ai-seller/ai-seller-rules.md'],
    },
  },
  {
    key: 'funnel',
    intent: 'telegram_assistant',
    runtime: {
      id: 'funnel_agent',
      capability: 'funnel',
      prompt: FUNNEL_PROMPT_ID,
      artifactType: ASSISTANT_RESPONSE_ARTIFACT_TYPE,
    },
    objective: 'Help the user improve movement through onboarding, lead-magnet, funnel, or conversion flow.',
    buildInputKind: 'assistant',
    allowedBots: INTELLIGENCE_ALLOWED_BOTS,
    route: {
      priority: 40,
      keywords: ['воронк', 'funnel', 'lead magnet', 'лід-магніт', 'лідоген', 'онборд', 'waitlist', 'квіз', 'тест'],
    },
    specialistInstructions: 'Focus on funnel movement, drop-off points, and the next conversion step inside the existing product flow.',
    fallbackTo: 'assistant',
    display: {
      name: 'Funnel Agent',
      icon: '📄',
      category: 'sales',
      description: 'Покриває onboarding, funnel movement, drop-off points і conversion next steps.',
      status: 'active',
      isSystem: true,
      sourceFiles: ['docs/agents/ai-funnel-assistant/README.md'],
    },
  },
  {
    key: 'mentor',
    intent: 'telegram_assistant',
    runtime: {
      id: 'mentor_agent',
      capability: 'mentoring',
      prompt: MENTOR_PROMPT_ID,
      artifactType: ASSISTANT_RESPONSE_ARTIFACT_TYPE,
    },
    objective: 'Generate a grounded Starway mentor reply using the provided context and one clear next step.',
    buildInputKind: 'assistant',
    allowedBots: INTELLIGENCE_ALLOWED_BOTS,
    route: {
      priority: 30,
      messageTypes: ['FOCUS_RELATED', 'FOLLOWUP'],
      keywords: ['фокус', 'absystem', 'absystem', 'ціль', 'задач', 'zoom', 'колес', 'підпис', 'доступ'],
    },
    specialistInstructions: 'Focus on Starway product guidance, lifecycle clarity, and the best next in-product action.',
    fallbackTo: 'assistant',
    display: {
      name: 'AI Mentor',
      icon: '🧭',
      category: 'ops',
      description: 'Дає grounded Starway mentor reply з lifecycle clarity і next in-product action.',
      status: 'running',
      isSystem: true,
      sourceFiles: ['docs/agents/ai-mentor/methodology-absystem.md', 'docs/agents/ai-mentor/comeback-flows.md'],
    },
  },
  {
    key: 'assistant',
    intent: 'telegram_assistant',
    runtime: {
      id: 'assistant_agent',
      capability: 'assistant',
      prompt: ASSISTANT_PROMPT_ID,
      artifactType: ASSISTANT_RESPONSE_ARTIFACT_TYPE,
    },
    objective: 'Generate a grounded assistant reply using the provided Starway context only.',
    buildInputKind: 'assistant',
    allowedBots: INTELLIGENCE_ALLOWED_BOTS,
    specialistInstructions: 'Act as the default assistant. Use the shared context, stay concise, and recommend one high-value next action.',
    display: {
      name: 'Assistant Agent',
      icon: '💬',
      category: 'sales',
      description: 'Default assistant, shared-context reply layer для Telegram assistant flows.',
      status: 'active',
      isSystem: true,
      sourceFiles: ['docs/agents/ai-assistant-bot/00-SURGICAL-SYSTEM-UPDATE.md', 'docs/agents/ai-assistant-bot/ANALYSIS-strict-guardrails.md'],
    },
  },
] as const

const registrationByKey = new Map(
  CANONICAL_GATEWAY_AGENT_REGISTRATIONS.map((registration) => [registration.key, registration]),
)

const registrationByRuntimeId = new Map(
  CANONICAL_GATEWAY_AGENT_REGISTRATIONS.map((registration) => [registration.runtime.id, registration]),
)

export class CanonicalGatewayAgentRegistry {
  private readonly registry: AgentRegistry

  constructor(logger?: IRuntimeLogger) {
    this.registry = new AgentRegistry({
      agents: CANONICAL_GATEWAY_AGENT_REGISTRATIONS.map((registration) => registration.runtime),
      logger,
    })
  }

  getAgentDefinition(registration: CanonicalGatewayAgentRegistration): AgentDefinition {
    return this.registry.getAgentById(registration.runtime.id)
  }

  getAllAgentDefinitions(): AgentDefinition[] {
    return this.registry.getAllAgents()
  }

  listRegistrations(): CanonicalGatewayAgentRegistration[] {
    return [...CANONICAL_GATEWAY_AGENT_REGISTRATIONS]
  }

  getRegistrationByRuntimeAgentId(agentId: AgentDefinition['id']): CanonicalGatewayAgentRegistration {
    const registration = registrationByRuntimeId.get(agentId)
    if (!registration) {
      throw new Error(`Gateway agent '${agentId}' is not registered.`)
    }
    return registration
  }

  getRegistrationByKey(key: CanonicalGatewayAgentKey): CanonicalGatewayAgentRegistration {
    const registration = registrationByKey.get(key)
    if (!registration) {
      throw new Error(`Gateway agent key '${key}' is not registered.`)
    }
    return registration
  }

  selectRegistration(input: TelegramAgentGatewayRequest): CanonicalGatewayAgentRegistration {
    const candidates = CANONICAL_GATEWAY_AGENT_REGISTRATIONS.filter((registration) => registration.intent === input.intent)

    const allowed = candidates.filter((registration) => registration.allowedBots.includes(input.bot))
    if (!allowed.length) {
      throw new Error(`Bot '${input.bot}' is not allowed to execute '${input.intent}'.`)
    }

    if (input.intent !== 'telegram_assistant') {
      return allowed[0]
    }

    const normalizedMessage = input.message.trim().toLowerCase()
    const messageType = String(input.messageType ?? '').trim().toUpperCase()

    const matched = allowed
      .filter((registration) => registration.route)
      .sort((left, right) => (right.route?.priority ?? 0) - (left.route?.priority ?? 0))
      .find((registration) => matchesRoute(registration.route!, normalizedMessage, messageType))

    return matched ?? this.getRegistrationByKey('assistant')
  }
}

function matchesRoute(route: RouteMatcher, normalizedMessage: string, messageType: string): boolean {
  const matchesMessageType = route.messageTypes?.some((value) => value.toUpperCase() === messageType) ?? false
  const matchesKeyword = route.keywords?.some((value) => normalizedMessage.includes(value.toLowerCase())) ?? false
  return matchesMessageType || matchesKeyword
}
