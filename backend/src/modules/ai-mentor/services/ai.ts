// backend/src/modules/ai-mentor/services/ai.ts

import { openai } from '@/lib/openai.js';

export async function generateResponse(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages.map(m => ({ role: m.role as any, content: m.content }))
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('[AI] Error:', error);
    throw new Error('AI generation failed');
  }
}

export async function generateSuggestions(context: string): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Generate 3 helpful suggestions based on context. Return as JSON array.'
        },
        { role: 'user', content: context }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const response = completion.choices[0]?.message?.content || '[]';
    return JSON.parse(response);
  } catch (error) {
    console.error('[AI] Suggestions error:', error);
    return [];
  }
}