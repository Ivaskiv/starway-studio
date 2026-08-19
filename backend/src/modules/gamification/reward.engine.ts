import { applyReward, awardStreakBonus } from './index.js'

export const rewardEngine = {
  async onDailyEntryCreated(userId: string) {
    return applyReward(userId, { xp: 10 })
  },
  async onMicroTaskCompleted(userId: string) {
    return applyReward(userId, { bitMind: 5 })
  },
  async onWheelCompleted(userId: string) {
    return applyReward(userId, { xp: 50 })
  },
  async onMentorSessionCompleted(userId: string) {
    return applyReward(userId, { xp: 5 })
  },
  async onSevenDayStreak(userId: string) {
    return awardStreakBonus(userId)
  },
}
