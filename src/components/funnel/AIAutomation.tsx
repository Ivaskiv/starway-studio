// src/components/funnel/AIAutomation.tsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { 
  Sparkles, Brain, MessageSquare, Target,
  Zap, TrendingUp, Users, Settings
} from 'lucide-react'

interface AIConfig {
  mentorPersonality: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  triggers: AITrigger[]
}

interface AITrigger {
  id: string
  event: string
  aiAction: string
  enabled: boolean
}

export default function AIAutomation() {
  const [config, setConfig] = useState<AIConfig>({
    mentorPersonality: 'friendly',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: 'Ти AI-ментор платформи Starway. Твоє завдання - підтримувати учнів, мотивувати їх та допомагати досягати цілей.',
    triggers: [
      { id: '1', event: 'user_registered', aiAction: 'send_welcome', enabled: true },
      { id: '2', event: 'lesson_completed', aiAction: 'send_congratulation', enabled: true },
      { id: '3', event: 'inactive_3_days', aiAction: 'send_reminder', enabled: true },
      { id: '4', event: 'quiz_failed', aiAction: 'send_support', enabled: true },
    ]
  })

  const [testPrompt, setTestPrompt] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  const personalities = [
    { value: 'friendly', label: '😊 Дружній та підтримуючий' },
    { value: 'professional', label: '💼 Професійний та діловий' },
    { value: 'motivational', label: '🔥 Мотивуючий та енергійний' },
    { value: 'wise', label: '🧘 Мудрий та спокійний' },
    { value: 'playful', label: '🎉 Жартівливий та легкий' }
  ]

  const models = [
    { value: 'gpt-4', label: 'GPT-4 (найрозумніший)' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (швидший)' }
  ]

  const eventTypes = [
    { value: 'user_registered', label: 'Користувач зареєструвався' },
    { value: 'lesson_completed', label: 'Урок завершено' },
    { value: 'inactive_3_days', label: '3 дні неактивний' },
    { value: 'quiz_failed', label: 'Тест провалено' },
    { value: 'purchase_made', label: 'Покупка здійснена' },
    { value: 'course_completed', label: 'Курс завершено' }
  ]

  const aiActions = [
    { value: 'send_welcome', label: 'Відправити вітання' },
    { value: 'send_congratulation', label: 'Відправити вітання з успіхом' },
    { value: 'send_reminder', label: 'Відправити нагадування' },
    { value: 'send_support', label: 'Відправити підтримку' },
    { value: 'recommend_next', label: 'Рекомендувати наступний крок' },
    { value: 'analyze_progress', label: 'Проаналізувати прогрес' }
  ]

  const updateConfig = (updates: Partial<AIConfig>) => {
    setConfig({ ...config, ...updates })
  }

  const toggleTrigger = (id: string) => {
    updateConfig({
      triggers: config.triggers.map(t =>
        t.id === id ? { ...t, enabled: !t.enabled } : t
      )
    })
  }

  const testAI = async () => {
    if (!testPrompt) return
    
    setIsTesting(true)
    
    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const responses: Record<string, string> = {
      friendly: `Привіт! 😊 Я твій AI-ментор на платформі Starway. Як твої справи? Чи можу я тобі чимось допомогти сьогодні?`,
      professional: `Доброго дня. Я ваш персональний AI-асистент. Готовий надати вам підтримку у досягненні ваших цілей.`,
      motivational: `Вітаю, чемпіоне! 🔥 Сьогодні ти зробиш ще один крок до своєї мети. Я тут, щоб підтримати тебе!`,
      wise: `Вітаю тебе 🧘 Пам'ятай: шлях у тисячу миль починається з першого кроку. Як я можу допомогти тобі сьогодні?`,
      playful: `Хей-хей! 🎉 Готовий до нових пригод? Я твій AI-друг, і сьогодні буде весело!`
    }
    
    setTestResponse(responses[config.mentorPersonality] || responses.friendly)
    setIsTesting(false)
  }

  const saveConfig = () => {
    console.log('Saving AI config:', config)
    alert('AI конфігурацію збережено! ✅')
  }

  return (
    <div className="space-y-8">
      
      <div>
        <h3 className="text-xl font-bold mb-2">AI Автоматизація</h3>
        <p className="text-gray-400 text-sm">
          Налаштуй AI-ментора для персоналізованої взаємодії з користувачами
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Configuration */}
        <div className="space-y-6">
          
          {/* Personality */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={20} className="text-purple-400" />
              <h4 className="font-bold">Особистість AI</h4>
            </div>

            <Select
              label="Стиль спілкування"
              options={personalities}
              value={config.mentorPersonality}
              onChange={(e) => updateConfig({ mentorPersonality: e.target.value })}
              className="mb-4"
            />

            <Select
              label="AI модель"
              options={models}
              value={config.model}
              onChange={(e) => updateConfig({ model: e.target.value })}
            />
          </div>

          {/* Advanced Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={20} className="text-orange-400" />
              <h4 className="font-bold">Розширені налаштування</h4>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">
                    Temperature: {config.temperature}
                  </label>
                </div>
                <Input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Вища = креативніший, нижча = передбачуваніший
                </p>
              </div>

              <Input
                label="Max Tokens"
                type="number"
                value={config.maxTokens}
                onChange={(e) => updateConfig({ maxTokens: parseInt(e.target.value) })}
              />

              <Textarea
                label="System Prompt"
                value={config.systemPrompt}
                onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          {/* Triggers */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={20} className="text-yellow-400" />
              <h4 className="font-bold">AI Тригери</h4>
            </div>

            <div className="space-y-3">
              {config.triggers.map(trigger => (
                <div
                  key={trigger.id}
                  className={`
                    p-4 rounded-xl border transition
                    ${trigger.enabled 
                      ? 'bg-green-500/10 border-green-500/20' 
                      : 'bg-gray-800 border-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trigger.enabled}
                        onChange={() => toggleTrigger(trigger.id)}
                        className="w-4 h-4 text-green-500 bg-gray-900 border-gray-700 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <span className="font-medium">
                        {eventTypes.find(e => e.value === trigger.event)?.label}
                      </span>
                    </label>
                  </div>
                  
                  <p className="text-sm text-gray-400 pl-7">
                    → {aiActions.find(a => a.value === trigger.aiAction)?.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testing */}
        <div className="space-y-6">
          
          {/* Test AI */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={20} className="text-purple-400" />
              <h4 className="font-bold">Тест AI-ментора</h4>
            </div>

            <Textarea
              label="Напиши повідомлення"
              placeholder="Привіт! Як справи?"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              rows={3}
              className="mb-4"
            />

            <Button
              variant="primary"
              onClick={testAI}
              isLoading={isTesting}
              className="w-full mb-4"
            >
              <Sparkles size={16} />
              Тестувати AI
            </Button>

            {testResponse && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-2">Відповідь AI:</p>
                <p className="text-white">{testResponse}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-green-400" />
              <h4 className="font-bold">Статистика AI</h4>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Повідомлень відправлено</span>
                <span className="text-2xl font-bold">1,247</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Середній час відповіді</span>
                <span className="text-2xl font-bold">2.3с</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Задоволеність</span>
                <span className="text-2xl font-bold text-green-400">94%</span>
              </div>

              <div className="h-px bg-gray-800 my-4" />

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users size={16} />
                <span>Активних користувачів: 234</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Target size={16} />
                <span>Конверсія з AI: 28.5%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h4 className="font-bold mb-4">Швидкі дії</h4>
            
            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-start">
                <Sparkles size={16} />
                Згенерувати нові тригери
              </Button>
              
              <Button variant="secondary" className="w-full justify-start">
                <MessageSquare size={16} />
                Переглянути історію
              </Button>
              
              <Button variant="secondary" className="w-full justify-start">
                <TrendingUp size={16} />
                Аналіз ефективності
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={saveConfig} className="px-8">
          <Sparkles size={16} />
          Зберегти конфігурацію
        </Button>
      </div>
    </div>
  )
}