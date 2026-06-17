import { absystemButtons, absystemContent } from '@/products/absystem/config/absystem.content.js'
import { AB_TEST_FOCUS_CTA_TEXT } from '@/products/ab-system/content/abTest.shared.js'
import { resolveTelegramWebappBaseUrl } from '../../../config/webapp.js'

export type StartMessagePayload = {
  text: string
  buttons: Array<Array<
    | { text: string; callback_data: string }
    | { text: string; url: string }
    | { text: string; web_app: { url: string } }
  >>
}

function withKeyboard(payload: StartMessagePayload) {
  return {
    text: payload.text,
    reply_markup: {
      inline_keyboard: payload.buttons,
    },
  }
}

function resolveZoomBookingWebAppUrl(): string {
  const configured = String(process.env.WEBAPP_URL ?? '').trim()
  const base = configured || resolveTelegramWebappBaseUrl()
  return `${base.replace(/\/$/, '')}/zoom-booking.html`
}

export function welcomeMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: absystemContent.START_BLOCK1.MSG1,
    buttons: [[{ text: 'Пройти тест', callback_data: 'ab_test:start' }]],
  })
}

export function testNotStartedMessage(input: { escalated: boolean }): ReturnType<typeof withKeyboard> {
  void input
  return withKeyboard({
    text: absystemContent.START_BLOCK1.MSG3,
    buttons: [[{ text: 'Пройти тест', callback_data: 'ab_test:start' }]],
  })
}

export function testInProgressMessage(input: { r3: boolean }): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: input.r3
      ? 'Ти зупинилась посеред тесту. Повернемось і закінчимо зараз, щоб не втрачати фокус.'
      : 'Ти вже почала тест. Продовжимо з того місця, де зупинилась?',
    buttons: [
      [{ text: 'Продовжити тест', callback_data: 'ab_test:resume' }],
      [{ text: 'Почати заново', callback_data: 'ab_test:restart' }],
    ],
  })
}

export function testDoneMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Твій <b>результат</b> готовий. Подивись висновок і переходь до наступного кроку у ФОКУС.',
    buttons: [
      [{ text: 'Показати результат', callback_data: 'ab_test:show_result' }],
      [{ text: 'Почати тест заново', callback_data: 'ab_test:restart' }],
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
    ],
  })
}

export function offerShownMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'У тебе вже є <b>результат</b> тесту.\n\nХочеш відкрити його ще раз або пройти тест заново?',
    buttons: [
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
      [{ text: 'Пройти тест заново', callback_data: 'ab_test:restart' }],
      [{ text: 'Мій результат', callback_data: 'ab_test:show_result' }],
    ],
  })
}

export function focusPaidMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Доступ до ФОКУС активний. Обери наступну дію в меню.',
    buttons: [
      [{ text: 'Календар Zoom-практик', callback_data: 'focus:calendar' }],
      [{ text: 'ABSystem AI', callback_data: 'focus:ai' }],
    ],
  })
}

export function magicLinkReadyMessage(link: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: [
      'Ось твоє магічне посилання для входу без пароля.',
      'Відкрий його на цьому або іншому пристрої — воно діє 15 хвилин.',
    ].join('\n\n'),
    buttons: [[{ text: 'Відкрити платформу', url: link }]],
  })
}

export function zoomMemberMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Ти в Zoom-групі. Ось меню та найближча Zoom-зустріч.',
    buttons: [
      [{ text: '📅 Записатись на Zoom', web_app: { url: resolveZoomBookingWebAppUrl() } }],
      [{ text: 'Наступний Zoom', callback_data: 'focus:next_zoom' }],
      [{ text: 'Меню ФОКУС', callback_data: 'focus:menu' }],
    ],
  })
}

export function aiMentorMenuMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Переходимо в AI Mentor режим. Обери, з чого почнемо.',
    buttons: [
      [{ text: 'AI Mentor меню', callback_data: 'ai_mentor:menu' }],
      [{ text: 'Мій план дій', callback_data: 'ai_mentor:plan' }],
    ],
  })
}
