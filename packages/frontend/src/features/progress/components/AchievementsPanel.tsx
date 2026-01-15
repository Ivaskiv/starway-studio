// packages/frontend/src/features/progress/components/AchievementsPanel.tsx
// Преміальна панель досягнень у стилі "Сила Волі"

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Star,
  Target,
  Flame,
  Zap,
  Crown,
  Award,
  Medal,
  Sparkles,
  Lock,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Типи досягнень
export interface Achievement {
  id: string
  code: string
  title: string
  description: string
  icon: string
  color: string
  category: 'streak' | 'wheel' | 'goals' | 'special'
  requirement: number
  progress: number
  isUnlocked: boolean
  unlockedAt?: string
  xpReward: number
}

// Маппінг іконок
const ICON_MAP: Record<string, LucideIcon> = {
  star: Star,
  trophy: Trophy,
  target: Target,
  flame: Flame,
  zap: Zap,
  crown: Crown,
  award: Award,
  medal: Medal,
  sparkles: Sparkles,
}

// Кольори градієнтів
const COLOR_GRADIENTS: Record<string, string> = {
  orange: 'from-orange-500 to-amber-500',
  green: 'from-emerald-500 to-green-500',
  blue: 'from-blue-500 to-cyan-500',
  purple: 'from-purple-500 to-violet-500',
  pink: 'from-pink-500 to-rose-500',
  gold: 'from-amber-400 to-yellow-500',
  teal: 'from-teal-500 to-cyan-500',
}

interface AchievementsPanelProps {
  achievements: Achievement[]
  showAll?: boolean
  maxVisible?: number
  onViewAll?: () => void
  className?: string
}

export const AchievementsPanel = ({
  achievements,
  showAll = false,
  maxVisible = 6,
  onViewAll,
  className = '',
}: AchievementsPanelProps) => {
  // Сортуємо: розблоковані спочатку, потім за прогресом
  const sortedAchievements = useMemo(() => {
    const sorted = [...achievements].sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1
      if (!a.isUnlocked && b.isUnlocked) return 1
      if (!a.isUnlocked && !b.isUnlocked) {
        return (b.progress / b.requirement) - (a.progress / a.requirement)
      }
      return new Date(b.unlockedAt || 0).getTime() - new Date(a.unlockedAt || 0).getTime()
    })
    return showAll ? sorted : sorted.slice(0, maxVisible)
  }, [achievements, showAll, maxVisible])

  const unlockedCount = achievements.filter(a => a.isUnlocked).length
  const totalCount = achievements.length

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-3xl
        bg-gradient-to-br from-[#0d1b2a]/80 to-[#1b3a4b]/60
        backdrop-blur-xl border border-white/10
        p-6 ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Декоративні елементи */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-b from-amber-500/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-orange-500/10 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Досягнення</h3>
              <p className="text-sm text-white/40">
                {unlockedCount} з {totalCount} розблоковано
              </p>
            </div>
          </div>

          {!showAll && onViewAll && (
            <button
              onClick={onViewAll}
              className="
                flex items-center gap-1 text-sm text-white/50
                hover:text-amber-400 transition-colors
              "
            >
              Усі
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Сітка досягнень */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {sortedAchievements.map((achievement, index) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              index={index}
            />
          ))}
        </div>

        {/* Прогрес бар */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/60">Загальний прогрес</span>
            <span className="text-amber-400 font-medium">
              {Math.round((unlockedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Окремий компонент картки досягнення
interface AchievementCardProps {
  achievement: Achievement
  index: number
}

const AchievementCard = ({ achievement, index }: AchievementCardProps) => {
  const Icon = ICON_MAP[achievement.icon] || Star
  const gradient = COLOR_GRADIENTS[achievement.color] || COLOR_GRADIENTS.orange
  const progressPercent = Math.min((achievement.progress / achievement.requirement) * 100, 100)

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl p-4
        transition-all duration-300
        ${achievement.isUnlocked
          ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/50'
          : 'bg-white/5 border border-white/10 hover:border-white/20'
        }
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Glow для розблокованих */}
      {achievement.isUnlocked && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-50" />
      )}

      <div className="relative z-10">
        {/* Іконка */}
        <div
          className={`
            w-12 h-12 rounded-xl mx-auto mb-3
            flex items-center justify-center
            ${achievement.isUnlocked
              ? `bg-gradient-to-br ${gradient} shadow-lg`
              : 'bg-white/10'
            }
          `}
          style={achievement.isUnlocked ? {
            boxShadow: `0 4px 20px ${achievement.color === 'gold' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(249, 115, 22, 0.4)'}`,
          } : undefined}
        >
          {achievement.isUnlocked ? (
            <Icon className="w-6 h-6 text-white" />
          ) : (
            <Lock className="w-5 h-5 text-white/30" />
          )}
        </div>

        {/* Назва */}
        <p className={`
          text-sm font-semibold text-center mb-1 line-clamp-1
          ${achievement.isUnlocked ? 'text-white' : 'text-white/50'}
        `}>
          {achievement.title}
        </p>

        {/* Опис */}
        <p className={`
          text-xs text-center line-clamp-2 mb-2
          ${achievement.isUnlocked ? 'text-white/70' : 'text-white/30'}
        `}>
          {achievement.description}
        </p>

        {/* Дата розблокування або прогрес */}
        {achievement.isUnlocked ? (
          <p className="text-xs text-amber-400 text-center">
            {achievement.unlockedAt
              ? new Date(achievement.unlockedAt).toLocaleDateString('uk', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : 'Розблоковано'
            }
          </p>
        ) : progressPercent > 0 && (
          <div className="mt-2">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-white/30 to-white/20 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-white/30 text-center mt-1">
              {achievement.progress}/{achievement.requirement}
            </p>
          </div>
        )}

        {/* XP бейдж */}
        {achievement.isUnlocked && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
            <span className="text-xs text-amber-400 font-medium">
              +{achievement.xpReward} XP
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AchievementsPanel