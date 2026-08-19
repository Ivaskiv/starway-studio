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
import { renderInlineBoldMarkdown, renderTelegramContentMessage, resolveSingleMediaBlock, sendTypingBeforeBlocks, sleep } from './view-formatting.js'

export async function sendTelegramContentChunk(
  ctx: Context,
  chatId: string | number,
  title: string,
  blocks: TelegramContentBlock[],
  options?: {
    inlineKeyboard?: InlineKeyboardMarkup
    parseMode?: 'HTML' | 'Markdown'
    separateBlocks?: boolean
    pauseMsBetweenBlocks?: number[]
  }
): Promise<void> {
  const mediaBlock = resolveSingleMediaBlock(blocks)
  const renderedMediaCaption =
    mediaBlock && mediaBlock.caption
      ? renderInlineBoldMarkdown(mediaBlock.caption).trim()
      : undefined

  const renderedMessage = renderTelegramContentMessage(title, blocks).trim()

  if (!renderedMessage && !mediaBlock) {
    console.warn('[AB_TEST_EMPTY_MESSAGE_SKIPPED]', {
      title,
      blocksCount: blocks.length,
    })
    return
  }

  if (mediaBlock?.type === 'image') {
    await ctx.telegram.sendPhoto(chatId, mediaBlock.assetKey, {
      caption: renderedMediaCaption,
      parse_mode: options?.parseMode ?? 'HTML',
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  if (mediaBlock?.type === 'audio') {
    await ctx.telegram.sendVoice(chatId, mediaBlock.assetKey, {
      caption: renderedMediaCaption,
      parse_mode: options?.parseMode ?? 'HTML',
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  if (mediaBlock?.type === 'video') {
    await ctx.telegram.sendVideo(chatId, mediaBlock.assetKey, {
      caption: renderedMediaCaption,
      parse_mode: options?.parseMode ?? 'HTML',
      reply_markup: options?.inlineKeyboard,
    })
    return
  }

  const hasMedia = blocks.some(
    (block) =>
      block.type === 'image' || block.type === 'video' || block.type === 'audio'
  )
  if (hasMedia && blocks.length > 1) {
    for (let index = 0; index < blocks.length; index += 1) {
      if (index > 0 && options?.pauseMsBetweenBlocks) {
        await sleep(options.pauseMsBetweenBlocks[index - 1] ?? 0)
        await sendTypingBeforeBlocks(ctx, chatId, [blocks[index]])
      }
      await sendTelegramContentChunk(
        ctx,
        chatId,
        index === 0 ? title : '',
        [blocks[index]],
        {
          inlineKeyboard:
            index === blocks.length - 1 ? options?.inlineKeyboard : undefined,
          parseMode: options?.parseMode ?? 'HTML',
        }
      )
    }
    return
  }

  if (options?.separateBlocks && blocks.length > 1) {
    for (let index = 0; index < blocks.length; index += 1) {
      if (index > 0 && options.pauseMsBetweenBlocks) {
        await sleep(options.pauseMsBetweenBlocks[index - 1] ?? 0)
        await sendTypingBeforeBlocks(ctx, chatId, [blocks[index]])
      }
      await sendTelegramContentChunk(
        ctx,
        chatId,
        index === 0 ? title : '',
        [blocks[index]],
        {
          inlineKeyboard:
            index === blocks.length - 1 ? options.inlineKeyboard : undefined,
          parseMode: options.parseMode ?? 'HTML',
        }
      )
    }
    return
  }

  await sendTelegramMessage(
    ctx,
    chatId,
    {
      text: renderedMessage,
      parseMode: 'HTML',
    },
    {
      replyMarkup: options?.inlineKeyboard,
    },
  )
}
