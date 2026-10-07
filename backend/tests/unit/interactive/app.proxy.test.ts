import { describe, expect, it, vi } from 'vitest'
import type { AddressInfo } from 'node:net'
import express from 'express'

import { authLimiter } from '../../../src/middleware/rateLimiter.ts'

vi.mock('../../../src/lib/telegram.ts', () => ({
  bot: { handleUpdate: vi.fn(async () => undefined) },
  coachBot: { handleUpdate: vi.fn(async () => undefined) },
  launchBot: vi.fn(async () => undefined),
  resolveTelegramWebhookSecretMap: () => ({ main: '', coach: '' }),
}))

describe('app proxy policy', () => {
  it('accepts a forwarded client address through the nearest trusted proxy', async () => {
    const { configureTrustedProxy } = await import('../../../src/app.ts')
    const app = express()
    configureTrustedProxy(app)
    app.post('/__rate-limit-proxy-probe', authLimiter, (_req, res) => {
      res.sendStatus(204)
    })

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const candidate = app.listen(0, '127.0.0.1', () => resolve(candidate))
    })

    try {
      const address = server.address() as AddressInfo
      const response = await fetch(
        `http://127.0.0.1:${address.port}/__rate-limit-proxy-probe`,
        {
          method: 'POST',
          headers: { 'x-forwarded-for': '198.51.100.10' },
        },
      )

      expect(app.get('trust proxy')).toBe(1)
      expect(response.status).toBe(204)
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
    }
  })
})
