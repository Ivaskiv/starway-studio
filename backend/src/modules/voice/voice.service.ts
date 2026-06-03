import { spawn } from 'node:child_process'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { fileURLToPath } from 'node:url'

import { type DailyState, type VoiceEntryType } from '@starway/db/prisma-client'

import { bot } from '../../lib/telegram.js'
import { openai } from '../../lib/openai.js'
import { prisma } from '../../db/client.js'
import { requireTelegramBotConfig } from '../telegram-mentor/runtime/botConfig.js'
import { getMentorExtendedContext } from '../ai-mentor/services.js'
import { generateMicroActions, updateUserState } from '../ai-mentor/state.service.js'
import { registerStreakActivity } from '../streak/service.js'
import { createMicroTask } from '../microTask/service.js'
import { detectEmotion } from './emotion.engine.js'
import { getUserMemorySummary, updateImplicitMemory } from './memory.engine.js'
import type { VoiceDecision, VoiceProcessInput } from './types.js'

const FREE_DAILY_LIMIT = 2
const PAID_DAILY_LIMIT = 20
const DEFAULT_ZOOM_AUDIO_CHUNK_SECONDS = 240
export const OPENAI_AUDIO_TRANSCRIPTION_MAX_BYTES = 25 * 1024 * 1024

export type ZoomAudioProcessingStrategy =
  | 'DIRECT_TRANSCRIPT'
  | 'NORMALIZE_TRANSCRIPT'
  | 'CHUNK_TRANSCRIPT'
  | 'COMPRESS_CHUNK_TRANSCRIPT'

export function resolveZoomAudioStrategy(sizeBytes?: number | null): ZoomAudioProcessingStrategy {
  const sizeMB = typeof sizeBytes === 'number' && Number.isFinite(sizeBytes) && sizeBytes > 0
    ? sizeBytes / (1024 * 1024)
    : null

  if (sizeMB === null) return 'NORMALIZE_TRANSCRIPT'
  if (sizeMB < 20) return 'DIRECT_TRANSCRIPT'
  if (sizeMB < 100) return 'NORMALIZE_TRANSCRIPT'
  if (sizeMB <= 220) return 'CHUNK_TRANSCRIPT'
  return 'COMPRESS_CHUNK_TRANSCRIPT'
}

export function formatZoomAudioSizeMB(sizeBytes?: number | null): number | null {
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes <= 0) return null
  return Number((sizeBytes / (1024 * 1024)).toFixed(1))
}

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

export async function transcribeTelegramAudio(
  fileId: string,
  type: VoiceEntryType,
  mimeType?: string | null,
  downloadUrl?: string | URL | null,
) {
  const cleanupTasks: Array<() => Promise<void>> = []

  try {
    const inputFile = await resolveTelegramAudioInput(fileId, type, downloadUrl, cleanupTasks)

    const transcription = await openai.audio.transcriptions.create({
      file: inputFile,
      model: 'gpt-4o-mini-transcribe',
      language: 'uk',
      response_format: 'text',
    })

    return String(transcription ?? '').trim()
  } finally {
    for (const cleanup of cleanupTasks.reverse()) {
      await cleanup().catch(() => undefined)
    }
  }
}

export async function downloadTelegramAudioSourceToTempFile(
  source: string | URL,
  fallbackFileName: string,
): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  const normalized = typeof source === 'string' ? source.trim() : source
  if (!normalized) {
    throw new Error('telegram_audio_source_missing')
  }

  if (normalized instanceof URL && normalized.protocol === 'file:') {
    return {
      filePath: fileURLToPath(normalized),
      cleanup: async () => undefined,
    }
  }

  if (typeof normalized === 'string' && normalized.startsWith('file://')) {
    return {
      filePath: fileURLToPath(new URL(normalized)),
      cleanup: async () => undefined,
    }
  }

  if (typeof normalized === 'string' && normalized.startsWith('/')) {
    return {
      filePath: normalized,
      cleanup: async () => undefined,
    }
  }

  const response = await fetch(String(normalized))
  if (!response.ok || !response.body) {
    throw new Error('telegram_file_download_failed')
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'starway-zoom-audio-'))
  const tempPath = join(tempDir, basename(fallbackFileName))
  const destination = createWriteStream(tempPath)

  const body = response.body
  const stream = body instanceof Readable ? body : Readable.fromWeb(body as NodeReadableStream)
  await pipeline(stream, destination)

  return {
    filePath: tempPath,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true })
    },
  }
}

async function resolveTelegramAudioInput(
  fileId: string,
  type: VoiceEntryType,
  downloadUrl: string | URL | null | undefined,
  cleanupTasks: Array<() => Promise<void>>,
) {
  const fileName = type === 'TELEGRAM_AUDIO' ? 'telegram-audio.mp3' : 'telegram-voice.ogg'

  if (downloadUrl) {
    return downloadTelegramAudioSource(downloadUrl, fileName, cleanupTasks)
  }

  const file = await bot.telegram.getFile(fileId)
  if (!file.file_path) {
    throw new Error('telegram_file_path_missing')
  }

  const token = requireTelegramBotConfig('voice transcription').token
  const telegramUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`
  return downloadTelegramAudioSource(telegramUrl, fileName, cleanupTasks)
}

async function downloadTelegramAudioSource(
  source: string | URL,
  fallbackFileName: string,
  cleanupTasks: Array<() => Promise<void>>,
) {
  const { filePath, cleanup } = await downloadTelegramAudioSourceToTempFile(source, fallbackFileName)
  if (cleanupTasks) cleanupTasks.push(cleanup)
  return createReadStream(filePath)
}

function getFfmpegPath(): string {
  return String(process.env.FFMPEG_PATH ?? 'ffmpeg').trim() || 'ffmpeg'
}

async function runFfmpeg(args: string[]): Promise<void> {
  const ffmpegPath = getFfmpegPath()

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    })

    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString()
    })

    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`ffmpeg_exit_${code ?? 'unknown'}:${stderr.slice(-2000)}`))
    })
  })
}

async function createZoomAudioWorkspace(prefix: string) {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  return {
    dir,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true })
    },
  }
}

export async function transcodeZoomAudioFile(inputPath: string, options: {
  outputName: string
  bitrateKbps: number
  sampleRate?: number
  channels?: number
}): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  const workspace = await createZoomAudioWorkspace('starway-zoom-transcode-')
  const outputPath = join(workspace.dir, options.outputName)

  const args = [
    '-y',
    '-i', inputPath,
    '-vn',
    '-ac', String(options.channels ?? 1),
    '-ar', String(options.sampleRate ?? 16000),
    '-b:a', `${options.bitrateKbps}k`,
    outputPath,
  ]

  await runFfmpeg(args)

  return {
    filePath: outputPath,
    cleanup: workspace.cleanup,
  }
}

export async function normalizeZoomAudioFile(inputPath: string): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  return transcodeZoomAudioFile(inputPath, {
    outputName: 'normalized.mp3',
    bitrateKbps: 64,
    sampleRate: 16000,
    channels: 1,
  })
}

export async function compressZoomAudioFile(inputPath: string): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
  return transcodeZoomAudioFile(inputPath, {
    outputName: 'compressed.mp3',
    bitrateKbps: 32,
    sampleRate: 16000,
    channels: 1,
  })
}

export async function splitZoomAudioFile(inputPath: string, chunkSeconds = DEFAULT_ZOOM_AUDIO_CHUNK_SECONDS): Promise<{ filePaths: string[]; cleanup: () => Promise<void> }> {
  const workspace = await createZoomAudioWorkspace('starway-zoom-chunks-')
  const outputPattern = join(workspace.dir, 'chunk_%03d.mp3')

  await runFfmpeg([
    '-y',
    '-i', inputPath,
    '-vn',
    '-ac', '1',
    '-ar', '16000',
    '-b:a', '64k',
    '-f', 'segment',
    '-segment_time', String(chunkSeconds),
    '-reset_timestamps', '1',
    outputPattern,
  ])

  const filePaths = await import('node:fs/promises').then(async (fs) => {
    const entries = await fs.readdir(workspace.dir)
    return entries
      .filter((name) => name.endsWith('.mp3'))
      .sort()
      .map((name) => join(workspace.dir, name))
  })

  return {
    filePaths,
    cleanup: workspace.cleanup,
  }
}

export async function probeZoomAudioFileSizeBytes(filePath: string): Promise<number | null> {
  try {
    const info = await stat(filePath)
    return info.isFile() && info.size > 0 ? info.size : null
  } catch {
    return null
  }
}

export async function probeZoomAudioDurationSeconds(filePath: string): Promise<number | null> {
  const ffprobePath = String(process.env.FFPROBE_PATH ?? 'ffprobe').trim() || 'ffprobe'

  return new Promise<number | null>((resolve) => {
    const child = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    let stdout = ''
    child.stdout?.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString()
    })

    child.once('error', () => resolve(null))
    child.once('close', (code) => {
      if (code !== 0) {
        resolve(null)
        return
      }
      const parsed = Number(stdout.trim())
      resolve(Number.isFinite(parsed) && parsed > 0 ? parsed : null)
    })
  })
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
  const { trackEvent } = await import('../events/service.js')

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
