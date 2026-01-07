// packages/backend/src/services/ai-generator.ts

import OpenAI from 'openai';
import { SYSTEM_PROMPT, STEP_DEFINITIONS } from './ai-generator-prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface StepContext {
  [key: string]: string;
}

export async function generateFunnelStepVariants(
  stepNumber: number,
  userInput: string,
  context: StepContext
): Promise<string[]> {
  const stepDef = STEP_DEFINITIONS[stepNumber - 1];
  
  if (!stepDef) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  const contextString = Object.entries(context)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  // ✅ ПРАВИЛЬНИЙ ПРОМПТ БЕЗ TITLE
  const fullPrompt = `${SYSTEM_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

КРОК ${stepNumber} з 11

ТВОЄ ЗАВДАННЯ:
${stepDef.systemPrompt}

ТИ НЕ ПОВИНЕН:
— повторювати питання або назву кроку
— починати з шаблонів типу "Хто ти", "Я допомагаю", "Це про"
— використовувати слова: старт, масштабування, преміум, базовий, розширений
— додавати заголовки, двокрапки, категорії

ТИ МАЄШ:
— Проаналізувати відповідь користувача
— ЗАНОВО СФОРМУЛЮВАТИ її сенс
— Згенерувати 3 РІЗНІ формулювання з різних кутів мислення
— Кожен варіант = ГОТОВЕ формулювання для AI-воронки

${contextString ? `КОНТЕКСТ З ПОПЕРЕДНІХ КРОКІВ (ОБОВ'ЯЗКОВО ВРАХОВУЙ):\n${contextString}\n` : ''}

ВІДПОВІДЬ КОРИСТУВАЧА (це СИРОВИНА для переформулювання):
"${userInput}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Згенеруй 3 РІЗНІ формулювання, які передають ТОЙ САМИЙ ЗМІСТ, але з різних кутів.

ФОРМАТ ВІДПОВІДІ:
{
  "variants": ["варіант 1", "варіант 2", "варіант 3"]
}

ТІЛЬКИ JSON. БЕЗ ПОЯСНЕНЬ. БЕЗ MARKDOWN.`;

  console.log('🤖 [AI] Generating for step', stepNumber);
  console.log('📝 Input:', userInput.substring(0, 100));

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.85,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'system',
          content: 'You are a semantic reformulation engine. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: fullPrompt
        },
      ],
    });

    const result = completion.choices[0]?.message?.content?.trim();
    
    if (!result) {
      console.error('❌ Empty response');
      return generateFallbackVariants(userInput);
    }

    const parsed = JSON.parse(result);
    const variants = parsed.variants || parsed.options || [];

    if (!Array.isArray(variants) || variants.length < 3) {
      console.warn('⚠️ Invalid variants');
      return generateFallbackVariants(userInput);
    }

    console.log('✅ Generated variants:', variants.map((v, i) => `${i + 1}. ${v.substring(0, 60)}...`));
    
    return variants.slice(0, 3);

  } catch (error: any) {
    console.error('❌ Generation error:', error.message);
    return generateFallbackVariants(userInput);
  }
}

// ✅ НЕЙТРАЛЬНИЙ FALLBACK (без шаблонів)
function generateFallbackVariants(userInput: string): string[] {
  return [
    userInput,
    `Робота з людьми, які стикаються з проблемою: ${userInput.substring(0, 80)}`,
    `Система вирішення задачі: ${userInput.substring(0, 80)}`,
  ];
}

/**
 * Генерація фінального blueprint воронки
 */
export async function generateFunnelBlueprint(stepsData: any[]) {
  const systemPrompt = `Ти AI-архітектор маркетингових воронок. Створи ГОТОВУ ДО ЗАПУСКУ систему продажів.

НЕ МОТИВАЦІя. НЕ КУРС. СИСТЕМА ДОХОДУ.

Проаналізуй 11 кроків користувача і створи:
1. Тип воронки (fast_cash/diagnostic/evergreen)
2. Фінансову модель (ціль, чек, конверсія)
3. Core offer + Upsell
4. Структуру кроків
5. Автоматизацію

ФОРМАТ ВІДПОВІДІ: JSON об'єкт
{
  "name": "назва воронки",
  "type": "fast_cash|diagnostic|evergreen",
  "targetAudience": "хто купує",
  "painPoint": "біль",
  "quickWin": "швидкий результат",
  "coreOffer": {
    "name": "назва продукту",
    "price": число,
    "format": "формат"
  },
  "upsell": {
    "name": "назва апселу",
    "price": число
  },
  "financialModel": {
    "targetRevenue": число,
    "averageCheck": число,
    "requiredSales": число,
    "conversionRate": число
  },
  "automation": ["крок 1", "крок 2"],
  "steps": {
    "hook": "текст",
    "diagnostic": "текст",
    "quickWin": "текст",
    "coreOffer": "текст",
    "upsell": "текст"
  }
}`;

  const stepsContext = stepsData
    .map(s => `${s.number}. ${s.userInput} → ${s.selectedContent}`)
    .join('\n');

  const userPrompt = `11 КРОКІВ КОРИСТУВАЧА:
${stepsContext}

Створи ГРОШОВУ СИСТЕМУ на основі цих даних.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const result = completion.choices[0]?.message?.content?.trim();

    if (!result) {
      throw new Error('Empty blueprint response');
    }

    const cleaned = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const blueprint = JSON.parse(cleaned);

    console.log('✅ Blueprint generated:', blueprint.name);
    return blueprint;

  } catch (error: any) {
    console.error('❌ Blueprint generation error:', error);
    throw new Error(`Blueprint failed: ${error.message}`);
  }
}

