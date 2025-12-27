// packages/frontend/src/pages/funnel/FunnelListPage.tsx

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, Search, Filter, MoreVertical, 
  Edit, Trash2, Eye, Users, DollarSign,
  TrendingUp, Zap, Workflow
} from 'lucide-react'
import { Button, Input } from '@starway-studio/shared'

interface Funnel {
  id: string
  name: string
  slug: string
  description?: string
  status: 'active' | 'draft' | 'archived'
  conversions: number
  visitors: number
  revenue: number
  createdAt: string
}

export default function FunnelListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'archived'>('all')

  // Mock data
  const funnels: Funnel[] = [
    {
      id: '1',
      name: 'Воронка "Сила свідомості"',
      slug: 'syla-svidomosti',
      description: 'Основна воронка для курсу трансформації',
      status: 'active',
      conversions: 156,
      visitors: 2340,
      revenue: 187200,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'AI-воронки інтенсив',
      slug: 'ai-voronky',
      description: 'Продаж інтенсиву по створенню воронок',
      status: 'active',
      conversions: 89,
      visitors: 1450,
      revenue: 222500,
      createdAt: '2024-02-20'
    },
    {
      id: '3',
      name: 'Тестова воронка',
      slug: 'test-funnel',
      status: 'draft',
      conversions: 0,
      visitors: 0,
      revenue: 0,
      createdAt: '2024-11-28'
    }
  ]

  const filteredFunnels = funnels.filter(funnel => {
    if (filterStatus !== 'all' && funnel.status !== filterStatus) return false
    if (searchQuery && !funnel.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const stats = {
    total: funnels.length,
    active: funnels.filter(f => f.status === 'active').length,
    totalConversions: funnels.reduce((sum, f) => sum + f.conversions, 0),
    totalRevenue: funnels.reduce((sum, f) => sum + f.revenue, 0)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-500/10 text-green-400 border-green-500/20',
      draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      archived: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
    return colors[status as keyof typeof colors] || colors.draft
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      active: 'Активна',
      draft: 'Чернетка',
      archived: 'Архів'
    }
    return labels[status as keyof typeof labels] || status
  }

  const calculateConversionRate = (conversions: number, visitors: number) => {
    if (visitors === 0) return 0
    return ((conversions / visitors) * 100).toFixed(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Workflow className="w-8 h-8 text-purple-500" />
              <h1 className="text-3xl font-bold">Мої воронки</h1>
            </div>
            <p className="text-gray-400">Керуй своїми продажовими воронками</p>
          </div>

          <Link to="/admin/funnels/create">
            <Button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
              <Plus size={20} />
              Створити воронку
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Zap size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Всього</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Активних</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Конверсій</p>
                <p className="text-2xl font-bold">{stats.totalConversions}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <DollarSign size={20} className="text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Дохід</p>
                <p className="text-2xl font-bold">₴{stats.totalRevenue.toLocaleString()}</p>
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
              className="pl-12 bg-gray-900 border-gray-800"
            />
          </div>

          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
            {(['all', 'active', 'draft'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filterStatus === status
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {status === 'all' && 'Всі'}
                {status === 'active' && 'Активні'}
                {status === 'draft' && 'Чернетки'}
              </button>
            ))}
          </div>
        </div>

        {/* Funnels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFunnels.map((funnel) => (
            <div
              key={funnel.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(funnel.status)} mb-2`}>
                    {getStatusLabel(funnel.status)}
                  </span>
                  <h3 className="font-bold text-lg group-hover:text-purple-400 transition">
                    {funnel.name}
                  </h3>
                  {funnel.description && (
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {funnel.description}
                    </p>
                  )}
                </div>
                
                <button 
                  className="p-2 hover:bg-gray-800 rounded-lg transition"
                  aria-label="Більше опцій"
                >
                  <MoreVertical size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-y border-gray-800">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Конверсія</p>
                  <p className="font-bold text-purple-400">
                    {calculateConversionRate(funnel.conversions, funnel.visitors)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Відвідувачів</p>
                  <p className="font-bold">{funnel.visitors}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Дохід</p>
                  <p className="font-bold text-green-400">
                    ₴{(funnel.revenue / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Link to={`/admin/funnels/edit/${funnel.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                    <Edit size={16} />
                    Редагувати
                  </Button>
                </Link>
                
                <Button 
                  variant="ghost" 
                  className="p-2"
                  aria-label="Видалити"
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              {/* Slug */}
              <div className="mt-4 text-xs text-gray-500">
                <code className="bg-gray-800 px-2 py-1 rounded">/{funnel.slug}</code>
              </div>
            </div>
          ))}
        </div>

        {filteredFunnels.length === 0 && (
          <div className="text-center py-20">
            <Workflow size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">Воронок не знайдено</p>
            <Link to="/admin/funnels/create">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus size={20} className="mr-2" />
                Створити першу воронку
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}