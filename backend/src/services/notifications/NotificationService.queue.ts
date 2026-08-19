import { NotificationChannel, type Prisma, type Notification, NotificationStatus, NotificationType, type NotificationJob, type User, } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import { trackEvent } from '../../modules/events/service.js'
import { resolveUserState } from '../../modules/telegram-mentor/handlers/start.js'
import { NotificationEvent } from './NotificationEvent.js'
import { notificationDeliveryLayer } from './delivery/NotificationDeliveryLayer.js'
import { buildNotificationData, getNotificationDuplicateWindowStart, isCriticalNotificationTemplate, resolveNotificationTemplateKey, resolveNotificationType, } from './domain/notificationPolicy.js'
import { notificationPreferenceRepository } from './repositories/NotificationPreferenceRepository.js'
import { notificationJobService } from './services/NotificationJobService.js'
import { isNotificationAllowedForUser } from '../../modules/flow-control/service.js'
import { buildNotificationContent, type AbTestFollowupTimerId } from '../../lib/notifications/templates.js'
import { canSendCrossChannelNotification, markCrossChannelNotificationSent, } from '../../modules/user-state/crossChannelState.service.js'
import { buildFlowTimerAnalytics, resolveFlowTimerContext, shouldSkipFlowTimerDelivery, } from '../../core/state-machine/flowTimingFoundation.js'
import { buildRuntimeTelemetry, claimRuntimeJobReplay, } from '../../core/runtime/idempotency.js'
import { FOCUS_DOJIM_TIMER_IDS } from '../../modules/subscriptions/payments/business/types.js'
import type { EventPayload } from './NotificationService.foundation.js'
import { isJsonObject, toJsonObject, asString, asNumber, DAILY_LIMIT, startOfDay, endOfDay, toPersistedJobPayload } from './NotificationService.foundation.js'
import { loadDeliveryUser } from './NotificationService.telegram.js'
import { NotificationServiceBase } from './NotificationService.base.js'

export abstract class NotificationServiceQueue extends NotificationServiceBase {
  async enqueueJob(event: NotificationEvent, userId: string, runAt: Date, payload?: EventPayload): Promise<NotificationJob> {
    const normalizedPayload = toJsonObject(payload)
    const flow = resolveFlowTimerContext({ trigger_event: event, payload: normalizedPayload })
    const runtime = buildRuntimeTelemetry({
      scope: 'notification_job',
      type: event,
      source: 'web',
      userId,
      state: asString(normalizedPayload.lifecycle_stage ?? normalizedPayload.lifecycleStage) ?? null,
      tenantId: asString(normalizedPayload.tenant_id ?? normalizedPayload.tenantId) ?? null,
      requestFingerprint: asString(normalizedPayload.request_fingerprint ?? normalizedPayload.requestFingerprint) ?? null,
      runtimeStage: flow.timer?.source_stage ?? 'notification',
      orchestrationPath: ['notifications', event],
      retryAttempt: asNumber(normalizedPayload.retry_attempt ?? normalizedPayload.retryAttempt) ?? 0,
      replayReason: asString(normalizedPayload.replay_reason ?? normalizedPayload.replayReason) ?? null,
      executionLatencyMs: asNumber(normalizedPayload.execution_latency_ms ?? normalizedPayload.executionLatencyMs) ?? null,
      queueLatencyMs: asNumber(normalizedPayload.queue_latency_ms ?? normalizedPayload.queueLatencyMs) ?? null,
      deliveryLatencyMs: asNumber(normalizedPayload.delivery_latency_ms ?? normalizedPayload.deliveryLatencyMs) ?? null,
      handlerDurationMs: asNumber(normalizedPayload.handler_duration_ms ?? normalizedPayload.handlerDurationMs) ?? null,
      failureClassification: asString(normalizedPayload.failure_classification ?? normalizedPayload.failureClassification) ?? null,
    })

    const replay = await claimRuntimeJobReplay({
      scope: 'notification_job',
      type: resolveNotificationType(event),
      source: 'web',
      userId,
      state: asString(normalizedPayload.lifecycle_stage ?? normalizedPayload.lifecycleStage) ?? null,
      tenantId: asString(normalizedPayload.tenant_id ?? normalizedPayload.tenantId) ?? null,
      requestFingerprint: runtime.request_id,
      payload: {
        ...normalizedPayload,
        runtime,
      } satisfies Prisma.JsonValue,
      ttlMs: Math.max(15 * 60_000, (flow.timer?.delay_ms ?? 0) + 5 * 60_000),
    })

    if (replay.duplicate) {
      const existing = await prisma.notificationJob.findFirst({
        where: {
          type: resolveNotificationType(event),
          createdAt: { gte: new Date(Date.now() - Math.max(15 * 60_000, (flow.timer?.delay_ms ?? 0) + 5 * 60_000)) },
          payload: {
            path: ['runtime', 'idempotency_key'],
            equals: replay.key,
          },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null)

      if (existing) {
        return existing
      }

      return this.buildImmediateJob(event, userId, {
        ...normalizedPayload,
        runtime,
        duplicate: true,
      })
    }

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
    return notificationJobService.enqueue(resolveNotificationType(event), {
      event,
      userId,
      payload: {
        ...normalizedPayload,
        ...(flow.timer ? buildFlowTimerAnalytics({
          timer: flow.timer,
          lifecycleStage: asString(normalizedPayload.lifecycle_stage ?? normalizedPayload.lifecycleStage),
          delayMs: asNumber(normalizedPayload.delay_ms ?? normalizedPayload.delayMs),
        }) : {}),
        runtime,
      },
    }, runAt)
  }

  async processJob(job: NotificationJob): Promise<void> {
    const persisted = toPersistedJobPayload(job.payload)
    const payload = toJsonObject(persisted.payload)
    const flow = resolveFlowTimerContext({
      trigger_event: persisted.event,
      timer_id: asString(payload.flow_timer_id ?? payload.flowTimerId) as Parameters<typeof resolveFlowTimerContext>[0]['timer_id'] ?? null,
      payload,
    })
    const isFocusDojim = Boolean(
      flow.timer?.id && FOCUS_DOJIM_TIMER_IDS.includes(flow.timer.id as (typeof FOCUS_DOJIM_TIMER_IDS)[number])
    )
    if (isFocusDojim && persisted.userId) {
      const focusStatus = await prisma.user.findUnique({
        where: { id: persisted.userId },
        select: { focusPaid: true, telegramEnabled: true },
      }).catch(() => null)
      if (!focusStatus || focusStatus.focusPaid || !focusStatus.telegramEnabled) {
        console.info('[notifications] skipped focus dojims by payment guard', {
          event: persisted.event,
          userId: persisted.userId,
          focusPaid: focusStatus?.focusPaid ?? null,
          telegramEnabled: focusStatus?.telegramEnabled ?? null,
          timerId: flow.timer?.id ?? null,
        })
        return
      }
    }
    if (!(await isNotificationAllowedForUser(persisted.event, persisted.userId))) {
      console.info('[notifications] skipped queued job by lifecycle guard', {
        event: persisted.event,
        userId: persisted.userId,
      })
      if (flow.timer) {
        await trackEvent({
          userId: persisted.userId,
          type: 'FLOW_SKIPPED',
          source: 'web',
          state: null,
          payload: buildFlowTimerAnalytics({
            timer: flow.timer,
            reason: 'state_changed',
            currentState: null,
          }),
        }).catch(() => undefined)
      }
      return
    }
    if (!(await canSendCrossChannelNotification(persisted.userId, persisted.event))) {
      console.info('[notifications] skipped queued job by cross-channel state', {
        event: persisted.event,
        userId: persisted.userId,
      })
      if (flow.timer) {
        await trackEvent({
          userId: persisted.userId,
          type: 'FLOW_SKIPPED',
          source: 'web',
          state: null,
          payload: buildFlowTimerAnalytics({
            timer: flow.timer,
            reason: 'state_changed',
            currentState: null,
          }),
        }).catch(() => undefined)
      }
      return
    }
    const user = await loadDeliveryUser(persisted.userId)

    if (!user) {
      throw new Error('notification_user_not_found')
    }

    const currentState = await resolveUserState(persisted.userId).catch(() => null)
    const flowGuardState =
      persisted.event === NotificationEvent.AB_TEST_FOLLOWUP
        ? asString(
            payload.ab_test_stage ??
            payload.lifecycle_stage ??
            payload.abTestStage ??
            payload.lifecycleStage,
          ) ?? currentState
        : currentState
    const readinessLevel = asString(payload.readiness_level ?? payload.readinessLevel)
      ?? (isJsonObject(payload.behavioral) && isJsonObject(payload.behavioral.readiness)
        ? asString(payload.behavioral.readiness.level)
        : null)
    const paymentSuccessSeen = flow.timer?.id.startsWith('PAYMENT_REMINDER') || flow.timer?.id.startsWith('RESULT_')
      ? Boolean(await prisma.event.findFirst({
          where: {
            userId: persisted.userId,
            type: 'payment_success',
            ...(typeof payload.productId === 'string'
              ? { payload: { path: ['productId'], equals: payload.productId } }
              : {}),
          },
          select: { id: true },
        }).catch(() => null))
      : false
    const zoomAttendanceSeen = flow.timer?.id.startsWith('PLATFORM_INVITE_AFTER_ZOOM') || flow.timer?.id.startsWith('ZOOM_REMINDER')
      ? Boolean(await prisma.event.findFirst({
          where: {
            userId: persisted.userId,
            type: 'ZOOM_ATTENDED',
          },
          select: { id: true },
        }).catch(() => null))
      : false
    const activeUser = Boolean(flowGuardState && !String(flowGuardState).toLowerCase().includes('retention'))

    if (flow.timer) {
      const guard = shouldSkipFlowTimerDelivery({
        currentState: flowGuardState,
        timer: flow.timer,
        payload,
        hasPaymentSuccess: paymentSuccessSeen,
        hasZoomAttendance: zoomAttendanceSeen,
        isActiveUser: activeUser,
        readinessLevel,
      })

      if (!guard.ok) {
        await trackEvent({
          userId: persisted.userId,
          type: 'FLOW_SKIPPED',
          source: 'web',
          state: flowGuardState,
          payload: buildFlowTimerAnalytics({
            timer: flow.timer,
            reason: guard.reason ?? 'state_changed',
            currentState: flowGuardState,
          }),
        }).catch(() => undefined)
        return
      }
    }

    if (await this.shouldSuppressMentorNotification(persisted.event, user.id)) {
      console.info('[notifications] skipped: mentor access inactive', {
        event: persisted.event,
        userId: user.id,
      })
      if (flow.timer) {
        await trackEvent({
          userId: persisted.userId,
          type: 'FLOW_SKIPPED',
          source: 'web',
          state: currentState,
          payload: buildFlowTimerAnalytics({
            timer: flow.timer,
            reason: 'active_user_retention_flow',
            currentState,
          }),
        }).catch(() => undefined)
      }
      return
    }

    const type = resolveNotificationType(persisted.event)
    const templateKey = resolveNotificationTemplateKey(persisted.event, payload)
    const preferences = await notificationPreferenceRepository.ensureForUser(user.id)
    const message = await this.buildMessage(persisted.event, user, payload)
    const dayStart = startOfDay()
    const dayEnd = endOfDay()

    if (persisted.event === NotificationEvent.AI_INACTIVE) {
      const actionableToday = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          channel: NotificationChannel.TELEGRAM,
          createdAt: { gte: dayStart, lt: dayEnd },
          OR: [
            { type: NotificationType.DAILY_MORNING },
            { type: NotificationType.DAILY_EVENING },
            { templateKey: { startsWith: 'session_handoff_' } },
            { templateKey: { startsWith: 'microtask_' } },
            { templateKey: { startsWith: 'task_nudge_' } },
          ],
        },
        select: { id: true },
      })

      if (actionableToday) {
        console.info('[notifications] skipped: AI_INACTIVE conflicts with actionable reminder', {
          userId: user.id,
        })
        return
      }
    }

    const inAppDuplicate = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        channel: NotificationChannel.IN_APP,
        templateKey,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!inAppDuplicate) {
      await this.createNotification({
        userId: user.id,
        type,
        title: message.title,
        body: message.body,
        data: buildNotificationData(persisted.event, payload, message),
        templateKey,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
      })
      await notificationDeliveryLayer.sendInApp(user, message)
      await markCrossChannelNotificationSent(user.id, persisted.event, 'site')
    }

    if (!preferences.telegramEnabled) {
      return
    }

    if (!this.isEventEnabledByPreferences(persisted.event, preferences)) {
      return
    }

    const duplicateWindowStart = getNotificationDuplicateWindowStart(persisted.event)

    const telegramDuplicate = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        channel: NotificationChannel.TELEGRAM,
        templateKey,
        createdAt: {
          gte: duplicateWindowStart,
          lt: dayEnd,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (telegramDuplicate) {
      console.info('[notifications] telegram skipped: duplicate', {
        event: persisted.event,
        userId: user.id,
        templateKey,
      })
      if (flow.timer) {
        await trackEvent({
          userId: persisted.userId,
          type: 'FLOW_SKIPPED',
          source: 'web',
          state: currentState,
          payload: buildFlowTimerAnalytics({
            timer: flow.timer,
            reason: 'duplicate_reminder',
            currentState,
          }),
        }).catch(() => undefined)
      }
      return
    }

    if (!isCriticalNotificationTemplate(templateKey)) {
      const todayCount = await prisma.notification.count({
        where: {
          userId: user.id,
          channel: NotificationChannel.TELEGRAM,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      })
      if (todayCount >= DAILY_LIMIT) {
        console.info('[notifications] telegram skipped: daily limit reached', {
          event: persisted.event,
          userId: user.id,
          templateKey,
          todayCount,
        })
        if (flow.timer) {
          await trackEvent({
            userId: persisted.userId,
            type: 'FLOW_SKIPPED',
            source: 'web',
            state: currentState,
            payload: buildFlowTimerAnalytics({
              timer: flow.timer,
              reason: 'duplicate_reminder',
              currentState,
            }),
          }).catch(() => undefined)
        }
        return
      }
    }

    const flowTimerId = persisted.event === NotificationEvent.AB_TEST_FOLLOWUP
      ? asString(payload?.flow_timer_id ?? payload?.flowTimerId)
      : null
    const sent = persisted.event === NotificationEvent.AB_TEST_FOLLOWUP
      && flowTimerId
      && FOCUS_DOJIM_TIMER_IDS.includes(flowTimerId as (typeof FOCUS_DOJIM_TIMER_IDS)[number])
      ? await this.sendFocusDojimTelegramSequence({
        user,
        message,
        flowTimerId: flowTimerId as AbTestFollowupTimerId,
        payload,
      })
      : await notificationDeliveryLayer.sendTelegram(user, message)

    await this.createNotification({
      userId: user.id,
      type,
      title: message.title,
      body: message.body,
      data: buildNotificationData(persisted.event, payload, message),
      templateKey,
      channel: NotificationChannel.TELEGRAM,
      status: sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
      sentAt: sent ? new Date() : null,
    })

    if (!sent) {
      throw new Error('notification_delivery_failed')
    }

    await markCrossChannelNotificationSent(user.id, persisted.event, 'telegram')

    if (flow.timer) {
      await trackEvent({
        userId: persisted.userId,
        type: 'FLOW_COMPLETED',
        source: 'web',
        state: currentState,
        payload: buildFlowTimerAnalytics({
          timer: flow.timer,
          resultingEvent: persisted.event,
          resultingTransition: flow.rule?.next_expected_transition ?? null,
        }),
      }).catch(() => undefined)
    }

    console.info('[notifications] telegram sent', {
      event: persisted.event,
      userId: user.id,
      templateKey,
    })
  }
}
