// frontend/src/features/wheel/pages/WheelPage.tsx

import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useGetWheelCooldownQuery, useGetWheelQuery } from '@/services'
import { Button, GlassCard } from '@/ui'
import { WheelChart } from '../components/WheelChart'
import { WheelForm } from '../components/WheelForm'
import { WheelHistory } from '../components/WheelHistory'
import { normalizeWheelAssessment, type WheelAssessment } from '@/shared/utils/normalize'

type Tab = 'assessment' | 'history'

export const WheelPage = () => {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  const [tab, setTab] = useState<Tab>('assessment')
  const [showForm, setShowForm] = useState(false)

  const { data: rawWheelData, isLoading } = useGetWheelQuery()
  const { data: cooldown } = useGetWheelCooldownQuery()

  const wheelData = rawWheelData
    ? {
        current: rawWheelData.current
          ? normalizeWheelAssessment(rawWheelData.current)
          : undefined,
        canFillNew: rawWheelData.canFillNew,
        daysUntilNext: rawWheelData.daysUntilNext,
      }
    : undefined

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    )
  }

  const canFill = cooldown?.canFill ?? wheelData?.canFillNew ?? true
  const daysLeft = cooldown?.daysLeft ?? wheelData?.daysUntilNext ?? 0
  const currentWheel: WheelAssessment | undefined = wheelData?.current

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="flex items-center gap-2 text-white/60 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-purple-400" />
            Колесо балансу
          </h1>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        <Button
          onClick={() => {
            setTab('assessment')
            setShowForm(false)
          }}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            tab === 'assessment'
              ? 'bg-purple-500 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Оцінка
        </Button>
        <Button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            tab === 'history'
              ? 'bg-purple-500 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Історія
        </Button>
      </div>

      {/* Контент */}
      <div
        className={`
          relative rounded-2xl overflow-hidden
          transition-all duration-300
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <GlassCard className="p-6">
          {tab === 'assessment' ? (
            showForm ? (
              <WheelForm
                onComplete={() => setShowForm(false)}
                onCancel={() => setShowForm(false)}
              />
            ) : currentWheel ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <WheelChart scores={currentWheel.scores} size={280} />
                  <div className="mt-6 text-center">
                    <p className="text-3xl font-bold text-white">
                      {currentWheel.averageScore.toFixed(1)}
                    </p>
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
                    Оновлено:{' '}
                    {new Date(currentWheel.completedAt).toLocaleDateString('uk')}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button
                    onClick={() => setShowForm(true)}
                    disabled={!canFill}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl"
                  >
                    {canFill ? 'Оновити оцінку' : `Доступно через ${daysLeft} дн.`}
                  </Button>
                </div>
              </div>
            ) : canFill ? (
              <WheelForm onComplete={() => setShowForm(false)} />
            ) : (
              <div className="text-center py-12 text-white/60">
                Колесо ще не заповнено
                <br />
                Доступно через {daysLeft} дн.
              </div>
            )
          ) : (
            <WheelHistory />
          )}
        </GlassCard>
      </div>
    </div>
  )
}

export default WheelPage
