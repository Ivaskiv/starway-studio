// packages/backend/src/services/auth.service.ts
import jwt from 'jsonwebtoken'
import { sql } from '../db/client'
import type { User } from '../types/user'

const JWT_SECRET = process.env.JWT_SECRET!

export async function getUserById(user_id: string): Promise<User | null> {
  const [user] = await sql`
    SELECT id, email, first_name, last_name, role
    FROM users
    WHERE id = ${user_id} AND is_active = true
  `

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    role: user.role,
  }
}

export function signToken(user_id: string) {
  return jwt.sign({ id: user_id }, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): { id: string } {
  return jwt.verify(token, JWT_SECRET) as { id: string }
}
