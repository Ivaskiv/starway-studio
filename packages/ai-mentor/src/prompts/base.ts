// packages/ai-mentor/src/prompts/base.ts

import { AIFieldFocus } from '@starway-studio/shared/types/modules'

export const BASE_PROMPTS: Record<AIFieldFocus, string> = {
  name: 'Generate a clear funnel name.',
  audience: 'Describe the target audience.',
  goal: 'Generate ONE measurable goal.',
  niche: '',
  offer: '',
  content: '',
  'funnel-structure': ''
}