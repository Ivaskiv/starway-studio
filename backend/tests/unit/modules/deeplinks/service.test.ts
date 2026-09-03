import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/config/webapp.ts', () => ({
  resolveCoachWebAppBaseUrl: vi.fn(() => 'https://starway-frontend.vercel.app'),
  resolveTelegramWebappBaseUrl: vi.fn(() => 'https://starway-frontend.vercel.app'),
}))

const mockDeepLinkCreate = vi.fn()
const mockTrackEvent = vi.fn()

vi.mock('../../../../src/db/client.ts', () => ({
  prisma: {
    deepLinkToken: {
      create: (...args: unknown[]) => mockDeepLinkCreate(...args),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('../../../../src/modules/events/service.ts', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

import {
  buildMagicLoginWebLink,
  buildWebDeepLink,
  COACH_AGENTS_RETURN_TARGET,
  COACH_ZOOM_RETURN_TARGET,
  generateCoachAgentsWebDeepLink,
  generateCoachZoomWebDeepLink,
} from '../../../../src/modules/deeplinks/service.ts'

describe('deeplinks service frontend origin', () => {
  it('builds web deeplinks against the public frontend origin', () => {
    process.env.FRONTEND_URL = 'http://localhost:5173'
    process.env.PUBLIC_FRONTEND_URL = 'https://starway-frontend.vercel.app'

    expect(buildWebDeepLink('coach-token', '/app/dashboard/admin/studio?tab=agents&item=agents.overview'))
      .toBe('https://starway-frontend.vercel.app/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-token')
  })

  it('builds magic login links against the public frontend origin', () => {
    process.env.FRONTEND_URL = 'http://localhost:5173'
    process.env.PUBLIC_FRONTEND_URL = 'https://starway-frontend.vercel.app'

    expect(buildMagicLoginWebLink('magic-token'))
      .toBe('https://starway-frontend.vercel.app/auth/magic?token=magic-token')
  })

  it('builds coach agents deeplinks through auth bootstrap with the canonical return target', async () => {
    mockDeepLinkCreate.mockResolvedValueOnce({
      id: 'dl-1',
      userId: 'coach-user-id',
      token: 'coach-token',
      action: 'open_web',
      source: 'telegram',
      target: 'web',
      path: COACH_AGENTS_RETURN_TARGET,
      payload: null,
      createdAt: new Date('2026-08-03T12:00:00.000Z'),
      expiresAt: new Date('2026-08-03T12:15:00.000Z'),
      consumedAt: null,
    })

    const url = await generateCoachAgentsWebDeepLink('coach-user-id')

    expect(url).toBe(
      'https://starway-frontend.vercel.app/app/dashboard/admin/studio?tab=agents&item=agents.overview&dl=coach-token',
    )
    expect(mockDeepLinkCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'coach-user-id',
        action: 'open_web',
        path: COACH_AGENTS_RETURN_TARGET,
      }),
    }))
    expect(mockTrackEvent).toHaveBeenCalled()
  })

  it('builds coach zoom deeplinks through auth bootstrap with the canonical return target', async () => {
    mockDeepLinkCreate.mockResolvedValueOnce({
      id: 'dl-2',
      userId: 'coach-user-id',
      token: 'coach-zoom-token',
      action: 'open_web',
      source: 'telegram',
      target: 'web',
      path: COACH_ZOOM_RETURN_TARGET,
      payload: null,
      createdAt: new Date('2026-08-03T12:00:00.000Z'),
      expiresAt: new Date('2026-08-03T12:15:00.000Z'),
      consumedAt: null,
    })

    const url = await generateCoachZoomWebDeepLink('coach-user-id')

    expect(url).toBe(
      'https://starway-frontend.vercel.app/app/dashboard/zoom?dl=coach-zoom-token',
    )
    expect(mockDeepLinkCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'coach-user-id',
        action: 'open_web',
        path: COACH_ZOOM_RETURN_TARGET,
      }),
    }))
    expect(mockTrackEvent).toHaveBeenCalled()
  })
})
