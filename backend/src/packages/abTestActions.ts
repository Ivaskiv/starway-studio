export const AB_TEST_ACTIONS = {
  ENTRY: 'ab_test:entry',
  START: 'ab_test:start',
  RESTORE: 'ab_test:restore',
  RESTART: 'ab_test:restart',
  INTRO: 'ab_test:intro',
  SHOW_RESULT: 'ab_test:show_result',
  MENU: 'ab_test:menu',
  SUBSCRIPTION: 'ab_test:subscription',
  FOCUS_INFO: 'ab_test:focus_info',
  FOCUS_PAY: 'open_focus_payment',
  FOCUS_ALREADY_PAID: 'resend_focus_block12',
  OPEN_FAQ: 'open_faq',
} as const

export type AbTestActionValue =
  (typeof AB_TEST_ACTIONS)[keyof typeof AB_TEST_ACTIONS]
