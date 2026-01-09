// features/wheel/components/WheelSummary.tsx

import { motion } from 'framer-motion'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { useWheelStatus } from '../hooks/useWheelStatus'
import { WheelChart } from './WheelChart'
import { Button } from '@/ui'

interface WheelSummaryProps {
  userId: string
  onStartAssessment: () => void
  size?: 'sm' | 'md' | 'lg'
}

export const WheelSummary = ({ userId, onStartAssessment, size = 'md' }: WheelSummaryProps) => {
  const { wheel, hasWheel, needsWheel, reason, isLoading } = useWheelStatus(userId)

  const chartSize = size === 'sm' ? 120 : size === 'md' ? 150 : 200

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 bg-white/5 border border-white/10"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Колесо балансу
        </h3>
        
        {needsWheel && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">
            <AlertCircle className="w-3 h-3" />
            {reason === 'never' ? 'Потрібна оцінка' : 'Оновити'}
          </span>
        )}
      </div>
      
      {hasWheel ? (
        <>
          <div className="flex justify-center mb-4">
            <WheelChart scores={wheel!.scores} size={chartSize} animated={false} />
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-3xl font-bold text-white">
                {(wheel!.totalScore / 8).toFixed(1)}
              </span>
              <span className="text-sm text-white/40 ml-1">/ 10</span>
            </div>
            <div className="text-right text-xs text-white/40">
              {new Date(wheel!.createdAt).toLocaleDateString('uk-UA')}
            </div>
          </div>
          
          <Button
            onClick={onStartAssessment}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Оновити оцінку
          </Button>
        </>
      ) : (
        <>
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-white/60 text-sm mb-4">
              Оціни 8 сфер життя, щоб AI-ментор міг допомогти тобі ефективніше
            </p>
          </div>
          
          <Button
            onClick={onStartAssessment}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Пройти оцінку
          </Button>
        </>
      )}
    </motion.div>
  )
}