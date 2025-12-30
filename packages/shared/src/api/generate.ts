import OpenAI from 'openai'
import { AIGenerateRequest } from '../ai'
import { buildMessages } from '../ai/buildPrompt'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function generateAI(data: AIGenerateRequest) {
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    temperature: 0.6,
    max_output_tokens: 600,
    messages: buildMessages(
      data.field,
      data.prompt,
      data.context
    )
  })

  return JSON.parse(response.output_text || '{}')
}
