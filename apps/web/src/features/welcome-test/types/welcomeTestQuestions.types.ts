export type WelcomeTestQuestion = {
  id: string
  prompt: string
  answers: Array<{
    id: string
    text: string
  }>
  behavioralType?: string
  nextQuestionId?: string | null
}

export type WelcomeTestQuestionsResponse = {
  questions: WelcomeTestQuestion[]
  total: number
}
