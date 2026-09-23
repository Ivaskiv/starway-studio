import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { database, users } = vi.hoisted(() => ({
  database: {
    user: { update: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
  users: {
    findRawUserById: vi.fn(),
    resolveSafeUserById: vi.fn(),
    findRawUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    toSafeUser: vi.fn(),
  },
}))

vi.mock('../../../../../src/db/client.ts', () => ({ prisma: database, withRetry: (run: () => unknown) => run() }))
vi.mock('../../../../../src/modules/auth/service/users.ts', () => users)

vi.mock('../../../../../src/modules/auth/service/index.ts', async () => ({
  ...await import('../../../../../src/modules/auth/service/tokens.ts'),
  ...users,
}))

const storedTokens = new Map<string, { token: string; userId: string; expiresAt: Date }>()

beforeEach(() => {
  vi.clearAllMocks()
  process.env.JWT_ACCESS_SECRET = 'test-access-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  database.user.update.mockResolvedValue({ id: 'canonical-user-id' })
  database.$queryRaw.mockResolvedValue([{ ok: 1 }])
  storedTokens.clear()
  database.refreshToken.create.mockImplementation(async ({ data }) => {
    storedTokens.set(data.token, data)
    return data
  })
  database.refreshToken.findUnique.mockImplementation(async ({ where }) => storedTokens.get(where.token) ?? null)
  database.refreshToken.deleteMany.mockImplementation(async ({ where }) => ({ count: Number(storedTokens.delete(where.token)) }))
})

function persistedUser(role: 'USER' | 'MENTOR' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN', activeRole = role) {
  const base = Object.freeze({
    id: 'canonical-user-id', email: 'vira@example.com', firstName: 'Vira', role, activeRole,
  })
  const safe = Object.freeze({ ...base, access: { plan: 'free', isPaid: false, isTrial: false } })
  users.findRawUserById.mockResolvedValue(base)
  users.resolveSafeUserById.mockResolvedValue(safe)
  return { base, safe }
}

describe('createSessionForUserId bot context', () => {
  it('creates USER and EXPERT sessions for the same identity without changing persisted roles', async () => {
    const { base, safe } = persistedUser('EXPERT')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    const userSession = await createSessionForUserId(base.id, 'USER')
    const coachSession = await createSessionForUserId(base.id, 'COACH')

    for (const [session, role] of [[userSession, 'USER'], [coachSession, 'EXPERT']] as const) {
      expect(session.user).toMatchObject({ id: base.id, role, activeRole: role, access: safe.access })
      expect(jwt.verify(session.accessToken, process.env.JWT_ACCESS_SECRET!))
        .toMatchObject({ id: base.id, role, activeRole: role })
    }
    expect(base.activeRole).toBe('EXPERT')
    expect(safe.activeRole).toBe('EXPERT')
    expect(database.user.update).toHaveBeenCalledTimes(2)
    for (const [args] of database.user.update.mock.calls) {
      expect(args).toEqual({ where: { id: base.id }, data: { lastLoginAt: expect.any(Date) }, select: { id: true } })
    }
  })

  it.each(['USER', 'MENTOR'] as const)('rejects COACH for persisted %s even with stale expert activeRole', async (role) => {
    persistedUser(role, 'EXPERT')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    await expect(createSessionForUserId('canonical-user-id', 'COACH'))
      .rejects.toMatchObject({ code: 'forbidden_role', status: 403 })
    expect(database.refreshToken.create).not.toHaveBeenCalled()
  })

  it.each(['EXPERT', 'ADMIN', 'SUPERADMIN'] as const)('uses canonical role hierarchy to authorize persisted %s', async (role) => {
    persistedUser(role, 'USER')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    expect((await createSessionForUserId('canonical-user-id', 'COACH')).user)
      .toMatchObject({ role: 'EXPERT', activeRole: 'EXPERT' })
  })

  it('allows USER without paid access or expert permission', async () => {
    persistedUser('USER')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    expect((await createSessionForUserId('canonical-user-id', 'USER')).user)
      .toMatchObject({ role: 'USER', activeRole: 'USER', access: { isPaid: false } })
  })

  it.each([null, undefined])('preserves existing behavior for context %s', async (context) => {
    const { safe } = persistedUser('ADMIN', 'USER')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    const session = await createSessionForUserId('canonical-user-id', context)
    expect(session.user).toBe(safe)
    expect(jwt.verify(session.accessToken, process.env.JWT_ACCESS_SECRET!))
      .toMatchObject({ role: 'ADMIN', activeRole: 'USER' })
  })
})

async function renew(token: string) {
  const { refresh } = await import('../../../../../src/modules/auth/api/controller.ts')
  const response = { cookie: vi.fn(), json: vi.fn(), status: vi.fn() }
  response.status.mockReturnValue(response)
  await refresh({ cookies: { refreshToken: token }, headers: {} } as Request, response as unknown as Response)
  return response
}

describe('contextual session refresh', () => {
  it('keeps two contexts isolated across concurrent refresh and successive rotations', async () => {
    const { base } = persistedUser('EXPERT')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    const initial = await Promise.all(['USER', 'COACH'].map(context =>
      createSessionForUserId(base.id, context as 'USER' | 'COACH')))
    let refreshTokens = initial.map(session => session.refreshToken)
    database.user.update.mockClear()

    for (let rotation = 0; rotation < 2; rotation++) {
      const responses = await Promise.all(refreshTokens.map(renew))
      refreshTokens = responses.map((response, index) => {
        expect(response.status).not.toHaveBeenCalled()
        const session = response.json.mock.calls[0]![0]
        const role = index === 0 ? 'USER' : 'EXPERT'
        expect(session.user).toMatchObject({ id: base.id, role, activeRole: role })
        expect(jwt.verify(session.accessToken, process.env.JWT_ACCESS_SECRET!))
          .toMatchObject({ id: base.id, role, activeRole: role })
        expect(jwt.verify(session.refreshToken, process.env.JWT_REFRESH_SECRET!))
          .toMatchObject({ id: base.id, contextualRole: role })
        expect(storedTokens.has(session.refreshToken)).toBe(true)
        return session.refreshToken
      })
    }
    expect(database.user.update).not.toHaveBeenCalled()
    expect(base.activeRole).toBe('EXPERT')
  })

  it('rejects revoked EXPERT permission including grace reuse of an earlier token', async () => {
    persistedUser('EXPERT')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    const initial = await createSessionForUserId('canonical-user-id', 'COACH')
    const first = await renew(initial.refreshToken)
    const rotated = first.json.mock.calls[0]![0].refreshToken
    persistedUser('USER', 'EXPERT')
    database.refreshToken.create.mockClear()

    for (const token of [rotated, initial.refreshToken]) {
      const response = await renew(token)
      expect(response.status).toHaveBeenCalledWith(401)
      expect(response.json).toHaveBeenCalledWith({ success: false, error: 'forbidden_role' })
    }
    expect(database.refreshToken.create).not.toHaveBeenCalled()
  })

  it.each([null, undefined])('keeps legacy refresh semantics for context %s', async (context) => {
    const { safe } = persistedUser('ADMIN', 'USER')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    const initial = await createSessionForUserId('canonical-user-id', context)
    expect(jwt.decode(initial.refreshToken)).not.toHaveProperty('contextualRole')
    const response = await renew(initial.refreshToken)
    const result = response.json.mock.calls[0]![0]
    expect(result.user).toBe(safe)
    expect(jwt.decode(result.accessToken)).toMatchObject({ role: 'ADMIN' })
    expect(jwt.decode(result.refreshToken)).not.toHaveProperty('contextualRole')
  })

  it('rejects a tampered USER-to-EXPERT claim and unsupported signed role', async () => {
    persistedUser('EXPERT')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    const initial = await createSessionForUserId('canonical-user-id', 'USER')
    const parts = initial.refreshToken.split('.')
    parts[1] = Buffer.from(JSON.stringify({ ...jwt.decode(initial.refreshToken) as object, contextualRole: 'EXPERT' })).toString('base64url')
    const invalidRole = jwt.sign({ id: 'canonical-user-id', contextualRole: 'SUPERADMIN' }, process.env.JWT_REFRESH_SECRET!)
    database.refreshToken.create.mockClear()
    for (const token of [parts.join('.'), invalidRole]) {
      expect((await renew(token)).status).toHaveBeenCalledWith(401)
    }
    expect(database.refreshToken.create).not.toHaveBeenCalled()
  })

  it('retains contextual claims and returns the stored token after a token collision', async () => {
    persistedUser('EXPERT')
    const { createSessionForUserId } = await import('../../../../../src/modules/auth/service/credentials.ts')
    database.refreshToken.create.mockRejectedValueOnce(Object.assign(new Error('collision'), { code: 'P2002' }))
    const initial = await createSessionForUserId('canonical-user-id', 'COACH')
    expect(storedTokens.has(initial.refreshToken)).toBe(true)
    expect(jwt.decode(initial.refreshToken)).toMatchObject({ contextualRole: 'EXPERT' })
    database.refreshToken.create.mockRejectedValueOnce(Object.assign(new Error('collision'), { code: 'P2002' }))
    const response = await renew(initial.refreshToken)
    const result = response.json.mock.calls[0]![0]
    expect(storedTokens.has(result.refreshToken)).toBe(true)
    expect(jwt.decode(result.refreshToken)).toMatchObject({ contextualRole: 'EXPERT' })
  })
})
