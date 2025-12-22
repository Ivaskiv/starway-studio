// /starway-studio/packages/backend/src/routes/auth.ts
// packages/backend/src/routes/auth.ts

import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { sql } from '../db/client.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body
  
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const [exists] = await sql`SELECT 1 FROM users WHERE email = ${email}`
    if (exists) {
      return res.status(409).json({ error: 'email_exists' })
    }

    const [{ count }] = await sql`SELECT COUNT(*) as count FROM users`
    const role = Number(count) === 0 ? 'super_admin' : 'user'

    const hash = await bcrypt.hash(password, 10)

    const [user] = await sql`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (
        ${crypto.randomUUID()}, 
        ${email}, 
        ${hash}, 
        ${name || email.split('@')[0]}, 
        ${role}
      )
      RETURNING id, email, name, role
    `

    const secret = process.env.JWT_SECRET!
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' })

    res.status(201).json({ token, user })
  } catch (err) {
    console.error('[auth/register]', err)
    res.status(500).json({ error: 'server_error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  try {
    const [user] = await sql`
      SELECT id, email, name, role, password_hash 
      FROM users 
      WHERE email = ${email}
    `

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }

    const secret = process.env.JWT_SECRET!
    const token = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' })

    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role } 
    })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ error: 'server_error' })
  }
})

export default router