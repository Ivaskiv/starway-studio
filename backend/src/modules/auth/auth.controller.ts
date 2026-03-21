import type { Request, Response } from 'express'
import type { AuthenticatedRequest, AuthUser } from '../../types/globalTypes.js'

import {
  AuthServiceError,
  findRefreshToken,
  findUserById,
  getCurrentUser,
  loginUser,
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

    res.clearCookie('refreshToken', { path: '/api/auth/refresh' })
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
