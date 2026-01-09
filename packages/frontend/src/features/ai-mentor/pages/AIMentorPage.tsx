// packages/frontend/src/features/ai-mentor/pages/AIMentorPage.tsx

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  MessageCircle, 
  Sparkles, 
  Target, 
  Trophy,
  Calendar,
  TrendingUp,
  Bell,
  ExternalLink,
} from 'lucide-react'
import { useGetMeQuery } from '@/features/auth/services/auth.api'
import { GlassCard, Button, Progress } from '@/ui'
import { WheelSummary, WheelModal, useWheelStatus } from '@/features/wheel'
import { TelegramConnectModal } from '../telegram/TelegramConnectModal'

export default function AIMentorPage() {
  const { data, isLoading } = useGetMeQuery()
  const user = data?.user

  const [showWheelModal, setShowWheelModal] = useState(false)
  const [showTelegramModal, setShowTelegramModal] = useState(false)
  
  const { needsWheel } = useWheelStatus(user?.id || '')

  // Mock data - буде з API
  const mentorStats = {
    streakDays: 5,
    totalSessions: 23,
    completedGoals: 3,
    xp: 1250,
    level: 4,
    nextLevelXp: 2000,
  }

  const todayTasks = [
    { id: '1', title: 'Ранкова рефлексія', completed: true, time: '08:00' },
    { id: '2', title: 'Мікро-ціль: 25 хв фокусу', completed: false, time: '10:00' },
    { id: '3', title: 'Вечірній підсумок', completed: false, time: '20:00' },
  ]

  // Перевірка чи підключений Telegram
const isTelegramConnected = Boolean(user?.telegramId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            AI Ментор
          </h1>
          <p className="text-white/60 mt-1">Твій персональний помічник для росту</p>
        </div>

        {/* Telegram connect banner */}
        {!isTelegramConnected && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setShowTelegramModal(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 
                     border border-blue-500/30 hover:border-blue-500/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium text-sm">Підключи Telegram</p>
              <p className="text-white/50 text-xs">Для нагадувань та прогресу</p>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{mentorStats.streakDays}</p>
              <p className="text-xs text-white/50">днів поспіль</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{mentorStats.completedGoals}</p>
              <p className="text-xs text-white/50">цілей досягнуто</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{mentorStats.xp}</p>
              <p className="text-xs text-white/50">XP зароблено</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">Рівень {mentorStats.level}</p>
              <p className="text-xs text-white/50">{mentorStats.nextLevelXp - mentorStats.xp} XP до наступного</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Tasks & Chat */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wheel Alert */}
          {needsWheel && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">Почни з Колеса балансу</p>
                    <p className="text-white/60 text-sm">Оціни 8 сфер життя для персоналізації</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowWheelModal(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl"
                >
                  Почати
                </Button>
              </div>
            </motion.div>
          )}

          {/* Today's Tasks */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Сьогоднішні завдання
              </h2>
              <span className="text-sm text-white/50">
                {todayTasks.filter(t => t.completed).length}/{todayTasks.length}
              </span>
            </div>

            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all
                    ${task.completed 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${task.completed 
                      ? 'bg-green-500 border-green-500' 
                      : 'border-white/30'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${task.completed ? 'text-white/50 line-through' : 'text-white'}`}>
                      {task.title}
                    </p>
                  </div>
                  <span className="text-sm text-white/40">{task.time}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white border border-white/10"
            >
              Додати завдання
            </Button>
          </GlassCard>

          {/* Chat Preview */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                Чат з ментором
              </h2>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm">
                    Привіт! 👋 Бачу, що ти вже {mentorStats.streakDays} днів з нами. 
                    Сьогодні залишилось виконати ще {todayTasks.filter(t => !t.completed).length} завдання. 
                    Готовий продовжити?
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
            >
              Відкрити чат
            </Button>
          </GlassCard>
        </div>

        {/* Right Column - Wheel & Progress */}
        <div className="space-y-6">
          {/* Wheel Summary */}
          <WheelSummary 
            userId={user.id} 
            onStartAssessment={() => setShowWheelModal(true)} 
          />

          {/* Level Progress */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Прогрес рівня</h3>
            
            <div className="text-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                            flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-500/30">
                <span className="text-3xl font-bold text-white">{mentorStats.level}</span>
              </div>
              <p className="text-white/60 text-sm">
                {mentorStats.xp} / {mentorStats.nextLevelXp} XP
              </p>
            </div>

            <Progress 
              value={(mentorStats.xp / mentorStats.nextLevelXp) * 100} 
              className="h-2"
            />

            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-lg font-bold text-white">{mentorStats.totalSessions}</p>
                <p className="text-xs text-white/50">Сесій</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-lg font-bold text-white">{mentorStats.completedGoals}</p>
                <p className="text-xs text-white/50">Цілей</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modals */}
      <WheelModal
        isOpen={showWheelModal}
        onClose={() => setShowWheelModal(false)}
        userId={user.id}
        onComplete={() => setShowWheelModal(false)}
      />

      <TelegramConnectModal
        isOpen={showTelegramModal}
        onClose={() => setShowTelegramModal(false)}
      />
    </div>
  )
}