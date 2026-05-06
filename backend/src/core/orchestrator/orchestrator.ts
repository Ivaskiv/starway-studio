import type { UserStage, UserState } from './userState.js'

export type OrchestratorAgent =
  | 'trial_activator'
  | 'pattern_provocator'
  | 'tariff_recommender'
  | 'ai_mentor'

export type OrchestratorPriority = 'low' | 'medium' | 'high'
export type OrchestratorChannel = 'web' | 'telegram' | 'miniapp'

export type OrchestratorDecision = {
  agent: OrchestratorAgent
  priority: OrchestratorPriority
  channel: OrchestratorChannel
  reason: string
}

export type OrchestratorContext = {
  goalsCompleted?: number
  eventType?: string
  preferredChannel?: OrchestratorChannel | null
}

function resolveDefaultChannel(agent: OrchestratorAgent, stage: UserStage): OrchestratorChannel {
  switch (agent) {
    case 'pattern_provocator':
      return 'telegram'
    case 'trial_activator':
      return 'web'
    case 'tariff_recommender':
      return stage === 'active' ? 'miniapp' : 'web'
    case 'ai_mentor':
    default:
      return stage === 'onboarding' ? 'web' : 'miniapp'
  }
}

function buildDecision(
  agent: OrchestratorAgent,
  priority: OrchestratorPriority,
  state: UserState,
  reason: string,
  context?: OrchestratorContext,
): OrchestratorDecision {
  return {
    agent,
    priority,
    channel: context?.preferredChannel ?? resolveDefaultChannel(agent, state.stage),
    reason,
  }
}

export function decideNextAction(
  state: UserState,
  context: OrchestratorContext = {},
): OrchestratorDecision {
  const goalsCompleted = Math.max(0, context.goalsCompleted ?? 0)

  if (state.churnRisk > 70) {
    return buildDecision(
      'pattern_provocator',
      'high',
      state,
      `High churn risk (${state.churnRisk}) requires urgent reactivation and behavior interruption.`,
      context,
    )
  }

  if (state.stage === 'trial' && state.activationScore < 30) {
    return buildDecision(
      'trial_activator',
      'medium',
      state,
      `Trial activation is weak (${state.activationScore}); user needs onboarding or activation support.`,
      context,
    )
  }

  if (state.engagementScore >= 70 && goalsCompleted > 0) {
    return buildDecision(
      'tariff_recommender',
      'medium',
      state,
      `Strong engagement (${state.engagementScore}) with completed goals suggests monetization readiness.`,
      context,
    )
  }

  return buildDecision(
    'ai_mentor',
    state.stage === 'risk' || state.stage === 'churn' ? 'medium' : 'low',
    state,
    `No stronger growth rule matched; keep the user in the guided support loop for stage "${state.stage}".`,
    context,
  )
}
