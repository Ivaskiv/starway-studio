import { getAccessControlState } from '../../modules/access/service.js'
import { getEngagementSignals, getNextTrigger, type EngagementSignals, type EngagementTrigger } from '../engagement/engagement.service.js'
import { resolveCanonicalLifecycle, type CanonicalLifecycleSnapshot } from '../lifecycle/lifecycle.adapter.js'
import { decideNextAction, type DecisionInput, type DecisionOutput } from './decision.engine.js'

export interface ResolvedDecisionContext {
  lifecycle: CanonicalLifecycleSnapshot
  access: Awaited<ReturnType<typeof getAccessControlState>> | null
  engagement: EngagementSignals
  nextTrigger: EngagementTrigger
  decision: DecisionOutput
}

const EMPTY_ENGAGEMENT: EngagementSignals = {
  streak: 0,
  lastActivity: null,
  unfinishedSteps: 0,
  repeatedPatterns: false,
  hasProgress: false,
  memoryProfile: {
    goals: [],
    repeatedBlockers: [],
    emotionalPatterns: [],
    progressHistory: {
      completedDays: 0,
      completedTasks: 0,
      activeDaysLast7: 0,
    },
    updatedAt: null,
  },
}

function buildDecisionInput(
  userId: string | null,
  event: string,
  lifecycle: CanonicalLifecycleSnapshot,
  access: Awaited<ReturnType<typeof getAccessControlState>> | null,
  engagement: EngagementSignals,
  nextTrigger: EngagementTrigger,
  payload?: Record<string, unknown>,
): DecisionInput {
  return {
    userId,
    event,
    payload,
    currentState: lifecycle.state,
    currentStep: lifecycle.currentStep,
    access,
    product: {
      hasProgress: lifecycle.flags.hasProgress || engagement.hasProgress,
      unfinishedSteps: engagement.unfinishedSteps,
      repeatedPatterns: engagement.repeatedPatterns,
      streak: engagement.streak,
      daysToTrialEnd: lifecycle.daysToTrialEnd,
      nextTrigger,
      memoryProfile: engagement.memoryProfile,
    },
  }
}

export function resolveDecisionEvent(
  lifecycle: CanonicalLifecycleSnapshot,
  event = 'start',
): string {
  if (event === 'start' && lifecycle.hasCompletedLeadMagnet && (lifecycle.state === 'lead' || lifecycle.state === 'activated')) {
    return 'lead_magnet_completed'
  }

  return event
}

export async function resolveDecision(
  userId: string | null,
  event = 'start',
  payload?: Record<string, unknown>,
): Promise<ResolvedDecisionContext> {
  const lifecycle = await resolveCanonicalLifecycle(userId)

  if (!userId) {
    const nextTrigger = getNextTrigger(EMPTY_ENGAGEMENT, lifecycle.state)
    return {
      lifecycle,
      access: null,
      engagement: EMPTY_ENGAGEMENT,
      nextTrigger,
      decision: decideNextAction(buildDecisionInput(null, resolveDecisionEvent(lifecycle, event), lifecycle, null, EMPTY_ENGAGEMENT, nextTrigger, payload)),
    }
  }

  const [access, engagement] = await Promise.all([
    getAccessControlState(userId).catch(() => null),
    getEngagementSignals(userId).catch(() => EMPTY_ENGAGEMENT),
  ])
  const nextTrigger = getNextTrigger(engagement, lifecycle.state)

  return {
    lifecycle,
    access,
    engagement,
    nextTrigger,
    decision: decideNextAction(
      buildDecisionInput(
        userId,
        resolveDecisionEvent(lifecycle, event),
        lifecycle,
        access,
        engagement,
        nextTrigger,
        payload,
      ),
    ),
  }
}

export function shouldRenderDecisionBeforeTransport(decision: DecisionOutput): boolean {
  return decision.nextAction !== 'show_product' && decision.nextAction !== 'resume_session'
}
