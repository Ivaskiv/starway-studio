import type { Request, Response } from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { prisma } from '../../../db/client.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import {
  buildPlainStartPreview,
  type PlainStartPreviewPayload,
  resolveEffectiveStartLifecycleState,
} from '../handlers/start.js'
import { loadAbTestProgress } from '../../../products/ab-system/telegram/progress.js'
import { resolveTelegramProductSummary } from '../services/product/summary.js'
import {
  syncUserTestState,
  type UserTestStateSnapshot,
} from '../../../scripts/user-sync-test-state.js'
import { getUpcomingZoomBookingView } from '../../zoom/service.js'
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
  summary: Awaited<ReturnType<typeof resolveTelegramProductSummary>> | null,
): TelegramRuntimeParityCta {
  if (!summary) return null
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

function normalizeStartPreviewButtons(buttons: PlainStartPreviewPayload['buttons']) {
  return buttons.map((row: PlainStartPreviewPayload['buttons'][number]) =>
    row.map((button) => ({
      text: button.text,
      type: 'callback_data' in button
        ? 'callback'
        : 'web_app' in button
          ? 'web_app'
          : 'url',
      value: 'callback_data' in button
        ? button.callback_data
        : 'web_app' in button
          ? button.web_app.url
          : button.url,
    })),
  )
}

const DEBUG_TELEGRAM_MAX_CHARS = 3500
const JOIN_WINDOW_BEFORE_START_MS = 5 * 60 * 1000
const JOIN_WINDOW_AFTER_START_MS = 2 * 60 * 60 * 1000

function stripHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .trim()
}

function formatIsoDate(value: Date | null | undefined): string {
  return value ? value.toISOString() : '—'
}

function resolveSubscriptionUntil(input: {
  trialEndsAt: Date | null
  expiresAt: Date | null
}): string {
  return formatIsoDate(input.trialEndsAt ?? input.expiresAt)
}

function isJoinWindow(scheduledAt: Date, now = new Date()): boolean {
  const diffMs = scheduledAt.getTime() - now.getTime()
  return diffMs <= JOIN_WINDOW_BEFORE_START_MS && diffMs >= -JOIN_WINDOW_AFTER_START_MS
}

function resolveAccessSource(input: {
  state: Awaited<ReturnType<typeof getUserAccessState>>['state']
  productSubscriptions: Array<{
    product: { code: string }
    status: string
    paidAt: Date | null
    expiresAt: Date | null
    trialEndsAt: Date | null
    createdAt: Date
  }>
  testCompletedAt: Date | null
}): string {
  if (input.state === 'FREE_WEEK1') {
    return input.testCompletedAt
      ? `free_week1:test_completed_until_${new Date(input.testCompletedAt.getTime() + 7 * 86400000).toISOString()}`
      : 'free_week1'
  }

  const latest = input.productSubscriptions[0]
  if (!latest) {
    return input.state === 'NO_ACCESS' ? 'none' : 'unresolved'
  }

  return `${String(latest.product.code).toLowerCase()}:${String(latest.status).toLowerCase()}`
}

function resolvePaymentProductCode(input: {
  checkoutProductCode: string | null
  orderReference: string | null
}): string {
  if (input.checkoutProductCode) return input.checkoutProductCode
  const orderReference = String(input.orderReference ?? '').trim().toLowerCase()
  if (orderReference.startsWith('trial_zoom_')) return 'trial_zoom'
  if (orderReference.startsWith('focus_')) return 'focus'
  if (orderReference.startsWith('stankey_')) return 'stankey'
  return '—'
}

function resolveNextStepLine(startPreviewText: string): string {
  const normalized = stripHtml(startPreviewText)
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const nextStep = lines.find((line) => line.toLowerCase().startsWith('наступний крок:'))
  return nextStep ?? '—'
}

function assertSafeDebugChunk(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[hidden-connection-string]')
    .replace(/(?:AAG|AAE|AAF)[A-Za-z0-9:_-]{20,}/g, '[hidden-token]')
    .replace(/(?:token|secret|signature)\s*:\s*[^\n]+/gi, (match) => {
      const label = match.split(':', 1)[0] ?? 'hidden'
      return `${label}: [hidden]`
    })
}

function buildDebugMessageChunks(sections: string[]): string[] {
  const chunks: string[] = []
  let current = ''

  for (const section of sections) {
    const normalizedSection = section.trim()
    if (!normalizedSection) continue

    const candidate = current ? `${current}\n\n${normalizedSection}` : normalizedSection
    if (current && candidate.length > DEBUG_TELEGRAM_MAX_CHARS) {
      chunks.push(assertSafeDebugChunk(current))
      current = normalizedSection
      continue
    }
    current = candidate
  }

  if (current) {
    chunks.push(assertSafeDebugChunk(current))
  }

  return chunks.slice(0, 3)
}

export async function buildTelegramRuntimeParitySnapshot(userId: string) {
  const [accessState, summary, productSubscriptions, startPreview] = await Promise.all([
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
    buildPlainStartPreview(userId),
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
        startPreview: {
          branch: startPreview.branch,
          text: startPreview.text,
          buttons: normalizeStartPreviewButtons(startPreview.buttons),
        },
      },
    },
  }
}

export async function buildTelegramDebugStateMessages(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      telegramChatId: true,
      telegramUserId: true,
      lifecycleState: true,
      testResultType: true,
      testCompletedAt: true,
    },
  })

  if (!user) {
    return ['<b>DEBUG STATE</b>\n\nКористувача не знайдено.']
  }

  const [
    accessState,
    startPreview,
    abTestProgress,
    summary,
    upcomingZoom,
    productSubscriptions,
    totalBookedCount,
    attendedCount,
    latestCheckout,
    latestPaymentLog,
  ] = await Promise.all([
    getUserAccessState(userId),
    buildPlainStartPreview(userId),
    loadAbTestProgress(userId).catch(() => null),
    resolveTelegramProductSummary(userId).catch(() => null),
    getUpcomingZoomBookingView(userId).catch(() => null),
    prisma.productSubscription.findMany({
      where: {
        userId,
        product: {
          code: {
            in: ['focus', 'trial_zoom', 'absystem', 'absystem_ai'],
            mode: 'insensitive',
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        product: { select: { code: true } },
        status: true,
        paidAt: true,
        expiresAt: true,
        trialEndsAt: true,
        createdAt: true,
      },
    }),
    prisma.zoomSessionAttendee.count({
      where: { userId },
    }),
    prisma.zoomSessionAttendee.count({
      where: { userId, attended: true },
    }),
    prisma.checkoutSession.findFirst({
      where: { userId },
      orderBy: [
        { lastOpenedAt: 'desc' },
        { openedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        status: true,
        amount: true,
        currency: true,
        productCode: true,
        orderReference: true,
        createdAt: true,
        completedAt: true,
      },
    }).catch(() => null),
    prisma.paymentLog.findFirst({
      where: { userId },
      orderBy: [{ processedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        status: true,
        orderReference: true,
        amountCents: true,
        processedAt: true,
        createdAt: true,
      },
    }).catch(() => null),
  ])

  const effectiveLifecycleState = resolveEffectiveStartLifecycleState({
    lifecycleState: user.lifecycleState,
    accessState,
    testResultType: user.testResultType,
    progress: abTestProgress
      ? {
          status: abTestProgress.status,
          result_key: abTestProgress.result_key ?? null,
        }
      : null,
  })

  const primaryButton = startPreview.buttons[0]?.[0] ?? null
  const primaryCtaText = primaryButton?.text ?? resolvePrimaryCta(summary)?.text ?? '—'
  const joinAvailable =
    upcomingZoom?.isMyBooking === true &&
    upcomingZoom.scheduledAt instanceof Date &&
    isJoinWindow(upcomingZoom.scheduledAt)
  const accessSource = resolveAccessSource({
    state: accessState.state,
    productSubscriptions,
    testCompletedAt: user.testCompletedAt,
  })
  const paymentStatus = String(latestCheckout?.status ?? latestPaymentLog?.status ?? '—')
  const paymentProductCode = resolvePaymentProductCode({
    checkoutProductCode: latestCheckout?.productCode ?? null,
    orderReference: latestCheckout?.orderReference ?? latestPaymentLog?.orderReference ?? null,
  })
  const paymentAmount = latestCheckout
    ? `${latestCheckout.amount} ${latestCheckout.currency}`
    : latestPaymentLog
      ? `${(latestPaymentLog.amountCents / 100).toFixed(2)} UAH`
      : '—'
  const nextStepLine = stripHtml(resolveNextStepLine(startPreview.text)) || '—'
  const subscriptionLines =
    productSubscriptions.length > 0
      ? productSubscriptions.map((row) =>
          `• <code>${stripHtml(row.product.code)}</code> | <code>${stripHtml(String(row.status))}</code> | until <code>${resolveSubscriptionUntil({
            trialEndsAt: row.trialEndsAt,
            expiresAt: row.expiresAt,
          })}</code>`
        )
      : ['• none']

  const sections = [
    [
      '<b>DEBUG STATE</b>',
      '',
      '<b>IDENTITY</b>',
      `userId: <code>${user.id}</code>`,
      `email: <code>${stripHtml(user.email ?? '—') || '—'}</code>`,
      `telegramChatId: <code>${stripHtml(user.telegramChatId ?? '—') || '—'}</code>`,
      `telegramUserId: <code>${stripHtml(user.telegramUserId ?? '—') || '—'}</code>`,
      '',
      '<b>LIFECYCLE</b>',
      `persisted: <code>${stripHtml(user.lifecycleState)}</code>`,
      `effective: <code>${stripHtml(effectiveLifecycleState)}</code>`,
      `result: <code>${stripHtml(user.testResultType ?? abTestProgress?.result_key ?? '—') || '—'}</code>`,
      `testCompletedAt: <code>${formatIsoDate(user.testCompletedAt)}</code>`,
      '',
      '<b>AB TEST</b>',
      `status: <code>${stripHtml(abTestProgress?.status ?? '—') || '—'}</code>`,
      `stage: <code>${stripHtml(abTestProgress?.stage ?? '—') || '—'}</code>`,
      `resultKey: <code>${stripHtml(abTestProgress?.result_key ?? '—') || '—'}</code>`,
      `currentQuestion: <code>${stripHtml(abTestProgress?.current_question_id ?? '—') || '—'}</code>`,
      '',
      '<b>ACCESS</b>',
      `state: <code>${stripHtml(accessState.state)}</code>`,
      `active: <code>${accessState.isActive ? 'YES' : 'NO'}</code>`,
      `source: <code>${stripHtml(accessSource)}</code>`,
    ].join('\n'),
    [
      '<b>SUBSCRIPTIONS</b>',
      ...subscriptionLines,
      '',
      '<b>ZOOM</b>',
      `session: <code>${stripHtml(upcomingZoom?.id ?? '—') || '—'}</code>`,
      `scheduledAt: <code>${formatIsoDate(upcomingZoom?.scheduledAt ?? null)}</code>`,
      `status: <code>${stripHtml(String(upcomingZoom?.status ?? '—')) || '—'}</code>`,
      `booked: <code>${upcomingZoom?.isMyBooking === true ? 'YES' : 'NO'}</code>`,
      `attendance: <code>${attendedCount}/${totalBookedCount}</code>`,
      `joinAvailable: <code>${joinAvailable ? 'YES' : 'NO'}</code>`,
      '',
      '<b>PAYMENT</b>',
      `status: <code>${stripHtml(paymentStatus) || '—'}</code>`,
      `product: <code>${stripHtml(paymentProductCode)}</code>`,
      `amount: <code>${paymentAmount}</code>`,
      '',
      '<b>START ROUTING</b>',
      `branch: <code>${stripHtml(startPreview.branch)}</code>`,
      `primaryCTA: <code>${stripHtml(primaryCtaText)}</code>`,
      '',
      '<b>NEXT STEP</b>',
      nextStepLine,
    ].join('\n'),
  ]

  return buildDebugMessageChunks(sections)
}

function parseSyncSnapshot(req: Request): UserTestStateSnapshot {
  const raw = req.body?.snapshot
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('snapshot is required')
  }

  const serialized = JSON.stringify(raw)
  return loadSnapshotFromString(serialized)
}

function loadSnapshotFromString(raw: string): UserTestStateSnapshot {
  const parsed = JSON.parse(raw) as UserTestStateSnapshot
  return loadSnapshotObject(parsed)
}

function loadSnapshotObject(parsed: UserTestStateSnapshot): UserTestStateSnapshot {
  if (String(parsed?.telegramFromId ?? '').trim() === '') {
    throw new Error('Snapshot must contain telegramFromId')
  }
  return parsed
}

export async function postTelegramRuntimeStateSyncHandler(req: Request, res: Response) {
  try {
    const snapshot = parseSyncSnapshot(req)
    const telegramId = String(req.body?.telegramId ?? snapshot.telegramFromId ?? '').trim()
    const mode = req.body?.apply === true ? 'apply' : 'dry-run'
    const confirmReason = String(req.body?.confirmReason ?? '').trim()
    const confirmTelegramId = String(req.body?.confirmTelegramId ?? '').trim()

    if (!telegramId || telegramId !== snapshot.telegramFromId) {
      return res.status(400).json({ error: 'telegramId mismatch' })
    }

    if (process.env.NODE_ENV === 'production') {
      if (telegramId !== '630111093') {
        return res.status(403).json({ error: 'production review sync is limited to chat 630111093' })
      }
      if (
        mode === 'apply' &&
        (
          confirmReason !== 'controlled_review_parity' ||
          confirmTelegramId !== telegramId
        )
      ) {
        return res.status(400).json({ error: 'production confirmation mismatch' })
      }
    }

    const report = await syncUserTestState({
      telegramId,
      snapshot,
      options: {
        mode,
        allowProduction: process.env.NODE_ENV === 'production',
      },
    })
    const after = await buildTelegramRuntimeParitySnapshot(report.userId)

    return res.json({
      mode,
      report,
      parity: after,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    return res.status(400).json({ error: message })
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
