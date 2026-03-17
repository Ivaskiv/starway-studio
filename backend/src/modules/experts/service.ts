import { prisma } from '../../db/client.js'
import type { Expert } from '../../db/generated/prisma/client.js'
import type { ExpertRegistrationPayload } from './types.js'

export async function createExpert(payload: ExpertRegistrationPayload): Promise<Expert> {
  const normalizedEmail = payload.email.trim().toLowerCase()
  const displayName = payload.displayName.trim()

  return prisma.expert.create({
    data: {
      email: normalizedEmail,
      displayName,
      timezone: payload.timezone ?? 'UTC',
      telegramBotToken: payload.telegramBotToken ?? null,
      telegramBotName: payload.telegramBotName ?? null,
      isActive: payload.isActive ?? true,
    },
  })
}
