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
import { RESULT_ZOOM_BOOKING_INTENT, interpolateFirstNameInBlocks, sendTypingBeforeBlocks } from './view-formatting.js'
import { sendTelegramContentChunk } from './view-delivery.js'

async function sendAbTestDeliveryTelemetry(input: {
  userId: string
  resultKey: AbTestResultKey
  messageKey: string
  deliverySource: 'post_email' | 'show_result'
}): Promise<void> {
  await sendOpsTelegramMessage(
    [
      'AB test result delivered',
      `userId: ${input.userId}`,
      `result: ${input.resultKey}`,
      `messageKey: ${input.messageKey}`,
      `source: ${input.deliverySource}`,
      'blocks: intro, voice, practice, review, pricing, cta',
    ].join('\n'),
    undefined,
    {
      messageType: 'ab_test_result_delivered',
      source: 'sendAbTestDeliveryTelemetry',
    }
  ).catch(() => false)

  const coachChatId = String(
    process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? ''
  ).trim()
  if (!coachChatId) return

  const analyticsText = [
    '📊 AB mentor analytics',
    `userId: ${input.userId}`,
    `result: ${input.resultKey}`,
    `messageKey: ${input.messageKey}`,
    `source: ${input.deliverySource}`,
  ].join('\n')

  console.info(
    `[OPS_ROUTE_DEBUG] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`
  )
  await coachBot.telegram
    .sendMessage(coachChatId, analyticsText)
    .then(() => {
      console.info(
        `[OPS_ROUTE_OK] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`
      )
    })
    .catch((error) => {
      console.error(
        `[OPS_ROUTE_ERROR] messageType=ab_mentor_analytics chatId=${coachChatId} source=sendAbTestDeliveryTelemetry bot=coachBot`,
        error
      )
    })
}

export async function dispatchAbTestResultSequence(
  ctx: Context,
  input: {
    chatId: string | number
    userId: string
    resultKey: AbTestResultKey
    firstName?: string | null
    deliverySource: 'post_email' | 'show_result'
    notifyOps?: boolean
  }
): Promise<void> {
  const resultDef = getAbTestResultDefinition(input.resultKey)
  const introBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.intro ?? [],
    input.firstName
  )
  const practiceBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.practice ?? [],
    input.firstName
  )
  const reviewBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.review ?? [],
    input.firstName
  )
  const pricingBlocks = interpolateFirstNameInBlocks(
    resultDef.blocks?.pricing ?? [],
    input.firstName
  )
  const [accessState, upcomingZoom] = await Promise.all([
    getUserAccessState(input.userId),
    getUpcomingZoomBookingView(input.userId),
  ])
  const previewKeyboard = buildCanonicalResultKeyboard({
    resultKey: input.resultKey,
    hasFocus: accessState.hasFocus,
    isMyBooking: upcomingZoom?.isMyBooking === true,
    zoomCalendarUrl: buildZoomCalendarUrl({ intent: RESULT_ZOOM_BOOKING_INTENT }),
  })
  console.info('[RESULT_FLOW]', {
    step: 'result_sequence_started',
    userId: input.userId ?? null,
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    deliverySource: input.deliverySource,
  })

  await sendTypingBeforeBlocks(ctx, input.chatId, introBlocks)
  await sendTelegramContentChunk(
    ctx,
    input.chatId,
    '',
    introBlocks,
    {
      parseMode: 'HTML',
      separateBlocks: true,
      pauseMsBetweenBlocks: [5000, 7000, 5000, 0],
    }
  )
  console.info('[RESULT_SENT]', {
    step: 'result_intro_sent',
    userId: input.userId ?? null,
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    deliverySource: input.deliverySource,
  })
  await sendTypingBeforeBlocks(ctx, input.chatId, [
    telegramBlock.text(AB_TEST_PRACTICE_PREVIEW_PROMPT),
  ])
  const practicePreviewMessage = await sendTelegramMessage(
    ctx,
    input.chatId,
    {
      text: AB_TEST_PRACTICE_PREVIEW_PROMPT,
      parseMode: 'HTML',
    },
    {
      replyMarkup: previewKeyboard,
    },
  )
  console.info('[PRACTICE_BUTTON_RENDERED]', {
    userId: input.userId ?? null,
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    callbackData: `show_inside_${input.resultKey.toUpperCase()}`,
    deliverySource: input.deliverySource,
    messageId:
      typeof practicePreviewMessage === 'object' &&
      practicePreviewMessage !== null &&
      'message_id' in practicePreviewMessage
        ? practicePreviewMessage.message_id
        : null,
  })

  if (input.notifyOps && input.userId) {
    await sendAbTestDeliveryTelemetry({
      userId: input.userId,
      resultKey: input.resultKey,
      messageKey: resultDef.message_key,
      deliverySource: input.deliverySource,
    }).catch(() => undefined)
  }
}
