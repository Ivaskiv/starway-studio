// /Users/viravira/Documents/starway-studio/packages/frontend/src/pages/funnels/FunnelsPage.tsx
// packages/frontend/src/pages/dashboard/funnels/FunnelsPage.tsx

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Grid, List, Sparkles } from 'lucide-react';
import { Button, Input, Select } from '@/ui';
import { Funnel, getFunnelThemeConfig } from '@/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchFunnels, deleteFunnel } from '@/store/funnels/funnelsOperations';
import { 
  selectFunnels, 
  selectFunnelsLoading, 
  selectFunnelsError 
} from '@/store/funnels/funnelsSelectors';
import toast from 'react-hot-toast';

const FunnelsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // Redux state
  const funnels = useAppSelector(selectFunnels);
  const loading = useAppSelector(selectFunnelsLoading);
  const error = useAppSelector(selectFunnelsError);
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'paused'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    dispatch(fetchFunnels());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити воронку?')) return;

    try {
      await dispatch(deleteFunnel(id)).unwrap();
      toast.success('Воронку видалено');
    } catch (err) {
      console.error('Error deleting funnel:', err);
      toast.error('Помилка видалення');
    }
  };

  const filteredFunnels = funnels.filter(funnel => {
    const matchesSearch = funnel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         funnel.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || funnel.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Воронки</h1>
          <p className="text-slate-400 mt-1">
            {filteredFunnels.length} воронок
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/dashboard/ai-generator">
            <Button variant="ghost" size="md" className="glass-button">
              <Sparkles className="w-5 h-5 mr-2" />
              AI Генератор
            </Button>
          </Link>
          <Link to="/dashboard/funnels/new">
            <Button variant="primary" size="md" className="gradient-button">
              <Plus className="w-5 h-5 mr-2" />
              Нова воронка
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Пошук воронок..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <Select
              options={[
                { value: 'all', label: 'Всі' },
                { value: 'active', label: 'Активні' },
                { value: 'draft', label: 'Чернетки' },
                { value: 'paused', label: 'Призупинені' }
              ]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="glass-input min-w-[160px]"
            />
          </div>

          {/* View Mode */}
          <div className="flex items-center gap-2 glass-card bg-slate-800/50 p-1 rounded-xl">
            <Button
              onClick={() => setViewMode('grid')}
              variant="ghost"
              className={`p-2 rounded-lg transition ${
                viewMode === 'grid' 
                  ? 'bg-orange-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              variant="ghost"
              className={`p-2 rounded-lg transition ${
                viewMode === 'list' 
                  ? 'bg-orange-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Funnels Grid/List */}
      {filteredFunnels.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="icon-container-orange w-16 h-16 mx-auto mb-4">
            <Plus className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Немає воронок
          </h3>
          <p className="text-slate-400 mb-6">
            {searchQuery ? 'Спробуйте змінити пошуковий запит' : 'Створіть свою першу воронку'}
          </p>
          <Link to="/dashboard/funnels/new">
            <Button variant="primary" size="lg" className="gradient-button">
              <Plus className="w-5 h-5 mr-2" />
              Створити воронку
            </Button>
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFunnels.map((funnel) => (
            <FunnelCard
              key={funnel.id}
              funnel={funnel}
              onDelete={() => handleDelete(funnel.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFunnels.map((funnel) => (
            <FunnelListItem
              key={funnel.id}
              funnel={funnel}
              onDelete={() => handleDelete(funnel.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Funnel Card Component
const FunnelCard = ({ funnel, onDelete }: { funnel: Funnel; onDelete: () => void }) => {
  const navigate = useNavigate();
  const themeConfig = getFunnelThemeConfig(funnel.theme);

  const statusLabels = {
    active: 'Активна',
    draft: 'Чернетка',
    paused: 'Призупинена',
    archived: 'Архівована'
  };

  return (
    <div
      className="glass-card p-6 cursor-pointer hover:scale-105 transition-all group"
      onClick={() => navigate(`/dashboard/funnels/${funnel.id}/edit`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`${themeConfig.icon} w-12 h-12`}>
          <Sparkles className={`w-6 h-6 ${themeConfig.text}`} />
        </div>
        <span className={`badge badge-${funnel.theme}`}>
          {statusLabels[funnel.status]}
        </span>
      </div>

      {/* Content */}
      <h3 className="text-lg font-bold text-white mb-2 truncate">
        {funnel.name}
      </h3>
      <p className="text-sm text-slate-400 line-clamp-2 mb-4">
        {funnel.description || 'Немає опису'}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-t border-white/10">
        <div>
          <p className="text-xs text-slate-400">Кроків</p>
          <p className="text-lg font-bold text-white">{funnel.steps?.length || 0}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Користувачів</p>
          <p className="text-lg font-bold text-white">
            {funnel.analytics?.uniqueVisitors || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Конверсія</p>
          <p className="text-lg font-bold text-green-400">
            {funnel.analytics?.conversionRate?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <Button
          variant="primary"
          size="sm"
          className={themeConfig.gradient}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/dashboard/funnels/${funnel.id}/edit`);
          }}
        >
          Редагувати
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="glass-button text-red-400"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Видалити
        </Button>
      </div>
    </div>
  );
};

// Funnel List Item Component
const FunnelListItem = ({ funnel, onDelete }: { funnel: Funnel; onDelete: () => void }) => {
  const navigate = useNavigate();
  const themeConfig = getFunnelThemeConfig(funnel.theme);

  return (
    <div
      className="glass-card p-4 cursor-pointer hover:bg-slate-800/50 transition group"
      onClick={() => navigate(`/dashboard/funnels/${funnel.id}/edit`)}
    >
      <div className="flex items-center gap-4">
        <div className={`${themeConfig.icon} w-10 h-10 flex-shrink-0`}>
          <Sparkles className={`w-5 h-5 ${themeConfig.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{funnel.name}</h3>
          <p className="text-sm text-slate-400 truncate">
            {funnel.description || 'Немає опису'}
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-slate-400">Кроків</p>
            <p className="font-bold text-white">{funnel.steps?.length || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400">Користувачів</p>
            <p className="font-bold text-white">{funnel.analytics?.uniqueVisitors || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400">Конверсія</p>
            <p className="font-bold text-green-400">
              {funnel.analytics?.conversionRate?.toFixed(1) || 0}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="glass-button opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/dashboard/funnels/${funnel.id}/edit`);
            }}
          >
            Редагувати
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FunnelsPage;