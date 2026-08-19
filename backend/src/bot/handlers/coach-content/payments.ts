import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import {
  coachPanelContent,
  formatKyivDateTime,
  replyOrEditPanelMessage,
  resolveCoachAccess,
} from './shared.js'

export async function handleCoachPaymentsCommand(ctx: Context): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [active, trial, pastDue, canceled, expired, recentPurchases] = await Promise.all([
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'TRIAL' } }),
    prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    prisma.subscription.count({ where: { status: 'CANCELED' } }),
    prisma.subscription.count({ where: { status: 'EXPIRED' } }),
    prisma.purchaseHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        userId: true,
        productId: true,
        amountCents: true,
        currency: true,
        createdAt: true,
      },
    }),
  ])

  const recentLines = recentPurchases.length > 0
    ? recentPurchases.map((purchase) => {
      const amount = Number.isFinite(Number(purchase.amountCents))
        ? (Number(purchase.amountCents) / 100).toFixed(0)
        : '0'
      return `• ${formatKyivDateTime(purchase.createdAt)} — ${purchase.productId ?? 'unknown'} — ${amount} ${purchase.currency} — ${purchase.userId}`
    }).join('\n')
    : coachPanelContent.payments.noData

  await replyOrEditPanelMessage(ctx, [
    `💳 ${coachPanelContent.payments.title}`,
    '',
    `ACTIVE: ${active}`,
    `TRIAL: ${trial}`,
    `PAST_DUE: ${pastDue}`,
    `CANCELED: ${canceled}`,
    `EXPIRED: ${expired}`,
    '',
    'Recent purchases:',
    recentLines,
  ].join('\n'))
  return true
}
