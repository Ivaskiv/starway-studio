// backend/src/modules/daily-cycle/scheduler.ts
// ═══════════════════════════════════════════════════════════════
// ЄДИНИЙ SCHEDULER
//   ✅ Cron — тільки тригер, не виконує важку роботу напряму
//   ✅ Heavy jobs (AI аналіз) — через setImmediate, не блокують loop
//   ✅ Telegram sends — Promise.all з concurrency limit (не послідовно)
//   ✅ Prisma — batch queries замість N+1
//   ✅ Duplicate scheduler guard
// ═══════════════════════════════════════════════════════════════

import cron, { type ScheduledTask } from 'node-cron'
import { prisma, withRetry }       from '../../db/client.js'
import { sendEveningQuestion, sendMorningQuestion } from './telegram.js'
import { expireTrials, runTrialMirrorCheck, sendExpiredTrialReminder } from '../trial/scheduler.js'
import { bot }                     from '../../lib/telegram.js'
import type { MicroTask }          from '@starway/db/prisma-client'
import { SubscriptionStatus }      from '@starway/db/prisma-client'
import { generateWeeklyReport }    from '../ai-mentor/services.js'
import { runWeeklyAnalysis }       from '../ai-mentor/weekly-analysis/service.js'
import { generateBanners }         from '../banners/banner.service.js'
import { getNudgeText, getStateMessage, resolveUserState } from '../telegram-mentor/handlers/start.js'
import { logger }                  from '../../utils/logger.js'
import type { Telegraf }           from 'telegraf'

async function getActiveUserChatIds(): Promise<string[]> {
  const now = new Date()
  const users = await withRetry(() => prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
      OR: [
        { trialEndsAt: { gt: now } },
        {
          subscriptions: {
            some: {
              status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
            },
          },
        },
      ],
    },
    select: { telegramChatId: true },
  }))
  return users.map(u => u.telegramChatId!)
}

let schedulerStarted = false
const scheduledTasks: ScheduledTask[] = []
const reminderTimeouts = new Set<NodeJS.Timeout>()
let weeklyReportTimeout: NodeJS.Timeout | null = null

const WEEKLY_REPORT_THROTTLE_MS = 3000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function registerTask(task: ScheduledTask): ScheduledTask {
  scheduledTasks.push(task)
  return task
}

function registerReminderTimeout(timeout: NodeJS.Timeout): NodeJS.Timeout {
  timeout.unref()
  reminderTimeouts.add(timeout)
  return timeout
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency))
  }
  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(fn))
  }
}

async function sendTg(chatId: string, text: string): Promise<void> {
  try {
    await bot.telegram.sendMessage(chatId, text)
  } catch {
    // мовчки — юзер заблокував бота
  }
}

// ═════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═════════════════════════════════════════════════════════════
export function startScheduler() {
  if (schedulerStarted) {
    console.log('✅ Scheduler already started')
    return
  }
  schedulerStarted = true

  const tz = process.env.TZ || 'Europe/Kyiv'
  console.log(`🚀 Starting unified scheduler (tz: ${tz})...`)

  registerTask(cron.schedule('0 8 * * *', () => {
    console.log('🌅 Morning questions trigger')
    setImmediate(async () => {
      try { await sendMorningQuestion() }
      catch (e) { console.error('❌ Morning questions error:', e) }
    })
  }, { timezone: tz }))

  registerTask(cron.schedule('0 20 * * *', () => {
    console.log('🌙 Evening questions trigger')
    setImmediate(async () => {
      try { await sendEveningQuestion() }
      catch (e) { console.error('❌ Evening questions error:', e) }
    })
  }, { timezone: tz }))

  registerTask(cron.schedule('0 8 * * *', () => {
    setImmediate(() => sendMorningReminders().catch(console.error))
  }, { timezone: tz }))

  registerTask(cron.schedule('0 20 * * *', () => {
    setImmediate(() => sendEveningReminders().catch(console.error))
  }, { timezone: tz }))

  registerTask(cron.schedule('0 18 * * *', () => {
    setImmediate(() => sendTaskReminders().catch(console.error))
  }, { timezone: tz }))

  registerTask(cron.schedule('*/10 * * * *', () => {
    setImmediate(async () => {
      try { await checkOverdueMicroTasks() }
      catch (e) { console.error('❌ Overdue tasks error:', e) }
    })
  }, { timezone: tz }))

  registerTask(cron.schedule('0 9 * * *', () => {
    console.log('🔍 Trial mirror check trigger')
    setImmediate(async () => {
      try { await runTrialMirrorCheck() }
      catch (e) { console.error('❌ Trial mirror error:', e) }
    })
  }, { timezone: tz }))

  registerTask(cron.schedule('5 0 * * *', () => {
    console.log('⛔ Trial expiration check trigger')
    setImmediate(async () => {
      try { await expireTrials() }
      catch (e) { console.error('❌ Trial expiration error:', e) }
    })
  }, { timezone: tz }))

  registerTask(cron.schedule('0 8 * * 0', () => {
    console.log('📊 Weekly analysis trigger')
    setImmediate(() => runWeeklyAnalysisForAll().catch(console.error))
  }, { timezone: tz }))

  registerTask(cron.schedule('0 10 * * 0', () => {
    console.log('📨 Weekly PDF trigger')
    setImmediate(async () => {
      try { await sendWeeklyPdfReports() }
      catch (e) { console.error('❌ Weekly PDF error:', e) }
    })
  }, { timezone: tz }))

  registerTask(cron.schedule('0 9 1 * *', () => {
    setImmediate(() => runWheelMonthlyReminder().catch(console.error))
  }, { timezone: tz }))

  registerTask(cron.schedule('0 22 28-31 * *', () => {
    const now      = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    if (tomorrow.getMonth() !== now.getMonth()) {
      setImmediate(() => runWheelMonthlyReport().catch(console.error))
    }
  }, { timezone: tz }))

  registerTask(cron.schedule('0 10 * * *', () => {
    setImmediate(async () => {
      try { await sendExpiredTrialReminder() }
      catch (e) { console.error('❌ Expired trial reminder error:', e) }
    })
  }, { timezone: 'Europe/Kyiv' }))

  registerTask(cron.schedule('0 10 * * *', () => {
    setImmediate(() => sendMarketingNudges().catch(error => logger.error('[nudge-cron]', error)))
  }, { timezone: 'Europe/Kyiv' }))

  registerTask(cron.schedule('0 10 * * 5', () => {
    setImmediate(async () => {
      try {
        await generateBanners('weekly')
        console.log('[banners] weekly generated')
      } catch (error) {
        logger.error('[banners-weekly]', error)
      }
    })
  }, { timezone: 'Europe/Kyiv' }))

  registerTask(cron.schedule('0 10 1 * *', () => {
    setImmediate(async () => {
      try {
        await generateBanners('monthly')
        console.log('[banners] monthly generated')
      } catch (error) {
        logger.error('[banners-monthly]', error)
      }
    })
  }, { timezone: 'Europe/Kyiv' }))

  scheduleNextWeeklyReports()

  console.log('✅ Unified scheduler started')
}

export const startDailyScheduler = startScheduler

export function stopScheduler() {
  if (!schedulerStarted) return

  for (const task of scheduledTasks.splice(0)) {
    task.stop()
    task.destroy()
  }

  for (const timeout of reminderTimeouts) {
    clearTimeout(timeout)
  }
  reminderTimeouts.clear()

  if (weeklyReportTimeout) {
    clearTimeout(weeklyReportTimeout)
    weeklyReportTimeout = null
  }

  schedulerStarted = false
  console.log('🛑 Unified scheduler stopped')
}

export const stopDailyScheduler = stopScheduler

// ═════════════════════════════════════════════════════════════
// TELEGRAM REMINDERS
// ═════════════════════════════════════════════════════════════

export async function sendMorningReminders(): Promise<void> {
  const chatIds = await getActiveUserChatIds()
  console.log(`🌅 Morning reminders → ${chatIds.length} users`)
  await runWithConcurrency(chatIds, 10, chatId =>
    sendTg(chatId, '🌅 Доброго ранку!\n\nЧас для ранкового чекіну.\nНатисни /morning або кнопку 👇')
  )
}

export async function sendEveningReminders(): Promise<void> {
  const chatIds = await getActiveUserChatIds()
  console.log(`🌙 Evening reminders → ${chatIds.length} users`)
  await runWithConcurrency(chatIds, 10, chatId =>
    sendTg(chatId, '🌙 Вечірній чекін!\n\nЯк минув твій день?\nНатисни /evening 👇')
  )
}

// ═════════════════════════════════════════════════════════════
// JOB IMPLEMENTATIONS
// ═════════════════════════════════════════════════════════════

async function checkOverdueMicroTasks(): Promise<void> {
  const now = new Date()

  const overdueTasks = await withRetry(() => prisma.microTask.findMany({
    where: {
      isCompleted: false, // fix: було completedAt: null — поле не існує в схемі
      dueAt: { lt: now }, // fix: було dueDate — правильна назва поля dueAt
    },
    select: {
      id:     true,
      title:  true,
      userId: true,
      user:   { select: { telegramChatId: true, telegramUserId: true } },
    },
  }))

  if (overdueTasks.length === 0) return

  const byUser = new Map<string, typeof overdueTasks>()
  for (const task of overdueTasks) {
    const arr = byUser.get(task.userId) ?? []
    arr.push(task)
    byUser.set(task.userId, arr)
  }

  const entries = [...byUser.values()]
  await runWithConcurrency(entries, 10, async (tasks) => {
    const chatId = tasks[0].user?.telegramChatId ?? tasks[0].user?.telegramUserId
    if (!chatId) return
    const titles = tasks.map(t => `• ${t.title ?? 'Без назви'}`).join('\n')
    await sendTg(chatId, `⚠️ Прострочені завдання (${tasks.length}):\n${titles}`)
  })

  console.log(`📬 Overdue reminders: ${entries.length} users, ${overdueTasks.length} tasks`)
}

async function sendTaskReminders(): Promise<void> {
  const overdue = await withRetry(() => prisma.microTask.findMany({
    where: {
      isCompleted: false,
      dueAt:       { lte: new Date() },
    },
    take: 500,
    include: {
      user: {
        select: {
          telegramLinks: {
            where: { isActive: true },
            select: { chatId: true },
          },
        },
      },
    },
  }))

  const byUser = new Map<string, { chatId: string; count: number }>()
  for (const t of overdue) {
    const chatId = t.user?.telegramLinks?.[0]?.chatId
    if (!chatId) continue
    const existing = byUser.get(t.userId)
    byUser.set(t.userId, { chatId, count: (existing?.count ?? 0) + 1 })
  }

  const entries = [...byUser.values()]
  await runWithConcurrency(entries, 10, async ({ chatId, count }) => {
    await sendTg(chatId, `⏰ У тебе ${count} невиконаних завдань.\n\n/task`)
  })

  if (entries.length > 0) console.log(`📬 Task reminders → ${entries.length} users`)
}

async function runWeeklyAnalysisForAll(): Promise<void> {
  const activeUsers = await withRetry(() => prisma.user.findMany({
    where: {
      subscriptions: {
        some: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
      },
    },
    select: { id: true },
  }))

  console.log(`[WeeklyAnalysis] Processing ${activeUsers.length} users`)

  const CONCURRENCY = 3
  const chunks: typeof activeUsers[] = []
  for (let i = 0; i < activeUsers.length; i += CONCURRENCY) {
    chunks.push(activeUsers.slice(i, i + CONCURRENCY))
  }

  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(u => runWeeklyAnalysis(u.id)))
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  console.log('[WeeklyAnalysis] All done')
}

async function sendWeeklyPdfReports(): Promise<void> {
  const reports = await withRetry(() => prisma.weeklyReport.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      pdfSentAt: null,
    },
    select: {
      id:             true,
      pdfUrl:         true,
      motivationText: true,
      user: { select: { telegramChatId: true, telegramUserId: true } },
    },
  }))

  await runWithConcurrency(reports, 10, async (report) => {
    const chatId = report.user?.telegramChatId ?? report.user?.telegramUserId
    if (!chatId) return

    const msg = report.pdfUrl
      ? `📊 Твій тижневий звіт готовий!\n\n${report.motivationText}\n\n📥 PDF: ${report.pdfUrl}`
      : `📊 Твій тижневий звіт готовий!\n\n${report.motivationText}\n\nВідкрий додаток щоб переглянути.`

    await sendTg(chatId, msg)
    await withRetry(() => prisma.weeklyReport.update({
      where: { id: report.id },
      data:  { pdfSentAt: new Date() },
    }))
  })

  console.log(`📬 Weekly PDF reports sent: ${reports.length}`)
}

async function runWheelMonthlyReminder(): Promise<void> {
  const chatIds = await getActiveUserChatIds()
  await runWithConcurrency(chatIds, 10, chatId =>
    sendTg(chatId, '📊 Час оновити своє колесо балансу! /wheel')
  )
  console.log(`📬 Wheel reminders: ${chatIds.length} active users`)
}

async function runWheelMonthlyReport(): Promise<void> {
  const users = await withRetry(() => prisma.user.findMany({
    where: {
      telegramLinks:  { some: { isActive: true, chatId: { not: null } } },
      balanceEntries: { some: {} },
    },
    select: {
      id:            true,
      telegramLinks: { where: { isActive: true, chatId: { not: null } }, select: { chatId: true }, take: 1 },
    },
  }))

  await runWithConcurrency(users, 10, async (user) => {
    const chatId = user.telegramLinks[0]?.chatId
    if (!chatId) return
    await sendTg(chatId, '📈 Місячний звіт готовий! Переглянь прогрес у додатку.')
  })

  console.log(`📬 Monthly reports: ${users.length} users`)
}

async function sendMarketingNudges(): Promise<void> {
  const candidates = await withRetry(() => prisma.user.findMany({
    where: {
      telegramLinks: {
        some: {
          chatId: { not: null },
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      telegramLinks: {
        where: {
          chatId: { not: null },
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
      funnelLeads: {
        orderBy: { updatedAt: 'desc' },
        select: {
          notes: true,
        },
      },
    },
  }))

  for (const user of candidates) {
    const chatId = user.telegramLinks[0]?.chatId
    if (!chatId) continue

    const nudgeCount = user.funnelLeads.filter(lead => lead.notes?.startsWith('NUDGE_SENT')).length
    if (nudgeCount >= 3) continue

    try {
      const state = await resolveUserState(user.id)
      if (!['lm_started', 'lm_engaged', 'lm_almost_done', 'lm_completed', 'lm_exited'].includes(state)) {
        continue
      }

      const mentor = await withRetry(() => prisma.userAIMentor.findFirst({
        where: { userId: user.id },
        select: {
          insight: true,
          blocker: true,
          stage: true,
        },
      }))

      const message = getStateMessage(state, '', mentor, undefined, nudgeCount)
      const textWithStage = getNudgeText(state, mentor, nudgeCount)

      await bot.telegram.sendMessage(chatId, textWithStage, {
        reply_markup: {
          inline_keyboard: message.buttons,
        },
        parse_mode: 'HTML',
      })

      await withRetry(() => prisma.funnelLead.create({
        data: {
          userId: user.id,
          source: 'scheduler',
          status: 'LEAD',
          notes: `NUDGE_SENT:${nudgeCount + 1}:${state}`,
        },
      }))
    } catch (error) {
      logger.error(`[nudge] userId=${user.id}`, error)
    }
  }
}

export async function runWeeklyReports(): Promise<void> {
  console.log('[Scheduler] Starting weekly reports...')

  const owners = await withRetry(() => prisma.user.findMany({
    where: {
      ownedProducts: {
        some: {
          botConfig: { isNot: null },
        },
      },
    },
    include: {
      ownedProducts: {
        where: { botConfig: { isNot: null } },
        include: { botConfig: true },
        take: 1,
      },
    },
  }))

  console.log(`[Scheduler] ${owners.length} owners to process`)
  let success = 0
  let failed = 0

  for (const owner of owners) {
    const product = owner.ownedProducts[0]
    if (!product) continue

    try {
      await generateWeeklyReport(owner.id, product.id)
      success += 1

      const telegramId = owner.telegramUserId
      if (telegramId && product.botConfig?.botToken) {
        try {
          const { Telegraf: TelegrafCtor } = await import('telegraf')
          const ownerBot: Telegraf = new TelegrafCtor(product.botConfig.botToken)
          await ownerBot.telegram.sendMessage(
            telegramId,
            '✅ Твій щотижневий AI-звіт готовий → Dashboard / Content',
          )
        } catch (telegramError) {
          console.error(`[Scheduler] Telegram failed for ${owner.id}:`, telegramError)
        }
      }
    } catch (error) {
      failed += 1
      console.error(`[Scheduler] Failed for owner ${owner.id}:`, error)
    }

    await sleep(WEEKLY_REPORT_THROTTLE_MS)
  }

  console.log(`[Scheduler] Done. success=${success} failed=${failed}`)
}

function msUntilNextMonday9am(): number {
  const now = new Date()
  const kyiv = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }))
  const day = kyiv.getDay()
  const daysUntilMonday = (1 - day + 7) % 7 || 7
  const next = new Date(kyiv)
  next.setDate(kyiv.getDate() + daysUntilMonday)
  next.setHours(9, 0, 0, 0)
  return next.getTime() - kyiv.getTime()
}

function scheduleNextWeeklyReports(): void {
  const delay = msUntilNextMonday9am()
  console.log(`[Scheduler] Next run in ${Math.round(delay / 1000 / 60)} min`)
  weeklyReportTimeout = setTimeout(() => {
    void runWeeklyReports()
      .catch(error => console.error('[Scheduler] Error:', error))
      .finally(scheduleNextWeeklyReports)
  }, delay)
  weeklyReportTimeout.unref()
  console.log('[Scheduler] Registered: Mon 09:00 Kyiv')
}

// ═════════════════════════════════════════════════════════════
// ONE-OFF REMINDER
// ═════════════════════════════════════════════════════════════
export function scheduleMicroTaskReminder(task: MicroTask) {
  if (!task.dueAt || task.completedAt) return

  const due        = new Date(task.dueAt)
  const msUntilDue = due.getTime() - Date.now()

  if (isNaN(due.getTime()) || msUntilDue <= 0) return

  const MAX_TIMEOUT = 2 ** 31 - 1

  const sendReminder = async () => {
    try {
      const t = await withRetry(() => prisma.microTask.findUnique({
        where:  { id: task.id },
        select: {
          title:       true,
          isCompleted: true, // fix: було `isCompleted: false` — в select потрібно true/false як boolean selector
          user: { select: { telegramChatId: true, telegramUserId: true } },
        },
      }))
      if (!t || t.isCompleted) return
      const chatId = t.user?.telegramChatId ?? t.user?.telegramUserId
      if (chatId) await sendTg(chatId, `⏰ Нагадування: ${t.title ?? 'Без назви'}`)
    } catch (e) {
      console.error('❌ Task reminder error:', e)
    }
  }

  if (msUntilDue > MAX_TIMEOUT) {
    const timeout = registerReminderTimeout(setTimeout(() => {
      reminderTimeouts.delete(timeout)
      scheduleMicroTaskReminder(task)
    }, MAX_TIMEOUT))
    return
  } else {
    const timeout = registerReminderTimeout(setTimeout(async () => {
      reminderTimeouts.delete(timeout)
      await sendReminder()
    }, msUntilDue))
  }
}
