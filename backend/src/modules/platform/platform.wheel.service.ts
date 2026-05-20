import { getLatestWheel, getWheelAnalytics, getWheelCooldown, getWheelHistory, scoresFromMap } from '../wheel/service.js'

export async function getPlatformWheelSummary(userId: string) {
  const [latest, cooldown, analytics, history] = await Promise.all([
    getLatestWheel(userId),
    getWheelCooldown(userId),
    getWheelAnalytics(userId),
    getWheelHistory(userId, 6),
  ])

  return {
    latest: latest
      ? {
          id: latest.id,
          createdAt: latest.createdAt,
          updatedAt: latest.createdAt,
          scores: scoresFromMap(latest.scores),
          notes: latest.note ?? null,
        }
      : null,
    cooldown,
    analytics,
    history: history.map(entry => ({
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
      scores: scoresFromMap(entry.scores),
    })),
  }
}
