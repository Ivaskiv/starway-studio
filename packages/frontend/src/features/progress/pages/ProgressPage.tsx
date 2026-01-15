// packages/frontend/src/features/progress/pages/ProgressPage.tsx

import { useGetProgressOverviewQuery, useGetWeeklyActivityQuery } from '@/features/progress/services/progress.api'
import { WheelChart } from '@/features/wheel/components/WheelChart'
import { GlassCard, Progress } from '@/ui'
import { motion } from 'framer-motion'
import { Award, Flame, Loader2, Target, TrendingUp, Trophy, Zap } from 'lucide-react'

const ACHIEVEMENTS = [
  { id: 'first_step', title: 'Перший крок', description: 'Завершив першу сесію', icon: Trophy, color: 'from-amber-500 to-orange-500' },
  { id: 'week_streak', title: 'Тижнева серія', description: '7 днів поспіль', icon: Flame, color: 'from-orange-500 to-red-500' },
  { id: 'goal_focused', title: 'Цілеспрямований', description: 'Досягнув 5 цілей', icon: Target, color: 'from-green-500 to-emerald-500' },
  { id: 'month_streak', title: 'Місячна серія', description: '30 днів поспіль', icon: Trophy, color: 'from-purple-500 to-pink-500' },
  { id: 'wheel_master', title: 'Майстер балансу', description: 'Всі сфери > 7', icon: Zap, color: 'from-blue-500 to-cyan-500' },
  { id: 'legend', title: 'Легенда', description: 'Досягнув рівня 10', icon: Award, color: 'from-yellow-500 to-amber-500' },
]

export default function ProgressPage() {
  const { data: progress, isLoading } = useGetProgressOverviewQuery()
  const { data: weeklyData } = useGetWeeklyActivityQuery()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!progress) {
    return <div className="text-center text-white/60 py-20">Не вдалося завантажити прогрес</div>
  }

  const wheel_scores = progress.wheel?.scores || {}
  const hasWheel = Object.keys(wheel_scores).length > 0

  // Merge achievements from API with our config
  const achievementsList = ACHIEVEMENTS.map(a => {
    const apiAchievement = progress.achievements?.list?.find((item: any) => item.id === a.id)
    return {
      ...a,
      unlocked: apiAchievement?.unlocked || false,
      progress: apiAchievement?.progress || 0,
      unlockedAt: apiAchievement?.unlockedAt,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{progress.streak || 0}</p>
          <p className="text-xs text-white/50">Поточна серія</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{progress.longestStreak || 0}</p>
          <p className="text-xs text-white/50">Найдовша серія</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{progress.totalSessions || 0}</p>
          <p className="text-xs text-white/50">Всього сесій</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{progress.goalsCompleted || 0}</p>
          <p className="text-xs text-white/50">Цілей досягнуто</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Активність за тиждень
          </h2>

          <div className="flex justify-between items-end h-24 mb-4">
            {(weeklyData?.days || ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => ({ day: d, completed: false, sessions: 0 }))).map((day: any, i: number) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`w-6 md:w-8 rounded-t-lg transition-all ${
                    day.completed
                      ? 'bg-gradient-to-t from-green-500 to-emerald-400'
                      : 'bg-white/10'
                  }`}
                  style={{ height: day.completed ? '60px' : '20px' }}
                />
                <span className={`text-xs ${day.completed ? 'text-white' : 'text-white/40'}`}>
                  {day.day}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">
              {weeklyData?.days?.filter((d: any) => d.completed).length || 0}/7 днів активності
            </span>
            <span className="text-green-400">+{progress.weekly?.sessions || 0} сесій</span>
          </div>
        </GlassCard>

        {/* Wheel Balance */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Колесо балансу
          </h2>

          {hasWheel ? (
            <div className="flex flex-col items-center">
              <WheelChart scores={wheel_scores} size={200} />
              <p className="text-white/60 text-sm mt-4">
                Середній бал: <span className="text-white font-bold">{progress.wheel?.average?.toFixed(1) || 0}</span> / 10
              </p>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/40">
              Колесо ще не заповнено
            </div>
          )}
        </GlassCard>
      </div>

      {/* Achievements */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Досягнення
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {achievementsList.map((achievement, i) => {
            const Icon = achievement.icon
            const isUnlocked = achievement.unlocked

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative p-4 rounded-2xl text-center transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${
                    isUnlocked
                      ? `bg-gradient-to-br ${achievement.color}`
                      : 'bg-white/10'
                  }`}
                >
                  <Icon className={`w-7 h-7 ${isUnlocked ? 'text-white' : 'text-white/30'}`} />
                </div>

                {/* Title */}
                <p className={`text-sm font-semibold mb-1 ${isUnlocked ? 'text-white' : 'text-white/50'}`}>
                  {achievement.title}
                </p>

                {/* Description */}
                <p className={`text-xs ${isUnlocked ? 'text-white/70' : 'text-white/30'}`}>
                  {achievement.description}
                </p>

                {/* Unlocked date */}
                {isUnlocked && achievement.unlockedAt && (
                  <p className="text-xs text-amber-400 mt-2">
                    {new Date(achievement.unlockedAt).toLocaleDateString('uk', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                )}

                {/* Progress bar for locked */}
                {!isUnlocked && achievement.progress > 0 && (
                  <div className="mt-3">
                    <Progress value={achievement.progress} color="orange" size="sm" />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}