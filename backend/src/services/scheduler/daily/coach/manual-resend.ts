import { randomUUID } from 'node:crypto'

import { Markup } from 'telegraf'

import { prisma } from '../../../../db/client.js'
import { bot, resolveOpsChatId, sendOpsTelegramMessage } from '../../../../lib/telegram.js'
import { assertTelegramBotIdentity, requireTelegramBotConfig } from '../../../../modules/telegram-mentor/runtime/botConfig.js'
import { formatKyivDate } from '../shared.js'
import { buildCoachDailyBriefingButtons } from './cron.js'
import { loadDailyCoachBriefingData, type CoachReportButton } from './data.js'
import { buildCoachDailyBriefingText } from './report.js'
import { resolveCoachAgentsUrl } from '../shared.js'

const EVENT_PREFIX = 'manual-coach-daily-briefing:'

export type ManualCoachBriefingArgs = {
  send: boolean
  runId: string | null
}

export type ManualCoachBriefingResult = {
  mode: 'DRY_RUN' | 'SENT' | 'ALREADY_SENT' | 'UNKNOWN'
  reportDate: string
  destination: string
  botUsername: string | null
  messageId: string | null
}

function eventId(runId: string): string {
  return `${EVENT_PREFIX}${runId}`
}

function requireProductionOpsConfiguration(): { destination: string } {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('MANUAL_COACH_BRIEFING_REQUIRES_NODE_ENV_PRODUCTION')
  }
  const appEnv = String(process.env.APP_ENV ?? '').trim()
  if (appEnv && appEnv !== 'production') {
    throw new Error('MANUAL_COACH_BRIEFING_AMBIGUOUS_APP_ENV')
  }
  const primary = String(process.env.STARWAY_OPS_CHAT_ID ?? '').trim()
  const legacy = String(process.env.OPS_TELEGRAM_CHAT_ID ?? '').trim()
  if (primary && legacy && primary !== legacy) {
    throw new Error('MANUAL_COACH_BRIEFING_AMBIGUOUS_OPS_DESTINATION')
  }
  requireTelegramBotConfig('manual coach daily briefing')
  const destination = resolveOpsChatId()
  if (!destination) throw new Error('MANUAL_COACH_BRIEFING_OPS_DESTINATION_MISSING')
  return { destination }
}

function requireRunId(runId: string | null): string {
  const normalized = String(runId ?? '').trim()
  if (!normalized) throw new Error('MANUAL_COACH_BRIEFING_SEND_REQUIRES_RUN_ID')
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,120}$/.test(normalized)) {
    throw new Error('MANUAL_COACH_BRIEFING_INVALID_RUN_ID')
  }
  return normalized
}

function buildKeyboard(buttons: CoachReportButton[][]) {
  return Markup.inlineKeyboard(buttons.map((row) => row.map((button) => (
    'url' in button
      ? Markup.button.url(button.text, button.url)
      : Markup.button.callback(button.text, button.callback_data)
  )))).reply_markup
}

async function verifyOpsTransport(destination: string): Promise<string> {
  const [identity, chat] = await Promise.all([
    bot.telegram.getMe(),
    bot.telegram.getChat(destination),
  ])
  const username = assertTelegramBotIdentity(identity.username, undefined, 'manual coach daily briefing')
  if (chat.type !== 'group' && chat.type !== 'supergroup') {
    throw new Error('MANUAL_COACH_BRIEFING_OPS_DESTINATION_NOT_GROUP')
  }
  return username
}

async function createDelivery(runId: string, reportDate: string) {
  const id = eventId(runId)
  const existing = await prisma.event.findUnique({
    where: { id },
    select: { state: true, deliveries: { where: { recipient: 'OPS' }, select: { state: true, telegramMessageId: true } } },
  })
  if (existing) return { created: false, existing }

  try {
    const created = await prisma.event.create({
      data: {
        id,
        type: 'COACH_DAILY_BRIEFING_MANUAL',
        source: 'manual_cli',
        state: 'PENDING',
        payload: { runId, reportDate },
        deliveries: { create: { recipient: 'OPS' } },
      },
      select: { state: true, deliveries: { where: { recipient: 'OPS' }, select: { state: true, telegramMessageId: true } } },
    })
    return { created: true, existing: created }
  } catch (error) {
    const raced = await prisma.event.findUnique({
      where: { id },
      select: { state: true, deliveries: { where: { recipient: 'OPS' }, select: { state: true, telegramMessageId: true } } },
    })
    if (raced) return { created: false, existing: raced }
    throw error
  }
}

async function markUnknown(id: string, leaseToken: string, error: string): Promise<void> {
  await prisma.$transaction([
    prisma.eventDelivery.updateMany({
      where: { eventId: id, recipient: 'OPS', state: 'SENDING', leaseToken },
      data: { state: 'UNKNOWN', leaseToken: null, leaseExpiresAt: null, lastError: error },
    }),
    prisma.event.update({ where: { id }, data: { state: 'UNKNOWN' } }),
  ])
}

export async function runManualCoachDailyBriefing(args: ManualCoachBriefingArgs): Promise<ManualCoachBriefingResult> {
  if (args.send && !args.runId) requireRunId(args.runId)
  const { destination } = requireProductionOpsConfiguration()
  const snapshot = await loadDailyCoachBriefingData(new Date())
  const text = await buildCoachDailyBriefingText(snapshot)
  const buttons = buildCoachDailyBriefingButtons(await resolveCoachAgentsUrl())
  const reportDate = formatKyivDate(snapshot.monthNow)

  if (!args.send) {
    return { mode: 'DRY_RUN', reportDate, destination, botUsername: null, messageId: null }
  }

  const runId = requireRunId(args.runId)
  const botUsername = await verifyOpsTransport(destination)
  const delivery = await createDelivery(runId, reportDate)
  const prior = delivery.existing.deliveries[0]
  if (!delivery.created) {
    if (delivery.existing.state === 'DELIVERED' && prior?.state === 'DELIVERED') {
      return { mode: 'ALREADY_SENT', reportDate, destination, botUsername, messageId: prior.telegramMessageId ?? null }
    }
    throw new Error(`MANUAL_COACH_BRIEFING_RUN_ID_NOT_RETRIED:${delivery.existing.state}`)
  }

  const id = eventId(runId)
  const leaseToken = randomUUID()
  const claimed = await prisma.eventDelivery.updateMany({
    where: { eventId: id, recipient: 'OPS', state: 'PENDING' },
    data: { state: 'SENDING', leaseToken, attemptStartedAt: new Date(), attemptCount: { increment: 1 } },
  })
  if (!claimed.count) throw new Error('MANUAL_COACH_BRIEFING_DELIVERY_NOT_CLAIMED')

  let messageId: string | null = null
  try {
    const sent = await sendOpsTelegramMessage(text, {
      parse_mode: 'HTML',
      reply_markup: buildKeyboard(buttons),
    }, {
      messageType: 'coach_daily_briefing_manual',
      source: 'manualCoachDailyBriefing',
      allowCoachFallback: false,
    }, async (receipt) => {
      messageId = receipt.messageId
      await prisma.$transaction([
        prisma.eventDelivery.updateMany({
          where: { eventId: id, recipient: 'OPS', state: 'SENDING', leaseToken },
          data: { state: 'DELIVERED', leaseToken: null, leaseExpiresAt: null, deliveredAt: new Date(), telegramMessageId: receipt.messageId, lastError: null },
        }),
        prisma.event.update({ where: { id }, data: { state: 'DELIVERED' } }),
      ])
    })
    if (!sent) {
      await markUnknown(id, leaseToken, 'telegram_delivery_outcome_unknown')
      return { mode: 'UNKNOWN', reportDate, destination, botUsername, messageId: null }
    }
    return { mode: 'SENT', reportDate, destination, botUsername, messageId }
  } catch (error) {
    await markUnknown(id, leaseToken, error instanceof Error ? error.message : 'telegram_delivery_outcome_unknown')
    return { mode: 'UNKNOWN', reportDate, destination, botUsername, messageId: null }
  }
}
