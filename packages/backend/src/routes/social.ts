// packages/backend/src/routes/social.ts
// Універсальний роутер для всіх соцмереж

import { Router } from 'express'
import { sql } from '../db/client'
import { authRequired } from '../middleware/auth'

const router = Router()

// Типи соцмереж які підтримуємо
type SocialProvider = 'telegram' | 'instagram' | 'facebook' | 'google'

interface SocialConnection {
  provider: SocialProvider
  external_id: string
  username?: string
  accessToken?: string
  refreshToken?: string
  metadata?: Record<string, any>
}

// ============ GET CONNECTIONS ============
// GET /api/social/connections
router.get('/connections', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id

    const connections = await sql`
      SELECT 
        provider,
        external_id,
        username,
        connectedAt,
        metadata
      FROM user_social_connections
      WHERE user_id = ${user_id}
      ORDER BY connectedAt DESC
    `

    res.json({
      success: true,
      connections: connections.map(c => ({
        provider: c.provider,
        external_id: c.external_id,
        username: c.username,
        connectedAt: c.connectedAt,
        metadata: c.metadata,
      })),
    })
  } catch (err) {
    console.error('Get social connections error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

// ============ CONNECT SOCIAL ============
// POST /api/social/connect
router.post('/connect', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id
    const { provider, external_id, username, accessToken, refreshToken, metadata } = req.body as SocialConnection

    if (!provider || !external_id) {
      return res.status(400).json({ 
        error: 'invalid_data', 
        message: 'Provider та external_id обов\'язкові' 
      })
    }

    // Перевіряємо чи не підключено вже до іншого акаунту
    const existing = await sql`
      SELECT user_id FROM user_social_connections
      WHERE provider = ${provider} AND external_id = ${external_id}
    `

    if (existing.length > 0 && existing[0].user_id !== user_id) {
      return res.status(409).json({ 
        error: 'already_connected', 
        message: 'Цей акаунт вже підключено до іншого користувача' 
      })
    }

    // Upsert connection
    await sql`
      INSERT INTO user_social_connections (
        user_id, provider, external_id, username, accessToken, refreshToken, metadata, connectedAt
      ) VALUES (
        ${user_id}, ${provider}, ${external_id}, ${username || null}, 
        ${accessToken || null}, ${refreshToken || null}, ${JSON.stringify(metadata || {})}, NOW()
      )
      ON CONFLICT (user_id, provider) 
      DO UPDATE SET
        external_id = ${external_id},
        username = ${username || null},
        accessToken = ${accessToken || null},
        refreshToken = ${refreshToken || null},
        metadata = ${JSON.stringify(metadata || {})},
        connectedAt = NOW()
    `

    // Для Telegram також оновлюємо старі поля (backward compatibility)
    if (provider === 'telegram') {
      await sql`
        UPDATE users 
        SET telegram_id = ${external_id}, 
            telegram_user_Name = ${username || null},
            telegram_connected_at = NOW()
        WHERE id = ${user_id}
      `
    }

    res.json({ success: true, message: `${provider} підключено` })
  } catch (err: any) {
    console.error('Connect social error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

// ============ DISCONNECT SOCIAL ============
// POST /api/social/disconnect
router.post('/disconnect', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id
    const { provider } = req.body

    if (!provider) {
      return res.status(400).json({ error: 'invalid_data', message: 'Provider обов\'язковий' })
    }

    await sql`
      DELETE FROM user_social_connections
      WHERE user_id = ${user_id} AND provider = ${provider}
    `

    // Для Telegram очищаємо старі поля
    if (provider === 'telegram') {
      await sql`
        UPDATE users 
        SET telegram_id = NULL, 
            telegram_user_Name = NULL,
            telegram_connected_at = NULL
        WHERE id = ${user_id}
      `
    }

    res.json({ success: true, message: `${provider} відключено` })
  } catch (err: any) {
    console.error('Disconnect social error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

// ============ TELEGRAM SPECIFIC ============
// GET /api/social/telegram/link
router.get('/telegram/link', authRequired, async (req, res) => {
  try {
    const user_id = req.user!.id
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'StarwayMentorBot'

    // Генеруємо унікальний код
    const linkCode = Buffer.from(`${user_id}:${Date.now()}`).toString('base64url')

    // Перевіряємо, чи існує таблиця (тимчасовий захист від 42P01)
    try {
      await sql`
        INSERT INTO telegram_link_codes (user_id, code, expires_at)
        VALUES (${user_id}, ${linkCode}, NOW() + INTERVAL '10 minutes')
        ON CONFLICT (user_id) DO UPDATE SET
          code = ${linkCode},
          expires_at = NOW() + INTERVAL '10 minutes'
      `
    } catch (err: any) {
      if (err.code === '42P01') {
        console.warn('Таблиця telegram_link_codes відсутня. Створіть її в базі даних.')
        return res.status(500).json({
          error: 'database_error',
          message: 'Система зв\'язку з Telegram тимчасово недоступна. Зверніться до підтримки.'
        })
      }
      throw err
    }

    res.json({
      success: true,
      link: `https://t.me/${botUsername}?start=${linkCode}`,
      expiresIn: 600, // 10 хвилин
    })
  } catch (err: any) {
    console.error('Get telegram link error:', err)
    res.status(500).json({ error: 'server_error', message: 'Помилка сервера' })
  }
})

export default router