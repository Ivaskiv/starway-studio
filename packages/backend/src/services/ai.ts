// packages/backend/src/services/ai.ts
import { AIRequest, ChatMessage, PromptAnalysis } from '../types/types.js'
import { chatCompletion } from './openai-client.js'


// ======== УНІВЕРСАЛЬНА ФУНКЦІЯ ========
export async function generateWithAI(request: AIRequest): Promise<string> {
  if (!request.user_prompt?.trim()) throw new Error('User prompt cannot be empty')

  const messages: ChatMessage[] = request.system_prompt
    ? [
        { role: 'system', content: request.system_prompt },
        { role: 'user', content: request.user_prompt }
      ]
    : [{ role: 'user', content: request.user_prompt }]

  try {
    const result = await chatCompletion({
      model: request.model || 'gpt-4o-mini',
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2000
    })

    if (!result?.trim()) throw new Error('AI returned empty response')
    return result.trim()
  } catch (err: any) {
    console.error('❌ AI generation error:', err.message)
    throw new Error(`AI generation failed: ${err.message}`)
  }
}

// ======== АНАЛІЗ ПРОМПТА ========
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

Відповідь має бути ТІЛЬКИ JSON.`

  const raw = await generateWithAI({ system_prompt, user_prompt, temperature: 0.3, maxTokens: 500 })
  const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

// ======== ГЕНЕРАЦІЯ ВАРІАНТІВ КРОКУ ========
export async function generateFunnelStepVariants(
  stepNumber: number,
  stepTitle: string,
  stepDescription: string,
  analysis: PromptAnalysis
): Promise<string[]> {
  const system_prompt = `Ти AI-генератор контенту для маркетингових воронок на українській мові.

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

Поверни ТІЛЬКИ JSON масив з 3 варіантів (без markdown, без пояснень).`

  const user_prompt = `Крок #${stepNumber}: "${stepTitle}"
Опис: ${stepDescription}

Згенеруй 3 варіанти цього кроку для воронки "${analysis.theme}"`

  try {
    const raw = await generateWithAI({ system_prompt, user_prompt, temperature: 0.8, maxTokens: 400 })
    const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim()
    const variants = JSON.parse(cleaned)
    if (!Array.isArray(variants) || variants.length !== 3)
      throw new Error('Invalid variants format - expected array of 3 strings')
    return variants
  } catch (err: any) {
    console.error(`❌ Generate variants error for step ${stepNumber}:`, err)
    // fallback
    return [
      `Варіант 1 для ${stepTitle}: Базовий підхід на основі ${analysis.theme}`,
      `Варіант 2 для ${stepTitle}: Розширений варіант з акцентом на ${analysis.uniqueValue}`,
      `Варіант 3 для ${stepTitle}: Персоналізований підхід для ${analysis.targetAudience}`
    ]
  }
}

// ======== ГЕНЕРАЦІЯ ПРОДУКТІВ ========
export async function generateProductsFromFunnel(funnelAnalysis: PromptAnalysis): Promise<any[]> {
  const system_prompt = `Ти AI-генератор продуктів для маркетингової воронки.
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
]`

  const user_prompt = `Воронка: ${funnelAnalysis.theme}
Аудиторія: ${funnelAnalysis.targetAudience}
Рішення: ${funnelAnalysis.solution}
Монетизація: ${funnelAnalysis.monetization}

Згенеруй 3-5 продуктів для цієї воронки.`

  const raw = await generateWithAI({ system_prompt, user_prompt, temperature: 0.7, maxTokens: 1000 })
  const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim()
  const products = JSON.parse(cleaned)
  if (!Array.isArray(products)) throw new Error('Invalid products format')
  return products
}
