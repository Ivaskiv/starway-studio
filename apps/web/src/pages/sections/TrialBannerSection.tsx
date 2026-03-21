// frontend/src/pages/sections/TrialBannerSection.tsx
// ✓ getSubscriptionStatus з @/shared/utils/access.utils

import { getSubscriptionStatus } from '@/shared/utils/access.utils'
import type { User }             from '@/features/user/types/user.types'
import { Sparkles, Zap }        from 'lucide-react'

export function TrialBannerSection({ user }: { user: User | null }) {
  const sub = getSubscriptionStatus(user)
  if (!sub?.daysLeft) return null

  const urgency = sub.daysLeft <= 3

  return (
    <div className="relative overflow-hidden border-b border-white/[0.08]">

      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(var(--accent-rgb),0.08)] via-[rgba(var(--accent-rgb),0.05)] to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(var(--accent-rgb),0.12)_0%,transparent_60%)]" />

      {/* Urgency pulse */}
      {urgency && (
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent animate-pulse" />
      )}

      <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 py-3">

        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl shrink-0 bg-[rgba(var(--accent-rgb),0.15)] border border-[rgba(var(--accent-rgb),0.25)] flex items-center justify-center shadow-[0_0_12px_rgba(var(--accent-rgb),0.2)]">
            <Sparkles className="w-4 h-4 text-[color:var(--accent)]" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Пробний період</span>
            <span className="ml-2 text-xs text-white/40">· Відкрийте всі модулі за 33€/міс</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className={[
              'px-3 py-1 rounded-xl text-sm font-bold border',
              urgency
                ? 'bg-red-500/15 border-red-500/30 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                : 'bg-[rgba(var(--accent-rgb),0.15)] border-[rgba(var(--accent-rgb),0.25)] text-[color:var(--accent)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.15)]',
            ].join(' ')}>
              {sub.daysLeft}
            </div>
            <span className="text-xs text-white/35">
              {sub.daysLeft === 1 ? 'день' : sub.daysLeft < 5 ? 'дні' : 'днів'}
            </span>
          </div>

          <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-[rgba(var(--accent-rgb),0.2)] hover:bg-[rgba(var(--accent-rgb),0.3)] border border-[rgba(var(--accent-rgb),0.3)] hover:border-[rgba(var(--accent-rgb),0.5)] shadow-[0_0_16px_rgba(var(--accent-rgb),0.15)] hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)] transition-all duration-200">
            <Zap className="w-3 h-3" />
            Upgrade
          </button>
        </div>

      </div>
    </div>
  )
}
