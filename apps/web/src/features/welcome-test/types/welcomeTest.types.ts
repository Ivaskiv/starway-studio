export type TestStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PAYMENT_PENDING'
  | 'PAID'

export const WELCOME_TEST_QUESTION_ORDER = [
  'q1',
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q8',
] as const

export type WelcomeTestQuestionId = (typeof WELCOME_TEST_QUESTION_ORDER)[number]

export type WelcomeTestAnswerMap = Record<string, string>

export type WelcomeTestLatencyMap = Record<string, number>

export type WelcomeTestServerStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export type WelcomeTestServerState = {
  status: WelcomeTestServerStatus
  currentQuestionIndex: number
  totalQuestions: number
  answeredQuestions: Array<{
    questionId: string
    answerId: string
  }>
  result: string | null
}

export type SubmitWelcomeTestAnswerInput = {
  linkToken: string
  questionId: string
  answerId: string
  latencyMs?: number | null
}

export type WelcomeTestErrorCode =
  | 'timeout'
  | 'network'
  | 'unauthorized'
  | 'validation'
  | 'expired_session'
  | 'unknown'

export type WelcomeTestError = {
  code: WelcomeTestErrorCode
  message: string
  status?: number
  details?: Record<string, unknown>
}

export type WelcomeTestPersistedState = {
  sessionId: string | null
  status: TestStatus
  answersMap: WelcomeTestAnswerMap
  latencyMap: WelcomeTestLatencyMap
  result: string | null
  currentQuestion: string | null
  startedAt: number | null
  lastSyncedAt: number | null
}

export type WelcomeTestSnapshot = Pick<
  WelcomeTestPersistedState,
  'status' | 'answersMap' | 'latencyMap' | 'result' | 'currentQuestion'
> & {
  questionStartedAt: number | null
}
