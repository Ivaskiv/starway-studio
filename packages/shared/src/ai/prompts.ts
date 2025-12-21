 // packages/shared/src/ai/prompts.ts
 export const SYSTEM_PROMPT = `
You are an AI Funnel Architect.

Rules:
- No fluff
- No buzzwords
- No emojis
- Improve weak input silently
- Output ONLY valid JSON
`

export const FIELD_PROMPTS = {
  name: `
Generate a funnel name.
Rules:
- 5–10 words
- Clear result
Return JSON: { "name": string }
`,
  audience: `
Describe target audience:
- Age
- Pain
- Desire
- Willingness to pay
Return JSON: { "audience": string }
`,
  goal: `
Generate ONE measurable goal.
Return JSON: { "goal": string }
`,
  steps: `
Generate funnel steps.
Return JSON: { "steps": FunnelStep[] }
`
} as const


// import {
//   Sparkles,
//   Users,
//   Target,
//   Flag,
//   ListTree
// } from 'lucide-react'
// import { AIFieldConfig, AIFieldFocus } from '../types/ai';

// // ════════════════════════════════════════════════════════════
// // SYSTEM PROMPTS
// // ════════════════════════════════════════════════════════════

// export const FUNNEL_SYSTEM_PROMPT = `
// Ти — AI Funnel Orchestrator нового покоління.

// Твоя задача:
// — крок за кроком створити повністю готову AI-воронку
// — не перескакувати етапи
// — не вигадувати дані, яких немає
// — завжди працювати з поточним станом

// Ти мислиш як:
// - Product Owner
// - UX Architect
// - Behavioral Psychologist
// - Growth Marketer

// ТИ НЕ:
// — пояснюєш теорію
// — пишеш "як приклад"
// — даєш кілька варіантів без потреби

// ТИ ЗАВЖДИ:
// — даєш готовий до збереження результат
// — ведеш користувача до наступної дії
// — думаєш про конверсію
// `;

// // ✅ ПРОМПТ ДЛЯ НАЗВИ
// export function generateNamePrompt(context: { topic?: string; audience?: string }): string {
//   return `
// Ти — експерт з неймінгу продуктів.

// ${context.topic ? `Тема: ${context.topic}` : ''}
// ${context.audience ? `ЦА: ${context.audience}` : ''}

// ЗАВДАННЯ:
// Створи 3 варіанти назви для AI-воронки.

// ВИМОГИ:
// - 5-10 слів
// - Емоційна, про результат
// - Без кліше типу "Шлях до успіху"
// - Має звучати як продукт

// ПРИКЛАДИ:
// ✅ "AI-Ментор: Трансформація за 30 днів"
// ✅ "Від хаосу до системи з AI"
// ❌ "Курс по продуктивності"

// ФОРМАТ (JSON):
// {
//   "variants": ["варіант 1", "варіант 2", "варіант 3"]
// }

// ТІЛЬКИ JSON, без пояснень.
// `.trim()
// }

// // ✅ ПРОМПТ ДЛЯ АУДИТОРІЇ
// export function generateAudiencePrompt(context: { name?: string; topic?: string }): string {
//   return `
// Ти — експерт з портретів ЦА.

// ${context.name ? `Назва воронки: ${context.name}` : ''}
// ${context.topic ? `Тема: ${context.topic}` : ''}

// ЗАВДАННЯ:
// Створи 3 варіанти опису цільової аудиторії.

// СТРУКТУРА:
// - Вік + стать
// - Біль (що болить)
// - Бажання (що хоче)
// - Поведінка (де шукає рішення)
// - Готовність платити

// ПРИКЛАД:
// "Жінки 30-45 років, менеджери середньої ланки. Відчувають вигорання, хочуть балансу між роботою та життям. Читають блоги про продуктивність, готові інвестувати ₴500-3000 в рішення"

// ФОРМАТ (JSON):
// {
//   "variants": ["варіант 1", "варіант 2", "варіант 3"]
// }

// ТІЛЬКИ JSON.
// `.trim()
// }

// // ✅ ПРОМПТ ДЛЯ МЕТИ
// export function generateGoalPrompt(context: { name?: string; audience?: string }): string {
//   return `
// Ти — стратег конверсій.

// ${context.name ? `Назва: ${context.name}` : ''}
// ${context.audience ? `ЦА: ${context.audience}` : ''}

// ЗАВДАННЯ:
// Створи 3 варіанти бізнес-мети воронки.

// ВИМОГИ:
// - Конкретна дія користувача
// - Вимірювана
// - Реалістична

// ПРИКЛАДИ:
// ✅ "Купити повний курс за ₴2999"
// ✅ "Оформити підписку ₴499/міс"
// ✅ "Замовити консультацію за ₴1500"
// ❌ "Стати успішним" (нечітко)

// ФОРМАТ (JSON):
// {
//   "variants": ["варіант 1", "варіант 2", "варіант 3"]
// }

// ТІЛЬКИ JSON.
// `.trim()
// }
// // ════════════════════════════════════════════════════════════
// // FIELD-SPECIFIC PROMPTS WITH TIPS
// // ════════════════════════════════════════════════════════════


// export const AI_FIELD_CONFIGS: Record<AIFieldFocus, AIFieldConfig> = {
//   name: {
//     title: 'Назва воронки',
//     placeholder: 'Напишіть назву воронки...',
//     tips: ['Будьте конкретні', 'Коротко, але ясно'],
//     icon: Sparkles
//   },
//   audience: {
//     title: 'Цільова аудиторія',
//     placeholder: 'Опишіть вашу цільову аудиторію...',
//     tips: ['Вкажіть демографію', 'Опишіть інтереси'],
//     icon: Users
//   },
//   niche: {
//     title: 'Ніша',
//     placeholder: 'Опишіть нішу...',
//     tips: ['Конкретизуйте ринок', 'Уникайте загальних слів'],
//     icon: Target
//   },
//   goal: {
//     title: 'Мета воронки',
//     placeholder: 'Яку дію має зробити користувач?',
//     tips: ['Фокусуйтеся на результаті', 'Будьте лаконічні'],
//     icon: Flag
//   },
//   'funnel-structure': {
//     title: 'Структура воронки',
//     placeholder: 'Згенеруйте кроки для воронки...',
//     tips: ['Опишіть всі етапи', 'Будьте логічними'],
//     icon: ListTree
//   }
// }


// export function buildContextPrompt(context: {
//   name?: string
//   audience?: string
//   niche?: string
//   goal?: string
// }): string {
//   const parts: string[] = [];
  
//   if (context.name) {
//     parts.push(`Назва воронки: ${context.name}`);
//   }
  
//   if (context.audience) {
//     parts.push(`Цільова аудиторія: ${context.audience}`);
//   }
  
//   if (context.niche) {
//     parts.push(`Ніша: ${context.niche}`);
//   }
  
//   if (context.goal) {
//     parts.push(`Мета: ${context.goal}`);
//   }
  
//   return parts.length > 0 
//     ? `\n\nКОНТЕКСТ ВОРОНКИ:\n${parts.join('\n')}\n\n`
//     : '';
// }

// // ════════════════════════════════════════════════════════════
// // GENERATION PROMPT BUILDER
// // ════════════════════════════════════════════════════════════

// export function buildGenerationPrompt(
//   field: keyof typeof AI_FIELD_CONFIGS,
//   userPrompt: string,
//   context: {
//     name?: string
//     audience?: string
//     niche?: string
//     goal?: string
//   }
// ): string {
//   const config = AI_FIELD_CONFIGS[field];
//   const contextStr = buildContextPrompt(context);
  
//   return `
// ${FUNNEL_SYSTEM_PROMPT}

// ${config.systemPrompt}

// ${contextStr}

// ЗАПИТ КОРИСТУВАЧА:
// ${userPrompt}

// Виконай завдання враховуючи контекст та запит користувача.
// `.trim();
// }

// //==================================================================

// export function generateNameAudiencePrompt(topic?: string) {
//   return `
// ПОТОЧНИЙ КРОК: Формування основи AI-воронки

// Тема (якщо є): ${topic || 'не задана'}

// ЗАВДАННЯ:
// 1. Згенеруй назву AI-воронки, яка:
//    - звучить як продукт
//    - обіцяє трансформацію
//    - викликає емоційний відгук
// 2. Сформуй чіткий портрет ЦА для персоналізації контенту

// ВИМОГИ:
// - Назва: 5–10 слів
// - Без кліше
// - Орієнтація на результат

// ФОРМАТ ВІДПОВІДІ (JSON):

// {
//   "name": "",
//   "audience": {
//     "age": "",
//     "gender": "",
//     "pain": "",
//     "desire": "",
//     "behavior": "",
//     "payment_readiness": ""
//   }
// }

// Поверни ТІЛЬКИ JSON.
// `;
// }

// export function generateFunnelGoalPrompt(name: string, audience: string) {
//   return `
// Назва воронки: ${name}
// Цільова аудиторія: ${audience}

// ЗАВДАННЯ:
// Сформулюй ЧІТКУ бізнес-мету AI-воронки.

// Мета має:
// - пояснювати навіщо ця воронка існує
// - бути вимірюваною
// - підходити для аналітики та upsell

// ФОРМАТ (JSON):

// {
//   "goal": ""
// }

// Без пояснень.
// `;
// }

// export function generateFunnelStructurePrompt(context: {
//   name: string
//   audience: string
//   goal: string
//   product_type: string
// }) {
//   return `
// Ти проектуєш повну структуру AI-воронки.

// Контекст:
// Назва: ${context.name}
// Аудиторія: ${context.audience}
// Мета: ${context.goal}
// Тип продукту: ${context.product_type}

// ПРАВИЛА:
// - Воронка НЕ прив’язана до днів
// - Кількість кроків — логічна
// - До продажу має бути реальна цінність

// ФАЗИ:
// WARMUP / VALUE / ENGAGEMENT / RETENTION / BONUS / MONETIZATION

// ФОРМАТ (JSON):

// {
//   "steps": [
//     {
//       "step_id": "",
//       "phase": "",
//       "title": "",
//       "goal": "",
//       "content_type": "",
//       "description": "",
//       "psychological_triggers": [],
//       "gamification": "",
//       "cta": ""
//     }
//   ]
// }

// ТІЛЬКИ JSON.
// `;
// }

// export function generateStepContentPrompt(stepContext: {
//   funnel: string
//   step_title: string
//   phase: string
//   content_type: string
//   platform: string
// }) {
//   return `
// Контекст воронки:
// ${stepContext.funnel}

// Поточний крок:
// Назва: ${stepContext.step_title}
// Фаза: ${stepContext.phase}
// Тип контенту: ${stepContext.content_type}
// Платформа: ${stepContext.platform}

// ЗАВДАННЯ:
// Створи контент, готовий до публікації.

// ВИМОГИ:
// - Чіткий CTA
// - Людська мова
// - Без пояснень

// ФОРМАТ (JSON):

// {
//   "content": "",
//   "cta": "",
//   "psychological_triggers": [],
//   "gamification": ""
// }

// ТІЛЬКИ JSON.
// `;
// }