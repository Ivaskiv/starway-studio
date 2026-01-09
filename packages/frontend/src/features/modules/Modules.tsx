// src/pages/admin/Modules.tsx
import { Module, ModuleCategory } from '@/features/modules/module.types'
import { useGetModulesQuery, useToggleModuleMutation } from '@/features/modules/modules.api'
import { Button, Select } from '@/ui'
import { AlertCircle, Check, Crown, Filter, Power, PowerOff, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function Modules() {
  // RTK Query
  const { data: modules = [], isLoading } = useGetModulesQuery()
  const [toggleModuleMutation] = useToggleModuleMutation()

  // Фільтри
  const [filter, setFilter] = useState<'all' | 'enabled' | 'premium'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ModuleCategory | 'all'>('all')

  const categories: { value: ModuleCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'Всі категорії' },
    { value: 'ai', label: '🤖 AI' },
    { value: 'automation', label: '⚡ Автоматизація' },
    { value: 'content', label: '📚 Контент' },
    { value: 'analytics', label: '📊 Аналітика' },
    { value: 'monetization', label: '💰 Монетизація' },
    { value: 'communication', label: '💬 Комунікація' },
    { value: 'productivity', label: '✅ Продуктивність' },
  ]

  // Фільтрація модулів
  const filteredModules = useMemo(() => {
    return modules.filter((m: Module) => {
      if (filter === 'enabled' && !m.enabled) return false
      if (filter === 'premium' && !m.isPremium) return false
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false
      return true
    })
  }, [modules, filter, categoryFilter])

  // Тогл модулю
const toggleModule = async (moduleId: string, isLocked: boolean) => {
  await toggleModuleMutation({ moduleId, isLocked: !isLocked })
}
  const stats = {
    total: modules.length,
    enabled: modules.filter((m: Module) => m.enabled).length,
    premium: modules.filter((m: Module) => m.isPremium).length,
  }

  if (isLoading) return <p>Loading...</p>

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Модулі платформи</h1>
        <p className="text-gray-400">Керуй функціями Starway Studio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Settings className="text-blue-400" />} title="Всього модулів" value={stats.total} color="blue" />
        <StatCard icon={<Power className="text-green-400" />} title="Активних" value={stats.enabled} color="green" />
        <StatCard icon={<Crown className="text-orange-400" />} title="Premium" value={stats.premium} color="orange" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
          {(['all', 'enabled', 'premium'] as const).map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === f
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'Всі' : f === 'enabled' ? 'Активні' : 'Premium'}
            </Button>
          ))}
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ModuleCategory | 'all')}
          options={categories}
          className="min-w-[200px]"
        />
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.length > 0
          ? filteredModules.map((m: Module) => <ModuleCard key={m.id} module={m} onToggle={() => toggleModule(m.id, m.enabled)} />)
          : <EmptyState />}
      </div>
    </div>
  )
}

function StatCard({ icon, title, value, color }: { icon: JSX.Element; title: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${color}-500/10 rounded-xl flex items-center justify-center`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function ModuleCard({ module, onToggle }: { module: Module; onToggle: () => void }) {
  return (
    <div className={`
      bg-gray-900 border rounded-2xl p-6 transition-all duration-300
      ${module.enabled ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' : 'border-gray-800 hover:border-gray-700'}
    `}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{module.icon}</div>
          <div>
            <h3 className="font-bold text-lg">{module.name}</h3>
            {module.isPremium && <PremiumBadge />}
          </div>
        </div>
        <Button onClick={onToggle} className="p-2">
          {module.enabled ? <Power size={20} /> : <PowerOff size={20} />}
        </Button>
      </div>
      <p className="text-sm text-gray-400 mb-4">{module.description}</p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">v{module.version}</span>
        {module.dependencies?.length ? (
          <div className="flex items-center gap-1 text-gray-500">
            <AlertCircle size={14} /> <span>{module.dependencies.length} залежність</span>
          </div>
        ) : null}
        {module.enabled && (
          <div className="flex items-center gap-1 text-green-400">
            <Check size={14} /> <span>Активний</span>
          </div>
        )}
      </div>
    </div>
  )
}

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full mt-1">
      <Crown size={12} /> Premium
    </span>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20 col-span-full">
      <Filter size={48} className="text-gray-600 mx-auto mb-4" />
      <p className="text-gray-400">Модулів не знайдено</p>
    </div>
  )
}
