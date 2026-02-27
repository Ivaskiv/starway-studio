// backend/src/modules/funnel/ai.ts
import { openai } from '@/lib/openai.js';
import type { AIFunnelResult, GenerateAIFunnelInput } from './types.js';

export async function generateAIFunnel(input: GenerateAIFunnelInput): Promise<AIFunnelResult> {
  const prompt = `Ти експерт з маркетингових воронок (sales funnels).

ЗАПИТ КОРИСТУВАЧА:
${input.userPrompt}

${input.businessType ? `Тип бізнесу: ${input.businessType}` : ''}
${input.targetAudience ? `Цільова аудиторія: ${input.targetAudience}` : ''}

ЗАВДАННЯ:
Створи маркетингову воронку з 3-5 етапів.

Для кожного етапу надай:
- name: назва етапу
- action: що робить користувач
- headline: заголовок для лендінгу
- cta: текст кнопки
- emailSequence: масив з 2-3 email листів

Також запропонуй 2-3 продукти для цієї воронки (name, description, priceCents).

ФОРМАТ ВІДПОВІДІ (JSON):
{
  "concept": "Короткий опис концепції воронки",
  "stages": [
    {
      "name": "Лід-магніт",
      "action": "Підписка на email",
      "headline": "Отримайте безкоштовний гайд",
      "cta": "Завантажити зараз",
      "emailSequence": ["Email 1...", "Email 2..."]
    }
  ],
  "aiRecommendations": ["Порада 1", "Порада 2"],
  "suggestedProducts": [
    {
      "name": "Базовий курс",
      "description": "Опис",
      "priceCents": 1900
    }
  ]
}

Відповідай ТІЛЬКИ JSON, без markdown.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      concept: parsed.concept || 'Згенерована воронка',
      stages: parsed.stages || [],
      aiRecommendations: parsed.aiRecommendations || [],
      suggestedProducts: parsed.suggestedProducts || [],
    };
  } catch (error) {
    console.error('❌ AI funnel parse error:', error);

    // Fallback
    return {
      concept: input.userPrompt,
      stages: [
        {
          name: 'Лід-магніт',
          action: 'Підписка',
          headline: 'Отримайте безкоштовний ресурс',
          cta: 'Завантажити',
          emailSequence: ['Привітальний email', 'Корисний контент'],
        },
        {
          name: 'Продаж',
          action: 'Покупка',
          headline: 'Готові почати?',
          cta: 'Купити зараз',
          emailSequence: ['Презентація продукту', 'Останній шанс'],
        },
      ],
      aiRecommendations: ['Тестуйте різні заголовки', 'Додайте соціальні докази'],
      suggestedProducts: [
        {
          name: 'Базовий продукт',
          description: 'Стартовий пакет',
          priceCents: 1900,
        },
      ],
    };
  }
}
