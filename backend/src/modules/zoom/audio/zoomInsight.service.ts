import { openai } from '../../../lib/openai.js'
import { resolveAiModel } from '../../../platform/ai.registry.js'
import { runRegisteredAiTask } from '../../../services/aiTaskRunner.service.js'
import { stableHash } from '../../../services/aiGuard.service.js'

export type ZoomTranscriptInsight = {
  summary: string
  insights: string[]
  objections: string[]
  wins: string[]
  recurringThemes: string[]
  contentIdeas: string[]
  coachReport: string
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
}

function fallbackInsight(topic: string): ZoomTranscriptInsight {
  const normalizedTopic = topic.trim() || 'Zoom'
  return {
    summary: `Транскрипт ${normalizedTopic} збережено. AI-аналіз тимчасово недоступний, але матеріал уже в бібліотеці.`,
    insights: [],
    objections: [],
    wins: [],
    recurringThemes: [],
    contentIdeas: [],
    coachReport: `Переглянь транскрипт ${normalizedTopic} і вручну підтвердь ключові теми для контенту.`,
  }
}

export async function generateZoomTranscriptInsight(input: {
  sessionId: string
  expertId: string
  topic: string
  sessionType: string
  sessionDate: string
  transcript: string
}): Promise<ZoomTranscriptInsight> {
  const prompt = `Ти аналізуєш транскрипт Zoom-сесії коуча Starway Studio.
Пиши українською. Будь конкретним. Без води. Повертай тільки JSON.

Сесія:
- session_id: ${input.sessionId}
- topic: ${JSON.stringify(input.topic)}
- session_type: ${JSON.stringify(input.sessionType)}
- session_date: ${JSON.stringify(input.sessionDate)}

Завдання:
1. Зроби короткий summary у 2 реченнях.
2. Дай 3-6 інсайтів.
3. Виділи 0-5 objections.
4. Виділи 0-5 wins.
5. Виділи 1-5 recurring themes.
6. Дай 3-8 content ideas, придатних для Telegram / Reels / stories / post.
7. Дай coachReport: 3-5 речень для коуча про що варто підсилити, повторити або дорозкрити.

Транскрипт:
${input.transcript}

JSON schema:
{
  "summary": "string",
  "insights": ["string"],
  "objections": ["string"],
  "wins": ["string"],
  "recurringThemes": ["string"],
  "contentIdeas": ["string"],
  "coachReport": "string"
}`

  const raw = await runRegisteredAiTask(
    'weekly_insight',
    {
      userId: input.expertId,
      source: 'zoom-transcript-insight',
      label: 'zoom-transcript-insight',
      payloadHash: stableHash({
        sessionId: input.sessionId,
        transcript: input.transcript,
      }),
      payload: {
        sessionId: input.sessionId,
        topic: input.topic,
        sessionType: input.sessionType,
        sessionDate: input.sessionDate,
      },
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: resolveAiModel('weekly_insight'),
        temperature: 0.35,
        max_tokens: 1400,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      })

      return JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
    },
    () => ({
      summary: '',
      insights: [],
      objections: [],
      wins: [],
      recurringThemes: [],
      contentIdeas: [],
      coachReport: '',
    }),
  )

  const summary = String(raw.summary ?? '').trim()
  const coachReport = String(raw.coachReport ?? '').trim()
  const result: ZoomTranscriptInsight = {
    summary,
    insights: asStringArray(raw.insights),
    objections: asStringArray(raw.objections),
    wins: asStringArray(raw.wins),
    recurringThemes: asStringArray(raw.recurringThemes),
    contentIdeas: asStringArray(raw.contentIdeas),
    coachReport,
  }

  if (!result.summary) {
    return fallbackInsight(input.topic)
  }

  return {
    ...result,
    coachReport: result.coachReport || fallbackInsight(input.topic).coachReport,
  }
}
