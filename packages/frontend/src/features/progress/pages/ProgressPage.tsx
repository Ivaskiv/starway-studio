// packages/frontend/src/features/progress/pages/ProgressPage.tsx

import { motion } from 'framer-motion'
import { 
  Trophy, 
  Flame, 
  Target, 
  Calendar,
  TrendingUp,
  Award,
  Star,
  Zap,
} from 'lucide-react'
import { useGetMeQuery } from '@/features/auth/services/auth.api'
import { GlassCard, Progress } from '@/ui'
import { WheelChart } from '@/features/wheel'

// Mock data
const STATS = {
  streakDays: 12,
  longestStreak: 21,
  totalSessions: 45,
  completedGoals: 8,
  totalXp: 3450,
  level: 7,
  nextLevelXp: 4000,
}

const WEEKLY_ACTIVITY = [
  { day: 'Пн', sessions: 2, completed: true },
  { day: 'Вт', sessions: 1, completed: true },
  { day: 'Ср', sessions: 2, completed: true },
  { day: 'Чт', sessions: 0, completed: false },
  { day: 'Пт', sessions: 1, completed: true },
  { day: 'Сб', sessions: 2, completed: true },
  { day: 'Нд', sessions: 0, completed: false },
]

const ACHIEVEMENTS = [
  { id: '1', title: 'Перший крок', description: 'Завершив першу сесію', icon: Star, unlocked: true, date: '10.01.2026' },
  { id: '2', title: 'Тижнева серія', description: '7 днів поспіль', icon: Flame, unlocked: true, date: '17.01.2026' },
  { id: '3', title: 'Цілеспрямований', description: 'Досягнув 5 цілей', icon: Target, unlocked: true, date: '20.01.2026' },
  { id: '4', title: 'Місячна серія', description: '30 днів поспіль', icon: Trophy, unlocked: false },
  { id: '5', title: 'Майстер балансу', description: 'Всі сфери > 7', icon: Zap, unlocked: false },
  { id: '6', title: 'Легенда', description: 'Досягнув рівня 10', icon: Award, unlocked: false },
]

const WHEEL_SCORES = [
  { categoryId: 'health', score: 7 },
  { categoryId: 'career', score: 8 },
  { categoryId: 'finance', score: 5 },
  { categoryId: 'relationships', score: 6 },
  { categoryId: 'personal_growth', score: 9 },
  { categoryId: 'fun', score: 4 },
  { categoryId: 'environment', score: 7 },
  { categoryId: 'spirituality', score: 6 },
]

export default function ProgressPage() {
  const { data } = useGetMeQuery()
  const user = data?.user

  const levelProgress = (STATS.totalXp / STATS.nextLevelXp) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Мій прогрес</h1>
        <p className="text-white/60 mt-1">Відстежуй свої досягнення та ріст</p>
      </div>

      {/* Level Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Level Badge */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 
                          flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-3xl font-bold text-white">{STATS.level}</span>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Рівень {STATS.level}</p>
              <p className="text-white/60 text-sm">{STATS.totalXp} XP</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex-1">
            <div className="flex justify-between text-sm text-white/60 mb-2">
              <span>Прогрес до рівня {STATS.level + 1}</span>
              <span>{STATS.totalXp} / {STATS.nextLevelXp} XP</span>
            </div>
            <Progress value={levelProgress} className="h-3" />
            <p className="text-white/40 text-xs mt-2">
              Ще {STATS.nextLevelXp - STATS.totalXp} XP до наступного рівня
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 text-center">
          <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{STATS.streakDays}</p>
          <p className="text-xs text-white/50">Поточна серія</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{STATS.longestStreak}</p>
          <p className="text-xs text-white/50">Найдовша серія</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{STATS.totalSessions}</p>
          <p className="text-xs text-white/50">Всього сесій</p>
        </GlassCard>

        <GlassCard className="p-4 text-center">
          <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{STATS.completedGoals}</p>
          <p className="text-xs text-white/50">Цілей досягнуто</p>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Активність за тиждень
          </h2>

          <div className="flex justify-between items-end h-32 mb-4">
            {WEEKLY_ACTIVITY.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div 
                  className={`w-8 rounded-t-lg transition-all ${
                    day.completed 
                      ? 'bg-gradient-to-t from-green-500 to-emerald-400' 
                      : 'bg-white/10'
                  }`}
                  style={{ height: `${Math.max(day.sessions * 30, 10)}%` }}
                />
                <span className={`text-xs ${day.completed ? 'text-white' : 'text-white/40'}`}>
                  {day.day}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">
              {WEEKLY_ACTIVITY.filter(d => d.completed).length}/7 днів активності
            </span>
            <span className="text-green-400">
              +{WEEKLY_ACTIVITY.reduce((sum, d) => sum + d.sessions, 0)} сесій
            </span>
          </div>
        </GlassCard>

        {/* Wheel Progress */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Колесо балансу
          </h2>

          <div className="flex justify-center">
            <WheelChart scores={WHEEL_SCORES} size={200} animated={false} />
          </div>

          <div className="mt-4 text-center">
            <p className="text-white/60 text-sm">
              Середній бал: <span className="text-white font-semibold">
                {(WHEEL_SCORES.reduce((sum, s) => sum + s.score, 0) / 8).toFixed(1)}
              </span> / 10
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Achievements */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Досягнення
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {ACHIEVEMENTS.map((achievement) => {
            const Icon = achievement.icon
            return (
              <motion.div
                key={achievement.id}
                whileHover={{ scale: achievement.unlocked ? 1.05 : 1 }}
                className={`relative p-4 rounded-xl text-center transition-all ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30'
                    : 'bg-white/5 border border-white/10 opacity-50 grayscale'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                  achievement.unlocked 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                    : 'bg-white/10'
                }`}>
                  <Icon className={`w-6 h-6 ${achievement.unlocked ? 'text-white' : 'text-white/40'}`} />
                </div>
                <p className="text-sm font-medium text-white">{achievement.title}</p>
                <p className="text-xs text-white/50 mt-1">{achievement.description}</p>
                {achievement.unlocked && achievement.date && (
                  <p className="text-[10px] text-amber-400 mt-2">{achievement.date}</p>
                )}
                {!achievement.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                      <span className="text-white/60 text-xs">🔒</span>
                    </div>
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