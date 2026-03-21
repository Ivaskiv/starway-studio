// backend/src/modules/notifications/reminder.service.ts
// fix etap8: centralized reminder scheduling used by daily/trial modules
import { prisma } from '../../db/client.js'
import { Prisma, ReminderType } from '@starway/db/prisma-client'

export interface ScheduleReminderInput {
  userId: string
  type: ReminderType
  nextReminderAt: Date
  metadata?: Record<string, unknown>
}

export async function scheduleReminder(input: ScheduleReminderInput) {
  return prisma.reminder.create({
    data: {
      userId: input.userId,
      type: input.type,
      nextReminderAt: input.nextReminderAt,
      metadata: (input.metadata ?? {}) as Prisma.JsonObject,
    },
  })
}
