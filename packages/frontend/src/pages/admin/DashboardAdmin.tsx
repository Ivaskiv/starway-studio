// packages/frontend/src/pages/dashboard/DashboardAdmin.tsx

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@frontend/store/hooks';
import { selectUser } from '@frontend/store/auth/authSelectors';
import { 
  Plus, Zap, Users, TrendingUp, DollarSign, ArrowUpRight,
  Boxes, Workflow, BarChart3, Calendar, Clock, 
  CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@starway/shared/ui';

interface Stats {
  totalFunnels: number;
  activeFunnels: number;
  totalUsers: number;
  totalRevenue: number;
  conversionRate: number;
}

interface Activity {
  user: string;
  action: string;
  time: string;
  type: 'purchase' | 'progress' | 'signup' | 'review';
  amount?: string;
}

interface TopProduct {
  name: string;
  students: number;
  revenue: string;
  completion: number;
  trend: 'up' | 'neutral' | 'down';
}

export default function DashboardAdmin() {
  const user = useAppSelector(selectUser);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState<Stats>({
    totalFunnels: 0,
    activeFunnels: 0,
    totalUsers: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data
  useEffect(() => {
    setTimeout(() => {
      setStats({
        totalFunnels: 12,
        activeFunnels: 8,
        totalUsers: 2543,
        totalRevenue: 45230,
        conversionRate: 23.8,
      });

      setRecentActivity([
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
        },
        { 
          user: 'Ірина Мельник', 
          action: 'Зареєструвалась на платформі', 
          time: '25 хв тому',
          type: 'signup',
        },
        { 
          user: 'Андрій Сидоренко', 
          action: 'Залишив відгук ⭐⭐⭐⭐⭐', 
          time: '1 год тому',
          type: 'review',
        },
        { 
          user: 'Наталія Бондар', 
          action: 'Оплатила "AI-воронки"', 
          time: '2 год тому',
          type: 'purchase',
          amount: '₴2,500'
        }
      ]);

      setTopProducts([
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
      ]);

      setLoading(false);
    }, 500);
  }, []);

  // const formatTime = (date: Date) => {
  //   return date.toLocaleTimeString('uk-UA', { 
  //     hour: '2-digit', 
  //     minute: '2-digit',
  //     second: '2-digit'
  //   });
  // };

  // const formatDate = (date: Date) => {
  //   return date.toLocaleDateString('uk-UA', { 
  //     weekday: 'long',
  //     day: 'numeric',
  //     month: 'long',
  //     year: 'numeric'
  //   });
  // };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'purchase': return <DollarSign size={16} className="text-green-400" />;
      case 'progress': return <CheckCircle size={16} className="text-blue-400" />;
      case 'signup': return <Users size={16} className="text-purple-400" />;
      case 'review': return <AlertCircle size={16} className="text-orange-400" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      
      {/* Header з часом */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* <h1 className="text-3xl font-bold text-white mb-2">
            Вітаємо, {user?.firstName}! 👋
          </h1> */}
          {/* <div className="flex items-center gap-4 text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span className="text-sm">{formatDate(currentTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span className="text-sm font-mono">{formatTime(currentTime)}</span>
            </div>
          </div> */}
        </div>

        <Link to="/dashboard/funnels/new">
          <Button variant="primary" size="lg" className="gradient-button">
            <Plus className="w-5 h-5 mr-2" />
            Створити воронку
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center justify-between mb-4">
            <div className="icon-container-orange">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-400">
              <ArrowUpRight size={16} />
              <span>+12.5%</span>
            </div>
          </div>
          <p className="stats-card-label">Всього воронок</p>
          <p className="stats-card-value">{stats.totalFunnels}</p>
          <p className="text-xs text-slate-500 mt-1">за місяць</p>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between mb-4">
            <div className="icon-container-green">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-400">
              <ArrowUpRight size={16} />
              <span>+4.3%</span>
            </div>
          </div>
          <p className="stats-card-label">Конверсія</p>
          <p className="stats-card-value">{stats.conversionRate}%</p>
          <p className="text-xs text-slate-500 mt-1">середня</p>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between mb-4">
            <div className="icon-container-blue">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-400">
              <ArrowUpRight size={16} />
              <span>+18%</span>
            </div>
          </div>
          <p className="stats-card-label">Активні учні</p>
          <p className="stats-card-value">{stats.totalUsers.toLocaleString('uk-UA')}</p>
          <p className="text-xs text-slate-500 mt-1">зареєстровані</p>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between mb-4">
            <div className="icon-container-green">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-green-400">
              <ArrowUpRight size={16} />
              <span>+18.2%</span>
            </div>
          </div>
          <p className="stats-card-label">Дохід місяця</p>
          <p className="stats-card-value">₴{stats.totalRevenue.toLocaleString('uk-UA')}</p>
          <p className="text-xs text-slate-500 mt-1">грудень</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Швидкі дії</h2>
          <Zap size={20} className="text-orange-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/dashboard/products/new"
            className="glass-card p-6 hover:scale-105 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-blue opacity-0 group-hover:opacity-5 transition-opacity" />
            
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-blue flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <Boxes size={24} className="text-white" />
              </div>
              
              <h3 className="text-lg font-bold mb-2 text-white group-hover:text-orange-400 transition">
                Новий продукт
              </h3>
              <p className="text-sm text-slate-400 mb-4">Створити курс або практикум</p>
              
              <div className="flex items-center gap-2 text-sm text-orange-400 font-medium">
                <span>Відкрити</span>
                <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link
            to="/dashboard/funnels"
            className="glass-card p-6 hover:scale-105 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-4 right-4">
              <span className="badge-orange">Популярне</span>
            </div>

            <div className="absolute inset-0 bg-gradient-orange opacity-0 group-hover:opacity-5 transition-opacity" />
            
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-orange flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <Workflow size={24} className="text-white" />
              </div>
              
              <h3 className="text-lg font-bold mb-2 text-white group-hover:text-orange-400 transition">
                Конструктор воронок
              </h3>
              <p className="text-sm text-slate-400 mb-4">Автоматизація та продажі</p>
              
              <div className="flex items-center gap-2 text-sm text-orange-400 font-medium">
                <span>Відкрити</span>
                <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>

          <Link
            to="/dashboard/analytics"
            className="glass-card p-6 hover:scale-105 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-green opacity-0 group-hover:opacity-5 transition-opacity" />
            
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-green flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <BarChart3 size={24} className="text-white" />
              </div>
              
              <h3 className="text-lg font-bold mb-2 text-white group-hover:text-orange-400 transition">
                Аналітика
              </h3>
              <p className="text-sm text-slate-400 mb-4">Детальна статистика</p>
              
              <div className="flex items-center gap-2 text-sm text-orange-400 font-medium">
                <span>Відкрити</span>
                <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Activity */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Остання активність</h2>
            <Link 
              to="/dashboard/analytics"
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
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition group"
              >
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate group-hover:text-orange-400 transition">
                    {activity.user}
                  </p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {activity.action}
                  </p>
                  {activity.amount && (
                    <p className="text-sm text-green-400 font-medium mt-1">
                      {activity.amount}
                    </p>
                  )}
                </div>
                
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Топ продукти</h2>
            <Link 
              to="/dashboard/products"
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
                className="p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-orange rounded-lg flex items-center justify-center text-sm font-bold shadow-lg">
                      {index + 1}
                    </div>
                    <span className="font-medium text-white group-hover:text-orange-400 transition">
                      {product.name}
                    </span>
                  </div>
                  
                  {product.trend === 'up' && (
                    <TrendingUp size={16} className="text-green-400" />
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Учнів</p>
                    <p className="font-bold text-white">{product.students}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Дохід</p>
                    <p className="font-bold text-green-400">{product.revenue}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Завершення</p>
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
        to="/dashboard/funnels"
        className="fixed bottom-8 right-8 z-40 group"
      >
        <Button className="w-16 h-16 rounded-full gradient-button shadow-2xl hover:shadow-orange-500/50 group-hover:scale-110 transition-all flex items-center justify-center">
          <Workflow size={28} />
        </Button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 glass-card text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Конструктор воронок
          <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-700" />
        </div>
      </Link>
    </div>
  );
}