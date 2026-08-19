export type AbTestQuestion = {
  id: string
  prompt: string
  answers: Array<{
    id: string
    text: string
  }>
  behavioralType?: string
  nextQuestionId?: string | null
}

export type AbTestQuestionsResponse = {
  questions: AbTestQuestion[]
  total: number
}

export type AbTestProgressResponse = {
  answers: Array<{
    questionId?: string
    answerId?: string
    question_id: string
    answer_id: string
  }>
  currentIndex: number
  resultType: string | null
  status: string
}

export type AbTestAnswerId = 'state' | 'goal' | 'choice' | 'decision' | 'action'
export type AbTestResultType = 'STATE' | 'GOAL' | 'CHOICE' | 'DECISION' | 'ACTION'

export type AbTestResult = {
  type: AbTestResultType
  dominantScore: number
  categoryBreakdown: Record<AbTestResultType, number>
  dominantBlock: 'state' | 'goal' | 'choice' | 'decision' | 'action'
  unresolvedGoal: string
  repeatedPostponedAction: string
  inactivityDays: number
  narrative: string
  nextAction: string
  nextActionCta: string
}

export type StoredState = {
  currentIndex: number
  answers: Record<string, string>
  result: AbTestResult | null
  source?: 'anonymous' | 'authenticated'
}

export type StoredResultRouteState = {
  result?: AbTestResult | null
}

export type ResultScoreRow = {
  questionId: string
  answerId: AbTestAnswerId
  answerText: string
  score: number
  category: 'state' | 'goal' | 'choice' | 'decision' | 'action'
}

export type ProgressBallState = 'done' | 'active' | 'pending'
