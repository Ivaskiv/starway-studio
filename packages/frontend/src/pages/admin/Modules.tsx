// src/pages/admin/Modules.tsx
import { useState } from 'react'
import { moduleManager } from '../../lib/moduleManager'
import { Module, ModuleId } from '../../types/modules'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { 
  Power, PowerOff, Settings, Crown, 
  Check, AlertCircle, Filter
} from 'lucide-react'

export default function Modules() {
  const [modules, setModules] = useState<Module[]>(() => 
    moduleManager.getAllModules()
  )
  const [filter, setFilter] = useState<'all' | 'enabled' | 'premium'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const categories = [
    { value: 'all', label: 'Всі категорії' },
    { value: 'ai', label: '🤖 AI' },
    { value: 'automation', label: '⚡ Автоматизація' },
    { value: 'content', label: '📚 Контент' },
    { value: 'analytics', label: '📊 Аналітика' },
    { value: 'monetization', label: '💰 Монетизація' },
    { value: 'communication', label: '💬 Комунікація' },
    { value: 'productivity', label: '✅ Продуктивність' }
  ]

  const filteredModules = modules.filter(module => {
    if (filter === 'enabled' && !module.enabled) return false
    if (filter === 'premium' && !module.isPremium) return false
    if (categoryFilter !== 'all' && module.category !== categoryFilter) return false
    return true
  })

  const toggleModule = (id: ModuleId) => {
    const module = moduleManager.getModule(id)
    if (!module) return

    module.enabled
      ? moduleManager.disableModule(id)
      : moduleManager.enableModule(id)

    setModules(moduleManager.getAllModules())
  }

  const stats = {
    total: modules.length,
    enabled: modules.filter(m => m.enabled).length,
    premium: modules.filter(m => m.isPremium).length
  }

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Модулі платформи</h1>
        <p className="text-gray-400">Керуй функціями Starway Studio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Settings size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Всього модулів</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <Power size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Активних</p>
              <p className="text-3xl font-bold">{stats.enabled}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
              <Crown size={24} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Premium</p>
              <p className="text-3xl font-bold">{stats.premium}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
          {(['all', 'enabled', 'premium'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === f
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'all' && 'Всі'}
              {f === 'enabled' && 'Активні'}
              {f === 'premium' && 'Premium'}
            </button>
          ))}
        </div>

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={categories}
          className="min-w-[200px]"
        />
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module) => (
          <ModuleCard 
            key={module.id} 
            module={module}
            onToggle={() => toggleModule(module.id)}
          />
        ))}
      </div>

      {filteredModules.length === 0 && (
        <div className="text-center py-20">
          <Filter size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Модулів не знайдено</p>
        </div>
      )}
    </div>
  )
}

function ModuleCard({ 
  module, 
  onToggle 
}: { 
  module: Module
  onToggle: () => void
}) {
  return (
    <div className={`
      bg-gray-900 border rounded-2xl p-6 transition-all duration-300
      ${module.enabled 
        ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' 
        : 'border-gray-800 hover:border-gray-700'
      }
    `}>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{module.icon}</div>
          <div>
            <h3 className="font-bold text-lg">{module.name}</h3>
            {module.isPremium && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full mt-1">
                <Crown size={12} />
                Premium
              </span>
            )}
          </div>
        </div>
        
        <Button
          onClick={onToggle}
          variant={module.enabled ? 'success' : 'secondary'}
          className="p-2"
          aria-label={module.enabled ? 'Вимкнути модуль' : 'Увімкнути модуль'}
        >
          {module.enabled ? <Power size={20} /> : <PowerOff size={20} />}
        </Button>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 mb-4">
        {module.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">v{module.version}</span>
        
        {module.dependencies && module.dependencies.length > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <AlertCircle size={14} />
            <span>{module.dependencies.length} залежність</span>
          </div>
        )}
        
        {module.enabled && (
          <div className="flex items-center gap-1 text-green-400">
            <Check size={14} />
            <span>Активний</span>
          </div>
        )}
      </div>
    </div>
  )
}