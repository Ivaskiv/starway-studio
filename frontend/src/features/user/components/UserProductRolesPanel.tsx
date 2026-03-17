import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetMyProductsQuery, useGetAllProductsQuery } from '@/features/products/services/products.api'
import { useGetProgressQuery } from '@/features/progress/services/progress.api'
import { GlassCard } from '@/ui'
import { Crown, UserCheck } from 'lucide-react'

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-white/5 px-3 py-2">
      <p className="text-[11px] uppercase text-white/45">{label}</p>
      <p className="text-sm font-semibold text-white mt-1">{value}</p>
    </div>
  )
}

export default function UserProductRolesPanel() {

  const { user } = useAuth()

  const userId = user?.id

  const { data: myProducts = [] } = useGetMyProductsQuery()

  const { data: allProducts = [] } = useGetAllProductsQuery({
    includeAll: Boolean(user?.isSuperAdmin)
  })

  const { data: progress } =
    useGetProgressQuery(userId || '', { skip: !userId })

  if (!userId) return null

  const ownedProducts =
    allProducts.filter(p => p.creatorId === userId)

  const ownedIds =
    new Set(ownedProducts.map(p => p.id))

  const memberProducts =
    myProducts.filter(p => !ownedIds.has(p.id))

  const level = progress?.level ?? 1
  const xp = progress?.totalXp ?? 0
  const streak = progress?.streakDays ?? 0

  return (

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

      <GlassCard className="p-6 border-[rgba(var(--accent-rgb),0.35)] bg-[var(--glass-bg)] backdrop-blur-xl">

        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-300" />
          Власні продукти
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Створено" value={ownedProducts.length} />
          <Metric label="Рівень" value={level} />
          <Metric label="XP" value={xp} />
          <Metric label="Streak" value={streak} />
        </div>

        <div className="mt-4 space-y-2 max-h-52 overflow-auto">

          {ownedProducts.map(product => (

            <div
              key={product.id}
              className="rounded-xl border border-[var(--glass-border)] bg-white/5 px-3 py-2"
            >

              <p className="text-sm font-medium text-white">
                {product.title || product.name}
              </p>

              <p className="text-xs text-white/45 mt-0.5">
                {product.status} · {product.price} {product.currency}
              </p>

            </div>

          ))}

        </div>

      </GlassCard>

      <GlassCard className="p-6 border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">

        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-cyan-300" />
          Продукти користувача
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Участь" value={memberProducts.length} />
          <Metric label="Сесій" value={progress?.totalSessions ?? 0} />
          <Metric label="Цілей" value={progress?.completedGoals ?? 0} />
          <Metric label="Рівень" value={level} />
        </div>

      </GlassCard>

    </div>

  )
}
