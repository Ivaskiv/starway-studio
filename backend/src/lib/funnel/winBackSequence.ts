import { prisma } from '../../db/client.js'
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'

const WIN_BACK_MESSAGES = [
  { day: 1, templateKey: 'winback_day1' },
  { day: 3, templateKey: 'winback_day3' },
  { day: 7, templateKey: 'winback_day7' },
] as const

export async function scheduleWinBackSequence(userId: string) {
  for (const message of WIN_BACK_MESSAGES) {
    const runAt = new Date()
    runAt.setDate(runAt.getDate() + message.day)

    await prisma.notificationJob.create({
      data: {
        type: 'SUBSCRIPTION',
        payload: {
          event: NotificationEvent.SUBSCRIPTION_EXPIRED,
          userId,
          payload: {
            reason: 'win_back',
            templateKey: message.templateKey,
            daysSinceExpired: message.day,
          },
        },
        runAt,
        status: 'PENDING',
      },
    })
  }
}
