import { useGetWheelHistoryQuery } from '@/services'
import { Calendar, Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { WheelChart } from './WheelChart'
import { WHEEL_CATEGORIES, type WheelAssessment } from '@/features/wheel/types/wheel.types'
import { Button } from '@/ui'

interface WheelHistoryProps {
  onSelect?: (assessment: WheelAssessment) => void
}

export const WheelHistory = ({ onSelect }: WheelHistoryProps) => {
  const { data: history, isLoading } = useGetWheelHistoryQuery({ limit: 6 })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
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

  const comparison =
    history.length >= 2
      ? history[0].scores.map((curr) => {
          const prev = history[1].scores.find(
            (p) => p.category_id === curr.category_id
          )

          return {
            category_id: curr.category_id,
            delta: curr.score - (prev?.score ?? 0),
          }
        })
      : null

  return (
    <div className="space-y-6">
      {comparison && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-3">
            Порівняння з попереднім
          </h3>

          <div className="flex flex-wrap gap-2">
            {comparison.map((change) => {
              const cat = WHEEL_CATEGORIES.find(c => c.id === change.category_id)
              if (!cat) return null

              const Icon =
                change.delta > 0
                  ? TrendingUp
                  : change.delta < 0
                  ? TrendingDown
                  : Minus

              const color =
                change.delta > 0
                  ? 'text-green-400'
                  : change.delta < 0
                  ? 'text-red-400'
                  : 'text-white/40'

              return (
                <div
                  key={change.category_id}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-xs"
                >
                  <span>{cat.emoji}</span>
                  <Icon className={`w-3 h-3 ${color}`} />
                  <span className={color}>
                    {change.delta > 0 ? '+' : ''}
                    {change.delta}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {history.map((assessment) => (
          <Button
            key={assessment.id}
            onClick={() => onSelect?.(assessment)}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left"
          >
            <div className="flex items-center gap-2 mb-3 text-xs text-white/60">
              <Calendar className="w-3 h-3" />
              {new Date(assessment.created_at).toLocaleDateString('uk-UA', {
                day: 'numeric',
                month: 'short',
              })}
            </div>

            <div className="flex justify-center mb-3">
              <WheelChart
                size={100}
                animated={false}
                showEmoji={false}
                scores={assessment.scores}
              />
            </div>

            <div className="text-center">
              <span className="text-2xl font-bold text-white">
                {assessment.average_score.toFixed(1)}
              </span>
              <span className="text-xs text-white/40 ml-1">/ 10</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}

export default WheelHistory
