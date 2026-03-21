import { cn } from '@/lib/utils'
import type { AppView, PreviewRole } from './types/layout.types'

interface ViewSwitcherProps {
  view:         AppView
  onViewChange: (v: AppView) => void
  previewRole:  PreviewRole
  onRoleChange: (r: PreviewRole) => void
  userRole:     PreviewRole
}

const VIEW_TABS  = [
  { id: 'navigation' as AppView, label: 'Навігація' },
  { id: 'pages'      as AppView, label: 'Сторінки'  },
]

const ROLE_TABS = [
  { id: 'user'       as PreviewRole, label: '👤 User'       },
  { id: 'expert'     as PreviewRole, label: '🎬 Expert'      },
  { id: 'superadmin' as PreviewRole, label: '⭐ SuperAdmin'  },
]

function availableRoleTabs(userRole: PreviewRole) {
  if (userRole === 'superadmin') return ROLE_TABS
  if (userRole === 'expert')     return ROLE_TABS.filter(t => t.id !== 'superadmin')
  return []
}

export function ViewSwitcher({
  view, onViewChange, previewRole, onRoleChange, userRole,
}: ViewSwitcherProps) {
  const roleTabs     = availableRoleTabs(userRole)
  const showRoleTabs = roleTabs.length > 0
  const handleViewChange = (value: AppView) => {
    console.log('[ViewSwitcher] onViewChange', value)
        console.log('[ViewSwitcher] Click view:', value)

    onViewChange(value)
  }
  const handleRoleChange = (value: PreviewRole) => {
    console.log('[ViewSwitcher] onRoleChange', value)
    onRoleChange(value)
  }
  const btnCls = (active: boolean) => cn(
    'px-3 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all duration-150 border-none cursor-pointer',
    active
      ? 'bg-[rgba(var(--accent-rgb),.15)] text-[rgb(var(--accent-rgb))] shadow-[inset_0_0_0_1px_rgba(var(--accent-rgb),.3)]'
      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] bg-transparent',
  )
  const wrap = 'flex items-center gap-0.5 rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-0.5'

  return (
    <div className="flex items-center gap-2">
      <div className={wrap}>
        {VIEW_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => handleViewChange(t.id)} className={btnCls(view === t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {showRoleTabs && <div className="w-px h-5 bg-[var(--border-primary)]" />}
      {showRoleTabs && (
        <div className={wrap}>
          {roleTabs.map(t => (
            <button key={t.id} type="button" onClick={() => handleRoleChange(t.id)} className={btnCls(previewRole === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
