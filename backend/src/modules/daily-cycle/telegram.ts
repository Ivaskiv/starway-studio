// backend/src/modules/daily-cycle/telegram.ts
/**
 * Daily Cycle Telegram - FIXED
 */

import { bot as sharedTelegramBot, sendDedupedTelegramMessage } from '../../lib/telegram.js';
import type { Context } from 'telegraf';
import { prisma } from '../../db/client.js';
import { checkDailyAccess } from './subscription.js';
import type { DailyCheckUser } from './subscription.js'; // імпорт типу
import { buildRecoveryCopy, resolveConversationProfile } from '../../core/state-machine/conversationPresentation.js';
import { resolveRelationshipMemory } from '../../core/memory/relationshipMemory.js';
import { absystemContent } from '@/products/absystem/config/content.js';

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
        telegramUserId: true,
        trialEndsAt: true,
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { status: true }
        }
      }
    });

    if (!user) {
      const copy = buildRecoveryCopy('session_expired', resolveConversationProfile('absystem'))
      await ctx.reply(`${absystemContent.dailyCycle.command.missingProfile}\n${copy.body}`);
      return;
    }

    // Перевірка доступу з типом DailyCheckUser
    const checkUser: DailyCheckUser = {
      subscriptionStatus: user.subscriptions?.[0]?.status ?? null,
      trialEndsAt: user.trialEndsAt
    };

    const access = checkDailyAccess(checkUser);

    if (!access.canCreateEntry) {
      const relationship = await resolveRelationshipMemory(user.id, 'absystem').catch(() => null)
      const copy = buildRecoveryCopy('payment_interrupted', resolveConversationProfile('absystem'), {
        relationship,
      })
      await ctx.reply(`${absystemContent.dailyCycle.command.accessDenied}\n${copy.body}`);
      return;
    }

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await ctx.reply(absystemContent.dailyCycle.command.webApp, {
      reply_markup: {
        inline_keyboard: [[{ text: absystemContent.dailyCycle.command.open, url: `${appUrl}/dashboard/cycle` }]],
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
      trialEndsAt: true,
      subscriptions: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { status: true }
      }
    }
  });

  let sentCount = 0;

  for (const user of users) {
    try {
      const checkUser: DailyCheckUser = {
        subscriptionStatus: user.subscriptions?.[0]?.status ?? null,
        trialEndsAt: user.trialEndsAt
      };

      const access = checkDailyAccess(checkUser);

      if (!access.canCreateEntry) continue;

      await sendDedupedTelegramMessage(
        user.telegramUserId!,
        absystemContent.dailyCycle.morning
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
      trialEndsAt: true,
      subscriptions: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { status: true }
      }
    }
  });

  let sentCount = 0;

  for (const user of users) {
    try {
      const checkUser: DailyCheckUser = {
        subscriptionStatus: user.subscriptions?.[0]?.status ?? null,
        trialEndsAt: user.trialEndsAt
      };

      const access = checkDailyAccess(checkUser);

      if (!access.canCreateEntry) continue;

      await sendDedupedTelegramMessage(
        user.telegramUserId!,
        absystemContent.dailyCycle.evening
      );

      sentCount++;
    } catch (error) {
      console.error(`❌ Evening question error for user ${user.id}:`, error);
    }
  }

  console.log(`📬 Sent evening questions to ${sentCount} users`);
}
