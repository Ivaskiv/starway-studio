import { NotificationChannel, type Prisma, type Notification, NotificationStatus, NotificationType, type NotificationJob, type User, } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { trackEvent } from '../../modules/events/service.js'
import { NotificationEvent } from './NotificationEvent.js'
import { notificationDeliveryLayer } from './delivery/NotificationDeliveryLayer.js'
import type { DeliveryMessage, DeliveryUser } from './delivery/types.js'
import { buildNotificationData, getNotificationDuplicateWindowStart, isCriticalNotificationTemplate, resolveNotificationTemplateKey, resolveNotificationType, } from './domain/notificationPolicy.js'
import { notificationPreferenceRepository } from './repositories/NotificationPreferenceRepository.js'
import { notificationJobService } from './services/NotificationJobService.js'
import { notificationRecordService } from './services/NotificationRecordService.js'
import { getUserAccess } from '../../modules/access/service.js'
import { isNotificationAllowedForUser } from '../../modules/flow-control/service.js'
import { resolvePausedMentorContext } from './mentorLifecycle.js'
import { buildNotificationContent, type AbTestFollowupTimerId } from '../../lib/notifications/templates.js'
import type { AbTestResultKey, TestDriveContentVersion } from '@/products/ab-system/content/abTest.results.js'
import { buildFlowTimerAnalytics, resolveFlowTimerContext, shouldSkipFlowTimerDelivery, } from '../../core/state-machine/flowTimingFoundation.js'
import { enqueueRuntimeOutboxItem } from '../../core/runtime/outbox.js'
import { bot } from '../../lib/telegram.js'
import { readTelegramBotConfig } from '../../modules/telegram-mentor/runtime/botConfig.js'
import { resolveAbTestFollowupCopy } from '@/products/ab-system/content/abTest.followups.js'
import type { EventPayload, DojimSeriesScheduleResult, PersistedJobPayload } from './NotificationService.foundation.js'
import { getConversationRenderer, toJsonObject, asString, asNumber, DAILY_LIMIT, startOfDay, endOfDay } from './NotificationService.foundation.js'
import { sleep, resolveDeliveryChatId, buildTelegramReplyMarkup, compactFocusDojimBlocks, sendFocusDojimBlockMessage, loadDeliveryUser } from './NotificationService.telegram.js'

export abstract class NotificationServiceBase {
  abstract enqueueJob(event: NotificationEvent, userId: string, runAt: Date, payload?: EventPayload): Promise<NotificationJob>
  abstract processJob(job: NotificationJob): Promise<void>
  protected abstract isEventEnabledByPreferences(event: NotificationEvent, preferences: Awaited<ReturnType<typeof notificationPreferenceRepository.ensureForUser>>): boolean
  protected abstract buildMessage(event: NotificationEvent, user: DeliveryUser, payload?: EventPayload): Promise<DeliveryMessage>

  protected async hasMentorSessionAccess(userId: string): Promise<boolean> {
    const [access, user] = await Promise.all([
      getUserAccess(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      }),
    ])

    if (user?.email?.startsWith('telegram-guest-')) {
      return false
    }

    return Boolean(
      access.abilities['mentor.daily'] === true ||
      access.abilities['mentor.core'] === true,
    )
  }

  protected async shouldSuppressMentorTaskNotification(userId: string): Promise<boolean> {
    return Boolean(await resolvePausedMentorContext(userId))
  }

  protected async shouldSuppressMentorNotification(event: NotificationEvent, userId: string): Promise<boolean> {
    if (
      event !== NotificationEvent.DAILY_MORNING_DUE &&
      event !== NotificationEvent.DAILY_EVENING_DUE &&
      event !== NotificationEvent.AI_INACTIVE
    ) {
      return false
    }

    return !(await this.hasMentorSessionAccess(userId))
  }

  protected buildImmediateJob(event: NotificationEvent, userId: string, payload?: EventPayload): NotificationJob {
    const now = new Date()
    const normalizedPayload = toJsonObject(payload)
    const flow = resolveFlowTimerContext({ trigger_event: event, payload: normalizedPayload })
    return {
      id: `instant:${event}:${userId}:${now.getTime()}`,
      type: resolveNotificationType(event),
      payload: ({
        event,
        userId,
        payload: {
          ...normalizedPayload,
          ...(flow.timer ? buildFlowTimerAnalytics({
            timer: flow.timer,
            lifecycleStage: asString(normalizedPayload.lifecycle_stage ?? normalizedPayload.lifecycleStage),
            delayMs: asNumber(normalizedPayload.delay_ms ?? normalizedPayload.delayMs),
          }) : {}),
        },
      } satisfies PersistedJobPayload) as NotificationJob['payload'],
      runAt: now,
      status: 'DONE',
      attempts: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    }
  }

  protected async sendDirectTelegramNotification(input: {
    userId: string
    type: NotificationType
    title: string
    body: string
    telegramHtml?: string
    templateKey: string
    ctaText?: string
    ctaUrl?: string
    ctaMode?: 'web_app' | 'url'
    ctaActions?: Array<{
      text: string
      url: string
      mode?: 'web_app' | 'url' | 'callback'
    }>
    data?: EventPayload
    duplicateWindowStart?: Date
    isEnabled: (preferences: Awaited<ReturnType<typeof notificationPreferenceRepository.ensureForUser>>) => boolean
    force?: boolean
    requiresMentorAccess?: boolean
  }): Promise<boolean> {
    const user = await loadDeliveryUser(input.userId)
    if (!user) return false

    if (input.requiresMentorAccess && !(await this.hasMentorSessionAccess(input.userId))) {
      return false
    }

    const preferences = await notificationPreferenceRepository.ensureForUser(input.userId)
    const dayStart = startOfDay()
    const dayEnd = endOfDay()
    const duplicateWindowStart = input.duplicateWindowStart ?? dayStart
    const message: DeliveryMessage = {
      title: input.title,
      body: input.body,
      telegramHtml: input.telegramHtml,
      ctaText: input.ctaText,
      ctaUrl: input.ctaUrl,
      ctaMode: input.ctaMode,
      ctaActions: input.ctaActions,
    }

    const inAppDuplicate = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        templateKey: input.templateKey,
        createdAt: { gte: duplicateWindowStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!inAppDuplicate) {
      await this.createNotification({
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: {
          ...(input.data ?? {}),
          ctaText: message.ctaText ?? null,
          ctaUrl: message.ctaUrl ?? null,
          ctaMode: message.ctaMode ?? null,
          sourceChannel: 'telegram',
        },
        templateKey: input.templateKey,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
      })
      await notificationDeliveryLayer.sendInApp(user, message)
    }

    if (!preferences.telegramEnabled || (!input.force && !input.isEnabled(preferences))) {
      return false
    }

    const duplicate = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        channel: NotificationChannel.TELEGRAM,
        templateKey: input.templateKey,
        createdAt: { gte: duplicateWindowStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (duplicate && !input.force) return false

    if (!input.force && !isCriticalNotificationTemplate(input.templateKey)) {
      const todayCount = await prisma.notification.count({
        where: {
          userId: input.userId,
          channel: NotificationChannel.TELEGRAM,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      })

      if (todayCount >= DAILY_LIMIT) {
        return false
      }
    }

    const sent = await notificationDeliveryLayer.sendTelegram(user, message)

    await this.createNotification({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: {
        ...(input.data ?? {}),
        ctaText: message.ctaText ?? null,
        ctaUrl: message.ctaUrl ?? null,
        ctaMode: message.ctaMode ?? null,
        sourceChannel: 'telegram',
      },
      templateKey: input.templateKey,
      channel: NotificationChannel.TELEGRAM,
      status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
      sentAt: sent ? new Date() : null,
    })

    return sent
  }

  protected async sendFocusDojimTelegramSequence(input: {
    user: DeliveryUser
    message: DeliveryMessage
    flowTimerId: AbTestFollowupTimerId
    payload?: EventPayload
  }): Promise<boolean> {
    const chatId = resolveDeliveryChatId(input.user)
    if (!chatId) return false
    const telegramBotConfig = readTelegramBotConfig()

    const firstName = input.user.firstName ?? 'Привіт'
    const followupName = firstName === 'Привіт' ? null : firstName
    const resultKey = asString(input.payload?.result_key ?? input.payload?.resultKey) as AbTestResultKey | null
    const contentVersion = (asString(input.payload?.content_version ?? input.payload?.contentVersion) ?? 'legacy') as TestDriveContentVersion
    const copy = resolveAbTestFollowupCopy(
      input.flowTimerId,
      resultKey,
      contentVersion,
      { firstName: followupName },
    )
    const replyMarkup = buildTelegramReplyMarkup(input.message)
    const sequenceBlocks = compactFocusDojimBlocks(
      copy.blocks?.filter((block) => block.type !== 'cta') ?? [],
    )

    if (!sequenceBlocks.length) {
      return notificationDeliveryLayer.sendTelegram(input.user, input.message)
    }

    console.info('[DOJIM_DEBUG] send start', {
      flowTimerId: input.flowTimerId,
      userId: input.user.id,
      chatId: String(chatId),
      botUsername: telegramBotConfig.username || null,
      resultKey,
      blocksCount: sequenceBlocks.length,
    })

    for (let index = 0; index < sequenceBlocks.length; index += 1) {
      const block = sequenceBlocks[index]
      const isLastBlock = index === sequenceBlocks.length - 1

      await getConversationRenderer().renderOutbound({
        chatId: String(chatId),
        transportBot: bot,
      }, {
        text: null,
        buttons: [],
        cards: [],
        media: [],
        nextActions: [{ type: 'chat_action', action: 'typing' }],
        telemetry: {},
        analytics: {},
      })
      await sleep(index === 0 ? 2000 : 3000)
      await sendFocusDojimBlockMessage({
        chatId,
        block,
        replyMarkup: isLastBlock ? replyMarkup : undefined,
      })
    }

    console.info('[DOJIM_DEBUG] send done', {
      flowTimerId: input.flowTimerId,
      userId: input.user.id,
      chatId: String(chatId),
      botUsername: telegramBotConfig.username || null,
      resultKey,
      blocksCount: sequenceBlocks.length,
    })

    return true
  }

  async emit(event: NotificationEvent, userId: string, payload?: EventPayload): Promise<NotificationJob> {
    if (!(await isNotificationAllowedForUser(event, userId))) {
      console.info('[notifications] skipped by lifecycle guard', {
        event,
        userId,
      })
      return this.buildImmediateJob(event, userId, payload)
    }

    const normalizedPayload = toJsonObject(payload)
    const flow = resolveFlowTimerContext({ trigger_event: event, payload: normalizedPayload })
    if (flow.timer) {
      await trackEvent({
        userId,
        type: 'FLOW_TRIGGERED',
        source: 'web',
        state: asString(normalizedPayload.lifecycle_stage ?? normalizedPayload.lifecycleStage) ?? null,
        payload: buildFlowTimerAnalytics({
          timer: flow.timer,
          lifecycleStage: asString(normalizedPayload.lifecycle_stage ?? normalizedPayload.lifecycleStage),
          delayMs: asNumber(normalizedPayload.delay_ms ?? normalizedPayload.delayMs),
        }),
      }).catch(() => undefined)
    }

    const queueAvailable = await notificationJobService.isQueueAvailable().catch(() => false)
    if (!queueAvailable) {
      console.warn('[notifications] queue unavailable, fallback to immediate send', {
        event,
        userId,
      })
    }

    const job = this.buildImmediateJob(event, userId, payload)
    await this.processJob(job)
    return job
  }

  async schedule(event: NotificationEvent, userId: string, runAt: Date, payload?: EventPayload): Promise<NotificationJob> {
    return this.enqueueJob(event, userId, runAt, payload)
  }

  public async scheduleDojimSeries(
    userId: string,
    payload: Prisma.JsonObject,
  ): Promise<DojimSeriesScheduleResult> {
    const dojimSeries: Array<[AbTestFollowupTimerId, number]> = [
      ['RESULT_DOJIM_24H', 24 * 60 * 60 * 1000],
      ['RESULT_DOJIM_48H', 48 * 60 * 60 * 1000],
      ['RESULT_DOJIM_72H', 72 * 60 * 60 * 1000],
      ['RESULT_DOJIM_5D', 5 * 24 * 60 * 60 * 1000],
      ['RESULT_DOJIM_7D', 7 * 24 * 60 * 60 * 1000],
    ]

    await Promise.all(dojimSeries.map(([timerId, offsetMs]) => enqueueRuntimeOutboxItem({
      scope: 'notification_job',
      type: NotificationEvent.AB_TEST_FOLLOWUP,
      source: 'web',
      userId,
      state: typeof payload.lifecycle_stage === 'string' ? payload.lifecycle_stage : null,
      payload: {
        event: NotificationEvent.AB_TEST_FOLLOWUP,
        userId,
        payload: {
          ...payload,
          flow_timer_id: timerId,
          delay_ms: offsetMs,
        },
      } satisfies Prisma.JsonObject,
      runAt: new Date(Date.now() + offsetMs),
    })))

    return { jobsCount: dojimSeries.length }
  }

  async createNotification(input: {
    userId: string
    type: NotificationType
    title: string
    body: string
    data?: EventPayload
    templateKey?: string
    channel: NotificationChannel
    status: NotificationStatus
    sentAt?: Date | null
  }): Promise<Notification> {
    return notificationRecordService.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      templateKey: input.templateKey,
      channel: input.channel,
      status: input.status,
      sentAt: input.sentAt ?? null,
    })
  }
}
