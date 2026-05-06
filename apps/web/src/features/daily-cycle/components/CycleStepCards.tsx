import type { ReactNode } from 'react'
import { ArrowRight, Check, Lock, Play, TimerReset } from 'lucide-react'

export type CycleStepCardStatus = 'active' | 'waiting' | 'locked' | 'completed'

export interface CycleStepCardItem {
  number: 1 | 2 | 3 | 4
  icon: ReactNode
  title: string
  subtitle: string
  topRightText?: string
  checks: string[]
  status: CycleStepCardStatus
  ctaLabel: string
  statusText: string
  badge?: string
  showArrow?: boolean
  iconToneClass?: string
  badgeToneClass?: string
  recoveryTone?: boolean
  onClick: () => void
}

const STEP_CARD_STYLES: Record<CycleStepCardStatus, { shell: string; iconWrap: string; cta: string; status: string }> = {
  active: {
    shell: 'border-[1.5px] border-[#378ADD] bg-[rgba(30,60,120,0.4)] shadow-[0_0_0_1px_rgba(55,138,221,0.12),0_14px_28px_rgba(5,10,22,0.18)]',
    iconWrap: 'border-[rgba(55,138,221,0.18)] bg-[rgba(55,138,221,0.14)] text-[#8DC4FF]',
    cta: 'border-[rgba(55,138,221,0.28)] bg-[rgba(55,138,221,0.18)] text-white hover:bg-[rgba(55,138,221,0.24)]',
    status: 'text-[rgb(var(--accent-soft-rgb))]',
  },
  waiting: {
    shell: 'border-[1.5px] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]',
    iconWrap: 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[var(--accent)]',
    cta: 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.08)]',
    status: 'text-[var(--text-secondary)]',
  },
  locked: {
    shell: 'border-[1.5px] border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] opacity-55',
    iconWrap: 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)]',
    cta: 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]',
    status: 'text-[var(--text-muted)]',
  },
  completed: {
    shell: 'border-[1.5px] border-[#1D9E75] bg-[rgba(29,158,117,0.1)]',
    iconWrap: 'border-[rgba(29,158,117,0.24)] bg-[rgba(29,158,117,0.14)] text-[#7DE2BE]',
    cta: 'border-[rgba(29,158,117,0.18)] bg-[rgba(29,158,117,0.12)] text-[var(--text-primary)] hover:bg-[rgba(29,158,117,0.16)]',
    status: 'text-[var(--color-success)]',
  },
}

function getStatusIcon(status: CycleStepCardStatus) {
  if (status === 'completed') return <Check className="h-3.5 w-3.5" />
  if (status === 'locked') return <TimerReset className="h-3.5 w-3.5" />
  if (status === 'active') return <Play className="h-3.5 w-3.5 fill-current" />
  return <TimerReset className="h-3.5 w-3.5" />
}

function CycleStepCard({ item }: { item: CycleStepCardItem }) {
  const tone = STEP_CARD_STYLES[item.status]
  const iconToneClass = item.iconToneClass ?? tone.iconWrap
  const badgeToneClass = item.badgeToneClass ?? 'border-[rgba(55,138,221,0.24)] bg-[rgba(55,138,221,0.12)] text-[#78B9FF]'
  const recoveryShellClass = item.recoveryTone
    ? 'border-[1.5px] border-[rgba(242,178,75,0.5)] shadow-[0_0_0_1px_rgba(242,178,75,0.12),0_12px_28px_rgba(0,0,0,0.16)]'
    : ''

  return (
    <button
      type="button"
      data-testid={`step-card-${item.number}`}
      onClick={item.onClick}
      className={[
        'relative min-h-[252px] rounded-[22px] px-4 py-4 text-left transition-all',
        'flex h-full flex-col',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        tone.shell,
        recoveryShellClass,
      ].join(' ')}
    >
      {item.showArrow ? (
        <div className="absolute -right-[14px] top-1/2 z-[2] hidden -translate-y-1/2 xl:block">
          <ArrowRight color={item.status === 'locked' ? 'rgba(55,138,221,0.3)' : '#378ADD'} className="h-4 w-4" />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {String(item.number).padStart(2, '0')}
          </span>
          {item.badge ? (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeToneClass}`}>
              {item.badge}
            </span>
          ) : null}
        </div>
        {item.topRightText ? (
          <span className="text-right text-[11px] font-medium text-[var(--text-secondary)]">
            {item.topRightText}
          </span>
        ) : null}
      </div>

      <div className={`mt-3.5 flex h-[46px] w-[46px] items-center justify-center rounded-full border ${iconToneClass}`}>
        {item.icon}
      </div>

      <h3 className="mt-3.5 break-words text-[1.2rem] font-semibold leading-tight text-[var(--text-primary)]">{item.title}</h3>
      <p className="mt-1 text-[0.85rem] text-[var(--text-secondary)]">{item.subtitle}</p>

      <ul className="mt-3.5 space-y-1">
        {item.checks.map((check) => (
          <li key={check} className="flex items-start gap-2 text-[11px] leading-[1.25rem] text-[var(--text-secondary)]">
            <span className="mt-[2px] inline-flex h-4 w-4 flex-shrink-0 items-center justify-center text-[var(--text-muted)]">
              <Check className="h-3 w-3" />
            </span>
            <span>{check}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-4 space-y-2.5">
        <div className={`inline-flex min-h-[40px] w-full items-center justify-center rounded-[12px] border px-4 text-[0.88rem] font-semibold ${tone.cta}`}>
          {item.ctaLabel}
        </div>
        <div className={`flex items-center gap-2 text-[11px] font-medium ${tone.status}`}>
          {getStatusIcon(item.status)}
          <span>{item.statusText}</span>
        </div>
      </div>
    </button>
  )
}

export default function CycleStepCards({ items }: { items: CycleStepCardItem[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-4 lg:items-stretch">
      {items.map((item) => (
        <CycleStepCard key={item.number} item={item} />
      ))}
    </div>
  )
}
