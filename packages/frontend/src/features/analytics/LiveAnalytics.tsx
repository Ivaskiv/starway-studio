// src/pages/admin/LiveAnalytics.tsx

import { useState } from 'react'
import { 
  Activity, TrendingUp, Users, DollarSign,
  ArrowUpRight, Download, RefreshCw
} from 'lucide-react'
import { Button, Select } from '@/ui'
import { useGetDashboardStatsQuery } from '@/services/stats.api'

export default function LiveAnalytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  const periods = [
    { value: '7d' as const, label: '7 днів' },
    { value: '30d' as const, label: '30 днів' },
    { value: '90d' as const, label: '90 днів' }
  ]

  const {
    data: stats,
    isLoading,
    isFetching,
    refetch
  } = useGetDashboardStatsQuery({ period }, {
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
  })

  const isRefreshing = isFetching && !isLoading

  const handleRefresh = () => refetch()

  // Формуємо статистики для відображення
  const dashboardStats = [
    {
      label: 'Всього користувачів',
      value: stats?.totalUsers ?? '—',
      change: `+${stats?.newUsersThisMonth ?? 0}`,
      trend: 'up' as const,
      icon: Users,
      color: 'blue'
    },
    {
      label: 'Активні воронки',
      value: stats?.activeFunnels ?? '—',
      change: `з ${stats?.totalFunnels ?? 0} створених`,
      trend: 'up' as const,
      icon: Activity,
      color: 'purple'
    },
    {
      label: 'Конверсія',
      value: stats?.conversionRate ? `${stats.conversionRate.toFixed(1)}%` : '—',
      change: stats?.revenueGrowth != null 
        ? `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}%`
        : '0%',
        trend: (stats?.revenueGrowth ?? 0) >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: 'green'
    },
    {
      label: 'Дохід за період',
      value: stats?.totalRevenue ? `₴${stats.totalRevenue.toLocaleString('uk-UA')}` : '₴—',
      change: stats?.revenueGrowth != null 
            ? `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}%`
            : '0%',
            trend: (stats?.revenueGrowth ?? 0) >= 0 ? 'up' : 'down',
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
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="w-40"
            disabled={isLoading}
          />

          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>

          <Button variant="secondary">
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
        <span className="text-gray-500">
          {isFetching ? 'Оновлюється...' : 'Останнє оновлення: щойно'}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat) => {
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
                  {isPositive ? <ArrowUpRight size={16} /> : <ArrowUpRight size={16} className="rotate-180" />}
                  <span>{stat.change}</span>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Повідомлення при завантаженні або відсутності даних */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400">Завантаження аналітики...</p>
        </div>
      )}

      {!isLoading && !stats && (
        <div className="text-center py-12">
          <p className="text-gray-400">Немає даних за обраний період</p>
        </div>
      )}
    </div>
  )
}