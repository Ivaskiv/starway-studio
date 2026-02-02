// frontend/src/features/questionsScheduler/hooks/useQuestionsScheduler.ts
import { runDecisionEngine } from '@/features/aiDecisionEngine/engine/decisionEngine'
import { useMiniAppDuplicator } from '@/features/communicationFlow/miniApp/miniApp.wrapper'
import {
  useGetQuestionsQuery,
  useAnswerQuestionMutation,
  useCreateMicroTaskMutation,
  useCreateQuestionMutation,
} from '@/features/questionsScheduler/services/questions.api'
import { sendTelegramMessage } from '@/features/communicationFlow/telegram/telegram.service'
import { Question } from '@/features/questionsScheduler/types/questions.types'
import jsPDF from 'jspdf'
import { setLastDecision } from '@/features/aiDecisionEngine/hooks/useLastDecision'

export const useQuestionsScheduler = (userId: string, telegramChatId?: string) => {
  const { duplicate } = useMiniAppDuplicator(userId)

  // ✅ Дані запитуються з Questions API
  const {
    data: questions = [],
    isLoading,
    isError,
  } = useGetQuestionsQuery(userId)

  const [answerQuestion] = useAnswerQuestionMutation()
  const [createMicroTask] = useCreateMicroTaskMutation()
  const [createQuestion] = useCreateQuestionMutation()

  // Відповідь на питання
  const answer = async (question: Question, answerText: string) => {
    await answerQuestion({ questionId: question.id, userId, answer: answerText }).unwrap()

    const decision = await runDecisionEngine({
      userId,
      feature: 'questionsScheduler',
      module: question.frequency ?? 'default',
      source: 'questionsScheduler',
      subscriptionTier: 'trial',
      streakDays: 0,
      metrics: { stability: 0, drains: 0, consistency: 0 },
      payload: {
        questionId: question.id,
        questionTitle: question.title,
        frequency: question.frequency,
        answer: answerText,
      },
    })
setLastDecision(decision)

    if (decision.microTasks?.length) {
      for (const task of decision.microTasks) {
        if (task.persist !== true) {
      await duplicate(task, 'microTask')
      continue
    }
        await createMicroTask({
          userId,
          linkedQuestionId: question.id,
          title: task.title,
          description: task.description,
          source: 'questionsScheduler',
        }).unwrap()
        await duplicate(task, 'microTask')
      }
    }

    if (telegramChatId && decision.supportMessage) {
      await sendTelegramMessage({
        chatId: telegramChatId,
        text: decision.supportMessage,
        parseMode: 'MarkdownV2',
      })
    }

    if (telegramChatId && decision.upsell?.productIds?.length) {
      await sendTelegramMessage({
        chatId: telegramChatId,
        text: `✨ Рекомендовані продукти: ${decision.upsell.productIds.join(', ')}`,
        parseMode: 'MarkdownV2',
      })
    }

    await duplicate(
      { questionId: question.id, questionTitle: question.title, answer: answerText },
      'question',
    )
  }

  // Створення нового питання
  const create = async (q: Partial<Question>) => {
    const created = await createQuestion(q).unwrap()
    await duplicate(created, 'question')
    return created
  }

  // Експорт PDF
  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(`Звіт користувача ${userId}`, 10, 10)
    questions.forEach((q: Question, i: number) => {
      doc.text(`${i + 1}. ${q.title}`, 10, 20 + i * 10)
    })
    return doc
  }

  return {
    questions: questions as Question[],
    answer,
    create,
    exportPDF,
    isLoading,
    isError,
  }
}
