// backend/src/modules/auth/auth.service.ts
import { prisma } from '@/db/client.js'
import type { SafeUser, UserRole, UserWithSub } from '@/types/globalTypes.js'
import { toSafeUser } from '@/modules/user/types.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaUserWithRelations } from '@/modules/auth/auth.types.js'

const JWT_SECRET = process.env.JWT_SECRET || 'starway-secret-dev'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'starway-refresh-secret-dev'
const JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || 'starway-reset-secret-dev'

// ── TYPES ─────────────────────────────────────────────────────

interface JwtPayload { id: string; email: string | null; role: UserRole }
interface RefreshPayload { id: string }


export function toUserWithSub(user: PrismaUserWithRelations): UserWithSub {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    passwordHash: user.passwordHash,
    telegramUserId: user.telegramUserId,
    telegramUserName: user.telegramUserName,
    telegramChatId: user.telegramChatId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    subscription: user.subscriptions?.[0] ?? null,
    userProgress: user.progress ?? null,
    mentorConfigs: user.mentorConfig ? [{ config: user.mentorConfig.config }] : []
  }
}

export function toSafeUserService(user: UserWithSub): SafeUser {
  return toSafeUser(user)
}

// ── PASSWORD ──────────────────────────────────────────────────

export const validatePassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash)

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, 10)

// ── JWT ───────────────────────────────────────────────────────

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })

export const signRefreshToken = (payload: RefreshPayload): string =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' })

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET) as JwtPayload

export const verifyRefreshToken = (token: string): RefreshPayload =>
  jwt.verify(token, JWT_REFRESH_SECRET) as RefreshPayload

// ── USER CRUD ─────────────────────────────────────────────────

export async function createUserLocal(params: { email: string; password: string; name: string }): Promise<UserWithSub> {
  const passwordHash = await hashPassword(params.password)
  const user = await prisma.user.create({
    data: { email: params.email, passwordHash, name: params.name, role: 'USER' },
    include: { subscriptions: true, progress: true, mentorConfig: true }
  })
  return toUserWithSub(user)
}

export async function findUserByEmail(email: string, includePassword = false): Promise<UserWithSub | null> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
    include: { subscriptions: true, progress: true, mentorConfig: true }
  })
  if (!user) return null
  return toUserWithSub({ ...user, passwordHash: includePassword ? user.passwordHash : null })
}

export async function findUserById(id: string, includePassword = false): Promise<UserWithSub | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { subscriptions: true, progress: true, mentorConfig: true }
  })
  if (!user) return null
  return toUserWithSub({ ...user, passwordHash: includePassword ? user.passwordHash : null })
}

export async function markUserLoggedIn(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
}

// ── PASSWORD RESET ─────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{ emailSent: boolean; resetToken?: string; resetUrl?: string }> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { emailSent: false }
  const resetToken = jwt.sign({ id: user.id }, JWT_RESET_SECRET, { expiresIn: '1h' })
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
  return { emailSent: true, resetToken, resetUrl }
}

export async function resetPasswordByToken(token: string, newPassword: string): Promise<void> {
  const decoded = jwt.verify(token, JWT_RESET_SECRET) as RefreshPayload
  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({ where: { id: decoded.id }, data: { passwordHash } })
}

// ── SOCIAL AUTH ───────────────────────────────────────────────

export async function findOrCreateSocialUser(params: { provider: 'google' | 'telegram'; externalId: string; email?: string; name?: string }): Promise<UserWithSub> {
  let user = null

  if (params.provider === 'telegram') {
  user = await prisma.user.findFirst({ where: { telegramUserId: params.externalId }, include: { subscriptions: true, progress: true, mentorConfig: true } })
    if (!user) {
      user = await prisma.user.create({
        data: { telegramUserId: params.externalId, email: params.email ?? null, name: params.name ?? null, role: 'USER' },
        include: { subscriptions: true, progress: true, mentorConfig: true }
      })
    }
    return toUserWithSub(user)
  }

  // Google
      user = await prisma.user.findFirst({ where: { email: params.email }, include: { subscriptions: true, progress: true, mentorConfig: true } })
  if (!user) {
    user = await prisma.user.create({
      data: { email: params.email ?? null, name: params.name ?? null, role: 'USER' },
      include: { subscriptions: true, progress: true, mentorConfig: true }
    })
  }
  return toUserWithSub(user)
}

// ── UI SETTINGS ───────────────────────────────────────────────

type UISettings = { accentColor?: string | null; theme?: string | null; language?: string | null }

export async function updateUserUiSettings(userId: string, settings: UISettings): Promise<UserWithSub> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { uiSettings: settings },
    include: { subscriptions: true, progress: true, mentorConfig: true }
  })
  return toUserWithSub(user)
}

export { toSafeUserService as toSafeUser }
