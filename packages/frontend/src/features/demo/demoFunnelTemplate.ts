/** src/features/funnel/data/demoFunnelTemplate.ts */

import { FunnelStep } from "@/types";


export const DEMO_FUNNEL_STEPS: FunnelStep[] = [
  {
    id: 'step-1',
    order: 1,
    stage: 'Discovery',
    phase: 'Business',
    title: 'Ядро продукту',
    description: 'AI Mentor: стан → фокус → рефлексія',
    details: [],
    color: 'from-blue-500/20 to-blue-600/20',
    isCore: true
  },
  {
    id: 'step-2',
    order: 2,
    stage: 'Discovery',
    phase: 'Content',
    title: 'Перший досвід',
    description: 'Ранок / вечір / колесо балансу',
    details: [],
    color: 'from-green-500/20 to-green-600/20'
  },
  {
    id: 'step-3',
    order: 3,
    stage: 'Value',
    phase: 'Tech',
    title: 'Telegram як центр',
    description: 'Telegram = orchestrator, Mini Apps = інструменти',
    details: [],
    color: 'from-yellow-500/20 to-yellow-600/20'
  },
  {
    id: 'step-4',
    order: 4,
    stage: 'Value',
    phase: 'Business',
    title: '5 точок опори',
    description: 'Стабілізація стану (paid)',
    details: [],
    color: 'from-orange-500/20 to-orange-600/20'
  },
  {
    id: 'step-5',
    order: 5,
    stage: 'Habit',
    phase: 'Content',
    title: '21-денний марафон',
    description: 'Дія → рефлексія → звичка',
    details: [],
    color: 'from-purple-500/20 to-purple-600/20'
  }
]
