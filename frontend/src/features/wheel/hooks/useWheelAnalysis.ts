// frontend/src/features/wheel/hooks/useWheelAnalysis.ts
import { useCallback } from 'react'
import { useGetWheelAnalysisQuery } from '@/features/wheel/services/wheel.api'
import { sendTelegramMessage } from '@/features/communicationFlow/telegram/telegram.service'
import { WheelAnalysis, WheelCategory } from '@/features/wheel/types/wheel.types'

interface UseWheelAnalysisOptions {
  userId: string
  telegramChatId?: string
}

export const useWheelAnalysis = ({ userId, telegramChatId }: UseWheelAnalysisOptions) => {
  const { data, isLoading, isError, refetch } = useGetWheelAnalysisQuery(userId)

  // Фокусна сфера, сильні сторони, прогалини
  const analysis: WheelAnalysis | null = data ?? null

  // Відправка підтримки або upsell в Telegram
  const notifyUser = useCallback(
    async (analysis: WheelAnalysis) => {
      if (!telegramChatId || !analysis) return

      const { focusArea, recommendations, balanceScore } = analysis

      let text = `✨ Колесо Балансу оновлено!\nСфокусуйся на: ${focusArea.nameUk} ${focusArea.emoji}\nБаланс: ${balanceScore}/10`

      if (recommendations.length) {
        text += `\n\nРекомендації:\n- ${recommendations.join('\n- ')}`
      }

      await sendTelegramMessage({
        chatId: telegramChatId,
        text,
        parseMode: 'MarkdownV2',
      })
    },
    [telegramChatId]
  )

  // Мікро-завдання для прогалин
  const generateMicroTasks = useCallback(() => {
    if (!analysis) return []

    return analysis.gaps.map((gap: WheelCategory) => ({
      title: `Працюй над ${gap.nameUk}`,
      description: `Сфокусуйся на покращенні сфери "${gap.nameUk}"`,
      type: 'actionable' as const,
      persist: true,
      source: 'wheel' as const,
      reason: 'wheel_gap' as const,
      wheelImpact: {
        area: gap.id as any, // WheelArea
        delta: +2,
      },
      relatedEntity: {
        type: 'wheel' as const,
        id: gap.id,
      },
      status: 'pending' as const,
    }))
  }, [analysis])

  return {
    analysis,
    isLoading,
    isError,
    refetch,
    notifyUser,
    generateMicroTasks,
  }
}
