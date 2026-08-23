import { telegramContentRegistry } from '@/modules/telegram-mentor/content/contentRegistry.js'
import { TelegramConversationRenderer } from '@/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.js'
import { FOCUS_WELCOME } from '@/products/ab-system/content/abTest.focus.js'
import { loadAbTestProgress } from '@/products/ab-system/telegram/progress.js'
import { cancelPendingAbTestSalesFollowups, scheduleFollowups } from '@/products/ab-system/telegram/scheduler.js'

import { prisma } from '../../../../db/client.js'
import { bot, sendOpsTelegramMessage } from '../../../../lib/telegram.js'
import { NotificationEvent } from '../../../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../../../services/notifications/NotificationService.js'
import { getUpcomingGroupSessions } from '../../../zoom/service.js'
import { resolveFocusChannelInviteLink, simulateFocusActivation } from '../business/service.js'
import type { PaymentCallbackData } from '../../types.js'
import { getSafeName, resolvePaidTelegramChatId, sendFocusPaymentOnboardingIfNeeded } from './focus-onboarding.js'

const conversationRenderer = new TelegramConversationRenderer()

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
          focus_1month: '1 місяць',
          focus_3month: '3 місяці',
          welcome_test: 'welcome_test',
        }
        const planLabel = webhookResult.planId
          ? (planLabelMap[webhookResult.planId] ?? webhookResult.planId)
          : 'невідомо'
        const dateStr = new Date().toLocaleString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        const activeCount = await prisma.productSubscription.count({
          where: { status: 'ACTIVE' },
        })
        const payerName = getSafeName(paidUser?.firstName)
        const opsSent = await sendOpsTelegramMessage(
          `ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n` +
            `Тип події: Нова оплата\n` +
            `Учасник: ${payerName || 'Користувач'} · ${paidUser?.email ?? 'email невідомий'}\n` +
            `Тариф: ${planLabel}\n` +
            `Сума: ${amount} ${data.currency ?? 'UAH'}\n` +
            `Order: ${data.order_reference}\n` +
            `Час: ${dateStr}\n` +
            `Активних підписок: ${activeCount}`,
          process.env.PUBLIC_FRONTEND_URL?.trim()
            ? {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'ПАНЕЛЬ КЕРУВАННЯ',
                        url: `${process.env.PUBLIC_FRONTEND_URL!.replace(/\/$/, '')}/app/dashboard`,
                      },
                    ],
                  ],
                },
              }
            : undefined
        ).catch((err) => {
          console.error('[payment] notify ops:', err)
          return false
        })
        console.log('[PAYMENT_LIFECYCLE] ops report delivered', {
          userId,
          delivered: Boolean(opsSent),
        })

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
        await sendFocusPaymentOnboardingIfNeeded({
          userId,
          paidUser,
          focusSubscription,
          canonicalSubscription,
          planLabel,
          upcomingLines: lines,
        })

        if (!focusSubscription?.focusWelcomedAt) {
          const paidChatId = resolvePaidTelegramChatId({
            userId,
            paidUser,
            operation: 'focus_block12_send',
          })
          const channelLink = process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ?? ''
          if (paidChatId) {
            await conversationRenderer.renderOutbound({
              chatId: paidChatId,
              transportBot: bot,
            }, {
              text: FOCUS_WELCOME.msg1.body,
              buttons: channelLink
                ? [{ kind: 'url', label: telegramContentRegistry.buttons.focusChannel, value: channelLink }]
                : [],
              cards: [],
              media: [],
              nextActions: [],
              telemetry: {},
              analytics: {},
            }).catch((err: unknown) => {
              console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
                operation: 'focus_block12_send',
                userId,
                orderReference: data.order_reference,
                error: err instanceof Error ? err.message : String(err),
              })
            })
            if (focusSubscription?.id) {
              await prisma.productSubscription.update({
                where: { id: focusSubscription.id },
                data: { focusWelcomedAt: new Date() },
              }).catch(async (err: unknown) => {
                const errorMessage =
                  err instanceof Error ? err.message : String(err)
                console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
                  operation: 'focus_subscription_mark_welcomed',
                  userId,
                  payRef,
                  orderReference: data.order_reference,
                  error: errorMessage,
                })
                await sendOpsTelegramMessage(
                  `[PAYMENT_LIFECYCLE] focusWelcomedAt update failed\nuserId: ${userId}\npayRef: ${payRef}\norderReference: ${data.order_reference}\nsubscriptionId: ${focusSubscription.id}\nerror: ${errorMessage}`
                ).catch((opsErr: unknown) => {
                  console.error('[PAYMENT_LIFECYCLE] ops_alert_failed', {
                    operation: 'focus_subscription_mark_welcomed',
                    userId,
                    payRef,
                    orderReference: data.order_reference,
                    error:
                      opsErr instanceof Error ? opsErr.message : String(opsErr),
                  })
                })
              })
            }
            console.log('[FOCUS_BLOCK12] sent', {
              userId,
              channelLink: Boolean(channelLink),
            })
          }
        }

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
