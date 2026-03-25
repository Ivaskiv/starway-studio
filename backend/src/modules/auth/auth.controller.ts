import type { Request, Response } from 'express'
import type { AuthenticatedRequest, AuthUser } from '../../types/globalTypes.js'
import { withRetry } from '../../db/client.js'
import { AuthServiceError } from './auth.errors.js'

import {
  findRefreshToken,
  findUserById,
  getCurrentUser,
  loginUser,
  socialLoginUser,
  telegramMiniAppLoginUser,
  updateUserSettings,
  generateAccessToken,
  generateRefreshToken,
  removeRefreshToken,
  registerUser,
  storeRefreshToken,
  toSafeUser,
  verifyRefreshToken,
} from './auth.service.js'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
} as const

function sendControllerError(res: Response, error: unknown) {
  if (error instanceof AuthServiceError) {
    if (error.code === 'user_not_registered') {
      return res.status(error.status).json({
        message: 'Користувач ще не зареєстрований',
        action: 'showRegisterForm',
      })
    }

    return res.status(error.status).json({ error: error.code })
  }

  console.error('[auth.controller] unexpected error', error)
  return res.status(500).json({ error: 'internal_error' })
}

// ── REGISTER ──────────────────────────────
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body ?? {}
    const result = await registerUser({ email, password, name })

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
      needsProfile: result.needsProfile,
      expiresIn: result.expiresIn,
    })
  } catch (error) {
    return sendControllerError(res, error)
  }
}

// ── LOGIN ─────────────────────────────────
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {}
    const result = await loginUser({ email, password })

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return res.json({
      user: result.user,
      accessToken: result.accessToken,
      needsProfile: result.needsProfile,
      expiresIn: result.expiresIn,
    })
  } catch (error) {
    return sendControllerError(res, error)
  }
}

export async function social(req: Request, res: Response) {
  try {
    const { provider, externalId, email, name, username } = req.body ?? {}
    const result = await socialLoginUser({
      provider,
      externalId,
      email,
      name,
      username,
    })

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return res.json({
      user: result.user,
      accessToken: result.accessToken,
      needsProfile: result.needsProfile,
      expiresIn: result.expiresIn,
      isNewUser: result.isNewUser,
      needsCompletion: result.needsCompletion,
    })
  } catch (error) {
    return sendControllerError(res, error)
  }
}

export async function telegram(req: Request, res: Response) {
  try {
    const { initData } = req.body ?? {}
    const result = await telegramMiniAppLoginUser(String(initData ?? ''))

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return res.json({
      token: result.accessToken,
      accessToken: result.accessToken,
      user: result.user,
      needsProfile: result.needsProfile,
      expiresIn: result.expiresIn,
      isNewUser: result.isNewUser,
      needsCompletion: result.needsCompletion,
    })
  } catch (error) {
    return sendControllerError(res, error)
  }
}

// ── REFRESH ───────────────────────────────
export async function refresh(req: Request, res: Response) {
  const token = req.cookies.refreshToken
  if (!token) return res.status(401).json({ error: 'no_refresh_token' })

  try {
    verifyRefreshToken(token)
    const exists = await withRetry(() => findRefreshToken(token))
    if (!exists) return res.status(401).json({ error: 'invalid_refresh' })

    const user = await withRetry(() => findUserById(exists.userId))
    if (!user) return res.status(401).json({ error: 'user_not_found' })

    const newAccess = generateAccessToken({ id: user.id, role: user.role, email: user.email } as AuthUser)
    const newRefresh = generateRefreshToken(user.id)
    await withRetry(() => storeRefreshToken(user.id, newRefresh))
    await withRetry(() => removeRefreshToken(token))
    res.cookie('refreshToken', newRefresh, COOKIE_OPTIONS)
    return res.json({ accessToken: newAccess, user: toSafeUser(user) })
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    return res.status(401).json({ error: 'invalid_refresh' })
  }
}

// ── LOGOUT ────────────────────────────────
export async function logout(req: Request, res: Response) {
  try {
    const token = req.cookies.refreshToken
    if (token) await removeRefreshToken(token)

    res.clearCookie('refreshToken', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    })
    return res.sendStatus(204)
  } catch (error) {
    return sendControllerError(res, error)
  }
}

// ── GET ME ────────────────────────────────
export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await getCurrentUser({
      userId: req.user?.id,
      email: req.user?.email,
    })

    return res.json({ user: toSafeUser(user) })
  } catch (error) {
    return sendControllerError(res, error)
  }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'unauthorized' })
    const { email, firstName, lastName, settings } = req.body ?? {}

    const updated = await updateUserSettings(req.user.id, {
      email: email ?? null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      settings,
    })
    return res.json({ user: toSafeUser(updated) })
  } catch (error) {
    return sendControllerError(res, error)
  }
}
