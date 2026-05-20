import type { Request, Response } from 'express'
import type { AuthenticatedRequest, AuthUser } from '../../types/globalTypes.js'
import { withRetry } from '../../db/client.js'
import { AuthServiceError } from './auth.errors.js'
import { assertHumanVerification } from './humanVerification.js'
import { buildClearSecureCookieOptions, buildSecureCookieOptions } from '../../core/state-machine/securityFoundation.js'

import {
  findRefreshToken,
  loginUser,
  socialLoginUser,
  telegramMiniAppLoginUser,
  updateUserSettings,
  generateAccessToken,
  generateRefreshToken,
  removeRefreshToken,
  resolveSafeUserById,
  registerUser,
  storeRefreshToken,
  toSafeUser,
  verifyRefreshToken,
} from './auth.service.js'

type RefreshSessionResult = {
  accessToken: string
  refreshToken: string
  user: Awaited<ReturnType<typeof resolveSafeUserById>>
}

const inFlightRefreshSessions = new Map<string, Promise<RefreshSessionResult>>()
const recentRefreshSessions = new Map<string, { expiresAt: number; result: RefreshSessionResult }>()
const REFRESH_GRACE_WINDOW_MS = 5_000
const MAX_RECENT_REFRESH_SESSIONS = 100

function pruneRecentRefreshSessions() {
  const now = Date.now()

  for (const [key, value] of recentRefreshSessions.entries()) {
    if (value.expiresAt <= now) {
      recentRefreshSessions.delete(key)
    }
  }

  while (recentRefreshSessions.size > MAX_RECENT_REFRESH_SESSIONS) {
    const oldestKey = recentRefreshSessions.keys().next().value
    if (!oldestKey) return
    recentRefreshSessions.delete(oldestKey)
  }
}

function getRecentRefreshSession(token: string): RefreshSessionResult | null {
  pruneRecentRefreshSessions()
  const cached = recentRefreshSessions.get(token)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    recentRefreshSessions.delete(token)
    return null
  }
  return cached.result
}

const COOKIE_OPTIONS = buildSecureCookieOptions()

function resolveRefreshToken(req: Request): string | null {
  const cookieToken = String(req.cookies?.refreshToken ?? '').trim()
  if (cookieToken) return cookieToken

  const headerToken = String(req.headers['x-refresh-token'] ?? '').trim()
  if (headerToken) return headerToken

  const authHeader = String(req.headers.authorization ?? '').trim()
  if (authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice('Bearer '.length).trim()
    if (bearerToken) return bearerToken
  }

  const bodyToken = String(req.body?.refreshToken ?? '').trim()
  return bodyToken || null
}

function sendControllerError(res: Response, error: unknown) {
  console.error('[auth.controller] unexpected error', error instanceof Error ? error.stack : error)

  if (error instanceof AuthServiceError) {
    if (error.code === 'user_not_registered') {
      return res.status(error.status).json({
        success: false,
        message: 'Користувач ще не зареєстрований',
        action: 'showRegisterForm',
        error: error.code,
      })
    }

    return res.status(error.status).json({ success: false, error: error.code })
  }
  return res.status(400).json({ success: false, error: 'internal_error' })
}

// ── REGISTER ──────────────────────────────
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, expertId, companyWebsite, turnstileToken } = req.body ?? {}
    await assertHumanVerification({
      honeypot: companyWebsite,
      turnstileToken,
      ip: req.ip,
    })
    const result = await registerUser({ email, password, name, expertId })

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
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
    const { email, password, expertId, companyWebsite, turnstileToken } = req.body ?? {}
    await assertHumanVerification({
      honeypot: companyWebsite,
      turnstileToken,
      ip: req.ip,
    })
    const result = await loginUser({ email, password, expertId })

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      needsProfile: result.needsProfile,
      expiresIn: result.expiresIn,
    })
  } catch (error) {
    console.error('LOGIN ERROR:', error)
    console.error('[auth.controller] login failed', error instanceof Error ? error.stack : error)

    if (error instanceof AuthServiceError) {
      if (error.code === 'user_not_registered') {
        return res.status(error.status).json({
          success: false,
          message: 'Користувач ще не зареєстрований',
          action: 'showRegisterForm',
          error: error.code,
        })
      }

      return res.status(error.status).json({ success: false, error: error.code })
    }

    return res.status(500).json({ success: false, error: 'login_failed' })
  }
}

export async function social(req: Request, res: Response) {
  try {
    const { provider, externalId, email, name, username, expertId } = req.body ?? {}
    const result = await socialLoginUser({
      provider,
      externalId,
      email,
      name,
      username,
      expertId,
    })

    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)

    return res.json({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
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
      refreshToken: result.refreshToken,
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
  const token = resolveRefreshToken(req)
  if (!token) return res.status(401).json({ success: false, error: 'no_refresh_token' })

  try {
    const decoded = verifyRefreshToken(token)
    console.log('[AUTH][REFRESH]', { tokenPresent: true, userId: decoded?.id ?? null })

    const recent = getRecentRefreshSession(token)
    if (recent) {
      res.cookie('refreshToken', recent.refreshToken, COOKIE_OPTIONS)
      return res.json(recent)
    }

    const cached = inFlightRefreshSessions.get(token)
    if (cached) {
      const shared = await cached
      res.cookie('refreshToken', shared.refreshToken, COOKIE_OPTIONS)
      return res.json(shared)
    }

    const refreshPromise = (async (): Promise<RefreshSessionResult> => {
      const exists = await withRetry(() => findRefreshToken(token))
      if (!exists) {
        throw new AuthServiceError('invalid_refresh', 401, 'Refresh token not found')
      }
      if (exists.userId !== decoded.id) {
        throw new AuthServiceError('refresh_user_mismatch', 401, 'Refresh token user mismatch')
      }

      const user = await withRetry(() => resolveSafeUserById(exists.userId))
      if (!user) {
        throw new AuthServiceError('user_not_found', 401, 'User not found')
      }

      const newAccess = generateAccessToken({ id: user.id, role: user.role, email: user.email } as AuthUser)
      const newRefresh = generateRefreshToken(user.id)
      await withRetry(() => storeRefreshToken(user.id, newRefresh))
      await withRetry(() => removeRefreshToken(token))

      return {
        accessToken: newAccess,
        refreshToken: newRefresh,
        user,
      }
    })()

    inFlightRefreshSessions.set(token, refreshPromise)

    try {
      const shared = await refreshPromise
      pruneRecentRefreshSessions()
      recentRefreshSessions.set(token, {
        expiresAt: Date.now() + REFRESH_GRACE_WINDOW_MS,
        result: shared,
      })
      res.cookie('refreshToken', shared.refreshToken, COOKIE_OPTIONS)
      return res.json(shared)
    } finally {
      inFlightRefreshSessions.delete(token)
    }
  } catch (error) {
    console.error('[auth.controller] refresh failed', error instanceof Error ? error.stack : error)

    if (error instanceof AuthServiceError) {
      return res.status(Math.min(error.status, 401)).json({ success: false, error: error.code })
    }
    return res.status(401).json({ success: false, error: 'refresh_failed' })
  }
}

// ── LOGOUT ────────────────────────────────
export async function logout(req: Request, res: Response) {
  try {
    const token = req.cookies.refreshToken
    if (token) await removeRefreshToken(token)

    res.clearCookie('refreshToken', {
      ...buildClearSecureCookieOptions(),
    })
    return res.sendStatus(204)
  } catch (error) {
    return sendControllerError(res, error)
  }
}

// ── GET ME ────────────────────────────────
export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'unauthorized' })
    }

    const user = await resolveSafeUserById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' })
    }

    return res.json({ user })
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
