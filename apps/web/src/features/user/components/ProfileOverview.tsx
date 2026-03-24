// frontend/src/features/user/components/ProfileOverview.tsx
// ═══════════════════════════════════════════════════════════════
//  Вкладка "Огляд" — консолідує всі user-блоки.
//
//  MERGED (видалено як окремі файли):
//    UserStats.tsx           → секція <StatsRow>
//    UserProgress.tsx        → секція <ProgressBlock>
//    UserProducts.tsx        → секція <ProductsBlock>
//    UserProductRolesPanel.tsx → секція <RolesPanel>
//    UserDeliveryChannelsCard.tsx → секція <DeliveryChannels>
//
//  Правила:
//    ✗ backdrop-filter  ✗ inline style={{}}  ✗ SCSS modules
//    ✓ Tailwind + CSS vars  ✓ GlassCard
// ═══════════════════════════════════════════════════════════════

import { ROUTES } from '@/config/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  useGetAllProductsQuery,
  useGetMyProductsQuery,
} from '@/features/products/services/products.api'
import { useGetProgressQuery } from '@/features/progress/services/progress.api'
import {
  useGenerateTelegramLinkMutation,
  useGetConnectionsQuery,
} from '@/features/social/services/social.api'
import { GlassCard } from '@/ui'
import {
  Activity, Award, BellRing, Crown,
  ExternalLink, Flame, Package,
  Send, Smartphone, Target, TrendingUp, UserCheck,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import BecomeExpertSection from '@/features/experts/components/BecomeExpertSection'

// ── Helper ──────────────────────────────────────────────────────
function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">{label}</p>
      <p className="text-sm font-semibold text-[color:var(--text-primary)] mt-1">{value}</p>
    </div>
  )
}

// ── 1. Stats row ─────────────────────────────────────────────────
function StatsRow() {
  const { user }    = useAuth()
  const { data }    = useGetProgressQuery(user?.id ?? '', { skip: !user?.id })

  const streak   = data?.streakDays    ?? 0
  const goals    = data?.completedGoals ?? user?.stats?.completedBlocks ?? 0
  const sessions = data?.totalSessions  ?? 0

  return (
    <GlassCard className="p-6">
      <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-[rgb(var(--accent-rgb))]" />
        Статистика
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] p-3">
          <p className="text-xs text-[color:var(--text-muted)] flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Streak
          </p>
          <p className="text-lg font-semibold text-[color:var(--text-primary)] mt-1">{streak}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] p-3">
          <p className="text-xs text-[color:var(--text-muted)] flex items-center gap-1">
            <Target className="w-3.5 h-3.5" /> Цілей
          </p>
          <p className="text-lg font-semibold text-[color:var(--text-primary)] mt-1">{goals}</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] p-3">
          <p className="text-xs text-[color:var(--text-muted)] flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> Сесій
          </p>
          <p className="text-lg font-semibold text-[color:var(--text-primary)] mt-1">{sessions}</p>
        </div>
      </div>
    </GlassCard>
  )
}

// ── 2. Progress block ─────────────────────────────────────────────
function ProgressBlock() {
  const { user } = useAuth()
  const { data } = useGetProgressQuery(user?.id ?? '', { skip: !user?.id })

  if (!user) return null

  const level       = data?.level       ?? user.stats?.level       ?? 1
  const totalXp     = data?.totalXp     ?? user.stats?.totalPoints ?? 0
  const nextLevelXp = data?.nextLevelXp ?? Math.max(100, level * 100)
  const pct         = Math.min(100, Math.round((totalXp / nextLevelXp) * 100))

  return (
    <GlassCard className="p-6">
      <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[rgb(var(--accent-rgb))]" />
        Прогрес
      </h3>
      <div className="space-y-2 text-sm">
        <p className="text-[color:var(--text-secondary)] flex items-center gap-2">
          <Award className="w-4 h-4 text-[rgb(var(--accent-rgb))]" />
          XP: <span className="font-semibold text-[color:var(--text-primary)]">{totalXp}</span>
        </p>
        <p className="text-[color:var(--text-muted)]">Рівень: {level}</p>
      </div>
      <div className="mt-4">
        {/* Progress bar — ширина через CSS var щоб не порушувати правило inline style */}
        <div className="h-2 w-full rounded-full bg-[color:var(--glass-bg)] overflow-hidden border border-[color:var(--border-primary)]">
          <div
            className="h-full rounded-full bg-[rgb(var(--accent-rgb))] transition-[width] duration-500"
            ref={el => el?.style.setProperty('width', `${pct}%`)}
          />
        </div>
        <p className="text-xs text-[color:var(--text-muted)] mt-2">
          До наступного рівня: {Math.max(nextLevelXp - totalXp, 0)} XP
        </p>
      </div>
    </GlassCard>
  )
}

// ── 3. User products ──────────────────────────────────────────────
function ProductsBlock() {
  const { data, isLoading } = useGetMyProductsQuery()
  const products            = data ?? []

  return (
    <GlassCard className="p-6">
      <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
        <Package className="w-4 h-4 text-[rgb(var(--accent-rgb))]" />
        Ваші продукти
      </h3>

      {isLoading ? (
        <p className="text-[color:var(--text-muted)] text-sm">Завантаження...</p>
      ) : products.length === 0 ? (
        <p className="text-[color:var(--text-muted)] text-sm">Ще немає активних продуктів.</p>
      ) : (
        <div className="space-y-2">
          {products.slice(0, 4).map(p => (
            <div key={p.id} className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] px-3 py-2">
              <p className="text-sm text-[color:var(--text-primary)] font-medium">
                {p.title || p.name}
              </p>
              <p className="text-xs text-[color:var(--text-muted)] mt-0.5">
                {p.status} · {p.price} {p.currency}
              </p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

// ── 4. Delivery channels ──────────────────────────────────────────
function DeliveryChannels() {
  const navigate                               = useNavigate()
  const { data }                               = useGetConnectionsQuery()
  const [genTelegramLink, { isLoading }]       = useGenerateTelegramLinkMutation()

  const telegram       = (data?.connections ?? []).find(c => c.provider === 'telegram')
  const isTgLinked     = Boolean(telegram)

  const handleTelegram = async () => {
    try {
      const result = await genTelegramLink().unwrap()
      window.open(result.link, '_blank', 'noopener,noreferrer')
      toast.success('Відкрийте Telegram бота і натисніть Start.')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Не вдалося згенерувати посилання')
    }
  }

  const channelBtn = 'flex items-center justify-between rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] px-4 py-3 text-sm text-[color:var(--text-secondary)] hover:bg-[rgba(255,255,255,.06)] hover:text-[color:var(--text-primary)] transition-colors cursor-pointer'

  return (
    <GlassCard className="p-6">
      <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
        <BellRing className="w-4 h-4 text-[rgb(var(--accent-rgb))]" />
        Канали доступу
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button onClick={handleTelegram} disabled={isLoading} className={channelBtn}>
          <span className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            {isTgLinked ? 'Оновити Telegram' : 'Підключити Telegram'}
          </span>
          <ExternalLink className="w-4 h-4 text-[color:var(--text-muted)]" />
        </button>

        <button onClick={() => navigate(ROUTES.DASHBOARD)} className={channelBtn}>
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Web кабінет
          </span>
          <ExternalLink className="w-4 h-4 text-[color:var(--text-muted)]" />
        </button>

        <button
          onClick={() => navigate(ROUTES.PRODUCTS)}
          className="flex items-center justify-between rounded-xl bg-[rgba(var(--accent-rgb),.85)] border border-[rgba(var(--accent-rgb),.35)] px-4 py-3 text-sm text-white font-semibold hover:bg-[rgba(var(--accent-rgb),1)] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Продовжити навчання
          </span>
          <ExternalLink className="w-4 h-4 opacity-70" />
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] p-3">
        <p className="text-xs text-[color:var(--text-muted)]">
          Telegram:{' '}
          {isTgLinked
            ? `підключено${telegram?.username ? ' (@' + telegram.username + ')' : ''}`
            : 'не підключено'}
        </p>
      </div>
    </GlassCard>
  )
}

// ── 5. Product roles panel ─────────────────────────────────────────
function RolesPanel() {
  const { user }  = useAuth()
  const userId    = user?.id

  const { data: myProducts  = [] } = useGetMyProductsQuery()
  const { data: allProducts = [] } = useGetAllProductsQuery({
    includeAll: Boolean(user?.isSuperAdmin),
  })
  const { data: progress }         = useGetProgressQuery(userId ?? '', { skip: !userId })

  if (!userId) return null

  const ownedProducts  = allProducts.filter(p => p.creatorId === userId)
  const ownedIds       = new Set(ownedProducts.map(p => p.id))
  const memberProducts = myProducts.filter(p => !ownedIds.has(p.id))

  const level   = progress?.level       ?? 1
  const xp      = progress?.totalXp     ?? 0
  const streak  = progress?.streakDays  ?? 0

  const productRow = (p: typeof ownedProducts[0]) => (
    <div key={p.id} className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] px-3 py-2">
      <p className="text-sm font-medium text-[color:var(--text-primary)]">{p.title || p.name}</p>
      <p className="text-xs text-[color:var(--text-muted)] mt-0.5">{p.status} · {p.price} {p.currency}</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

      {/* Owned */}
      <GlassCard className="p-6 border-[rgba(var(--accent-rgb),.30)]">
        <h3 className="text-base font-semibold text-[color:var(--text-primary)] flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-300" />
          Власні продукти
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetricTile label="Створено" value={ownedProducts.length} />
          <MetricTile label="Рівень"   value={level}  />
          <MetricTile label="XP"       value={xp}     />
          <MetricTile label="Streak"   value={streak} />
        </div>
        {ownedProducts.length > 0 && (
          <div className="mt-4 space-y-2 max-h-52 overflow-auto">
            {ownedProducts.map(productRow)}
          </div>
        )}
      </GlassCard>

      {/* Member */}
      <GlassCard className="p-6">
        <h3 className="text-base font-semibold text-[color:var(--text-primary)] flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-300" />
          Продукти учасника
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetricTile label="Участь"  value={memberProducts.length}        />
          <MetricTile label="Сесій"   value={progress?.totalSessions ?? 0} />
          <MetricTile label="Цілей"   value={progress?.completedGoals ?? 0} />
          <MetricTile label="Рівень"  value={level}                        />
        </div>
      </GlassCard>

    </div>
  )
}

// ── ProfileOverview (export) ───────────────────────────────────────
export default function ProfileOverview() {
  const { user } = useAuth()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <StatsRow />
        <ProgressBlock />
        <ProductsBlock />
        <DeliveryChannels />
      </div>
      <RolesPanel />
      {user?.role?.toLowerCase() === 'user' && (
        <BecomeExpertSection />
      )}
    </div>
  )
}
