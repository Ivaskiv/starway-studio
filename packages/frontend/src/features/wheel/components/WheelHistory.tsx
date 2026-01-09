// frontend/src/features/wheel/components/WheelHistory.tsx
// features/wheel/components/WheelHistory.tsx

import { motion } from 'framer-motion'
import { Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useGetWheelHistoryQuery, useCompareWheelsQuery } from '../api/wheel.api'
import { WHEEL_CATEGORIES, type WheelAssessment } from '../types/wheel.types'
import { WheelChart } from './WheelChart'

interface WheelHistoryProps {
  userId: string
  onSelect?: (assessment: WheelAssessment) => void
}

export const WheelHistory = ({ userId, onSelect }: WheelHistoryProps) => {
  const { data: history, isLoading } = useGetWheelHistoryQuery({ userId, limit: 6 })
  const { data: comparison } = useCompareWheelsQuery({ userId }, { skip: !history || history.length < 2 })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60">Поки немає історії оцінок</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Comparison summary */}
      {comparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-sm font-semibold text-white/80 mb-3">Порівняння з попереднім</h3>
          <div className="flex flex-wrap gap-2">
            {comparison.changes.map((change) => {
              const cat = WHEEL_CATEGORIES.find((c) => c.id === change.categoryId)
              if (!cat) return null
              
              const Icon = change.delta > 0 ? TrendingUp : change.delta < 0 ? TrendingDown : Minus
              const color = change.delta > 0 ? 'text-green-400' : change.delta < 0 ? 'text-red-400' : 'text-white/40'
              
              return (
                <div
                  key={change.categoryId}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs"
                >
                  <span>{cat.icon}</span>
                  <Icon className={`w-3 h-3 ${color}`} />
                  <span className={color}>{change.delta > 0 ? '+' : ''}{change.delta}</span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* History grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {history.map((assessment, i) => (
          <motion.button
            key={assessment.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSelect?.(assessment)}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2 mb-3 text-xs text-white/60">
              <Calendar className="w-3 h-3" />
              {new Date(assessment.createdAt).toLocaleDateString('uk-UA', {
                day: 'numeric',
                month: 'short',
                year: assessment.createdAt.slice(0, 4) !== new Date().getFullYear().toString() ? 'numeric' : undefined,
              })}
            </div>
            
            <div className="flex justify-center mb-3">
              <WheelChart scores={assessment.scores} size={100} animated={false} />
            </div>
            
            <div className="text-center">
              <span className="text-2xl font-bold text-white">{assessment.averageScore?.toFixed(1) || (assessment.totalScore / 8).toFixed(1)}</span>
              <span className="text-xs text-white/40 ml-1">/ 10</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}