import type { Request, Response } from 'express'
import type { Prisma } from '@starway/db/prisma-client'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { createSessionForUserId } from '../auth/service/index.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import {
  buildTelegramDeepLink,
  buildWebDeepLink,
  createTelegramBindingDeepLink,
  generateDeepLink,
  resolveDeepLinkToken,
} from './service.js'
import type { DeepLinkAction, DeepLinkSource, DeepLinkTarget } from './types.js'

const ALLOWED_ACTIONS: ReadonlySet<DeepLinkAction> = new Set([
  'bind_telegram',
  'continue_flow',
  'open_web',
  'open_miniapp',
  'resume_task',
  'open_mentor',
  'magic_login',
])

const ALLOWED_SOURCES: ReadonlySet<DeepLinkSource> = new Set(['telegram', 'web', 'miniapp'])
const ALLOWED_TARGETS: ReadonlySet<DeepLinkTarget> = new Set(['telegram', 'web', 'miniapp'])
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
} as const

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function generateDeepLinkHandler(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const body = req.body
  const action = typeof body?.action === 'string' ? body.action : 'continue_flow'
  const source = typeof body?.source === 'string' ? body.source : 'web'
  const target = typeof body?.target === 'string' ? body.target : 'web'
  const path = typeof body?.path === 'string' ? body.path : null
  const payload = isJsonObject(body?.payload) ? body.payload : undefined

  if (!ALLOWED_ACTIONS.has(action as DeepLinkAction)) {
    return res.status(400).json({ error: 'invalid_action' })
  }

  if (!ALLOWED_SOURCES.has(source as DeepLinkSource)) {
    return res.status(400).json({ error: 'invalid_source' })
  }

  if (!ALLOWED_TARGETS.has(target as DeepLinkTarget)) {
    return res.status(400).json({ error: 'invalid_target' })
  }

  const generated = await generateDeepLink({
    userId,
    action: action as DeepLinkAction,
    source: source as DeepLinkSource,
    target: target as DeepLinkTarget,
    path,
    payload,
  })

  return res.json({
    ok: true,
    deepLink: generated,
    telegramUrl: buildTelegramDeepLink(generated.token),
    webUrl: buildWebDeepLink(generated.token, generated.path),
  })
}

export async function resolveDeepLinkHandler(req: Request, res: Response) {
  const body = req.body
  const token = typeof body?.token === 'string' ? body.token : ''
  const consume = typeof body?.consume === 'boolean' ? body.consume : true

  if (!token) {
    return res.status(400).json({ error: 'token_required' })
  }

  const resolved = await resolveDeepLinkToken({ token, consume })
  if (!resolved) {
    return res.status(404).json({ error: 'invalid_or_expired_token' })
  }

  const state = await resolveUserState(resolved.userId).catch(() => null)

  return res.json({
    ok: true,
    link: resolved,
    state,
    telegramUrl: buildTelegramDeepLink(resolved.token),
    webUrl: buildWebDeepLink(resolved.token, resolved.path),
  })
}

export async function resolveDeepLinkSessionHandler(req: Request, res: Response) {
  const body = req.body
  const token = typeof body?.token === 'string' ? body.token : ''
  const consume = typeof body?.consume === 'boolean' ? body.consume : true

  if (process.env.NODE_ENV !== 'production') {
    console.info('[DEEPLINK_LIVE]', {
      event: 'REQUEST_RECEIVED',
      consume,
      hasToken: Boolean(token),
    })
  }

  if (!token) {
    return res.status(400).json({ error: 'token_required' })
  }

  const resolved = await resolveDeepLinkToken({ token, consume })
  if (!resolved) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[DEEPLINK_LIVE]', {
        event: 'RESPONSE_STATUS',
        status: 404,
        resolved: false,
      })
    }
    return res.status(404).json({ error: 'invalid_or_expired_token' })
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[DEEPLINK_LIVE]', {
      event: 'TOKEN_VALID',
      action: resolved.action,
      hasPath: Boolean(resolved.path),
      target: resolved.target,
      userIdPresent: Boolean(resolved.userId),
    })
  }

  const session = await createSessionForUserId(resolved.userId)
  const state = await resolveUserState(resolved.userId).catch(() => null)

  if (process.env.NODE_ENV !== 'production') {
    console.info('[DEEPLINK_LIVE]', {
      event: 'SESSION_CREATED',
      role: session.user.role ?? null,
      userIdPresent: Boolean(session.user.id),
    })
    console.info('[DEEPLINK_LIVE]', {
      event: 'RESPONSE_STATUS',
      status: 200,
      stateResolved: Boolean(state),
    })
  }

  res.cookie('refreshToken', session.refreshToken, COOKIE_OPTIONS)

  return res.json({
    ok: true,
    link: resolved,
    state,
    user: session.user,
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
    telegramUrl: buildTelegramDeepLink(resolved.token),
    webUrl: buildWebDeepLink(resolved.token, resolved.path),
  })
}

export async function generateTelegramBindingHandler(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const generated = await createTelegramBindingDeepLink(userId)

  return res.json({
    ok: true,
    link: generated.link,
    expiresIn: generated.expiresIn,
    token: generated.token,
  })
}
