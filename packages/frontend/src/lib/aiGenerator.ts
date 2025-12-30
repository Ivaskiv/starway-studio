// packages/frontend/src/features/funnel/aiGenerator.ts

import { openai } from "@/utils/openai";

export async function generateFunnelStep(prompt: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // можна gpt-4 або gpt-4o-mini
    messages: [
      {
        role: "system",
        content: "Ти — експерт з AI воронок для продажу та розвитку ком’юніті."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 300
  });

  return response.choices[0]?.message?.content || "";
}
