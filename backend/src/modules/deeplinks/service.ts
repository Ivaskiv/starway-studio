import crypto from 'crypto'
import type { DeepLinkToken, Prisma } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { trackEvent } from '../events/service.js'
import type {
  DeepLinkAction,
  DeepLinkSource,
  DeepLinkTarget,
  GenerateDeepLinkInput,
  ResolveDeepLinkInput,
  ResolvedDeepLink,
} from './types.js'

const DEFAULT_TTL_SECONDS = 15 * 60
const TELEGRAM_START_PREFIX = 'dl_'
let hasWarnedAboutMissingDeepLinkTable = false

interface DeepLinkTokenDelegateLike {
  create(args: Prisma.DeepLinkTokenCreateArgs): Promise<DeepLinkToken>
  findUnique(args: Prisma.DeepLinkTokenFindUniqueArgs): Promise<DeepLinkToken | null>
  update(args: Prisma.DeepLinkTokenUpdateArgs): Promise<DeepLinkToken>
}

const deepLinkTokenDelegate = (
  prisma as unknown as { deepLinkToken: DeepLinkTokenDelegateLike }
).deepLinkToken

function getFrontendBaseUrl(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:5173'
}

function getBotUsername(): string {
  return process.env.TELEGRAM_BOT_USERNAME ?? 'StarwayMentorBot'
}

function isPrismaKnownError(error: unknown): error is { code?: string; meta?: unknown } {
  return typeof error === 'object' && error !== null
}

function isMissingDeepLinkTableError(error: unknown): boolean {
  if (!isPrismaKnownError(error) || error.code !== 'P2021') {
    return false
  }

  const table = typeof error.meta === 'object' && error.meta !== null && 'table' in error.meta
    ? String(error.meta.table)
    : ''

  return table.includes('DeepLinkToken')
}

function normalizePath(path?: string | null): string | null {
  if (!path) {
    return null
  }

  if (path.startsWith('/')) {
    return path
  }

  return `/${path}`
}

function normalizeToken(rawToken: string): string {
  return rawToken.replace(new RegExp(`^${TELEGRAM_START_PREFIX}`), '').trim()
}

function serializeResolvedLink(link: {
  id: string
  userId: string
  token: string
  action: string
  source: string
  target: string
  path: string | null
  payload: Prisma.JsonValue | null
  createdAt: Date
  expiresAt: Date
  consumedAt: Date | null
}): ResolvedDeepLink {
  return {
    id: link.id,
    userId: link.userId,
    token: link.token,
    action: link.action as DeepLinkAction,
    source: link.source as DeepLinkSource,
    target: link.target as DeepLinkTarget,
    path: link.path,
    payload: link.payload,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt.toISOString(),
    consumedAt: link.consumedAt ? link.consumedAt.toISOString() : null,
  }
}

export function buildTelegramStartParam(token: string): string {
  return `${TELEGRAM_START_PREFIX}${token}`
}

export function buildTelegramDeepLink(token: string): string {
  return `https://t.me/${getBotUsername()}?start=${buildTelegramStartParam(token)}`
}

export function buildWebDeepLink(token: string, path?: string | null): string {
  const url = new URL(normalizePath(path) ?? '/onboarding/continue', getFrontendBaseUrl())
  url.searchParams.set('dl', token)
  return url.toString()
}

export async function generateDeepLink(input: GenerateDeepLinkInput): Promise<ResolvedDeepLink> {
  const token = crypto.randomBytes(18).toString('base64url')
  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? DEFAULT_TTL_SECONDS) * 1000)
  let link: DeepLinkToken

  try {
    link = await deepLinkTokenDelegate.create({
      data: {
        userId: input.userId,
        token,
        action: input.action,
        source: input.source,
        target: input.target,
        ...(normalizePath(input.path) ? { path: normalizePath(input.path) } : {}),
        ...(input.payload !== undefined ? { payload: input.payload } : {}),
        expiresAt,
      },
    })
  } catch (error) {
    if (isMissingDeepLinkTableError(error)) {
      if (!hasWarnedAboutMissingDeepLinkTable) {
        hasWarnedAboutMissingDeepLinkTable = true
        console.warn('[deeplinks] DeepLinkToken table is missing; generic deeplinks are disabled until migration is applied')
      }
      throw new Error('DEEPLINK_TABLE_MISSING')
    }

    throw error
  }

  await trackEvent({
    userId: input.userId,
    type: 'deeplink_generated',
    source: input.source,
    state: null,
    payload: {
      action: input.action,
      target: input.target,
      path: normalizePath(input.path),
      token,
      expiresAt: expiresAt.toISOString(),
    } satisfies Prisma.JsonObject,
  })

  return serializeResolvedLink(link)
}

export async function resolveDeepLinkToken(input: ResolveDeepLinkInput): Promise<ResolvedDeepLink | null> {
  const token = normalizeToken(input.token)
  if (!token) {
    return null
  }

  let link: DeepLinkToken | null

  try {
    link = await deepLinkTokenDelegate.findUnique({
      where: { token },
    })
  } catch (error) {
    if (isMissingDeepLinkTableError(error)) {
      return null
    }

    throw error
  }

  if (!link) {
    return null
  }

  if (link.expiresAt.getTime() <= Date.now()) {
    return null
  }

  const shouldConsume = input.consume !== false
  let resolved: DeepLinkToken

  if (shouldConsume) {
    try {
      resolved = await deepLinkTokenDelegate.update({
        where: { id: link.id },
        data: {
          consumedAt: link.consumedAt ?? new Date(),
        },
      })
    } catch (error) {
      if (isMissingDeepLinkTableError(error)) {
        return null
      }

      throw error
    }
  } else {
    resolved = link
  }

  await trackEvent({
    userId: resolved.userId,
    type: 'deeplink_resolved',
    source: resolved.source as DeepLinkSource,
    state: null,
    payload: {
      action: resolved.action,
      target: resolved.target,
      path: resolved.path,
      consumed: shouldConsume,
      resolvedBy: 'backend',
    } satisfies Prisma.JsonObject,
  })

  return serializeResolvedLink(resolved)
}

export async function createTelegramBindingDeepLink(userId: string): Promise<{ link: string; expiresIn: number; token: string }> {
  const generated = await generateDeepLink({
    userId,
    action: 'bind_telegram',
    source: 'web',
    target: 'telegram',
    path: '/auth/telegram/success',
    expiresInSeconds: DEFAULT_TTL_SECONDS,
  })

  return {
    link: buildTelegramDeepLink(generated.token),
    token: generated.token,
    expiresIn: DEFAULT_TTL_SECONDS,
  }
}
