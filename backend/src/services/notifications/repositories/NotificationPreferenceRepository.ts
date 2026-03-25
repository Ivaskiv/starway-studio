import { prisma } from '../../../db/client.js'

export interface UpsertNotificationPreferenceInput {
  userId: string
  telegramEnabled?: boolean
  emailEnabled?: boolean
  dailyMorningTime?: number
  dailyEveningTime?: number
  timezone?: string
  dailyMorningEnabled?: boolean
  dailyEveningEnabled?: boolean
  levelUpEnabled?: boolean
  streakRiskEnabled?: boolean
  streakBrokenEnabled?: boolean
  streakAlertsEnabled?: boolean
  weeklySummaryEnabled?: boolean
  subscriptionEnabled?: boolean
  aiRemindersEnabled?: boolean
}

const DEFAULT_NOTIFICATION_PREFERENCE = {
  telegramEnabled: true,
  emailEnabled: false,
  dailyMorningTime: 9 * 60,
  dailyEveningTime: 21 * 60,
  timezone: 'Europe/Kyiv',
  dailyMorningEnabled: true,
  dailyEveningEnabled: true,
  levelUpEnabled: true,
  streakRiskEnabled: true,
  streakBrokenEnabled: true,
  streakAlertsEnabled: true,
  weeklySummaryEnabled: true,
  subscriptionEnabled: true,
  aiRemindersEnabled: true,
} as const

export class NotificationPreferenceRepository {
  async findByUserId(userId: string) {
    return prisma.notificationPreference.findUnique({
      where: { userId },
    })
  }

  async ensureForUser(userId: string) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_NOTIFICATION_PREFERENCE,
      },
      update: {},
    })
  }

  async upsert(input: UpsertNotificationPreferenceInput) {
    const { userId, ...rest } = input

    return prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_NOTIFICATION_PREFERENCE,
        ...rest,
      },
      update: rest,
    })
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository()
