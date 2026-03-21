// frontend/src/features/user/components/ProfileTabs.tsx

import { useEffect, useRef } from 'react'
import { cn }                from '@/lib/utils'
import type { ReactNode }    from 'react'

// ── Types ──────────────────────────────────────────────────────

export interface ProfileTabDef {
  id:     string
  label:  string
  icon?:  string
  badge?: number | string
}

interface ProfileTabsProps {
  tabs:     ProfileTabDef[]
  active:   string
  onChange: (id: string) => void
}

interface ProfileTabPanelProps {
  children:   ReactNode
  className?: string
}

// ── ProfileTabs ────────────────────────────────────────────────

export function ProfileTabs({ tabs, active, onChange }: ProfileTabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // aria-selected через setAttribute — axe/aria не бачить {expression}
  useEffect(() => {
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .forEach(btn => {
        btn.setAttribute('aria-selected', String(btn.id === `ptab-${active}`))
      })
  }, [active])

  return (
    <div ref={listRef} className="profile-tabs" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          id={`ptab-${t.id}`}
          aria-controls={`ptabpanel-${t.id}`}
          onClick={() => onChange(t.id)}
          className={cn('profile-tab', t.id === active && 'profile-tab--active')}
        >
          {t.icon && (
            <span className="profile-tab__icon" aria-hidden="true">{t.icon}</span>
          )}

          {t.label}

          {t.badge != null && (
            <span className="profile-tab__badge">{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── ProfileTabPanel ────────────────────────────────────────────

export function ProfileTabPanel({ children, className }: ProfileTabPanelProps) {
  return (
    <div className={cn('profile-tab-panel p-6', className)}>
      {children}
    </div>
  )
}

export default ProfileTabs