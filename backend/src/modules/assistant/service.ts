import { prisma } from "../../db/client.js"
import { openai } from '../../lib/openai.js'
import { buildUserProfile as buildUserProfileEngine } from './engine.js'
import { suggestNextProduct as suggestNextProductEngine } from './recommendation.js'

export async function assistantChat(userId:string,message:string){
 const [profile, nextProduct, weeklyInsight] = await Promise.all([
  buildUserProfileEngine(userId),
  suggestNextProductEngine(userId),
  generateWeeklyInsight(userId),
 ])

  return {
  message: buildAssistantMessage(message, nextProduct, weeklyInsight),
  meta:{
   userMessage:message,
   profile,
   nextProduct,
   weeklyInsight,
  }
 }
}

function buildAssistantMessage(
  message: string,
  nextProduct: { productId: string; name: string; reason: string } | null,
  weeklyInsight: Record<string, unknown>,
) {
  const normalized = message.trim().toLowerCase()
  const summary = typeof weeklyInsight.summary === 'string' ? weeklyInsight.summary : null
  const nextOffer = typeof weeklyInsight.nextOffer === 'string' ? weeklyInsight.nextOffer : null

  if (normalized.includes('наступ') || normalized.includes('далі')) {
    if (nextProduct) {
      return `Твій найкращий наступний крок зараз — ${nextProduct.name}. Якщо хочеш, я можу ще розкласти, чому саме він.`
    }

    if (summary) {
      return `Зараз я бачу таку картину: ${summary}`
    }
  }

  if (normalized.includes('контент') || normalized.includes('продаж') || normalized.includes('cta')) {
    return 'Для продажного контенту завжди тримай маршрут таким: hook → довіра → CTA → DM → bot → trial → оплата.'
  }

  if (nextOffer) {
    return `Ось що я рекомендую врахувати зараз: ${nextOffer}`
  }

  if (summary) {
    return summary
  }

  return 'Я можу підказати, що робити далі, який інструмент Starway відкрити і як зібрати контент у логіку продажу.'
}

export async function buildUserProfile(userId: string) {
  const [mentor, leads, subscription, streak, wheel] =
    await Promise.all([
      prisma.userAIMentor.findFirst({
        where: { userId },
        select: {
          currentState: true,
          stage: true,
          clarityLevel: true,
          behaviorPattern: true,
          insight: true,
          blocker: true,
          realGoal: true,
          recommendedFocus: true,
          lastAnalyzedAt: true,
        },
      }),
      prisma.funnelLead.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true, trialEndsAt: true },
      }),
      prisma.streak.findFirst({
        where: { userId },
        select: { current: true },
      }),
      prisma.wheelAssessment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ])

  const inTrial = subscription?.status === 'TRIAL'
    && Boolean(subscription.trialEndsAt && subscription.trialEndsAt.getTime() > Date.now())

  return {
    mentorState: mentor?.currentState ?? null,
    stage: mentor?.stage ?? null,
    clarity: mentor?.clarityLevel ?? null,
    pattern: mentor?.behaviorPattern ?? null,
    insight: mentor?.insight ?? null,
    blocker: mentor?.blocker ?? null,
    realGoal: mentor?.realGoal ?? null,
    focus: mentor?.recommendedFocus ?? null,
    subscribed: subscription?.status === 'ACTIVE',
    inTrial,
    streak: streak?.current ?? 0,
    hasWheel: !!wheel,
    leadCount: leads.length,
    lastAnalyzed: mentor?.lastAnalyzedAt ?? null,
  }
}

export async function suggestNextProduct(
  userId: string,
): Promise<string | null> {
  const profile = await buildUserProfile(userId)

  if (!profile.subscribed && profile.streak >= 5 && profile.streak <= 21) {
    if (profile.pattern?.includes('avoidance') || profile.stage === 'CONFLICT') {
      return '5points'
    }
    return 'trial'
  }

  if (profile.subscribed && profile.streak >= 30) {
    return 'mentorship'
  }

  if (!profile.subscribed && profile.inTrial === false && profile.streak >= 3) {
    return 'subscription'
  }

  return null
}

export async function buildUserProfileSnapshot(userId: string) {
  return buildUserProfile(userId)
}

export async function generateWeeklyInsight(userId: string) {
  const userMentor = await prisma.userAIMentor.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      context: true,
      currentState: true,
      behaviorPattern: true,
      stage: true,
      blocker: true,
    },
  })

  const context = userMentor?.context
  const stateHistory = context && typeof context === 'object' && !Array.isArray(context) && Array.isArray((context as Record<string, unknown>).stateHistory)
    ? ((context as Record<string, unknown>).stateHistory as unknown[])
    : []

  const last7States = stateHistory
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .slice(-7)
    .map(item => ({
      analyzedAt: typeof item.analyzedAt === 'string' ? item.analyzedAt : null,
      currentState: typeof item.currentState === 'string' ? item.currentState : null,
      behaviorPattern: typeof item.behaviorPattern === 'string' ? item.behaviorPattern : null,
      stage: typeof item.stage === 'string' ? item.stage : null,
    }))

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Ти — аналітичний meta-layer Starway. Поверни JSON тижневого звіту: { "summary": "string", "risk": "LOW|MEDIUM|HIGH", "pattern": "string", "nextOffer": "string" }. Тільки українська.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          currentState: userMentor?.currentState ?? null,
          behaviorPattern: userMentor?.behaviorPattern ?? null,
          stage: userMentor?.stage ?? null,
          blocker: userMentor?.blocker ?? null,
          last7States,
        }),
      },
    ],
    max_tokens: 400,
  })

  return JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
}
