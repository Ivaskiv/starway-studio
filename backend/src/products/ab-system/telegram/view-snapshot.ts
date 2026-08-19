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
import { RESULT_ZOOM_BOOKING_INTENT, describeInlineKeyboard } from './view-formatting.js'

export async function sendResultSnapshot(
  ctx: Context,
  input: {
    chatId: string | number
    userId: string
    resultKey: AbTestResultKey
    firstName?: string | null
  }
): Promise<void> {
  const resultDef = getAbTestResultDefinition(input.resultKey)
  const snapshotCopyByKey = {
    state: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.STATE,
    goal: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.GOAL,
    choice: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.CHOICE,
    decision: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.DECISION,
    action: absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.ACTION,
  } as const
  const snapshotCopy = snapshotCopyByKey[input.resultKey]
  const snapshotOverrides = snapshotCopy as Partial<{
    statusHeader: string
    zoomNotBookedLabel: string
    subscriptionInactiveLabel: string
    nextStepNoAccess: string
  }>
  const formatStatusLine = (line: string) =>
    snapshotOverrides.statusHeader && !line.trim().startsWith('•')
      ? `• ${line}`
      : line

  const [attendedCount, totalBookedCount, accessState, upcomingZoom] = await Promise.all([
    prisma.zoomSessionAttendee.count({
      where: { userId: input.userId, attended: true },
    }),
    prisma.zoomSessionAttendee.count({
      where: { userId: input.userId },
    }),
    getUserAccessState(input.userId),
    getUpcomingZoomBookingView(input.userId),
  ])

  const subscriptionLine = accessState.isActive
    ? absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.subscriptionActiveLabel(
        `<b>${accessState.expiresAt?.toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' }) ?? 'без кінцевої дати'}</b>`,
      )
    : snapshotOverrides.subscriptionInactiveLabel ??
      absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.subscriptionInactiveLabel

  const zoomLine =
    upcomingZoom?.isMyBooking === true
      ? `Zoom-практики: ти вже записана на ${upcomingZoom.scheduledAt.toLocaleDateString(
          'uk-UA',
          {
            day: 'numeric',
            month: 'long',
            timeZone: 'Europe/Kyiv',
          },
        )}`
      : totalBookedCount > 0
        ? absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.zoomAttendedLabel(
            attendedCount,
            totalBookedCount,
          )
        : snapshotOverrides.zoomNotBookedLabel ??
          absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.zoomNotBookedLabel

  const nextStep =
    !accessState.isActive
      ? snapshotOverrides.nextStepNoAccess ??
        absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.nextStepNoAccess
      : upcomingZoom && !upcomingZoom.isMyBooking
        ? absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.nextStepZoom(
            upcomingZoom.scheduledAt.toLocaleDateString('uk-UA', {
              day: 'numeric',
              month: 'long',
              timeZone: 'Europe/Kyiv',
            }),
          )
        : upcomingZoom?.isMyBooking
          ? absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.nextStepBooked
          : absystemContent.TELEGRAM_COPY.RESULT_SNAPSHOT.nextStepZoomGeneric

  const stateBookedFocusQuestion =
    input.resultKey === 'state' && upcomingZoom?.isMyBooking && upcomingZoom.myQuestion
      ? upcomingZoom.myQuestion.text.trim()
      : null

  const liveQuestionLines =
    stateBookedFocusQuestion
      ? [
          '',
          '<b>Поточне питання:</b>',
          '',
          `«${stateBookedFocusQuestion}»`,
        ]
      : []

  const keyboardState = {
    resultKey: input.resultKey,
    hasFocus: accessState.hasFocus,
    isMyBooking: upcomingZoom?.isMyBooking === true,
    zoomCalendarUrl: buildZoomCalendarUrl({ intent: RESULT_ZOOM_BOOKING_INTENT }),
  } as const
  const replyMarkup = buildCanonicalResultKeyboard(keyboardState)
  const actionPolicy = resolveCanonicalResultActionPolicy(keyboardState)
  const resolvedNextStep =
    stateBookedFocusQuestion && actionPolicy?.nextStepText
      ? `<b>Наступний крок:</b> ${actionPolicy.nextStepText}`
      : nextStep
  const renderedSnapshotText = [
    snapshotCopy.title,
    '',
    snapshotCopy.quote,
    '',
    ...(snapshotOverrides.statusHeader ? [snapshotOverrides.statusHeader] : []),
    formatStatusLine(zoomLine),
    formatStatusLine(subscriptionLine),
    ...liveQuestionLines,
    '',
    resolvedNextStep,
  ].join('\n').replaceAll(' 👋', '').replaceAll('📌 ', '').replaceAll(' 👇', '')

  logger.info(`[TELEGRAM_RESULT_SNAPSHOT] ${JSON.stringify({
    chatId: String(input.chatId),
    resultKey: input.resultKey,
    keyboard: describeInlineKeyboard(replyMarkup),
    runtimeCommitSha: String(
      process.env.RENDER_GIT_COMMIT
      || process.env.COMMIT_SHA
      || process.env.VERCEL_GIT_COMMIT_SHA
      || 'unknown',
    ).trim(),
    phase: 'before_send',
  })}`)

  await sendTelegramMessage(
    ctx,
    input.chatId,
    {
      text: renderedSnapshotText,
      parseMode: 'HTML',
    },
    {
      replyMarkup: {
        inline_keyboard: replyMarkup.inline_keyboard,
      },
    },
  ).then((message) => {
    const messageId =
      typeof message === 'object' && message !== null && 'message_id' in message
        ? (message as { message_id: unknown }).message_id
        : null
    logger.info(`[TELEGRAM_RESULT_SNAPSHOT] ${JSON.stringify({
      messageId,
      chatId: String(input.chatId),
      resultKey: input.resultKey,
      phase: 'sent',
    })}`)
  }).catch((error) => {
    console.error('[sendResultSnapshot] failed', {
      userId: input.userId,
      resultKey: input.resultKey,
      error,
    })
  })
}
