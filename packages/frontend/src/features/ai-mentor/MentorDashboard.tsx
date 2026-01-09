// packages/frontend/src/features/ai-mentor/MentorDashboard.tsx

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronRight,
  Flame,
  Moon,
  Sun,
  Target,
  TrendingUp,
} from 'lucide-react'
import {
  useGetCourseRecommendationsQuery,
  useGetGamificationStateQuery,
  useGetGoalsQuery,
  useGetMentorProfileQuery,
  useGetUserMetricsQuery,
} from './services/aiMentorApi'
import { WHEEL_CATEGORIES } from './types/ai-mentor.types'
import { Button } from '@/ui'
import { WheelSummary, WheelModal, useWheelStatus } from '@/features/wheel'

// ============ STAT CARD ============
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color: string
  trend?: number
}

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-5 relative overflow-hidden"
  >
    <div
      className="absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20"
      style={{ backgroundColor: color }}
    />
    
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
            ${trend >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
          >
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-sm text-white/60">{title}</p>
      {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
    </div>
  </motion.div>
)

// ============ SESSION CARD ============
interface SessionCardProps {
  type: 'morning' | 'evening'
  isCompleted: boolean
  scheduledTime: string
  onClick: () => void
}

const SessionCard = ({ type, isCompleted, scheduledTime, onClick }: SessionCardProps) => {
  const isMorning = type === 'morning'
  
  return (
    <motion.button
      onClick={onClick}
      disabled={isCompleted}
      whileHover={{ scale: isCompleted ? 1 : 1.02 }}
      whileTap={{ scale: isCompleted ? 1 : 0.98 }}
      className={`w-full p-4 rounded-2xl text-left transition-all border border-white/10
        ${isCompleted ? 'opacity-60 cursor-default bg-white/5' : 'hover:shadow-lg cursor-pointer'}
        ${!isCompleted && isMorning ? 'bg-amber-500/10' : ''}
        ${!isCompleted && !isMorning ? 'bg-indigo-500/10' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
          ${isMorning ? 'bg-amber-500/20' : 'bg-indigo-500/20'}`}
        >
          {isMorning ? (
            <Sun className={`w-6 h-6 ${isCompleted ? 'text-white/40' : 'text-amber-400'}`} />
          ) : (
            <Moon className={`w-6 h-6 ${isCompleted ? 'text-white/40' : 'text-indigo-400'}`} />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className={`font-semibold ${isCompleted ? 'text-white/40' : 'text-white'}`}>
            {isMorning ? 'Ранкова сесія' : 'Вечірня сесія'}
          </h3>
          <p className="text-sm text-white/40">
            {isCompleted ? 'Завершено ✓' : scheduledTime}
          </p>
        </div>
        
        {!isCompleted && <ChevronRight className="w-5 h-5 text-white/40" />}
      </div>
    </motion.button>
  )
}

// ============ GOAL PROGRESS CARD ============
interface GoalProgressProps {
  title: string
  progress: number
  category: string
  dueDate: string
}

const GoalProgressCard = ({ title, progress, category, dueDate }: GoalProgressProps) => {
  const categoryData = WHEEL_CATEGORIES.find(c => c.id === category)
  
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg">{categoryData?.icon || '🎯'}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{title}</h4>
          <p className="text-xs text-white/40">{dueDate}</p>
        </div>
        <span className="text-sm font-semibold text-white/80">{progress}%</span>
      </div>
      
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${categoryData?.color || '#3B82F6'}, #8B5CF6)` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}

// ============ COURSE RECOMMENDATION ============
const CourseRecommendationCard = ({ title, reason, onClick }: { 
  title: string
  reason: string
  onClick: () => void 
}) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="w-full p-4 rounded-xl text-left bg-gradient-to-r from-purple-500/10 to-pink-500/10 
               border border-purple-500/20 hover:border-purple-500/40 transition-all"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-purple-400" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-white">{title}</h4>
        <p className="text-xs text-white/50">{reason}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-purple-400" />
    </div>
  </motion.button>
)

// ============ MAIN DASHBOARD ============
interface MentorDashboardProps {
  userId: string
}

export const MentorDashboard = ({ userId }: MentorDashboardProps) => {
  const [showWheelModal, setShowWheelModal] = useState(false)
  
  // Wheel status
  const { needsWheel } = useWheelStatus(userId)
  
  // RTK Query
  const { data: profile } = useGetMentorProfileQuery(userId)
  const { data: gamification } = useGetGamificationStateQuery(userId)
  const { data: metrics } = useGetUserMetricsQuery(userId)
  const { data: goals } = useGetGoalsQuery({ userId, status: 'active' })
  const { data: courseRecs } = useGetCourseRecommendationsQuery(userId)
  
  // Derived state
  const streakDays = gamification?.streakDays ?? 0
  const totalXP = gamification?.xp ?? 0
  const activeGoals = goals?.length ?? 0
  const morningCompleted = false // TODO: from sessions query
  const eveningCompleted = false

  const handleStartSession = (type: 'morning' | 'evening') => {
    if (needsWheel) {
      setShowWheelModal(true)
      return
    }
    console.log('Start session:', type)
    // TODO: navigate to session page
  }

  const handleWheelComplete = (assessmentId: string) => {
    console.log('Wheel completed:', assessmentId)
    setShowWheelModal(false)
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Welcome Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Привіт, {profile?.name || 'Друже'}! 👋
        </h1>
        <p className="text-white/60">Готовий до нових звершень сьогодні?</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Дні поспіль" value={streakDays} subtitle="streak" icon={Flame} color="#F59E0B" />
        <StatCard title="XP" value={totalXP} subtitle={`До рівня ${(gamification?.level ?? 1) + 1}`} icon={Award} color="#8B5CF6" />
        <StatCard title="Активні цілі" value={activeGoals} icon={Target} color="#3B82F6" />
        <StatCard title="Активність" value={`${metrics?.activityRate ?? 0}%`} icon={BarChart3} color="#10B981" trend={5} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-400" />
              Сьогоднішні сесії
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <SessionCard 
                type="morning" 
                isCompleted={morningCompleted} 
                scheduledTime="08:00" 
                onClick={() => handleStartSession('morning')} 
              />
              <SessionCard 
                type="evening" 
                isCompleted={eveningCompleted} 
                scheduledTime="20:30" 
                onClick={() => handleStartSession('evening')} 
              />
            </div>
          </motion.div>

          {/* Goals Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Прогрес цілей
              </h2>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                Всі цілі →
              </Button>
            </div>
            
            <div className="space-y-3">
              {goals?.slice(0, 3).map((goal) => (
                <GoalProgressCard
                  key={goal.id}
                  title={goal.title}
                  progress={goal.progress}
                  category={goal.category}
                  dueDate={new Date(goal.deadline).toLocaleDateString('uk-UA')}
                />
              ))}
              
              {(!goals || goals.length === 0) && (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Поки немає активних цілей</p>
                  <Button variant="ghost" size="sm" className="mt-3 text-blue-400">
                    Додати першу ціль →
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Wheel Summary */}
          <WheelSummary 
            userId={userId} 
            onStartAssessment={() => setShowWheelModal(true)} 
          />
          
          {/* Course Recommendations */}
          {courseRecs && courseRecs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Рекомендації</h2>
              </div>
              
              <div className="space-y-3">
                {courseRecs.slice(0, 2).map((rec, i) => (
                  <CourseRecommendationCard
                    key={rec.code || i}
                    title={rec.title}
                    reason={rec.reason}
                    onClick={() => console.log('Open course:', rec.code)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Wheel Modal */}
      <WheelModal
        isOpen={showWheelModal}
        onClose={() => setShowWheelModal(false)}
        userId={userId}
        onComplete={handleWheelComplete}
      />
    </div>
  )
}

export default MentorDashboard