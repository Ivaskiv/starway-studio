// backend/src/modules/auth/auth.service.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../../db/client.js';
import type { User, UserRole, SocialPlatform } from '../../types/types.js';
import { JwtPayload, SocialAuthInput } from '../auth/auth.types.js';

// ======================= CONFIG =======================

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in .env'); // падіння сервера на старті
}
const JWT_EXPIRES_IN = '30d';
const BCRYPT_ROUNDS = 10;

// ======================= JWT =======================

export function signToken(payload: Omit<JwtPayload, 'email'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
  
}

// ======================= USER QUERIES =======================

export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await sql<User>`
    SELECT 
      id, email, password_hash, first_name, last_name, 
      role, avatar, auth_provider,
      telegram_id, telegram_username, 
      instagram_id, instagram_username
    FROM users
    WHERE email = ${email.toLowerCase().trim()} 
      AND (is_active = true OR is_active IS NULL)
  `;
  return user ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await sql<User>`
    SELECT 
      id, email, first_name, last_name, 
      role, avatar, auth_provider,
      telegram_id, telegram_username, 
      instagram_id, instagram_username
    FROM users
    WHERE id = ${id}
  `;
  return user ?? null;
}

// ======================= AUTH =======================

export async function createUserLocal(data: {
  email: string;
  password: string;
  name?: string;
}): Promise<User> {
  const { email, password, name } = data;
  
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = crypto.randomUUID();
  const role: UserRole = 'user';

  const [created] = await sql<User>`
    INSERT INTO users (id, email, password_hash, first_name, role, auth_provider)
    VALUES (
      ${id}, 
      ${email.toLowerCase().trim()}, 
      ${password_hash}, 
      ${name ?? null}, 
      ${role},
      'app'
    )
    RETURNING id, email, first_name, last_name, role, auth_provider
  `;

  if (!created) {
    throw new Error('User creation failed');
  }

  return created;
}

export async function validatePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// ======================= SOCIAL AUTH =======================

export async function findOrCreateSocialUser(data: SocialAuthInput): Promise<User> {
  const { provider, externalId, username } = data;

  // Шукаємо існуючого користувача
  let user = await findSocialUser(provider, externalId);

  if (user) {
    return user;
  }

  // Створюємо нового
  const id = crypto.randomUUID();
  const role: UserRole = 'user';

  if (provider === 'telegram') {
    const [created] = await sql<User>`
      INSERT INTO users (id, role, auth_provider, telegram_id, telegram_username)
      VALUES (${id}, ${role}, ${provider}, ${externalId}, ${username ?? null})
      RETURNING 
        id, email, first_name, last_name, role, auth_provider,
        telegram_id, telegram_username, instagram_id, instagram_username
    `;
    if (!created) throw new Error('Social user creation failed');
    return created;
  }

  if (provider === 'instagram') {
    const [created] = await sql<User>`
      INSERT INTO users (id, role, auth_provider, instagram_id, instagram_username)
      VALUES (${id}, ${role}, ${provider}, ${externalId}, ${username ?? null})
      RETURNING 
        id, email, first_name, last_name, role, auth_provider,
        telegram_id, telegram_username, instagram_id, instagram_username
    `;
    if (!created) throw new Error('Social user creation failed');
    return created;
  }

  throw new Error(`Unsupported social provider: ${provider}`);
}

async function findSocialUser(
  provider: SocialPlatform,
  external_id: string
): Promise<User | null> {
  if (provider === 'telegram') {
    const [user] = await sql<User>`
      SELECT * FROM users WHERE telegram_id = ${external_id}
    `;
    return user ?? null;
  }

  if (provider === 'instagram') {
    const [user] = await sql<User>`
      SELECT * FROM users WHERE instagram_id = ${external_id}
    `;
    return user ?? null;
  }

  return null;
}