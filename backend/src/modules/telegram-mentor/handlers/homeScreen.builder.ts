import type { StartContext } from './start.shared.js'
import { type StartUserSnapshot, getHoursSince } from './start.js'
import {
  type StartMessagePayload,
  expiredMessage,
  offerShownMessage,
  postZoom1Message,
  testDoneMessage,
  testDoneWithResultMessage,
  testInProgressMessage,
  upsellMessage,
  welcomeMessage,
  testNotStartedMessage,
  zoomSection,
  zoomMemberMessage,
} from './abTest.start.js'

function headerSection(user: StartUserSnapshot): string | null {
  const name = (user.firstName ?? '').trim()
  if (!name) return null
  return `👋 ${name}`
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
      return zoomSection(user.id)
    }
    case 'ZOOM_MEMBER': {
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
