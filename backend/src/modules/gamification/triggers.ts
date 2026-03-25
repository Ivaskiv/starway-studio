import { notificationService } from '../../services/notifications/NotificationService.js'
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'
import { LEVELS, getXpToNextLevel } from './level.system.js'

export async function onStreakUpdate(params: { userId: string; current: number }) {
  if ([3, 7, 14, 30, 100].includes(params.current)) {
    await notificationService.emit(NotificationEvent.STREAK_MILESTONE, params.userId, {
      current: params.current,
    })
  }
}

export async function onXpGained(params: { userId: string; previousLevel: number; nextLevel: number; previousXp: number; nextXp: number }) {
  if (params.nextLevel > params.previousLevel) {
    await notificationService.emit(NotificationEvent.LEVEL_UP, params.userId, {
      level: params.nextLevel,
    })
    return
  }

  const xpToNext = getXpToNextLevel(params.nextXp)
  const nextLevel = LEVELS.find(level => level.level === params.nextLevel + 1)
  if (nextLevel && xpToNext <= 20) {
    await notificationService.emit(NotificationEvent.NEAR_LEVEL_UP, params.userId, {
      nextLevel: nextLevel.title,
      xpLeft: xpToNext,
      currentXp: params.nextXp,
    })
  }
}

export async function onStreakBroken(params: { userId: string }) {
  await notificationService.schedule(NotificationEvent.STREAK_BROKEN, params.userId, (() => {
    const nextMorning = new Date()
    nextMorning.setDate(nextMorning.getDate() + 1)
    nextMorning.setHours(9, 0, 0, 0)
    return nextMorning
  })())
}
