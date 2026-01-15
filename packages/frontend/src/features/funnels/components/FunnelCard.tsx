// features/funnels/components/FunnelCard.tsx

import { Button, GlassCard } from '@/ui'
import { Edit, MoreVertical, Pause, Play, Trash2, TrendingUp, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Funnel, FunnelStatus } from '../types/funnel.types'

const STATUS_CONFIG: Record<FunnelStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Активна' },
  draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Чернетка' },
  paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Призупинена' },
  archived: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Архівована' },
}

interface Props {
  funnel: Funnel
  view: 'grid' | 'list'
  onDelete: () => void
  onToggleStatus: () => void
}

export function FunnelCard({ funnel, view, onDelete, onToggleStatus }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const status = STATUS_CONFIG[funnel.status]
  const is_active = funnel.status === 'active'

  if (view === 'list') {
    return (
      <GlassCard className="p-4 hover:bg-white/5 transition">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{funnel.name}</h3>
            <p className="text-slate-400 text-sm truncate">{funnel.description}</p>
          </div>
          
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4" />
              <span>{funnel.analytics?.uniqueVisitors || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <TrendingUp className="w-4 h-4" />
              <span>{funnel.analytics?.conversions || 0}</span>
            </div>
          </div>

          <Link to={`/dashboard/funnels/${funnel.id}/edit`}>
            <Button data-color="ghost" data-size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="overflow-hidden group hover:ring-1 hover:ring-orange-500/50 transition">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg font-semibold text-white truncate">{funnel.name}</h3>
            {funnel.description && (
              <p className="text-sm text-slate-400 mt-1 line-clamp-2">{funnel.description}</p>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <Button onClick={() => setMenuOpen(!menuOpen)} data-color="ghost" data-size="sm">
              <MoreVertical className="w-5 h-5" />
            </Button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 glass-card rounded-lg shadow-xl z-10 py-1">
                <button
                  onClick={() => { setMenuOpen(false); onToggleStatus() }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                >
                  {is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {is_active ? 'Призупинити' : 'Активувати'}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Видалити
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
          <span className="text-xs text-slate-500">{funnel.steps?.length || 0} кроків</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/5">
        <div className="p-4 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Відвідувачі</p>
              <p className="text-white font-semibold">{funnel.analytics?.uniqueVisitors || 0}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">Конверсії</p>
              <p className="text-white font-semibold">{funnel.analytics?.conversions || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/5">
        <Link to={`/dashboard/funnels/${funnel.id}/edit`}>
          <Button className="w-full" data-color="ghost">
            <Edit className="w-4 h-4 mr-2" />
            Редагувати
          </Button>
        </Link>
      </div>
    </GlassCard>
  )
}