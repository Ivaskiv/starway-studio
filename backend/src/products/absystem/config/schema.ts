/**
 * Database Model Extensions for UserTestContext
 */

export enum TestStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface UserTestAnswer {
  questionId: string
  answerId: string
}

export interface UserTestContext {
  id: string
  webSessionId: string | null
  telegramUserId: string | null
  linkToken: string // unique, indexed server-side UUID
  status: TestStatus
  currentQuestionIndex: number
  answers: UserTestAnswer[]
  result: string | null
  startedAt: Date
  completedAt: Date | null
}
