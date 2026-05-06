import { decideNextAction, type OrchestratorChannel, type OrchestratorDecision } from './orchestrator.js'
import type { ChannelContext } from './channelRouter.js'
import { runMentor } from '../mentor/mentorEngine.js'
import type { MentorRunResult } from '../mentor/types.js'
import { dispatch } from '../delivery/deliveryDispatcher.js'
import { handleConversion, type ConversionActionResult } from '../growth/conversionHandler.js'
import { emitConversionOpportunity, type ConversionOpportunityEvent } from '../growth/conversionEmitter.js'
import { evaluateConversionTiming } from '../growth/conversionTimingEngine.js'
import { trackEvent } from '../../modules/events/service.js'
import { recordFailForUser, recordSuccessForUser } from '../growth/feedbackEngine.js'
import { optimizeStrategy } from '../growth/strategyEngine.js'
import { updateUserState, type UserStage, type UserState, type UserStateInputSignals } from './userState.js'
import type { Pattern } from '../behavior/types.js'
import { buildPaywall } from '../paywall/paywallEngine.js'
import { runWebMapAdaptationIfEligible, type WebMapAdaptationInput, type WebMapAdaptationResult } from './webMapAdaptation.js'

export type SupportedOrchestratorEvent =
  | 'user_login'
  | 'inactivity_detected'
  | 'inactivity_timeout'
  | 'cycle_completed'
  | 'goal_created'
  | 'churn_signal'
  | 'behavior_update'
  | 'user_action'
  | 'conversion_opportunity'

export type OrchestratorEventPayload = {
  stage?: UserStage
  lastActivityAt?: number | Date | string | null
  inactivityHours?: number
  isTrialActive?: boolean
  hasActiveSubscription?: boolean
  onboardingCompleted?: boolean
  engagementEvents?: number
  cycleCompletions?: number
  completedGoals?: number
  goalsTotal?: number
  streakDays?: number
  unfinishedTasks?: number
  behaviorScores?: {
    procrastination: number
    avoidance: number
    engagement: number
    consistency: number
  }
  patterns?: string[]
  delivery?: {
    channel: OrchestratorChannel
    adaptedMessage: string
    meta?: {
      expected_action: boolean
      timestamp: number
      strategyKey?: string
    }
  }
  channelContext?: Partial<ChannelContext>
  churnSignals?: string[]
  behaviorTags?: string[]
  preferredChannel?: OrchestratorChannel
  conversionOpportunity?: ConversionOpportunityEvent
  webMapAdaptation?: WebMapAdaptationInput
}

export type OrchestratorEvent = {
  type: SupportedOrchestratorEvent
  userId: string
  channel?: OrchestratorChannel
  timestamp?: number | Date | string
  payload?: OrchestratorEventPayload
}

export type RoutedOrchestratorEvent = {
  event: OrchestratorEvent
  state: UserState
  action: OrchestratorDecision
  mentor: MentorRunResult | null
  conversion: ConversionOpportunityEvent | null
  conversionAction: ConversionActionResult | null
  webMapAdaptation: WebMapAdaptationResult | null
}

function deriveBehaviorInput(event: OrchestratorEvent, state: UserState) {
  const payload = event.payload ?? {}
  const scores = payload.behaviorScores ?? {
    procrastination: Math.max(0, Math.min(100, state.churnRisk)),
    avoidance: Math.max(0, Math.min(100, state.churnRisk - 10)),
    engagement: state.engagementScore,
    consistency: Math.max(0, Math.min(100, 100 - Math.round((payload.inactivityHours ?? 0) * 0.8))),
  }

  return {
    userId: event.userId,
    patterns: payload.patterns ?? payload.behaviorTags ?? [],
    scores,
  }
}

function resolveMentor(event: OrchestratorEvent, action: OrchestratorDecision, state: UserState) {
  if (action.agent !== 'ai_mentor' && event.type !== 'behavior_update') return null

  const behaviorInput = deriveBehaviorInput(event, state)
  const baseMentor = runMentor(behaviorInput, { channel: action.channel })
  const primaryPattern = behaviorInput.patterns[0] ?? null
  const strategy = optimizeStrategy({
    userId: event.userId,
    pattern: primaryPattern,
    intent: baseMentor.intent,
    intervention: baseMentor.intervention,
    channel: action.channel,
  })

  const mentor = runMentor(behaviorInput, {
    channel: action.channel,
    overrideIntent: strategy.intent,
    overrideIntervention: strategy.intervention,
    meta: {
      expected_action: true,
      timestamp: Date.now(),
      strategyKey: strategy.key,
    },
  })

  return mentor
}

function mapChannel(event: OrchestratorEvent): OrchestratorChannel | null {
  if (event.payload?.preferredChannel) return event.payload.preferredChannel
  if (event.channel) return event.channel

  switch (event.type) {
    case 'inactivity_detected':
    case 'churn_signal':
    case 'behavior_update':
      return 'telegram'
    case 'cycle_completed':
      return 'miniapp'
    case 'goal_created':
    case 'user_login':
    default:
      return 'web'
  }
}

function mapEventToSignals(event: OrchestratorEvent): UserStateInputSignals {
  const payload = event.payload ?? {}
  const common: UserStateInputSignals = {
    userId: event.userId,
    stage: payload.stage,
    lastActivityAt: payload.lastActivityAt ?? event.timestamp ?? Date.now(),
    inactivityHours: payload.inactivityHours,
    isTrialActive: payload.isTrialActive,
    hasActiveSubscription: payload.hasActiveSubscription,
    onboardingCompleted: payload.onboardingCompleted,
    engagementEvents: payload.engagementEvents ?? 0,
    cycleCompletions: payload.cycleCompletions ?? 0,
    completedGoals: payload.completedGoals ?? 0,
    goalsTotal: payload.goalsTotal ?? 0,
    streakDays: payload.streakDays ?? 0,
    unfinishedTasks: payload.unfinishedTasks ?? 0,
    churnSignals: payload.churnSignals ?? [],
    behaviorTags: payload.behaviorTags ?? [],
  }

  switch (event.type) {
    case 'user_login':
      return {
        ...common,
        engagementEvents: Math.max(1, common.engagementEvents ?? 0),
        behaviorTags: [...(common.behaviorTags ?? []), 'login'],
      }
    case 'inactivity_detected':
    case 'inactivity_timeout':
      return {
        ...common,
        forceRiskStage: (common.inactivityHours ?? 0) >= 72,
        forceChurnStage: (common.inactivityHours ?? 0) >= 24 * 14,
        churnSignals: [...(common.churnSignals ?? []), 'inactivity_detected'],
        behaviorTags: [...(common.behaviorTags ?? []), 'reactivation_needed'],
      }
    case 'cycle_completed':
      return {
        ...common,
        engagementEvents: Math.max(1, common.engagementEvents ?? 0),
        cycleCompletions: Math.max(1, common.cycleCompletions ?? 0),
        behaviorTags: [...(common.behaviorTags ?? []), 'daily_loop_complete'],
      }
    case 'goal_created':
      return {
        ...common,
        engagementEvents: Math.max(1, common.engagementEvents ?? 0),
        goalsTotal: Math.max(1, common.goalsTotal ?? 0),
        behaviorTags: [...(common.behaviorTags ?? []), 'goal_created'],
      }
    case 'churn_signal':
      return {
        ...common,
        forceRiskStage: true,
        churnSignals: [...(common.churnSignals ?? []), 'explicit_churn_signal'],
        behaviorTags: [...(common.behaviorTags ?? []), 'risk_event'],
      }
    case 'behavior_update':
      return {
        ...common,
        engagementEvents: Math.max(
          common.engagementEvents ?? 0,
          (payload.behaviorTags ?? []).includes('engaged') ? 2 : 0,
        ),
        forceRiskStage: (payload.churnSignals ?? []).length > 0,
        behaviorTags: [...(common.behaviorTags ?? []), 'behavior_update'],
      }
    case 'user_action':
      return {
        ...common,
        engagementEvents: Math.max(1, common.engagementEvents ?? 0),
        behaviorTags: [...(common.behaviorTags ?? []), 'user_action'],
      }
    default:
      return common
  }
}

export function routeEvent(event: OrchestratorEvent): RoutedOrchestratorEvent {
  if (event.type === 'user_action') {
    recordSuccessForUser(event.userId)
  }

  if (event.type === 'cycle_completed' || event.type === 'goal_created') {
    recordSuccessForUser(event.userId)
  }

  if (event.type === 'inactivity_timeout') {
    recordFailForUser(event.userId)
  }

  if (event.type === 'inactivity_detected' && (event.payload?.inactivityHours ?? 0) >= 12) {
    recordFailForUser(event.userId)
  }

  const state = updateUserState(mapEventToSignals(event))
  const preferredChannel = mapChannel(event)
  const safeChannel: OrchestratorChannel | undefined = preferredChannel ?? undefined
  const action = decideNextAction(state, {
    goalsCompleted: event.payload?.completedGoals ?? 0,
    eventType: event.type,
    preferredChannel: safeChannel,
  })
  const resolvedMentor = resolveMentor(event, action, state)
  let conversion: ConversionOpportunityEvent | null = null
  let conversionAction: ConversionActionResult | null = null
  let webMapAdaptation: WebMapAdaptationResult | null = null

  console.log('[ORCHESTRATOR]', {
    event: event.type,
    hasConversion: !!conversion,
    hasPaywall: event.payload?.conversionOpportunity?.triggered ?? false,
  })

  if (event.type === 'conversion_opportunity' && event.payload?.conversionOpportunity) {
    conversion = event.payload.conversionOpportunity
    conversionAction = handleConversion(conversion)

    void dispatch({
      userId: conversionAction.userId,
      delivery: {
        channel: conversionAction.channel,
        adaptedMessage: conversionAction.message,
        meta: {
          conversion: true,
          action: conversionAction.action,
          offerType: conversionAction.offerType,
          timingScore: conversionAction.timingScore,
        },
      },
    }).catch(error => {
      console.warn('[CONVERSION]', {
        userId: conversionAction?.userId ?? event.userId,
        status: 'delivery_failed',
        reason: error instanceof Error ? error.message : 'unknown_error',
      })
    })

    void trackEvent({
      userId: conversion.userId,
      type: 'conversion_action',
      source: conversionAction.channel,
      state: conversionAction.action,
      payload: {
        offerType: conversionAction.offerType,
        timingScore: conversionAction.timingScore,
        reason: conversionAction.reason,
        message: conversionAction.message,
        timestamp: conversionAction.timestamp,
      },
    })

    if (conversion.triggered) {
      try {
        const paywall = buildPaywall(conversion, {
          userId: event.userId,
          patterns: (event.payload?.patterns ?? []) as Pattern[],
          scores: event.payload?.behaviorScores ?? {},
        })

        console.log('[PAYWALL]', {
          userId: event.userId,
          offerType: conversion.offerType,
        })

        void dispatch({
          userId: event.userId,
          delivery: {
            channel: conversionAction.channel,
            adaptedMessage: JSON.stringify(paywall),
            meta: {
              type: 'paywall',
              offerType: conversion.offerType,
            },
          },
        }).catch(error => {
          console.warn('[PAYWALL]', {
            userId: event.userId,
            status: 'delivery_failed',
            reason: error instanceof Error ? error.message : 'unknown_error',
          })
        })
      } catch (error) {
        console.warn('[PAYWALL]', {
          userId: event.userId,
          status: 'build_failed',
          reason: error instanceof Error ? error.message : 'unknown_error',
        })
      }
    }
  }

  if (event.type === 'behavior_update') {
    const lastActivityRaw = event.payload?.lastActivityAt ?? event.timestamp ?? Date.now()
      const lastActivityAt = typeof lastActivityRaw === 'number'
      ? lastActivityRaw
      : new Date(lastActivityRaw).getTime()
    const behaviorInput = deriveBehaviorInput(event, state)
    const patterns = (behaviorInput.patterns ?? []) as Pattern[]
    const decision = evaluateConversionTiming({
      userId: event.userId,
      patterns,
      scores: behaviorInput.scores,
      lastActivityAt,
    })

    void emitConversionOpportunity({
      userId: event.userId,
      decision,
      source: safeChannel ?? 'web',
    }).then(result => {
      if (result) {
        conversion = result
        const routed = routeEvent({
          type: 'conversion_opportunity',
          userId: event.userId,
          channel: safeChannel ?? 'web',
          timestamp: result.timestamp,
          payload: {
            lastActivityAt,
            preferredChannel: safeChannel,
            conversionOpportunity: result,
          },
        })
        conversionAction = routed.conversionAction
        console.log('[CONVERSION]', { userId: event.userId, status: 'ready', offerType: result.offerType })
      }
    }).catch(error => {
      console.warn('[CONVERSION]', {
        userId: event.userId,
        status: 'failed',
        reason: error instanceof Error ? error.message : 'unknown_error',
      })
    })
  }

  if (event.payload?.webMapAdaptation) {
    void runWebMapAdaptationIfEligible(event.userId, event.payload.webMapAdaptation)
      .then(result => {
        webMapAdaptation = result
        console.log('[WEB_MAP_ADAPTATION]', {
          userId: event.userId,
          skipped: Boolean(result.skipped),
          reason: result.reason ?? result.adaptationReason,
        })
      })
      .catch(error => {
        console.warn('[WEB_MAP_ADAPTATION]', {
          userId: event.userId,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'unknown_error',
        })
      })
  }

  return {
    event,
    state,
    action,
    mentor: resolvedMentor,
    conversion,
    conversionAction,
    webMapAdaptation,
  }
}
