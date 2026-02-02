import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button, GlassCard } from '@/ui'
import { useAppSelector } from '@/app/store'

import { WheelChart } from '../components/WheelChart'
import { WheelForm } from '../components/WheelForm'
import { WheelHistory } from '../components/WheelHistory'

import {
  useGetWheelAssessmentQuery,
  useGetWheelCooldownQuery,
} from '../services/wheel.api'

import type { WheelAssessment } from '../types/wheel.types'

type Tab = 'assessment' | 'history'

export default function WheelPage() {
  const navigate = useNavigate()

  const userId = useAppSelector(s => s.auth.user?.id)

  const [isVisible, setIsVisible] = useState(false)
  const [tab, setTab] = useState<Tab>('assessment')
  const [showForm, setShowForm] = useState(false)

  const {
    data: currentWheel,
    isLoading: isWheelLoading,
  } = useGetWheelAssessmentQuery(userId!, {
    skip: !userId,
  })

  const {
    data: cooldown,
    isLoading: isCooldownLoading,
  } = useGetWheelCooldownQuery(userId!, {
    skip: !userId,
  })

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  if (!userId || isWheelLoading || isCooldownLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    )
  }

  const canFill = cooldown?.canFill ?? true

  return (
    <div className="space-y-6">
      {/* header */}
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

      {/* tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        <Button
          onClick={() => {
            setTab('assessment')
            setShowForm(false)
          }}
          className={`px-4 py-2 rounded-lg text-sm ${
            tab === 'assessment'
              ? 'bg-purple-500 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Оцінка
        </Button>

        <Button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg text-sm ${
            tab === 'history'
              ? 'bg-purple-500 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Історія
        </Button>
      </div>

      {/* content */}
      <div
        className={`transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
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
                    <p className="text-green-400 mt-4">
                      Сильні: {currentWheel.strengths.join(', ')}
                    </p>
                  )}

                  {currentWheel.gaps?.length > 0 && (
                    <p className="text-orange-400">
                      Розвивати: {currentWheel.gaps.join(', ')}
                    </p>
                  )}

                  <p className="text-white/40 text-xs mt-4">
                    Оновлено:{' '}
                    {new Date(
                      currentWheel.completedAt ?? currentWheel.createdAt,
                    ).toLocaleDateString('uk')}
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={() => setShowForm(true)}
                    disabled={!canFill}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-xl"
                  >
                    {canFill
                      ? 'Оновити оцінку'
                      : `Доступно через ${cooldown?.daysLeft ?? 0} дн.`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/60 mb-4">Колесо ще не заповнено</p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Заповнити зараз
                </Button>
              </div>
            )
          ) : (
            <WheelHistory userId={userId} />
          )}
        </GlassCard>
      </div>
    </div>
  )
}
