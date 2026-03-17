import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../../db/client.js'
import type { AuthUser, SafeUser, UserWithSub } from '../../types/globalTypes.js'
import type { Subscription, UserProgress, MentorConfig, User } from '../../db/generated/prisma/client.js'
import { Prisma } from '../../db/generated/prisma/client.js'
import { isSuperAdminEmail } from './superadmin.js'
import { resolveUserAbilities, ABILITIES } from './abilities.js'
import { normalizeSubscriptionPlan, normalizeSubscriptionStatus } from '../subscriptions/utils.js'

// ── Константи JWT ─────────────────────
const ACCESS_SECRET = getEnv('JWT_ACCESS_SECRET')
const REFRESH_SECRET = getEnv('JWT_REFRESH_SECRET')
const ACCESS_EXPIRES = '15m'
const REFRESH_EXPIRES = '30d'

function getEnv(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

// ── Хешування пароля ──────────────────
export const hashPassword = (password: string) => bcrypt.hash(password, 12)
export const comparePassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash)

// ── Генерація та перевірка токенів ───
export function generateAccessToken(payload: AuthUser) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES })
}

export function generateRefreshToken(userId: string) {
  return jwt.sign({ id: userId, jti: crypto.randomUUID() }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES })
}

export function verifyAccessToken(token: string): AuthUser {
  return jwt.verify(token, ACCESS_SECRET) as AuthUser
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as { id: string }
}

// ── Фолбек для refresh токенів, якщо таблиця відсутня ─
const fallbackRefreshTokens = new Map<string, { userId: string; expiresAt: Date }>()
let refreshTableAvailable: boolean | undefined

async function checkRefreshTableAvailability() {
  if (typeof refreshTableAvailable !== 'undefined') return refreshTableAvailable
  try {
    await prisma.$queryRaw`SELECT 1 FROM "RefreshToken" LIMIT 1`
    refreshTableAvailable = true
  } catch (err: any) {
    if (err?.code === 'P2021') {
      console.warn('[AuthService] RefreshToken table missing - falling back to in-memory store')
      refreshTableAvailable = false
    } else {
      throw err
    }
  }
  return refreshTableAvailable
}

// ── Зберігання refresh токена з циклом на P2002 ─
export async function storeRefreshToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  if (!(await checkRefreshTableAvailability())) return null

  let savedToken = null
  let tries = 0

  while (!savedToken && tries < 5) {
    try {
      savedToken = await prisma.refreshToken.create({
        data: { token, userId, expiresAt },
      })
    } catch (err: unknown) {
      // якщо помилка унікальності, генеруємо новий токен
      if (err instanceof Error && 'code' in err && (err as any).code === 'P2002') {
        token = generateRefreshToken(userId)
        tries++
      } else throw err
    }
  }

  if (!savedToken) throw new Error('Не вдалося зберегти refresh token після 5 спроб')
  return savedToken
}

export async function removeRefreshToken(token: string) {
  if (await checkRefreshTableAvailability()) {
    return prisma.refreshToken.deleteMany({ where: { token } })
  }
  fallbackRefreshTokens.delete(token)
  return { count: 0 }
}

export async function findRefreshToken(token: string) {
  if (await checkRefreshTableAvailability()) {
    return prisma.refreshToken.findUnique({ where: { token } })
  }
  const data = fallbackRefreshTokens.get(token)
  if (!data) return null
  return { token, userId: data.userId, expiresAt: data.expiresAt }
}

// ── Явний тип для user з усіма include ───────────────
interface PrismaUserWithRelations extends User {
  subscriptions: Subscription[]
  progress: UserProgress | null
  mentorConfig: MentorConfig | null
}

async function ensureSuperAdminRoleForRecord(user: PrismaUserWithRelations): Promise<PrismaUserWithRelations> {
  if (!isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN') return user
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPERADMIN' },
  })
  return { ...user, role: 'SUPERADMIN' }
}

// ── Пошук користувача за ID ───────────────
export async function findUserById(id: string): Promise<UserWithSub | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      progress: true,
      mentorConfig: true,
    },
  })

  if (!user) return null
  const normalizedUser = await ensureSuperAdminRoleForRecord(user)
  return toUserWithSub(normalizedUser)
}

// ── Пошук користувача за email ─────────────
export async function findUserByEmail(email: string): Promise<UserWithSub | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      progress: true,
      mentorConfig: true,
    },
  })

  if (!user) return null
  const normalizedUser = await ensureSuperAdminRoleForRecord(user)
  return toUserWithSub(normalizedUser)
}

export type UpdateUserSettingsPayload = {
  firstName?: string | null
  lastName?: string | null
  settings?: {
    accentColor?: string | null
    theme?: string | null
    language?: string | null
  }
}

export async function updateUserSettings(userId: string, payload: UpdateUserSettingsPayload): Promise<UserWithSub> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { uiSettings: true },
  })
  const currentSettings = existing?.uiSettings && typeof existing.uiSettings === 'object' && !Array.isArray(existing.uiSettings)
    ? (existing.uiSettings as Record<string, unknown>)
    : {}
  const mergedSettings: Prisma.JsonValue = payload.settings && Object.keys(payload.settings).length
    ? ({ ...currentSettings, ...payload.settings } as Prisma.JsonValue)
    : (currentSettings as Prisma.JsonValue)

  const shouldPersistSettings =
    typeof mergedSettings === 'object' &&
    !Array.isArray(mergedSettings) &&
    Object.keys(mergedSettings as Record<string, unknown>).length > 0
  const uiPayload: Prisma.JsonValue | undefined = shouldPersistSettings ? (mergedSettings as Prisma.JsonObject) : undefined

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: payload.firstName ?? undefined,
      lastName: payload.lastName ?? undefined,
      uiSettings: uiPayload,
    },
  })

  const updated = await findUserById(userId)
  if (!updated) throw new Error('user_not_found_after_update')
  return updated
}

// ── Конвертація Prisma user → UserWithSub ─────────────
function toUserWithSub(user: PrismaUserWithRelations): UserWithSub {
  const { uiSettings, ...rest } = user as PrismaUserWithRelations & { uiSettings?: unknown }
  const sanitizedSettings = uiSettings && typeof uiSettings === 'object' && !Array.isArray(uiSettings)
    ? (uiSettings as Record<string, unknown>)
    : null
  return {
    ...rest,
    uiSettings: sanitizedSettings,
    subscription: user.subscriptions[0] ?? null,
    userProgress: user.progress
      ? {
          level: user.progress.level,
          totalPoints: user.progress.totalPoints,
          completedBlocks: user.progress.completedBlocks,
        }
      : null,
    mentorConfigs: user.mentorConfig ? [user.mentorConfig] : [], // ✅ завжди масив
  }
}

// ── Конвертація UserWithSub → SafeUser ─────────────
export function toSafeUser(user: UserWithSub): SafeUser {
  const sub = user.subscription
  const now = new Date()
  const isSuperAdmin = user.email ? isSuperAdminEmail(user.email) : false

  const isPaid = sub?.status === 'ACTIVE' && (!sub.currentPeriodEnd || sub.currentPeriodEnd > now)
  const isTrial = sub?.status === 'TRIAL' && !!sub.trialEndsAt && sub.trialEndsAt > now

  const abilities = isSuperAdmin
    ? Object.values(ABILITIES)
    : resolveUserAbilities({ role: user.role })

  const rawConfig = user.mentorConfigs?.[0]?.config
  const configObject = rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)
    ? rawConfig as Record<string, unknown>
    : {}
  const mentorUi = configObject.ui && typeof configObject.ui === 'object' && !Array.isArray(configObject.ui)
    ? configObject.ui as Record<string, unknown>
    : {}
  const fallbackUiSettings = user.uiSettings && typeof user.uiSettings === 'object' && !Array.isArray(user.uiSettings)
    ? user.uiSettings as Record<string, unknown>
    : {}
  const resolvedUi = { ...mentorUi, ...fallbackUiSettings }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isAdmin: user.role === 'SUPERADMIN' || isSuperAdmin,
    isSuperAdmin,
    abilities,
    access: {
      plan: isPaid ? 'paid' : isTrial ? 'trial' : 'free',
      isPaid,
      isTrial,
      trialEnd: sub?.trialEndsAt?.toISOString() ?? null,
    },
    stats: {
      totalPoints: user.userProgress?.totalPoints ?? 0,
      completedBlocks: user.userProgress?.completedBlocks ?? 0,
      level: user.userProgress?.level ?? 1,
    },
    settings: {
      accentColor: typeof resolvedUi.accentColor === 'string' ? resolvedUi.accentColor : null,
      theme: typeof resolvedUi.theme === 'string' ? resolvedUi.theme : null,
      language: typeof resolvedUi.language === 'string' ? resolvedUi.language : null,
    },
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    subscriptionStatus: normalizeSubscriptionStatus(sub?.status ?? null),
    subscriptionPlan: normalizeSubscriptionPlan(sub?.planCode ?? null),
    trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
    isTrialActive: isTrial,
  }
}

export async function promoteUserToAdminIfNeeded(userId: string): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!existing || existing.role === 'SUPERADMIN' || existing.role === 'ADMIN') return
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'ADMIN' },
  })
}

// ── Оновлення lastLoginAt ─────────────────
export async function markUserLoggedIn(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  })
}
