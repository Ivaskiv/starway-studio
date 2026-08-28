import { beforeEach, describe, expect, it, vi } from 'vitest'

const clearAuthMock = vi.fn((payload?: unknown) => ({ type: 'auth/clearAuth', payload }))
const setCredentialsMock = vi.fn((payload: unknown) => ({ type: 'auth/setCredentials', payload }))
const getTokenMock = vi.fn()
const getRefreshTokenMock = vi.fn()
const hasSessionHintMock = vi.fn()
const resolveApiUrlMock = vi.fn((path: string) => `https://api.example.com${path}`)

vi.mock('@/features/auth/services/auth.slice', () => ({
  clearAuth: (payload?: unknown) => clearAuthMock(payload),
  setCredentials: (payload: unknown) => setCredentialsMock(payload),
}))

vi.mock('@/features/auth/services/token', () => ({
  getToken: () => getTokenMock(),
  getRefreshToken: () => getRefreshTokenMock(),
  hasSessionHint: () => hasSessionHintMock(),
}))

vi.mock('@/services/api', () => ({
  resolveApiUrl: (path: string) => resolveApiUrlMock(path),
}))

import { syncAuthSession } from './sessionSync'

describe('syncAuthSession miniapp ownership', () => {
  const dispatch = vi.fn()
  const theme = {
    setAccent: vi.fn(),
    setMode: vi.fn(),
    setBgColor: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    getTokenMock.mockReturnValue('stale-access-token')
    getRefreshTokenMock.mockReturnValue(null)
    hasSessionHintMock.mockReturnValue(false)

    vi.stubGlobal('window', {
      location: {
        pathname: '/miniapp/zoom-calendar',
        search: '?tgWebAppPlatform=ios',
        hostname: 'miniapp.example.com',
      },
      Telegram: {
        WebApp: {
          initData: 'signed-init-data',
          initDataUnsafe: {
            user: {
              id: 630111093,
            },
          },
        },
      },
      setTimeout,
      clearTimeout,
    })
    vi.stubGlobal('document', {})
    vi.stubGlobal('fetch', vi.fn())
  })

  function jsonResponse(body: unknown) {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  it('uses canonical telegram miniapp identity before stale web token restore', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: 'focus-user',
            email: 'focus@example.com',
            firstName: 'Фокус',
            role: 'USER',
            activeRole: 'USER',
            isAdmin: false,
            isSuperAdmin: false,
            abilities: [],
            access: { plan: 'paid', isPaid: true, isTrial: false },
            stats: { totalPoints: 0, completedBlocks: 0, level: 1 },
            lastLoginAt: null,
            telegramUserId: '630111093',
            telegramChatId: '630111093',
          },
          accessToken: 'telegram-token',
          refreshToken: 'telegram-refresh',
        }),
      )

    const restored = await syncAuthSession({ dispatch, theme })

    expect(restored).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/auth/telegram',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(setCredentialsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: 'focus-user',
          telegramUserId: '630111093',
        }),
        accessToken: 'telegram-token',
        refreshToken: 'telegram-refresh',
      }),
    )
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth/setCredentials',
      }),
    )
  })

  it('waits for delayed telegram initData before falling back to stale web auth', async () => {
    vi.useFakeTimers()

    const telegramWebApp: {
      initData: string
      initDataUnsafe: {
        user?: {
          id?: number
        }
      }
    } = {
      initData: '',
      initDataUnsafe: {},
    }

    vi.stubGlobal('window', {
      location: {
        pathname: '/miniapp/zoom-calendar',
        search: '?tgWebAppPlatform=ios',
        hostname: 'miniapp.example.com',
      },
      Telegram: {
        WebApp: telegramWebApp,
      },
      setTimeout,
      clearTimeout,
    })

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        user: {
          id: 'focus-user-delayed',
          email: 'focus@example.com',
          firstName: 'Фокус',
          role: 'USER',
          activeRole: 'USER',
          isAdmin: false,
          isSuperAdmin: false,
          abilities: [],
          access: { plan: 'paid', isPaid: true, isTrial: false },
          stats: { totalPoints: 0, completedBlocks: 0, level: 1 },
          lastLoginAt: null,
          telegramUserId: '630111093',
          telegramChatId: '630111093',
        },
        accessToken: 'telegram-token',
        refreshToken: 'telegram-refresh',
      }),
    )

    const restorePromise = syncAuthSession({ dispatch, theme })

    telegramWebApp.initData = 'delayed-signed-init-data'
    telegramWebApp.initDataUnsafe.user = {
      id: 630111093,
    }

    await vi.advanceTimersByTimeAsync(100)

    const restored = await restorePromise

    expect(restored).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/auth/telegram',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })

  it('treats protected admin Telegram WebApp routes as pending restore before initData arrives', async () => {
    vi.useFakeTimers()
    getTokenMock.mockReturnValue(null)
    getRefreshTokenMock.mockReturnValue(null)
    hasSessionHintMock.mockReturnValue(false)

    const telegramWebApp: {
      initData: string
      initDataUnsafe: {
        user?: {
          id?: number
        }
      }
    } = {
      initData: '',
      initDataUnsafe: {},
    }

    vi.stubGlobal('window', {
      location: {
        pathname: '/app/dashboard/admin/studio',
        search: '',
        hostname: 'miniapp.example.com',
      },
      Telegram: {
        WebApp: telegramWebApp,
      },
      setTimeout,
      clearTimeout,
    })

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        user: {
          id: 'coach-admin-user',
          email: 'coach@example.com',
          firstName: 'Coach',
          role: 'SUPERADMIN',
          activeRole: 'SUPERADMIN',
          isAdmin: true,
          isSuperAdmin: true,
          abilities: ['products.manage'],
          access: { plan: 'paid', isPaid: true, isTrial: false },
          stats: { totalPoints: 0, completedBlocks: 0, level: 1 },
          lastLoginAt: null,
          telegramUserId: '630111093',
          telegramChatId: '630111093',
        },
        accessToken: 'telegram-token',
        refreshToken: 'telegram-refresh',
      }),
    )

    const restorePromise = syncAuthSession({ dispatch, theme })

    await vi.advanceTimersByTimeAsync(100)

    telegramWebApp.initData = 'delayed-admin-init-data'
    telegramWebApp.initDataUnsafe.user = {
      id: 630111093,
    }

    await vi.advanceTimersByTimeAsync(100)

    const restored = await restorePromise

    expect(restored).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/auth/telegram',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(clearAuthMock).not.toHaveBeenCalled()
  })

  it('keeps non-miniapp web restore order unchanged', async () => {
    vi.stubGlobal('window', {
      location: {
        pathname: '/dashboard',
        search: '',
        hostname: 'app.example.com',
      },
      setTimeout,
      clearTimeout,
    })

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          user: {
            id: 'web-user',
            email: 'web@example.com',
            firstName: 'Веб',
            role: 'USER',
            activeRole: 'USER',
            isAdmin: false,
            isSuperAdmin: false,
            abilities: [],
            access: { plan: 'paid', isPaid: true, isTrial: false },
            stats: { totalPoints: 0, completedBlocks: 0, level: 1 },
            lastLoginAt: null,
          },
          accessToken: 'stale-access-token',
        }),
      )

    const restored = await syncAuthSession({ dispatch, theme })

    expect(restored).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/auth/me',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer stale-access-token',
        },
      }),
    )
  })

  it('restores a same-origin local web session via cookie refresh without session hint', async () => {
    getTokenMock.mockReturnValue(null)
    getRefreshTokenMock.mockReturnValue(null)
    hasSessionHintMock.mockReturnValue(false)
    resolveApiUrlMock.mockImplementation((path: string) => `/api${path}`)

    vi.stubGlobal('window', {
      location: {
        pathname: '/app/dashboard/admin/studio',
        search: '?tab=agents&item=agents.overview',
        hostname: 'localhost',
        origin: 'http://localhost:5173',
      },
      setTimeout,
      clearTimeout,
    })

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        user: {
          id: 'admin-user',
          email: 'admin@example.com',
          firstName: 'Admin',
          role: 'SUPERADMIN',
          activeRole: 'SUPERADMIN',
          isAdmin: true,
          isSuperAdmin: true,
          abilities: ['products.manage'],
          access: { plan: 'paid', isPaid: true, isTrial: false },
          stats: { totalPoints: 0, completedBlocks: 0, level: 1 },
          lastLoginAt: null,
        },
        accessToken: 'cookie-refresh-token',
        refreshToken: 'cookie-refresh-token-2',
      }),
    )

    const restored = await syncAuthSession({
      allowRefreshWithoutHint: true,
      dispatch,
      theme,
    })

    expect(restored).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    )
    expect(setCredentialsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: 'admin-user',
          role: 'SUPERADMIN',
        }),
        accessToken: 'cookie-refresh-token',
        refreshToken: 'cookie-refresh-token-2',
      }),
    )
  })
})
