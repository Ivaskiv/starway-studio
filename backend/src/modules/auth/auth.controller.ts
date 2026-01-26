import type { Request, Response } from 'express'
import {
  findUserByEmail,
  findUserById,
  createUserLocal,
  validatePassword,
  signToken,
  signRefreshToken,
  findOrCreateSocialUser
} from './auth.service.js'
import type { AuthResponse } from './auth.types.js'
import { serverError } from '../../utils/serverError.js'

// ===== HELPERS =====
function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.includes('@') && value.trim().length > 3
}

function needsProfile(email?: string | null) {
  return !email || email.trim().length === 0
}

// ===== REGISTER =====
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body

    if (!isValidEmail(email)) return res.status(400).json({ error: 'invalid_email' })
    if (!password || password.length < 6) return res.status(400).json({ error: 'password_min_6_chars' })

    const exists = await findUserByEmail(email)
    if (exists) return res.status(409).json({ error: 'email_already_registered', message: 'Email вже зареєстрований, спробуйте логін' })

    const user = await createUserLocal({ email, password, name: name?.trim() })
    const token = signToken({ id: user.id, role: user.role })
    const refreshToken = signRefreshToken({ id: user.id })

    const response: AuthResponse = { user, token, refreshToken, needsProfile: needsProfile(user.email), expiresIn: 15 * 60 }
    res.status(201).json(response)
  } catch (err) {
    return serverError(res, 'POST /auth/register', err)
  }
}

// ===== LOGIN =====
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email_and_password_required' });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      console.log(`[LOGIN] User not found or no password: ${email}`);
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const valid = await validatePassword(password, user.password_hash);
    console.log(`[LOGIN] Password check for ${email} → ${valid ? 'VALID' : 'INVALID'}`);

    if (!valid) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // 🔑 TOKENS
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id });

    const response: AuthResponse = {
      user,
      token,
      refreshToken,
      needsProfile: needsProfile(user.email),
      expiresIn: 15 * 60,
    };

    console.log('[LOGIN] Success:', user.email);
    return res.json(response);
  } catch (err) {
    return serverError(res, 'POST /auth/login', err);
  }
}


// ===== SOCIAL AUTH =====
export async function socialAuth(req: Request, res: Response) {
  try {
    const { provider, external_id, username } = req.body
    if (!provider || !external_id) return res.status(400).json({ error: 'provider_and_external_id_required' })

    const user = await findOrCreateSocialUser({ provider, externalId: external_id, username })
    const token = signToken({ id: user.id, role: user.role })
    const refreshToken = signRefreshToken({ id: user.id })

    const response: AuthResponse = { user, token, refreshToken, needsProfile: needsProfile(user.email), expiresIn: 15 * 60 }
    res.json(response)
  } catch (err) {
    return serverError(res, 'POST /auth/social', err)
  }
}

// ===== GET ME =====
export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const user = await findUserById(userId)
    if (!user) return res.status(404).json({ error: 'user_not_found' })

    res.json({ user })
  } catch (err) {
    return serverError(res, 'GET /auth/me', err)
  }
}
