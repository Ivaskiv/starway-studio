import type { Request, Response } from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { prisma } from '../../../db/client.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import { resolveTelegramProductSummary } from '../services/product/summary.js'
import {
  readExpectedTelegramBotUsername,
  resolveTelegramDeliveryMode,
} from './botConfig.js'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = dirname(currentFilePath)
const repoRootPath = resolve(currentDirPath, '../../../../../')

function readGitHeadCommitSha(): string {
  try {
    const gitDir = resolve(repoRootPath, '.git')
    const headPath = resolve(gitDir, 'HEAD')
    if (!existsSync(headPath)) return 'unknown'

    const head = readFileSync(headPath, 'utf8').trim()
    if (/^[0-9a-f]{40}$/i.test(head)) {
      return head
    }

    const refPrefix = 'ref: '
    if (!head.startsWith(refPrefix)) return 'unknown'

    const refPath = resolve(gitDir, head.slice(refPrefix.length).trim())
    if (!existsSync(refPath)) return 'unknown'

    const commit = readFileSync(refPath, 'utf8').trim()
    return /^[0-9a-f]{40}$/i.test(commit) ? commit : 'unknown'
  } catch {
    return 'unknown'
  }
}

type TelegramRuntimeParityCta =
  | {
      text: string
      type: 'url'
      url: string
    }
  | {
      text: string
      type: 'web_app'
      url: string
    }
  | {
      text: string
      type: 'callback'
      callbackData: string
    }
  | null

function readBuildSha(): string {
  const runtimeSha = String(
    process.env.RENDER_GIT_COMMIT
      || process.env.COMMIT_SHA
      || process.env.VERCEL_GIT_COMMIT_SHA
      || '',
  ).trim()

  return runtimeSha || readGitHeadCommitSha()
}

function describeDatabaseTarget(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return {
      configured: false,
      host: 'missing',
      name: 'missing',
    }
  }

  try {
    const parsed = new URL(databaseUrl)
    return {
      configured: true,
      host: parsed.hostname || 'unknown',
      name: parsed.pathname.replace(/^\/+/, '') || 'unknown',
    }
  } catch {
    return {
      configured: true,
      host: 'invalid-url',
      name: 'invalid-url',
    }
  }
}

function resolvePrimaryCta(
  summary: Awaited<ReturnType<typeof resolveTelegramProductSummary>>,
): TelegramRuntimeParityCta {
  const button = summary.primary?.buttons.flat()[0] ?? null
  if (!button) return null

  if ('web_app' in button) {
    return {
      text: button.text,
      type: 'web_app',
      url: button.web_app.url,
    }
  }

  if ('url' in button) {
    return {
      text: button.text,
      type: 'url',
      url: button.url,
    }
  }

  return {
    text: button.text,
    type: 'callback',
    callbackData: button.callback_data,
  }
}

export async function buildTelegramRuntimeParitySnapshot(userId: string) {
  const [accessState, summary, productSubscriptions] = await Promise.all([
    getUserAccessState(userId),
    resolveTelegramProductSummary(userId),
    prisma.productSubscription.findMany({
      where: {
        userId,
        product: {
          code: {
            in: ['focus', 'trial_zoom'],
            mode: 'insensitive',
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        product: {
          select: {
            code: true,
          },
        },
        status: true,
        paidAt: true,
        expiresAt: true,
        trialEndsAt: true,
        createdAt: true,
      },
    }),
  ])

  return {
    bot: {
      username: readExpectedTelegramBotUsername(),
      deliveryMode: resolveTelegramDeliveryMode(),
    },
    runtime: {
      nodeEnv: process.env.NODE_ENV || 'development',
      commitSha: readBuildSha(),
      db: describeDatabaseTarget(process.env.DATABASE_URL?.trim()),
    },
    user: {
      userId,
      productSubscriptions: productSubscriptions.map((row) => ({
        productCode: row.product.code,
        status: row.status,
        paidAt: row.paidAt?.toISOString() ?? null,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      canonicalAccess: {
        state: accessState.state,
        isActive: accessState.isActive,
        hasFocus: accessState.hasFocus,
        expiresAt: accessState.expiresAt?.toISOString() ?? null,
      },
      finalTelegram: {
        primaryProduct: summary.primary?.key ?? null,
        primaryState: summary.primary?.state ?? null,
        cta: resolvePrimaryCta(summary),
      },
    },
  }
}

export async function getTelegramRuntimeParityHandler(
  req: Request & { user?: { id?: string | null } },
  res: Response,
) {
  const userId = typeof req.user?.id === 'string' ? req.user.id.trim() : ''
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const snapshot = await buildTelegramRuntimeParitySnapshot(userId)
  return res.json(snapshot)
}
