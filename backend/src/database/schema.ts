export enum TestStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export type UserTestAnswer = {
  questionId: string
  answerId: string
}

export type UserTestContext = {
  id: string
  linkToken: string
  userId: string
  status: TestStatus
  currentQuestionIndex: number
  answers: UserTestAnswer[]
  result: string | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
