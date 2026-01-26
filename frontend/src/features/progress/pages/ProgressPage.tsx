// frontend/src/features/progress/pages/ProgressPage.tsx
import { GlassCard } from '@/ui'
import { GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/ui/GlassCard'
import { Activity, TrendingUp } from 'lucide-react'
// import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/ui'
// import { BalanceWheel } from '@/features/wheel/components/BalanceWheel'
import { BalanceWheel } from '@/features/wheel/components/BalanceWheel';

// Тимчасові дані (замінити на RTK Query)
const mockData = {
  currentStreak: 5,
  bestStreak: 8,
  totalSessions: 42,
  balanceScore: 6.5
}

export default function ProgressPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Прогрес</h1>
          <p className="text-white/60 text-sm">Твої досягнення та статистика</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard blur="lg" hover>
          <GlassCardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60 text-sm">Поточна серія</span>
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-white">
              {mockData.currentStreak} днів
            </div>
            <div className="text-xs text-white/40 mt-2">
              +{mockData.totalSessions} сесій
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard blur="lg" hover>
          <GlassCardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60 text-sm">Найкраща серія</span>
              <span className="text-2xl">🏆</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {mockData.bestStreak} днів
            </div>
            <div className="text-xs text-white/40 mt-2">
              Досягнуто цього місяця
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard blur="lg" hover>
          <GlassCardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/60 text-sm">Ціль досягнуто</span>
              <span className="text-2xl">🎯</span>
            </div>
            <div className="text-3xl font-bold text-white">
              30 днів
            </div>
            <div className="text-xs text-white/40 mt-2">
              Достроково
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Balance Wheel */}
      <GlassCard blur="xl" glow>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            Колесо балансу
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="py-8">
          <BalanceWheel score={mockData.balanceScore} maxScore={10} />
          <div className="text-center mt-6">
            <p className="text-white/60 text-sm">
              Середній бал: <span className="text-orange-500 font-semibold">{mockData.balanceScore} / 10</span>
            </p>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Activity Chart Placeholder */}
      <GlassCard blur="lg">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Активність за тиждень
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent className="p-6">
          <div className="flex items-end justify-between gap-2 h-32">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-orange-600 transition-all hover:from-orange-400 hover:to-orange-500"
                  style={{ height: `${Math.random() * 100}%` }}
                />
                <span className="text-xs text-white/60">{day}</span>
              </div>
            ))}
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}