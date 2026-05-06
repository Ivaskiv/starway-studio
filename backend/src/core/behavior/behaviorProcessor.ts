import { emitBehaviorEvent } from './eventEmitter.js'
import { extractFeatures } from './featureExtractor.js'
import { detectPatterns } from './patternEngine.js'
import { calculateScores } from './scoringEngine.js'
import { buildBehaviorDelivery, normalizeBehaviorChannelContext } from './deliveryBuilder.js'
import { resolveIntent } from '../mentor/intentResolver.js'
import type {
  BehaviorProcessResult,
  ProcessBehaviorOptions,
  RawEvent,
} from './types.js'

const DEFAULT_DEBOUNCE_MS = 500

const bufferedEvents = new Map<string, RawEvent[]>()
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function processUserBehavior(
  rawEvents: RawEvent[],
  options: ProcessBehaviorOptions = {},
): BehaviorProcessResult | null {
  if (rawEvents.length === 0) return null

  const orderedEvents = [...rawEvents].sort((left, right) => left.timestamp - right.timestamp)
  const userId = orderedEvents[0]?.userId
  if (!userId) return null

  const features = extractFeatures(orderedEvents)
  const patterns = detectPatterns(features, orderedEvents)
  const scores = calculateScores(features, patterns)
  const behaviorInput = { userId, patterns, scores }
  const intent = resolveIntent(behaviorInput)
  const channelContext = normalizeBehaviorChannelContext(options.channelContext)
  const delivery = buildBehaviorDelivery(behaviorInput, intent, patterns, channelContext)

  if (options.emit === false) {
    const timestamp = Date.now()
    return {
      userId,
      features,
      patterns,
      scores,
      event: {
        type: 'behavior_update',
        userId,
        scores,
        patterns,
        timestamp,
        delivery,
      },
      routedEvent: null,
    }
  }

  const emitted = emitBehaviorEvent(userId, scores, patterns, {
    intent,
    delivery,
    channelContext,
  })

  return {
    userId,
    features,
    patterns,
    scores,
    event: emitted.behaviorEvent,
    routedEvent: emitted.routedEvent,
  }
}

export function queueBehaviorEvent(
  event: RawEvent,
  options: ProcessBehaviorOptions = {},
): Promise<BehaviorProcessResult | null> {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const current = bufferedEvents.get(event.userId) ?? []
  bufferedEvents.set(event.userId, [...current, event])

  const pending = pendingTimers.get(event.userId)
  if (pending) {
    clearTimeout(pending)
  }

  return new Promise(resolve => {
    const timer = setTimeout(() => {
      pendingTimers.delete(event.userId)
      const events = bufferedEvents.get(event.userId) ?? []
      bufferedEvents.delete(event.userId)
      resolve(processUserBehavior(events, options))
    }, debounceMs)

    pendingTimers.set(event.userId, timer)
  })
}

function printSimulationResult(label: string, result: BehaviorProcessResult | null) {
  console.log(`\n[BehaviorSimulation] ${label}`)
  if (!result) {
    console.log('No result produced.')
    return
  }

  console.log('Features:', result.features)
  console.log('Patterns:', result.patterns)
  console.log('Scores:', result.scores)
  console.log('Event:', result.event)
  console.log('Routed:', result.routedEvent)
}

export function simulateBehavior() {
  const now = Date.now()

  const procrastinationCase: RawEvent[] = [
    { userId: 'sim-procrastination', type: 'login', timestamp: now },
    { userId: 'sim-procrastination', type: 'task_skip', timestamp: now + 2 * 60 * 1000, metadata: { taskId: 'task-a' } },
    { userId: 'sim-procrastination', type: 'text_input', timestamp: now + 4 * 60 * 1000, metadata: { text: 'потім зроблю, зараз хаос' } },
    { userId: 'sim-procrastination', type: 'task_skip', timestamp: now + 45 * 60 * 1000, metadata: { taskId: 'task-a' } },
    { userId: 'sim-procrastination', type: 'session_end', timestamp: now + 47 * 60 * 1000 },
  ]

  const engagementCase: RawEvent[] = [
    { userId: 'sim-engagement', type: 'login', timestamp: now },
    { userId: 'sim-engagement', type: 'text_input', timestamp: now + 60 * 1000, metadata: { text: 'є ясність і фокус, рухаюсь далі' } },
    { userId: 'sim-engagement', type: 'task_complete', timestamp: now + 8 * 60 * 1000, metadata: { taskId: 'task-a' } },
    { userId: 'sim-engagement', type: 'task_complete', timestamp: now + 18 * 60 * 1000, metadata: { taskId: 'task-b' } },
    { userId: 'sim-engagement', type: 'session_end', timestamp: now + 28 * 60 * 1000 },
  ]

  const procrastinationResult = processUserBehavior(procrastinationCase)
  const engagementResult = processUserBehavior(engagementCase)

  printSimulationResult('procrastination case', procrastinationResult)
  printSimulationResult('engagement case', engagementResult)

  return {
    procrastinationCase: procrastinationResult,
    engagementCase: engagementResult,
  }
}
