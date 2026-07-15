import type { StartContext } from './start.shared.js'
import { type StartUserSnapshot, getHoursSince } from './start.js'
import {
  type StartMessagePayload,
  aiMentorMenuMessage,
  focusPaidMessage,
  offerShownMessage,
  postZoom1Message,
  upsellMessage,
  expiredMessage,
  testDoneMessage,
  testDoneWithResultMessage,
  testInProgressMessage,
  welcomeMessage,
  testNotStartedMessage,
  zoomSection,
  zoomMemberMessage,
} from './abTest.start.js'
import { resolveTelegramProductSummary } from '../services/productSummary.service.js'

function headerSection(user: StartUserSnapshot): string | null {
  const name = (user.firstName ?? '').trim()
  if (!name) return null
  return `👋 ${name}`
}

async function resolveProductSummarySection(
  userId: string,
  lifecycleState: string,
): Promise<StartMessagePayload | null> {
  const summary = await resolveTelegramProductSummary(userId).catch((error) => {
    console.error('[HOME_SCREEN] resolveTelegramProductSummary failed', {
      userId,
      lifecycleState,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return null
  })
  const text = summary?.lines.join('\n')?.trim() ?? ''

  if (!summary || !text || !summary.reply_markup) {
    return null
  }

  const existingButtons = 'inline_keyboard' in summary.reply_markup
    ? summary.reply_markup.inline_keyboard
    : []
  const normalizedButtons = existingButtons as StartMessagePayload['buttons']

  if (lifecycleState === 'ZOOM_MEMBER') {
    const zoom = await zoomSection(userId)
    return {
      text: `${text}\n\n${zoom.text}`,
      buttons: [...normalizedButtons, ...zoom.buttons],
    }
  }

  return {
    text,
    buttons: normalizedButtons,
  }
}

async function resolveBodySection(
  user: StartUserSnapshot,
  ctx: StartContext,
): Promise<StartMessagePayload> {
  void ctx

  switch (user.lifecycleState) {
    case 'NEW_USER': {
      const payload = welcomeMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'TEST_NOT_STARTED': {
      const payload = testNotStartedMessage({ escalated: false })
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'TEST_IN_PROGRESS': {
      const hoursSince = getHoursSince(user.updatedAt)
      const hasExistingResult = Boolean(user.testResultType)
      if (hoursSince > 168) {
        const staleButtons: Array<Array<{ text: string; callback_data: string }>> = [
          [
            { text: 'Продовжити', callback_data: 'ab_test:resume' },
            { text: 'Почати заново', callback_data: 'ab_test:restart' },
          ],
        ]
        if (hasExistingResult) {
          staleButtons.push([{ text: 'Мій попередній результат', callback_data: 'ab_test:show_result' }])
        }
        return {
          text: 'Ти вже починала тест, але пройшло більше тижня.\n\nВідповіді можуть бути неактуальні.',
          buttons: staleButtons,
        }
      }
      const payload = testInProgressMessage({ r3: hoursSince > 4, hasExistingResult })
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'TEST_DONE': {
      const payload = user.testResultType ? testDoneWithResultMessage() : testDoneMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'OFFER_SHOWN': {
      const payload = offerShownMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'FOCUS_PAID': {
      const summarySection = await resolveProductSummarySection(user.id, user.lifecycleState)
      if (summarySection) return summarySection
      const payload = focusPaidMessage()
      const zoom = await zoomSection(user.id)
      return {
        text: `${payload.text}\n\n${zoom.text}`,
        buttons: [...zoom.buttons, ...payload.reply_markup.inline_keyboard],
      }
    }
    case 'ZOOM_MEMBER': {
      const summarySection = await resolveProductSummarySection(user.id, user.lifecycleState)
      if (summarySection) return summarySection
      const payload = await zoomMemberMessage(user.id)
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'POST_ZOOM_1': {
      const payload = postZoom1Message(user.id)
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'UPSELL': {
      const payload = upsellMessage(user.id)
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'EXPIRED': {
      const payload = expiredMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    default: {
      const payload = welcomeMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
  }
}

export async function buildHomeScreen(
  user: StartUserSnapshot,
  ctx: StartContext,
): Promise<{ text: string; reply_markup: { inline_keyboard: StartMessagePayload['buttons'] } }> {
  const header = headerSection(user)
  const body = await resolveBodySection(user, ctx)

  return {
    text: header ? `${header}\n\n${body.text}` : body.text,
    reply_markup: { inline_keyboard: body.buttons },
  }
}
