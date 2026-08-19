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
import { RESULT_ZOOM_BOOKING_INTENT, TELEGRAM_CONTENT_MAX_CHARS, buildPracticeBlockPausePlan, interpolateFirstNameInBlocks, packTelegramContentBlocks, pauseBetweenPracticeSections, sendTypingBeforeBlocks, sleep, splitReviewSequence, splitTelegramContentBlocks } from './view-formatting.js'
import { sendTelegramContentChunk } from './view-delivery.js'

export async function dispatchAbTestPracticeSequence(
  ctx: Context,
  input: {
    chatId: string | number
    userId: string
    resultKey: AbTestResultKey
    firstName?: string | null
  }
): Promise<void> {
  const resultDef = getAbTestResultDefinition(input.resultKey)
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
  const reviewSequence = splitReviewSequence(reviewBlocks)

  await sendTypingBeforeBlocks(ctx, input.chatId, practiceBlocks.slice(0, 1))
  await sendTelegramContentChunk(
    ctx,
    input.chatId,
    'Як це виглядає зсередини?',
    practiceBlocks,
    {
      parseMode: 'HTML',
      separateBlocks: true,
      pauseMsBetweenBlocks: buildPracticeBlockPausePlan(practiceBlocks),
    }
  )
  console.info('[FOCUS_DESCRIPTION_SENT]', {
    userId: input.userId,
    segment: input.resultKey,
    messageId: null,
    callback: `show_inside_${input.resultKey.toUpperCase()}`,
  })

  if (reviewSequence.message.length) {
    await pauseBetweenPracticeSections()
    await sendTypingBeforeBlocks(ctx, input.chatId, reviewSequence.message)
    await sendTelegramContentChunk(
      ctx,
      input.chatId,
      '',
      reviewSequence.message,
      {
        parseMode: 'HTML',
      }
    )
  }

  if (reviewSequence.screenshot.length) {
    await pauseBetweenPracticeSections()
    await sendTypingBeforeBlocks(ctx, input.chatId, reviewSequence.screenshot)
    await sendTelegramContentChunk(
      ctx,
      input.chatId,
      '',
      reviewSequence.screenshot,
      {
        parseMode: 'HTML',
      }
    )
  }

  await pauseBetweenPracticeSections()
  await sendTypingBeforeBlocks(ctx, input.chatId, pricingBlocks.slice(0, 1))
  const [accessState, upcomingZoom] = await Promise.all([
    getUserAccessState(input.userId),
    getUpcomingZoomBookingView(input.userId),
  ])
  const offerKeyboard = buildCanonicalResultKeyboard({
    resultKey: input.resultKey,
    hasFocus: accessState.hasFocus,
    isMyBooking: upcomingZoom?.isMyBooking === true,
    zoomCalendarUrl: buildZoomCalendarUrl({ intent: RESULT_ZOOM_BOOKING_INTENT }),
    includeProgramDescription: false,
  })
  await sendTelegramContentChunk(
    ctx,
    input.chatId,
    'Формат участі',
    pricingBlocks,
    {
      inlineKeyboard: offerKeyboard,
      parseMode: 'HTML',
    }
  )
  console.info('[FOCUS_OFFER_SENT]', {
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    primaryAction: accessState.hasFocus ? 'zoom_calendar' : 'open_focus_payment',
  })
}


async function sendTelegramHtmlCard(
  ctx: Context,
  transition: string,
  title: string,
  lines: string[],
  inlineKeyboard?: InlineKeyboardMarkup,
  options?: {
    separateBlocks?: boolean
  }
): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return

  const sourceBlocks = splitTelegramContentBlocks(lines)
  const chunks = options?.separateBlocks
    ? sourceBlocks.map((block) => [block])
    : packTelegramContentBlocks(sourceBlocks, TELEGRAM_CONTENT_MAX_CHARS)
  if (options?.separateBlocks) {
    for (let index = 0; index < chunks.length; index += 1) {
      if (index === 0) {
        await ctx.telegram
          .sendChatAction(chatId, 'typing')
          .catch(() => undefined)
      } else {
        await sleep(3000)
        await ctx.telegram
          .sendChatAction(chatId, 'typing')
          .catch(() => undefined)
      }
      await sendTelegramContentChunk(
        ctx,
        chatId,
        index === 0 ? title : '',
        chunks[index],
        {
          inlineKeyboard:
            index === chunks.length - 1 ? inlineKeyboard : undefined,
          parseMode: 'HTML',
          separateBlocks: true,
        }
      )
    }

    console.info('[AB_TEST_RESULT_SEND_OK]', {
      transition,
      chatId: String(chatId),
    })
    return
  }

  for (let index = 0; index < chunks.length; index += 1) {
    if (index === 0) {
      await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    } else {
      await sleep(3000)
      await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
    }
    await sendTelegramContentChunk(
      ctx,
      chatId,
      index === 0 ? title : '',
      chunks[index],
      {
        inlineKeyboard:
          index === chunks.length - 1 ? inlineKeyboard : undefined,
        parseMode: 'HTML',
      }
    )
  }

  console.info('[AB_TEST_RESULT_SEND_OK]', {
    transition,
    chatId: String(chatId),
  })
}


function normalizeResultReviewScreenshot(
  resultKey: AbTestResultKey,
  lines: string[]
): string[] {
  const screenshotKeyByResult: Record<AbTestResultKey, AbTestScreenshotKey> = {
    state: 'state_review',
    goal: 'goal_review',
    choice: 'choice_review',
    decision: 'decision_review',
    action: 'action_review_1',
  }

  const screenshotMarker = buildAbTestScreenshotMarker(
    screenshotKeyByResult[resultKey]
  )

  return lines.map((line) =>
    line.includes('📸 **[СКРІН]**') ? screenshotMarker : line
  )
}
