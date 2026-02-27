// backend/src/modules/daily-cycle/telegram.ts
/**
 * Daily Cycle Telegram - FIXED
 */

import { bot as sharedTelegramBot } from '@/modules/wheel/telegram.js';
import type { Context } from 'telegraf';
import { prisma } from '@/db/client.js';
import { checkDailyAccess } from './subscription.js';
import type { DailyCheckUser } from './subscription.js'; // імпорт типу

let dailyCommandsRegistered = false;

// REGISTER COMMANDS
export function registerDailyTelegramCommands() {
  if (dailyCommandsRegistered) return;
  dailyCommandsRegistered = true;

  sharedTelegramBot.command('daily', async (ctx: Context) => {
    if (!ctx.from) return;

    const user = await prisma.user.findFirst({
      where: { telegramUserId: ctx.from.id.toString() },
      select: {
        id: true,
        subscriptionStatus: true,
        trialEndsAt: true
      }
    });

    if (!user) {
      await ctx.reply('❌ Користувача не знайдено');
      return;
    }

    // Перевірка доступу з типом DailyCheckUser
    const checkUser: DailyCheckUser = {
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt
    };

    const access = checkDailyAccess(checkUser);

    if (!access.canCreateEntry) {
      await ctx.reply('⛔️ Доступ закінчився. Оформи підписку.');
      return;
    }

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await ctx.reply('📝 Заповни Daily у веб-додатку.', {
      reply_markup: {
        inline_keyboard: [[{ text: 'ВІДКРИТИ', url: `${appUrl}/dashboard/cycle` }]],
      }
    });
  });
}

// SEND MORNING QUESTION
export async function sendMorningQuestion() {
  const users = await prisma.user.findMany({
    where: { telegramUserId: { not: null } },
    select: {
      id: true,
      telegramUserId: true,
      subscriptionStatus: true,
      trialEndsAt: true
    }
  });

  let sentCount = 0;

  for (const user of users) {
    try {
      const checkUser: DailyCheckUser = {
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt
      };

      const access = checkDailyAccess(checkUser);

      if (!access.canCreateEntry) continue;

      await sharedTelegramBot.telegram.sendMessage(
        user.telegramUserId!,
        `🌅 Ранкові питання готові!\nВідкрий /daily`
      );

      sentCount++;
    } catch (error) {
      console.error(`❌ Morning question error for user ${user.id}:`, error);
    }
  }

  console.log(`📬 Sent morning questions to ${sentCount} users`);
}

// SEND EVENING QUESTION
export async function sendEveningQuestion() {
  const users = await prisma.user.findMany({
    where: { telegramUserId: { not: null } },
    select: {
      id: true,
      telegramUserId: true,
      subscriptionStatus: true,
      trialEndsAt: true
    }
  });

  let sentCount = 0;

  for (const user of users) {
    try {
      const checkUser: DailyCheckUser = {
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt
      };

      const access = checkDailyAccess(checkUser);

      if (!access.canCreateEntry) continue;

      await sharedTelegramBot.telegram.sendMessage(
        user.telegramUserId!,
        `🌙 Вечірній чекін.\nНе забудь завершити Daily 👉 /daily`
      );

      sentCount++;
    } catch (error) {
      console.error(`❌ Evening question error for user ${user.id}:`, error);
    }
  }

  console.log(`📬 Sent evening questions to ${sentCount} users`);
}