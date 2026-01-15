// packages/frontend/src/features/wheel/pages/WheelPage.tsx

import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useGetWheelCooldownQuery, useGetWheelQuery } from '@/services'
import { Button, GlassCard } from '@/ui'
import { WheelChart } from '../components/WheelChart'
import { WheelForm } from '../components/WheelForm'
import { WheelHistory } from '../components/WheelHistory'

type Tab = 'assessment' | 'history'

export const WheelPage = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('assessment')
  const [showForm, setShowForm] = useState(false)

  const { data: wheelData, isLoading } = useGetWheelQuery()
  const { data: cooldown } = useGetWheelCooldownQuery()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    )
  }

  const canFill = cooldown?.canFill ?? wheelData?.canFillNew ?? true
  const daysLeft = cooldown?.daysLeft ?? wheelData?.daysUntilNext ?? 0
  const currentWheel = wheelData?.current

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button onClick={() => navigate(-1)} variant="ghost" className="flex items-center gap-2 text-white/60 hover:text-white mb-2">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-purple-400" />
            Колесо балансу
          </h1>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        <button onClick={() => { setTab('assessment'); setShowForm(false) }}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === 'assessment' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}`}>
          Оцінка
        </button>
        <button onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === 'history' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}`}>
          Історія
        </button>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard className="p-6">
          {tab === 'assessment' ? (
            showForm ? (
              <WheelForm onComplete={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
            ) : currentWheel ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <WheelChart scores={currentWheel.scores} size={280} />
                  <div className="mt-6 text-center">
                    <p className="text-3xl font-bold text-white">{currentWheel.average.toFixed(1)}</p>
                    <p className="text-white/40">Середній бал</p>
                  </div>
                  {currentWheel.strengths?.length > 0 && (
                    <div className="mt-4 text-center">
                      <p className="text-white/60 text-sm">Сильні сфери:</p>
                      <p className="text-green-400">{currentWheel.strengths.join(', ')}</p>
                    </div>
                  )}
                  {currentWheel.gaps?.length > 0 && (
                    <div className="mt-2 text-center">
                      <p className="text-white/60 text-sm">Для розвитку:</p>
                      <p className="text-orange-400">{currentWheel.gaps.join(', ')}</p>
                    </div>
                  )}
                  <p className="text-white/40 text-xs mt-4">
                    Оновлено: {new Date(currentWheel.completed_at).toLocaleDateString('uk')}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button onClick={() => setShowForm(true)} disabled={!canFill}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl">
                    {canFill ? 'Оновити оцінку' : `Доступно через ${daysLeft} дн.`}
                  </Button>
                </div>
              </div>
            ) : canFill ? (
              <WheelForm onComplete={() => setShowForm(false)} />
            ) : (
              <div className="text-center py-12 text-white/60">
                Колесо ще не заповнено<br />Доступно через {daysLeft} дн.
              </div>
            )
          ) : (
            <WheelHistory />
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}

export default WheelPage