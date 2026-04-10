// frontend/src/features/user/components/ProfileHero.tsx
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'
import { GlassCard } from '@/ui'
import { Crown }     from 'lucide-react'

export default function ProfileHero() {
  const { user } = useAuth()
  const { accessControl, subscription } = useSystemState()
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !user?.id })
  if (!user) return null

  const initials = (user.firstName?.[0] || user.name?.[0] || 'U').toUpperCase()

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.name ?? 'Користувач'

  const isPaid = Boolean(user.access?.isPaid || subscription?.isActive || accessControl?.hasSubscription)
  const isTrial = !isPaid && Boolean(trial?.isActive || user.access?.isTrial)
  const planLabel =
    isPaid ? 'Pro'
    : isTrial ? 'Trial'
    : 'Free'

  const planClass =
    isPaid    ? 'text-[rgb(var(--accent-rgb))] border-[rgba(var(--accent-rgb),.4)]'
    : isTrial ? 'text-amber-300 border-amber-300/40'
    : 'text-white/50 border-white/15'

  return (
    <GlassCard className="p-6 flex items-center gap-5">

      {/* Avatar */}
      <div className="w-16 h-16 rounded-2xl bg-[rgba(var(--accent-rgb),.18)] border border-[rgba(var(--accent-rgb),.3)] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-semibold text-[color:var(--text-primary)] truncate">
            {displayName}
          </h2>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${planClass} flex items-center gap-1`}>
            {isPaid && <Crown className="w-3 h-3" />}
            {planLabel}
          </span>
        </div>
        <p className="text-sm text-[color:var(--text-muted)] mt-0.5 truncate">
          {user.email}
        </p>
        <p className="text-xs text-[color:var(--text-muted)] mt-1 capitalize">
          {/* FIX: role може бути undefined під час першого рендеру */}
          {user.role?.toLowerCase() ?? 'user'} · рівень {user.stats?.level ?? 1}
        </p>
      </div>

    </GlassCard>
  )
}
