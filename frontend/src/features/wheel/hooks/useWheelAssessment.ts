// frontend/src/features/wheel/hooks/useWheelAssessment.ts
import { useCallback } from 'react'
import { useGetWheelAssessmentQuery, useCreateWheelAssessmentMutation } from '@/features/wheel/services/wheel.api'
import { sendTelegramMessage } from '@/features/communicationFlow/telegram/telegram.service'
import { WheelAssessment, WheelScore } from '@/features/wheel/types/wheel.types'

interface UseWheelAssessmentOptions {
  userId: string
  telegramChatId?: string
}

export const useWheelAssessment = ({ userId, telegramChatId }: UseWheelAssessmentOptions) => {
  // ✅ Отримати останню оцінку колеса
  const { data: assessment, isLoading, isError, refetch } = useGetWheelAssessmentQuery(userId)

  // ✅ Мутація для створення нової оцінки
  const [createAssessment, { isLoading: isCreating }] = useCreateWheelAssessmentMutation()

  // Функція створення нового assessment
  const submitAssessment = useCallback(
    async (scores: WheelScore[]) => {
      const created: WheelAssessment = await createAssessment({ userId, scores }).unwrap()

      // Telegram повідомлення
      if (telegramChatId) {
        const avgScore = created.averageScore.toFixed(1)
        await sendTelegramMessage({
          chatId: telegramChatId,
          text: `🌀 Колесо Балансу оновлено! Середній бал: ${avgScore}/10`,
          parseMode: 'MarkdownV2',
        })
      }

      return created
    },
    [createAssessment, userId, telegramChatId]
  )

  return {
    assessment,
    isLoading,
    isError,
    refetch,
    submitAssessment,
    isCreating,
  }
}
