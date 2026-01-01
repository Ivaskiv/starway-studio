// packages/backend/src/services/ai.ts

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

interface AIRequest {
  systemPrompt?: string
  userPrompt: string
  model?: string
  temperature?: number
  maxTokens?: number
}

interface PromptAnalysis {
  theme: string
  targetAudience: string
  mainProblem: string
  solution: string
  uniqueValue: string
  duration: string
  platform: string
  monetization: string
}

export async function generateWithAI(
  _field: string,
  prompt: string,
  _context?: any
): Promise<string> {
  if (!prompt?.trim()) {
    throw new Error('Prompt cannot be empty')
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const result = completion.choices[0]?.message?.content?.trim()

    if (!result) {
      throw new Error('AI returned empty response')
    }

    return result

  } catch (error: any) {
    console.error('❌ OpenAI Error:', error.message)

    if (error.status === 401) {
      throw new Error('Invalid OPENAI_API_KEY')
    }
    if (error.status === 429) {
      throw new Error('Rate limit exceeded')
    }

    throw new Error(`AI generation failed: ${error.message}`)
  }
}

export async function generateWithCustomPrompt(request: AIRequest): Promise<string> {
  if (!request.userPrompt?.trim()) {
    throw new Error('User prompt cannot be empty')
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      })
    }

    messages.push({
      role: 'user',
      content: request.userPrompt
    })

    const completion = await openai.chat.completions.create({
      model: request.model || 'gpt-4o',
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
      messages
    })

    const result = completion.choices[0]?.message?.content?.trim()

    if (!result) {
      throw new Error('AI returned empty response')
    }

    return result

  } catch (error: any) {
    console.error('❌ OpenAI Error:', error.message)
    throw new Error(`AI generation failed: ${error.message}`)
  }
}

// ============ НОВІ ФУНКЦІЇ ДЛЯ AI ВОРОНКИ ============

export async function analyzeUserPrompt(userPrompt: string): Promise<PromptAnalysis> {
  const systemPrompt = `Ти AI-аналітик маркетингових воронок. Проаналізуй промпт користувача і витягни ключову інформацію.

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

ВАЖЛИВО: відповідь має бути ТІЛЬКИ JSON, без будь-якого іншого тексту.`

  try {
    const result = await generateWithCustomPrompt({
      systemPrompt,
      userPrompt,
      temperature: 0.3, // Нижча температура для більш точного аналізу
      maxTokens: 500
    })

    // Очищаємо відповідь від можливих markdown блоків
    const cleanedResult = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const analysis = JSON.parse(cleanedResult)
    
    console.log('✅ Prompt analyzed:', analysis)
    return analysis

  } catch (error: any) {
    console.error('❌ Analyze prompt error:', error)
    throw new Error(`Failed to analyze prompt: ${error.message}`)
  }
}

export async function generateFunnelStepVariants(
  stepNumber: number,
  stepTitle: string,
  stepDescription: string,
  analysis: PromptAnalysis
): Promise<string[]> {
  const systemPrompt = `Ти AI-генератор контенту для маркетингових воронок на українській мові.

Згенеруй 3 РІЗНИХ варіанти для кроку "${stepTitle}" на основі аналізу воронки користувача.

Контекст воронки:
- Тема: ${analysis.theme}
- Аудиторія: ${analysis.targetAudience}
- Проблема: ${analysis.mainProblem}
- Рішення: ${analysis.solution}
- Унікальність: ${analysis.uniqueValue}
- Тривалість: ${analysis.duration}
- Платформа: ${analysis.platform}
- Монетизація: ${analysis.monetization}

Поверни ТІЛЬКИ JSON масив з 3 різними варіантами (без markdown, без пояснень):
["варіант 1", "варіант 2", "варіант 3"]

Вимоги:
- Кожен варіант має бути УНІКАЛЬНИМ і КОНКРЕТНИМ
- Варіанти повинні відповідати темі та контексту воронки
- Пиши українською мовою
- Варіанти готові до використання (без placeholder текстів)
- ТІЛЬКИ JSON масив, нічого більше`

  const userPrompt = `Крок #${stepNumber}: "${stepTitle}"
Опис: ${stepDescription}

Згенеруй 3 варіанти цього кроку для воронки "${analysis.theme}"`

  try {
    const result = await generateWithCustomPrompt({
      systemPrompt,
      userPrompt,
      temperature: 0.8, // Вища температура для креативності
      maxTokens: 400
    })

    // Очищаємо від markdown
    const cleanedResult = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const variants = JSON.parse(cleanedResult)

    if (!Array.isArray(variants) || variants.length !== 3) {
      throw new Error('Invalid variants format - expected array of 3 strings')
    }

    console.log(`✅ Generated ${variants.length} variants for step ${stepNumber}`)
    return variants

  } catch (error: any) {
    console.error(`❌ Generate variants error for step ${stepNumber}:`, error)
    
    // Fallback варіанти якщо AI не спрацював
    return [
      `Варіант 1 для ${stepTitle}: Базовий підхід на основі ${analysis.theme}`,
      `Варіант 2 для ${stepTitle}: Розширений варіант з акцентом на ${analysis.uniqueValue}`,
      `Варіант 3 для ${stepTitle}: Персоналізований підхід для ${analysis.targetAudience}`
    ]
  }
}

export async function generateProductsFromFunnel(
  funnelAnalysis: PromptAnalysis
): Promise<any[]> {
  const systemPrompt = `Ти AI-генератор продуктів для маркетингової воронки.

На основі аналізу воронки, згенеруй 3-5 продуктів (кожен продукт = окремий MiniApp).

Поверни ТІЛЬКИ JSON масив продуктів (без markdown):
[
  {
    "id": "унікальний id",
    "name": "назва продукту",
    "description": "короткий опис (1-2 речення)",
    "price": число в євро,
    "type": "course/consultation/template/subscription/miniapp",
    "features": ["feature 1", "feature 2", "feature 3"]
  }
]

Продукти мають відповідати темі воронки та бути логічно пов'язані між собою.`

  const userPrompt = `Воронка: ${funnelAnalysis.theme}
Аудиторія: ${funnelAnalysis.targetAudience}
Рішення: ${funnelAnalysis.solution}
Монетизація: ${funnelAnalysis.monetization}

Згенеруй 3-5 продуктів для цієї воронки.`

  try {
    const result = await generateWithCustomPrompt({
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 1000
    })

    const cleanedResult = result
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    const products = JSON.parse(cleanedResult)

    if (!Array.isArray(products)) {
      throw new Error('Invalid products format')
    }

    console.log(`✅ Generated ${products.length} products`)
    return products

  } catch (error: any) {
    console.error('❌ Generate products error:', error)
    throw new Error(`Failed to generate products: ${error.message}`)
  }
}