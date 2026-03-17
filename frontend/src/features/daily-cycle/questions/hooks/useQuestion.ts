// frontend/src/features/daily-cycle/questions/hooks/useQuestion.ts
// Головний хук + реекспорт scheduler — єдина точка входу для цієї папки

import { runDecisionEngine } from '@/features/ai-engine/decisions/engine/decisionEngine'
import { sendTelegramMessage } from '@/features/social/services/telegram.service'
import { useCallback } from 'react'
import {
  useGetQuestionsQuery,
  useSubmitAnswersMutation,
} from '../services/questions.api'
import {
  type AnswerInput,
  type Decision,
  type UseQuestionsOptions,
  normalizeDecisionsArray,
} from '../types/questions.types'

// ── Головний хук питань → відповідей → рішень ────────────────────────────────
export const useQuestions = ({
  userId,
  context,
  contextId,
  telegramChatId,
}: UseQuestionsOptions) => {
  const { data: questions = [], isLoading, refetch } = useGetQuestionsQuery(
    { userId, context, contextId },
    { skip: !userId },
  )

  const [submitAnswersMutation, { isLoading: isSubmitting }] = useSubmitAnswersMutation()

  const submitAnswers = useCallback(
    async (answers: AnswerInput[]): Promise<Decision[]> => {
      if (!answers?.length) throw new Error('Немає відповідей для обробки')

      try {
        const response = await submitAnswersMutation({ userId, context, contextId, answers }).unwrap()
        const normalized = normalizeDecisionsArray(response?.decisions ?? [])
        const filtered   = runDecisionEngine(normalized)

        if (telegramChatId) {
          filtered.forEach(d => {
            if (d.supportMessage) {
              sendTelegramMessage({
                chatId: telegramChatId,
                text: `*${d.supportMessage}*`,
                parseMode: 'MarkdownV2',
                meta: { source: context, entityId: d.id },
              })
            }
          })
        }

        return filtered
      } catch (error: unknown) {
        console.error('[useQuestions] error:', error)
        if (telegramChatId) {
          sendTelegramMessage({
            chatId: telegramChatId,
            text: '⚠️ Щось пішло не так при обробці відповідей. Спробуй ще раз.',
            parseMode: 'MarkdownV2',
          })
        }
        throw error
      }
    },
    [userId, context, contextId, telegramChatId, submitAnswersMutation],
  )

  return { questions, isLoading, submitAnswers, isSubmitting, refetch }
}

// ── Реекспорт scheduler — щоб компоненти могли імпортувати з одного місця ───
export { useQuestionsScheduler } from './useQuestionsScheduler'
