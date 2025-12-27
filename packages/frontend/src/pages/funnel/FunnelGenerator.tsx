// src/pages/admin/FunnelGenerator.tsx
import { useState } from 'react'
import { moduleManager } from '../../lib/moduleManager'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { 
  Sparkles, Rocket, Zap, CheckCircle, 
  Loader, Download, Eye, Settings
} from 'lucide-react'

export default function FunnelGenerator() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedFunnel, setGeneratedFunnel] = useState<any>(null)

  // Form data
  const [formData, setFormData] = useState({
    businessGoal: '',
    targetAudience: '',
    budget: '',
    timeline: '30',
    landingPageType: 'miniapp' as 'miniapp' | 'tilda' | 'external',
    hostingProvider: 'vercel' as 'vercel' | 'netlify' | 'cloudflare',
    aiPersonality: 'friendly' as 'friendly' | 'professional' | 'motivational'
  })

  // Доступні модулі
  const availableModules = moduleManager.getEnabledModules()

  const landingPageOptions = [
    { value: 'miniapp', label: '🚀 MiniApp (React) - розробимо тут' },
    { value: 'tilda', label: '🎨 Tilda - інтеграція з готовим' },
    { value: 'external', label: '🔗 Зовнішнє посилання' }
  ]

  const hostingOptions = [
    { value: 'vercel', label: 'Vercel (безкоштовно)' },
    { value: 'netlify', label: 'Netlify (безкоштовно)' },
    { value: 'cloudflare', label: 'Cloudflare Pages (безкоштовно)' }
  ]

  const personalityOptions = [
    { value: 'friendly', label: '😊 Дружній та підтримуючий' },
    { value: 'professional', label: '💼 Професійний та діловий' },
    { value: 'motivational', label: '🔥 Мотивуючий та енергійний' }
  ]

  const generateFunnel = async () => {
    setIsGenerating(true)
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Mock AI response
    const mockFunnel = {
      name: 'Сила свідомості - AI Воронка',
      description: 'Автоматична воронка для продажу курсу саморозвитку',
      estimatedRevenue: 280000,
      estimatedConversion: 18.5,
      
      stages: [
        {
          name: 'Awareness',
          duration: 3,
          modules: [
            { moduleId: 'ai-mentor', reason: 'Персоналізоване знайомство' },
            { moduleId: 'telegram-bot', reason: 'Автоматична комунікація' }
          ],
          product: {
            name: '7 днів медитації',
            price: 0,
            description: 'Безкоштовний лід-магніт для знайомства'
          }
        },
        {
          name: 'Interest',
          duration: 7,
          modules: [
            { moduleId: 'life-wheel', reason: 'Діагностика балансу життя' },
            { moduleId: 'email-automation', reason: 'Nurture послідовність' }
          ],
          product: {
            name: 'Колесо балансу PRO',
            price: 99,
            description: 'Tripwire для першої покупки'
          }
        },
        {
          name: 'Decision',
          duration: 4,
          modules: [
            { moduleId: 'courses', reason: 'Демо контент курсу' },
            { moduleId: 'payments', reason: 'Checkout процес' }
          ],
          product: {
            name: 'Сила свідомості 8 тижнів',
            price: 1200,
            description: 'Основний продукт'
          }
        }
      ],
      
      landingPage: {
        type: formData.landingPageType,
        hosting: formData.hostingProvider,
        content: {
          headline: '🧘‍♀️ Відкрий силу свідомості за 8 тижнів',
          subheadline: 'AI-ментор + персональна підтримка для твоїх змін',
          cta: 'Почати трансформацію безкоштовно'
        }
      },
      
      automation: {
        emailCount: 12,
        telegramCount: 25,
        aiPersonality: formData.aiPersonality
      }
    }
    
    setGeneratedFunnel(mockFunnel)
    setIsGenerating(false)
    setStep(3)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-full mb-4">
          <Sparkles size={20} className="text-orange-400" />
          <span className="text-sm font-medium text-orange-400">AI Generator</span>
        </div>
        
        <h1 className="text-4xl font-bold mb-3">
          Створи воронку за 3 хвилини
        </h1>
        <p className="text-gray-400 text-lg">
          AI підбере модулі, створить контент та налаштує автоматизацію
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-bold transition
              ${step >= s 
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' 
                : 'bg-gray-800 text-gray-500'
              }
            `}>
              {s}
            </div>
            {s < 3 && (
              <div className={`w-16 h-1 rounded ${
                step > s ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-gray-800'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Бізнес-інфо */}
      {step === 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
          <h2 className="text-2xl font-bold mb-6">Крок 1: Про твій бізнес</h2>
          
          <Input
            label="Бізнес-мета"
            placeholder="Наприклад: Продати курс за ₴1200"
            value={formData.businessGoal}
            onChange={(e) => setFormData({...formData, businessGoal: e.target.value})}
          />

          <Textarea
            label="Цільова аудиторія"
            placeholder="Наприклад: Жінки 25-45 років, які цікавляться саморозвитком"
            value={formData.targetAudience}
            onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Бюджет на рекламу (необов'язково)"
              type="number"
              placeholder="5000"
              value={formData.budget}
              onChange={(e) => setFormData({...formData, budget: e.target.value})}
            />

            <Input
              label="Тривалість воронки (днів)"
              type="number"
              value={formData.timeline}
              onChange={(e) => setFormData({...formData, timeline: e.target.value})}
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Zap size={20} className="text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-400 mb-1">Доступні модулі</p>
                <p className="text-sm text-gray-400">
                  AI використає {availableModules.length} модулів: {availableModules.slice(0, 3).map(m => m.name).join(', ')}...
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            className="w-full"
            onClick={() => setStep(2)}
            disabled={!formData.businessGoal || !formData.targetAudience}
          >
            Далі: Налаштування →
          </Button>
        </div>
      )}

      {/* Step 2: Налаштування */}
      {step === 2 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
          <h2 className="text-2xl font-bold mb-6">Крок 2: Налаштування</h2>

          <Select
            label="Тип Landing Page"
            options={landingPageOptions}
            value={formData.landingPageType}
            onChange={(e) => setFormData({...formData, landingPageType: e.target.value as any})}
          />

          {formData.landingPageType === 'miniapp' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Rocket size={20} className="text-green-400 mt-0.5" />
                <div>
                  <p className="font-medium text-green-400 mb-1">MiniApp буде створено автоматично</p>
                  <p className="text-sm text-gray-400 mb-3">
                    AI згенерує React компоненти, дизайн та розгорне на хостингу
                  </p>
                  
                  <Select
                    label="Хостинг провайдер"
                    options={hostingOptions}
                    value={formData.hostingProvider}
                    onChange={(e) => setFormData({...formData, hostingProvider: e.target.value as any})}
                  />
                </div>
              </div>
            </div>
          )}

          {formData.landingPageType === 'tilda' && (
            <Input
              label="Посилання на Tilda сторінку"
              placeholder="https://tilda.cc/yourpage"
            />
          )}

          {formData.landingPageType === 'external' && (
            <Input
              label="Зовнішнє посилання"
              placeholder="https://yourwebsite.com"
            />
          )}

          <Select
            label="AI-особистість ментора"
            options={personalityOptions}
            value={formData.aiPersonality}
            onChange={(e) => setFormData({...formData, aiPersonality: e.target.value as any})}
          />

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              ← Назад
            </Button>
            
            <Button
              variant="primary"
              className="flex-1"
              onClick={generateFunnel}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  AI генерує воронку...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Створити воронку
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Результат */}
      {step === 3 && generatedFunnel && (
        <div className="space-y-6">
          
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30 rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <CheckCircle size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">{generatedFunnel.name}</h2>
                <p className="text-gray-300">{generatedFunnel.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Прогноз доходу</p>
                <p className="text-3xl font-bold text-green-400">
                  ₴{generatedFunnel.estimatedRevenue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Конверсія</p>
                <p className="text-3xl font-bold text-blue-400">
                  {generatedFunnel.estimatedConversion}%
                </p>
              </div>
            </div>
          </div>

          {/* Stages */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-6">Етапи воронки</h3>
            
            <div className="space-y-4">
              {generatedFunnel.stages.map((stage: any, idx: number) => (
                <div key={idx} className="bg-gray-800/50 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-lg mb-1">{stage.name}</h4>
                      <p className="text-sm text-gray-400">{stage.duration} днів</p>
                    </div>
                    <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium">
                      Етап {idx + 1}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Модулі:</p>
                      <div className="flex flex-wrap gap-2">
                        {stage.modules.map((m: any, i: number) => (
                          <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm">
                            {moduleManager.getModule(m.moduleId as any)?.icon} {moduleManager.getModule(m.moduleId as any)?.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium mb-1">{stage.product.name}</p>
                          <p className="text-sm text-gray-400">{stage.product.description}</p>
                        </div>
                        <p className="text-2xl font-bold text-green-400">
                          {stage.product.price === 0 ? 'Безкоштовно' : `₴${stage.product.price}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1">
              <Eye size={20} />
              Попередній перегляд
            </Button>
            
            <Button variant="secondary" className="flex-1">
              <Settings size={20} />
              Редагувати
            </Button>
            
            <Button variant="primary" className="flex-1">
              <Rocket size={20} />
              Запустити воронку
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}