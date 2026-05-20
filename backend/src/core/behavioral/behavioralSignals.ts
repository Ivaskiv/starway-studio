import type { BehavioralSnapshot } from './behavioralSnapshot.js'

export interface BehavioralSignals {
  currentFocus?: string | null
  unresolvedGoal: string | null
  repeatedPostponedAction: string | null
  unresolvedDecision: string | null
  repeatedRollback: boolean
  inactivityDays: number | null
  wheelImbalance?: BehavioralSnapshot['wheelImbalance']
  lastMeaningfulAction: string | null
  unfinishedStrategyNode: string | null
  lastZoomTopic: string | null
  dailyCycleInterrupted: boolean
  emotionalPattern: string | null
  momentumLevel: BehavioralSnapshot['momentumLevel']
  focusParticipation: boolean
  focusSessionsCount: number
  lastWeeklyReportInsight: string | null
  repeatedAvoidancePattern: string | null
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function resolveBehavioralSignals(snapshot: BehavioralSnapshot): BehavioralSignals {
  return {
    currentFocus: normalizeText(snapshot.currentFocus),
    unresolvedGoal: normalizeText(snapshot.unresolvedGoal),
    repeatedPostponedAction: normalizeText(snapshot.repeatedPostponedAction),
    unresolvedDecision: normalizeText(snapshot.unresolvedDecision),
    repeatedRollback: Boolean(snapshot.repeatedRollback),
    inactivityDays: typeof snapshot.inactivityDays === 'number' ? snapshot.inactivityDays : null,
    wheelImbalance: snapshot.wheelImbalance ?? undefined,
    lastMeaningfulAction: normalizeText(snapshot.lastMeaningfulAction),
    unfinishedStrategyNode: normalizeText(snapshot.unfinishedStrategyNode),
    lastZoomTopic: normalizeText(snapshot.lastZoomTopic),
    dailyCycleInterrupted: Boolean(snapshot.dailyCycleInterrupted),
    emotionalPattern: normalizeText(snapshot.emotionalPattern),
    momentumLevel: snapshot.momentumLevel ?? 'low',
    focusParticipation: Boolean(snapshot.focusParticipation),
    focusSessionsCount: Number.isFinite(snapshot.focusSessionsCount ?? NaN) ? Number(snapshot.focusSessionsCount) : 0,
    lastWeeklyReportInsight: normalizeText(snapshot.lastWeeklyReportInsight),
    repeatedAvoidancePattern: normalizeText(snapshot.repeatedAvoidancePattern),
  }
}
