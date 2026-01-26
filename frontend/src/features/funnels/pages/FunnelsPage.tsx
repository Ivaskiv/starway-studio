// features/funnels/pages/FunnelsPage.tsx

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Grid, List } from 'lucide-react'
import { useGetFunnelsQuery, useDeleteFunnelMutation, useUpdateFunnelMutation } from '../services/funnels.api'
import { FunnelCard } from '../components/FunnelCard'
import { Button, Input, GlassCard } from '@/ui'
import type { FunnelStatus } from '../types/funnel.types'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Всі' },
  { value: 'active', label: 'Активні' },
  { value: 'draft', label: 'Чернетки' },
  { value: 'paused', label: 'Призупинені' },
] as const

export default function FunnelsPage() {
  const { data: funnels = [], isLoading, error } = useGetFunnelsQuery()
  const [deleteFunnel] = useDeleteFunnelMutation()
  const [updateFunnel] = useUpdateFunnelMutation()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | FunnelStatus>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const filtered = useMemo(() =>
    funnels.filter(f =>
      (status === 'all' || f.status === status) &&
      f.name.toLowerCase().includes(search.toLowerCase())
    ),
    [funnels, search, status]
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити воронку?')) return
    await deleteFunnel(id)
  }

  const handleToggleStatus = async (id: string, currentStatus: FunnelStatus) => {
    await updateFunnel({
      id,
      status: currentStatus === 'active' ? 'paused' : 'active',
    })
  }

  if (error) return <div className="text-red-400">Помилка завантаження</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Воронки</h1>
          <p className="text-slate-400 mt-1">{filtered.length} воронок</p>
        </div>
        <Link to="/dashboard/funnels/create">
          <Button data-color="orange" data-size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Нова воронка
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук воронок..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {STATUS_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                onClick={() => setStatus(opt.value as typeof status)}
                data-color={status === opt.value ? 'orange' : 'ghost'}
                data-size="sm"
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="flex gap-1 ml-auto">
            <Button onClick={() => setView('grid')} data-color={view === 'grid' ? 'orange' : 'ghost'} data-size="sm">
              <Grid className="w-4 h-4" />
            </Button>
            <Button onClick={() => setView('list')} data-color={view === 'list' ? 'orange' : 'ghost'} data-size="sm">
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Filter className="w-12 h-12 mx-auto mb-4 text-slate-500" />
          <h3 className="text-lg font-semibold text-white mb-2">Воронок не знайдено</h3>
          <p className="text-slate-400 mb-6">Створіть першу воронку для початку</p>
          <Link to="/dashboard/funnels/create">
            <Button data-color="orange">
              <Plus className="w-5 h-5 mr-2" />
              Створити воронку
            </Button>
          </Link>
        </GlassCard>
      ) : (
        <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filtered.map(funnel => (
            <FunnelCard
              key={funnel.id}
              funnel={funnel}
              view={view}
              onDelete={() => handleDelete(funnel.id)}
              onToggleStatus={() => handleToggleStatus(funnel.id, funnel.status)}
            />
          ))}
        </div>
      )}
    </div>
  )
}