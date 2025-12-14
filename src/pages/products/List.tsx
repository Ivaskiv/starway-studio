// src/pages/products/List.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, Search, Filter, MoreVertical, 
  Edit, Trash2, Eye, Users, DollarSign,
  TrendingUp, Clock
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

interface Product {
  id: string
  name: string
  type: 'course' | 'practicum' | 'intensive'
  price: number
  students: number
  revenue: number
  status: 'active' | 'draft' | 'archived'
  createdAt: string
}

export default function ProductsList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'course' | 'practicum' | 'intensive'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'archived'>('all')

  // Mock data
  const products: Product[] = [
    {
      id: '1',
      name: 'Сила свідомості',
      type: 'course',
      price: 1200,
      students: 234,
      revenue: 280800,
      status: 'active',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'AI-воронки інтенсив',
      type: 'intensive',
      price: 2500,
      students: 189,
      revenue: 472500,
      status: 'active',
      createdAt: '2024-02-20'
    },
    {
      id: '3',
      name: '5 точок опори',
      type: 'practicum',
      price: 800,
      students: 156,
      revenue: 124800,
      status: 'active',
      createdAt: '2024-03-10'
    },
    {
      id: '4',
      name: 'Медитація для початківців',
      type: 'course',
      price: 500,
      students: 87,
      revenue: 43500,
      status: 'draft',
      createdAt: '2024-11-28'
    }
  ]

  const filteredProducts = products.filter(product => {
    if (filterType !== 'all' && product.type !== filterType) return false
    if (filterStatus !== 'all' && product.status !== filterStatus) return false
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    totalStudents: products.reduce((sum, p) => sum + p.students, 0),
    totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0)
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      course: 'Курс',
      practicum: 'Практикум',
      intensive: 'Інтенсив'
    }
    return labels[type as keyof typeof labels] || type
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
      active: 'Активний',
      draft: 'Чернетка',
      archived: 'Архів'
    }
    return labels[status as keyof typeof labels] || status
  }

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Продукти</h1>
          <p className="text-gray-400">Керуй своїми курсами та програмами</p>
        </div>

        <Link to="/admin/products/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus size={20} />
            Створити продукт
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Eye size={20} className="text-blue-400" />
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
              <p className="text-sm text-gray-400">Учнів</p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
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
            placeholder="Пошук продуктів..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
            {(['all', 'course', 'practicum', 'intensive'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filterType === type
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {type === 'all' && 'Всі'}
                {type === 'course' && 'Курси'}
                {type === 'practicum' && 'Практикуми'}
                {type === 'intensive' && 'Інтенсиви'}
              </button>
            ))}
          </div>

          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
            {(['all', 'active', 'draft'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filterStatus === status
                    ? 'bg-orange-500 text-white'
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
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-300 group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(product.status)} mb-2`}>
                  {getStatusLabel(product.status)}
                </span>
                <h3 className="font-bold text-lg group-hover:text-orange-400 transition">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {getTypeLabel(product.type)}
                </p>
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
                <p className="text-xs text-gray-400 mb-1">Ціна</p>
                <p className="font-bold text-orange-400">₴{product.price}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Учнів</p>
                <p className="font-bold">{product.students}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Дохід</p>
                <p className="font-bold text-green-400">₴{(product.revenue / 1000).toFixed(0)}k</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link to={`/admin/products/edit/${product.id}`} className="flex-1">
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

            {/* Created */}
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <Clock size={14} />
              <span>Створено {new Date(product.createdAt).toLocaleDateString('uk-UA')}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <Filter size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-6">Продуктів не знайдено</p>
          <Link to="/admin/products/new">
            <Button variant="primary">
              <Plus size={20} className="mr-2" />
              Створити перший продукт
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}