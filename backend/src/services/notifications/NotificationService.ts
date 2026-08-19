import { NotificationEvent } from './NotificationEvent.js'
import { notificationPreferenceRepository } from './repositories/NotificationPreferenceRepository.js'
import type { DeliveryMessage, DeliveryUser } from './delivery/types.js'
import type { EventPayload } from './NotificationService.foundation.js'
import { NotificationServiceScheduler } from './NotificationService.scheduler.js'
import { buildNotificationMessage } from './NotificationService.message.js'

export class NotificationService extends NotificationServiceScheduler {
  protected isEventEnabledByPreferences(
    event: NotificationEvent,
    preferences: Awaited<ReturnType<typeof notificationPreferenceRepository.ensureForUser>>,
  ) {
    switch (event) {
      case NotificationEvent.DAILY_MORNING_DUE:
        return preferences.dailyMorningEnabled
      case NotificationEvent.DAILY_EVENING_DUE:
        return preferences.dailyEveningEnabled
      case NotificationEvent.LEVEL_UP:
      case NotificationEvent.NEAR_LEVEL_UP:
        return preferences.levelUpEnabled
      case NotificationEvent.AI_INACTIVE:
      case NotificationEvent.ABSYSTEM_COMEBACK:
        return preferences.aiRemindersEnabled
      case NotificationEvent.STREAK_RISK:
        return preferences.streakRiskEnabled
      case NotificationEvent.STREAK_MILESTONE:
        return preferences.streakAlertsEnabled
      case NotificationEvent.STREAK_BROKEN:
        return preferences.streakBrokenEnabled
      case NotificationEvent.WEEKLY_SUMMARY:
        return preferences.weeklySummaryEnabled
      case NotificationEvent.SUBSCRIPTION_EXPIRING:
        return preferences.subscriptionEnabled
      case NotificationEvent.SUBSCRIPTION_EXPIRED:
        return preferences.subscriptionEnabled
      case NotificationEvent.POST_TRIAL_REPORTS:
        return preferences.subscriptionEnabled
      default:
        return true
    }
  }

  protected async buildMessage(event: NotificationEvent, user: DeliveryUser, payload?: EventPayload): Promise<DeliveryMessage> {
    return buildNotificationMessage(event, user, payload)
  }
}

export const notificationService = new NotificationService()
