// backend/src/modules/auth/auth.controller.ts
import type { CookieOptions, Response } from 'express'
import {
  createUserLocal,
  findOrCreateSocialUser,
  findUserByEmail,
  findUserById,
  markUserLoggedIn,
  requestPasswordReset,
  resetPasswordByToken,
  signRefreshToken,
  signToken,
  toSafeUser,
  updateUserUiSettings,
  validatePassword,
  verifyRefreshToken,
} from './auth.service.js'
import type { AuthApiResponse, AuthenticatedRequest } from '@/types/globalTypes.js'

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000
}

// ── REGISTER ─────────────────────────────────────────────────
export async function register(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password, name } = req.body
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'invalid_email' })
    if (!password || password.length < 8) return res.status(400).json({ error: 'password_must_be_8_chars' })

    const user = await createUserLocal({ email, password, name })
    const accessToken = signToken({ id: user.id, role: user.role, email: user.email })
    const refreshToken = signRefreshToken({ id: user.id })

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    return res.status(201).json({
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      needsProfile: !user.name,
      expiresIn: 15 * 60
    } satisfies Partial<AuthApiResponse>)
  } catch (err) {
    console.error('❌ Register error:', err)
    return res.status(500).json({ error: 'server_error', message: (err as Error).message })
  }
}

// ── LOGIN ────────────────────────────────────────────────────
export async function login(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' })

    const user = await findUserByEmail(email, true)
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'invalid_credentials' })
    if (!await validatePassword(password, user.passwordHash)) return res.status(401).json({ error: 'invalid_credentials' })

    await markUserLoggedIn(user.id)
    const freshUser = await findUserById(user.id, true)
    if (!freshUser) return res.status(404).json({ error: 'user_not_found' })

    const accessToken = signToken({ id: freshUser.id, role: freshUser.role, email: freshUser.email })
    const refreshToken = signRefreshToken({ id: freshUser.id })
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    return res.json({
      user: toSafeUser(freshUser),
      accessToken,
      refreshToken,
      needsProfile: !freshUser.name,
      expiresIn: 15 * 60
    } satisfies Partial<AuthApiResponse>)
  } catch (err) {
    console.error('❌ Login error:', err)
    return res.status(500).json({ error: 'server_error', message: (err as Error).message })
  }
}

// ── SOCIAL AUTH ──────────────────────────────────────────────
export async function socialAuth(req: AuthenticatedRequest, res: Response) {
  try {
    const { provider, externalId, email, name } = req.body ?? {}
    if (!provider || !externalId) return res.status(400).json({ error: 'provider_and_external_id_required' })
    if (provider !== 'google' && provider !== 'telegram') return res.status(400).json({ error: 'unsupported_social_provider' })

    const user = await findOrCreateSocialUser({ provider, externalId, email, name })
    await markUserLoggedIn(user.id)
    const freshUser = await findUserById(user.id, true)
    if (!freshUser) return res.status(404).json({ error: 'user_not_found' })

    const accessToken = signToken({ id: freshUser.id, role: freshUser.role, email: freshUser.email })
    const refreshToken = signRefreshToken({ id: freshUser.id })
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    return res.json({
      user: toSafeUser(freshUser),
      accessToken,
      refreshToken,
      needsProfile: !freshUser.name,
      expiresIn: 15 * 60
    } satisfies Partial<AuthApiResponse>)
  } catch (err) {
    console.error('❌ Social auth error:', err)
    return res.status(500).json({ error: 'server_error', message: (err as Error).message })
  }
}

// ── GET ME ───────────────────────────────────────────────────
export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })
    const user = await findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'user_not_found' })
    return res.json({ user: toSafeUser(user) })
  } catch (err) {
    console.error('❌ GetMe error:', err)
    return res.status(500).json({ error: 'server_error', message: (err as Error).message })
  }
}

// ── REFRESH ──────────────────────────────────────────────────
export async function refresh(req: AuthenticatedRequest, res: Response) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken
    if (!token) return res.status(401).json({ error: 'refresh_token_required' })
    const decoded = verifyRefreshToken(token)
    const user = await findUserById(decoded.id)
    if (!user) return res.status(404).json({ error: 'user_not_found' })

    return res.json({
      accessToken: signToken({ id: user.id, role: user.role, email: user.email }),
      user: toSafeUser(user)
    })
  } catch {
    return res.status(401).json({ error: 'invalid_refresh_token' })
  }
}

// ── LOGOUT ───────────────────────────────────────────────────
export async function logout(_req: AuthenticatedRequest, res: Response) {
  res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' })
  return res.json({ success: true })
}

// ── PASSWORD RESET ───────────────────────────────────────────
export async function forgotPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'invalid_email' })
    const result = await requestPasswordReset(email)
    return res.json({ success: true, message: 'if_account_exists_reset_was_created', emailSent: result.emailSent, ...('resetToken' in result ? { resetToken: result.resetToken } : {}), ...('resetUrl' in result ? { resetUrl: result.resetUrl } : {}) })
  } catch (err) {
    console.error('❌ Forgot password error:', err)
    return res.status(500).json({ error: 'server_error', message: (err as Error).message })
  }
}

export async function resetPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!token) return res.status(400).json({ error: 'reset_token_required' })
    if (!password || password.length < 8) return res.status(400).json({ error: 'password_must_be_8_chars' })
    await resetPasswordByToken(token, password)
    return res.json({ success: true })
  } catch (err) {
    const message = (err as Error).message
    if (message === 'invalid_or_expired_reset_token') return res.status(400).json({ error: message })
    console.error('❌ Reset password error:', err)
    return res.status(500).json({ error: 'server_error', message })
  }
}

// ── UPDATE SETTINGS ──────────────────────────────────────────
export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'unauthorized' })

    const { settings } = req.body ?? {}
    const nextSettings = {
      accentColor: typeof settings?.accentColor === 'string' ? settings.accentColor : undefined,
      theme: typeof settings?.theme === 'string' ? settings.theme : undefined,
      language: typeof settings?.language === 'string' ? settings.language : undefined
    }

    const user = await updateUserUiSettings(req.user.id, nextSettings)
    if (!user) return res.status(404).json({ error: 'user_not_found' })

    return res.json({ user: toSafeUser(user) } satisfies Partial<AuthApiResponse>)
  } catch (err) {
    console.error('❌ Update settings error:', err)
    return res.status(500).json({ error: 'server_error', message: (err as Error).message })
  }
}
