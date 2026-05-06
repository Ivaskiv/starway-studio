import { openai } from "@/lib/openai.js"

export async function generateMonthlyAnalysisAI(payload: any) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1000,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: 'Ти — AI-коуч. Аналізуй прогрес. JSON only.',
      },
      {
        role: 'user',
        content: JSON.stringify(payload),
      },
    ],
  })

  return completion.choices[0]?.message?.content ?? ''
}