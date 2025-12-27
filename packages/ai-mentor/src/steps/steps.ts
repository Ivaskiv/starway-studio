// packages/ai-mentor/src/steps/steps.ts

import { MentorStep } from '../types/mentor'

export const MENTOR_STEPS: MentorStep[] = [
  {
    id: 'name',
    field: 'name',
    title: 'Назва воронки',
    description: 'Сформуємо чітку і продаючу назву'
  },
  {
    id: 'audience',
    field: 'audience',
    title: 'Цільова аудиторія',
    description: 'Хто платить і чому'
  },
  {
    id: 'goal',
    field: 'goal',
    title: 'Мета',
    description: 'Одна конкретна мета'
  }
]
