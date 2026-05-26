import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { logger } from '@/utils/logger.js'
import { resolveDecision } from '../../../core/decision/decision.resolver.js'
import { renderTelegram } from '../renderers/decisionTelegram.js'
import { handleBillingCheckout, handleBillingPaywall } from '../handlers/billing.js'
import { handleMorning, resumeQuestionSession } from '../handlers/morning.js'
import { handleEvening } from '../handlers/evening.js'
import { handlePrivacy } from '../handlers/privacy.js'
import { handleStatus } from '../handlers/status.js'
import { handleTasks, handleTaskDone } from '../handlers/tasks.js'
import { handleLidmagnet } from '../handlers/lidmagnet.js'
import { handleStart, sendStateMenu, getAccessAwareAppReplyMarkupForContext } from '../handlers/start.js'
import { startLeadMagnet } from '../flows/leadMagnet.flow.js'
import { dismissNudges } from './nudge.service.js'
import { getSession } from '../session.js'
import { trackEvent } from '../../events/service.js'
import { getTelegramProductContext } from '@/content/telegram.product-context.js'
import { openAppKeyboard } from '../keyboards.js'
import { CANONICAL_CTA_REGISTRY, resolveCanonicalCtaId, resolveCanonicalMessageKeyByCtaId } from '../../../core/state-machine/ctaFoundation.js'
import { buildRequestFingerprint } from '../../../core/state-machine/securityFoundation.js'
import { claimRuntimeEventReplay, buildRuntimeTelemetry, withRuntimeAdvisoryLock } from '../../../core/runtime/runtimeIdempotency.js'
import { handleAbTestCallback, observeAbTestCanonicalAction } from '@/products/ab-system/telegram/abTest.service.js'
import { planAck, planMessage } from '../conversation/delivery/planDelivery.js'

type TelegramCallbackKind =
  | 'payment'
  | 'room'
  | 'onboarding'
  | 'mentor'
  | 'reminder'
  | 'lifecycle'
  | 'navigation'
  | 'legacy'

type TelegramCallbackTransition =
  | 'trial_started'
  | 'paywall_opened'
  | 'checkout_opened'
  | 'status_requested'
  | 'waitlist_requested'
  | 'mentor_resumed'
  | 'mentor_chat_resumed'
  | 'task_opened'
  | 'privacy_opened'
  | 'task_completed'
  | 'task_skipped'
  | 'room_restarted'
  | 'room_diagnostic_opened'
  | 'room_opened'
  | 'room_practices_opened'
  | 'reminder_dismissed'
  | 'leadmagnet_resumed'
  | 'leadmagnet_material_resumed'
  | 'main_menu_opened'
  | 'lifecycle_unknown'

export type TelegramCallbackEvent = {
  action: string
  kind: TelegramCallbackKind
  productId: string | null
  transition: TelegramCallbackTransition
}

const CALLBACK_KIND_BY_ACTION: Record<string, { kind: TelegramCallbackKind; transition: TelegramCallbackTransition; productId?: string | null }> = {
  start_trial: { kind: 'onboarding', transition: 'trial_started' },
  open_paid_checkout: { kind: 'payment', transition: 'paywall_opened', productId: 'stankey' },
  open_status: { kind: 'lifecycle', transition: 'status_requested' },
  waitlist_early_access: { kind: 'onboarding', transition: 'waitlist_requested' },
  continue_ai_mentor: { kind: 'mentor', transition: 'mentor_resumed' },
  resume_morning_session: { kind: 'mentor', transition: 'mentor_resumed' },
  resume_evening_session: { kind: 'mentor', transition: 'mentor_resumed' },
  continue_ai_mentor_chat: { kind: 'mentor', transition: 'mentor_chat_resumed' },
  continue_task: { kind: 'reminder', transition: 'task_opened' },
  open_tasks: { kind: 'reminder', transition: 'task_opened' },
  open_privacy: { kind: 'lifecycle', transition: 'privacy_opened' },
  task_done: { kind: 'reminder', transition: 'task_completed' },
  task_skip: { kind: 'reminder', transition: 'task_skipped' },
  restart_flow: { kind: 'room', transition: 'room_restarted' },
  start_wheel: { kind: 'room', transition: 'room_diagnostic_opened' },
  open_lidmagnet: { kind: 'onboarding', transition: 'trial_started' },
  open_course: { kind: 'room', transition: 'room_opened' },
  open_practices: { kind: 'room', transition: 'room_practices_opened' },
  open_platform: { kind: 'room', transition: 'room_opened' },
  dismiss_task: { kind: 'reminder', transition: 'reminder_dismissed' },
  lm_continue: { kind: 'onboarding', transition: 'leadmagnet_resumed' },
  lm_continue_material: { kind: 'onboarding', transition: 'leadmagnet_material_resumed' },
  return_main_menu: { kind: 'navigation', transition: 'main_menu_opened' },
}

function toProductId(action: string): string | null {
  const match = action.match(/^pay_(stankey|absystem|focus)_/)
  if (match) {
    return match[1]
  }
  return CALLBACK_KIND_BY_ACTION[action]?.productId ?? null
}

export function resolveTelegramCallbackEvent(action: string): TelegramCallbackEvent {
  if (action.startsWith('pay_stankey_')) {
    return {
      action,
      kind: 'payment',
      productId: 'stankey',
      transition: 'checkout_opened',
    }
  }

  const preset = CALLBACK_KIND_BY_ACTION[action]
  if (preset) {
    return {
      action,
      kind: preset.kind,
      productId: preset.productId ?? toProductId(action),
      transition: preset.transition,
    }
  }

  return {
    action,
    kind: 'legacy',
    productId: toProductId(action),
    transition: 'lifecycle_unknown',
  }
}

const CALLBACK_IDEMPOTENCY_TTL_MS = 5_000
const START_TRIAL_DEDUP_TTL_MS = 15_000
const startTrialSentAt = new Map<string, number>()

function getStartTrialWelcomeDedupeKey(userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  return `start_trial_welcome_${userId}_${today}`
}

function logTelegramEvent(scope: string, event: TelegramCallbackEvent, extra?: Record<string, unknown>) {
  logger.info('[TELEGRAM_EVENT]', {
    scope,
    action: event.action,
    kind: event.kind,
    productId: event.productId,
    transition: event.transition,
    ...extra,
  })
}

async function handleRoomAction(ctx: Context, userId: string | null, action: string) {
  const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)

  if (action === 'restart_flow') {
    await handleStart(ctx)
    return true
  }

  if (action === 'start_wheel') {
    await planMessage(
      ctx,
      'ctx.reply',
      'room_start_wheel',
      'Відкрий Starway і запусти діагностику стану в MiniApp.',
      replyMarkup,
    )
    return true
  }

  if (action === 'open_focus_portal') {
    const focusContext = getTelegramProductContext('focus')
    await planMessage(
      ctx,
      'ctx.reply',
      'room_open_focus_portal',
      focusContext.copy.welcome.join('\n'),
      openAppKeyboard(focusContext.route.miniApp ?? '/miniapp', focusContext.cta.openRoom).reply_markup,
    )
    return true
  }

  if (action === 'open_course') {
    await planMessage(ctx, 'ctx.reply', 'room_open_course', 'Відкриваю курс у Starway.', replyMarkup)
    return true
  }

  if (action === 'open_practices') {
    await planMessage(ctx, 'ctx.reply', 'room_open_practices', 'Відкриваю практики у Starway.', replyMarkup)
    return true
  }

  if (action === 'open_platform') {
    await handleStatus(ctx)
    return true
  }

  if (action === 'return_main_menu') {
    const chatId = String(ctx.chat?.id ?? '')
    const session = chatId ? await getSession(chatId) : null
    const targetUserId = session?.userId ?? userId
    if (targetUserId) {
      if (!(await renderDecisionForContext(ctx, targetUserId, 'menu_open'))) {
        await sendStateMenu(ctx, targetUserId)
      }
    } else {
      await planMessage(
        ctx,
        'ctx.reply',
        'room_return_main_menu_guest',
        'Starway підключено. Відкрий Mini App для продовження.',
        replyMarkup,
      )
    }
    return true
  }

  return false
}

async function renderDecisionForContext(
  ctx: Context,
  userId: string | null,
  event: string,
  payload?: Record<string, unknown>,
): Promise<boolean> {
  const firstName = ctx.from?.first_name ?? 'Привіт'
  const { decision } = await resolveDecision(userId, event, payload)
  return renderTelegram(ctx, decision, firstName)
}

export async function dispatchTelegramCallbackEvent(ctx: Context, action: string): Promise<boolean> {
  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  const event = resolveTelegramCallbackEvent(action)
  const canonicalCtaId = resolveCanonicalCtaId(action)
  console.info('[AB_TEST_START_DEBUG] event_bus:dispatch_received', {
    action,
    userId,
    chatId: String(ctx.chat?.id ?? ''),
    callbackQueryId:
      'callbackQuery' in ctx && ctx.callbackQuery && 'id' in ctx.callbackQuery
        ? String(ctx.callbackQuery.id ?? '')
        : null,
  })

  const runtime = buildRuntimeTelemetry({
    scope: 'telegram_callback',
    type: event.kind,
    source: 'telegram',
    userId,
    state: (ctx.state as { userState?: string | null }).userState ?? null,
    tenantId: event.productId ?? null,
    requestFingerprint: buildRequestFingerprint({
      method: 'telegram',
      path: action,
      userId,
      payload: {
        kind: event.kind,
        productId: event.productId,
        transition: event.transition,
      },
    }),
    runtimeStage: 'telegram',
    orchestrationPath: ['telegram', event.kind, event.transition],
  })

  try {
    // AB test callbacks are handled directly — they carry their own idempotency
    // and must not be blocked by the advisory lock (which can fail to acquire
    // due to Prisma connection-pool session mismatch).
    if (action === 'continue_test_chat') {
      if (await handleAbTestCallback(ctx, 'ab_test:start')) {
        console.info('[AB_TEST_START_DEBUG] event_bus:handled_by_ab_test', {
          action,
          routedAs: 'ab_test:start',
          userId,
        })
        return true
      }
    }
    if (await handleAbTestCallback(ctx, action)) {
      console.info('[AB_TEST_START_DEBUG] event_bus:handled_by_ab_test', {
        action,
        userId,
      })
      return true
    }
    console.info('[AB_TEST_START_DEBUG] event_bus:not_handled_by_ab_test', {
      action,
      userId,
    })

    const replay = await withRuntimeAdvisoryLock({
      scope: 'telegram_callback',
      type: event.kind,
      source: 'telegram',
      userId,
      state: (ctx.state as { userState?: string | null }).userState ?? null,
      tenantId: event.productId ?? null,
      requestFingerprint: runtime.request_id,
      runtimeStage: runtime.runtime_stage,
    }, async () => {
      const duplicateFence = await claimRuntimeEventReplay({
        scope: 'telegram_callback',
        type: event.kind,
        source: 'telegram',
        userId,
        state: (ctx.state as { userState?: string | null }).userState ?? null,
        tenantId: event.productId ?? null,
        requestFingerprint: runtime.request_id,
        payload: {
          action,
          kind: event.kind,
          productId: event.productId,
          transition: event.transition,
          runtime,
        },
        ttlMs: CALLBACK_IDEMPOTENCY_TTL_MS,
      })

      if (duplicateFence.duplicate) {
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_duplicate_fence').catch(() => undefined)
        return duplicateFence
      }

      await observeAbTestCanonicalAction(ctx, action).catch(() => undefined)

      if (userId && canonicalCtaId) {
        const lifecycleStage = (ctx.state as { userState?: string | null }).userState ?? null
        await trackEvent({
          userId,
          type: 'CTA_CLICKED',
          source: 'telegram',
          state: lifecycleStage,
          productId: event.productId ?? null,
          payload: {
            cta_id: canonicalCtaId,
            callback_action: action,
            source_message: resolveCanonicalMessageKeyByCtaId(canonicalCtaId),
            source_stage: lifecycleStage ?? undefined,
            target_stage: CANONICAL_CTA_REGISTRY[canonicalCtaId].target_stage,
            readiness_level: (ctx.state as { readinessLevel?: string | null }).readinessLevel ?? null,
            security: {
              request_fingerprint: buildRequestFingerprint({
                method: 'telegram',
                path: action,
                userId,
                payload: {
                  cta_id: canonicalCtaId,
                  source_message: resolveCanonicalMessageKeyByCtaId(canonicalCtaId),
                },
              }),
              webhook_trust_source: 'telegram',
              tenant_id: event.productId ?? null,
            },
          },
        })
      }

      logTelegramEvent('callback', event, { userId })
      const transitionScope =
        event.kind === 'room'
          ? 'room-transition'
          : event.kind === 'onboarding'
            ? 'onboarding-transition'
            : event.kind === 'reminder'
              ? 'reminder-dispatch'
              : event.kind === 'mentor'
                ? 'mentor-transition'
                : 'lifecycle-transition'
      logTelegramEvent(transitionScope, event, { userId })

      if (action === 'start_trial') {
        if (userId) {
          const userRecord = await prisma.user.findUnique({
            where: { id: userId },
            select: { currentState: true },
          })
          if (userRecord?.currentState !== 'NEW' && userRecord?.currentState !== 'TELEGRAM_LINKED') {
            await planAck(ctx, 'ctx.answerCbQuery', 'callback_start_trial_state_reject').catch(() => undefined)
            return duplicateFence
          }
          const lastSent = startTrialSentAt.get(userId)
          if (lastSent && Date.now() - lastSent < START_TRIAL_DEDUP_TTL_MS) {
            await planAck(ctx, 'ctx.answerCbQuery', 'callback_start_trial_recent_reject').catch(() => undefined)
            return duplicateFence
          }
          const dedupeKey = getStartTrialWelcomeDedupeKey(userId)
          const existing = await prisma.runtimeOutbox.findUnique({
            where: { dedupeKey },
            select: { id: true },
          })
          if (existing) {
            console.log('[start_trial] dedup skip', { userId })
            await planAck(ctx, 'ctx.answerCbQuery', 'callback_start_trial_outbox_reject').catch(() => undefined)
            return duplicateFence
          }
          try {
            await prisma.runtimeOutbox.create({
              data: {
                scope: 'telegram_callback',
                type: 'start_trial_welcome',
                source: 'telegram',
                userId,
                state: (ctx.state as { userState?: string | null }).userState ?? null,
                tenantId: event.productId ?? null,
                payload: {
                  action,
                  dedupeKey,
                  marker: true,
                },
                status: 'DONE',
                processedAt: new Date(),
                dedupeKey,
              },
            })
          } catch (error) {
            const duplicate = await prisma.runtimeOutbox.findUnique({
              where: { dedupeKey },
              select: { id: true },
            })
            if (!duplicate) {
              throw error
            }
            console.log('[start_trial] dedup skip', { userId })
            await planAck(ctx, 'ctx.answerCbQuery', 'callback_start_trial_unique_reject').catch(() => undefined)
            return duplicateFence
          }
          startTrialSentAt.set(userId, Date.now())
          setTimeout(() => startTrialSentAt.delete(userId), START_TRIAL_DEDUP_TTL_MS)
        }
        if (!(await renderDecisionForContext(ctx, userId, 'trial_offer_requested'))) {
          if (userId) {
            await sendStateMenu(ctx, userId)
          }
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_start_trial', 'Показую наступний крок').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'open_paid_checkout') {
        if (userId) {
          await handleBillingPaywall(ctx, userId)
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_open_paid_checkout', 'Показую тарифи').catch(() => undefined)
        return duplicateFence
      }

      if (action.startsWith('pay_stankey_')) {
        if (userId) {
          const planId = action.slice('pay_stankey_'.length).trim() as 'monthly' | 'quarterly' | 'lifetime'
          await handleBillingCheckout(ctx, userId, planId)
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_pay_stankey', 'Готую оплату').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'open_status') {
        const { decision } = await resolveDecision(userId, 'status_requested')
        if (decision.nextAction === 'bind_user') {
          await renderTelegram(ctx, decision, ctx.from?.first_name ?? 'Привіт')
        } else {
          await handleStatus(ctx)
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_open_status', 'Оновлюю стан').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'waitlist_early_access') {
        if (!(await renderDecisionForContext(ctx, userId, 'waitlist_requested'))) {
          if (userId) {
            await sendStateMenu(ctx, userId)
          }
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_waitlist_early_access', 'Оновлюю доступний сценарій').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'continue_ai_mentor') {
        await resumeQuestionSession(ctx)
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_continue_ai_mentor', 'Продовжуємо сесію').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'resume_morning_session') {
        await handleMorning(ctx)
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_resume_morning', 'Відкриваю ранкову сесію').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'resume_evening_session') {
        await handleEvening(ctx)
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_resume_evening', 'Відкриваю вечірню сесію').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'continue_ai_mentor_chat') {
        await planMessage(
          ctx,
          'ctx.reply',
          'callback_continue_ai_mentor_chat_message',
          '👇 Напиши питання ABsystemу в поле вводу нижче, і я продовжу розмову тут у Telegram.',
        )
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_continue_ai_mentor_chat', 'Продовжуємо в Telegram').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'continue_task') {
        await handleTasks(ctx)
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_continue_task', 'Показую пріоритетне завдання').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'open_tasks') {
        await handleTasks(ctx)
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_open_tasks', 'Відкриваю завдання').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'open_privacy') {
        await handlePrivacy(ctx)
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_open_privacy', 'Відкриваю політику').catch(() => undefined)
        return duplicateFence
      }

      if (action.startsWith('done_')) {
        const taskId = action.slice('done_'.length).trim()
        if (taskId) {
          await handleTaskDone(ctx, taskId)
        } else {
          await planAck(ctx, 'ctx.answerCbQuery', 'callback_done_task_missing_id', 'Не вдалося визначити завдання').catch(() => undefined)
        }
        return duplicateFence
      }

      if (action === 'task_done') {
        await handleTasks(ctx)
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_task_done', 'Обери конкретне завдання').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'task_skip') {
        if (userId) {
          await dismissNudges(userId)
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_task_skip', 'Добре, повернемось пізніше').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'open_lidmagnet') {
        await handleLidmagnet(ctx)
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_open_lidmagnet', 'Відкриваю практикум').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'open_course' || action === 'open_practices' || action === 'restart_flow' || action === 'return_main_menu' || action === 'start_wheel') {
        await handleRoomAction(ctx, userId, action)
        return duplicateFence
      }

      if (action === 'dismiss_task') {
        if (userId) {
          await dismissNudges(userId)
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_dismiss_task', 'Добре, поки без нагадувань').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'lm_continue') {
        const chatId = String(ctx.chat?.id ?? '')
        const session = chatId ? await getSession(chatId) : null
        if (chatId && session?.userId) {
          const started = await startLeadMagnet(session.userId, chatId, 'telegram_resume')
          if (!started) {
            await sendStateMenu(ctx, session.userId)
            await planAck(ctx, 'ctx.answerCbQuery', 'callback_lm_continue_stale', 'Доступний актуальний сценарій').catch(() => undefined)
            return duplicateFence
          }
        }
        if (session?.userId) {
          await sendStateMenu(ctx, session.userId)
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_lm_continue', 'Запускаю практикум').catch(() => undefined)
        return duplicateFence
      }

      if (action === 'lm_continue_material') {
        const chatId = String(ctx.chat?.id ?? '')
        if (chatId && userId) {
          const started = await startLeadMagnet(userId, chatId, 'telegram_resume_material')
          if (!started) {
            await sendStateMenu(ctx, userId)
            await planAck(ctx, 'ctx.answerCbQuery', 'callback_lm_continue_material_stale', 'Доступний актуальний сценарій').catch(() => undefined)
            return duplicateFence
          }
        }
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_lm_continue_material', 'Запускаю матеріал').catch(() => undefined)
        return duplicateFence
      }

      if (await handleRoomAction(ctx, userId, action)) {
        await planAck(ctx, 'ctx.answerCbQuery', 'callback_room_update', 'Оновлюю room').catch(() => undefined)
        return duplicateFence
      }

      await planAck(ctx, 'ctx.answerCbQuery', 'callback_fallback', 'Відкрий Mini App для продовження').catch(() => undefined)
      return duplicateFence
    })

    if (!replay.acquired) {
      await planAck(ctx, 'ctx.answerCbQuery', 'callback_lock_skipped', 'Запит уже обробляється').catch(() => undefined)
      logTelegramEvent('callback_lock_skipped', event, { userId, deduped: true })
      return true
    }

    if (!replay.value) {
      return false
    }

    if (replay.value.duplicate) {
      logTelegramEvent('callback_duplicate', event, { userId, deduped: true })
      await trackEvent({
        userId,
        type: 'callback_replay_attempt',
        source: 'telegram',
        state: (ctx.state as { userState?: string | null }).userState ?? null,
        productId: event.productId ?? null,
        payload: {
          action,
          kind: event.kind,
          productId: event.productId,
          transition: event.transition,
          security: {
            replay_attempt: true,
            suspicious_activity: true,
            request_fingerprint: buildRequestFingerprint({
              method: 'telegram',
              path: action,
              userId,
              payload: {
                kind: event.kind,
                productId: event.productId,
                transition: event.transition,
              },
            }),
            webhook_trust_source: 'telegram',
          },
        },
      }).catch(() => undefined)
      return true
    }

    return true
  } catch (error) {
    logger.error('[telegram-event-bus:callback]', error)
    await planAck(ctx, 'ctx.answerCbQuery', 'callback_error', 'Не вдалося відновити сесію').catch(() => undefined)
    return false
  }
}
