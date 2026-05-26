import { type DailyState, type VoiceEntryType } from '@starway/db/prisma-client'

import { bot } from '../../lib/telegram.js'
import { openai } from '../../lib/openai.js'
import { prisma } from '../../db/client.js'
import { requireTelegramBotConfig } from '../telegram-mentor/runtime/botConfig.js'
import { getMentorExtendedContext } from '../ai-mentor/services.js'
import { generateMicroActions, updateUserState } from '../ai-mentor/state.service.js'
import { registerStreakActivity } from '../streak/service.js'
import { createMicroTask } from '../microTask/service.js'
import { trackEvent } from '../events/service.js'
import { detectEmotion } from './emotion.engine.js'
import { getUserMemorySummary, updateImplicitMemory } from './memory.engine.js'
import type { VoiceDecision, VoiceProcessInput } from './types.js'

const FREE_DAILY_LIMIT = 2
const PAID_DAILY_LIMIT = 20

function stateLabel(state: DailyState) {
  switch (state) {
    case 'FEAR':
      return 'Страх'
    case 'TENSION':
      return 'Напруга'
    case 'STABILITY':
      return 'Стабільність'
    case 'INNER_SUPPORT':
      return 'Духовність'
    default:
      return 'Нейтрально'
  }
}

async function transcribeTelegramAudio(fileId: string, type: VoiceEntryType, mimeType?: string | null) {
  const file = await bot.telegram.getFile(fileId)
  if (!file.file_path) {
    throw new Error('telegram_file_path_missing')
  }

  const token = requireTelegramBotConfig('voice transcription').token

  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`)
  if (!response.ok) {
    throw new Error('telegram_file_download_failed')
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const audioFile = new File(
    [buffer],
    type === 'TELEGRAM_AUDIO' ? 'telegram-audio.mp3' : 'telegram-voice.ogg',
    { type: mimeType ?? (type === 'TELEGRAM_AUDIO' ? 'audio/mpeg' : 'audio/ogg') },
  )

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'gpt-4o-mini-transcribe',
    language: 'uk',
    response_format: 'text',
  })

  return String(transcription ?? '').trim()
}

async function resolvePlan(userId: string) {
  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true, firstName: true, lastName: true },
    }),
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
  ])

  const now = new Date()
  const hasPaid = subscription?.status === 'ACTIVE' && (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)
  const hasTrial = subscription?.status === 'TRIAL' && (!subscription.trialEndsAt || subscription.trialEndsAt > now)

  return {
    expertId: user?.expertId ?? null,
    firstName: user?.firstName ?? user?.firstName ?? 'Привіт',
    deepMode: hasPaid || hasTrial,
    dailyLimit: hasPaid || hasTrial ? PAID_DAILY_LIMIT : FREE_DAILY_LIMIT,
  }
}

async function buildDecision(userId: string, transcript: string, signalState: DailyState): Promise<VoiceDecision> {
  const [context, actions, memory] = await Promise.all([
    getMentorExtendedContext(userId),
    generateMicroActions(userId),
    getUserMemorySummary(userId),
  ])

  const actionItems = actions.actions.slice(0, 2).map((item) => ({
    title: item.action,
    description: item.successCriteria || item.targetConflict || item.duration,
  }))

  const repeatedPattern = memory.dominantStates.includes(signalState)
  const interpretation = [
    context.lastState ? `Зараз у тебе проявляється стан "${stateLabel(signalState)}", він перегукується з попереднім ритмом "${context.lastState}".` : `Зараз звучить стан "${stateLabel(signalState)}".`,
    memory.triggers[0] ? `Найчастіший тригер у схожих сигналах: ${memory.triggers[0]}.` : null,
  ].filter(Boolean).join(' ')

  return {
    state: signalState,
    interpretation,
    actions: actionItems.length > 0 ? actionItems : [{ title: 'Зафіксуй один конкретний крок на сьогодні', description: 'Одна дія важливіша за ще один цикл роздумів.' }],
    paywallReason: repeatedPattern ? 'repeated_pattern' : undefined,
  }
}

function formatTelegramResponse(input: {
  decision: VoiceDecision
  intensity: number
  streak: number
  paywallText?: string | null
}) {
  const actions = input.decision.actions.map((action, index) => `${index + 1}. ${action.title}${action.description ? ` — ${action.description}` : ''}`)
  return [
    `STATE: ${stateLabel(input.decision.state)} (${input.intensity}/10)`,
    '',
    'INTERPRETATION:',
    input.decision.interpretation,
    '',
    'ACTION:',
    ...actions,
    '',
    `RHYTHM: День ${input.streak} streak. Продовж завтра без розриву.`,
    ...(input.paywallText ? ['', input.paywallText] : []),
  ].join('\n')
}

export async function processVoiceInput(input: VoiceProcessInput) {
  const plan = await resolvePlan(input.userId)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const usageToday = await prisma.voiceEntry.count({
    where: {
      userId: input.userId,
      createdAt: { gte: todayStart },
    },
  })

  if (usageToday >= plan.dailyLimit) {
    return {
      text: formatTelegramResponse({
        decision: {
          state: 'NEUTRAL',
          interpretation: 'Базовий ліміт voice-входів на сьогодні вже використано.',
          actions: [{ title: 'Повернись завтра або відкрий voice-coach режим', description: 'Глибший розбір відкривається в активному доступі ABsystem.' }],
          paywallReason: 'limit_reached',
        },
        intensity: 1,
        streak: 0,
        paywallText: 'OPTIONAL: Відкрий ABsystem voice-coach, щоб зняти денний ліміт і отримати глибший розбір.',
      }),
    }
  }

  const transcript = await transcribeTelegramAudio(input.fileId, input.type, input.mimeType)
  if (!transcript) {
    throw new Error('voice_transcription_empty')
  }

  const emotion = await detectEmotion(transcript)
  const stateUpdate = await updateUserState({
    userId: input.userId,
    source: 'voice',
    answers: {
      transcript,
      emotionState: emotion.state,
      intensity: String(emotion.intensity),
      triggers: emotion.triggers.join(', '),
    },
  })
  const memory = await updateImplicitMemory(input.userId, emotion)
  const decision = await buildDecision(input.userId, transcript, stateUpdate.currentState as DailyState)

  let createdTaskId: string | null = null
  if (plan.deepMode && decision.actions[0] && plan.expertId) {
    const dueDate = new Date()
    dueDate.setHours(23, 59, 0, 0)
    const created = await createMicroTask({
      userId: input.userId,
      expertId: plan.expertId,
      title: decision.actions[0].title,
      description: decision.actions[0].description,
      why: `Створено з voice-сигналу: ${stateLabel(emotion.state)}`,
      source: 'voice',
      priority: emotion.intensity >= 8 ? 'high' : 'medium',
      dueDate,
      daysToComplete: 1,
      aiContext: JSON.stringify({
        source: 'voice',
        transcript,
        memoryTriggers: memory.triggers,
      }),
    })
    createdTaskId = created.id
  }

  const streak = plan.expertId
    ? await registerStreakActivity(input.userId, plan.expertId, 'daily_checkin').then((item) => item.current)
    : 0

  await prisma.voiceEntry.create({
    data: {
      userId: input.userId,
      text: transcript,
      state: stateUpdate.currentState as DailyState,
      intensity: emotion.intensity,
      confidence: emotion.confidence,
      type: input.type,
      decision: {
        interpretation: decision.interpretation,
        actions: decision.actions,
        taskId: createdTaskId,
        triggers: emotion.triggers,
      },
    },
  })

  await trackEvent({
    userId: input.userId,
    type: 'telegram_voice_processed',
    source: 'telegram',
    state: stateUpdate.currentState,
    payload: {
      intensity: emotion.intensity,
      triggers: emotion.triggers,
      createdTaskId,
      transcriptLength: transcript.length,
    },
  })

  const paywallText = !plan.deepMode && (emotion.intensity >= 8 || decision.paywallReason === 'repeated_pattern')
    ? 'OPTIONAL: У voice-coach режимі ABsystem дає глибший розбір патернів і персональний план.'
    : null

  return {
    text: formatTelegramResponse({
      decision,
      intensity: emotion.intensity,
      streak,
      paywallText,
    }),
  }
}
