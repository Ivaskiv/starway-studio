import type { BehaviorScore, Features, Pattern } from './types.js'

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeSessionLength(sessionLength: number) {
  const thirtyMinutesMs = 30 * 60 * 1000
  return Math.max(0, Math.min(1, sessionLength / thirtyMinutesMs))
}

function calculateProcrastination(features: Features, patterns: Pattern[]) {
  const totalTasks = features.tasksCompleted + features.tasksSkipped
  const ratio = totalTasks > 0 ? features.tasksSkipped / totalTasks : 0
  const inactivityWeight = Math.min(1, features.inactivityGap / (2 * 60 * 60 * 1000))
  const patternBoost = patterns.includes('procrastination') ? 20 : 0

  return clampScore(ratio * 70 + inactivityWeight * 20 + patternBoost)
}

function calculateAvoidance(features: Features, patterns: Pattern[]) {
  const skipWeight = Math.min(1, features.tasksSkipped / 5)
  const lowSentimentWeight = typeof features.sentimentScore === 'number'
    ? Math.max(0, -features.sentimentScore)
    : 0
  const patternBoost = patterns.includes('avoidance') ? 30 : 0

  return clampScore(skipWeight * 45 + lowSentimentWeight * 25 + patternBoost)
}

function calculateEngagement(features: Features, patterns: Pattern[]) {
  const sessionWeight = normalizeSessionLength(features.sessionLength)
  const completionWeight = Math.min(1, features.tasksCompleted / 4)
  const focusPenalty = Math.min(1, features.focusSwitches / 8)
  const sentimentLift = typeof features.sentimentScore === 'number'
    ? Math.max(0, features.sentimentScore)
    : 0
  const patternBoost = patterns.includes('high_engagement') ? 15 : 0

  return clampScore(sessionWeight * 35 + completionWeight * 45 + sentimentLift * 10 - focusPenalty * 15 + patternBoost)
}

function calculateConsistency(features: Features, patterns: Pattern[]) {
  const inactivityPenalty = Math.min(1, features.inactivityGap / (4 * 60 * 60 * 1000))
  const switchingPenalty = Math.min(1, features.focusSwitches / 6)
  const patternPenalty = patterns.includes('inconsistency') ? 25 : 0
  const dropOffPenalty = patterns.includes('drop_off') ? 20 : 0

  return clampScore(100 - inactivityPenalty * 45 - switchingPenalty * 20 - patternPenalty - dropOffPenalty)
}

export function calculateScores(features: Features, patterns: Pattern[]): BehaviorScore {
  return {
    procrastination: calculateProcrastination(features, patterns),
    avoidance: calculateAvoidance(features, patterns),
    engagement: calculateEngagement(features, patterns),
    consistency: calculateConsistency(features, patterns),
  }
}
