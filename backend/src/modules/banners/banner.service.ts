import type { Prisma } from '@starway/db/prisma-client'
import { openai } from '../../lib/openai.js'
import { prisma } from '../../db/client.js'

const SEGMENTS = ['new', 'warm', 'reactivation'] as const

type Segment = (typeof SEGMENTS)[number]

type BannerPayload = {
  headline: string
  subheadline: string
  ctaText: string
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function matchesSegment(
  segment: Segment,
  lead: { status: string; notes: string | null; source: string | null; createdAt?: Date }
): boolean {
  const notes = (lead.notes ?? '').toLowerCase()

  if (segment === 'new') {
    return !notes.includes('finished') && !notes.includes('exit') && !notes.includes('progress')
  }

  if (segment === 'warm') {
    return notes.includes('progress') || notes.includes('finished') || lead.status === 'LEAD'
  }

  return notes.includes('exit') || (lead.source ?? '').toLowerCase().includes('reactivation')
}

async function aggregateForSegment(segment: Segment, days: number): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - days * 86400000)
  const leads = await prisma.funnelLead.findMany({
    where: { createdAt: { gte: since } },
    select: {
      status: true,
      notes: true,
      source: true,
      createdAt: true,
    },
  })

  const filtered = leads.filter(lead => matchesSegment(segment, lead))
  const total = filtered.length
  const completed = filtered.filter(lead => lead.notes?.includes('finished')).length
  const exited = filtered.filter(lead => lead.notes?.includes('exit')).length
  const active = filtered.filter(lead => lead.status === 'LEAD').length

  return {
    total,
    completed,
    exited,
    active,
    segment,
    days,
  }
}

async function generateBannerForSegment(
  segment: Segment,
  data: Record<string, unknown>
): Promise<BannerPayload> {
  const segmentPrompts: Record<Segment, string> = {
    new: 'Аудиторія: нові користувачі, ще не пробували продукт.',
    warm: 'Аудиторія: переглянули лідмагніт або вже взаємодіяли, ще не купили.',
    reactivation: 'Аудиторія: були активні, але зникли або вийшли.',
  }

  const raw = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 300,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `Створи рекламний банер.
${segmentPrompts[segment]}
Дані платформи: ${JSON.stringify(data)}
Продукт: Starway — AI ментор.

JSON:
{
  "headline": "до 8 слів, конкретно, без кліше",
  "subheadline": "до 15 слів, конкретна цінність",
  "ctaText": "до 4 слів, дія"
}
Мова: українська. Без мотивації. Тільки факти і результат.`,
      },
    ],
  })

  try {
    const parsed = JSON.parse(raw.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
    return {
      headline: typeof parsed.headline === 'string' ? parsed.headline : 'Starway. Від стану до результату.',
      subheadline: typeof parsed.subheadline === 'string'
        ? parsed.subheadline
        : 'AI ментор який веде, а не мотивує.',
      ctaText: typeof parsed.ctaText === 'string' ? parsed.ctaText : 'Спробувати',
    }
  } catch {
    return {
      headline: 'Starway. Від стану до результату.',
      subheadline: 'AI ментор який веде, а не мотивує.',
      ctaText: 'Спробувати',
    }
  }
}

export async function generateBanners(period: 'weekly' | 'monthly'): Promise<void> {
  const days = period === 'weekly' ? 7 : 30

  for (const segment of SEGMENTS) {
    try {
      const data = await aggregateForSegment(segment, days)
      const banner = await generateBannerForSegment(segment, data)

      await prisma.bannerGeneration.create({
        data: {
          period,
          segment,
          headline: banner.headline,
          subheadline: banner.subheadline,
          ctaText: banner.ctaText,
          rawData: toInputJsonValue(data),
        },
      })
    } catch (error) {
      console.error(`[banner] ${segment} failed:`, error)
    }
  }
}

export const BANNER_SEGMENTS = SEGMENTS
