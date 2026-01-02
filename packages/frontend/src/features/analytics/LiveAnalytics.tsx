// src/pages/admin/LiveAnalytics.tsx
// Live Analytics - real-time dashboard з auto-refresh


import { useState, useEffect } from 'react'
import { Select } from '@starway-studio/shared/ui/Select.js'
import { Button } from '@starway-studio/shared/ui/Button.js'
import { 
  Activity, TrendingUp, Users, DollarSign,
  ArrowUpRight, ArrowDownRight, Download, RefreshCw
} from 'lucide-react'
import { analyticsApi } from '../../services/api'

export default function LiveAnalytics() {
  const [period, setPeriod] = useState('30d')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)

  const periods = [
    { value: 'today', label: 'Сьогодні' },
    { value: '7d', label: '7 днів' },
    { value: '30d', label: '30 днів' },
    { value: '90d', label: '90 днів' }
  ]

  const loadAnalytics = async () => {
    setIsRefreshing(true)
    try {
      const data = await analyticsApi.getDashboardStats()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000)
    return () => clearInterval(interval)
  }, [period])

  const stats = [
    {
      label: 'Активні зараз',
      value: '47',
      change: '+12',
      trend: 'up',
      icon: Activity,
      color: 'blue'
    },
    {
      label: 'Конверсії сьогодні',
      value: '23',
      change: '+8.5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'green'
    },
    {
      label: 'Нові користувачі',
      value: '156',
      change: '+24',
      trend: 'up',
      icon: Users,
      color: 'purple'
    },
    {
      label: 'Дохід сьогодні',
      value: '₴8,450',
      change: '+15.2%',
      trend: 'up',
      icon: DollarSign,
      color: 'orange'
    }
  ]

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Live Аналітика</h1>
          <p className="text-gray-400">Дані оновлюються кожні 30 секунд</p>
        </div>

        <div className="flex gap-3">
          <Select
            options={periods}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-40"
          />

          <Button
            variant="secondary"
            onClick={loadAnalytics}
            isLoading={isRefreshing}
            aria-label="Оновити дані"
          >
            <RefreshCw size={16} />
          </Button>

          <Button variant="secondary" aria-label="Експортувати">
            <Download size={16} />
          </Button>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
        </div>
        <span className="text-green-400 font-medium">Live</span>
        <span className="text-gray-500">Останнє оновлення: щойно</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isPositive = stat.trend === 'up'

          return (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${stat.color}-500/10`}>
                  <Icon size={24} className={`text-${stat.color}-400`} />
                </div>

                <div className={`flex items-center gap-1 text-sm ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  <span>{stat.change}</span>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Funnel Performance */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Продуктивність воронок</h3>

        <div className="space-y-4">
          {[
            { name: 'Сила свідомості', visitors: 847, conversions: 187, rate: 22.1 },
            { name: 'AI-воронки', visitors: 623, conversions: 134, rate: 21.5 },
            { name: '5 точок опори', visitors: 451, conversions: 89, rate: 19.7 }
          ].map((funnel) => (
            <div key={funnel.name} className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{funnel.name}</h4>
                <span className="text-green-400 font-bold">{funnel.rate}%</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">Відвідувачі</p>
                  <p className="font-bold">{funnel.visitors}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Конверсії</p>
                  <p className="font-bold">{funnel.conversions}</p>
                </div>
              </div>

              <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-pink-500"
                  style={{ width: `${funnel.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Activity */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Активність в реальному часі</h3>

        <div className="space-y-3">
          {[
            { user: 'Марія К.', action: 'Завершила урок 5', time: '2 хв тому', type: 'success' },
            { user: 'Олексій П.', action: 'Придбав Core продукт', time: '5 хв тому', type: 'purchase' },
            { user: 'Ірина М.', action: 'Зареєструвалась', time: '8 хв тому', type: 'new' },
            { user: 'Андрій С.', action: 'Відкрив email', time: '12 хв тому', type: 'engagement' }
          ].map((activity, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition"
            >
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'success' ? 'bg-green-400' :
                activity.type === 'purchase' ? 'bg-orange-400' :
                activity.type === 'new' ? 'bg-blue-400' :
                'bg-purple-400'
              }`} />
              
              <div className="flex-1">
                <p className="font-medium text-sm">{activity.user}</p>
                <p className="text-xs text-gray-400">{activity.action}</p>
              </div>

              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}