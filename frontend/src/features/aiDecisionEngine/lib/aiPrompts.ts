// /features/aiDecisionEngine/lib/aiPrompts.ts
import { DecisionContext } from '../types';

export const buildPrompt = (source: DecisionContext['source']): string => {
  switch (source) {
    case 'questionsScheduler':
      return 'Аналіз відповіді користувача на запитання і пропозиція мікрозавдань, підтримки, upsell';
    case 'aiMentor':
      return 'Аналіз прогресу учня і рекомендації наступних кроків';
    case 'course':
      return 'Оцінка прогресу в курсі і персональні поради';
    default:
      return 'Загальний аналіз дій користувача та рекомендації';
  }
};
