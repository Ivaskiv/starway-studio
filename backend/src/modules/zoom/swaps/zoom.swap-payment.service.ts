import { SwapStatus, ZoomSlotStatus, ZoomSwapStatus } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { abTestZoomContent } from '@/products/ab-system/content/abTest.zoom.js'
import { buildShortWayForPayCheckoutUrl } from '../../subscriptions/payments/wayforpay/checkout.js'
import { buildPaymentRequest } from '../../subscriptions/payments/wayforpay/service.js'
import { sendDedupedTelegramMessage } from '../../../lib/telegram.js'
import { isActiveFocusSubscriber } from '../private/zoom.private-booking.service.js'
function getSafeName(firstName?: string | null): string {
  if (!firstName) return ''
  const trimmed = firstName.replace(/[<>{}\[\]]/g, '' ).replace(/\s+/g, ' ').trim().slice(0, 40)
  if (!trimmed) return ''
  const lowered = trimmed.toLowerCase()
  if (new Set(['undefined','null','user','test','admin','bot','учень','coach']).has(lowered) || lowered.startsWith('telegram-guest') || /^\d+$/.test(trimmed) || trimmed.length < 2) return ''
  return trimmed
}


function startOfWeekMonday(inputDate: Date): Date {
  const date = new Date(inputDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeekSunday(inputDate: Date): Date {
  const start = startOfWeekMonday(inputDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export async function getCoachWeekSlots(
  coachId: string,
  anchorDate = new Date()
) {
  const from = startOfWeekMonday(anchorDate)
  const to = endOfWeekSunday(anchorDate)
  return prisma.zoomSlot.findMany({
    where: {
      coachId,
      date: { gte: from, lte: to },
    },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  })
}

export async function toggleCoachSlotStatus(input: {
  slotId: string
  coachId: string
  status: ZoomSlotStatus
}) {
  return prisma.zoomSlot.update({
    where: { id: input.slotId },
    data: { status: input.status },
    select: { id: true, status: true, date: true, hour: true },
  })
}

export async function initiateZoomSwap(
  initiatorId: string,
  targetSlotId: string
) {
  const isSubscriber = await isActiveFocusSubscriber(initiatorId)
  if (!isSubscriber) throw new Error('focus_subscription_required')

  const user = await prisma.user.findUnique({
    where: { id: initiatorId },
    select: { id: true, swapsUsedThisMonth: true },
  })
  if (!user) throw new Error('user_not_found')
  if (user.swapsUsedThisMonth >= 1) throw new Error('swap_limit_reached')

  const targetSlot = await prisma.zoomSlot.findUnique({
    where: { id: targetSlotId },
    select: { id: true, coachId: true, status: true },
  })
  if (!targetSlot) throw new Error('target_slot_not_found')
  if (targetSlot.status !== ZoomSlotStatus.OPEN)
    throw new Error('target_slot_closed')

  const duplicateSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const duplicate = await prisma.zoomSlotSwapRequest.findFirst({
    where: {
      requesterId: initiatorId,
      targetSlotId,
      createdAt: { gte: duplicateSince },
      paymentStatus: {
        in: [ZoomSwapStatus.PENDING_PAYMENT, ZoomSwapStatus.CONFIRMED],
      },
    },
    select: { id: true },
  })
  if (duplicate) throw new Error('duplicate_pair_30d')

  const month = new Date().toISOString().slice(0, 7)
  const swap = await prisma.zoomSlotSwapRequest.create({
    data: {
      requesterId: initiatorId,
      targetSlotId,
      fee: 75,
      month,
      paymentStatus: ZoomSwapStatus.PENDING_PAYMENT,
      status: SwapStatus.PENDING,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    select: { id: true, fee: true },
  })
  const orderReference = `zoom_swap_${swap.id}_${Date.now()}`
  const payment = buildPaymentRequest({
    userId: initiatorId,
    productId: 'zoom_swap',
    amount: swap.fee,
    currency: 'UAH',
    payRef: orderReference,
    product_name: ['Zoom Swap Fee'],
    product_count: [1],
    product_price: [swap.fee],
  })
  const backendBaseUrl = (
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.TELEGRAM_WEBHOOK_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim()?.replace(/\/api$/, '') ||
    (process.env.PORT
      ? `http://127.0.0.1:${process.env.PORT}`
      : 'http://127.0.0.1:3001')
  ).replace(/\/$/, '')
  const checkoutUrl = await buildShortWayForPayCheckoutUrl(
    backendBaseUrl,
    payment,
    {
      product: 'zoom_swap',
      swapId: swap.id,
    }
  )

  await prisma.zoomSlotSwapRequest.update({
    where: { id: swap.id },
    data: { orderRef: orderReference },
  })

  return {
    swapId: swap.id,
    fee: swap.fee,
    checkoutUrl,
    message: abTestZoomContent.swap.created,
  }
}

async function notifyZoomSwapPaymentCompleted(input: {
  swapId: string
  requesterChatId: string | null
  requesterFirstName: string | null
  coachChatId: string | null
  slotDate: Date | null
  slotHour: number | null
}) {
  const slotLabel =
    input.slotDate && typeof input.slotHour === 'number'
      ? `${input.slotDate.toLocaleDateString('uk-UA')} о ${String(input.slotHour).padStart(2, '0')}:00`
      : 'у вибраний слот'

  await Promise.all([
    input.requesterChatId
      ? sendDedupedTelegramMessage(
          input.requesterChatId,
          `✅ Оплату за Zoom swap підтверджено. Ваш запит #${input.swapId} зарезервовано ${slotLabel}.`
        ).catch(() => undefined)
      : Promise.resolve(),
    input.coachChatId
      ? sendDedupedTelegramMessage(
          input.coachChatId,
          `💱 Оплачений Zoom swap #${input.swapId}. ${getSafeName(input.requesterFirstName) || 'Учасник'} зарезервував слот ${slotLabel}.`
        ).catch(() => undefined)
      : Promise.resolve(),
  ])
}

export async function confirmZoomSwapPaymentByOrderRef(
  orderRef: string,
  paymentContext?: {
    amount?: number
    currency?: string
    transactionId?: string | null
  }
) {
  const swap = await prisma.zoomSlotSwapRequest.findFirst({
    where: { orderRef },
    select: {
      id: true,
      requesterId: true,
      paymentStatus: true,
      paymentLogId: true,
      fee: true,
      targetSlotId: true,
      requester: {
        select: {
          expertId: true,
          firstName: true,
          telegramChatId: true,
        },
      },
      sessionFrom: {
        select: {
          expertId: true,
        },
      },
      targetSlot: {
        select: {
          id: true,
          coachId: true,
          date: true,
          hour: true,
          status: true,
          coach: {
            select: {
              telegramChatId: true,
              expertId: true,
            },
          },
        },
      },
    },
  })

  if (!swap) {
    console.warn('[ZOOM_SWAP] swap_not_found', { orderRef })
    return { updated: false, error: 'swap_not_found' as const }
  }

  if (swap.paymentStatus === ZoomSwapStatus.CONFIRMED) {
    console.info('[ZOOM_SWAP_IDEMPOTENT] already_confirmed', {
      swapId: swap.id,
      orderRef,
    })
    return { updated: false, duplicate: true as const, swapId: swap.id }
  }

  const existingPaymentLog = await prisma.paymentLog
    .findUnique({
      where: { orderReference: orderRef },
      select: { id: true },
    })
    .catch(() => null)

  const expertId =
    swap.requester.expertId ??
    swap.sessionFrom?.expertId ??
    swap.targetSlot?.coach.expertId ??
    null

  if (!expertId) {
    console.error('[ZOOM_SWAP] missing_expert_id', {
      swapId: swap.id,
      orderRef,
    })
    return {
      updated: false,
      error: 'missing_expert_id' as const,
      swapId: swap.id,
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let paymentLogId = existingPaymentLog?.id ?? swap.paymentLogId ?? null

      if (!paymentLogId) {
        const createdPaymentLog = await tx.paymentLog.create({
          data: {
            orderReference: orderRef,
            userId: swap.requesterId,
            expertId,
            amountCents: Math.round((paymentContext?.amount ?? swap.fee) * 100),
            currency: paymentContext?.currency ?? 'UAH',
            status: 'SUCCESS',
            processedAt: new Date(),
            metadata: {
              scope: 'zoom',
              type: 'zoom_swap',
              swapId: swap.id,
              targetSlotId: swap.targetSlotId,
              transactionId: paymentContext?.transactionId ?? null,
            },
          },
          select: { id: true },
        })
        paymentLogId = createdPaymentLog.id
      }

      if (swap.targetSlot?.id) {
        const reservation = await tx.zoomSlot.updateMany({
          where: {
            id: swap.targetSlot.id,
            status: ZoomSlotStatus.OPEN,
          },
          data: {
            status: ZoomSlotStatus.CLOSED,
          },
        })

        if (reservation.count === 0) {
          throw new Error('target_slot_unavailable')
        }
      }

      await tx.zoomSlotSwapRequest.update({
        where: { id: swap.id },
        data: {
          paymentStatus: ZoomSwapStatus.CONFIRMED,
          paidAt: new Date(),
          paymentLogId,
          status: SwapStatus.ACCEPTED,
          resolvedAt: new Date(),
        },
      })

      await tx.user.update({
        where: { id: swap.requesterId },
        data: { swapsUsedThisMonth: { increment: 1 } },
      })

      return { paymentLogId }
    })

    await notifyZoomSwapPaymentCompleted({
      swapId: swap.id,
      requesterChatId: swap.requester.telegramChatId ?? null,
      requesterFirstName: swap.requester.firstName ?? null,
      coachChatId: swap.targetSlot?.coach.telegramChatId ?? null,
      slotDate: swap.targetSlot?.date ?? null,
      slotHour: swap.targetSlot?.hour ?? null,
    }).catch(() => undefined)

    console.info('[ZOOM_SWAP_COMPLETED]', {
      swapId: swap.id,
      orderRef,
      paymentLogId: result.paymentLogId,
    })

    return {
      updated: true,
      swapId: swap.id,
      paymentLogId: result.paymentLogId,
    }
  } catch (error) {
    console.error('[ZOOM_SWAP_FAILED]', {
      swapId: swap.id,
      orderRef,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export async function resetMonthlySwapUsage() {
  const result = await prisma.user.updateMany({
    where: { swapsUsedThisMonth: { gt: 0 } },
    data: { swapsUsedThisMonth: 0 },
  })
  return { resetUsers: result.count }
}

export async function expireStaleSwapRequests() {
  try {
    const stale = await prisma.zoomSlotSwapRequest.findMany({
      where: { status: SwapStatus.PENDING, expiresAt: { lt: new Date() } },
      select: { id: true, requesterId: true },
    })
    if (stale.length === 0)
      return {
        expiredCount: 0,
        expired: [] as Array<{ id: string; requesterId: string }>,
      }

    await prisma.zoomSlotSwapRequest.updateMany({
      where: { id: { in: stale.map((item) => item.id) } },
      data: { status: SwapStatus.EXPIRED, resolvedAt: new Date() },
    })
    return { expiredCount: stale.length, expired: stale }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === 'P2021'
    ) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — ' +
          'run prisma migrate deploy to apply migration. Skipping.'
      )
      return {
        expiredCount: 0,
        expired: [] as Array<{ id: string; requesterId: string }>,
      }
    }
    throw err
  }
}
