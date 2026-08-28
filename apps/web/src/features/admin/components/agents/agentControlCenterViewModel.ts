import type { RuntimeAgentRecord } from '@/features/admin/services/admin.api'

import { AGENT_CARDS } from './agentControlCenter.config'
import type { AgentCardDef, AgentCapabilityType, AgentPresentationDef } from './agentControlCenter.types'

function resolveCapabilityType(agent: AgentPresentationDef, runtimeAgent?: RuntimeAgentRecord): AgentCapabilityType {
  if (runtimeAgent) {
    return 'LIVE_AGENT'
  }

  if (agent.key === 'zoom_recap') {
    return 'KNOWLEDGE_TOOL'
  }

  if (agent.key === 'marketing_analyst' || agent.key === 'trend_radar') {
    return 'PROMPT_ONLY'
  }

  return 'PLANNED'
}

function resolveStatusLabel(
  runtimeRegistered: boolean,
  runtimeStatus: RuntimeAgentRecord['status'] | null,
  capabilityType: AgentCapabilityType,
): AgentCardDef['statusLabel'] {
  if (runtimeRegistered) {
    if (runtimeStatus === 'running') {
      return 'У роботі'
    }

    if (runtimeStatus === 'active') {
      return 'Підключений'
    }

    return 'Ще не підключений'
  }

  if (capabilityType === 'KNOWLEDGE_TOOL') {
    return 'Інструмент'
  }

  return 'Ще не підключений'
}

export function buildAgentControlCenterCards(
  runtimeAgents: RuntimeAgentRecord[],
  presentationAgents: AgentPresentationDef[] = AGENT_CARDS,
): AgentCardDef[] {
  const runtimeByKey = new Map(runtimeAgents.map((agent) => [agent.key, agent]))

  return presentationAgents.map((agent) => {
    const runtimeAgent = runtimeByKey.get(agent.key)
    const runtimeRegistered = Boolean(runtimeAgent)
    const runtimeStatus = runtimeAgent?.status ?? null
    const capabilityType = resolveCapabilityType(agent, runtimeAgent)

    return {
      ...agent,
      promptId: runtimeAgent?.promptId ?? agent.promptId,
      runtimeAgentId: runtimeAgent?.runtimeAgentId,
      capability: runtimeAgent?.capability,
      objective: runtimeAgent?.objective,
      runtimeRegistered,
      runtimeStatus,
      capabilityType,
      statusLabel: resolveStatusLabel(runtimeRegistered, runtimeStatus, capabilityType),
      isSystem: runtimeAgent?.isSystem ?? agent.isSystem,
    }
  })
}
