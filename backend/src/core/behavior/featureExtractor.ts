import type { Features, RawEvent } from './types.js'

const POSITIVE_TEXT_MARKERS = [
  'зробив',
  'зробила',
  'готово',
  'вийшло',
  'фокус',
  'ясність',
  'рухаюсь',
  'стабільно',
]

const NEGATIVE_TEXT_MARKERS = [
  'потім',
  'не хочу',
  'не можу',
  'відкладу',
  'зависаю',
  'хаос',
  'важко',
  'уникаю',
]

function sortEvents(events: RawEvent[]) {
  return [...events].sort((left, right) => left.timestamp - right.timestamp)
}

function clampSentiment(value: number) {
  return Math.max(-1, Math.min(1, value))
}

function extractSentiment(events: RawEvent[]) {
  const textInputs = events.filter(event => event.type === 'text_input')
  if (textInputs.length === 0) return undefined

  let score = 0
  for (const event of textInputs) {
    const text = String(event.metadata?.text ?? '').toLowerCase()
    if (!text) continue

    for (const marker of POSITIVE_TEXT_MARKERS) {
      if (text.includes(marker)) score += 1
    }
    for (const marker of NEGATIVE_TEXT_MARKERS) {
      if (text.includes(marker)) score -= 1
    }
  }

  return clampSentiment(score / Math.max(1, textInputs.length * 2))
}

function countFocusSwitches(events: RawEvent[]) {
  let focusSwitches = 0
  let windowStartIndex = 0

  for (let index = 0; index < events.length; index += 1) {
    while (events[index].timestamp - events[windowStartIndex].timestamp > 10 * 60 * 1000) {
      windowStartIndex += 1
    }

    const windowEvents = events.slice(windowStartIndex, index + 1)
    const taskIds = new Set(
      windowEvents
        .map(event => event.metadata?.taskId)
        .filter((taskId): taskId is string => typeof taskId === 'string' && taskId.trim().length > 0),
    )

    if (taskIds.size > 3) {
      focusSwitches = Math.max(focusSwitches, taskIds.size)
    }
  }

  return Math.max(0, focusSwitches)
}

function maxInactivityGap(events: RawEvent[]) {
  let inactivityGap = 0

  for (let index = 1; index < events.length; index += 1) {
    const gap = events[index].timestamp - events[index - 1].timestamp
    inactivityGap = Math.max(inactivityGap, gap)
  }

  return inactivityGap
}

export function extractFeatures(events: RawEvent[]): Features {
  if (events.length === 0) {
    return {
      sessionLength: 0,
      tasksCompleted: 0,
      tasksSkipped: 0,
      focusSwitches: 0,
      inactivityGap: 0,
    }
  }

  const orderedEvents = sortEvents(events)
  const firstTimestamp = orderedEvents[0]?.timestamp ?? 0
  const lastTimestamp = orderedEvents[orderedEvents.length - 1]?.timestamp ?? firstTimestamp

  return {
    sessionLength: Math.max(0, lastTimestamp - firstTimestamp),
    tasksCompleted: orderedEvents.filter(event => event.type === 'task_complete').length,
    tasksSkipped: orderedEvents.filter(event => event.type === 'task_skip').length,
    focusSwitches: countFocusSwitches(orderedEvents),
    inactivityGap: maxInactivityGap(orderedEvents),
    sentimentScore: extractSentiment(orderedEvents),
  }
}
