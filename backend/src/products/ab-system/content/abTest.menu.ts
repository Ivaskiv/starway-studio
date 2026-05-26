import { absystemButtons } from '@/products/absystem/config/absystem.content.js'

export const abTestMenuContent = {
  title: '',
  body: 'Повертаємось до діалогу. Обери, як тобі зручніше продовжити.',
  cta: {
    start: absystemButtons.startTest,
    restore: absystemButtons.restoreProgress,
    continue: absystemButtons.continueTest,
  },
} as const
