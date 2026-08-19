import { prisma } from '../../../db/client.js'

export type WeeklySocialProofTranscript = {
  sessionId: string | null
  scheduledAt: Date | null
  transcript: string
  transcriptLength: number
}

export type WeeklySocialProofInput = {
  userId: string
  weekStart: Date
  weekEnd: Date
  userReport: {
    summaryText: string
    topInsights: string[]
    nextWeekFocus: string
    nextWeekTasks: string[]
    completionRate: number
    streakDays: number
    growthAreas: string[]
    struggleAreas: string[]
  }
  mentorProfile: {
    behaviorPattern: string
    mainPainThisWeek: string
    emotionalTone: string
    retentionRisk: number
    retentionFactors: string[]
    churnSignals: string[]
    upsellReady: boolean
    upsellProduct: string
    upsellTiming: string
    upsellReasoning: string
    recommendedOffer: string
    systemNotes: string
  }
  zoomTranscripts: WeeklySocialProofTranscript[]
}

function compact(value: string, maxLength = 220): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

function splitSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?…])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
}

function pickStrongestQuote(transcripts: WeeklySocialProofTranscript[]): string {
  const candidates = transcripts.flatMap((item) => splitSentences(item.transcript))
  const scored = candidates
    .map((sentence) => {
      const lower = sentence.toLowerCase()
      const score =
        Math.min(sentence.length, 180) +
        (/[яіїє]|мені|мене|хочу|можу|зрозум/.test(lower) ? 20 : 0) +
        (/(нарешті|вперше|заждалась|втомилась|страшно|легше|зрушилось|вийшла|перестала)/.test(lower) ? 25 : 0)
      return { sentence, score }
    })
    .sort((left, right) => right.score - left.score)

  return scored[0]?.sentence ?? transcripts[0]?.transcript ?? ''
}

function buildSocialProofBody(params: WeeklySocialProofInput): string {
  const strongestQuote = pickStrongestQuote(params.zoomTranscripts)
  const transcriptSnippets = params.zoomTranscripts
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${compact(item.transcript, 160)}`)
  const beforeAfter = [
    `До: ${compact(params.userReport.summaryText || params.mentorProfile.mainPainThisWeek || 'контекст тижня збережено', 180)}`,
    `Після: ${compact(params.userReport.nextWeekFocus || params.mentorProfile.recommendedOffer || 'повернути ритм і рух', 180)}`,
  ]
  const wins = [
    ...params.userReport.topInsights.slice(0, 2),
    ...params.mentorProfile.retentionFactors.slice(0, 2),
    ...(params.userReport.nextWeekTasks.slice(0, 2)),
  ].filter((item) => typeof item === 'string' && item.trim())
    .map((item) => `- ${compact(item, 120)}`)

  const fomoSignals = [
    params.mentorProfile.churnSignals[0],
    params.mentorProfile.upsellReady ? `Повернення в доступ не обнуляє шлях: ${params.mentorProfile.upsellReasoning}` : null,
    `Ризик утримання: ${params.mentorProfile.retentionRisk}/10`,
  ].filter((item): item is string => Boolean(item && item.trim()))

  return [
    `SOURCE: weekly_intelligence`,
    `USER: ${params.userId}`,
    `WEEK: ${params.weekStart.toISOString().slice(0, 10)} → ${params.weekEnd.toISOString().slice(0, 10)}`,
    `SUMMARY: ${compact(params.userReport.summaryText, 260)}`,
    `STRONGEST_QUOTE: ${compact(strongestQuote, 260)}`,
    `BEFORE_AFTER:`,
    ...beforeAfter.map((line) => `- ${line}`),
    `PARTICIPANT_WINS:`,
    ...(wins.length ? wins : ['- Користувач зберіг тижневий контекст і має що розвивати далі.']),
    `FOMO_SIGNALS:`,
    ...fomoSignals.map((line) => `- ${compact(line, 160)}`),
    `TRANSCRIPT_SNIPPETS:`,
    ...(transcriptSnippets.length ? transcriptSnippets : ['- Немає доступних транскриптів для цього тижня.']),
    `RECOMMENDED_NEXT: ${compact(params.userReport.nextWeekFocus || params.mentorProfile.recommendedOffer || 'повернутися до ритму', 180)}`,
  ].join('\n')
}

async function upsertWeeklyProofContentItem(params: {
  userId: string
  topic: string
  type: string
  platform: string
  content: string
}): Promise<'created' | 'updated'> {
  const existing = await prisma.contentItem.findFirst({
    where: {
      userId: params.userId,
      topic: params.topic,
      type: params.type,
    },
    select: { id: true },
  }).catch(() => null)

  if (existing?.id) {
    await prisma.contentItem.update({
      where: { id: existing.id },
      data: {
        platform: params.platform,
        status: 'approved',
        content: params.content,
      },
    }).catch(() => undefined)
    return 'updated'
  }

  await prisma.contentItem.create({
    data: {
      userId: params.userId,
      type: params.type,
      topic: params.topic,
      platform: params.platform,
      status: 'approved',
      content: params.content,
    },
  }).catch(() => undefined)

  return 'created'
}

export async function storeWeeklySocialProofArtifacts(params: WeeklySocialProofInput): Promise<{
  created: number
  updated: number
}> {
  const topicPrefix = `weekly-proof:${params.weekStart.toISOString().slice(0, 10)}`
  const body = buildSocialProofBody(params)

  const artifactSpecs = [
    {
      type: 'reel',
      platform: 'instagram',
      topic: `${topicPrefix}:reel`,
      content: [
        'TYPE: reel',
        `TITLE: ${compact(params.userReport.topInsights[0] || params.mentorProfile.behaviorPattern || 'Transform story', 120)}`,
        `CONTENT: ${body}`,
      ].join('\n'),
    },
    {
      type: 'story',
      platform: 'instagram',
      topic: `${topicPrefix}:story`,
      content: [
        'TYPE: story',
        `TITLE: ${compact(params.userReport.topInsights[1] || params.userReport.nextWeekFocus || 'Before/After story', 120)}`,
        `CONTENT: ${body}`,
      ].join('\n'),
    },
    {
      type: 'dm',
      platform: 'telegram',
      topic: `${topicPrefix}:dm`,
      content: [
        'TYPE: dm',
        `TITLE: ${compact(params.mentorProfile.recommendedOffer || 'Focus announcement', 120)}`,
        `CONTENT: ${body}`,
      ].join('\n'),
    },
    {
      type: 'ad',
      platform: 'instagram',
      topic: `${topicPrefix}:ad`,
      content: [
        'TYPE: ad',
        `TITLE: ${compact(params.mentorProfile.mainPainThisWeek || 'Test subscriber signal', 120)}`,
        `CONTENT: ${body}`,
      ].join('\n'),
    },
    {
      type: 'weekly_plan',
      platform: 'internal',
      topic: `${topicPrefix}:weekly_plan`,
      content: [
        'TYPE: weekly_plan',
        `TITLE: Weekly content planning`,
        `CONTENT: ${body}`,
      ].join('\n'),
    },
  ]

  let created = 0
  let updated = 0

  for (const item of artifactSpecs) {
    const result = await upsertWeeklyProofContentItem({
      userId: params.userId,
      topic: item.topic,
      type: item.type,
      platform: item.platform,
      content: item.content,
    })

    if (result === 'created') {
      created += 1
    } else {
      updated += 1
    }
  }

  return { created, updated }
}
