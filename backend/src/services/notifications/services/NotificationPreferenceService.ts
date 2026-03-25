import { notificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository.js'

export class NotificationPreferenceService {
  async getOrCreate(userId: string) {
    return notificationPreferenceRepository.ensureForUser(userId)
  }

  async update(userId: string, input: Omit<Parameters<typeof notificationPreferenceRepository.upsert>[0], 'userId'>) {
    return notificationPreferenceRepository.upsert({
      userId,
      ...input,
    })
  }
}

export const notificationPreferenceService = new NotificationPreferenceService()
