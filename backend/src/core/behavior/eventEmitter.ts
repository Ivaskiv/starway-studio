import { dispatch } from '../delivery/deliveryDispatcher.js'
import { routeEvent, type RoutedOrchestratorEvent } from '../orchestrator/eventRouter.js'
import { buildBehaviorDelivery } from './deliveryBuilder.js'
import type { ChannelContext } from '../orchestrator/channelRouter.js'
import { resolveIntent } from '../mentor/intentResolver.js'
import type { BehaviorInput, Intent, MentorDelivery } from '../mentor/types.js'
import { rememberExpectedAction } from '../growth/feedbackEngine.js'
import type { BehaviorScore, BehaviorUpdateEvent, Pattern } from './types.js'

function mapPatternsToChurnSignals(patterns: Pattern[], scores: BehaviorScore) {
  const signals: string[] = patterns.filter(pattern =>
    pattern === 'procrastination'
    || pattern === 'avoidance'
    || pattern === 'drop_off'
    || pattern === 'inconsistency',
  )

  if (scores.procrastination >= 65) signals.push('procrastination_score_high')
  if (scores.avoidance >= 60) signals.push('avoidance_score_high')
  if (scores.consistency <= 35) signals.push('consistency_low')

  return [...new Set(signals)]
}

function mapPatternsToBehaviorTags(patterns: Pattern[], scores: BehaviorScore) {
  const tags: string[] = [...patterns]

  if (scores.engagement >= 70) tags.push('engaged')
  if (scores.consistency >= 70) tags.push('consistent')
  if (scores.engagement <= 25) tags.push('low_engagement')

  return [...new Set(tags)]
}

export function emitBehaviorEvent(
  userId: string,
  scores: BehaviorScore,
  patterns: Pattern[],
  options: {
    intent?: Intent
    delivery?: MentorDelivery
    channelContext?: Partial<ChannelContext>
  } = {},
): {
  behaviorEvent: BehaviorUpdateEvent
  routedEvent: RoutedOrchestratorEvent
} {
  const timestamp = Date.now()
  const behaviorInput: BehaviorInput = {
    userId,
    patterns,
    scores,
  }
  const intent = options.intent ?? resolveIntent(behaviorInput)
  const initialDelivery = options.delivery ?? buildBehaviorDelivery(behaviorInput, intent, patterns, options.channelContext)
  const behaviorEvent: BehaviorUpdateEvent = {
    type: 'behavior_update',
    userId,
    scores,
    patterns,
    timestamp,
    delivery: initialDelivery,
  }

  const routedEvent = routeEvent({
    type: 'behavior_update',
    userId,
    channel: initialDelivery.channel,
    timestamp,
    payload: {
      lastActivityAt: timestamp,
      engagementEvents: scores.engagement >= 50 ? 2 : 0,
      behaviorScores: scores,
      patterns,
      delivery: initialDelivery,
      channelContext: options.channelContext,
      churnSignals: mapPatternsToChurnSignals(patterns, scores),
      behaviorTags: mapPatternsToBehaviorTags(patterns, scores),
      inactivityHours: scores.consistency <= 25 ? 96 : undefined,
    },
  })

  const delivery = routedEvent.mentor?.message
    ? {
        channel: routedEvent.mentor.message.channel,
        adaptedMessage: routedEvent.mentor.message.text,
        meta: routedEvent.mentor.message.meta,
      }
    : behaviorEvent.delivery

  if (delivery?.meta?.expected_action && delivery.meta.strategyKey) {
    rememberExpectedAction(userId, delivery.meta.strategyKey, delivery.meta.timestamp)
  }

  void dispatch({
    userId,
    intent: routedEvent.mentor?.intent ?? intent,
    delivery: delivery ?? {
      channel: 'web',
      adaptedMessage: '',
    },
  })

  return {
    behaviorEvent: {
      ...behaviorEvent,
      delivery,
      meta: delivery?.meta,
    },
    routedEvent,
  }
}
