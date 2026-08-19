//backend/src/products/ab-system/telegram/views.ts
import { absystemButtons, absystemContent } from '@/products/absystem/config/content.js'
import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'
import type { InlineKeyboardMarkup } from 'telegraf/types'
import { coachBot, sendOpsTelegramMessage } from '../../../lib/telegram.js'
import {
  blockquote,
  bold,
  escapeTelegramHtml,
  joinBlocks,
  sendTelegramMessage,
} from '../../../lib/telegram/messageFormatter.js'
// import { buildBehavioralSnapshot } from '../../../core/behavioral/behavioralSnapshot.js'
import { withRuntimeAdvisoryLock } from '../../../core/runtime/idempotency.js'
import {
  buildAbTestProgressPatch,
  resolveAbTestQuestionOrder,
  type AbTestProgress,
} from '../../../core/state-machine/abTestFoundation.js'
import { prisma } from '../../../db/client.js'
import { planMessage } from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import { setPendingTelegramIdentity } from '../../../modules/telegram-mentor/services/identity/pending.js'
// import { PromptProvider } from '../../../PromptProvider.js'
import {
  getAbTestAnswer,
  getAbTestQuestion,
  type AbTestQuestionId,
} from '../content/abTest.questions.js'
import {
  getAbTestResultDefinition,
  interpolateFirstName,
  type AbTestResultKey,
} from '../content/abTest.results.js'
import {
  AB_TEST_AUDIO_URL,
  AB_TEST_BOLD_LINES,
  AB_TEST_PRACTICE_PREVIEW_PROMPT,
  AB_TEST_REVIEW_HEADER_VALUES,
  AB_TEST_SCREENSHOT_URLS,
  AB_TEST_VOICE_CAPTION_PROMPT,
  AB_TEST_VOICE_NOTE_HEADER,
  AB_TEST_VOICE_NOTE_LINK_TEXT,
  buildAbTestScreenshotMarker,
  telegramBlock,
  type AbTestScreenshotKey,
  type TelegramContentBlock,
} from '../content/abTest.shared.js'
import { trackAbTestEvent } from './analytics.js'
import {
  buildWebAppButton,
  resolveBrowserTestUrlOrNull,
} from './buttons.js'
import { scheduleFollowups } from './scheduler.js'
import { getUpcomingZoomBookingView } from '@/modules/zoom/service.js'
import { buildZoomCalendarUrl } from '@/modules/zoom/urls.js'
import { getUserAccessState } from '@/modules/subscriptions/payments/focus-access.js'
import {
  buildAbTestEmailGateMessage,
  getAbTestProfileEmail,
  getAbTestProgressFromUiSettings,
  loadAbTestProgress,
  loadUserUiSettings,
  saveAbTestProgress,
} from './progress.js'
import {
  formatMobileAnswerButtonText,
  formatMobileAnswerListForMessage,
} from './helpers.js'
import { logger } from '../../../utils/logger.js'
import {
  buildCanonicalResultKeyboard,
  resolveCanonicalResultActionPolicy,
} from './keyboard-policy.js'
import { resolveFirstName, sleep } from './view-formatting.js'
import { dispatchAbTestResultSequence } from './view-result.js'

export async function renderAbTestResultThenOffer(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
  options: { typing?: boolean } = {}
) {
  if (options.typing ?? true) {
    await sleep(1000)
  }
  await renderAbTestPostEmailSubmitSequence(ctx, userId, progress)
}

export async function renderAbTestPostEmailSubmitSequence(
  ctx: Context,
  userId: string,
  progress: AbTestProgress,
  options: {
    notifyOps?: boolean
    forceRedelivery?: boolean
    trigger?: string
  } = {}
) {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, telegramUserName: true },
  })

  const resultKey = String(
    progress.result_key ?? ''
  ).toLowerCase() as AbTestResultKey
  const firstName = resolveFirstName(user, ctx, userId)
  const shouldSkipRedelivery =
    !options.forceRedelivery &&
    progress.status === 'completed' &&
    progress.email_stage !== 'pending' &&
    Boolean(progress.result_opened_at)
  const callbackData =
    ctx.callbackQuery && 'data' in ctx.callbackQuery && typeof ctx.callbackQuery.data === 'string'
      ? ctx.callbackQuery.data.trim()
      : ''
  const trigger =
    options.trigger ??
    (callbackData || 'text_message')
  const dedupeKey = `${userId}:S3_TEST_RESULT:result_sequence`

  console.info('[RESULT_FLOW]', {
    step: shouldSkipRedelivery
      ? 'post_email_sequence_skipped_duplicate'
      : 'post_email_sequence_dispatching',
    userId,
    chatId: String(chatId),
    resultKey,
    emailStage: progress.email_stage,
    resultOpenedAt: progress.result_opened_at,
    forceRedelivery: options.forceRedelivery ?? false,
    trigger,
  })
  console.info('[AB_TEST_S3_TRACE]', {
    userId,
    updateId: ctx.update?.update_id ?? null,
    currentState: progress.stage,
    trigger,
    sender: 'renderAbTestPostEmailSubmitSequence',
    messageType: 'result_sequence',
    orderReference: null,
    sessionId: null,
    dedupeKey,
    deliveryResult: shouldSkipRedelivery ? 'skipped_duplicate' : 'dispatching',
  })

  if (shouldSkipRedelivery) {
    return
  }

  const deliveryClaim = await withRuntimeAdvisoryLock({
    scope: 'ab_test_delivery',
    type: 'S3_TEST_RESULT',
    source: 'telegram',
    userId,
    state: 'S3_TEST_RESULT',
  }, async () => {
    const persistedProgress = await loadAbTestProgress(userId)
    if (persistedProgress.result_opened_at) {
      return {
        outcome: 'duplicate' as const,
        progress: persistedProgress,
      }
    }

    const nextProgress = buildAbTestProgressPatch(persistedProgress, {
      result_opened_at: new Date().toISOString(),
      last_event_at: new Date().toISOString(),
    })
    const scheduledProgress = await scheduleFollowups(
      userId,
      nextProgress,
      'S4_FOCUS_INVITE'
    )
    const savedProgress = await saveAbTestProgress(userId, scheduledProgress)

    return {
      outcome: 'claimed' as const,
      progress: savedProgress,
    }
  })

  if (!deliveryClaim.acquired) {
    console.info('[RESULT_FLOW]', {
      step: 'post_email_sequence_race_condition_skipped',
      userId,
      chatId: String(chatId),
      resultKey,
    })
    console.info('[AB_TEST_S3_TRACE]', {
      userId,
      updateId: ctx.update?.update_id ?? null,
      currentState: progress.stage,
      trigger,
      sender: 'renderAbTestPostEmailSubmitSequence',
      messageType: 'result_sequence',
      orderReference: null,
      sessionId: null,
      dedupeKey,
      deliveryResult: 'skipped_race_condition',
    })
    return
  }

  if (deliveryClaim.value.outcome === 'duplicate') {
    console.info('[RESULT_FLOW]', {
      step: 'post_email_sequence_skipped_duplicate',
      userId,
      chatId: String(chatId),
      resultKey,
    })
    console.info('[AB_TEST_S3_TRACE]', {
      userId,
      updateId: ctx.update?.update_id ?? null,
      currentState: deliveryClaim.value.progress.stage,
      trigger,
      sender: 'renderAbTestPostEmailSubmitSequence',
      messageType: 'result_sequence',
      orderReference: null,
      sessionId: null,
      dedupeKey,
      deliveryResult: 'skipped_duplicate',
    })
    return
  }

  if (deliveryClaim.value.outcome === 'claimed') {
    await trackAbTestEvent({
      userId,
      type: 'RESULT_OPENED',
      state: 'S3_TEST_RESULT',
      payload: {
        result_key: resultKey,
        delivery_source: options.forceRedelivery ? 'forced_redelivery' : 'post_email',
      } satisfies Prisma.JsonObject,
    })
  }

  await dispatchAbTestResultSequence(ctx, {
    chatId,
    userId,
    resultKey,
    firstName,
    deliverySource: 'post_email',
    notifyOps: options.notifyOps ?? true,
  })

  console.info('[AB_TEST_SKIP_DIRECT_RESULT_OK]', {
    userId,
    chatId: String(chatId),
    resultKey,
  })
  console.info('[AB_TEST_S3_TRACE]', {
    userId,
    updateId: ctx.update?.update_id ?? null,
    currentState: 'S3_TEST_RESULT',
    trigger,
    sender: 'renderAbTestPostEmailSubmitSequence',
    messageType: 'result_sequence',
    orderReference: null,
    sessionId: null,
    dedupeKey,
    deliveryResult: 'sent',
  })
}
