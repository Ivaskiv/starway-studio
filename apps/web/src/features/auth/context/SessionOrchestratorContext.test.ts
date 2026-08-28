import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('SessionOrchestratorContext deeplink handoff ownership', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('treats protected routes with dl query as pending auth handoff', async () => {
    const { hasPendingDeepLinkSessionHandoff } = await import('./SessionOrchestratorContext')

    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: vi.fn(() => null),
      },
    })

    expect(
      hasPendingDeepLinkSessionHandoff(
        '/app/dashboard/admin/studio',
        '?tab=agents&item=agents.overview&dl=coach-token',
      ),
    ).toBe(true)
  })

  it('keeps sanitized protected routes pending while deeplink restore is still in flight', async () => {
    const {
      PENDING_DEEPLINK_TOKEN_KEY,
      hasPendingDeepLinkSessionHandoff,
    } = await import('./SessionOrchestratorContext')

    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: vi.fn((key: string) => key === PENDING_DEEPLINK_TOKEN_KEY ? 'coach-token' : null),
      },
    })

    expect(
      hasPendingDeepLinkSessionHandoff(
        '/app/dashboard/admin/studio',
        '?tab=agents&item=agents.overview',
      ),
    ).toBe(true)
  })

  it('stops blocking protected routes after the deeplink handoff token is gone', async () => {
    const { hasPendingDeepLinkSessionHandoff } = await import('./SessionOrchestratorContext')

    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: vi.fn(() => null),
      },
    })

    expect(
      hasPendingDeepLinkSessionHandoff(
        '/app/dashboard/admin/studio',
        '?tab=agents&item=agents.overview',
      ),
    ).toBe(false)
  })

  it('suppresses the auth modal in Telegram only while session restore is still pending', async () => {
    const { shouldSuppressMiniAppAuthModal } = await import('./SessionOrchestratorContext')

    expect(shouldSuppressMiniAppAuthModal(true, 'auth_restoring')).toBe(true)
    expect(shouldSuppressMiniAppAuthModal(true, 'guest')).toBe(false)
    expect(shouldSuppressMiniAppAuthModal(true, 'recovery_required')).toBe(false)
    expect(shouldSuppressMiniAppAuthModal(false, 'auth_restoring')).toBe(false)
  })
})
