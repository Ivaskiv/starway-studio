// packages/frontend/src/features/integrations/services/integrations.api.ts
import { useGetMeQuery } from '@/features/auth/services/auth.api';
import { useGetFunnelsQuery } from '@/features/funnels/services/funnels.api';
import { useGetDashboardStatsQuery } from '@/services/stats.api';
import { Button, GlassCard } from '@/ui';
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  DollarSign,
  Loader,
  TrendingUp,
  Users,
  Workflow,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardAdmin() {
  const { data: userData } = useGetMeQuery();
  
  // ✅ Виправлено: destructure правильно
  const { 
    data: funnelsData, 
    isLoading: funnelsLoading,
    isError: funnelsError 
  } = useGetFunnelsQuery();
  
  const { 
    data: statsData, 
    isLoading: statsLoading 
  } = useGetDashboardStatsQuery({ period: '30d' });
  
  const user = userData?.user;
  
  // ✅ Безпечна обробка даних
  const funnels = Array.isArray(funnelsData) ? funnelsData : [];
  const loading = funnelsLoading || statsLoading;

  const stats = {
    totalFunnels: statsData?.totalFunnels ?? funnels.length,
    activeFunnels: statsData?.activeFunnels ?? funnels.filter(f => f.status === 'active').length,
    totalUsers: statsData?.totalUsers ?? 0,
    totalRevenue: statsData?.totalRevenue ?? 0,
    conversionRate: statsData?.conversionRate ?? 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <GlassCard className="p-12" data-blur="xl">
          <Loader className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-white/60">Завантаження статистики...</p>
        </GlassCard>
      </div>
    );
  }

  // ✅ Обробка помилки завантаження
  if (funnelsError) {
    return (
      <div className="flex items-center justify-center h-96">
        <GlassCard className="p-12 text-center" data-blur="xl">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-white mb-2">Помилка завантаження даних</p>
          <p className="text-slate-400 text-sm">Спробуйте оновити сторінку</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-20 animate-fade-in">
      
      {/* Quick Action Button */}
      <div className="flex justify-end">
        {/* <Link to="/dashboard/ai-generator">
          <Button data-color="orange" data-size="lg" className="group">
            <Plus className="w-5 h-5 mr-2" />
            Створити воронку
          </Button>
        </Link> */}
{/* ✅ AI Generator Button - зі стилізацією floating button */}
        <Link to="/dashboard/ai-generator" className="group hidden md:block">
          <div className="relative">
            <Button className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 shadow-2xl hover:shadow-orange-500/50 group-hover:scale-110 transition-all flex items-center justify-center p-0">
              <Workflow size={24} className="text-white md:w-7 md:h-7" />
            </Button>
            
            {/* Tooltip */}
            <GlassCard className="absolute bottom-full right-0 mb-2 px-3 py-2 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              AI Генератор
            </GlassCard>
          </div>
        </Link>        

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <GlassCard className="p-4 md:p-6 group" data-hover="lift">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-xs md:text-sm font-medium text-green-400">
              <ArrowUpRight size={14} />
              <span>+12.5%</span>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mb-1">Всього воронок</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalFunnels}</p>
          <p className="text-xs text-slate-500 mt-1">за місяць</p>
        </GlassCard>

        <GlassCard className="p-4 md:p-6 group" data-hover="lift">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-xs md:text-sm font-medium text-green-400">
              <ArrowUpRight size={14} />
              <span>+4.3%</span>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mb-1">Конверсія</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.conversionRate}%</p>
          <p className="text-xs text-slate-500 mt-1">середня</p>
        </GlassCard>

        <GlassCard className="p-4 md:p-6 group" data-hover="lift">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-xs md:text-sm font-medium text-green-400">
              <ArrowUpRight size={14} />
              <span>+18%</span>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mb-1">Активні учні</p>
          <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalUsers.toLocaleString('uk-UA')}</p>
          <p className="text-xs text-slate-500 mt-1">зареєстровані</p>
        </GlassCard>

        <GlassCard className="p-4 md:p-6 group" data-hover="lift">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex items-center gap-1 text-xs md:text-sm font-medium text-green-400">
              <ArrowUpRight size={14} />
              <span>+18.2%</span>
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mb-1">Дохід місяця</p>
          <p className="text-2xl md:text-3xl font-bold text-white">₴{stats.totalRevenue.toLocaleString('uk-UA')}</p>
          <p className="text-xs text-slate-500 mt-1">січень</p>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white">Швидкі дії</h2>
          <Zap size={20} className="text-orange-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Link to="/dashboard/products/new">
            <GlassCard className="p-5 md:p-6 group relative overflow-hidden" data-hover="lift">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Boxes size={20} className="text-white md:w-6 md:h-6" />
                </div>
                
                <h3 className="text-base md:text-lg font-bold mb-2 text-white group-hover:text-orange-400 transition">
                  Новий продукт
                </h3>
                <p className="text-xs md:text-sm text-slate-400 mb-3 md:mb-4">Створити курс або практикум</p>
                
                <div className="flex items-center gap-2 text-xs md:text-sm text-orange-400 font-medium">
                  <span>Відкрити</span>
                  <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            </GlassCard>
          </Link>

          <Link to="/dashboard/funnels">
            <GlassCard className="p-5 md:p-6 group relative overflow-hidden" data-hover="lift">
              <div className="absolute top-3 right-3 md:top-4 md:right-4">
                <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full font-medium">Популярне</span>
              </div>

              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Workflow size={20} className="text-white md:w-6 md:h-6" />
                </div>
                
                <h3 className="text-base md:text-lg font-bold mb-2 text-white group-hover:text-orange-400 transition">
                  Конструктор воронок
                </h3>
                <p className="text-xs md:text-sm text-slate-400 mb-3 md:mb-4">Автоматизація та продажі</p>
                
                <div className="flex items-center gap-2 text-xs md:text-sm text-orange-400 font-medium">
                  <span>Відкрити</span>
                  <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            </GlassCard>
          </Link>

          <Link to="/dashboard/analytics">
            <GlassCard className="p-5 md:p-6 group relative overflow-hidden" data-hover="lift">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <BarChart3 size={20} className="text-white md:w-6 md:h-6" />
                </div>
                
                <h3 className="text-base md:text-lg font-bold mb-2 text-white group-hover:text-orange-400 transition">
                  Аналітика
                </h3>
                <p className="text-xs md:text-sm text-slate-400 mb-3 md:mb-4">Детальна статистика</p>
                
                <div className="flex items-center gap-2 text-xs md:text-sm text-orange-400 font-medium">
                  <span>Відкрити</span>
                  <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            </GlassCard>
          </Link>
        </div>
      </div>

    </div>
  );
}