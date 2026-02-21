// backend/src/modules/access/access.service.ts
import { prisma } from '@/db/client.js'
import type { AccessItem, UserAccessResult } from './types.js'
import { getAllAbilities } from '@/modules/auth/abilities.js'
import { isSuperAdminEmail } from '@/modules/auth/superadmin.js'

type AccessUserSnapshot = {
  id: string
  email: string
  role: 'USER' | 'ADMIN' | 'MENTOR'
  subscription: {
    status: 'TRIAL' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'CANCELLED'
    trialEndsAt: Date | null
    endsAt: Date | null
  } | null
}

async function getAccessUserSnapshot(userId: string): Promise<AccessUserSnapshot | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    })
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            trialEndsAt: user.subscription.trialEndsAt,
            endsAt: user.subscription.endsAt,
          }
        : null,
    }
  } catch (error: any) {
    // fix code_x: tolerate legacy/partial schemas (missing columns/tables) and keep access endpoint alive.
    if (error?.code !== 'P2022' && error?.code !== 'P2021') throw error

    // fix code_x: dynamic column fallback for legacy users table variants (role/user_role/etc).
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
    `
    const names = new Set(columns.map((c) => c.column_name))
    const roleCol = names.has('role') ? 'role' : names.has('user_role') ? 'user_role' : null
    const selectRole = roleCol ? `"${roleCol}"` : `'USER'`

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; role: string; email: string }>>(
      `
        SELECT id, email, ${selectRole} AS role
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      userId,
    )

    const row = rows[0]
    if (!row) return null
    const rawRole = String(row.role || 'USER').toUpperCase()
    const role = (rawRole === 'ADMIN' || rawRole === 'MENTOR' ? rawRole : 'USER') as
      | 'USER'
      | 'ADMIN'
      | 'MENTOR'
    return { id: row.id, email: row.email, role, subscription: null }
  }
}

export async function getUserAccess(userId: string): Promise<UserAccessResult> {
  const user = await getAccessUserSnapshot(userId)

  if (!user) throw new Error('User not found')

  const now          = new Date()
  const subscription = user.subscription
  const items: AccessItem[] = []
  const isSuperAdmin = isSuperAdminEmail(user.email)

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if (user.role === 'ADMIN' || isSuperAdmin) {
    return {
      role:      user.role,
      plan:      'paid',
      trialEnd:  null,
      items:     [{ key: 'mentor.core', source: 'admin', expiresAt: null }],
      abilities: getAllAbilities(true),
    }
  }

  // ── PAID ───────────────────────────────────────────────────────────────────
  const isPaidActive =
    subscription?.status === 'ACTIVE' &&
    (!subscription.endsAt || subscription.endsAt > now)

  if (isPaidActive) {
    const expiresAt = subscription!.endsAt ?? null
    items.push(
      { key: 'mentor.core',        source: 'purchase', expiresAt },
      { key: 'mentor.daily',       source: 'purchase', expiresAt },
      { key: 'mentor.decisions',   source: 'purchase', expiresAt },
      { key: 'mentor.wheel',       source: 'purchase', expiresAt },
      { key: 'mentor.vision',      source: 'purchase', expiresAt },
      { key: 'mentor.goals',       source: 'purchase', expiresAt },
      { key: 'mentor.actions',     source: 'purchase', expiresAt },
      { key: 'mentor.zoom',        source: 'purchase', expiresAt },
      { key: 'mentor.mentorship',  source: 'purchase', expiresAt },
      { key: 'ai.basic',           source: 'purchase', expiresAt },
      { key: 'ai.deep',            source: 'purchase', expiresAt },
      { key: 'ai.pdf',             source: 'purchase', expiresAt },
      { key: 'ai.export',          source: 'purchase', expiresAt },
      { key: 'products.manage',    source: 'purchase', expiresAt },
    )
  }

  // ── TRIAL ──────────────────────────────────────────────────────────────────
  // ✅ trialEndsAt тепер з subscription, не з user
  const isTrialActive =
    !isPaidActive &&
    subscription?.status === 'TRIAL' &&
    !!subscription.trialEndsAt &&
    subscription.trialEndsAt > now

  if (isTrialActive) {
    const expiresAt = subscription!.trialEndsAt
    // fix code_x: trial should expose full paid functionality for 7 days.
    items.push(
      { key: 'mentor.core',      source: 'trial', expiresAt },
      { key: 'mentor.daily',     source: 'trial', expiresAt },
      { key: 'mentor.decisions', source: 'trial', expiresAt },
      { key: 'mentor.wheel',     source: 'trial', expiresAt },
      { key: 'mentor.vision',    source: 'trial', expiresAt },
      { key: 'mentor.goals',     source: 'trial', expiresAt },
      { key: 'mentor.actions',   source: 'trial', expiresAt },
      { key: 'mentor.zoom',      source: 'trial', expiresAt },
      { key: 'mentor.mentorship',source: 'trial', expiresAt },
      { key: 'ai.basic',         source: 'trial', expiresAt },
      { key: 'ai.deep',          source: 'trial', expiresAt },
      { key: 'ai.pdf',           source: 'trial', expiresAt },
      { key: 'ai.export',        source: 'trial', expiresAt },
      { key: 'products.manage',  source: 'trial', expiresAt },
      { key: 'wheel.view',       source: 'trial', expiresAt },
    )
  }

  // ── FREE — завжди ──────────────────────────────────────────────────────────
  items.push(
    { key: 'dashboard.view',  source: 'free', expiresAt: null },
    { key: 'profile.view',    source: 'free', expiresAt: null },
    { key: 'wheel.view',      source: 'free', expiresAt: null },
    { key: 'progress.view',   source: 'free', expiresAt: null },
    { key: 'settings.manage', source: 'free', expiresAt: null },
  )

  // ── ABILITIES MAP ──────────────────────────────────────────────────────────
  const abilities = getAllAbilities(false)
  for (const item of items) {
    abilities[item.key] = true
  }

  // Frontend compatibility aliases used by legacy route guards.
  abilities.dashboard = abilities['dashboard.view'] === true
  abilities.profile = abilities['profile.view'] === true
  abilities.wheel = abilities['wheel.view'] === true
  abilities.progress = abilities['progress.view'] === true
  abilities.settings = abilities['settings.manage'] === true
  abilities.products = abilities['products.manage'] === true
  abilities.mentor = abilities['mentor.core'] === true
  abilities.vision = abilities['mentor.vision'] === true
  abilities.goal = abilities['mentor.goals'] === true
  abilities.actions = abilities['mentor.actions'] === true
  abilities['ai-generator'] = abilities['ai.basic'] === true

  // ── PLAN ───────────────────────────────────────────────────────────────────
  const plan: 'paid' | 'trial' | 'free' =
    isPaidActive ? 'paid' : isTrialActive ? 'trial' : 'free'

  return {
    role:     user.role,
    plan,
    trialEnd: subscription?.trialEndsAt ?? null, 
    items,
    abilities,
  }
}

export function canAccessFeature(result: UserAccessResult, feature: string): boolean {
  const abilities = result.abilities as Record<string, boolean>
  return abilities[feature] === true
}
