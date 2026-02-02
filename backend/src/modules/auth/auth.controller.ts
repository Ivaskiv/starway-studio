// backend/src/modules/auth/auth.controller.ts
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { sql } from '../../db/client.js';
import {
  findUserByEmail,
  findUserById,
  createUserLocal,
  validatePassword,
  signToken,
  signRefreshToken,
  findOrCreateSocialUser,
} from './auth.service.js';
import type { AuthResponse } from './auth.types.js';
import { serverError } from '../../utils/serverError.js';
import type { CookieOptions } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'starway-secret-2024';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 днів
};

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.includes('@') && value.trim().length > 3;
}

function needsProfile(email?: string | null) {
  return !email || email.trim().length === 0;
}

// ============================================
// REGISTER (з sessions)
// ============================================
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;
    if (!isValidEmail(email)) return res.status(400).json({ error: 'invalid_email' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'password_min_6_chars' });

    const exists = await findUserByEmail(email);
    if (exists) return res.status(409).json({ error: 'email_already_registered' });

    const user = await createUserLocal({ email, password, name });
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id });

    // 🔑 Зберегти refresh token в БД
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await sql`
      INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
      VALUES (
        ${crypto.randomUUID()},
        ${user.id},
        ${refreshTokenHash},
        NOW() + INTERVAL '30 days'
      )
    `;

    // 🔑 Встановити в cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const response: AuthResponse = { 
      user, 
      token, 
      refreshToken, 
      needsProfile: needsProfile(user.email), 
      expiresIn: 15 * 60 
    };
    res.status(201).json(response);
  } catch (err) {
    return serverError(res, 'POST /auth/register', err);
  }
}

// ============================================
// LOGIN (з sessions)
// ============================================
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });

    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) return res.status(401).json({ error: 'invalid_credentials' });

    const valid = await validatePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'invalid_credentials' });

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id });

    // 🔑 Зберегти refresh token в БД
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await sql`
      INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
      VALUES (
        ${crypto.randomUUID()},
        ${user.id},
        ${refreshTokenHash},
        NOW() + INTERVAL '30 days'
      )
    `;

    // 🔑 Встановити в cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const response: AuthResponse = { 
      user, 
      token, 
      refreshToken, 
      needsProfile: needsProfile(user.email), 
      expiresIn: 15 * 60 
    };
    res.json(response);
  } catch (err) {
    return serverError(res, 'POST /auth/login', err);
  }
}

// ============================================
// SOCIAL AUTH (Telegram/Instagram) - БЕЗ ЗМІН
// ============================================
export async function socialAuth(req: Request, res: Response) {
  try {
    const { provider, external_id, username } = req.body;
    if (!provider || !external_id) {
      return res.status(400).json({ error: 'provider_and_external_id_required' });
    }

    const user = await findOrCreateSocialUser({ 
      provider, 
      externalId: external_id, 
      username 
    });
    
    const token = signToken({ id: user.id, role: user.role, email: user.email ?? '' });
    const refreshToken = signRefreshToken({ id: user.id });

    // 🔑 Зберегти refresh token в БД (додано для social auth)
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await sql`
      INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
      VALUES (
        ${crypto.randomUUID()},
        ${user.id},
        ${refreshTokenHash},
        NOW() + INTERVAL '30 days'
      )
    `;

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const response: AuthResponse = { 
      user, 
      token, 
      refreshToken, 
      needsProfile: needsProfile(user.email), 
      expiresIn: 15 * 60 
    };
    res.json(response);
  } catch (err) {
    return serverError(res, 'POST /auth/social', err);
  }
}

// ============================================
// GET ME - БЕЗ ЗМІН
// ============================================
export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: 'user_not_found' });

    res.json({ user });
  } catch (err) {
    return serverError(res, 'GET /auth/me', err);
  }
}

// ============================================
// REFRESH TOKEN (НОВИЙ)
// ============================================
export async function refresh(req: Request, res: Response) {
  console.log('[Auth] POST /refresh');
  
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'refresh_token_required' });
    }

    // Верифікувати токен
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: string };

    // Перевірити в БД
    const [session] = await sql`
      SELECT refresh_token_hash, expires_at
      FROM sessions
      WHERE user_id = ${decoded.id}
      AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!session) {
      return res.status(401).json({ error: 'session_expired' });
    }

    // Перевірити hash
    const valid = await bcrypt.compare(refreshToken, session.refresh_token_hash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid_refresh_token' });
    }

    // Отримати user
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    // Генерувати новий access token
    const accessToken = signToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    console.log('[Auth] ✅ Token refreshed:', user.email);

    res.json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('[Auth] ❌ Refresh error:', err);
    res.status(401).json({ error: 'invalid_refresh_token' });
  }
}

// ============================================
// LOGOUT (НОВИЙ)
// ============================================
export async function logout(req: Request, res: Response) {
  console.log('[Auth] POST /logout');
  
  try {
    const userId = req.user?.id;

    if (userId) {
      // Видалити всі сесії користувача
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
    }

    // Очистити cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    console.log('[Auth] ✅ Logged out');

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Auth] ❌ Logout error:', err);
    res.status(500).json({ error: 'server_error' });
  }
}