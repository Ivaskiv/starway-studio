// /Users/viravira/Documents/starway-studio/packages/frontend/src/pages/admin/WhiteLabel.tsx
// src/pages/admin/FunnelManager.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@starway-studio/shared/ui/Button.js'
import { Input } from '@starway-studio/shared/ui/Input.js'
import { Select } from '@starway-studio/shared/ui/Select.js'
import { 
  Plus, Search, MoreVertical, Play, Pause,
  Copy, Trash2, Eye, TrendingUp, Users,
  DollarSign, Target, Archive, Star
} from 'lucide-react'

interface Funnel {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft' | 'archived'
  type: 'evergreen' | 'campaign' | 'webinar'
  stages: number
  visitors: number
  conversions: number
  revenue: number
  conversionRate: number
  createdAt: string
  isFavorite: boolean
}

export default function FunnelManager() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const [funnels, setFunnels] = useState<Funnel[]>([
    {
      id: '1',
      name: 'Сила свідомості - основна',
      status: 'active',
      type: 'evergreen',
      stages: 5,
      visitors: 2847,
      conversions: 623,
      revenue: 747600,
      conversionRate: 21.9,
      createdAt: '2024-01-15',
      isFavorite: true
    },
    {
      id: '2',
      name: 'AI-воронки інтенсив',
      status: 'active',
      type: 'campaign',
      stages: 4,
      visitors: 1923,
      conversions: 412,
      revenue: 1030000,
      conversionRate: 21.4,
      createdAt: '2024-02-20',
      isFavorite: true
    },
    {
      id: '3',
      name: '5 точок опори',
      status: 'active',
      type: 'evergreen',
      stages: 3,
      visitors: 1456,
      conversions: 287,
      revenue: 229600,
      conversionRate: 19.7,
      createdAt: '2024-03-10',
      isFavorite: false
    },
    {
      id: '4',
      name: 'Вебінар "Telegram автоматизація"',
      status: 'paused',
      type: 'webinar',
      stages: 2,
      visitors: 847,
      conversions: 123,
      revenue: 246000,
      conversionRate: 14.5,
      createdAt: '2024-11-01',
      isFavorite: false
    }
  ])

  const statusOptions = [
    { value: 'all', label: 'Всі статуси' },
    { value: 'active', label: 'Активні' },
    { value: 'paused', label: 'Призупинені' },
    { value: 'draft', label: 'Чернетки' },
    { value: 'archived', label: 'Архівовані' }
  ]

  const typeOptions = [
    { value: 'all', label: 'Всі типи' },
    { value: 'evergreen', label: 'Evergreen' },
    { value: 'campaign', label: 'Campaign' },
    { value: 'webinar', label: 'Webinar' }
  ]

  const filteredFunnels = funnels.filter(funnel => {
    if (statusFilter !== 'all' && funnel.status !== statusFilter) return false
    if (typeFilter !== 'all' && funnel.type !== typeFilter) return false
    if (searchQuery && !funnel.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const toggleFavorite = (id: string) => {
    setFunnels(funnels.map(f => 
      f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
    ))
  }

  const duplicateFunnel = (id: string) => {
    const funnel = funnels.find(f => f.id === id)
    if (!funnel) return

    const newFunnel: Funnel = {
      ...funnel,
      id: `${Date.now()}`,
      name: `${funnel.name} (копія)`,
      status: 'draft',
      visitors: 0,
      conversions: 0,
      revenue: 0,
      conversionRate: 0
    }
    setFunnels([...funnels, newFunnel])
  }

  const deleteFunnel = (id: string) => {
    if (confirm('Видалити цю воронку?')) {
      setFunnels(funnels.filter(f => f.id !== id))
    }
  }

  const stats = {
    total: funnels.length,
    active: funnels.filter(f => f.status === 'active').length,
    totalRevenue: funnels.reduce((sum, f) => sum + f.revenue, 0),
    avgConversion: funnels.length > 0 
      ? funnels.reduce((sum, f) => sum + f.conversionRate, 0) / funnels.length 
      : 0
  }

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Воронки</h1>
          <p className="text-gray-400">Керуй всіма воронками в одному місці</p>
        </div>

        <Link to="/admin/funnels/generate">
          <Button variant="primary">
            <Plus size={20} />
            Створити воронку
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <Target size={20} className="text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Всього воронок</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <Play size={20} className="text-green-400" />
            <div>
              <p className="text-sm text-gray-400">Активних</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <DollarSign size={20} className="text-orange-400" />
            <div>
              <p className="text-sm text-gray-400">Загальний дохід</p>
              <p className="text-2xl font-bold">₴{(stats.totalRevenue / 1000).toFixed(0)}k</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-purple-400" />
            <div>
              <p className="text-sm text-gray-400">Сер. конверсія</p>
              <p className="text-2xl font-bold">{stats.avgConversion.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Пошук воронок..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>

        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        />

        <Select
          options={typeOptions}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {/* Funnels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredFunnels.map((funnel) => (
          <div
            key={funnel.id}
            className={`
              bg-gray-900 border rounded-2xl p-6 transition-all hover:border-gray-700
              ${funnel.status === 'active' ? 'border-green-500/20' : 'border-gray-800'}
            `}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">{funnel.name}</h3>
                  <Button
                    variant="ghost"
                    onClick={() => toggleFavorite(funnel.id)}
                    className="p-1"
                    aria-label={funnel.isFavorite ? 'Видалити з обраного' : 'Додати в обране'}
                  >
                    <Star 
                      size={16} 
                      className={funnel.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                    />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${funnel.status === 'active' ? 'bg-green-500/10 text-green-400' :
                      funnel.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' :
                      funnel.status === 'draft' ? 'bg-gray-500/10 text-gray-400' :
                      'bg-blue-500/10 text-blue-400'
                    }
                  `}>
                    {funnel.status === 'active' ? 'Активна' :
                     funnel.status === 'paused' ? 'Призупинена' :
                     funnel.status === 'draft' ? 'Чернетка' :
                     'Архівована'
                    }
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400 capitalize">{funnel.type}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{funnel.stages} етапів</span>
                </div>
              </div>

              <div className="relative group">
                <Button variant="ghost" className="p-2" aria-label="Більше опцій">
                  <MoreVertical size={20} />
                </Button>
                
                {/* Dropdown menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10">
                  <Link 
                    to={`/admin/funnels/blueprint?id=${funnel.id}`}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-gray-700 text-sm rounded-t-xl"
                  >
                    <Eye size={16} />
                    Переглянути
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => duplicateFunnel(funnel.id)}
                    className="flex items-center gap-2 px-4 py-3 text-sm w-full justify-start"
                  >
                    <Copy size={16} />
                    Дублювати
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => deleteFunnel(funnel.id)}
                    className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 w-full justify-start rounded-b-xl"
                  >
                    <Trash2 size={16} />
                    Видалити
                  </Button>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-800">
              <div>
                <p className="text-xs text-gray-400 mb-1">Visitors</p>
                <p className="font-bold">{funnel.visitors.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Conversions</p>
                <p className="font-bold">{funnel.conversions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Rate</p>
                <p className="font-bold text-orange-400">{funnel.conversionRate}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Revenue</p>
                <p className="font-bold text-green-400">₴{(funnel.revenue / 1000).toFixed(0)}k</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link to={`/admin/analytics?funnel=${funnel.id}`} className="flex-1">
                <Button variant="secondary" className="w-full">
                  <TrendingUp size={16} />
                  Аналітика
                </Button>
              </Link>
              
              <Link to={`/admin/funnels/blueprint?id=${funnel.id}`} className="flex-1">
                <Button variant="primary" className="w-full">
                  Редагувати
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredFunnels.length === 0 && (
        <div className="text-center py-20">
          <Target size={64} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-6">Воронок не знайдено</p>
          <Link to="/admin/funnels/generate">
            <Button variant="primary">
              <Plus size={20} />
              Створити першу воронку
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}