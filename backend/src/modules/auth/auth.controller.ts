// backend/src/modules/auth/auth.controller.ts
import type { Request, Response } from 'express';
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

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // на localhost не secure
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // cross-site prod, lax dev
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 днів
};

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.includes('@') && value.trim().length > 3;
}

function needsProfile(email?: string | null) {
  return !email || email.trim().length === 0;
}

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

    // 🔑 встановлюємо refreshToken в куку
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const response: AuthResponse = { user, token, refreshToken, needsProfile: needsProfile(user.email), expiresIn: 15 * 60 };
    res.status(201).json(response);
  } catch (err) {
    return serverError(res, 'POST /auth/register', err);
  }
}

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

    // 🔑 встановлюємо куку
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const response: AuthResponse = { user, token, refreshToken, needsProfile: needsProfile(user.email), expiresIn: 15 * 60 };
    res.json(response);
  } catch (err) {
    return serverError(res, 'POST /auth/login', err);
  }
}

export async function socialAuth(req: Request, res: Response) {
  try {
    const { provider, external_id, username } = req.body;
    if (!provider || !external_id) return res.status(400).json({ error: 'provider_and_external_id_required' });

    const user = await findOrCreateSocialUser({ provider, externalId: external_id, username });
    const token = signToken({ id: user.id, role: user.role, email: user.email ?? '' });
    const refreshToken = signRefreshToken({ id: user.id });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const response: AuthResponse = { user, token, refreshToken, needsProfile: needsProfile(user.email), expiresIn: 15 * 60 };
    res.json(response);
  } catch (err) {
    return serverError(res, 'POST /auth/social', err);
  }
}

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
