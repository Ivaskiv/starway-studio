import { ArrowRight, Briefcase, UserRound } from 'lucide-react'

import type { NavigateFunction } from 'react-router-dom'

import { ROUTES } from '@/config/routes'

interface MiniAppProfileSectionProps {
  displayName: string
  isTrialActive: boolean
  profileBitMind: number
  profileNeuroGems: number
  profileStreak: number
  navigate: NavigateFunction
}

export default function MiniAppProfileSection({
  displayName,
  isTrialActive,
  profileBitMind,
  profileNeuroGems,
  profileStreak,
  navigate,
}: MiniAppProfileSectionProps) {
  return (
    <div className="space-y-5 px-4 pt-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(var(--accent-rgb),0.2)] text-3xl font-bold text-[var(--accent)]">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">{displayName}</p>
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isTrialActive ? 'bg-[var(--color-success)]' : 'bg-[var(--text-muted)]'}`}
              aria-hidden="true"
            />
            {isTrialActive ? 'Тріал активний' : 'Немає підписки'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'BITMIND', value: profileBitMind },
          { label: 'NEUROGEMS', value: profileNeuroGems },
          { label: 'Streak', value: profileStreak },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-center"
          >
            <p className="text-xl font-bold text-[var(--accent)]">{item.value}</p>
            <p className="mt-0.5 text-[9px] text-[var(--text-muted)]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {[
          { Icon: UserRound, label: 'Мій профіль', accent: true, onClick: () => navigate(ROUTES.PROFILE) },
          { Icon: Briefcase, label: 'Партнерський розгляд', accent: false, onClick: () => undefined },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={[
              'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left',
              item.accent
                ? 'border-[rgba(var(--accent-rgb),0.4)] bg-[rgba(var(--accent-rgb),0.08)]'
                : 'border-[var(--border)] bg-[var(--bg-secondary)]',
            ].join(' ')}
          >
            <span className="btn-icon h-10 w-10 text-[rgb(var(--accent-soft-rgb))]" aria-hidden="true">
              <item.Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm text-[var(--text-primary)]">{item.label}</span>
            <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
        ))}
      </div>
    </div>
  )
}
