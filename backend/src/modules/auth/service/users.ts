import { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { cacheGet,cacheSet } from '../../../lib/cache/index.js'
import { invalidateUserCache } from '../../../lib/db/userCache.js'
import type { SafeUser,UserWithSub } from '../../../types/globalTypes.js'
import { normalizeSubscriptionPlan,normalizeSubscriptionStatus } from '../../subscriptions/utils.js'
import { attachEmailToUser } from '../../user/identity/service.js'
import { ABILITIES,resolveUserAbilities } from '../access/abilities.js'
import { computeAvailableRoles,resolveActiveRole } from '../access/roles.js'
import { AuthServiceError } from '../errors.js'
import {
USER_BASE_SELECT,
asRecord,
formatMinutesToTimeString,
isMissingStructureError,
normalizeEmail,
normalizeNotificationTypes,
parseTimeStringToMinutes,
resolveUiSettingsFromUser,
toAuthServiceError,
type PrismaUserBase,
type UserDecorations,
} from './shared.js'

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
    phone: baseUser.phone ?? null,
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

export async function findRawUserById(id: string): Promise<PrismaUserBase | null> {
  return prisma.user.findUnique({
    where: { id },
    select: USER_BASE_SELECT,
  })
}

export async function findRawUserByEmail(email: string): Promise<PrismaUserBase | null> {
  return prisma.user.findUnique({
    where: { email },
    select: USER_BASE_SELECT,
  })
}

function toSafeUserFromBase(user: PrismaUserBase): SafeUser {
  const isSuperAdmin = user.role === 'SUPERADMIN'
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
    phone: user.phone ?? null,
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
    isAdmin: user.role === 'ADMIN' || user.role === 'SUPERADMIN',
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
  return user
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
  const isSuperAdmin = user.role === 'SUPERADMIN'

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
    isAdmin: user.role === 'ADMIN' || user.role === 'SUPERADMIN',
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
