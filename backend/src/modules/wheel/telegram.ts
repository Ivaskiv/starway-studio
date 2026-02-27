// backend/src/modules/wheel/telegram.ts
// Telegraf bot: /start linking, callback wheel_pdf_*, sendWheelNotification
// Синхронізовано зі схемою: telegramUserId/telegramUserName (не telegramChatId/telegramUserName)

import { prisma } from '@/db/client.js';
import { verifyTelegramLinkCode } from '@/modules/social/service.js';
import { Context, Telegraf } from 'telegraf';
import { createWheelPDF } from './pdf.js';
import { findFocus, findWeakest, scoresFromMap } from './service.js';
import type { WheelPDFData } from './types.js';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN ?? '');

type TelegramSendResult =
  | { ok: true }
  | { ok: false; reason: string; code?: string; action?: 'set_telegram_profile' | 'open_telegram_bot'; botLink?: string };

const getBotLink = () => `https://t.me/${process.env.TELEGRAM_BOT_USERNAME ?? 'Starway_byNadya_Bot'}`;
const getAppUrl  = () => process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ── Welcome message ───────────────────────────────────────────────────────────

async function sendWelcomeMessage(telegramUserId: string) {
  const url = getAppUrl();
  await bot.telegram.sendMessage(
    telegramUserId,
    [
      'Привіт. Це Starway Mentor Bot.',
      'Система: Стан → Ціль → Вибір → Рішення → Дія.',
      '',
      'Доступно зараз:',
      '• Кабінет  • Колесо балансу  • Звіти PDF',
      '• Підписки  • AI Ментор  • Статистика',
    ].join('\n'),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'ВІДКРИТИ', url: `${url}/dashboard` }],
          [{ text: 'Колесо', url: `${url}/dashboard/wheel` }, { text: 'AI Ментор', url: `${url}/dashboard/ai-mentor` }],
          [{ text: 'Звіти PDF', url: `${url}/dashboard/wheel` }, { text: 'Підписки', url: `${url}/dashboard/subscription` }],
        ],
      },
    },
  );
}

// ── sendWheelNotification ─────────────────────────────────────────────────────

/** Надсилає Telegram-сповіщення після збереження колеса */
export async function sendWheelNotification(userId: string, entryId: string): Promise<TelegramSendResult> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { ok: false, reason: 'TELEGRAM_BOT_TOKEN not configured' };
  }

  // fix: telegramUserId/telegramUserName — реальні поля схеми
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { telegramUserId: true, telegramUserName: true },
  });

  if (!user?.telegramUserId) {
    if (!user?.telegramUserName) {
      return {
        ok:      false,
        code:    'telegram_username_missing',
        reason:  'Telegram ще не підключено. Збережіть @username у профілі.',
        action:  'set_telegram_profile',
        botLink: getBotLink(),
      };
    }
    return {
      ok:      false,
      code:    'telegram_chat_not_linked',
      reason:  'Username збережено, але чат не підтверджено. Відкрийте бота і натисніть Start.',
      action:  'open_telegram_bot',
      botLink: getBotLink(),
    };
  }

  try {
    await bot.telegram.sendMessage(
      user.telegramUserId,
      '🎡 Колесо балансу збережено!\n\nНатисни для PDF-звіту:',
      {
        reply_markup: {
          inline_keyboard: [[{ text: '📄 Отримати PDF', callback_data: `wheel_pdf_${entryId}` }]],
        },
      },
    );
    return { ok: true };
  } catch (err) {
    console.error('❌ Telegram sendMessage error', err);
    return { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ── /start ────────────────────────────────────────────────────────────────────

bot.start(async (ctx: Context) => {
  try {
    if (!ctx.from || !ctx.chat) return;

    const telegramUserId  = String(ctx.chat.id);
    const telegramUserName = ctx.from.username ?? null;
    const payload          = 'payload' in ctx ? String((ctx as any).payload ?? '') : '';

    let userId: string | null = null;

    // Спочатку — one-time link код
    if (payload.startsWith('link_')) {
      userId = await verifyTelegramLinkCode(payload);
    }

    // Потім — пошук по username
    if (!userId && telegramUserName) {
      const found = await prisma.user.findFirst({
        where:  { OR: [
      { telegramUserName: telegramUserName ?? undefined },
      { telegramUserId: telegramUserId ?? undefined },
    ],
   },
        select: { id: true },
      });
      userId = found?.id ?? null;
    }

    if (!userId) {
      await ctx.reply(
        'Щоб підключити Telegram — збережи @username у профілі та натисни Start знову.',
        { reply_markup: { inline_keyboard: [[{ text: 'ВІДКРИТИ', url: `${getAppUrl()}/dashboard` }]] } },
      );
      return;
    }

    // fix: зберігаємо telegramUserId/telegramUserName
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramUserId: telegramUserId,
        ...(telegramUserName ? { telegramUserName } : {}),
      },
    });

    await sendWelcomeMessage(telegramUserId);
  } catch (err) {
    console.error('❌ Telegram /start error', err);
    await ctx.reply('Не вдалося підключити Telegram. Спробуй ще раз.');
  }
});

// ── callback_query (wheel PDF) ────────────────────────────────────────────────

bot.on('callback_query', async (ctx: Context) => {
  try {
    const cq = ctx.callbackQuery;
    if (!cq || !('data' in cq) || !cq.data.startsWith('wheel_pdf_')) return;

    const entryId = cq.data.replace('wheel_pdf_', '');

    const entry = await prisma.userBalanceEntry.findUnique({
      where:   { id: entryId },
      include: { user: true },
    });

    if (!entry) { await ctx.answerCbQuery('❌ Не знайдено'); return; }

    const scores = scoresFromMap(entry.scores);
    const weakest = findWeakest(scores);
    const focus   = findFocus(scores, weakest);

    const pdfData: WheelPDFData = {
      userName: entry.user?.firstName ?? entry.user?.email ?? 'Користувач',
      scores: scoresFromMap(entry.scores), 
      weakestSphere: weakest?.categoryId ?? '',
      focusSphere:   focus?.categoryId ?? weakest?.categoryId ?? '',
      analysis:      entry.note ?? '',
      createdAt:    entry.createdAt.toISOString(),
    };

const buffer = await createWheelPDF(pdfData);

    await ctx.telegram.sendDocument(
      ctx.from!.id,
      { source: buffer, filename: `wheel-${entryId}.pdf` },
      { caption: '🎡 Колесо балансу — PDF звіт' },
    );

    await ctx.answerCbQuery('✅ PDF надіслано!');
  } catch (err) {
    console.error('❌ Telegram callback error', err);
    await ctx.answerCbQuery('❌ Помилка');
  }
});