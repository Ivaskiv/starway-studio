// packages/buttonsRegistry.ts

// backend/src/shared/abTestActions.ts

export const AB_TEST_ACTIONS = {
  START: 'ab_test:start',
  RESUME: 'ab_test:resume',
  RESTART: 'ab_test:restart',
  INTRO: 'ab_test:intro',
  SHOW_RESULT: 'ab_test:show_result',
} as const

export const BUTTONS = {
  FUNNEL: {
    START: {
      text: 'Почати тест',
      action: AB_TEST_ACTIONS.START,
    },

    RESUME: {
      text: 'Продовжити тест',
      action: AB_TEST_ACTIONS.RESUME,
    },
  },
} as const
