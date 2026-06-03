import jwt, { type SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../../db/client.js'
import type { AuthUser, SafeUser, UserWithSub } from '../../types/globalTypes.js'
import { Prisma } from '@starway/db/prisma-client'
import { isSuperAdminEmail } from './superadmin.js'
import { resolveUserAbilities, ABILITIES } from './abilities.js'
import { computeAvailableRoles, resolveActiveRole } from './roleUtils.js'
import { normalizeSubscriptionPlan, normalizeSubscriptionStatus } from '../subscriptions/utils.js'
import { attachEmailToUser } from '../user/identity.service.js'
import { verifyTelegramInitData } from './telegram.js'
import { AuthServiceError } from './auth.errors.js'
import { assignUserToExpert, resolveDefaultMentorOwnerExpertId } from '../experts/ownership.service.js'
import { cacheGet, cacheSet } from '../../lib/cache/index.js'
import { invalidateUserCache } from '../../lib/db/userCache.js'
import { UserAutoCreationDisabledError, UserCreationSource } from '../user/userCreation.service.js'
import { resolveOrCreateUser } from '../user/resolveOrCreateUser.js'

// ── Константи JWT ─────────────────────
const ACCESS_SECRET = getEnv('JWT_ACCESS_SECRET')
const REFRESH_SECRET = getEnv('JWT_REFRESH_SECRET')
const ACCESS_EXPIRES = (process.env.JWT_EXPIRES_IN?.trim() || '15m') as SignOptions['expiresIn']
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES_IN?.trim() || '30d') as SignOptions['expiresIn']

function getEnv(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

async function validateExpertId(expertId: string | null | undefined): Promise<string | null> {
  const value = String(expertId ?? '').trim()
  if (!value) return null

  const expert = await prisma.expert.findUnique({
    where: { id: value },
    select: { id: true },
  }).catch(() => null)

  return expert?.id ?? null
}

async function resolveRequestedExpertId(expertId: string | null | undefined): Promise<string | null> {
  try {
    const explicitExpertId = await validateExpertId(expertId)
    if (explicitExpertId) return explicitExpertId
    return await resolveDefaultMentorOwnerExpertId()
  } catch (error) {
    console.warn('[AuthService] resolveRequestedExpertId fallback to null', error)
    return null
  }
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
      return new AuthServiceError('email_already_registered', 400, 'Email already exists')
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AuthServiceError('auth_query_invalid', 500, 'Invalid auth query')
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('[auth] PrismaClientInitializationError', {
      message: error.message,
      errorCode: error.errorCode ?? null,
      ts: new Date().toISOString(),
    })
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

async function createUserCompat(input: {
  email: string
  passwordHash?: string | null
  firstName?: string | null
  role: 'USER' | 'SUPERADMIN'
  expertId?: string | null
  lastLoginAt?: Date | null
  source?: UserCreationSource
  requestId?: string | null
}): Promise<{ id: string }> {
  const resolved = await resolveOrCreateUser(
    { email: input.email },
    {
      source: input.source ?? UserCreationSource.SYSTEM,
      requestId: input.requestId ?? null,
      name: input.firstName ?? null,
      passwordHash: input.passwordHash ?? null,
      role: input.role,
      expertId: input.expertId ?? null,
      createData: {
        lastLoginAt: input.lastLoginAt ?? null,
      },
    },
  ).catch((error) => {
    if (error instanceof UserAutoCreationDisabledError) {
      throw new AuthServiceError('user_not_registered', 404, 'Користувач ще не зареєстрований')
    }
    throw error
  })

  return { id: resolved.user.id }
}

async function resolveTelegramSocialUser(input: SocialAuthInput): Promise<{ id: string; created: boolean; expertId: string | null }> {
  const telegramUserId = String(input.externalId ?? '').trim()
  const telegramUserName = input.username?.trim() || null
  const validatedExpertId = await resolveRequestedExpertId(input.expertId)

  const resolved = await resolveOrCreateUser(
    {
      telegramId: telegramUserId,
      chatId: telegramUserId,
      telegramUserName: telegramUserName ?? undefined,
      email: input.email ?? undefined,
    },
    {
      source: UserCreationSource.TELEGRAM_MINIAPP,
      requestId: input.requestId ?? null,
      name: input.name?.trim() || telegramUserName || 'Учень',
      expertId: validatedExpertId,
      createData: {
        telegramEnabled: true,
      },
    },
  ).catch((error) => {
    if (error instanceof UserAutoCreationDisabledError) {
      throw new AuthServiceError('user_not_registered', 404, 'Користувач ще не зареєстрований')
    }
    throw error
  })

  return {
    id: resolved.user.id,
    created: resolved.created,
    expertId: validatedExpertId,
  }
}

const USER_BASE_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
    firstName: true,
  lastName: true,
  expertId: true,
  role: true,
  activeRole: true,
  passwordHash: true,
  telegramUserId: true,
  telegramUserName: true,
  telegramChatId: true,
  telegramEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  settings: true,
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function resolveUiSettingsFromUser(
  user: { settings?: unknown; uiSettings?: unknown },
): Record<string, unknown> {
  const settingsRecord = asRecord(user.settings)
  const uiFromSettings = asRecord(settingsRecord?.ui)
  if (uiFromSettings) return { ...uiFromSettings }
  const legacyUi = asRecord(user.uiSettings)
  return legacyUi ? { ...legacyUi } : {}
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
  expertId?: string | null
  requestId?: string | null
}

function hasProfileName(input: { name?: string | null; firstName?: string | null; lastName?: string | null }): boolean {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim()
  if (fullName) return true
  return Boolean(input.name && input.name.trim())
}

// ── Хешування пароля ──────────────────
export const hashPassword = (password: string) => bcrypt.hash(password, 12)
export const comparePassword = (password: string, hash: string) =>
  bcrypt.compare(password, hash)

// ── Генерація та перевірка токенів ───
export function generateAccessToken(payload: AuthUser) {
  if (!ACCESS_SECRET) {
    throw new AuthServiceError('jwt_access_secret_missing', 500, 'JWT access secret missing')
  }
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES })
}

export function generateRefreshToken(userId: string) {
  if (!REFRESH_SECRET) {
    throw new AuthServiceError('jwt_refresh_secret_missing', 500, 'JWT refresh secret missing')
  }
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
const MAX_FALLBACK_REFRESH_TOKENS = 500
let refreshTableAvailable: boolean | undefined

function pruneFallbackRefreshTokens() {
  const now = Date.now()

  for (const [key, value] of fallbackRefreshTokens.entries()) {
    if (value.expiresAt.getTime() <= now) {
      fallbackRefreshTokens.delete(key)
    }
  }

  while (fallbackRefreshTokens.size > MAX_FALLBACK_REFRESH_TOKENS) {
    const oldestKey = fallbackRefreshTokens.keys().next().value
    if (!oldestKey) return
    fallbackRefreshTokens.delete(oldestKey)
  }
}

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
    pruneFallbackRefreshTokens()
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
    pruneFallbackRefreshTokens()
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
  const sanitizedSettings = resolveUiSettingsFromUser(baseUser)

  return {
    id: baseUser.id,
    email: baseUser.email,
        firstName: baseUser.firstName,
    lastName: baseUser.lastName,
    expertId: baseUser.expertId,
    role: baseUser.role,
    activeRole: baseUser.activeRole as any,
    passwordHash: baseUser.passwordHash,
    telegramUserId: baseUser.telegramUserId,
    telegramUserName: baseUser.telegramUserName,
    telegramChatId: baseUser.telegramChatId,
    telegramEnabled: baseUser.telegramEnabled,
    lastLoginAt: baseUser.lastLoginAt,
    createdAt: baseUser.createdAt,
    updatedAt: baseUser.updatedAt,
    uiSettings: Object.keys(sanitizedSettings).length > 0 ? sanitizedSettings : null,
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

function toSafeUserFromBase(user: PrismaUserBase): SafeUser {
  const isSuperAdmin = user.email ? isSuperAdminEmail(user.email) : false
  const abilities = isSuperAdmin
    ? Object.values(ABILITIES)
    : resolveUserAbilities({ role: user.role })
  const availableRoles = computeAvailableRoles({ role: user.role })
  const activeRole = resolveActiveRole((user as any).activeRole ?? user.role, availableRoles)
  const resolvedUi = resolveUiSettingsFromUser(user)
  const notifications = (
    typeof resolvedUi.notifications === 'object' &&
    resolvedUi.notifications !== null &&
    !Array.isArray(resolvedUi.notifications)
  )
    ? resolvedUi.notifications as Record<string, unknown>
    : undefined

  return {
    id: user.id,
    email: user.email,
    name: null,
        firstName: user.firstName,
    lastName: user.lastName,
    telegramUserId: user.telegramUserId,
    telegramUserName: user.telegramUserName,
    telegramChatId: user.telegramChatId,
    telegramEnabled: user.telegramEnabled,
    expertId: user.expertId ?? null,
    role: user.role,
    activeRole,
    availableRoles,
    isAdmin: user.role === 'SUPERADMIN' || isSuperAdmin,
    isSuperAdmin,
    abilities,
    access: {
      plan: 'free',
      isPaid: false,
      isTrial: false,
      trialEnd: null,
    },
    stats: {
      totalPoints: 0,
      completedBlocks: 0,
      level: 1,
    },
    settings: {
      accentColor: typeof resolvedUi.accentColor === 'string' ? resolvedUi.accentColor : null,
      theme: typeof resolvedUi.theme === 'string' ? resolvedUi.theme : null,
      language: typeof resolvedUi.language === 'string' ? resolvedUi.language : null,
      notifications,
    },
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    subscriptionStatus: null,
    subscriptionPlan: null,
    trialEndsAt: null,
    isTrialActive: false,
  }
}

export async function resolveSafeUserById(id: string): Promise<SafeUser | null> {
  const baseUser = await findRawUserById(id)
  if (!baseUser) return null

  try {
    const hydrated = await hydrateUser(baseUser)
    return toSafeUser(hydrated)
  } catch (error) {
    console.warn('[AuthService] resolveSafeUserById fallback to base user', {
      userId: id,
      error,
    })
    return toSafeUserFromBase(baseUser)
  }
}

async function ensureSuperAdminRoleForRecord(user: PrismaUserBase): Promise<PrismaUserBase> {
  if (!isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN') return user
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPERADMIN' },
      // важливо: не повертати всі поля (інакше при schema mismatch падає P2022)
      select: { id: true },
    })
    return { ...user, role: 'SUPERADMIN' }
  } catch (error) {
    throw toAuthServiceError(error, 'superadmin_role_update_failed')
  }
}

// ── Пошук користувача за ID ───────────────
export async function findUserById(id: string): Promise<UserWithSub | null> {
  try {
    const cacheKey = `auth:full-user:${id}`
    const cached = await cacheGet<UserWithSub | null>(cacheKey)
    if (cached !== null) return cached

    const user = await findRawUserById(id)
    if (!user) return null
    const normalizedUser = await ensureSuperAdminRoleForRecord(user)
    const hydrated = await hydrateUser(normalizedUser)
    await cacheSet(cacheKey, hydrated, 300)
    return hydrated
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
      select: { settings: true, email: true },
    })
    if (!existing) {
      throw new AuthServiceError('user_not_found', 404)
    }

    const currentSettings = resolveUiSettingsFromUser(existing)
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
    const currentRootSettings = asRecord(existing.settings) ?? {}
    const settingsPayload: Prisma.InputJsonValue | undefined = uiPayload
      ? ({ ...currentRootSettings, ui: uiPayload } as Prisma.InputJsonValue)
      : undefined

    if (normalizedEmail && normalizedEmail !== existing.email) {
      try {
        await attachEmailToUser(userId, normalizedEmail)
      } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_EMAIL') {
          throw new AuthServiceError('invalid_email', 400)
        }
        if (error instanceof Error && error.message === 'IDENTITY_MERGE_CONFLICT') {
          throw new AuthServiceError('email_already_registered', 400)
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
          telegramEnabled: notificationPayload?.enabled ?? undefined,
          settings: settingsPayload,
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

    await invalidateUserCache(userId)

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
  const availableRoles = computeAvailableRoles({ role: user.role })
  const activeRole = resolveActiveRole((user as any).activeRole ?? user.role, availableRoles)

  const rawConfig = user.mentorConfigs?.[0]?.config
  const configObject = rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)
    ? rawConfig as Record<string, unknown>
    : {}
  const mentorUi = configObject.ui && typeof configObject.ui === 'object' && !Array.isArray(configObject.ui)
    ? configObject.ui as Record<string, unknown>
    : {}
  const fallbackUiSettings = resolveUiSettingsFromUser(user)
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
    name: null,
        firstName: user.firstName,
    lastName: user.lastName,
    telegramUserId: user.telegramUserId,
    telegramUserName: user.telegramUserName,
    telegramChatId: user.telegramChatId,
    telegramEnabled: user.telegramEnabled,
    expertId: user.expertId ?? null,
    role: user.role,
    activeRole,
    availableRoles,
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
      // важливо: не повертати всі поля (інакше при schema mismatch падає P2022)
      select: { id: true },
    })
  } catch (error) {
    throw toAuthServiceError(error, 'mark_user_logged_in_failed')
  }
}

export async function createSessionForUserId(userId: string): Promise<AuthTokensPayload> {
  try {
    await markUserLoggedIn(userId)

    const baseUser = await findRawUserById(userId)
    if (!baseUser) {
      throw new AuthServiceError('user_not_found', 404)
    }
    if (!baseUser.email) {
      throw new AuthServiceError('user_email_missing', 500, 'User email missing')
    }

    const safeUser = await resolveSafeUserById(userId)
    if (!safeUser) {
      throw new AuthServiceError('user_not_found', 404)
    }

    const availableRoles = computeAvailableRoles({ role: baseUser.role })
    const activeRole = resolveActiveRole((baseUser as any).activeRole ?? baseUser.role, availableRoles)
    const accessToken = generateAccessToken({ id: baseUser.id, role: baseUser.role, activeRole, email: baseUser.email })
    const refreshToken = generateRefreshToken(baseUser.id)
    await storeRefreshToken(baseUser.id, refreshToken)

    return {
      user: safeUser,
      accessToken,
      refreshToken,
      needsProfile: !hasProfileName(baseUser),
      expiresIn: 15 * 60,
    }
  } catch (error) {
    console.error('[AuthService] createSessionForUserId failed', {
      userId,
      error: error instanceof Error ? error.stack : error,
    })
    throw toAuthServiceError(error, 'create_session_failed')
  }
}

export async function registerUser(input: {
  email: string
  password: string
  name?: string | null
  expertId?: string | null
  requestId?: string | null
}): Promise<AuthTokensPayload> {
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')

  if (!email || !password) {
    throw new AuthServiceError('missing_fields', 400)
  }

  try {
    const initialRole = isSuperAdminEmail(email) ? 'SUPERADMIN' : 'USER'
    const validatedExpertId = initialRole === 'USER'
      ? await resolveRequestedExpertId(input.expertId)
      : await validateExpertId(input.expertId)
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existing) {
      throw new AuthServiceError('email_already_registered', 400)
    }

    const passwordHash = await hashPassword(password)

    const createdUser = await createUserCompat({
      email,
      passwordHash,
      role: initialRole,
      expertId: validatedExpertId,
      source: UserCreationSource.SYSTEM,
      requestId: input.requestId ?? null,
    })

    const user = await findUserById(createdUser.id)
    if (!user) {
      throw new AuthServiceError('user_creation_failed', 500)
    }

    const userAvailableRoles = computeAvailableRoles({ role: user.role })
    const userActiveRole = resolveActiveRole((user as any).activeRole ?? user.role, userAvailableRoles)
    const accessToken = generateAccessToken({ id: user.id, role: user.role, activeRole: userActiveRole, email: user.email })
    const refreshToken = generateRefreshToken(user.id)
    await storeRefreshToken(user.id, refreshToken)
    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      needsProfile: !hasProfileName(user),
      expiresIn: 15 * 60,
    }
  } catch (error) {
    throw toAuthServiceError(error, 'register_failed')
  }
}

export async function loginUser(input: {
  email: string
  password: string
  expertId?: string | null
}): Promise<AuthTokensPayload> {
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')

  if (!email || !password) {
    throw new AuthServiceError('missing_fields', 400)
  }

  try {
    const user = await findRawUserByEmail(email)

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

    try {
      const resolvedExpertId =
        user.role === 'USER'
          ? await resolveRequestedExpertId(input.expertId)
          : await validateExpertId(input.expertId)

      if (resolvedExpertId) {
        await assignUserToExpert(user.id, resolvedExpertId)
      }
    } catch (error) {
      console.warn('[AuthService] login expert assignment skipped', {
        userId: user.id,
        error,
      })
    }

    return createSessionForUserId(user.id)
  } catch (error) {
    console.error('[AuthService] loginUser failed', {
      email,
      error: error instanceof Error ? error.stack : error,
    })
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

      const initialRole = isSuperAdminEmail(email) ? 'SUPERADMIN' : 'USER'
      const validatedExpertId = initialRole === 'USER'
        ? await resolveRequestedExpertId(input.expertId)
        : await validateExpertId(input.expertId)

      const existing = await findUserByEmail(email)
      if (existing?.id) {
        userId = existing.id
        if (validatedExpertId && existing.role === 'USER') {
          await assignUserToExpert(existing.id, validatedExpertId)
        }
      } else {
        const created = await createUserCompat({
          email,
          firstName: input.name?.trim() || null,
          role: initialRole,
          lastLoginAt: new Date(),
          expertId: validatedExpertId,
          source: UserCreationSource.GOOGLE_LOGIN,
          requestId: input.requestId ?? null,
        })
        userId = created.id
        isNewUser = true
      }
    } else {
      const resolved = await resolveTelegramSocialUser(input)
      userId = resolved.id
      isNewUser = resolved.created

      if (resolved.expertId) {
        await assignUserToExpert(userId, resolved.expertId)
      }
    }

    if (!userId) {
      throw new AuthServiceError('user_creation_failed', 500)
    }

    const session = await createSessionForUserId(userId)

    return {
      ...session,
      needsCompletion: !session.user.email || !hasProfileName(session.user),
      isNewUser,
    }
  } catch (error) {
    throw toAuthServiceError(error, 'social_login_failed')
  }
}

export async function telegramMiniAppLoginUser(initData: string, requestId?: string | null): Promise<AuthTokensPayload> {
  const telegramUser = verifyTelegramInitData(initData)

  return socialLoginUser({
    provider: 'telegram',
    externalId: telegramUser.id,
    username: telegramUser.username ?? undefined,
    name: telegramUser.firstName ?? undefined,
    requestId: requestId ?? null,
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
