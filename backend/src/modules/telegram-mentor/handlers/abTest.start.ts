import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import {
  AB_TEST_AI_MENTOR_MENU_BUTTON_TEXT,
  AB_TEST_AI_MENTOR_MENU_TEXT,
  AB_TEST_AI_MENTOR_PLAN_BUTTON_TEXT,
  AB_TEST_CONTINUE_BUTTON_TEXT,
  AB_TEST_FOCUS_ACTIVE_MENU_TEXT,
  AB_TEST_FOCUS_AI_BUTTON_TEXT,
  AB_TEST_FOCUS_CALENDAR_BUTTON_TEXT,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_FOCUS_MENU_BUTTON_TEXT,
  AB_TEST_MAGIC_LINK_EXPIRY_TEXT,
  AB_TEST_MAGIC_LINK_INTRO_TEXT,
  AB_TEST_MY_RESULT_BUTTON_TEXT,
  AB_TEST_NEXT_ZOOM_BUTTON_TEXT,
  AB_TEST_OPEN_PLATFORM_BUTTON_TEXT,
  AB_TEST_RESTART_BUTTON_TEXT,
  AB_TEST_RETAKE_BUTTON_TEXT,
  AB_TEST_SHOW_RESULT_BUTTON_TEXT,
  AB_TEST_ZOOM_MEMBER_MENU_TEXT,
} from '@/products/ab-system/content/abTest.shared.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { buildAbsystemAiUpgradeCheckoutUrl } from '@/modules/subscriptions/payments/business.checkout.js'
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
  return `${base.replace(/\/$/, '')}/miniapp/zoom-calendar`
}

export function welcomeMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: absystemContent.START_BLOCK1.MSG1,
    buttons: [[{ text: absystemContent.START_BLOCK1.CTA1, callback_data: AB_TEST_ACTIONS.START }]],
  })
}

export function testNotStartedMessage(input: { escalated: boolean }): ReturnType<typeof withKeyboard> {
  void input
  return withKeyboard({
    text: absystemContent.START_BLOCK1.MSG3,
    buttons: [[{ text: absystemContent.START_BLOCK1.CTA1, callback_data: AB_TEST_ACTIONS.START }]],
  })
}

export function testInProgressMessage(input: { r3: boolean }): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: input.r3
      ? 'Ти зупинилась посеред тесту. Повернемось і закінчимо зараз, щоб не втрачати фокус.'
      : 'Ти вже почала тест. Продовжимо з того місця, де зупинилась?',
    buttons: [
      [{ text: AB_TEST_CONTINUE_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.RESUME }],
      [{ text: absystemContent.RESUME_FLOW.CTA_RESTART, callback_data: AB_TEST_ACTIONS.RESTART }],
    ],
  })
}

export function testDoneMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Твій <b>результат</b> готовий. Подивись висновок і переходь до наступного кроку у ФОКУС.',
    buttons: [
      [{ text: AB_TEST_SHOW_RESULT_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: AB_TEST_RESTART_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
    ],
  })
}

export function testDoneWithResultMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Ти вже пройшла тест.\n\nПодивитись результат або пройти заново?',
    buttons: [
      [{ text: AB_TEST_MY_RESULT_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: absystemContent.RESUME_FLOW.CTA_RESTART, callback_data: AB_TEST_ACTIONS.RESTART }],
    ],
  })
}

export function offerShownMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'У тебе вже є <b>результат</b> тесту.\n\nХочеш відкрити його ще раз або пройти тест заново?',
    buttons: [
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
      [{ text: AB_TEST_RETAKE_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: AB_TEST_MY_RESULT_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
    ],
  })
}

export function focusPaidMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: AB_TEST_FOCUS_ACTIVE_MENU_TEXT,
    buttons: [
      [{ text: AB_TEST_FOCUS_CALENDAR_BUTTON_TEXT, callback_data: 'focus:calendar' }],
      [{ text: AB_TEST_FOCUS_AI_BUTTON_TEXT, callback_data: 'focus:ai' }],
    ],
  })
}

export function magicLinkReadyMessage(link: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: [
      AB_TEST_MAGIC_LINK_INTRO_TEXT,
      AB_TEST_MAGIC_LINK_EXPIRY_TEXT,
    ].join('\n\n'),
    buttons: [[{ text: AB_TEST_OPEN_PLATFORM_BUTTON_TEXT, url: link }]],
  })
}

export function zoomSection(): StartMessagePayload {
  return {
    text: AB_TEST_ZOOM_MEMBER_MENU_TEXT,
    buttons: [
      [{ text: '📅 Записатись на Zoom', web_app: { url: resolveZoomBookingWebAppUrl() } }],
      [{ text: AB_TEST_NEXT_ZOOM_BUTTON_TEXT, callback_data: 'focus:next_zoom' }],
      [{ text: AB_TEST_FOCUS_MENU_BUTTON_TEXT, callback_data: 'focus:menu' }],
    ],
  }
}

export function zoomMemberMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard(zoomSection())
}

export function aiMentorMenuMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: AB_TEST_AI_MENTOR_MENU_TEXT,
    buttons: [
      [{ text: AB_TEST_AI_MENTOR_MENU_BUTTON_TEXT, callback_data: 'ai_mentor:menu' }],
      [{ text: AB_TEST_AI_MENTOR_PLAN_BUTTON_TEXT, callback_data: 'ai_mentor:plan' }],
    ],
  })
}

export function postZoom1Message(userId: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: `${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_TITLE}\n\n${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT}`,
    buttons: [
      [{ text: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_CTA, url: buildAbsystemAiUpgradeCheckoutUrl(userId) }],
      [{ text: 'Наступний Zoom', callback_data: 'focus:next_zoom' }],
    ],
  })
}

export function upsellMessage(userId: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: `${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD_TITLE}\n\n${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD}`,
    buttons: [
      [{ text: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD_CTA, url: buildAbsystemAiUpgradeCheckoutUrl(userId) }],
      [{ text: 'Наступний Zoom', callback_data: 'focus:next_zoom' }],
    ],
  })
}

export function expiredMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: absystemContent.BILLING.SUB_EXPIRED.text,
    buttons: [
      [{ text: absystemContent.BILLING.SUB_EXPIRED.cta, callback_data: 'open_focus_payment' }],
    ],
  })
}
