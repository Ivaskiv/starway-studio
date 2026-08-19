import type { Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'
import type { FounderFunnelStep, FunnelStageStat, Period, TrackingIntegrity } from './types.js'
import { getTrackingIdentity, getStringField } from './tracking.utils.js'
import { getPeriodRange, safeRate } from './shared.js'

function isLeadMagnetState(state: string | null): boolean {
  return typeof state === 'string' && state.startsWith('lm_')
}

const APP_ENTRY_EVENT_TYPES = new Set([
  'lead_entered_app',
  'miniapp_opened',
  'web_onboarding_started',
  'telegram_start',
  'web_app_opened',
])

function normalizeSourceLabel(value: string | null | undefined): string {
  const source = String(value ?? '').trim()
  return source || 'unknown'
}

function humanizeTrackingSource(value: string | null | undefined): string {
  const source = String(value ?? '').trim()
  if (!source) return 'Невідоме джерело'

  const normalized = source.toLowerCase()

  if (normalized === 'telegram-router') return 'Telegram router'
  if (normalized === 'telegram') return 'Telegram'
  if (normalized === 'miniapp') return 'Mini app'
  if (normalized === 'web') return 'Web'
  if (normalized === 'sendpulse_or_external') return 'SendPulse / external'
  if (normalized === 'lead_entered_app') return 'Вхід у продукт'
  if (normalized === 'user_inactive') return 'Неактивний користувач'

  if (/^[0-9a-f]{24,}$/.test(normalized) || /^[0-9a-f-]{32,}$/.test(normalized)) {
    return 'Лід-магніт без назви'
  }

  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
    .join(' ')
}

export const FOUNDER_FUNNEL = [
  { key: 'founder_wheel_started', label: 'Wheel started' },
  { key: 'founder_wheel_completed', label: 'Wheel completed' },
  { key: 'founder_goals_opened', label: 'Goals opened' },
  { key: 'founder_goals_edited', label: 'Goals edited' },
  { key: 'founder_goals_saved', label: 'Goals saved' },
  { key: 'founder_web_map_opened', label: 'Web Map opened' },
  { key: 'founder_web_map_first_step_completed', label: 'First step completed' },
  { key: 'founder_day_2_return', label: 'Day 2 return' },
] as const

export function getFounderHeuristic(steps: FounderFunnelStep[]) {
  const weakest = [...steps].slice(0, -1).sort((left, right) => left.conversionRate - right.conversionRate)[0]
  if (!weakest) {
    return {
      weakestPoint: 'Недостатньо даних',
      heuristic: 'Поки що замало сигналів, щоб робити висновок.',
      suggestion: 'Назбирай більше проходів через wheel → goals → web map.',
    }
  }

  if (weakest.key === 'founder_goals_saved') {
    return {
      weakestPoint: weakest.label,
      heuristic: 'Цілі виглядають занадто складними.',
      suggestion: "Додай 'Сьогоднішній крок' одразу після списку цілей.",
    }
  }

  if (weakest.key === 'founder_web_map_opened') {
    return {
      weakestPoint: weakest.label,
      heuristic: 'Немає чіткого першого кроку після goals.',
      suggestion: 'Показуй Web Map як єдиний наступний крок після збереження цілей.',
    }
  }

  if (weakest.key === 'founder_day_2_return') {
    return {
      weakestPoint: weakest.label,
      heuristic: 'Слабкий habit loop або nudges.',
      suggestion: "Підсиль 'Сьогоднішній крок' і Telegram-нагадування на другий день.",
    }
  }

  return {
    weakestPoint: weakest.label,
    heuristic: 'Користувачі гублять ритм між кроками funnel.',
    suggestion: 'Прибери зайві CTA і лиши один наступний крок у кожному етапі.',
  }
}

function buildDisconnectedTrackingIntegrity(params: {
  leadUsers: number
  appUsers: number
  matchedUsers: number
  worstSource: string | null
  sourceConversion: number
  unlinkedEvents: number
}): TrackingIntegrity {
  return {
    isDisconnected: true,
    coreProblem: 'відсутній зв’язок між lead magnet і продуктом',
    weakestStep: 'lead_magnet_to_app_entry',
    conversion: 0,
    sampleSize: params.leadUsers,
    reasons: [
      'користувачі з lead magnet не передаються в продукт',
      'немає user matching (email / utm / id)',
      'дані з різних систем не зв’язані',
    ],
    actions: [
      'передавати email або user_id при переході в продукт',
      "додати подію 'lead_entered_app'",
      'зв’язати SendPulse / Telegram / Web через єдиний user_id',
    ],
    worstSource: params.worstSource,
    sourceConversion: params.sourceConversion,
    leadUsers: params.leadUsers,
    appUsers: params.appUsers,
    matchedUsers: params.matchedUsers,
    unlinkedEvents: params.unlinkedEvents,
  }
}

export async function getTrackingIntegrity(period: Period = '30d'): Promise<TrackingIntegrity | null> {
  const { start } = getPeriodRange(period)

  const [leads, appEntryEvents] = await Promise.all([
    prisma.funnelLead.findMany({
      where: { createdAt: { gte: start } },
      select: {
        userId: true,
        source: true,
        user: {
          select: {
            id: true,
            email: true,
            telegramUserId: true,
            telegramChatId: true,
          },
        },
      },
    }),
    prisma.event.findMany({
      where: {
        createdAt: { gte: start },
        type: { in: [...APP_ENTRY_EVENT_TYPES] },
      },
      select: {
        userId: true,
        type: true,
        source: true,
        payload: true,
      },
    }),
  ])

  const leadIdentities = new Set(
    leads
      .map((lead) => {
        const leadEmail = lead.user?.email ? normalizeSourceLabel(lead.user.email).toLowerCase() : null
        return lead.userId ?? leadEmail
      })
      .filter((value): value is string => Boolean(value)),
  )
  const appIdentities = new Set(
    appEntryEvents
      .map((event) => event.userId ?? getTrackingIdentity(event.payload))
      .filter((value): value is string => Boolean(value)),
  )
  const matchedIdentities = new Set([...leadIdentities].filter((identity) => appIdentities.has(identity)))
  const unlinkedAppEntryEvents = appEntryEvents.filter((event) => !event.userId && !getTrackingIdentity(event.payload)).length

  const sourceStats = new Map<string, { leads: Set<string>; appUsers: Set<string> }>()
  for (const lead of leads) {
    const source = normalizeSourceLabel(lead.source)
    const bucket = sourceStats.get(source) ?? { leads: new Set<string>(), appUsers: new Set<string>() }
    const identity = lead.userId ?? (lead.user?.email ? normalizeSourceLabel(lead.user.email).toLowerCase() : null)
    if (identity) {
      bucket.leads.add(identity)
    }
    sourceStats.set(source, bucket)
  }
  for (const event of appEntryEvents) {
    const identity = event.userId ?? getTrackingIdentity(event.payload)
    if (!identity) continue
    for (const [source, bucket] of sourceStats.entries()) {
      if (bucket.leads.has(identity)) {
        bucket.appUsers.add(identity)
        sourceStats.set(source, bucket)
      }
    }
  }

  const rankedSources = [...sourceStats.entries()]
    .map(([source, bucket]) => ({
      source: humanizeTrackingSource(source),
      leads: bucket.leads.size,
      conversion: safeRate(bucket.appUsers.size, bucket.leads.size),
    }))
    .filter((item) => item.leads >= 10 || item.conversion < 100)
    .sort((left, right) => left.conversion - right.conversion || right.leads - left.leads)

  const worstSource = rankedSources[0] ?? null
  const disconnected = leadIdentities.size > 0 && matchedIdentities.size === 0

  if (disconnected) {
    return buildDisconnectedTrackingIntegrity({
      leadUsers: leadIdentities.size,
      appUsers: appIdentities.size,
      matchedUsers: matchedIdentities.size,
      worstSource: worstSource?.source ?? null,
      sourceConversion: worstSource?.conversion ?? 0,
      unlinkedEvents: unlinkedAppEntryEvents,
    })
  }

  if (leadIdentities.size === 0 && appIdentities.size === 0) {
    return null
  }

  const matchedRate = safeRate(matchedIdentities.size, Math.max(1, leadIdentities.size))

  return {
    isDisconnected: false,
    coreProblem: matchedIdentities.size > 0 ? 'трафік і продукт вже зв’язані' : 'немає стабільного потоку нових користувачів',
    weakestStep: matchedIdentities.size > 0 ? 'lead_magnet_to_wheel' : 'lead_magnet_to_app_entry',
    conversion: matchedRate,
    sampleSize: leadIdentities.size,
    reasons: matchedIdentities.size > 0
      ? ['є зв’язок між lead magnet і продуктом', 'дані не виглядають розірваними']
      : [
          'користувачі з lead magnet не передаються в продукт',
          'немає user matching (email / utm / id)',
          'дані з різних систем не зв’язані',
        ],
    actions: matchedIdentities.size > 0
      ? ['продовжити підсилювати наступний bottleneck', 'підняти конверсію на слабкому кроці']
      : [
          'передавати email або user_id при переході в продукт',
          "додати подію 'lead_entered_app'",
          'зв’язати SendPulse / Telegram / Web через єдиний user_id',
        ],
    worstSource: worstSource?.source ?? null,
    sourceConversion: worstSource?.conversion ?? 0,
    leadUsers: leadIdentities.size,
    appUsers: appIdentities.size,
    matchedUsers: matchedIdentities.size,
    unlinkedEvents: unlinkedAppEntryEvents,
  }
}

function hasWheelSignal(event: { type: string; payload: Prisma.JsonValue | null }): boolean {
  if (event.type.includes('wheel')) {
    return true
  }

  return getStringField(event.payload, 'productContext') === 'wheel'
}

function hasPurchaseSignal(event: { type: string; payload: Prisma.JsonValue | null }): boolean {
  return event.type.includes('purchase') || event.type.includes('subscription')
}

export function buildStageUsers(events: Array<{ userId: string | null; type: string; state: string | null; payload: Prisma.JsonValue | null }>) {
  const buckets: Record<FunnelStageStat['stage'], Set<string>> = {
    start: new Set<string>(),
    lead_magnet: new Set<string>(),
    wheel: new Set<string>(),
    trial: new Set<string>(),
    engagement: new Set<string>(),
    purchase: new Set<string>(),
  }

  for (const event of events) {
    if (!event.userId) {
      continue
    }

    if (event.type === 'telegram_start' || event.type === 'web_onboarding_started' || event.type === 'miniapp_opened') {
      buckets.start.add(event.userId)
    }

    if (isLeadMagnetState(event.state) || getStringField(event.payload, 'productContext') === 'lead_magnet') {
      buckets.lead_magnet.add(event.userId)
    }

    if (hasWheelSignal(event)) {
      buckets.wheel.add(event.userId)
    }

    if (event.state === 'in_trial' || event.type.includes('trial')) {
      buckets.trial.add(event.userId)
    }

    if (
      event.type === 'telegram_morning_completed'
      || event.type === 'telegram_evening_completed'
      || event.type === 'telegram_task_completed'
      || event.type === 'ai_reply_generated'
      || event.type.includes('engagement')
    ) {
      buckets.engagement.add(event.userId)
    }

    if (hasPurchaseSignal(event)) {
      buckets.purchase.add(event.userId)
    }
  }

  return buckets
}
