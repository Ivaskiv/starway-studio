import { openai } from "@/lib/openai.js"

export async function generateWebMapAI(input: {
  wheelScores: any
  weakAreas: string[]
  year: number
}) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: 'Ти — AI-коуч. Відповідай ТІЛЬКИ JSON.',
      },
      {
        role: 'user',
        content: JSON.stringify(input),
      },
    ],
  })

  return completion.choices[0]?.message?.content ?? ''
}