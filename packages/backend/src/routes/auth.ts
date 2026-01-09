// packages/backend/src/routes/auth.ts

import { Request, Response } from 'express'
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sql } from '../db/client'
import { authRequired } from '../middleware/auth'

const ALLOWED_ROLES = ['funnel_admin', 'user'] as const
type AllowedRole = typeof ALLOWED_ROLES[number]

const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body

    // Обов’язкові поля
    if (!email || !password || !firstName) {
      return res.status(400).json({ error: 'invalid_data', message: 'Ім’я, email і пароль обов’язкові' })
    }

    // 1. Перевірка чи існує користувач
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'user_exists', message: 'Користувач з таким email вже існує' })
    }

    // 2. Безпечна роль — сервер не довіряє клієнту!
    let safeRole: AllowedRole = 'user'

    if (ALLOWED_ROLES.includes(role)) {
      safeRole = role
    } else {
      console.warn(`Невалідна роль від клієнта: ${role}. Використано дефолт 'user'`)
    }

    // 3. Trial 7 днів
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // 4. Хеш пароля
    const hashedPassword = await bcrypt.hash(password, 10)

    // 5. Створення користувача
    const users = await sql`
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        role,
        trial_ends_at,
        subscription_status,
        is_active,
        is_email_verified
      )
      VALUES (
        ${email},
        ${hashedPassword},
        ${firstName},
        ${lastName || null},
        ${safeRole},
        ${trialEndsAt},
        'none',
        true,
        false
      )
      RETURNING
        id,
        email,
        first_name,
        last_name,
        role,
        trial_ends_at,
        telegram_id,
        telegram_username,
        is_active,
        is_email_verified,
        created_at
    `
    const user = users[0]

    // 6. Токени
    const secret = process.env.JWT_SECRET!
    const accessToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' })
    const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' })

    res.status(201).json({
      success: true,
      user: {
      id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.created_at,
        // Subscription
        trialEndsAt: user.trial_ends_at,
        subscriptionStatus: user.subscription_status || 'none',
        subscriptionPlan: user.subscription_plan || null,
        subscriptionEndsAt: user.subscription_ends_at || null,
        // Telegram
        telegramId: user.telegram_id || null,
        telegramUsername: user.telegram_username || null,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 30 * 24 * 60 * 60,
      },
      message: `Вітаємо! Ви зареєстровані як ${user.role === 'funnel_admin' ? 'власник AI-воронок' : 'користувач'}`
    })
  } catch (err: any) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'invalid_data', message: 'Email і пароль обов’язкові' })
    }

    const users = await sql`
      SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        trial_ends_at,
        subscription_status,
        subscription_plan,
        subscription_ends_at,
        telegram_id,
        telegram_username,
        is_active,
        is_email_verified,
        created_at,
        updated_at
      FROM users
      WHERE email = ${email}
    `

    if (users.length === 0) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Невірний email або пароль' })
    }

    const user = users[0]

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'invalid_credentials', message: 'Невірний email або пароль' })
    }

    const secret = process.env.JWT_SECRET!
    const accessToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' })
    const refreshToken = jwt.sign({ id: user.id }, secret, { expiresIn: '30d' })

    res.json({
      success: true,
      user: {
id: user.id,
        email: user.email,
        firstName: user.first_name ?? '',
        lastName: user.last_name ?? '',
        role: user.role,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        // Subscription
        trialEndsAt: user.trial_ends_at,
        subscriptionStatus: user.subscription_status || 'none',
        subscriptionPlan: user.subscription_plan || null,
        subscriptionEndsAt: user.subscription_ends_at || null,
        // Telegram
        telegramId: user.telegram_id || null,
        telegramUsername: user.telegram_username || null,      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 30 * 24 * 60 * 60,
      },
      message: 'Вхід успішний!'
    })
  } catch (err: any) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

// ============ GET ME ============
router.get('/me', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Не авторизовано' })
    }

    const users = await sql`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        avatar,
        phone,
        timezone,
        trial_ends_at,
        subscription_status,
        subscription_plan,
        subscription_ends_at,
        telegram_id,
        telegram_username,
        telegram_connected_at,
        is_active,
        is_email_verified,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE id = ${userId}
    `

    if (users.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Користувача не знайдено' })
    }

    const user = users[0]

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name ?? '',
        lastName: user.last_name ?? '',
        role: user.role,
        avatar: user.avatar || null,
        phone: user.phone || null,
        timezone: user.timezone || null,
        isActive: user.is_active,
        isEmailVerified: user.is_email_verified,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        // Subscription
        trialEndsAt: user.trial_ends_at,
        subscriptionStatus: user.subscription_status || 'none',
        subscriptionPlan: user.subscription_plan || null,
        subscriptionEndsAt: user.subscription_ends_at || null,
        // Telegram
        telegramId: user.telegram_id || null,
        telegramUsername: user.telegram_username || null,
        telegramConnectedAt: user.telegram_connected_at || null,
      },
    })
  } catch (err: any) {
    console.error('Get me error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

// ============ CONNECT TELEGRAM ============
router.post('/telegram/connect', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const { telegramId, username } = req.body

    if (!telegramId) {
      return res.status(400).json({ error: 'invalid_data', message: 'Telegram ID обов\'язковий' })
    }

    await sql`
      UPDATE users 
      SET 
        telegram_id = ${telegramId},
        telegram_username = ${username || null},
        telegram_connected_at = NOW(),
        updated_at = NOW()
      WHERE id = ${userId}
    `

    res.json({ success: true, message: 'Telegram підключено' })
  } catch (err: any) {
    console.error('Connect telegram error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

// ============ DISCONNECT TELEGRAM ============
router.post('/telegram/disconnect', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id

    await sql`
      UPDATE users 
      SET 
        telegram_id = NULL,
        telegram_username = NULL,
        telegram_connected_at = NULL,
        updated_at = NOW()
      WHERE id = ${userId}
    `

    res.json({ success: true, message: 'Telegram відключено' })
  } catch (err: any) {
    console.error('Disconnect telegram error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

export default router