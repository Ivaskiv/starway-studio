// /Users/viravira/Documents/starway-studio/packages/frontend/src/features/demo/Step3DemoDashboard.tsx
// packages/frontend/src/pages/demo/steps/Step3DemoDashboard.tsx

import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectDraft, selectGenerations, updateDraft, useGeneration } from '@/features/funnel/funnelSlice'
import { Button } from '@/components/ui'
import { Sparkles, ArrowRight, Bell } from 'lucide-react'
import Block0Form from './Block0Form'
import FunnelBuilder from './FunnelBuilder'

export default function Step3DemoDashboard() {
  const dispatch = useAppDispatch()
  const draft = useAppSelector(selectDraft)
  const gens = useAppSelector(selectGenerations)
  
  const [currentStep, setCurrentStep] = useState(0)
  const [notification, setNotification] = useState('')
  const [serverGens, setServerGens] = useState(gens)

  // Завантаження статистики з сервера
  useEffect(() => {
    fetch('/api/ai/stats', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setServerGens(data))
      .catch(() => {})
  }, [])

  const block0Complete = draft.name && draft.audience && draft.goal

  const showNotif = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(''), 3000)
  }

  const handleGenerate = async (field: string, prompt: string) => {
    if (serverGens.remaining === 0) {
      showNotif('⚠️ Генерації закінчились')
      return
    }

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ field, prompt, context: draft })
      })

      const data = await response.json()
      
      if (data.error === 'generation_limit_reached') {
        showNotif('⚠️ Ліміт генерацій вичерпано')
        return
      }
      
      dispatch(useGeneration({ field, result: data.result }))
      dispatch(updateDraft({ [field]: data.result }))
      setServerGens(prev => ({ ...prev, remaining: data.remaining, used: prev.used + 1 }))
      showNotif(`✅ ${field} згенеровано!`)
    } catch (err) {
      showNotif('❌ Помилка генерації')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 px-6 py-3 rounded-xl animate-bounce">
          <Bell className="w-5 h-5 inline mr-2" />
          {notification}
        </div>
      )}

      <header className="mb-6 flex justify-between items-center max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">AI Funnel Builder</h1>
          <p className="text-sm text-gray-400">Крок {currentStep + 1}/11</p>
        </div>

        <div className="bg-gray-900 px-6 py-3 rounded-xl">
          <div className="text-xs text-gray-400">Генерації</div>
          <div className="text-2xl font-bold">
            {gens.remaining} <span className="text-gray-500">/ {gens.total}</span>
          </div>
        </div>
      </header>

      {currentStep === 0 && (
        <div className="max-w-5xl mx-auto">
          <Block0Form
            draft={draft}
            onUpdate={(field, value) => dispatch(updateDraft({ [field]: value }))}
            onGenerate={handleGenerate}
          />

          <Button
            onClick={() => setCurrentStep(1)}
            disabled={!block0Complete}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {block0Complete ? (
              <>
                Зберегти і перейти до Блоку 1 <ArrowRight className="w-6 h-6 ml-2" />
              </>
            ) : (
              'Заповніть усі поля'
            )}
          </Button>
        </div>
      )}

      {currentStep >= 1 && (
        <FunnelBuilder
          draft={draft}
          onUpdate={(steps) => dispatch(updateDraft({ steps }))}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  )
}