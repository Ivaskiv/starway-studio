import { Role } from '@starway/db/prisma-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findUnique,
  activatePromptVersion,
  trackEvent,
  resolveUserState,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  activatePromptVersion: vi.fn(),
  trackEvent: vi.fn(),
  resolveUserState: vi.fn(),
}))

vi.mock('../../../../../src/db/client.js', () => ({
  prisma: {
    promptVersion: {
      findUnique,
    },
  },
}))

vi.mock('../../../../../src/modules/auth/middleware/auth.js', () => ({
  authRequired: (_req: unknown, _res: unknown, next: () => void) => next(),
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  telegramWebAppAuth:
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  userTelegramWebAppAuth:
    (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('../../../../../src/modules/ai/agentRegistry.js', () => ({
  CanonicalGatewayAgentRegistry: class {
    listRegistrations() {
      return []
    }
  },
}))

vi.mock('../../../../../src/modules/admin/prompts/version.service.js', () => ({
  createPromptVersion: vi.fn(),
  activatePromptVersion,
}))

vi.mock('../../../../../src/modules/events/service.js', () => ({
  trackEvent,
}))

vi.mock('../../../../../src/modules/telegram-mentor/handlers/start.js', () => ({
  resolveUserState,
}))

import router from '../../../../../src/modules/admin/routes.js'

type TestRequest = {
  params: Record<string, string>
  user?: {
    id: string
    role: Role
  }
}

type TestResponse = {
  statusCode: number
  body: unknown
  status: (code: number) => TestResponse
  json: (payload: unknown) => TestResponse
}

function createTestResponse(): TestResponse {
  return {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
}

function loadActivatePromptHandler() {
  const routeLayer = router.stack.find(
    (layer) =>
      layer.route?.path === '/prompts/:id/activate' &&
      layer.route.methods?.put,
  )

  const routeHandler = routeLayer?.route?.stack?.[1]?.handle
  if (!routeHandler) {
    throw new Error('Route handler not found for PUT /prompts/:id/activate')
  }

  return routeHandler as (req: TestRequest, res: TestResponse) => Promise<unknown>
}

describe('PUT /api/admin/prompts/:id/activate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findUnique.mockResolvedValue({
      id: 'prompt-v2',
      name: 'strategist-agent-prompt',
    })
    activatePromptVersion.mockResolvedValue({
      id: 'prompt-v2',
      name: 'strategist-agent-prompt',
      version: 2,
    })
    resolveUserState.mockResolvedValue(null)
    trackEvent.mockResolvedValue(undefined)
  })

  it('allows ADMIN to activate an already validated prompt version through the existing staff lifecycle route', async () => {
    const handler = loadActivatePromptHandler()
    const response = createTestResponse()

    await handler(
      {
        params: { id: 'prompt-v2' },
        user: {
          id: 'staff-admin-1',
          role: Role.ADMIN,
        },
      },
      response,
    )

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ ok: true, id: 'prompt-v2' })
    expect(activatePromptVersion).toHaveBeenCalledWith('prompt-v2')
    expect(trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'staff-admin-1',
        type: 'admin_prompt_version_activated',
      }),
    )
  })
})
