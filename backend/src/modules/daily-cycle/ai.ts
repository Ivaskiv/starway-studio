// daily.telegram.ts
import { openai } from '@/lib/openai.js';
import { DailyEntry } from '@/modules/daily-cycle/types.js';

export async function generateDailyAiAnalysis(entry: DailyEntry) {
  if (!entry.answers.length) return null;

  const prompt = `
Ти AI-наставник.
Проаналізуй відповіді користувача за день.

Відповіді користувача:
${entry.answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    return JSON.parse(raw) as {
      analysis: string;
      microTasks: { title: string; description: string; durationDays: number }[];
    };
  } catch (err) {
    console.error('❌ generateDailyAiAnalysis error:', err);
    return null;
  }
}
