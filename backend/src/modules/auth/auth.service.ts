// backend/src/modules/auth/auth.service.ts
import type { User, Subscription, UserProgress } from '@/db/generated/prisma/client.js'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'
import { prisma } from '../../db/client.js'
import { sendPasswordResetEmail } from './mail.service.js'
import { isSuperAdminEmail } from './superadmin.js'
import { ABILITIES, resolveUserAbilities } from './abilities.js'
import type { JwtPayload, RegisterInput } from './auth.types.js'

const JWT_SECRET         = process.env.JWT_SECRET         || 'starway-secret-dev'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'starway-refresh-secret-dev'
const JWT_RESET_SECRET   = process.env.JWT_RESET_SECRET   || 'starway-reset-secret-dev'
const JWT_EXPIRES        = '15m'
const REFRESH_EXPIRES    = '30d'
const RESET_EXPIRES      = '30m'

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })

export const signRefreshToken = (payload: { id: string }): string =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES })

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET) as JwtPayload

export const verifyRefreshToken = (token: string): { id: string } =>
  jwt.verify(token, JWT_REFRESH_SECRET) as { id: string }

type PasswordResetTokenPayload = {
  id: string
  email: string
  ph: string
  purpose: 'password_reset'
}

export const signPasswordResetToken = (payload: PasswordResetTokenPayload): string =>
  jwt.sign(payload, JWT_RESET_SECRET, { expiresIn: RESET_EXPIRES })

export const verifyPasswordResetToken = (token: string): PasswordResetTokenPayload =>
  jwt.verify(token, JWT_RESET_SECRET) as PasswordResetTokenPayload

type ProgressSnapshot = Pick<UserProgress, 'totalPoints' | 'completedBlocks' | 'level'>
type UserWithSub = User & {
  subscription: Subscription | null
  userProgress: ProgressSnapshot | null
  mentorConfigs: Array<{ config: unknown }>
}

type LegacyUserRow = {
  id: string
  email: string
  role: 'USER' | 'ADMIN' | 'MENTOR'
  passwordHash: string | null
  name: string | null
  firstName: string | null
  lastName: string | null
  lastLoginAt: Date | null
}

let usersColumnCache: Set<string> | null = null

async function getUsersColumns(): Promise<Set<string>> {
  if (usersColumnCache) return usersColumnCache
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
  `
  usersColumnCache = new Set(rows.map((r) => r.column_name))
  return usersColumnCache
}

function pickCol(columns: Set<string>, ...candidates: string[]): string | null {
  for (const col of candidates) {
    if (columns.has(col)) return col
  }
  return null
}

async function findUserLegacyBy(whereField: 'id' | 'email', whereValue: string): Promise<LegacyUserRow | null> {
  const cols = await getUsersColumns()
  const passwordCol = pickCol(cols, 'passwordHash', 'password_hash')
  const firstNameCol = pickCol(cols, 'firstName', 'first_name')
  const lastNameCol = pickCol(cols, 'lastName', 'last_name')
  const nameCol = pickCol(cols, 'name', 'display_name')
  const lastLoginCol = pickCol(cols, 'lastLoginAt', 'last_login_at')
  const whereCol = whereField === 'email' ? 'email' : 'id'
  const comparator = whereField === 'email' ? 'LOWER(email) = LOWER($1)' : `${whereCol} = $1`

  // fix_code_x: fallback query for legacy DB schemas (P2022 ColumnNotFound) to keep login working.
  const sql = `
    SELECT
      id,
      email,
      role,
      ${passwordCol ? `"${passwordCol}"` : 'NULL'} AS "passwordHash",
      ${nameCol ? `"${nameCol}"` : 'NULL'} AS "name",
      ${firstNameCol ? `"${firstNameCol}"` : 'NULL'} AS "firstName",
      ${lastNameCol ? `"${lastNameCol}"` : 'NULL'} AS "lastName",
      ${lastLoginCol ? `"${lastLoginCol}"` : 'NULL'} AS "lastLoginAt"
    FROM users
    WHERE ${comparator}
    LIMIT 1
  `

  const rows = await prisma.$queryRawUnsafe<LegacyUserRow[]>(sql, whereValue)
  return rows[0] ?? null
}

function fromLegacyRow(row: LegacyUserRow): UserWithSub {
  const normalizedRole =
    row.role === 'ADMIN' || row.role === 'MENTOR' || row.role === 'USER'
      ? row.role
      : (String(row.role).toUpperCase() as 'USER' | 'ADMIN' | 'MENTOR')

  return {
    id: row.id,
    email: row.email,
    role: normalizedRole,
    passwordHash: row.passwordHash,
    name: row.name,
    firstName: row.firstName,
    lastName: row.lastName,
    telegramUserName: null,
    telegramChatId: null,
    onboardingStage: null,
    onboardingStartedAt: null,
    onboardingCompletedAt: null,
    onboardingCurrentStageStartedAt: null,
    lastLoginAt: row.lastLoginAt,
    subscription: null,
    userProgress: null,
    mentorConfigs: [],
  }
}

export const findUserByEmail = async (
  email: string,
  includePassword = false,
): Promise<UserWithSub | null> => {
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: {
        subscription: true,
        userProgress: {
          select: { totalPoints: true, completedBlocks: true, level: true },
        },
        mentorConfigs: {
          select: { config: true },
          take: 1,
        },
      },
    })

    if (!user) return null

    if (!includePassword) {
      const { passwordHash, ...safe } = user
      return safe as UserWithSub
    }

    return user as UserWithSub
  } catch (error: any) {
    if (error?.code !== 'P2022') throw error
    const legacy = await findUserLegacyBy('email', email)
    if (!legacy) return null
    const user = fromLegacyRow(legacy)
    if (!includePassword) {
      const { passwordHash, ...safe } = user
      return safe as UserWithSub
    }
    return user
  }
}

export const findUserById = async (id: string, includePassword = false): Promise<UserWithSub | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        userProgress: {
          select: { totalPoints: true, completedBlocks: true, level: true },
        },
        mentorConfigs: {
          select: { config: true },
          take: 1,
        },
      },
    })

    if (!user) return null

    if (!includePassword) {
      const { passwordHash, ...safe } = user
      return safe as UserWithSub
    }

    return user as UserWithSub
  } catch (error: any) {
    if (error?.code !== 'P2022') throw error
    const legacy = await findUserLegacyBy('id', id)
    if (!legacy) return null
    const user = fromLegacyRow(legacy)
    if (!includePassword) {
      const { passwordHash, ...safe } = user
      return safe as UserWithSub
    }
    return user
  }
}

export const createUserLocal = async (input: RegisterInput) => {
  const { email, password, name } = input

  const existing = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
  })
  if (existing) throw new Error('email_already_registered')

  const passwordHash = await bcrypt.hash(password, 10)

  return prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name?.trim() || null,
      role: 'USER',
      subscription: {
        create: {
          status: 'TRIAL',
          plan: 'FREE',
          trialStartsAt: new Date(),
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      userProgress: {
        create: {},
      },
    },
    include: {
      subscription: true,
      userProgress: {
        select: { totalPoints: true, completedBlocks: true, level: true },
      },
      mentorConfigs: {
        select: { config: true },
        take: 1,
      },
    },
  })
}

type SocialAuthInput = {
  provider: 'google' | 'telegram'
  externalId: string
  email?: string
  name?: string
  username?: string
}

export const findOrCreateSocialUser = async (input: SocialAuthInput): Promise<UserWithSub> => {
  const provider = input.provider
  const externalId = input.externalId.trim()
  const normalizedEmail = input.email?.toLowerCase().trim()

  if (!externalId) {
    throw new Error('provider_and_external_id_required')
  }

  if (provider === 'google' && !normalizedEmail) {
    throw new Error('email_required_for_google_auth')
  }

  let user = normalizedEmail
    ? await prisma.user.findFirst({
        where: { email: normalizedEmail },
        include: {
          subscription: true,
          userProgress: { select: { totalPoints: true, completedBlocks: true, level: true } },
          mentorConfigs: { select: { config: true }, take: 1 },
        },
      })
    : null

  if (!user && provider === 'telegram') {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramChatId: externalId },
          ...(input.username ? [{ telegramUserName: input.username.replace('@', '').trim() }] : []),
        ],
      },
      include: {
        subscription: true,
        userProgress: { select: { totalPoints: true, completedBlocks: true, level: true } },
        mentorConfigs: { select: { config: true }, take: 1 },
      },
    })
  }

  if (user) {
    if (provider === 'telegram') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: externalId,
          telegramUserName: input.username?.replace('@', '').trim() || user.telegramUserName || null,
        },
      })
      const refreshed = await findUserById(user.id, true)
      if (refreshed) return refreshed
    }
    return user as UserWithSub
  }

  const generatedEmail =
    normalizedEmail ||
    `telegram_${externalId.replace(/[^a-zA-Z0-9_-]/g, '_')}@starway.local`

  return prisma.user.create({
    data: {
      email: generatedEmail,
      name: input.name?.trim() || input.username?.replace('@', '').trim() || null,
      role: 'USER',
      ...(provider === 'telegram'
        ? {
            telegramChatId: externalId,
            telegramUserName: input.username?.replace('@', '').trim() || null,
          }
        : {}),
      subscription: {
        create: {
          status: 'TRIAL',
          plan: 'FREE',
          trialStartsAt: new Date(),
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      userProgress: {
        create: {},
      },
    },
    include: {
      subscription: true,
      userProgress: { select: { totalPoints: true, completedBlocks: true, level: true } },
      mentorConfigs: { select: { config: true }, take: 1 },
    },
  }) as Promise<UserWithSub>
}

export const updateUser = async (userId: string, data: { name?: string; email?: string }) =>
  prisma.user.update({ where: { id: userId }, data })

export const deleteUser = async (userId: string) =>
  prisma.user.delete({ where: { id: userId } })

export const validatePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash)
export const hashPassword = (password: string) => bcrypt.hash(password, 10)

export const markUserLoggedIn = async (userId: string) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
  } catch (error: any) {
    // fix_code_x: do not fail login if legacy DB is missing lastLoginAt column.
    if (error?.code !== 'P2022') throw error
  }
}

export const toSafeUser = (user: UserWithSub) => {
  const now = new Date()
  const sub = user.subscription
  const isSuperAdmin = isSuperAdminEmail(user.email)

  const isPaid = sub?.status === 'ACTIVE' && (!sub.endsAt || sub.endsAt > now)
  const isTrial =
    !isPaid &&
    sub?.status === 'TRIAL' &&
    !!sub.trialEndsAt &&
    sub.trialEndsAt > now

  const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || null
  const role: 'user' | 'admin' | 'mentor' =
    user.role === 'ADMIN' ? 'admin' : user.role === 'MENTOR' ? 'mentor' : 'user'
  const rawConfig = (user.mentorConfigs?.[0]?.config ?? {}) as Record<string, any>
  const uiConfig = (rawConfig.ui ?? {}) as Record<string, any>

  return {
    id: user.id,
    email: user.email,
    name,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    role,
    isAdmin: user.role === 'ADMIN' || isSuperAdmin,
    isSuperAdmin,
    abilities: isSuperAdmin
      ? (Object.values(ABILITIES) as string[])
      : resolveUserAbilities(user),
    access: {
      plan: (isSuperAdmin ? 'paid' : isPaid ? 'paid' : isTrial ? 'trial' : 'free') as
        | 'paid'
        | 'trial'
        | 'free',
      isPaid: isSuperAdmin ? true : isPaid,
      isTrial: isSuperAdmin ? false : isTrial,
      trialEnd: sub?.trialEndsAt?.toISOString() ?? null,
    },
    subscriptionStatus: sub?.status ?? null,
    subscriptionPlan: sub?.plan ?? null,
    trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
    isTrialActive: isTrial,
    stats: {
      totalPoints: user.userProgress?.totalPoints ?? 0,
      completedBlocks: user.userProgress?.completedBlocks ?? 0,
      level: user.userProgress?.level ?? 1,
    },
    settings: {
      accentColor: typeof uiConfig.accentColor === 'string' ? uiConfig.accentColor : null,
      theme: typeof uiConfig.theme === 'string' ? uiConfig.theme : null,
      language: typeof uiConfig.language === 'string' ? uiConfig.language : null,
    },
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  }
}

export const updateUserUiSettings = async (
  userId: string,
  settings: { accentColor?: string; theme?: string; language?: string },
) => {
  const existing = await prisma.mentorConfig.findUnique({
    where: { userId },
    select: { config: true },
  })

  const prev = ((existing?.config as Record<string, any> | null) ?? {}) as Record<string, any>
  const prevUi = ((prev.ui as Record<string, any> | null) ?? {}) as Record<string, any>

  // fix_code_x: persist UI settings in mentorConfigs.config.ui (no DB migration required).
  const mergedConfig = {
    ...prev,
    ui: {
      ...prevUi,
      ...Object.fromEntries(
        Object.entries(settings).filter(([, value]) => typeof value === 'string' && value.length > 0),
      ),
    },
  }

  await prisma.mentorConfig.upsert({
    where: { userId },
    update: { config: mergedConfig },
    create: { userId, config: mergedConfig },
  })

  return findUserById(userId, true)
}

function getPasswordFingerprint(passwordHash: string | null | undefined): string {
  return createHash('sha256').update(passwordHash ?? 'no-password').digest('hex')
}

export const requestPasswordReset = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim()
  const user = await findUserByEmail(normalizedEmail, true)

  // fix code_x: always return success-like response to avoid user enumeration by email.
  if (!user) {
    return { ok: true as const, emailSent: false as const }
  }

  const resetToken = signPasswordResetToken({
    id: user.id,
    email: user.email.toLowerCase().trim(),
    ph: getPasswordFingerprint(user.passwordHash),
    purpose: 'password_reset',
  })

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`
  const emailSent = await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
  })

  if (process.env.NODE_ENV === 'production' || emailSent) {
    return {
      ok: true as const,
      emailSent,
    }
  }

  return {
    ok: true as const,
    emailSent,
    resetToken,
    resetUrl,
  }
}

export const resetPasswordByToken = async (token: string, newPassword: string) => {
  let decoded: PasswordResetTokenPayload
  try {
    decoded = verifyPasswordResetToken(token)
  } catch {
    throw new Error('invalid_or_expired_reset_token')
  }

  if (decoded.purpose !== 'password_reset') {
    throw new Error('invalid_or_expired_reset_token')
  }

  const user = await findUserById(decoded.id, true)
  if (!user) {
    throw new Error('invalid_or_expired_reset_token')
  }

  const emailMatches = user.email.toLowerCase().trim() === decoded.email.toLowerCase().trim()
  const fingerprintMatches = getPasswordFingerprint(user.passwordHash) === decoded.ph
  if (!emailMatches || !fingerprintMatches) {
    throw new Error('invalid_or_expired_reset_token')
  }

  const nextHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: nextHash },
  })

  return { ok: true as const }
}
