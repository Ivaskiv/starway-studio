// /starway-studio/packages/backend/src/services/ai.ts
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

export async function generateWithAI(
  field: string,
  prompt: string,
  context?: any
): Promise<string> {
  // Валідація
  if (!prompt?.trim()) {
    throw new Error('Prompt cannot be empty')
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  try {
    // Backend тільки проксі - промпти приходять з фронтенду
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt // Повний промпт з фронтенду
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

// Розширена версія з можливістю передачі system prompt
export async function generateWithCustomPrompt(request: AIRequest): Promise<string> {
  if (!request.userPrompt?.trim()) {
    throw new Error('User prompt cannot be empty')
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    // Додаємо system prompt якщо є
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      })
    }

    // Додаємо user prompt
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