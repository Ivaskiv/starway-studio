import type { Request, Response } from 'express'
import { prisma } from '../../db/client.js'
import type { MentorConfig, Subscription, User, UserProgress } from '../../db/generated/prisma/client.js'
import type { AuthenticatedRequest, AuthUser, UserWithSub } from '../../types/globalTypes.js'

import {
  comparePassword,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  updateUserSettings,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  markUserLoggedIn,
  removeRefreshToken,
  storeRefreshToken,
  toSafeUser,
  verifyRefreshToken,
} from './auth.service.js'
import { isSuperAdminEmail } from './superadmin.js'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
} as const

// ── REGISTER ──────────────────────────────
export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(400).json({ error: 'email_exists' })

  const passwordHash = await hashPassword(password)
  const initialRole = isSuperAdminEmail(email) ? 'SUPERADMIN' : 'USER'

  const user = await prisma.user.create({
    data: { email, passwordHash, name: name || null, role: initialRole },
    include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }, progress: true, mentorConfig: true },
  })

  const userWithSub = await findUserById(user.id)
  if (!userWithSub) return res.status(500).json({ error: 'user_creation_failed' })

  const accessToken = generateAccessToken({ id: userWithSub.id, role: userWithSub.role, email: userWithSub.email } as AuthUser)
  const refreshToken = generateRefreshToken(userWithSub.id)
  await storeRefreshToken(userWithSub.id, refreshToken)

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

  return res.status(201).json({
    user: toSafeUser(userWithSub),
    accessToken,
    needsProfile: !userWithSub.name,
    expiresIn: 15 * 60,
  })
}

// ── LOGIN ─────────────────────────────────
export async function login(req: Request, res: Response) {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })

  const user = await findUserByEmail(email)

  if (!user) {
    return res.status(404).json({ message: 'Користувач ще не зареєстрований', action: 'showRegisterForm' })
  }

  if (!user.passwordHash) return res.status(401).json({ error: 'invalid_credentials' })

  const isValid = await comparePassword(password, user.passwordHash)
  if (!isValid) return res.status(401).json({ error: 'invalid_credentials' })

  await markUserLoggedIn(user.id)

  const freshUser = await findUserById(user.id)
  if (!freshUser) return res.status(404).json({ error: 'user_not_found' })

  const accessToken = generateAccessToken({ id: freshUser.id, role: freshUser.role, email: freshUser.email } as AuthUser)
  const refreshToken = generateRefreshToken(freshUser.id)
  await storeRefreshToken(freshUser.id, refreshToken)
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)

  return res.json({ user: toSafeUser(freshUser), accessToken, needsProfile: !freshUser.name, expiresIn: 15 * 60 })
}

// ── REFRESH ───────────────────────────────
export async function refresh(req: Request, res: Response) {
  const token = req.cookies.refreshToken
  if (!token) return res.status(401).json({ error: 'no_refresh_token' })

  try {
    const payload = verifyRefreshToken(token)
    const exists = await findRefreshToken(token)
    if (!exists) return res.status(401).json({ error: 'invalid_refresh' })

    await removeRefreshToken(token)

    const user = await findUserById(payload.id)
    if (!user) return res.status(401).json({ error: 'user_not_found' })

    const newAccess = generateAccessToken({ id: user.id, role: user.role, email: user.email } as AuthUser)
    const newRefresh = generateRefreshToken(user.id)
    await storeRefreshToken(user.id, newRefresh)
    res.cookie('refreshToken', newRefresh, COOKIE_OPTIONS)
    return res.json({ accessToken: newAccess, user: toSafeUser(user) })
  } catch {
    return res.status(401).json({ error: 'invalid_refresh' })
  }
}

// ── LOGOUT ────────────────────────────────
export async function logout(req: Request, res: Response) {
  const token = req.cookies.refreshToken
  if (token) await removeRefreshToken(token)

  res.clearCookie('refreshToken', { path: '/api/auth/refresh' })
  res.sendStatus(204)
}

// ── GET ME ────────────────────────────────

// ── HELPER: конвертуємо Prisma user у UserWithSub ────────────────
function prismaUserToUserWithSub(user: User & {
  subscriptions: Subscription[]
  progress: UserProgress | null
  mentorConfig: MentorConfig | null
}): UserWithSub {
  const { uiSettings, ...rest } = user as User & { uiSettings?: unknown }
  const sanitizedUi = uiSettings && typeof uiSettings === 'object' && !Array.isArray(uiSettings)
    ? (uiSettings as Record<string, unknown>)
    : null
  return {
    ...rest,
    uiSettings: sanitizedUi,
    subscription: user.subscriptions[0] ?? null,
    userProgress: user.progress,
    mentorConfigs: user.mentorConfig ? [user.mentorConfig] : [],
  }
}

// ── GET ME ────────────────────────────────
export async function getMe(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const email = req.user?.email
  if (!userId && !email) return res.status(401).json({ error: 'unauthorized' })

  const user = await prisma.user.findUnique({
    where: userId ? { id: userId } : { email: email! },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      progress: true,
      mentorConfig: true,
    },
  })

  if (!user) return res.status(404).json({ message: 'Користувач ще не зареєстрований', action: 'showRegisterForm' })

  const userWithSub: UserWithSub = prismaUserToUserWithSub(user)

  return res.json({ user: toSafeUser(userWithSub) })
}

export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ error: 'unauthorized' })
  const { firstName, lastName, settings } = req.body ?? {}

  const updated = await updateUserSettings(req.user.id, { firstName: firstName ?? null, lastName: lastName ?? null, settings })
  return res.json({ user: toSafeUser(updated) })
}
