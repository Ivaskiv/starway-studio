import { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { invalidateUserCache } from '../../../lib/db/userCache.js'
import type { SafeUser,UserWithSub } from '../../../types/globalTypes.js'
import { resolveDefaultMentorOwnerExpertId } from '../../experts/ownership.service.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import { UserAutoCreationDisabledError,UserCreationSource } from '../../user/userCreation.service.js'
import { AuthServiceError } from '../errors.js'

export function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = String(phone ?? '').replace(/\D/g, '')
  return digits ? `+${digits}` : null
}

export async function validateExpertId(expertId: string | null | undefined): Promise<string | null> {
  const value = String(expertId ?? '').trim()
  if (!value) return null

  const expert = await prisma.expert.findUnique({
    where: { id: value },
    select: { id: true },
  }).catch(() => null)

  return expert?.id ?? null
}

export async function resolveRequestedExpertId(expertId: string | null | undefined): Promise<string | null> {
  try {
    const explicitExpertId = await validateExpertId(expertId)
    if (explicitExpertId) return explicitExpertId
    return await resolveDefaultMentorOwnerExpertId()
  } catch (error) {
    console.warn('[AuthService] resolveRequestedExpertId fallback to null', error)
    return null
  }
}

export function toAuthServiceError(error: unknown, fallbackCode = 'auth_internal_error'): AuthServiceError {
  if (error instanceof AuthServiceError) return error

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P1001') {
      return new AuthServiceError('auth_db_unavailable', 503, 'Database temporarily unavailable')
    }
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
    return new AuthServiceError('auth_db_unavailable', 503, 'Database unavailable')
  }

  return new AuthServiceError(fallbackCode, 500)
}

export function isMissingStructureError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  )
}

export async function createUserCompat(input: {
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
    if (error instanceof Error && error.message === 'EMAIL_REQUIRED_FOR_USER_CREATION') {
      throw new AuthServiceError('telegram_email_required', 400, 'Потрібен email для прив’язки Telegram')
    }
    throw error
  })

  return { id: resolved.user.id }
}

export async function linkTelegramIdentityToUser(userId: string, telegramId: string | null): Promise<void> {
  const normalizedTelegramId = String(telegramId ?? '').trim()
  if (!normalizedTelegramId) return

  const conflictingUser = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      OR: [
        { telegramUserId: normalizedTelegramId },
        { telegramChatId: normalizedTelegramId },
      ],
    },
    select: { id: true },
  })
  if (conflictingUser) {
    console.warn('[AuthService] skip telegram link update due to existing linked user', {
      userId,
      telegramId: normalizedTelegramId,
      conflictingUserId: conflictingUser.id,
    })
    return
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramUserId: true, telegramChatId: true },
  })
  if (!existing) return

  const currentTelegramId = existing.telegramUserId ?? existing.telegramChatId ?? null
  if (currentTelegramId && currentTelegramId !== normalizedTelegramId) {
    console.warn('[AuthService] skip telegram link update due to mismatched identity', {
      userId,
      currentTelegramId,
      normalizedTelegramId,
    })
    return
  }

  const nextTelegramUserId = existing.telegramUserId ?? normalizedTelegramId
  const nextTelegramChatId = existing.telegramChatId ?? normalizedTelegramId
  if (existing.telegramUserId === nextTelegramUserId && existing.telegramChatId === nextTelegramChatId) {
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramUserId: nextTelegramUserId,
      telegramChatId: nextTelegramChatId,
      telegramEnabled: true,
    },
  })

  await invalidateUserCache(userId)
}

export async function resolveTelegramSocialUser(input: SocialAuthInput): Promise<{ id: string; created: boolean; expertId: string | null }> {
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
    if (error instanceof Error && error.message === 'EMAIL_REQUIRED_FOR_USER_CREATION') {
      throw new AuthServiceError('telegram_email_required', 400, 'Потрібен email для прив’язки Telegram')
    }
    throw error
  })

  return {
    id: resolved.user.id,
    created: resolved.created,
    expertId: validatedExpertId,
  }
}

export const USER_BASE_SELECT = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  phone: true,
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

export type PrismaUserBase = Prisma.UserGetPayload<{
  select: typeof USER_BASE_SELECT
}>

export type UserDecorations = Pick<UserWithSub, 'subscription' | 'userProgress' | 'mentorConfigs' | 'notificationPreference'>

export type NotificationTypesPayload = {
  dailyMorning?: boolean
  dailyEvening?: boolean
  weeklySummary?: boolean
  streakAlert?: boolean
  streakBroken?: boolean
  levelUp?: boolean
  subscription?: boolean
  aiReminders?: boolean
}

export function parseTimeStringToMinutes(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return fallback
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return fallback
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback
  return hours * 60 + minutes
}

export function formatMinutesToTimeString(value: number | null | undefined, fallback: string): string {
  if (!Number.isInteger(value)) return fallback
  const safeValue = value as number
  const normalized = Math.min(Math.max(safeValue, 0), 23 * 60 + 59)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function normalizeNotificationTypes(input: NotificationTypesPayload | undefined) {
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

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function resolveUiSettingsFromUser(
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

export type SocialAuthInput = {
  provider: 'google' | 'telegram'
  externalId: string
  email?: string | null
  name?: string | null
  username?: string | null
  expertId?: string | null
  requestId?: string | null
}

export function hasProfileName(input: { name?: string | null; firstName?: string | null; lastName?: string | null }): boolean {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim()
  if (fullName) return true
  return Boolean(input.name && input.name.trim())
}
