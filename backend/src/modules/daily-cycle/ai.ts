// daily.telegram.ts
import type { AssistantMemory } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js';
import { openai } from '../../lib/openai.js';
import { cacheGet, cacheSet } from '../../lib/cache/index.js';
import { MODEL_FOR_TASK } from '../../lib/openaiModels.js';
import { DailyEntryForAi } from '../../modules/daily-cycle/types.js';
import { runGuardedAiTask, stableHash } from '../../services/aiGuard.service.js';

export async function generateDailyAiAnalysis(entry: DailyEntryForAi, userId?: string) {
  if (!entry.answers.length) return null;

  const prompt = `
Ти AI-наставник.
Проаналізуй відповіді користувача за день.

Відповіді користувача:
${entry.answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}
`;

  try {
    return await runGuardedAiTask(
      {
        userId: userId ?? stableHash({ answers: entry.answers }).slice(0, 16),
        source: 'daily-analysis',
        label: 'daily-analysis',
        payloadHash: stableHash({ userId, answers: entry.answers }),
        throttleMs: 10_000,
        duplicateWindowMs: 10 * 60_000,
      },
      async () => {
        const cacheKey = `daily-analysis:${stableHash({ userId, answers: entry.answers })}`
        const cached = await cacheGet<{
          analysis: string;
          microTasks: { title: string; description: string; durationDays: number }[];
        } | null>(cacheKey)
        if (cached) {
          return cached
        }

        const completion = await openai.chat.completions.create({
          model: MODEL_FOR_TASK.evening_analysis,
          temperature: 0.4,
          max_tokens: 700,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) return null;

        const parsed = JSON.parse(raw) as {
          analysis: string;
          microTasks: { title: string; description: string; durationDays: number }[];
        };
        await cacheSet(cacheKey, parsed, 3600)
        return parsed
      },
      () => null,
    )
  } catch (err) {
    console.error('❌ generateDailyAiAnalysis error:', err);
    return null;
  }
}

export async function saveMemory(
  userId: string,
  type: string,
  content: string,
): Promise<AssistantMemory> {

 return prisma.assistantMemory.create({
  data:{userId,type,content}
 })
}
