import { getSubscriptionStatus } from '@/config/menu'
import type { User } from '@/features/user/types/user.types'
import { Sparkles, Zap } from 'lucide-react'

export function TrialBannerSection({ user }: { user: User | null }) {
  const sub = getSubscriptionStatus(user as any)
  if (!sub?.daysLeft) return null

  const urgency = sub.daysLeft <= 3

  return (
    <div className="relative overflow-hidden border-b border-white/8">
      {/* Liquid glass background */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/8 via-rose-500/5 to-transparent backdrop-blur-xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.12)_0%,transparent_60%)]" />

      {/* Animated glow */}
      {urgency && (
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent animate-pulse" />
      )}

      <div className="relative max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">

        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="
            w-8 h-8 rounded-xl shrink-0
            bg-orange-500/15 backdrop-blur-sm
            border border-orange-500/25
            flex items-center justify-center
            shadow-[0_0_12px_rgba(249,115,22,0.2)]
          ">
            <Sparkles className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Пробний період</span>
            <span className="ml-2 text-xs text-white/40">· Відкрийте всі модулі за 33€/міс</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Days counter */}
          <div className="flex items-center gap-1.5">
            <div className={`
              px-3 py-1 rounded-xl text-sm font-bold
              backdrop-blur-sm border
              ${urgency
                ? 'bg-red-500/15 border-red-500/30 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                : 'bg-orange-500/15 border-orange-500/25 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
              }
            `}>
              {sub.daysLeft}
            </div>
            <span className="text-xs text-white/35">
              {sub.daysLeft === 1 ? 'день' : sub.daysLeft < 5 ? 'дні' : 'днів'}
            </span>
          </div>

          {/* CTA */}
          <button className="
            flex items-center gap-1.5
            px-4 py-1.5 rounded-xl
            text-xs font-semibold text-white
            bg-orange-500/20 hover:bg-orange-500/30
            border border-orange-500/30 hover:border-orange-500/50
            backdrop-blur-sm
            shadow-[0_0_16px_rgba(249,115,22,0.15)]
            hover:shadow-[0_0_20px_rgba(249,115,22,0.25)]
            transition-all duration-200
          ">
            <Zap className="w-3 h-3" />
            Upgrade
          </button>
        </div>
      </div>
    </div>
  )
}