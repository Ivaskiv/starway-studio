// packages/frontend/src/features/wheel/components/WheelSummary.tsx

import { motion } from 'framer-motion'
import { ChevronRight, Sparkles, Target, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { WHEEL_CATEGORIES, type WheelScore } from '../types/wheel.types'
import { WheelChart } from './WheelChart'

interface WheelSummaryProps {
  scores: WheelScore[] | null
  average_score?: number
  canFill?: boolean
  daysUntilNext?: number
  compact?: boolean
  showActions?: boolean
  className?: string
}

export const WheelSummary = ({
  scores,
  average_score,
  canFill = true,
  daysUntilNext = 0,
  compact = false,
  showActions = true,
  className = '',
}: WheelSummaryProps) => {
  const navigate = useNavigate()

  // Обчислюємо статистику
  const stats = useMemo(() => {
    if (!scores || scores.length === 0) return null

    const sortedScores = [...scores].sort((a, b) => b.score - a.score)
    const total = scores.reduce((sum, s) => sum + s.score, 0)
    const avg = average_score ?? total / scores.length

    // Сильні та слабкі сторони
    const strengths = sortedScores.slice(0, 3)
    const gaps = sortedScores.slice(-3).reverse()

    return {
      average: avg,
      total,
      strengths,
      gaps,
      maxScore: sortedScores[0],
      minScore: sortedScores[sortedScores.length - 1],
    }
  }, [scores, average_score])

  const getCategoryInfo = (category_id: string) => {
    return WHEEL_CATEGORIES.find(c => c.id === category_id)
  }

  // Якщо колесо ще не заповнено
  if (!scores || scores.length === 0) {
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
        transition={{ duration: 0.5 }}
      >
        {/* Декоративний градієнт */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center py-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center mb-4 border border-orange-500/20">
            <Sparkles className="w-10 h-10 text-orange-400" />
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-2">
            Колесо балансу
          </h3>
          <p className="text-white/50 text-sm mb-6 max-w-xs">
            Оціни 8 сфер життя та отримай персональний AI-аналіз для росту
          </p>

          {canFill ? (
            <button
              onClick={() => navigate('/dashboard/wheel')}
              className="
                px-6 py-3 rounded-xl
                bg-gradient-to-r from-orange-500 to-amber-500
                text-white font-medium
                hover:from-orange-600 hover:to-amber-600
                transition-all duration-300
                shadow-lg shadow-orange-500/25
                hover:shadow-orange-500/40
                hover:scale-105
              "
            >
              Заповнити колесо
            </button>
          ) : (
            <div className="text-white/40 text-sm">
              Доступно через {daysUntilNext} дн.
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-3xl
        bg-gradient-to-br from-[#0d1b2a]/80 to-[#1b3a4b]/60
        backdrop-blur-xl border border-white/10
        ${compact ? 'p-4' : 'p-6'}
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Декоративні елементи */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Колесо балансу</h3>
          </div>
          
          {showActions && (
            <button
              onClick={() => navigate('/dashboard/wheel')}
              className="
                flex items-center gap-1 text-sm text-white/50
                hover:text-orange-400 transition-colors
              "
            >
              Детальніше
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Основний контент */}
        <div className={`flex ${compact ? 'flex-col items-center' : 'items-start gap-6'}`}>
          {/* Колесо */}
          <div className={compact ? 'mb-4' : ''}>
            <WheelChart
              scores={scores}
              size={compact ? 200 : 240}
              animated={true}
              showEmoji={!compact}
              glowIntensity={compact ? 'low' : 'medium'}
            />
          </div>

          {/* Статистика */}
          {stats && !compact && (
            <div className="flex-1 space-y-4">
              {/* Середній бал */}
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  {stats.average.toFixed(1)}
                </div>
                <div className="text-white/40 text-sm mt-1">Середній бал</div>
              </div>

              {/* Сильні сторони */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  Сильні сторони
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.strengths.map((s) => {
                    const cat = getCategoryInfo(s.category_id)
                    return (
                      <div
                        key={s.category_id}
                        className="
                          flex items-center gap-1.5 px-3 py-1.5
                          rounded-lg bg-green-500/10 border border-green-500/20
                          text-sm text-green-400
                        "
                      >
                        <span>{cat?.emoji}</span>
                        <span>{s.score}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Зони росту */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
                  <Target className="w-4 h-4" />
                  Для розвитку
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.gaps.map((s) => {
                    const cat = getCategoryInfo(s.category_id)
                    return (
                      <div
                        key={s.category_id}
                        className="
                          flex items-center gap-1.5 px-3 py-1.5
                          rounded-lg bg-orange-500/10 border border-orange-500/20
                          text-sm text-orange-400
                        "
                      >
                        <span>{cat?.emoji}</span>
                        <span>{s.score}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Компактна статистика */}
          {stats && compact && (
            <div className="flex items-center justify-center gap-4 w-full">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {stats.average.toFixed(1)}
                </div>
                <div className="text-white/40 text-xs">Середній бал</div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white/80">
                  {stats.total}
                </div>
                <div className="text-white/40 text-xs">Загальний бал</div>
              </div>
            </div>
          )}
        </div>

        {/* Кнопка оновлення */}
        {showActions && !compact && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => navigate('/dashboard/wheel')}
              disabled={!canFill}
              className={`
                w-full py-3 rounded-xl text-sm font-medium
                transition-all duration-300
                ${canFill
                  ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30 hover:from-orange-500/30 hover:to-amber-500/30'
                  : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                }
              `}
            >
              {canFill ? 'Оновити оцінку' : `Доступно через ${daysUntilNext} дн.`}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default WheelSummary