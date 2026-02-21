// backend/src/modules/social/telegram.service.ts
/**
 * Telegram Service - FIXED
 */

import { prisma } from '@/db/client.js';
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN || '', { polling: false });

/**
 * Check user mentor access
 */
async function checkUserMentorAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      trialEndsAt: true
    }
  });

  if (!user) return false;

  const now = new Date();
  const isTrialActive = user.trialEndsAt ? user.trialEndsAt > now : false;
  const isSubscriptionActive = user.subscriptionStatus === 'ACTIVE';

  return isSubscriptionActive || isTrialActive;
}

/**
 * Send message to user
 */
export const sendMessage = async (userId: string, message: string): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true }
    });

    if (!user?.telegramChatId) return false;

    const canAccess = await checkUserMentorAccess(userId); // ← FIX: function exists now
    if (!canAccess) return false;

    await bot.sendMessage(user.telegramChatId, message, { parse_mode: 'Markdown' });
    return true;
  } catch (err) {
    console.error('[Telegram] sendMessage error', err);
    return false;
  }
};