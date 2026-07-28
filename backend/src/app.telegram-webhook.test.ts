import { beforeEach, describe, expect, it, vi } from 'vitest'

const mainHandleUpdate = vi.fn()
const coachHandleUpdate = vi.fn()
const testHandleUpdate = vi.fn()

vi.mock('./lib/telegram.js', () => ({
  bot: { handleUpdate: mainHandleUpdate },
  coachBot: { handleUpdate: coachHandleUpdate },
  testBot: { handleUpdate: testHandleUpdate },
  resolveTelegramWebhookSecretMap: () => ({
    main: 'main-secret',
    coach: 'coach-secret',
    test: 'test-secret',
  }),
}))

describe('resolveTelegramWebhookTarget', () => {
  beforeEach(() => {
    mainHandleUpdate.mockReset()
    coachHandleUpdate.mockReset()
    testHandleUpdate.mockReset()
  })

  it('routes main secret to the main bot', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('main-secret')

    expect(target?.id).toBe('main')
  })

  it('routes coach secret to the coach bot', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('coach-secret')

    expect(target?.id).toBe('coach')
  })

  it('routes test secret to the test bot', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('test-secret')

    expect(target?.id).toBe('test')
  })

  it('rejects an empty secret', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('')

    expect(target).toBeNull()
  })

  it('rejects an invalid secret', async () => {
    const { resolveTelegramWebhookTarget } = await import('./app.js')

    const target = resolveTelegramWebhookTarget('wrong-secret')

    expect(target).toBeNull()
  })
})
