import type { StartContext } from './start.shared.js'
import { type StartUserSnapshot, getHoursSince } from './start.js'
import { getTelegramAgentGateway } from '../../ai/agentGateway.js'
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

type InlineButton = StartMessagePayload['buttons'][number][number]

function stripMarkup(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function buildAiFirstButtons(user: StartUserSnapshot, fallbackButtons: StartMessagePayload['buttons']): StartMessagePayload['buttons'] {
  if (user.lifecycleState === 'NEW_USER' || user.lifecycleState === 'TEST_NOT_STARTED' || user.lifecycleState === 'TEST_IN_PROGRESS') {
    return fallbackButtons
  }

  const buttons: InlineButton[][] = [
    [{ text: '▶️ Продовжити з того місця, де ми зупинились', callback_data: 'assistant:continue' }],
    [{ text: '🗓️ Допоможи спланувати сьогодні', callback_data: 'assistant:plan_today' }],
  ]

  if (user.lifecycleState === 'FOCUS_PAID' || user.lifecycleState === 'ZOOM_MEMBER' || user.lifecycleState === 'POST_ZOOM_1' || user.lifecycleState === 'UPSELL') {
    buttons.push([{ text: '📅 Підготуй мене до наступного Zoom', callback_data: 'assistant:prepare_zoom' }])
    buttons.push([{ text: '📈 Переглянь мій прогрес', callback_data: 'assistant:review_progress' }])
  }

  buttons.push([{ text: '🤖 Поговорити з AI асистентом', callback_data: 'assistant:talk' }])
  buttons.push([{ text: '🧭 Я не знаю, що робити далі', callback_data: 'assistant:unsure' }])

  return buttons
}

function buildHomeAssistantMessage(input: {
  user: StartUserSnapshot
  fallbackText: string
}): string {
  return [
    'The user opened the Telegram bot home screen.',
    'Write one short proactive message in the user language.',
    'The message must feel personal and alive.',
    'Include: recognition, observation, one recommendation, one next step.',
    'Do not mention system internals.',
    `User lifecycle state: ${input.user.lifecycleState}.`,
    input.user.testResultType
      ? `Known test result type: ${input.user.testResultType}.`
      : 'Known test result type: none.',
    input.user.firstName
      ? `Known first name: ${input.user.firstName}.`
      : 'Known first name: unknown.',
    `Fallback factual summary: ${stripMarkup(input.fallbackText)}`,
  ].join('\n')
}

function shouldSkipAiHome(user: StartUserSnapshot): boolean {
  return user.lifecycleState === 'NEW_USER'
}

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
): Promise<{
  text: string
  reply_markup: { inline_keyboard: StartMessagePayload['buttons'] }
  parseMode?: 'HTML'
}> {
  const header = headerSection(user)
  const body = await resolveBodySection(user, ctx)
  const fallbackText = header ? `${header}\n\n${body.text}` : body.text
  const fallbackButtons = buildAiFirstButtons(user, body.buttons)

  if (!ctx.chat?.id || shouldSkipAiHome(user)) {
    return {
      text: fallbackText,
      reply_markup: { inline_keyboard: fallbackButtons },
      parseMode: 'HTML',
    }
  }

  try {
    const gatewayResult = await getTelegramAgentGateway().execute({
      bot: 'user',
      intent: 'telegram_assistant',
      chatId: String(ctx.chat.id),
      userId: user.id,
      message: buildHomeAssistantMessage({
        user,
        fallbackText,
      }),
    })

    const payload = gatewayResult.artifact.payload as {
      response?: string
      followUp?: string
    } | undefined

    const aiText = [payload?.response, payload?.followUp]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .join('\n\n')

    if (aiText.trim()) {
      return {
        text: aiText,
        reply_markup: { inline_keyboard: fallbackButtons },
      }
    }
  } catch (error) {
    console.warn('[home-screen] ai-first home fallback activated', {
      userId: user.id,
      lifecycleState: user.lifecycleState,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return {
    text: fallbackText,
    reply_markup: { inline_keyboard: fallbackButtons },
    parseMode: 'HTML',
  }
}
