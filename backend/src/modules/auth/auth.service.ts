// backend/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { sql } from '../../db/client.js';
import type { SocialPlatform, User, UserRole } from '../../types/types.js';
import type { JwtPayload, SocialAuthInput } from './auth.types.js';

// ================= CONFIG =================
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not defined in .env');

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '30d';
const BCRYPT_ROUNDS = 10;

// ================= JWT =================
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(payload: { id: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

// ================= USER QUERIES =================
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await sql<User>`
    SELECT * FROM users
    WHERE email = ${email.toLowerCase().trim()} AND (is_active IS NULL OR is_active = true)
  `;
  return user ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await sql<User>`SELECT * FROM users WHERE id = ${id}`;
  return user ?? null;
}

// ================= LOCAL AUTH =================
export async function createUserLocal(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<User> {
  const { email, password, name } = data;
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = crypto.randomUUID();
  const role: UserRole = 'user';

  const [user] = await sql<User>`
    INSERT INTO users (id, email, password_hash, first_name, role, auth_provider)
    VALUES (${id}, ${email.toLowerCase().trim()}, ${password_hash}, ${name ?? null}, ${role}, 'app')
    RETURNING *
  `;
  if (!user) throw new Error('User creation failed');
  return user;
}

export async function validatePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ================= SOCIAL AUTH =================
export async function findOrCreateSocialUser(data: SocialAuthInput): Promise<User> {
  const { provider, externalId, username } = data;
  const existing = await findSocialUser(provider, externalId);
  if (existing) return existing;

  const id = crypto.randomUUID();
  const role: UserRole = 'user';

  if (provider === 'telegram') {
    const [user] = await sql<User>`
      INSERT INTO users (id, role, auth_provider, telegram_id, telegram_username)
      VALUES (${id}, ${role}, 'telegram', ${externalId}, ${username ?? null})
      RETURNING *
    `;
    if (!user) throw new Error('Telegram user creation failed');
    return user;
  }

  if (provider === 'instagram') {
    const [user] = await sql<User>`
      INSERT INTO users (id, role, auth_provider, instagram_id, instagram_username)
      VALUES (${id}, ${role}, 'instagram', ${externalId}, ${username ?? null})
      RETURNING *
    `;
    if (!user) throw new Error('Instagram user creation failed');
    return user;
  }

  throw new Error(`Unsupported social provider: ${provider}`);
}

async function findSocialUser(provider: SocialPlatform, externalId: string): Promise<User | null> {
  if (provider === 'telegram') {
    const [user] = await sql<User>`SELECT * FROM users WHERE telegram_id = ${externalId}`;
    return user ?? null;
  }
  if (provider === 'instagram') {
    const [user] = await sql<User>`SELECT * FROM users WHERE instagram_id = ${externalId}`;
    return user ?? null;
  }
  return null;
}
