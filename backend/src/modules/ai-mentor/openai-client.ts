// backend/src/services/openai-client.ts
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// Загальна обгортка для chat completions
export async function chatCompletion(params: {
  model?: string
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  temperature?: number
  max_tokens?: number
}) {
  const res = await openai.chat.completions.create({
    model: params.model || 'gpt-4o-mini',
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens ?? 500,
  })

  return res.choices[0]?.message?.content ?? ''
}

// Швидкий генератор по одному prompt (як у ai-generator)
export async function generateCompletion(prompt: string, options?: {
  model?: string
  temperature?: number
  max_tokens?: number
}) {
  const res = await openai.chat.completions.create({
    model: options?.model || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 500,
  })

  return {
    text: res.choices[0]?.message?.content || '',
    tokens_used: res.usage?.total_tokens || 0,
  }
}
