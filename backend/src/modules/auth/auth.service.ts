// backend/src/modules/auth/auth.service.ts

import axios from 'axios'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { sql } from '../../db/client.js'
import type { User, UserRole, SocialPlatform } from '../../types/types'
import type { JwtPayload } from './auth.types.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET missing')

const JWT_EXPIRES_IN = '15m'       // access token
const REFRESH_EXPIRES_IN = '30d'   // refresh token
const BCRYPT_ROUNDS = 10
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

// ====== JWT ======
export const signToken = (payload: { id: string; role: UserRole; email?: string }) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

export const signRefreshToken = (payload: { id: string }) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN })

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET) as JwtPayload

// ====== USERS ======
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await sql<User>`
    SELECT * FROM users
    WHERE email = ${email.toLowerCase().trim()}
      AND (is_active IS NULL OR is_active = true)
  `
  return user ?? null
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await sql<User>`
    SELECT * FROM users WHERE id = ${id}
  `
  return user ?? null
}

// ====== LOCAL AUTH ======
export async function createUserLocal(input: { email: string; password: string; name?: string }): Promise<User> {
  const id = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

  const [user] = await sql<User>`
    INSERT INTO users (id, email, password_hash, first_name, role, auth_provider)
    VALUES (${id}, ${input.email.toLowerCase().trim()}, ${passwordHash}, ${input.name ?? null}, 'user', 'app')
    RETURNING *
  `
  if (!user) throw new Error('User creation failed')
  return user
}

export const validatePassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash)

// ====== SOCIAL AUTH ======
export async function findOrCreateSocialUser(input: { provider: SocialPlatform; externalId: string; username?: string }): Promise<User> {
  const existing = await findSocialUser(input.provider, input.externalId)
  if (existing) return existing

  const id = crypto.randomUUID()

  if (input.provider === 'telegram') {
    const [user] = await sql<User>`
      INSERT INTO users (id, role, auth_provider, telegram_id, telegram_username)
      VALUES (${id}, 'user', 'telegram', ${input.externalId}, ${input.username ?? null})
      RETURNING *
    `
    if (!user) throw new Error('Telegram user creation failed')
    return user
  }

  if (input.provider === 'instagram') {
    const [user] = await sql<User>`
      INSERT INTO users (id, role, auth_provider, instagram_id, instagram_username)
      VALUES (${id}, 'user', 'instagram', ${input.externalId}, ${input.username ?? null})
      RETURNING *
    `
    if (!user) throw new Error('Instagram user creation failed')
    return user
  }

  throw new Error('Unsupported social provider')
}

async function findSocialUser(provider: SocialPlatform, externalId: string): Promise<User | null> {
  if (provider === 'telegram') {
    const [user] = await sql<User>`
      SELECT * FROM users WHERE telegram_id = ${externalId}
    `
    return user ?? null
  }

  if (provider === 'instagram') {
    const [user] = await sql<User>`
      SELECT * FROM users WHERE instagram_id = ${externalId}
    `
    return user ?? null
  }

  return null
}
