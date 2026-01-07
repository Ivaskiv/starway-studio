// /Users/viravira/Documents/starway-studio/packages/frontend/src/pages/admin/ABTesting.tsx
// src/pages/admin/ABTesting.tsx
// 
import { useState } from 'react'
import { 
  FlaskConical, Play, Pause, TrendingUp, 
  Copy, CheckCircle, XCircle, BarChart3,
  Target, Users, DollarSign
} from 'lucide-react'
import { ABTest } from './adminTypes'
import { Button } from '../../ui'



export default function ABTesting() {
  const [tests, setTests] = useState<ABTest[]>([
    {
      id: '1',
      name: 'Заголовок на лендінгу',
      status: 'running',
      metric: 'conversion',
      traffic: 50,
      startDate: '2024-12-01',
      variants: [
        { id: 'a', name: 'Контроль', traffic: 50, conversions: 89, visitors: 423, revenue: 106800, isControl: true },
        { id: 'b', name: 'Варіант B', traffic: 50, conversions: 112, visitors: 445, revenue: 134400, isControl: false }
      ],
      results: { winnerId: 'b', confidence: 95, improvement: 25.8 }
    },
    {
      id: '2',
      name: 'Email тема - Tripwire',
      status: 'running',
      metric: 'open_rate',
      traffic: 50,
      startDate: '2024-12-10',
      variants: [
        { id: 'a', name: 'Контроль', traffic: 50, conversions: 234, visitors: 567, revenue: 0, isControl: true },
        { id: 'b', name: 'Варіант B', traffic: 50, conversions: 198, visitors: 543, revenue: 0, isControl: false }
      ]
    }
  ])

  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)

  const metrics = [
    { value: 'conversion', label: 'Конверсія' },
    { value: 'open_rate', label: 'Open Rate' },
    { value: 'click_rate', label: 'Click Rate' },
    { value: 'revenue', label: 'Дохід' }
  ]

  const startTest = (id: string) => {
    setTests(tests.map(t => 
      t.id === id ? { ...t, status: 'running' as const, startDate: new Date().toISOString() } : t
    ))
  }

  const pauseTest = (id: string) => {
    setTests(tests.map(t => 
      t.id === id ? { ...t, status: 'paused' as const } : t
    ))
  }

  const completeTest = (id: string) => {
    setTests(tests.map(t => 
      t.id === id ? { ...t, status: 'completed' as const, endDate: new Date().toISOString() } : t
    ))
  }

  const duplicateTest = (id: string) => {
    const test = tests.find(t => t.id === id)
    if (!test) return

    const newTest: ABTest = {
      ...test,
      id: `${Date.now()}`,
      name: `${test.name} (копія)`,
      status: 'draft',
      startDate: undefined,
      results: undefined
    }
    setTests([...tests, newTest])
  }

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">A/B Testing</h1>
          <p className="text-gray-400">Оптимізуй конверсії через експерименти</p>
        </div>

        <Button>
          <FlaskConical size={16} />
          Новий тест
        </Button>
      </div>

      {/* Active Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tests.map((test) => (
          <div
            key={test.id}
            className={`
              bg-gray-900 border rounded-2xl p-6 transition-all cursor-pointer
              ${test.status === 'running' 
                ? 'border-green-500/50 shadow-lg shadow-green-500/10' 
                : 'border-gray-800 hover:border-gray-700'
              }
            `}
            onClick={() => setSelectedTest(test)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">{test.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${test.status === 'running' ? 'bg-green-500/10 text-green-400' :
                      test.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                      test.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-gray-500/10 text-gray-400'
                    }
                  `}>
                    {test.status === 'running' ? '▶️ Running' :
                     test.status === 'completed' ? '✅ Completed' :
                     test.status === 'paused' ? '⏸️ Paused' :
                     '📝 Draft'
                    }
                  </span>
                  <span className="text-xs text-gray-500">
                    {metrics.find(m => m.value === test.metric)?.label}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {test.status === 'running' && (
                  <Button
                  
                    onClick={(e) => {
                      e.stopPropagation()
                      pauseTest(test.id)
                    }}
                    className="p-2"
                    aria-label="Призупинити"
                  >
                    <Pause size={16} />
                  </Button>
                )}

                {test.status === 'paused' && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      startTest(test.id)
                    }}
                    className="p-2"
                    aria-label="Запустити"
                  >
                    <Play size={16} />
                  </Button>
                )}

                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    duplicateTest(test.id)
                  }}
                  className="p-2"
                  aria-label="Дублювати"
                >
                  <Copy size={16} />
                </Button>
              </div>
            </div>

            {/* Variants Comparison */}
            <div className="space-y-3">
              {test.variants.map((variant) => {
                const conversionRate = variant.visitors > 0 
                  ? ((variant.conversions / variant.visitors) * 100).toFixed(1)
                  : '0'

                const isWinner = test.results?.winnerId === variant.id

                return (
                  <div
                    key={variant.id}
                    className={`
                      bg-gray-800/50 rounded-xl p-4 border
                      ${isWinner ? 'border-green-500/50' : 'border-transparent'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{variant.name}</span>
                        {variant.isControl && (
                          <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">Control</span>
                        )}
                        {isWinner && (
                          <CheckCircle size={16} className="text-green-400" />
                        )}
                      </div>
                      <span className="text-xl font-bold text-orange-400">
                        {conversionRate}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Visitors</p>
                        <p className="font-medium">{variant.visitors}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Conversions</p>
                        <p className="font-medium">{variant.conversions}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Revenue</p>
                        <p className="font-medium text-green-400">
                          ₴{(variant.revenue / 1000).toFixed(0)}k
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Results */}
            {test.results && (
              <div className="mt-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-400 mb-1">Покращення</p>
                    <p className="text-2xl font-bold text-green-400">
                      +{test.results.improvement}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 mb-1">Впевненість</p>
                    <p className="text-xl font-bold">{test.results.confidence}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <FlaskConical size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Активних тестів</p>
              <p className="text-3xl font-bold">
                {tests.filter(t => t.status === 'running').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Середнє покращення</p>
              <p className="text-3xl font-bold text-green-400">+18.5%</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <BarChart3 size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Завершених тестів</p>
              <p className="text-3xl font-bold">
                {tests.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Target size={24} className="text-orange-400 mt-0.5" />
          <div>
            <h3 className="font-bold text-orange-400 mb-2">Best Practices</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Тестуй одну зміну за раз для точних результатів</li>
              <li>• Мінімум 100 конверсій на варіант для статистичної значущості</li>
              <li>• Запускай тести мінімум на 7 днів для урахування тижневих циклів</li>
              <li>• Використовуй рівний розподіл трафіку (50/50) для початку</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}