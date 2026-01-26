// features/funnels/pages/FunnelEditPage.tsx

import { Button, GlassCard } from '@/ui'
import { ArrowLeft, Cpu, FlaskConical, Play, Plus, Save, Sparkles, Trophy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { FunnelStepEditor } from '../components/FunnelStepEditor'
import { FunnelStepList } from '../components/FunnelStepList'
import { useGetFunnelByIdQuery, useUpdateFunnelMutation } from '../services/funnels.api'
import type { FunnelStep, StepType } from '../types/funnel.types'

type Tab = 'builder' | 'optimizer' | 'testing' | 'achievements'

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: 'builder', label: 'Конструктор', icon: Sparkles },
  { id: 'optimizer', label: 'AI Оптимізація', icon: Cpu },
  { id: 'testing', label: 'A/B Тести', icon: FlaskConical },
  { id: 'achievements', label: 'Досягнення', icon: Trophy },
]

export default function FunnelEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: funnel, isLoading, error } = useGetFunnelByIdQuery(id!, { skip: !id })
  const [updateFunnel, { isLoading: isSaving }] = useUpdateFunnelMutation()

  const [activeTab, setActiveTab] = useState<Tab>('builder')
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [localSteps, setLocalSteps] = useState<FunnelStep[]>([])

  useEffect(() => {
    if (funnel?.steps) {
      setLocalSteps(funnel.steps)
      if (funnel.steps.length && !selectedStepId) {
        setSelectedStepId(funnel.steps[0].id)
      }
    }
  }, [funnel?.steps])

  const selectedStep = localSteps.find(s => s.id === selectedStepId)

  const handleSave = async () => {
    if (!funnel) return
    try {
      await updateFunnel({ id: funnel.id, steps: localSteps }).unwrap()
      toast.success('Збережено!')
    } catch {
      toast.error('Помилка збереження')
    }
  }

  const handleAddStep = useCallback((type: StepType = 'message') => {
    const newStep: FunnelStep = {
      id: `step_${Date.now()}`,
      type,
      name: `Крок ${localSteps.length + 1}`,
      order: localSteps.length,
      config: {},
      is_active: true,
    }
    setLocalSteps(prev => [...prev, newStep])
    setSelectedStepId(newStep.id)
    toast.success('Крок додано')
  }, [localSteps.length])

  const handleUpdateStep = useCallback((stepId: string, updates: Partial<FunnelStep>) => {
    setLocalSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s))
  }, [])

  const handleDeleteStep = useCallback((stepId: string) => {
    if (!confirm('Видалити крок?')) return
    setLocalSteps(prev => prev.filter(s => s.id !== stepId))
    if (selectedStepId === stepId) {
      setSelectedStepId(localSteps[0]?.id || null)
    }
    toast.success('Крок видалено')
  }, [selectedStepId, localSteps])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !funnel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-slate-400">Воронку не знайдено</p>
        <Button onClick={() => navigate('/dashboard/funnels')} data-color="ghost">
          Повернутися
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="glass-card border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/dashboard/funnels')} data-color="ghost" data-size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">{funnel.name}</h1>
              <p className="text-sm text-slate-400">{localSteps.length} кроків • {funnel.status}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button data-color="ghost">
              <Play className="w-5 h-5 mr-2" />
              Тест
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-color="orange">
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? 'Збереження...' : 'Зберегти'}
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-white/5">
        <div className="flex gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              onClick={() => setActiveTab(id)}
              data-color={activeTab === id ? 'orange' : 'ghost'}
              className="flex-1 max-w-[200px]"
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'builder' && (
          <div className="h-full flex">
            <aside className="w-80 glass-card border-r border-white/10 overflow-y-auto">
              <div className="p-4 border-b border-white/10">
                <Button onClick={() => handleAddStep()} className="w-full" data-color="orange">
                  <Plus className="w-5 h-5 mr-2" />
                  Додати крок
                </Button>
              </div>
              <FunnelStepList
                steps={localSteps}
                selectedId={selectedStepId}
                onSelect={setSelectedStepId}
                onDelete={handleDeleteStep}
              />
            </aside>

            <main className="flex-1 overflow-y-auto p-8">
              {selectedStep ? (
                <FunnelStepEditor
                  step={selectedStep}
                  onUpdate={(updates) => handleUpdateStep(selectedStep.id, updates)}
                  onDelete={() => handleDeleteStep(selectedStep.id)}
                />
              ) : (
                <EmptyState onAdd={() => handleAddStep()} />
              )}
            </main>
          </div>
        )}

        {activeTab === 'optimizer' && (
          <div className="p-8">
            <GlassCard className="p-8 text-center">
              <Cpu className="w-16 h-16 mx-auto mb-4 text-purple-400" />
              <h2 className="text-2xl font-bold text-white mb-2">AI Оптимізація</h2>
              <p className="text-slate-400 mb-6">Автоматичний аналіз та покращення воронки</p>
              <Button data-color="purple">Запустити аналіз</Button>
            </GlassCard>
          </div>
        )}

        {activeTab === 'testing' && (
          <div className="p-8">
            <GlassCard className="p-8 text-center">
              <FlaskConical className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h2 className="text-2xl font-bold text-white mb-2">A/B Тестування</h2>
              <p className="text-slate-400 mb-6">Порівнюйте різні версії кроків</p>
              <Button data-color="green">Створити тест</Button>
            </GlassCard>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="p-8">
            <GlassCard className="p-8 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white mb-2">Досягнення</h2>
              <p className="text-slate-400 mb-6">Відстежуйте прогрес воронки</p>
              <div className="flex justify-center gap-4">
                <div className="glass-card p-4 rounded-xl">
                  <p className="text-3xl font-bold text-white">{funnel.analytics?.views || 0}</p>
                  <p className="text-sm text-slate-400">Перегляди</p>
                </div>
                <div className="glass-card p-4 rounded-xl">
                  <p className="text-3xl font-bold text-white">{funnel.analytics?.conversions || 0}</p>
                  <p className="text-sm text-slate-400">Конверсії</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="w-20 h-20 rounded-2xl bg-orange-500/20 flex items-center justify-center">
        <Plus className="w-10 h-10 text-orange-500" />
      </div>
      <h3 className="text-xl font-semibold text-white">Немає кроків</h3>
      <p className="text-slate-400">Додайте перший крок воронки</p>
      <Button onClick={onAdd} data-color="orange" data-size="lg">
        <Plus className="w-5 h-5 mr-2" />
        Додати крок
      </Button>
    </div>
  )
}