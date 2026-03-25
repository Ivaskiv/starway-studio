import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../../db/client.js'
import type { AuthUser, SafeUser, UserWithSub } from '../../types/globalTypes.js'
import { Prisma } from '@starway/db/prisma-client'
import { isSuperAdminEmail } from './superadmin.js'
import { resolveUserAbilities, ABILITIES } from './abilities.js'
import { normalizeSubscriptionPlan, normalizeSubscriptionStatus } from '../subscriptions/utils.js'
import { startTrial } from '../trial/service.js'
import { attachEmailToUser, resolveOrCreateTelegramGuestUser } from '../user/identity.service.js'
import { findLinkedUserId } from '../telegram-mentor/services/linking.service.js'
import { verifyTelegramInitData } from './telegram.js'
import { AuthServiceError } from './auth.errors.js'

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

function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

function toAuthServiceError(error: unknown, fallbackCode = 'auth_internal_error'): AuthServiceError {
  if (error instanceof AuthServiceError) return error

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') {
      return new AuthServiceError('auth_schema_mismatch', 500, 'Auth table mismatch')
    }
    if (error.code === 'P2022') {
      return new AuthServiceError('auth_schema_mismatch', 500, 'Auth schema mismatch')
    }
    if (error.code === 'P2002') {
      return new AuthServiceError('email_exists', 400, 'Email already exists')
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AuthServiceError('auth_query_invalid', 500, 'Invalid auth query')
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new AuthServiceError('auth_db_unavailable', 500, 'Database unavailable')
  }

  return new AuthServiceError(fallbackCode, 500)
}

function isMissingStructureError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  )
}

const USER_BASE_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  role: true,
  passwordHash: true,
  telegramUserId: true,
  telegramUserName: true,
  telegramChatId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  uiSettings: true,
})

type PrismaUserBase = Prisma.UserGetPayload<{
  select: typeof USER_BASE_SELECT
}>

type UserDecorations = Pick<UserWithSub, 'subscription' | 'userProgress' | 'mentorConfigs' | 'notificationPreference'>

type NotificationTypesPayload = {
  dailyMorning?: boolean
  dailyEvening?: boolean
  weeklySummary?: boolean
  streakAlert?: boolean
  streakBroken?: boolean
  levelUp?: boolean
  subscription?: boolean
  aiReminders?: boolean
}

function parseTimeStringToMinutes(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return fallback
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return fallback
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback
  return hours * 60 + minutes
}

function formatMinutesToTimeString(value: number | null | undefined, fallback: string): string {
  if (!Number.isInteger(value)) return fallback
  const safeValue = value as number
  const normalized = Math.min(Math.max(safeValue, 0), 23 * 60 + 59)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function normalizeNotificationTypes(input: NotificationTypesPayload | undefined) {
  return {
    dailyMorning: input?.dailyMorning ?? true,
    dailyEvening: input?.dailyEvening ?? true,
    weeklySummary: input?.weeklySummary ?? true,
    streakAlert: input?.streakAlert ?? true,
    streakBroken: input?.streakBroken ?? true,
    levelUp: input?.levelUp ?? true,
    subscription: input?.subscription ?? true,
    aiReminders: input?.aiReminders ?? true,
  }
}

export interface AuthTokensPayload {
  user: SafeUser
  accessToken: string
  refreshToken: string
  needsProfile: boolean
  expiresIn: number
  isNewUser?: boolean
  needsCompletion?: boolean
}

type SocialAuthInput = {
  provider: 'google' | 'telegram'
  externalId: string
  email?: string | null
  name?: string | null
  username?: string | null
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
  if (!(await checkRefreshTableAvailability())) {
    fallbackRefreshTokens.set(token, { userId, expiresAt })
    return { token, userId, expiresAt }
  }

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
  try {
    if (await checkRefreshTableAvailability()) {
      return await prisma.refreshToken.deleteMany({ where: { token } })
    }
    fallbackRefreshTokens.delete(token)
    return { count: 0 }
  } catch (error) {
    throw toAuthServiceError(error, 'refresh_token_remove_failed')
  }
}

export async function findRefreshToken(token: string) {
  try {
    if (await checkRefreshTableAvailability()) {
      return await prisma.refreshToken.findUnique({ where: { token } })
    }
    const data = fallbackRefreshTokens.get(token)
    if (!data) return null
    return { token, userId: data.userId, expiresAt: data.expiresAt }
  } catch (error) {
    throw toAuthServiceError(error, 'refresh_token_find_failed')
  }
}

async function loadUserDecorations(userId: string): Promise<UserDecorations> {
  const fallback: UserDecorations = {
    subscription: null,
    userProgress: null,
    mentorConfigs: [],
    notificationPreference: null,
  }

  try {
    const [subscription, progress, mentorConfig, notificationPreference] = await Promise.all([
      prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userProgress.findUnique({
        where: { userId },
      }),
      prisma.mentorConfig.findUnique({
        where: { userId },
      }),
      prisma.notificationPreference.findUnique({
        where: { userId },
      }),
    ])

    return {
      subscription,
      userProgress: progress
        ? {
            level: progress.level,
            totalPoints: progress.totalPoints,
            completedBlocks: progress.completedBlocks,
          }
        : null,
      mentorConfigs: mentorConfig ? [mentorConfig] : [],
      notificationPreference,
    }
  } catch (error) {
    if (isMissingStructureError(error)) {
      console.warn('[AuthService] Optional auth relations unavailable, using degraded user payload')
      return fallback
    }
    throw error
  }
}

function toUserWithSub(baseUser: PrismaUserBase, decorations: UserDecorations): UserWithSub {
  const sanitizedSettings = baseUser.uiSettings && typeof baseUser.uiSettings === 'object' && !Array.isArray(baseUser.uiSettings)
    ? (baseUser.uiSettings as Record<string, unknown>)
    : null

  return {
    id: baseUser.id,
    email: baseUser.email,
    name: baseUser.name,
    firstName: baseUser.firstName,
    lastName: baseUser.lastName,
    role: baseUser.role,
    passwordHash: baseUser.passwordHash,
    telegramUserId: baseUser.telegramUserId,
    telegramUserName: baseUser.telegramUserName,
    telegramChatId: baseUser.telegramChatId,
    lastLoginAt: baseUser.lastLoginAt,
    createdAt: baseUser.createdAt,
    updatedAt: baseUser.updatedAt,
    uiSettings: sanitizedSettings,
    subscription: decorations.subscription,
    userProgress: decorations.userProgress,
    mentorConfigs: decorations.mentorConfigs,
    notificationPreference: decorations.notificationPreference,
  }
}

async function hydrateUser(baseUser: PrismaUserBase): Promise<UserWithSub> {
  const decorations = await loadUserDecorations(baseUser.id)
  return toUserWithSub(baseUser, decorations)
}

async function findRawUserById(id: string): Promise<PrismaUserBase | null> {
  return prisma.user.findUnique({
    where: { id },
    select: USER_BASE_SELECT,
  })
}

async function findRawUserByEmail(email: string): Promise<PrismaUserBase | null> {
  return prisma.user.findUnique({
    where: { email },
    select: USER_BASE_SELECT,
  })
}

async function ensureSuperAdminRoleForRecord(user: PrismaUserBase): Promise<PrismaUserBase> {
  if (!isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN') return user
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPERADMIN' },
    })
    return { ...user, role: 'SUPERADMIN' }
  } catch (error) {
    throw toAuthServiceError(error, 'superadmin_role_update_failed')
  }
}

// ── Пошук користувача за ID ───────────────
export async function findUserById(id: string): Promise<UserWithSub | null> {
  try {
    const user = await findRawUserById(id)
    if (!user) return null
    const normalizedUser = await ensureSuperAdminRoleForRecord(user)
    return hydrateUser(normalizedUser)
  } catch (error) {
    throw toAuthServiceError(error, 'find_user_by_id_failed')
  }
}

// ── Пошук користувача за email ─────────────
export async function findUserByEmail(email: string): Promise<UserWithSub | null> {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null

  try {
    const user = await findRawUserByEmail(normalizedEmail)
    if (!user) return null
    const normalizedUser = await ensureSuperAdminRoleForRecord(user)
    return hydrateUser(normalizedUser)
  } catch (error) {
    throw toAuthServiceError(error, 'find_user_by_email_failed')
  }
}

export type UpdateUserSettingsPayload = {
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  settings?: {
    accentColor?: string | null
    theme?: string | null
    language?: string | null
    notifications?: {
      enabled?: boolean
      morningTime?: string | null
      eveningTime?: string | null
        types?: {
          dailyMorning?: boolean
          dailyEvening?: boolean
          weeklySummary?: boolean
          streakAlert?: boolean
          streakBroken?: boolean
          levelUp?: boolean
          subscription?: boolean
          aiReminders?: boolean
        }
      }
  }
}

export async function updateUserSettings(userId: string, payload: UpdateUserSettingsPayload): Promise<UserWithSub> {
  try {
    const normalizedEmail = payload.email ? normalizeEmail(payload.email) : null
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { uiSettings: true, email: true },
    })
    if (!existing) {
      throw new AuthServiceError('user_not_found', 404)
    }

    const currentSettings = existing.uiSettings && typeof existing.uiSettings === 'object' && !Array.isArray(existing.uiSettings)
      ? (existing.uiSettings as Record<string, unknown>)
      : {}
    const { notifications: notificationPayload, ...uiSettingsPayload } = payload.settings ?? {}
    const legacyFreeCurrentSettings = { ...currentSettings }
    delete legacyFreeCurrentSettings.notifications
    const mergedSettings: Prisma.JsonValue = Object.keys(uiSettingsPayload).length
      ? ({ ...legacyFreeCurrentSettings, ...uiSettingsPayload } as Prisma.JsonValue)
      : (legacyFreeCurrentSettings as Prisma.JsonValue)

    const shouldPersistSettings =
      typeof mergedSettings === 'object' &&
      !Array.isArray(mergedSettings) &&
      Object.keys(mergedSettings as Record<string, unknown>).length > 0
    const uiPayload: Prisma.JsonValue | undefined = shouldPersistSettings ? (mergedSettings as Prisma.JsonObject) : undefined

    if (normalizedEmail && normalizedEmail !== existing.email) {
      try {
        await attachEmailToUser(userId, normalizedEmail)
      } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_EMAIL') {
          throw new AuthServiceError('invalid_email', 400)
        }
        if (error instanceof Error && error.message === 'IDENTITY_MERGE_CONFLICT') {
          throw new AuthServiceError('email_exists', 400)
        }
        throw error
      }
    }

    await prisma.$transaction(async tx => {
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: payload.firstName ?? undefined,
          lastName: payload.lastName ?? undefined,
          uiSettings: uiPayload,
        },
      })

      if (notificationPayload) {
        const normalizedTypes = normalizeNotificationTypes(notificationPayload.types)
        await tx.notificationPreference.upsert({
          where: { userId },
          create: {
            userId,
            telegramEnabled: notificationPayload.enabled ?? true,
            emailEnabled: false,
            dailyMorningTime: parseTimeStringToMinutes(notificationPayload.morningTime, 9 * 60),
            dailyEveningTime: parseTimeStringToMinutes(notificationPayload.eveningTime, 21 * 60),
            timezone: 'Europe/Kyiv',
            dailyMorningEnabled: normalizedTypes.dailyMorning,
            dailyEveningEnabled: normalizedTypes.dailyEvening,
            levelUpEnabled: normalizedTypes.levelUp,
            streakRiskEnabled: normalizedTypes.streakAlert,
            streakBrokenEnabled: normalizedTypes.streakBroken,
            weeklySummaryEnabled: normalizedTypes.weeklySummary,
            streakAlertsEnabled: normalizedTypes.streakAlert || normalizedTypes.streakBroken,
            subscriptionEnabled: normalizedTypes.subscription,
            aiRemindersEnabled: normalizedTypes.aiReminders,
          },
          update: {
            telegramEnabled: notificationPayload.enabled ?? undefined,
            dailyMorningTime: notificationPayload.morningTime
              ? parseTimeStringToMinutes(notificationPayload.morningTime, 9 * 60)
              : undefined,
            dailyEveningTime: notificationPayload.eveningTime
              ? parseTimeStringToMinutes(notificationPayload.eveningTime, 21 * 60)
              : undefined,
            dailyMorningEnabled: normalizedTypes.dailyMorning,
            dailyEveningEnabled: normalizedTypes.dailyEvening,
            levelUpEnabled: normalizedTypes.levelUp,
            streakRiskEnabled: normalizedTypes.streakAlert,
            streakBrokenEnabled: normalizedTypes.streakBroken,
            weeklySummaryEnabled: normalizedTypes.weeklySummary,
            streakAlertsEnabled: normalizedTypes.streakAlert || normalizedTypes.streakBroken,
            subscriptionEnabled: normalizedTypes.subscription,
            aiRemindersEnabled: normalizedTypes.aiReminders,
          },
        })
      }
    })

    const updated = await findUserById(userId)
    if (!updated) throw new AuthServiceError('user_not_found_after_update', 404)
    return updated
  } catch (error) {
    throw toAuthServiceError(error, 'update_user_settings_failed')
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
  const notificationPreference = user.notificationPreference
  const normalizedNotificationSettings = notificationPreference
    ? {
        enabled: notificationPreference.telegramEnabled,
        morningTime: formatMinutesToTimeString(notificationPreference.dailyMorningTime, '09:00'),
        eveningTime: formatMinutesToTimeString(notificationPreference.dailyEveningTime, '21:00'),
        types: {
          dailyMorning: notificationPreference.dailyMorningEnabled,
          dailyEvening: notificationPreference.dailyEveningEnabled,
          weeklySummary: notificationPreference.weeklySummaryEnabled,
          streakAlert: notificationPreference.streakRiskEnabled,
          streakBroken: notificationPreference.streakBrokenEnabled,
          levelUp: notificationPreference.levelUpEnabled,
          subscription: notificationPreference.subscriptionEnabled,
          aiReminders: notificationPreference.aiRemindersEnabled,
        },
      }
    : (
      typeof resolvedUi.notifications === 'object' &&
      resolvedUi.notifications !== null &&
      !Array.isArray(resolvedUi.notifications)
        ? resolvedUi.notifications as Record<string, unknown>
        : undefined
    )

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    telegramUserId: user.telegramUserId,
    telegramUserName: user.telegramUserName,
    telegramChatId: user.telegramChatId,
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
      notifications: normalizedNotificationSettings,
    },
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    subscriptionStatus: normalizeSubscriptionStatus(sub?.status ?? null),
    subscriptionPlan: normalizeSubscriptionPlan(sub?.planCode ?? null),
    trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
    isTrialActive: isTrial,
  }
}

export async function promoteUserToAdminIfNeeded(userId: string): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (!existing || existing.role === 'SUPERADMIN' || existing.role === 'ADMIN') return
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    })
  } catch (error) {
    throw toAuthServiceError(error, 'promote_user_failed')
  }
}

// ── Оновлення lastLoginAt ─────────────────
export async function markUserLoggedIn(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
  } catch (error) {
    throw toAuthServiceError(error, 'mark_user_logged_in_failed')
  }
}

export async function registerUser(input: {
  email: string
  password: string
  name?: string | null
}): Promise<AuthTokensPayload> {
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')

  if (!email || !password) {
    throw new AuthServiceError('missing_fields', 400)
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      throw new AuthServiceError('email_exists', 400)
    }

    const passwordHash = await hashPassword(password)
    const initialRole = isSuperAdminEmail(email) ? 'SUPERADMIN' : 'USER'

    const createdUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: input.name?.trim() || null,
        role: initialRole,
      },
      select: { id: true },
    })

    const user = await findUserById(createdUser.id)
    if (!user) {
      throw new AuthServiceError('user_creation_failed', 500)
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role, email: user.email } as AuthUser)
    const refreshToken = generateRefreshToken(user.id)
    await storeRefreshToken(user.id, refreshToken)
    await startTrial(createdUser.id).catch(err =>
      console.error('[Auth] startTrial failed:', err)
    )

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      needsProfile: !user.name,
      expiresIn: 15 * 60,
    }
  } catch (error) {
    throw toAuthServiceError(error, 'register_failed')
  }
}

export async function loginUser(input: {
  email: string
  password: string
}): Promise<AuthTokensPayload> {
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')

  if (!email || !password) {
    throw new AuthServiceError('missing_fields', 400)
  }

  try {
    const user = await findUserByEmail(email)

    if (!user) {
      throw new AuthServiceError('user_not_registered', 404, 'Користувач ще не зареєстрований')
    }

    if (!user.passwordHash) {
      throw new AuthServiceError('invalid_credentials', 401)
    }

    const isValid = await comparePassword(password, user.passwordHash)
    if (!isValid) {
      throw new AuthServiceError('invalid_credentials', 401)
    }

    await markUserLoggedIn(user.id)

    const freshUser = await findUserById(user.id)
    if (!freshUser) {
      throw new AuthServiceError('user_not_found', 404)
    }

    const accessToken = generateAccessToken({ id: freshUser.id, role: freshUser.role, email: freshUser.email } as AuthUser)
    const refreshToken = generateRefreshToken(freshUser.id)
    await storeRefreshToken(freshUser.id, refreshToken)

    return {
      user: toSafeUser(freshUser),
      accessToken,
      refreshToken,
      needsProfile: !freshUser.name,
      expiresIn: 15 * 60,
    }
  } catch (error) {
    throw toAuthServiceError(error, 'login_failed')
  }
}

export async function socialLoginUser(input: SocialAuthInput): Promise<AuthTokensPayload> {
  const provider = input.provider
  const externalId = String(input.externalId ?? '').trim()

  if (!provider || !externalId) {
    throw new AuthServiceError('missing_fields', 400)
  }

  try {
    let userId: string | null = null
    let isNewUser = false

    if (provider === 'google') {
      const email = normalizeEmail(input.email ?? '')
      if (!email) {
        throw new AuthServiceError('missing_fields', 400)
      }

      const existing = await findUserByEmail(email)
      if (existing?.id) {
        userId = existing.id
      } else {
        const created = await prisma.user.create({
          data: {
            email,
            name: input.name?.trim() || null,
            firstName: input.name?.trim() || null,
            role: isSuperAdminEmail(email) ? 'SUPERADMIN' : 'USER',
            lastLoginAt: new Date(),
          },
          select: { id: true },
        })
        userId = created.id
        isNewUser = true
        await startTrial(created.id).catch(err =>
          console.error('[Auth] startTrial failed for social login:', err)
        )
      }
    } else {
      const telegramUserId = externalId
      const telegramUserName = input.username?.trim() || null
      const linkedUserId = await findLinkedUserId({
        chatId: telegramUserId,
        telegramUserId,
        telegramUserName,
      })

      if (linkedUserId) {
        userId = linkedUserId
      } else {
        const createdUserId = await resolveOrCreateTelegramGuestUser({
          linkedUserId: null,
          telegramUserId,
          telegramUserName,
          chatId: telegramUserId,
          firstName: input.name?.trim() || telegramUserName || 'Учень',
        })
        userId = createdUserId
        isNewUser = true
      }
    }

    if (!userId) {
      throw new AuthServiceError('user_creation_failed', 500)
    }

    await markUserLoggedIn(userId)

    const freshUser = await findUserById(userId)
    if (!freshUser) {
      throw new AuthServiceError('user_not_found', 404)
    }

    const accessToken = generateAccessToken({ id: freshUser.id, role: freshUser.role, email: freshUser.email } as AuthUser)
    const refreshToken = generateRefreshToken(freshUser.id)
    await storeRefreshToken(freshUser.id, refreshToken)

    return {
      user: toSafeUser(freshUser),
      accessToken,
      refreshToken,
      needsProfile: !freshUser.name,
      needsCompletion: !freshUser.email || !freshUser.name,
      isNewUser,
      expiresIn: 15 * 60,
    }
  } catch (error) {
    throw toAuthServiceError(error, 'social_login_failed')
  }
}

export async function telegramMiniAppLoginUser(initData: string): Promise<AuthTokensPayload> {
  const telegramUser = verifyTelegramInitData(initData)

  return socialLoginUser({
    provider: 'telegram',
    externalId: telegramUser.id,
    username: telegramUser.username ?? undefined,
    name: telegramUser.firstName ?? undefined,
  })
}

export async function getCurrentUser(params: {
  userId?: string
  email?: string | null
}): Promise<UserWithSub> {
  try {
    const userId = params.userId?.trim()
    const email = params.email ? normalizeEmail(params.email) : null

    if (!userId && !email) {
      throw new AuthServiceError('unauthorized', 401)
    }

    const user = userId
      ? await findUserById(userId)
      : await findUserByEmail(email!)

    if (!user) {
      throw new AuthServiceError('user_not_found', 404, 'Користувач ще не зареєстрований')
    }

    return user
  } catch (error) {
    throw toAuthServiceError(error, 'get_current_user_failed')
  }
}
