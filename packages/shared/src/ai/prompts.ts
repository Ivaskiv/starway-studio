 // packages/shared/src/ai/prompts.ts

import {
  Sparkles,
  Users,
  Target,
  Flag,
  ListTree
} from 'lucide-react'


export type AIFieldFocus =
  | 'name'
  | 'audience'
  | 'niche'
  | 'goal'
  | 'funnel-structure'

export interface AIFieldConfig {
  title: string
  placeholder: string
  tips: string[]
  icon: typeof Sparkles
}

// ───────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ───────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `
You are an AI Funnel Architect.

Rules:
- No fluff
- No buzzwords
- No emojis
- Improve weak input silently
- Output ONLY valid JSON
`

export const FUNNEL_SYSTEM_PROMPT = `
Ти — AI Funnel Orchestrator нового покоління.

Твоя задача:
— крок за кроком створити повністю готову AI-воронку
— не перескакувати етапи
— не вигадувати дані, яких немає
— завжди працювати з поточним станом

Ти мислиш як:
- Product Owner
- UX Architect
- Behavioral Psychologist
- Growth Marketer

ТИ НЕ:
— пояснюєш теорію
— пишеш "як приклад"
— даєш кілька варіантів без потреби

ТИ ЗАВЖДИ:
— даєш готовий до збереження результат
— ведеш користувача до наступної дії
— думаєш про конверсію
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

// ───────────────────────────────────────────────────────────────
// FIELD CONFIGS
// ───────────────────────────────────────────────────────────────

export const AI_FIELD_CONFIGS: Record<AIFieldFocus, AIFieldConfig> = {
  name: {
    title: 'Назва воронки',
    placeholder: 'Напишіть назву воронки...',
    tips: ['Будьте конкретні', 'Коротко, але ясно'],
    icon: Sparkles
  },
  audience: {
    title: 'Цільова аудиторія',
    placeholder: 'Опишіть вашу цільову аудиторію...',
    tips: ['Вкажіть демографію', 'Опишіть інтереси'],
    icon: Users
  },
  niche: {
    title: 'Ніша',
    placeholder: 'Опишіть нішу...',
    tips: ['Конкретизуйте ринок', 'Уникайте загальних слів'],
    icon: Target
  },
  goal: {
    title: 'Мета воронки',
    placeholder: 'Яку дію має зробити користувач?',
    tips: ['Фокусуйтеся на результаті', 'Будьте лаконічні'],
    icon: Flag
  },
  'funnel-structure': {
    title: 'Структура воронки',
    placeholder: 'Згенеруйте кроки для воронки...',
    tips: ['Опишіть всі етапи', 'Будьте логічними'],
    icon: ListTree
  }
}

// ───────────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ───────────────────────────────────────────────────────────────

export function buildContextPrompt(context: {
  name?: string
  audience?: string
  niche?: string
  goal?: string
}): string {
  const parts: string[] = []
  if (context.name) parts.push(`Назва воронки: ${context.name}`)
  if (context.audience) parts.push(`Цільова аудиторія: ${context.audience}`)
  if (context.niche) parts.push(`Ніша: ${context.niche}`)
  if (context.goal) parts.push(`Мета: ${context.goal}`)
  return parts.length > 0
    ? `\n\nКОНТЕКСТ ВОРОНКИ:\n${parts.join('\n')}\n\n`
    : ''
}

export function buildGenerationPrompt(
  field: keyof typeof AI_FIELD_CONFIGS,
  userPrompt: string,
  context: {
    name?: string
    audience?: string
    niche?: string
    goal?: string
  }
): string {
  const config = AI_FIELD_CONFIGS[field]
  const contextStr = buildContextPrompt(context)
  return `
${FUNNEL_SYSTEM_PROMPT}

${config.title} Prompt:

${contextStr}

ЗАПИТ КОРИСТУВАЧА:
${userPrompt}

Виконай завдання враховуючи контекст та запит користувача.
`.trim()
}

// ───────────────────────────────────────────────────────────────
// SPECIFIC PROMPTS
// ───────────────────────────────────────────────────────────────

export function generateNameAudiencePrompt(topic?: string) {
  return `
ПОТОЧНИЙ КРОК: Формування основи AI-воронки

Тема (якщо є): ${topic || 'не задана'}

ЗАВДАННЯ:
1. Згенеруй назву AI-воронки, яка:
   - звучить як продукт
   - обіцяє трансформацію
   - викликає емоційний відгук
2. Сформуй чіткий портрет ЦА для персоналізації контенту

ВИМОГИ:
- Назва: 5–10 слів
- Без кліше
- Орієнтація на результат

ФОРМАТ ВІДПОВІДІ (JSON):

{
  "name": "",
  "audience": {
    "age": "",
    "gender": "",
    "pain": "",
    "desire": "",
    "behavior": "",
    "payment_readiness": ""
  }
}

Поверни ТІЛЬКИ JSON.
`
}

export function generateFunnelGoalPrompt(name: string, audience: string) {
  return `
Назва воронки: ${name}
Цільова аудиторія: ${audience}

ЗАВДАННЯ:
Сформулюй ЧІТКУ бізнес-мету AI-воронки.

Мета має:
- пояснювати навіщо ця воронка існує
- бути вимірюваною
- підходити для аналітики та upsell

ФОРМАТ (JSON):
{
  "goal": ""
}

Без пояснень.
`
}

export function generateFunnelStructurePrompt(context: {
  name: string
  audience: string
  goal: string
  product_type: string
}) {
  return `
Ти проектуєш повну структуру AI-воронки.

Контекст:
Назва: ${context.name}
Аудиторія: ${context.audience}
Мета: ${context.goal}
Тип продукту: ${context.product_type}

ПРАВИЛА:
- Воронка НЕ прив’язана до днів
- Кількість кроків — логічна
- До продажу має бути реальна цінність

ФАЗИ:
WARMUP / VALUE / ENGAGEMENT / RETENTION / BONUS / MONETIZATION

ФОРМАТ (JSON):
{
  "steps": [
    {
      "step_id": "",
      "phase": "",
      "title": "",
      "goal": "",
      "content_type": "",
      "description": "",
      "psychological_triggers": [],
      "gamification": "",
      "cta": ""
    }
  ]
}

ТІЛЬКИ JSON.
`
}

export function generateStepContentPrompt(stepContext: {
  funnel: string
  step_title: string
  phase: string
  content_type: string
  platform: string
}) {
  return `
Контекст воронки:
${stepContext.funnel}

Поточний крок:
Назва: ${stepContext.step_title}
Фаза: ${stepContext.phase}
Тип контенту: ${stepContext.content_type}
Платформа: ${stepContext.platform}

ЗАВДАННЯ:
Створи контент, готовий до публікації.

ВИМОГИ:
- Чіткий CTA
- Людська мова
- Без пояснень

ФОРМАТ (JSON):
{
  "content": "",
  "cta": "",
  "psychological_triggers": [],
  "gamification": ""
}

ТІЛЬКИ JSON.
`
}
