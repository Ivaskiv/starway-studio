// backend/src/modules/daily-cycle/scheduler.ts
// ═══════════════════════════════════════════════════════════════
// ЄДИНИЙ SCHEDULER
//   ✅ Cron — тільки тригер, не виконує важку роботу напряму
//   ✅ Heavy jobs (AI аналіз) — через setImmediate, не блокують loop
//   ✅ Telegram sends — Promise.all з concurrency limit (не послідовно)
//   ✅ Prisma — batch queries замість N+1
//   ✅ Duplicate scheduler guard
// ═══════════════════════════════════════════════════════════════

import cron                        from 'node-cron'
import { prisma }                  from '../../db/client.js'
import { sendEveningQuestion, sendMorningQuestion } from './telegram.js'
import { generateTrialMirror }     from '../trial/service.js'
import { bot }                     from '../../lib/telegram.js'
import type { MicroTask }          from '../../db/generated/prisma/client.js'
import { SubscriptionStatus }      from '../../db/generated/prisma/client.js'
import { runWeeklyAnalysis }       from '../ai-mentor/weekly-analysis/service.js'

let schedulerStarted = false

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

  cron.schedule('0 8 * * *', () => {
    console.log('🌅 Morning questions trigger')
    setImmediate(async () => {
      try { await sendMorningQuestion() }
      catch (e) { console.error('❌ Morning questions error:', e) }
    })
  }, { timezone: tz })

  cron.schedule('0 20 * * *', () => {
    console.log('🌙 Evening questions trigger')
    setImmediate(async () => {
      try { await sendEveningQuestion() }
      catch (e) { console.error('❌ Evening questions error:', e) }
    })
  }, { timezone: tz })

  cron.schedule('0 8 * * *', () => {
    setImmediate(() => sendMorningReminders().catch(console.error))
  }, { timezone: tz })

  cron.schedule('0 20 * * *', () => {
    setImmediate(() => sendEveningReminders().catch(console.error))
  }, { timezone: tz })

  cron.schedule('0 18 * * *', () => {
    setImmediate(() => sendTaskReminders().catch(console.error))
  }, { timezone: tz })

  cron.schedule('*/10 * * * *', () => {
    setImmediate(async () => {
      try { await checkOverdueMicroTasks() }
      catch (e) { console.error('❌ Overdue tasks error:', e) }
    })
  }, { timezone: tz })

  cron.schedule('0 9 * * *', () => {
    console.log('🔍 Trial mirror check trigger')
    setImmediate(async () => {
      try { await runTrialMirrorCheck() }
      catch (e) { console.error('❌ Trial mirror error:', e) }
    })
  }, { timezone: tz })

  cron.schedule('0 8 * * 0', () => {
    console.log('📊 Weekly analysis trigger')
    setImmediate(() => runWeeklyAnalysisForAll().catch(console.error))
  }, { timezone: tz })

  cron.schedule('0 10 * * 0', () => {
    console.log('📨 Weekly PDF trigger')
    setImmediate(async () => {
      try { await sendWeeklyPdfReports() }
      catch (e) { console.error('❌ Weekly PDF error:', e) }
    })
  }, { timezone: tz })

  cron.schedule('0 9 1 * *', () => {
    setImmediate(() => runWheelMonthlyReminder().catch(console.error))
  }, { timezone: tz })

  cron.schedule('0 22 28-31 * *', () => {
    const now      = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    if (tomorrow.getMonth() !== now.getMonth()) {
      setImmediate(() => runWheelMonthlyReport().catch(console.error))
    }
  }, { timezone: tz })

  console.log('✅ Unified scheduler started')
}

export const startDailyScheduler = startScheduler

// ═════════════════════════════════════════════════════════════
// TELEGRAM REMINDERS
// ═════════════════════════════════════════════════════════════

export async function sendMorningReminders(): Promise<void> {
  const links = await prisma.telegramLink.findMany({
    where:  { isActive: true, chatId: { not: null } },
    select: { chatId: true },
  })
  const chatIds = links.map(l => l.chatId!)
  console.log(`🌅 Morning reminders → ${chatIds.length} users`)
  await runWithConcurrency(chatIds, 10, chatId =>
    sendTg(chatId, '🌅 Доброго ранку!\n\nЧас для ранкового чекіну.\nНатисни /morning або кнопку 👇')
  )
}

export async function sendEveningReminders(): Promise<void> {
  const links = await prisma.telegramLink.findMany({
    where:  { isActive: true, chatId: { not: null } },
    select: { chatId: true },
  })
  const chatIds = links.map(l => l.chatId!)
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

  const overdueTasks = await prisma.microTask.findMany({
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
  })

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
  const overdue = await prisma.microTask.findMany({
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
  })

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

async function runTrialMirrorCheck(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      trialStartsAt: { not: null },
      trialEndsAt:   { gte: new Date() },
    },
    select: { id: true, trialStartsAt: true },
  })

  const targets = users.filter(u => {
    if (!u.trialStartsAt) return false
    const days = Math.floor((Date.now() - u.trialStartsAt.getTime()) / 86_400_000)
    return days === 4 || days === 7
  })

  await runWithConcurrency(targets, 3, async (user) => {
    const days = Math.floor((Date.now() - user.trialStartsAt!.getTime()) / 86_400_000) as 4 | 7
    await generateTrialMirror(user.id, days)
    console.log(`[Trial] Mirror day=${days} userId=${user.id}`)
  })
}

async function runWeeklyAnalysisForAll(): Promise<void> {
  const activeUsers = await prisma.user.findMany({
    where: {
      subscriptions: {
        some: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
      },
    },
    select: { id: true },
  })

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
  const reports = await prisma.weeklyReport.findMany({
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
  })

  await runWithConcurrency(reports, 10, async (report) => {
    const chatId = report.user?.telegramChatId ?? report.user?.telegramUserId
    if (!chatId) return

    const msg = report.pdfUrl
      ? `📊 Твій тижневий звіт готовий!\n\n${report.motivationText}\n\n📥 PDF: ${report.pdfUrl}`
      : `📊 Твій тижневий звіт готовий!\n\n${report.motivationText}\n\nВідкрий додаток щоб переглянути.`

    await sendTg(chatId, msg)
    await prisma.weeklyReport.update({
      where: { id: report.id },
      data:  { pdfSentAt: new Date() },
    })
  })

  console.log(`📬 Weekly PDF reports sent: ${reports.length}`)
}

async function runWheelMonthlyReminder(): Promise<void> {
  const links = await prisma.telegramLink.findMany({
    where:  { isActive: true, chatId: { not: null } },
    select: { chatId: true },
  })
  const chatIds = links.map(l => l.chatId!)
  await runWithConcurrency(chatIds, 10, chatId =>
    sendTg(chatId, '📊 Час оновити своє колесо балансу! /wheel')
  )
  console.log(`📬 Wheel reminders: ${chatIds.length} users`)
}

async function runWheelMonthlyReport(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      telegramLinks:  { some: { isActive: true, chatId: { not: null } } },
      balanceEntries: { some: {} },
    },
    select: {
      id:            true,
      telegramLinks: { where: { isActive: true, chatId: { not: null } }, select: { chatId: true }, take: 1 },
    },
  })

  await runWithConcurrency(users, 10, async (user) => {
    const chatId = user.telegramLinks[0]?.chatId
    if (!chatId) return
    await sendTg(chatId, '📈 Місячний звіт готовий! Переглянь прогрес у додатку.')
  })

  console.log(`📬 Monthly reports: ${users.length} users`)
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
      const t = await prisma.microTask.findUnique({
        where:  { id: task.id },
        select: {
          title:       true,
          isCompleted: true, // fix: було `isCompleted: false` — в select потрібно true/false як boolean selector
          user: { select: { telegramChatId: true, telegramUserId: true } },
        },
      })
      if (!t || t.isCompleted) return
      const chatId = t.user?.telegramChatId ?? t.user?.telegramUserId
      if (chatId) await sendTg(chatId, `⏰ Нагадування: ${t.title ?? 'Без назви'}`)
    } catch (e) {
      console.error('❌ Task reminder error:', e)
    }
  }

  if (msUntilDue > MAX_TIMEOUT) {
    setTimeout(() => scheduleMicroTaskReminder(task), MAX_TIMEOUT)
  } else {
    setTimeout(sendReminder, msUntilDue)
  }
}
