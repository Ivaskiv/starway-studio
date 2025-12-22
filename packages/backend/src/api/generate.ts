// starway-studio/packages/backend/src/api/generate.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function generateWithAI(
  field: string,
  prompt: string,
  context?: any
): Promise<string> {
  if (!prompt.trim()) {
    throw new Error('Empty prompt')
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.6,
    max_tokens: 600,
    messages: [
      { role: 'system', content: 'You are a helpful AI assistant.' },
      { role: 'user', content: prompt }
    ]
  })

  const text = response.choices[0]?.message?.content
  if (!text) throw new Error('Empty AI response')

  return text
}
