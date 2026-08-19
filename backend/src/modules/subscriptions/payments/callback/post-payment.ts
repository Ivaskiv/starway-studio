import { sendOpsTelegramMessage } from '../../../../lib/telegram.js'
import { NotificationEvent } from '../../../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../../../services/notifications/NotificationService.js'
import { runWeeklyAnalysis } from '../../../ai-mentor/weekly-analysis/service.js'

export function schedulePostPaymentAnalysis(userId: string): void {
setImmediate(() => {
        void (async () => {
          try {
            const generated = await runWeeklyAnalysis(userId)
            if (!generated) return

            await notificationService.emit(
              NotificationEvent.WEEKLY_SUMMARY,
              userId,
              {
                streak: generated.userReport.streakDays,
                wheels: generated.metrics.wheels,
                sessions: generated.metrics.sessions,
              }
            )
          } catch (generationError) {
            console.error(
              '⚠️ Weekly report generation after payment failed',
              generationError
            )
            const details =
              generationError instanceof Error
                ? generationError.message
                : 'unknown_error'
            void sendOpsTelegramMessage(
              `⚠️ Weekly report generation after payment failed\nuserId: ${userId}\nerror: ${details}`
            )
          }
        })()
      })
}
