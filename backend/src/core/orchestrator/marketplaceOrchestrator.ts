import { generateMentorMessage } from '../mentor/mentorEngine.js'
import { mapAction, type ExecutionPlan } from './actionMapper.js'
import { resolveDecision, type Decision } from './decisionResolver.js'
import { resolveUserState, type UserState } from './stateResolver.js'

type OrchestratorInput = {
  userId: string
  patterns?: string[] | null
  scores?: {
    engagement?: number | null
    procrastination?: number | null
    avoidance?: number | null
  } | null
  context?: Record<string, unknown> | null
  conversion?: {
    triggered?: boolean | null
  } | null
  subscription?: {
    active?: boolean | null
  } | null
}

type OrchestratorResult = {
  state: UserState
  decision: Decision
  execution: ExecutionPlan
  message: {
    text: string
    channel: 'web' | 'telegram' | 'miniapp'
  } | null
  debug: {
    patterns: string[]
    scores: {
      engagement: number
      procrastination: number
      avoidance: number
    }
  }
}

function normalizeScore(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const patterns = Array.isArray(input.patterns) ? input.patterns.filter(Boolean) : []
  const scores = {
    engagement: normalizeScore(input.scores?.engagement),
    procrastination: normalizeScore(input.scores?.procrastination),
    avoidance: normalizeScore(input.scores?.avoidance),
  }

  const state = resolveUserState({
    patterns,
    scores,
    conversion: input.conversion,
    subscription: input.subscription,
  })
  const decision = resolveDecision(state)
  const execution = mapAction(decision)
  let message: OrchestratorResult['message'] = null

  if (execution?.agent === 'mentor') {
    message = await generateMentorMessage({
      pattern: patterns[0],
      scores,
    })
  }

  if (message === null) {
    message = {
      text: 'Зроби одну маленьку дію прямо зараз.',
      channel: 'web',
    }
  }

  console.log('[ORCHESTRATOR]', state)
  console.log('[DECISION]', decision)
  console.log('[EXECUTION]', {
    agent: execution?.agent,
    message,
  })

  return {
    state,
    decision,
    execution,
    message,
    debug: {
      patterns,
      scores,
    },
  }
}
