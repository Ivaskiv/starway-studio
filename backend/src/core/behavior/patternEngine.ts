import type { Features, Pattern, RawEvent } from './types.js'

const HIGH_INACTIVITY_MS = 30 * 60 * 1000
const HIGH_SESSION_MS = 20 * 60 * 1000

function hasRepeatedSkippedTasks(events: RawEvent[]) {
  const skippedByTask = new Map<string, number>()

  for (const event of events) {
    if (event.type !== 'task_skip') continue
    const taskId = typeof event.metadata?.taskId === 'string' ? event.metadata.taskId : null
    if (!taskId) continue
    skippedByTask.set(taskId, (skippedByTask.get(taskId) ?? 0) + 1)
  }

  return [...skippedByTask.values()].some(count => count >= 2)
}

function hasDropOff(events: RawEvent[], features: Features) {
  if (events.length < 2) return false

  const orderedEvents = [...events].sort((left, right) => left.timestamp - right.timestamp)
  const firstEvent = orderedEvents[0]
  const secondEvent = orderedEvents[1]
  const lastEvent = orderedEvents[orderedEvents.length - 1]
  const earlyStop = lastEvent.timestamp - firstEvent.timestamp <= 5 * 60 * 1000
  const startedButDidNotProgress = firstEvent.type === 'login' && !orderedEvents.some(event => event.type === 'task_complete')
  const abruptGap = secondEvent ? secondEvent.timestamp - firstEvent.timestamp >= HIGH_INACTIVITY_MS : false

  return earlyStop || startedButDidNotProgress || (features.tasksCompleted === 0 && abruptGap)
}

function hasInconsistency(events: RawEvent[]) {
  if (events.length < 3) return false

  const dayBuckets = new Set(
    events.map(event => new Date(event.timestamp).toISOString().slice(0, 10)),
  )

  const ordered = [...events].sort((left, right) => left.timestamp - right.timestamp)
  const gaps: number[] = []
  for (let index = 1; index < ordered.length; index += 1) {
    gaps.push(ordered[index].timestamp - ordered[index - 1].timestamp)
  }

  const meanGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
  const variance = gaps.reduce((sum, gap) => sum + (gap - meanGap) ** 2, 0) / gaps.length

  return dayBuckets.size >= 2 && variance > (18 * 60 * 60 * 1000) ** 2
}

export function detectPatterns(features: Features, events: RawEvent[] = []): Pattern[] {
  const patterns = new Set<Pattern>()

  if (features.tasksSkipped > features.tasksCompleted && features.inactivityGap >= HIGH_INACTIVITY_MS) {
    patterns.add('procrastination')
  }

  if (hasRepeatedSkippedTasks(events)) {
    patterns.add('avoidance')
  }

  if (features.sessionLength >= HIGH_SESSION_MS && features.tasksCompleted >= 2) {
    patterns.add('high_engagement')
  }

  if (hasDropOff(events, features)) {
    patterns.add('drop_off')
  }

  if (hasInconsistency(events)) {
    patterns.add('inconsistency')
  }

  return [...patterns]
}
