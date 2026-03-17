// frontend/src/features/daily-cycle/questions/hooks/useQuestionsScheduler.ts
import { useQuestions } from '@/features/daily-cycle/questions/hooks/useQuestion'
import { sendTelegramMessage } from '@/features/social/services/telegram.service'
import { useEffect, useState } from 'react'
import type {
  AnswerInput,
  Decision,
  Question,
  QuestionContext,
} from '../types/questions.types'

interface UseQuestionsSchedulerOptions {
  userId: string
  context?: QuestionContext
  contextId?: string
  telegramChatId?: string
  schedule?: 'once' | 'twice'
}

export const useQuestionsScheduler = ({
  userId,
  context = 'mentor',
  contextId,
  telegramChatId,
  schedule = 'once',
}: UseQuestionsSchedulerOptions) => {
  const { questions, isLoading, submitAnswers, isSubmitting, refetch } = useQuestions({
    userId,
    context,
    contextId,
    telegramChatId,
  })

  const [readyToAsk, setReadyToAsk] = useState(false)

  useEffect(() => {
    if (!questions.length) return
    const hour = new Date().getHours()
    if (schedule === 'once'  && hour === 9)               setReadyToAsk(true)
    if (schedule === 'twice' && (hour === 9 || hour === 18)) setReadyToAsk(true)
  }, [questions, schedule])

  useEffect(() => {
    if (!readyToAsk || !telegramChatId) return
    questions.forEach((q: Question) => {
      sendTelegramMessage({
        chatId: telegramChatId,
        text: `📝 ${q.text}`,
        parseMode: 'MarkdownV2',
        meta: { source: 'questions', entityId: q.id },
      })
    })
  }, [readyToAsk, questions, telegramChatId])

  const submit = async (answers: AnswerInput[]): Promise<Decision[]> =>
    submitAnswers(answers)

  // відповісти на одне питання одним значенням
  const answer = async (question: (typeof questions)[number], value: string) => {
    await submit([{ questionId: question.id, value }])
  }

  // заглушка — створення питання через UI (опціонально)
  const create = async (payload: Partial<Question>) => Promise.resolve()

  // PDF export заглушка
  const exportPDF = () => ({
    save: (filename: string) => console.warn('[PDF] not implemented', filename),
  })

  return {
    questions,
    isLoading,
    readyToAsk,
    submit,
    answer,
    create,
    exportPDF,
    isSubmitting,
    refetch,
  }
}
