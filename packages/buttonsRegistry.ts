//packages/buttonsRegistry.ts
export const UPGRADE_LINKS = {
  FOCUS_TO_AI: process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK ?? '',
}

export const BUTTONS_REGISTRY = {
  FUNNEL: {
    START_TEST: { text: 'Почати тест', action: 'START_TEST' },
    RESUME_TEST: { text: 'Продовжити тест', action: 'RESUME_TEST' },
    GET_DETAILED_RESULT: {
      text: 'Отримати детальний розбір',
      action: 'GET_FULL_RESULT',
    },
  },
  PAYMENT: {
    MONTH_1: {
      text: '💳 Оплатити 1 місяць — 780 грн',
      // FIX(18.05.2026): dynamic Focus payment buttons — Claude
      action: 'open_focus_payment:1month',
    },
    MONTH_3: {
      text: '💎 Оплатити 3 місяці — 1990 грн',
      // FIX(18.05.2026): dynamic Focus payment buttons — Claude
      action: 'open_focus_payment:3month',
    },
  },
  UPSELL: {
    GO_TO_AI: {
      text: 'Перейти в ABSystem AI',
      url: UPGRADE_LINKS.FOCUS_TO_AI,
    },
  },
  MENU: {
    MY_RESULT: { text: 'Мій результат тесту', action: 'SHOW_RESULT' },
    MY_SUBSCRIPTION: { text: 'Моя підписка', action: 'MANAGE_SUB' },
    FAQ: { text: '❓ FAQ (Часті питання)', action: 'OPEN_FAQ' },
    BACK_TO_MENU: { text: '⬅️ Назад до меню', action: 'BACK_TO_MENU' },
  },
} as const
