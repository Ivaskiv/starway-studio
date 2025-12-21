// packages/frontend/src/pages/demo/steps/Step3DemoDashboard.tsx

import { useState, useEffect } from 'react'
import { Bell, Zap, ArrowRight, Eye, Copy, Sparkles } from 'lucide-react'
import Block0Instructions from '@/features/funnel/components/Block0Instructions'
import AIGeneratorPopup from '@/features/funnel/components/AIGeneratorPopup'
import GenerationsCounter from '@/features/funnel/components/GenerationsCounter'
import FunnelStepCard from '@/features/funnel/components/FunnelStepCard'
import { FunnelStep } from '@starway/shared'
import { DEMO_FUNNEL_STEPS } from '@/features/funnel/data/demoFunnelTemplate'
import { Button } from '@/components/ui'

type Block0 = { name: string; audience: string; goal: string }

export default function Step3DemoDashboard() {
  const [block0, setBlock0] = useState<Block0>({ name: '', audience: '', goal: '' })
  const [block0Completed, setBlock0Completed] = useState(false)
  const [totalGenerations] = useState(33)
  const [usedGenerations, setUsedGenerations] = useState(0)
  const [showAIPopup, setShowAIPopup] = useState(false)
  const [aiField, setAiField] = useState<keyof Block0 | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [notification, setNotification] = useState('')
  const [userSteps, setUserSteps] = useState<FunnelStep[]>([])
  const [editingStepId, setEditingStepId] = useState<string | null>(null)

  useEffect(() => {
    console.log('🚀 [INIT] Step3 завантажено')
    const isComplete = block0.name && block0.audience && block0.goal
    if (isComplete && !block0Completed) {
      console.log('✅ [BLOCK0] Завершено!')
      setBlock0Completed(true)
    }
  }, [block0])

  const showNotif = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const handleOpenAI = (field: keyof Block0) => {
    console.log(`🤖 [AI] Відкрито для: ${field}`)
    setAiField(field)
    setShowAIPopup(true)
  }

  const handleGenerateAI = (prompt: string) => {
    if (usedGenerations >= totalGenerations) return
    console.log(`🤖 [AI] Генерація: "${prompt}"`)
    setUsedGenerations(prev => prev + 1)
  }

  const handleSelectVariant = (text: string) => {
    if (!aiField) return
    console.log(`📋 [COPY] "${text}" → ${aiField}`)
    setBlock0({ ...block0, [aiField]: text })
    setShowAIPopup(false)
    showNotif(`✅ ${aiField} оновлено!`)
  }

  const handleCloneFromDemo = (step: FunnelStep) => {
    console.log(`📋 [CLONE] Клонування: ${step.title}`)
    const newStep: FunnelStep = {
      ...step,
      id: `user-${Date.now()}`,
      isCustom: true,
      order: userSteps.length + 1
    }
    setUserSteps(prev => [...prev, newStep])
    showNotif(`✅ Крок "${step.title}" додано!`)
  }

  const handleNextStep = () => {
    if (!block0Completed) return
    console.log('➡️ [NEXT] Перехід до Блоку 1')
    setCurrentStep(1)
  }

  const remainingGens = totalGenerations - usedGenerations

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 rounded-xl shadow-2xl animate-bounce">
          <p className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {notification}
          </p>
        </div>
      )}

      {/* Header */}
      <header className="mb-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold">AI Funnel Builder</h1>
            <p className="text-sm text-gray-400">Крок {currentStep + 1}/11</p>
          </div>
        </div>

        <GenerationsCounter
          total={totalGenerations}
          used={usedGenerations}
          remaining={remainingGens}
        />
      </header>

      {/* ════════════════════════════════════════════════════ */}
      {/* БЛОК 0: Основа воронки */}
      {/* ════════════════════════════════════════════════════ */}
      {currentStep === 0 && (
        <div className="max-w-5xl mx-auto">
          <Block0Instructions />

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
            {/* Поле 1: Назва */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                1️⃣ Назва AI-воронки *
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={block0.name}
                  onChange={e => setBlock0({ ...block0, name: e.target.value })}
                  placeholder="Напр: AI-Ментор: Трансформація життя"
                  className="flex-1 px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none"
                />
                <button
                  onClick={() => handleOpenAI('name')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  AI
                </button>
              </div>
            </div>

            {/* Поле 2: Аудиторія */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                2️⃣ Цільова аудиторія *
              </label>
              <div className="flex gap-3">
                <textarea
                  value={block0.audience}
                  onChange={e => setBlock0({ ...block0, audience: e.target.value })}
                  placeholder="Напр: Люди 25-45 років, вигорання, пошук сенсу..."
                  rows={3}
                  className="flex-1 px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none resize-none"
                />
                <button
                  onClick={() => handleOpenAI('audience')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold transition-all self-start"
                >
                  <Sparkles className="w-5 h-5" />
                  AI
                </button>
              </div>
            </div>

            {/* Поле 3: Мета */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                3️⃣ Мета воронки *
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={block0.goal}
                  onChange={e => setBlock0({ ...block0, goal: e.target.value })}
                  placeholder="Напр: Купити повний курс за ₴2999"
                  className="flex-1 px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none"
                />
                <button
                  onClick={() => handleOpenAI('goal')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  AI
                </button>
              </div>
            </div>

            {/* Кнопка Далі */}
            <button
              onClick={handleNextStep}
              disabled={!block0Completed}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-all"
            >
              {block0Completed ? (
                <>
                  Зберегти і перейти до Блоку 1
                  <ArrowRight className="w-6 h-6" />
                </>
              ) : (
                'Заповніть усі поля'
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* БЛОК 1+: Робота з кроками */}
      {/* ════════════════════════════════════════════════════ */}
      {currentStep >= 1 && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ЛІВОРУЧ: Demo кроки */}
            <aside className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Eye className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold">Мої 10 кроків (Demo)</h2>
                  <p className="text-sm text-gray-400">Клонуйте крок →</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
                {DEMO_FUNNEL_STEPS.map((step, idx) => (
                  <div
                    key={step.id}
                    className="bg-gray-900/60 border border-gray-700 hover:border-purple-500/50 rounded-xl p-4 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                            #{idx + 1}
                          </span>
                          <span className="text-xs text-gray-400">{step.stage}</span>
                        </div>
                        <h3 className="font-semibold text-white text-sm">{step.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                      </div>
                      <Button
                        onClick={() => handleCloneFromDemo(step)}
                        className="ml-3 p-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-all"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* ПРАВОРУЧ: Склоновані кроки користувача */}
            <main className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6">Моя воронка ({userSteps.length} кроків)</h2>

              {userSteps.length === 0 ? (
                <div className="text-center py-20">
                  <Zap className="w-16 h-16 text-purple-500 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-400">Клонуйте кроки з Demo ліворуч</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
                  {userSteps.map(step => (
                    <FunnelStepCard
                      key={step.id}
                      step={step}
                      isEditing={editingStepId === step.id}
                      onEdit={() => setEditingStepId(editingStepId === step.id ? null : step.id)}
                      onDelete={() => setUserSteps(prev => prev.filter(s => s.id !== step.id))}
                      onUpdate={(id, field, value) =>
                        setUserSteps(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)))
                      }
                      onAIGenerate={(id) => {
                        console.log(`🤖 [AI] Генерація для кроку ${id}`)
                        showNotif('AI-генератор для кроків у розробці')
                      }}
                    />
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {/* AI Popup */}
      {showAIPopup && (
        <AIGeneratorPopup
          field={aiField}
          remainingGens={remainingGens}
          onClose={() => setShowAIPopup(false)}
          onGenerate={handleGenerateAI}
          onSelectVariant={handleSelectVariant}
        />
      )}
    </div>
  )
}

