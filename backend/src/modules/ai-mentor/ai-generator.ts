// backend/src/services/ai-generator.ts

import OpenAI from 'openai';
import { STEP_DEFINITIONS } from './ai-generator-prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface StepContext {
  [key: string]: string;
}

interface PromptAnalysis {
  theme: string;
  targetAudience: string;
  mainProblem: string;
  solution: string;
  uniqueValue: string;
  duration: string;
  platform: string;
  monetization: string;
}

/**
 * Аналіз початкового промпту користувача (для старої системи, якщо потрібно)
 */
export async function analyzeUserPrompt(user_prompt: string): Promise<PromptAnalysis> {
  const system_prompt = `Ти AI-аналітик маркетингових воронок. Проаналізуй промпт користувача і витягни ключову інформацію.

Поверни ТІЛЬКИ валідний JSON об'єкт (без markdown, без пояснень):
{
  "theme": "коротка назва теми воронки (максимум 60 символів)",
  "targetAudience": "хто цільова аудиторія",
  "mainProblem": "головна проблема, яку вирішує продукт",
  "solution": "яке рішення пропонується",
  "uniqueValue": "унікальна цінність пропозиції",
  "duration": "тривалість програми (якщо вказано, інакше 'не вказано')",
  "platform": "платформа (web/telegram/mobile або комбінація)",
  "monetization": "модель монетизації (trial/subscription/freemium/course тощо)"
}

ВАЖЛИВО: відповідь має бути ТІЛЬКИ JSON, без будь-якого іншого тексту.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: user_prompt },
      ],
    });

    const result = completion.choices[0]?.message?.content?.trim();

    if (!result) {
      throw new Error('Empty analysis response');
    }

    const cleaned = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const analysis = JSON.parse(cleaned);

    console.log('✅ Prompt analyzed:', analysis.theme);
    return analysis;
  } catch (error: any) {
    console.error('❌ Analyze prompt error:', error);

    // Fallback аналіз
    return {
      theme: 'AI-воронка на основі вашого запиту',
      targetAudience: 'Ваша цільова аудиторія',
      mainProblem: 'Проблема, яку ви вирішуєте',
      solution: 'Ваше рішення',
      uniqueValue: 'Унікальна цінність',
      duration: 'не вказано',
      platform: 'web/telegram',
      monetization: 'subscription',
    };
  }
}

/**
 * Генерація 3 варіантів для кроку воронки
 */
export async function generateFunnelStepVariants(
  stepNumber: number,
  userInput: string,
  context: StepContext,
): Promise<string[]> {
  const stepDef = STEP_DEFINITIONS[stepNumber - 1];

  if (!stepDef) {
    throw new Error(`Invalid step number: ${stepNumber}`);
  }

  const system_prompt = `Ти AI-генератор маркетингових воронок. Створюй конкретні, продаючі варіанти без абстракцій.

${stepDef.system_prompt}

ФОРМАТ ВІДПОВІДІ: JSON масив з 3 варіантами
["варіант 1", "варіант 2", "варіант 3"]

ПРАВИЛА:
- Кожен варіант УНІКАЛЬНИЙ
- Без placeholder тексту
- Конкретні дані з user input
- Українською мовою
- ТІЛЬКИ JSON масив, без markdown`;

  const contextString = Object.entries(context)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const user_prompt = `Крок ${stepNumber}: ${stepDef.title}

USER INPUT: ${userInput}

КОНТЕКСТ З ПОПЕРЕДНІХ КРОКІВ:
${contextString || 'Немає попереднього контексту'}

Згенеруй 3 різні варіанти для цього кроку.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.8,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: user_prompt },
      ],
    });

    const result = completion.choices[0]?.message?.content?.trim();

    if (!result) {
      throw new Error('Empty response from OpenAI');
    }

    // Очистка від markdown
    const cleaned = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const variants = JSON.parse(cleaned);

    if (!Array.isArray(variants) || variants.length < 3) {
      console.warn('⚠️ Invalid variants format, using fallback');
      return generateFallbackVariants(stepDef.title, userInput);
    }

    console.log(`✅ Generated ${variants.length} variants for step ${stepNumber}`);
    return variants.slice(0, 3);
  } catch (error: any) {
    console.error(`❌ Step ${stepNumber} generation error:`, error.message);
    return generateFallbackVariants(stepDef.title, userInput);
  }
}

/**
 * Генерація фінального blueprint воронки
 */
export async function generateFunnelBlueprint(stepsData: any[]) {
  const system_prompt = `Ти AI-архітектор маркетингових воронок. Створи ГОТОВУ ДО ЗАПУСКУ систему продажів.

НЕ МОТИВАЦІЯ. НЕ КУРС. СИСТЕМА ДОХОДУ.

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
    "conversion_rate": число
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

  const user_prompt = `11 КРОКІВ КОРИСТУВАЧА:
${stepsContext}

Створи ГРОШОВУ СИСТЕМУ на основі цих даних.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: user_prompt },
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

/**
 * Генерація продуктів на основі воронки (опціонально)
 */
export async function generateProductsFromFunnel(blueprint: any) {
  const system_prompt = `Ти AI-генератор продуктів для маркетингової воронки.

На основі blueprint воронки, згенеруй 3-5 MiniApps/продуктів.

ФОРМАТ: JSON масив
[
  {
    "id": "унікальний_id",
    "name": "назва продукту",
    "description": "опис (1-2 речення)",
    "price": число,
    "type": "miniapp|course|subscription",
    "features": ["feature 1", "feature 2"]
  }
]`;

  const user_prompt = `Blueprint воронки:
${JSON.stringify(blueprint, null, 2)}

Згенеруй 3-5 продуктів для цієї воронки.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: user_prompt },
      ],
    });

    const result = completion.choices[0]?.message?.content?.trim();

    if (!result) {
      throw new Error('Empty products response');
    }

    const cleaned = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const products = JSON.parse(cleaned);

    console.log(`✅ Generated ${products.length} products`);
    return products;
  } catch (error: any) {
    console.error('❌ Generate products error:', error);

    // Fallback products
    return [
      {
        id: 'trial_7d',
        name: 'Trial 7 днів',
        description: 'Безкоштовний доступ на тиждень',
        price: 0,
        type: 'miniapp',
        features: ['AI-ментор', 'Щоденні завдання', 'Базова аналітика'],
      },
      {
        id: 'subscription_month',
        name: 'Місячна підписка',
        description: 'Повний доступ на місяць',
        price: 299,
        type: 'subscription',
        features: ['Повний AI-ментор', 'Всі міні-апки', 'Детальна аналітика'],
      },
    ];
  }
}

// Fallback варіанти якщо AI не спрацював
function generateFallbackVariants(title: string, userInput: string): string[] {
  return [
    `${title}: Базовий підхід - ${userInput}`,
    `${title}: Розширений варіант з персоналізацією та AI`,
    `${title}: Автоматизований сценарій для масштабування`,
  ];
}
