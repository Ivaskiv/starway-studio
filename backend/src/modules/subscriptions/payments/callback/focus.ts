import { loadAbTestProgress } from '@/products/ab-system/telegram/progress.js'
import { cancelPendingAbTestSalesFollowups, scheduleFollowups } from '@/products/ab-system/telegram/scheduler.js'

import { prisma } from '../../../../db/client.js'
import { coachBot, sendOpsTelegramMessage } from '../../../../lib/telegram.js'
import { NotificationEvent } from '../../../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../../../services/notifications/NotificationService.js'
import { notifyCoachAboutSuccessfulPayment } from '../../../admin/notifications/coach.service.js'
import { getUpcomingGroupSessions } from '../../../zoom/service.js'
import { resolveFocusChannelInviteLink, simulateFocusActivation } from '../business/service.js'
import type { PaymentCallbackData } from '../../types.js'
import {
  getSafeName,
  sendFocusPaymentOnboardingIfNeeded,
} from './focus-onboarding.js'
import { sendFocusPaymentSuccessTelegramMessageByOrder } from './notifications.js'

export async function handleFocusPaymentSuccess(input: {
  userId: string
  data: PaymentCallbackData
  webhookResult: any
  payRef: string
  amount: number
}): Promise<void> {
  const { userId, data, webhookResult, payRef, amount } = input

  await cancelPendingAbTestSalesFollowups(userId)


        const activation = simulateFocusActivation(userId, {
          nextZoomAt: process.env.NEXT_ZOOM_AT?.trim() || null,
          channelInviteLink: resolveFocusChannelInviteLink(),
        })

        if (activation.preZoomScheduled) {
          await Promise.all(
            activation.preZoomReminders.map((reminder) =>
              notificationService
                .schedule(
                  NotificationEvent.AB_TEST_FOLLOWUP,
                  userId,
                  reminder.sendAt,
                  {
                    flow_timer_id: reminder.timerId,
                    lifecycle_stage: activation.lifecycleState,
                    delay_ms:
                      reminder.timerId === 'ZOOM_REMINDER_24H'
                        ? 24 * 60 * 60 * 1000
                        : 2 * 60 * 60 * 1000,
                    message_key: reminder.timerId,
                    result_key: null,
                  }
                )
                .catch((err: unknown) => {
                  // fix with kimi 2026-05-28: explicit side-effect error boundary — logs failure without crashing webhook, WayForPay receives 200 OK regardless
                  console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
                    operation: 'notification_service_schedule',
                    userId,
                    orderReference: data.order_reference,
                    error: err instanceof Error ? err.message : String(err),
                  })
                })
            )
          )
        }

        const paidUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            email: true,
            telegramChatId: true,
            telegramLinks: {
              where: { isActive: true, chatId: { not: null } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { chatId: true },
            },
          },
        })
        const focusSubscription = await prisma.productSubscription.findFirst({
          where: {
            userId,
            product: {
              is: {
                code: {
                  in: ['focus', 'FOCUS', 'stankey', 'STANKEY'],
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, focusWelcomedAt: true, expiresAt: true },
        })
        const canonicalSubscription = await prisma.subscription.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
            product: {
              is: {
                code: {
                  in: ['focus', 'FOCUS', 'stankey', 'STANKEY'],
                },
              },
            },
          },
          orderBy: { currentPeriodEnd: 'desc' },
          select: { currentPeriodEnd: true },
        })
        const planLabelMap: Record<string, string> = {
          '1month': '1 місяць',
          '3month': '3 місяці',
          '6month': '6 місяців',
          '1year': '1 рік',
          '1month_upgrade': '1 місяць',
          welcome_test: 'welcome_test',
        }
        const planLabel = webhookResult.planId
          ? (planLabelMap[webhookResult.planId] ?? webhookResult.planId)
          : 'невідомо'
        const finalExpiresAt = canonicalSubscription?.currentPeriodEnd ?? focusSubscription?.expiresAt ?? null
        const payerName = getSafeName(paidUser?.firstName)

        const upcoming = await getUpcomingGroupSessions(8)
        const lines = upcoming
          .map((session) => {
            const dt = new Date(session.scheduledAt)
            return `${dt.toLocaleString('uk-UA', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })} — ${session.topic}`
          })
          .join('\n')

        await sendFocusPaymentSuccessTelegramMessageByOrder({
          userId,
          orderReference: data.order_reference,
        })

        const coachChatId = process.env.COACH_TELEGRAM_ID?.trim()
        if (coachChatId && finalExpiresAt) {
          const coachSent = await notifyCoachAboutSuccessfulPayment({
            coachBot,
            coachChatId,
            userId,
            userLabel: payerName ? `${payerName} · ${paidUser?.email ?? 'email невідомий'}` : (paidUser?.email ?? null),
            productLabel: 'ФОКУС',
            planLabel,
            amount,
            currency: data.currency ?? 'UAH',
            orderReference: data.order_reference,
            finalExpiresAt,
          })

          console.log('[PAYMENT_LIFECYCLE] coach payment report delivered', {
            userId,
            delivered: coachSent,
          })
        }

        await sendFocusPaymentOnboardingIfNeeded({
          userId,
          orderReference: data.order_reference,
          paidUser,
          focusSubscription,
          canonicalSubscription,
          planLabel,
          upcomingLines: lines,
        })

        void loadAbTestProgress(userId)
          .then((progress) => scheduleFollowups(userId, progress, 'S6_ZOOM'))
          .catch((err: unknown) => {
            console.warn('[Focus] S6_ZOOM followup scheduling failed', err)
            const details = err instanceof Error ? err.message : 'unknown_error'
            void sendOpsTelegramMessage(
              `Focus S6_ZOOM followup scheduling failed\nuserId: ${userId}\nerror: ${details}`
            )
          })
}
