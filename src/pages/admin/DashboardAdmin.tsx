// src/pages/admin/DashboardAdmin.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, TrendingUp, Zap, DollarSign, 
  Plus, ArrowUpRight, ArrowDownRight,
  Boxes, Workflow, BarChart3, Calendar,
  Clock, CheckCircle, AlertCircle
} from 'lucide-react'
import { Button } from '../../components/ui/Button'

export default function DashboardAdmin() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Mock data з реалістичними значеннями
  const stats = [
    {
      label: 'Активні учні',
      value: '2,543',
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      period: 'за місяць'
    },
    {
      label: 'Конверсія воронок',
      value: '23.8%',
      change: '+4.3%',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      period: 'середня'
    },
    {
      label: 'Активні воронки',
      value: '12',
      change: '+2 нові',
      trend: 'up',
      icon: Workflow,
      color: 'from-orange-500 to-pink-500',
      bgColor: 'bg-orange-500/10',
      period: 'запущено'
    },
    {
      label: 'Дохід місяця',
      value: '₴45,230',
      change: '+18.2%',
      trend: 'up',
      icon: DollarSign,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      period: 'грудень'
    }
  ]

  const quickActions = [
    {
      title: 'Новий продукт',
      description: 'Створити курс або практикум',
      href: '/admin/products/new',
      icon: Boxes,
      color: 'from-blue-500 to-cyan-500',
      badge: null
    },
    {
      title: 'Конструктор воронок',
      description: 'Автоматизація та продажі',
      href: '/admin/funnels',
      icon: Workflow,
      color: 'from-orange-500 to-pink-500',
      badge: 'Популярне'
    },
    {
      title: 'Аналітика',
      description: 'Детальна статистика',
      href: '/admin/analytics',
      icon: BarChart3,
      color: 'from-green-500 to-emerald-500',
      badge: null
    }
  ]

  const recentActivity = [
    { 
      user: 'Марія Коваленко', 
      action: 'Придбала "Сила свідомості"', 
      time: '5 хв тому',
      type: 'purchase',
      amount: '₴1,200'
    },
    { 
      user: 'Олексій Петренко', 
      action: 'Завершив Урок 3 "Медитація"', 
      time: '12 хв тому',
      type: 'progress',
      amount: null
    },
    { 
      user: 'Ірина Мельник', 
      action: 'Зареєструвалась на платформі', 
      time: '25 хв тому',
      type: 'signup',
      amount: null
    },
    { 
      user: 'Андрій Сидоренко', 
      action: 'Залишив відгук ⭐⭐⭐⭐⭐', 
      time: '1 год тому',
      type: 'review',
      amount: null
    },
    { 
      user: 'Наталія Бондар', 
      action: 'Оплатила "AI-воронки"', 
      time: '2 год тому',
      type: 'purchase',
      amount: '₴2,500'
    }
  ]

  const topProducts = [
    { 
      name: 'Сила свідомості', 
      students: 234, 
      revenue: '₴127,450',
      completion: 78,
      trend: 'up'
    },
    { 
      name: 'AI-воронки інтенсив', 
      students: 189, 
      revenue: '₴94,500',
      completion: 85,
      trend: 'up'
    },
    { 
      name: '5 точок опори', 
      students: 156, 
      revenue: '₴78,000',
      completion: 62,
      trend: 'neutral'
    }
  ]

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('uk-UA', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('uk-UA', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'purchase': return <DollarSign size={16} className="text-green-400" />
      case 'progress': return <CheckCircle size={16} className="text-blue-400" />
      case 'signup': return <Users size={16} className="text-purple-400" />
      case 'review': return <AlertCircle size={16} className="text-orange-400" />
      default: return <Clock size={16} className="text-gray-400" />
    }
  }

  return (
    <div className="space-y-8 pb-20">
      
      {/* Header з часом */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Вітаю! 👋
          </h1>
          <div className="flex items-center gap-4 text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span className="text-sm">{formatDate(currentTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span className="text-sm font-mono">{formatTime(currentTime)}</span>
            </div>
          </div>
        </div>

        <Link to="/admin/products/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus size={20} />
            Створити продукт
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isPositive = stat.trend === 'up'
          
          return (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} bg-gradient-to-br ${stat.color} group-hover:scale-110 transition-transform`}>
                  <Icon size={24} className="text-white" />
                </div>
                
                <div className={`flex items-center gap-1 text-sm font-medium ${
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
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.period}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Швидкі дії</h2>
          <Zap size={20} className="text-orange-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon
            
            return (
              <Link
                key={action.title}
                to={action.href}
                className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-orange-500/50 hover:scale-105 transition-all duration-300 group overflow-hidden"
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                
                {/* Badge */}
                {action.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
                      {action.badge}
                    </span>
                  </div>
                )}
                
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 group-hover:text-orange-400 transition">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">{action.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-orange-400 font-medium">
                    <span>Відкрити</span>
                    <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Activity */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Остання активність</h2>
            <Link 
              to="/admin/analytics"
              className="text-sm text-orange-400 hover:text-orange-300 transition flex items-center gap-1"
            >
              Всі події
              <ArrowUpRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition group"
              >
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-orange-400 transition">
                    {activity.user}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {activity.action}
                  </p>
                  {activity.amount && (
                    <p className="text-sm text-green-400 font-medium mt-1">
                      {activity.amount}
                    </p>
                  )}
                </div>
                
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Топ продукти</h2>
            <Link 
              to="/admin/products"
              className="text-sm text-orange-400 hover:text-orange-300 transition flex items-center gap-1"
            >
              Всі продукти
              <ArrowUpRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div 
                key={product.name}
                className="p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium group-hover:text-orange-400 transition">
                      {product.name}
                    </span>
                  </div>
                  
                  {product.trend === 'up' && (
                    <TrendingUp size={16} className="text-green-400" />
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Учнів</p>
                    <p className="font-bold">{product.students}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Дохід</p>
                    <p className="font-bold text-green-400">{product.revenue}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Завершення</p>
                    <p className="font-bold text-blue-400">{product.completion}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Link
        to="/admin/funnels"
        className="fixed bottom-8 right-8 z-40 group"
      >
        <Button
          variant="primary"
          className="w-16 h-16 rounded-full shadow-2xl hover:shadow-orange-500/50 p-0 group-hover:scale-110 transition-all"
          aria-label="Відкрити конструктор воронок"
        >
          <Workflow size={28} />
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Конструктор воронок
          <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      </Link>
    </div>
  )
}