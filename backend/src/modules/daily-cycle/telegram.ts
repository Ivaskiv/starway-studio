// backend/src/modules/daily-cycle/daily.telegram.ts
import { Context } from 'telegraf';
import { prisma } from '../../db/client.js';
import { checkDailyAccess } from './subscription.js';
import { bot as sharedTelegramBot } from '@/modules/wheel/telegram.js';

let dailyCommandsRegistered = false;

export function registerDailyTelegramCommands() {
  // fix code_x: prevent duplicate command registration on tsx hot-reload / restart.
  if (dailyCommandsRegistered) return;
  dailyCommandsRegistered = true;

  /* ------------------------------------------------------------------ */
  /* /daily — ручний виклик */
  /* ------------------------------------------------------------------ */
  sharedTelegramBot.command('daily', async (ctx: Context) => {
    if (!ctx.from || !ctx.chat) return;

    const user = await prisma.user.findFirst({
      where: { telegramChatId: String(ctx.chat.id) },
    });

    if (!user) {
      await ctx.reply('❌ Користувача не знайдено');
      return;
    }

    const access = checkDailyAccess(user);

    if (!access.canCreateEntry) {
      await ctx.reply('⛔️ Доступ закінчився. Оформи підписку.');
      return;
    }

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await ctx.reply(
      '📝 Заповни Daily у веб-додатку.',
      {
        reply_markup: {
          inline_keyboard: [[{ text: 'ВІДКРИТИ', url: `${appUrl}/dashboard/cycle` }]],
        },
      },
    );
  });
}

/* ------------------------------------------------------------------ */
/* РАНОК */
/* ------------------------------------------------------------------ */
export async function sendMorningQuestion() {
  const users = await prisma.user.findMany({
    where: { telegramChatId: { not: null } },
    select: { id: true, telegramChatId: true, subscriptionStatus: true, trialEndsAt: true },
  });

  for (const user of users) {
    const access = checkDailyAccess(user as any);
    if (!access.canCreateEntry) continue;

    await sharedTelegramBot.telegram.sendMessage(
      user.telegramChatId!,
      `🌅 Ранкові питання готові!\nВідкрий /daily`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* ВЕЧІР */
/* ------------------------------------------------------------------ */
export async function sendEveningQuestion() {
  const users = await prisma.user.findMany({
    where: { telegramChatId: { not: null } },
    select: { id: true, telegramChatId: true, subscriptionStatus: true, trialEndsAt: true },
  });

  for (const user of users) {
    const access = checkDailyAccess(user as any);
    if (!access.canCreateEntry) continue;

    await sharedTelegramBot.telegram.sendMessage(
      user.telegramChatId!,
      `🌙 Вечірній чекін.\nНе забудь завершити Daily 👉 /daily`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* 🔔 Надсилаємо будь-яке повідомлення користувачу */
/* ------------------------------------------------------------------ */
export async function sendTelegramMessage(chatId: number | string, message: string) {
  try {
    await sharedTelegramBot.telegram.sendMessage(chatId, message);
  } catch (error) {
    console.error('Telegram send message error:', error);
  }
}
