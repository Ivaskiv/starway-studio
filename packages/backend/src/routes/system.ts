// packages/backend/src/routes/system.ts
// Об'єднує: ping, demo, webhook, me, users (базові операції)

import { Router } from 'express'
import { sql } from '../db/client.js'

const router = Router()

// GET /ping
router.get('/ping', (req, res) => {
  res.json({ ok: true, status: 'alive', timestamp: Date.now() })
})

// GET /health
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// POST /webhook - Універсальний вебхук
router.post('/webhook', async (req, res) => {
  const payload = req.body
  
  try {
    // WayForPay
    if (payload.orderReference && payload.merchantSignature) {
      // Обробка платежу
      res.json({ ok: true, source: 'wayforpay' })
      return
    }
    
    // Telegram
    if (payload.message || payload.callback_query) {
      // Обробка Telegram update
      res.json({ ok: true, source: 'telegram' })
      return
    }
    
    res.status(400).json({ ok: false, reason: 'UNSUPPORTED_PAYLOAD' })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// GET /users/telegram/:tgId
router.get('/users/telegram/:tgId', async (req, res) => {
  try {
    const [user] = await sql`
      SELECT * FROM users WHERE telegram_id = ${req.params.tgId}
    `
    res.json(user || null)
  } catch (err) {
    res.status(500).json({ error: 'server_error' })
  }
})

export default router