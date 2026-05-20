export interface BehavioralSnapshot {
  currentFocus?: string
  unresolvedGoal?: string
  repeatedPostponedAction?: string
  dominantBlock?: 'state' | 'goal' | 'choice' | 'decision' | 'action'
  inactivityDays?: number
  repeatedRollback?: boolean
  wheelImbalance?: {
    weakestArea: string
    score: number
  }
  lastMeaningfulAction?: string
  unfinishedStrategyNode?: string
  lastZoomTopic?: string
  dailyCycleInterrupted?: boolean
  emotionalPattern?: string
  momentumLevel?: 'low' | 'medium' | 'high'
  focusParticipation?: boolean
  focusSessionsCount?: number
  lastWeeklyReportInsight?: string
  unresolvedDecision?: string
  repeatedAvoidancePattern?: string
}

export type BehavioralBlock = BehavioralSnapshot['dominantBlock']

export interface BehavioralAnswerInput {
  category: BehavioralBlock
  text: string
  score?: number
  questionId?: string
  answerId?: string
}

export interface BehavioralSnapshotInput {
  answers?: BehavioralAnswerInput[]
  userState?: Partial<BehavioralSnapshot>
}

const BEHAVIORAL_BLOCK_ORDER: BehavioralBlock[] = ['state', 'goal', 'choice', 'decision', 'action']

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizeScore(value: unknown): number {
  const score = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(score) ? score : 0
}

function deriveDominantBlock(answers: BehavioralAnswerInput[], fallback: BehavioralBlock = 'state'): BehavioralBlock {
  const totals = new Map<BehavioralBlock, number>([
    ['state', 0],
    ['goal', 0],
    ['choice', 0],
    ['decision', 0],
    ['action', 0],
  ])

  for (const answer of answers) {
    totals.set(answer.category, (totals.get(answer.category) ?? 0) + normalizeScore(answer.score))
  }

  return [...totals.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1]
    return BEHAVIORAL_BLOCK_ORDER.indexOf(left[0]) - BEHAVIORAL_BLOCK_ORDER.indexOf(right[0])
  })[0]?.[0] ?? fallback
}

function deriveInactivityDays(answers: BehavioralAnswerInput[], userState?: Partial<BehavioralSnapshot>): number | undefined {
  if (typeof userState?.inactivityDays === 'number') {
    return userState.inactivityDays
  }

  if (!answers.length) return undefined

  const maxScore = answers.length * 5
  const totalScore = answers.reduce((sum, answer) => sum + normalizeScore(answer.score), 0)
  return Math.max(0, Math.min(30, Math.round((maxScore - totalScore) / 2)))
}

function deriveMomentumLevel(input: {
  inactivityDays: number | undefined
  repeatedRollback: boolean
  dailyCycleInterrupted: boolean
  focusParticipation: boolean
  answers: BehavioralAnswerInput[]
}): BehavioralSnapshot['momentumLevel'] {
  if (input.repeatedRollback || input.dailyCycleInterrupted) return 'low'
  if (typeof input.inactivityDays === 'number' && input.inactivityDays >= 14) return 'low'
  if (typeof input.inactivityDays === 'number' && input.inactivityDays >= 7) {
    return input.focusParticipation ? 'medium' : 'low'
  }
  if (input.answers.some((answer) => normalizeScore(answer.score) >= 4)) return 'high'
  if (input.answers.length > 0) return 'medium'
  return 'low'
}

function selectAnswer(
  answers: BehavioralAnswerInput[],
  category: BehavioralBlock,
): BehavioralAnswerInput | undefined {
  return answers
    .filter((answer) => answer.category === category)
    .sort((left, right) => normalizeScore(right.score) - normalizeScore(left.score))[0]
}

function buildSnapshotFromInputs(input: BehavioralSnapshotInput): BehavioralSnapshot {
  const answers = (input.answers ?? [])
    .map((answer) => ({
      ...answer,
      text: normalizeText(answer.text) ?? '',
      score: normalizeScore(answer.score),
    }))
    .filter((answer) => answer.text.length > 0)

  const dominantBlock = input.userState?.dominantBlock ?? deriveDominantBlock(answers, 'state')
  const goalAnswer = selectAnswer(answers, 'goal')
  const actionAnswer = selectAnswer(answers, 'action')
  const decisionAnswer = selectAnswer(answers, 'decision')
  const choiceAnswer = selectAnswer(answers, 'choice')
  const stateAnswer = selectAnswer(answers, 'state')

  const unresolvedGoal = normalizeText(input.userState?.unresolvedGoal)
    ?? goalAnswer?.text
    ?? choiceAnswer?.text
    ?? stateAnswer?.text
    ?? undefined

  const repeatedPostponedAction = normalizeText(input.userState?.repeatedPostponedAction)
    ?? actionAnswer?.text
    ?? decisionAnswer?.text
    ?? choiceAnswer?.text
    ?? undefined

  const currentFocus = normalizeText(input.userState?.currentFocus)
    ?? unresolvedGoal
    ?? repeatedPostponedAction
    ?? selectAnswer(answers, dominantBlock)?.text
    ?? undefined

  const inactivityDays = deriveInactivityDays(answers, input.userState)
  const repeatedRollback = input.userState?.repeatedRollback ?? Boolean(
    dominantBlock === 'decision' && (decisionAnswer || choiceAnswer) && normalizeScore(decisionAnswer?.score) <= 3,
  )
  const wheelImbalance = input.userState?.wheelImbalance
  const lastMeaningfulAction = normalizeText(input.userState?.lastMeaningfulAction)
    ?? actionAnswer?.text
    ?? decisionAnswer?.text
    ?? choiceAnswer?.text
    ?? undefined
  const unfinishedStrategyNode = normalizeText(input.userState?.unfinishedStrategyNode)
    ?? unresolvedGoal
    ?? currentFocus
    ?? undefined
  const lastZoomTopic = normalizeText(input.userState?.lastZoomTopic) ?? undefined
  const dailyCycleInterrupted = input.userState?.dailyCycleInterrupted ?? Boolean(typeof inactivityDays === 'number' && inactivityDays >= 3)
  const emotionalPattern = normalizeText(input.userState?.emotionalPattern)
    ?? (dominantBlock === 'state'
      ? 'напруга на старті'
      : dominantBlock === 'decision'
        ? 'напруга у виборі'
        : dominantBlock === 'action'
          ? 'напруга у першому кроці'
          : undefined)

  const focusParticipation = input.userState?.focusParticipation ?? answers.some((answer) => answer.category === 'goal' || answer.category === 'action')
  const focusSessionsCount = input.userState?.focusSessionsCount ?? (focusParticipation ? 1 : 0)
  const momentumLevel = input.userState?.momentumLevel ?? deriveMomentumLevel({
    inactivityDays,
    repeatedRollback,
    dailyCycleInterrupted,
    focusParticipation,
    answers,
  })

  return {
    currentFocus,
    unresolvedGoal,
    repeatedPostponedAction,
    dominantBlock,
    inactivityDays,
    repeatedRollback,
    wheelImbalance,
    lastMeaningfulAction,
    unfinishedStrategyNode,
    lastZoomTopic,
    dailyCycleInterrupted,
    emotionalPattern,
    momentumLevel,
    focusParticipation,
    focusSessionsCount,
    lastWeeklyReportInsight: normalizeText(input.userState?.lastWeeklyReportInsight) ?? undefined,
    unresolvedDecision: normalizeText(input.userState?.unresolvedDecision) ?? decisionAnswer?.text ?? undefined,
    repeatedAvoidancePattern: normalizeText(input.userState?.repeatedAvoidancePattern) ?? choiceAnswer?.text ?? undefined,
  }
}

export type { BehavioralSignals } from './behavioralSignals.js'
export { buildBehavioralSnapshotFromUserId } from './behavioralAnalyzer.js'

export function buildBehavioralSnapshot(input: BehavioralSnapshotInput): BehavioralSnapshot
export function buildBehavioralSnapshot(userId: string): Promise<BehavioralSnapshot>
export function buildBehavioralSnapshot(inputOrUserId: string | BehavioralSnapshotInput): BehavioralSnapshot | Promise<BehavioralSnapshot> {
  if (typeof inputOrUserId === 'string') {
    return import('./behavioralAnalyzer.js').then(({ buildBehavioralSnapshotFromUserId }) => buildBehavioralSnapshotFromUserId(inputOrUserId))
  }

  return buildSnapshotFromInputs(inputOrUserId)
}
