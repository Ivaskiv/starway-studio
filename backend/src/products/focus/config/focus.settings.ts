export const focusSettings = {
  productCode: 'focus',
  telegram: {
    runtime: 'telegram-mentor',
  },
  onboarding: {
    enabled: true,
    quizEnabled: true,
  },
  notifications: {
    enabled: true,
  },
  payments: {
    provider: 'wayforpay',
  },
  ai: {
    mentorEnabled: true,
    memoryEnabled: true,
  },
} as const
