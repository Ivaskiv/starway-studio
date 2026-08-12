import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/auth/services/auth.slice', () => ({
  clearAuth: vi.fn(),
  setCredentials: vi.fn(),
}))

vi.mock('@/features/auth/services/token', () => ({
  getRefreshToken: vi.fn(() => null),
  hasSessionHint: vi.fn(() => false),
}))

vi.mock('@/features/social/utils/telegramWebApp', () => ({
  isTelegramMiniApp: vi.fn(() => false),
}))

vi.mock('@/app/tagTypes', () => ({
  TAG_TYPES: [],
}))

describe('resolveApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses the Render production fallback when remote mode has no explicit API url', async () => {
    vi.stubEnv('VITE_API_MODE', 'remote')
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_API_URL', '')

    const { resolveApiUrl } = await import('./api')

    expect(resolveApiUrl('/access/state')).toBe('https://starway-api.onrender.com/api/access/state')
  })

  it('prefers an explicit remote API base url when it is configured', async () => {
    vi.stubEnv('VITE_API_MODE', 'remote')
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')

    const { resolveApiUrl } = await import('./api')

    expect(resolveApiUrl('/access/state')).toBe('https://api.example.com/api/access/state')
  })

  it('keeps the same zoom endpoint path in local and remote modes', async () => {
    vi.stubEnv('VITE_API_MODE', 'local')
    let module = await import('./api')
    const localUrl = module.resolveApiUrl('/zoom/week')

    vi.resetModules()
    vi.stubEnv('VITE_API_MODE', 'remote')
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    module = await import('./api')
    const remoteUrl = module.resolveApiUrl('/zoom/week')

    expect(new URL(localUrl, 'https://local.example').pathname).toBe('/api/zoom/week')
    expect(new URL(remoteUrl).pathname).toBe('/api/zoom/week')
  })
})
