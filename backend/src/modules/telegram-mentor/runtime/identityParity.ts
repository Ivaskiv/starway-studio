import type { Request, Response } from 'express'

import { prisma } from '../../../db/client.js'
import { reconcileTelegramIdentityUsers } from '../../user/identity/service.js'
import { findLinkedUserId } from '../services/identity/linking.js'

type IdentityCandidateRow = {
  id: string
  email: string
  telegramUserId: string | null
  telegramChatId: string | null
  telegramUserName: string | null
  telegramLinkedAt: Date | null
  createdAt: Date
  deletedAt: Date | null
  productSubscriptions: Array<{
    product: { code: string }
    status: string
    expiresAt: Date | null
    trialEndsAt: Date | null
    paidAt: Date | null
  }>
  telegramLinks: Array<{
    id: string
    chatId: string | null
    userId: string
    isActive: boolean
    createdAt: Date
  }>
}

type IdentityParityType =
  | 'aligned_single_user'
  | 'duplicate_users'
  | 'missing_link'
  | 'stale_link_without_identity'
  | 'missing_identity'
  | 'link_identity_mismatch'

type IdentityParitySnapshot = {
  chatId: string
  telegramUserId: string
  telegramUserName: string | null
  existingLink: {
    id: string
    userId: string
    isActive: boolean
    createdAt: string
  } | null
  identityCandidates: Array<{
    id: string
    email: string
    telegramUserId: string | null
    telegramChatId: string | null
    telegramUserName: string | null
    telegramLinkedAt: string | null
    createdAt: string
    deletedAt: string | null
    productSubscriptions: Array<{
      productCode: string
      status: string
      expiresAt: string | null
      trialEndsAt: string | null
      paidAt: string | null
    }>
    telegramLinks: Array<{
      id: string
      chatId: string | null
      userId: string
      isActive: boolean
      createdAt: string
    }>
  }>
  resolvedUserId: string | null
  type: IdentityParityType
  linkedUserId: string | null
  identityUserId: string | null
  repair: {
    supported: boolean
    dryRun: boolean
    action: 'none' | 'reconcileTelegramIdentityUsers'
    linkedUserId: string | null
    identityUserId: string | null
  }
}

function normalizeString(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

async function loadIdentityParitySnapshot(input: {
  chatId: string
  telegramUserId: string
  telegramUserName: string | null
}): Promise<IdentityParitySnapshot> {
  const [existingLink, candidates, resolvedUserId] = await Promise.all([
    prisma.telegramLink.findFirst({
      where: { chatId: input.chatId, isActive: true },
      select: {
        id: true,
        userId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { telegramUserId: input.telegramUserId },
          { telegramChatId: input.chatId },
          ...(input.telegramUserName ? [{ telegramUserName: input.telegramUserName }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        telegramUserId: true,
        telegramChatId: true,
        telegramUserName: true,
        telegramLinkedAt: true,
        createdAt: true,
        deletedAt: true,
        productSubscriptions: {
          where: {
            product: {
              code: {
                in: ['focus', 'trial_zoom'],
                mode: 'insensitive',
              },
            },
          },
          select: {
            product: {
              select: {
                code: true,
              },
            },
            status: true,
            expiresAt: true,
            trialEndsAt: true,
            paidAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        telegramLinks: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            chatId: true,
            userId: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    findLinkedUserId({
      chatId: input.chatId,
      telegramUserId: input.telegramUserId,
      telegramUserName: input.telegramUserName,
    }),
  ])

  const linkedUserId = existingLink?.userId ?? null
  const identityUserId = candidates[0]?.id ?? null

  let type: IdentityParityType
  if (!existingLink && candidates.length === 0) {
    type = 'missing_identity'
  } else if (existingLink && candidates.length === 0) {
    type = 'stale_link_without_identity'
  } else if (!existingLink && candidates.length === 1) {
    type = 'missing_link'
  } else if (existingLink && candidates.length >= 1 && !candidates.some((candidate) => candidate.id === existingLink.userId)) {
    type = 'link_identity_mismatch'
  } else if (candidates.length > 1) {
    type = 'duplicate_users'
  } else {
    type = 'aligned_single_user'
  }

  const reconcileSupported =
    Boolean(existingLink?.userId) &&
    Boolean(candidates[0]?.id) &&
    existingLink?.userId !== candidates[0]?.id

  return {
    chatId: input.chatId,
    telegramUserId: input.telegramUserId,
    telegramUserName: input.telegramUserName,
    existingLink: existingLink
      ? {
          id: existingLink.id,
          userId: existingLink.userId,
          isActive: existingLink.isActive,
          createdAt: existingLink.createdAt.toISOString(),
        }
      : null,
    identityCandidates: candidates.map((candidate: IdentityCandidateRow) => ({
      id: candidate.id,
      email: candidate.email,
      telegramUserId: candidate.telegramUserId,
      telegramChatId: candidate.telegramChatId,
      telegramUserName: candidate.telegramUserName,
      telegramLinkedAt: candidate.telegramLinkedAt?.toISOString() ?? null,
      createdAt: candidate.createdAt.toISOString(),
      deletedAt: candidate.deletedAt?.toISOString() ?? null,
      productSubscriptions: candidate.productSubscriptions.map((subscription) => ({
        productCode: subscription.product.code,
        status: subscription.status,
        expiresAt: subscription.expiresAt?.toISOString() ?? null,
        trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
        paidAt: subscription.paidAt?.toISOString() ?? null,
      })),
      telegramLinks: candidate.telegramLinks.map((link) => ({
        id: link.id,
        chatId: link.chatId,
        userId: link.userId,
        isActive: link.isActive,
        createdAt: link.createdAt.toISOString(),
      })),
    })),
    resolvedUserId,
    type,
    linkedUserId,
    identityUserId,
    repair: {
      supported: reconcileSupported,
      dryRun: true,
      action: reconcileSupported ? 'reconcileTelegramIdentityUsers' : 'none',
      linkedUserId,
      identityUserId,
    },
  }
}

function resolveIdentityInput(req: Request): {
  chatId: string
  telegramUserId: string
  telegramUserName: string | null
} {
  const chatId =
    normalizeString(req.query.chatId)
    ?? normalizeString(req.headers['x-telegram-chat-id'])
    ?? ''
  const telegramUserId = normalizeString(req.query.telegramUserId) ?? chatId
  const telegramUserName = normalizeString(req.query.telegramUserName)

  if (!chatId || !telegramUserId) {
    throw new Error('chatId and telegramUserId are required')
  }

  return { chatId, telegramUserId, telegramUserName }
}

export async function getTelegramIdentityParityHandler(req: Request, res: Response) {
  try {
    const input = resolveIdentityInput(req)
    const snapshot = await loadIdentityParitySnapshot(input)
    return res.json(snapshot)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    return res.status(400).json({ error: message })
  }
}

export async function postTelegramIdentityRepairHandler(req: Request, res: Response) {
  try {
    const input = resolveIdentityInput(req)
    const snapshot = await loadIdentityParitySnapshot(input)
    const body = (req.body ?? {}) as Record<string, unknown>
    const apply = body.apply === true
    const confirmReason = normalizeString(body.confirmReason)
    const confirmChatId = normalizeString(body.confirmChatId)
    const confirmLinkedUserId = normalizeString(body.confirmLinkedUserId)
    const confirmIdentityUserId = normalizeString(body.confirmIdentityUserId)

    if (!snapshot.repair.supported) {
      return res.json({
        ...snapshot,
        applied: false,
        repairResult: null,
      })
    }

    if (!apply) {
      return res.json({
        ...snapshot,
        applied: false,
        repairResult: null,
      })
    }

    if (
      confirmReason !== 'telegram_identity_repair' ||
      confirmChatId !== snapshot.chatId ||
      confirmLinkedUserId !== snapshot.linkedUserId ||
      confirmIdentityUserId !== snapshot.identityUserId
    ) {
      return res.status(400).json({
        error: 'identity_repair_confirmation_mismatch',
        snapshot,
      })
    }

    const repairResult = await reconcileTelegramIdentityUsers({
      linkedUserId: snapshot.linkedUserId!,
      identityUserId: snapshot.identityUserId!,
      reason: 'start_reconcile',
    })
    const after = await loadIdentityParitySnapshot(input)

    return res.json({
      before: snapshot,
      applied: true,
      repairResult,
      after,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    return res.status(400).json({ error: message })
  }
}
