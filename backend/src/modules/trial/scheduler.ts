// backend/src/modules/trial/scheduler.ts
/**
 * Trial Scheduler
 * Auto-generate mirrors on day 4 and day 7
 */

import { prisma } from '../../db/client.js';
import { bot } from '../../lib/telegram.js';
import { generateTrialMirror } from './service.js';

async function sendTg(chatId: string, text: string): Promise<void> {
  await bot.telegram.sendMessage(chatId, text).catch(err =>
    console.error('[Trial] telegram send failed:', err)
  )
}

export async function scheduleTrialMirror(userId: string, day: 4 | 7) {
  // In production, use cron job or queue
  // For now, manual trigger
  console.log(`[Trial] Scheduled mirror for user ${userId} on day ${day}`);
}

export async function sendTrialReminder(userId: string, daysLeft: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramUserId: true, name: true, email: true },
  })
  if (!user?.telegramUserId) return

  const messages: Record<number, string> = {
    3: `⏰ До кінця тріалу залишилось 3 дні!\n\nТи вже відчула різницю? Підпишись щоб не втратити доступ.\n\n💎 Місяць дії — 30€\n👉 /subscription`,
    2: `⚠️ Залишилось 2 дні тріалу!\n\nПродовж роботу з AI-ментором — підпишись зараз.\n\n💎 Тиждень фокусу — 7€\n👉 /subscription`,
    1: `🔔 Завтра закінчується твій тріал!\n\nОстанній шанс зберегти доступ.\n\n💎 Від 7€/тиждень\n👉 /subscription`,
  }

  const text = messages[daysLeft]
  if (!text) return

  await bot.telegram.sendMessage(user.telegramUserId, text).catch(err =>
    console.error('[Trial] reminder send failed:', err)
  )
}

export async function sendExpiredTrialReminder(): Promise<void> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: {
      trialEndsAt: { gte: twoDaysAgo, lte: yesterday },
      telegramChatId: { not: null },
      subscriptions: {
        none: { status: { in: ['ACTIVE', 'TRIAL'] } },
      },
    },
    select: { telegramChatId: true, firstName: true },
  })

  for (const user of users) {
    if (!user.telegramChatId) continue
    const name = user.firstName ?? 'друже'
    await sendTg(
      user.telegramChatId,
      `✨ ${name}, твій пробний період завершено!\n\n` +
      `Твій прогрес збережено і чекає на тебе.\n` +
      `Продовж шлях — від 7€/тиждень 👇\n\n` +
      `Обери план: /subscription`
    )
  }
  console.log(`📬 Expired trial reminders: ${users.length} users`)
}

export async function expireTrials() {
  const now = new Date()
  const expired = await prisma.user.findMany({
    where: {
      trialEndsAt: { lt: now },
      trialStartsAt: { not: null },
    },
    select: { id: true, telegramUserId: true },
  })

  for (const user of expired) {
    const hasSub = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gt: now } },
        ],
      },
      select: { id: true },
    })
    if (hasSub) continue

    if (user.telegramUserId) {
      await bot.telegram.sendMessage(
        user.telegramUserId,
        `❌ Твій тріал закінчився.\n\nПідпишись щоб відновити доступ:\n\n💎 Тиждень — 7€\n💎 Місяць — 30€\n💎 Рік — 300€\n\n👉 /subscription`
      ).catch(() => {})
    }
  }
}

export async function runTrialMirrorCheck() {
  const users = await prisma.user.findMany({
    where: {
      trialStartsAt: { not: null },
      trialEndsAt: { gte: new Date() }
    },
    select: { id: true, trialStartsAt: true, trialEndsAt: true },
  });

  for (const user of users) {
    if (!user.trialStartsAt || !user.trialEndsAt) continue;

    const daysPassed = Math.floor(
      (Date.now() - user.trialStartsAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysPassed === 4 || daysPassed === 7) {
      await generateTrialMirror(user.id, daysPassed as 4 | 7);
    }

    const daysLeft = Math.ceil(
      (user.trialEndsAt.getTime() - Date.now()) / 86_400_000
    )
    if ([1, 2, 3].includes(daysLeft)) {
      await sendTrialReminder(user.id, daysLeft)
    }
  }
}
