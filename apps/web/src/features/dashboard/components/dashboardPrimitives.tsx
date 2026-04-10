import { InfoHint } from '@/ui'
import type { ReactNode } from 'react'
import type { MetricInfo } from '../types/dashboard.types'

export const DASHBOARD_EYEBROW_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]'
export const DASHBOARD_BODY_CLASS = 'text-[13px] leading-5 text-[var(--text-muted)]'
export const DASHBOARD_PANEL_EYEBROW_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]'

export function StatusPill({
  active,
  label,
  tone = 'green',
}: {
  active: boolean
  label: string
  tone?: 'green' | 'blue' | 'muted'
}) {
  const colorClass = active
    ? tone === 'blue'
      ? 'bg-[rgba(56,132,255,0.12)] border-[rgba(56,132,255,0.26)] text-[var(--text-primary)]'
      : 'bg-[rgba(45,212,191,0.12)] border-[rgba(45,212,191,0.28)] text-[var(--text-primary)]'
    : 'bg-[rgba(255,255,255,0.04)] border-[var(--border)] text-[var(--text-muted)]'

  const dotClass = active
    ? tone === 'blue'
      ? 'bg-[rgb(96,165,250)]'
      : 'bg-[rgb(45,212,191)]'
    : 'bg-[rgba(148,163,184,0.45)]'

  return (
    <span className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-base font-medium ${colorClass}`}>
      <span className={`h-3 w-3 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}

export function MetricCard({
  icon,
  title,
  label,
  accent,
  tone,
  info,
}: {
  icon: ReactNode
  title: string
  label: string
  accent: string
  tone: 'cyan' | 'orange' | 'green' | 'violet'
  info: MetricInfo
}) {
  const iconTone = {
    cyan: 'text-[rgba(103,232,249,0.92)]',
    orange: 'text-[rgba(253,186,116,0.92)]',
    green: 'text-[rgba(94,234,212,0.92)]',
    violet: 'text-[rgba(216,180,254,0.92)]',
  }[tone]

  return (
    <div className="dashboard-liquid-card--soft p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={iconTone}>{icon}</div>
        <InfoHint
          label={info.label}
          description={info.description}
          instruction={info.instruction}
        />
      </div>
      <p className="mt-4 text-[2rem] font-semibold tracking-tight text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">{accent}</p>
    </div>
  )
}

export function StatPill({
  icon,
  label,
  muted = false,
  tone = 'default',
}: {
  icon: string
  label: string
  muted?: boolean
  tone?: 'default' | 'accent' | 'success'
}) {
  const toneClass = muted
    ? 'border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]'
    : tone === 'success'
      ? 'border-[rgba(45,212,191,0.2)] bg-[rgba(45,212,191,0.08)] text-[rgb(45,212,191)]'
      : tone === 'accent'
        ? 'border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.1)] text-[rgb(var(--accent-soft-rgb))]'
        : 'border-[var(--border-primary)] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)]'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${toneClass}`}>
      <span className="text-[13px]">{icon}</span>
      {label}
    </span>
  )
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[rgba(255,255,255,0.03)] px-4 py-3">
      <span className="shrink-0 text-sm text-[var(--text-muted)]">{label}</span>
      <span className="min-w-0 max-w-[60%] truncate text-right text-sm font-medium leading-5 text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

export function ProfileInfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] py-2 last:border-b-0">
      <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <div className="min-w-0 text-right text-sm font-medium leading-5 text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  )
}

export function MiniStatusCard({
  title,
  value,
  tone,
}: {
  title: string
  value: string
  tone: 'accent' | 'success' | 'warning' | 'muted'
}) {
  const toneClass = {
    accent: 'border-[rgba(99,102,241,0.28)] bg-[rgba(99,102,241,0.08)] text-[rgb(129,140,248)]',
    success: 'border-[rgba(45,212,191,0.28)] bg-[rgba(45,212,191,0.08)] text-[rgb(45,212,191)]',
    warning: 'border-[rgba(250,204,21,0.22)] bg-[rgba(250,204,21,0.08)] text-[rgb(254,240,138)]',
    muted: 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]',
  }[tone]

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] py-2 last:border-b-0">
      <span className="text-sm leading-5 text-[var(--text-secondary)]">{title}</span>
      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}>{value}</span>
    </div>
  )
}

export function QuickAction({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: ReactNode
  label: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] py-2.5 text-left transition-all duration-200 last:border-b-0 hover:border-[rgba(var(--accent-rgb),0.18)]"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.16)] bg-[rgba(var(--accent-rgb),0.08)]">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-[var(--text-primary)]">{label}</span>
          <span className="mt-0.5 block text-xs leading-4.5 text-[var(--text-muted)]">{sub}</span>
        </span>
      </span>
      <span className="shrink-0 text-xs font-medium text-[rgb(var(--accent-soft-rgb))]">Відкрити</span>
    </button>
  )
}
