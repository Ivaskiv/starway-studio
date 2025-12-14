// src/pages/admin/Analytics.tsx
import { useState } from 'react'
import { 
  TrendingUp, TrendingDown, Users, Target, 
  Mail, MessageCircle, CreditCard, Filter,
  Calendar, Download, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'

type TimeRange = '7d' | '30d' | '90d' | 'all'

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [selectedFunnel, setSelectedFunnel] = useState<string>('all')

  // Mock data - потім замінимо на API
  const funnels = [
    { value: 'all', label: 'Всі воронки' },
    { value: '1', label: 'Сила свідомості - основна' },
    { value: '2', label: 'AI-воронки - інтенсив' },
    { value: '3', label: '5 точок опори - практикум' }
  ]

  const stats = [
    {
      label: 'Унікальні відвідувачі',
      value: '3,247',
      change: '+12.3%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      label: 'Загальна конверсія',
      value: '18.7%',
      change: '+2.4%',
      trend: 'up',
      icon: Target,
      color: 'from-green-500 to-emerald-500'
    },
    {
      label: 'Email Open Rate',
      value: '42.3%',
      change: '-1.2%',
      trend: 'down',
      icon: Mail,
      color: 'from-purple-500 to-pink-500'
    },
    {
      label: 'Telegram CTR',
      value: '65.8%',
      change: '+8.5%',
      trend: 'up',
      icon: MessageCircle,
      color: 'from-orange-500 to-red-500'
    }
  ]

  const funnelSteps = [
    { 
      step: 'Лендінг', 
      users: 3247, 
      conversion: 100,
      dropoff: 0,
      icon: Users 
    },
    { 
      step: 'Реєстрація', 
      users: 2156, 
      conversion: 66.4,
      dropoff: 33.6,
      icon: Mail 
    },
    { 
      step: 'Email підтвердження', 
      users: 1823, 
      conversion: 56.1,
      dropoff: 10.3,
      icon: Mail 
    },
    { 
      step: 'Telegram підписка', 
      users: 1547, 
      conversion: 47.6,
      dropoff: 8.5,
      icon: MessageCircle 
    },
    { 
      step: 'Перегляд оффера', 
      users: 1245, 
      conversion: 38.3,
      dropoff: 9.3,
      icon: Target 
    },
    { 
      step: 'Оплата', 
      users: 607, 
      conversion: 18.7,
      dropoff: 19.6,
      icon: CreditCard 
    }
  ]

  const topFunnels = [
    { name: 'Сила свідомості', conversions: 234, revenue: '₴127,450', ctr: '24.3%' },
    { name: 'AI-воронки', conversions: 189, revenue: '₴94,500', ctr: '21.8%' },
    { name: '5 точок опори', conversions: 156, revenue: '₴78,000', ctr: '19.2%' },
    { name: 'Безкоштовний вебінар', conversions: 87, revenue: '₴0', ctr: '15.7%' }
  ]

  const timeRanges = [
    { value: '7d', label: '7 днів' },
    { value: '30d', label: '30 днів' },
    { value: '90d', label: '90 днів' },
    { value: 'all', label: 'Весь час' }
  ]

  return (
    <div className="space-y-8">
      
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Аналітика</h1>
          <p className="text-gray-400 mt-2">Детальна статистика твоїх воронок</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range */}
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value as TimeRange)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  timeRange === range.value
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Funnel Filter */}
          <Select
            value={selectedFunnel}
            onChange={(e) => setSelectedFunnel(e.target.value)}
            options={funnels}
            className="min-w-[200px]"
          />

          {/* Export */}
          <Button
            variant="secondary"
            className="flex items-center gap-2"
            aria-label="Експортувати дані"
          >
            <Download size={16} />
            Експорт
          </Button>
        </div>
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
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <Icon size={24} className="text-white" />
                </div>
                
                <div className={`flex items-center gap-1 text-sm ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? (
                    <ArrowUpRight size={16} />
                  ) : (
                    <ArrowDownRight size={16} />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              
              <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Funnel Visualization */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-6">Воронка конверсії</h2>
        
        <div className="space-y-4">
          {funnelSteps.map((step, index) => {
            const Icon = step.icon
            const width = step.conversion
            const isLast = index === funnelSteps.length - 1
            
            return (
              <div key={step.step}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Icon size={20} className="text-gray-400" />
                    <span className="font-medium">{step.step}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">
                      {step.users.toLocaleString()} користувачів
                    </span>
                    <span className="font-bold text-orange-400">
                      {step.conversion}%
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-8 bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${
                      isLast 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-r from-orange-500 to-pink-500'
                    } transition-all duration-500`}
                    style={{ width: `${width}%` }}
                  />
                  
                  {step.dropoff > 0 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      -{step.dropoff}% drop-off
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Funnels Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-6">Топ воронки за конверсією</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                  Назва воронки
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Конверсії
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Дохід
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  CTR
                </th>
              </tr>
            </thead>
            <tbody>
              {topFunnels.map((funnel, index) => (
                <tr 
                  key={funnel.name}
                  className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{funnel.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-bold">
                    {funnel.conversions}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-green-400">
                    {funnel.revenue}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-sm font-medium">
                      {funnel.ctr}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}