// starway-studio/packages/backend/src/api/generate.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

  field:
    | 'name'
    | 'audience'
    | 'goal'
    | 'steps'
    | 'structure'
  prompt: string
  context?: {
    name?: string
    audience?: string
    niche?: string
    goal?: string
    steps?: unknown[]
  }
}

export async function generateAI(req: AIGenerateRequest) {
  const { field, prompt, context } = req

  if (!prompt?.trim()) {
    throw new Error('Empty prompt')
  }

  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    temperature: 0.6,
    max_output_tokens: 600,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'developer',
        content: buildDeveloperPrompt(field)
      },
      {
        role: 'user',
        content: buildUserPrompt(prompt, context)
      }
    ]
  })

  const text = response.output_text?.trim()

  if (!text) {
    throw new Error('Empty AI response')
  }

  return {
    field,
    result: JSON.parse(text)
  }
}
