// backend/src/modules/wheel/wheel.telegram.ts
import { prisma } from '@/db/client.js';
import { Context, Telegraf } from 'telegraf';
import { verifyTelegramLinkCode } from '@/modules/social/service.js';
import { createWheelPDF } from './pdf.js';
import type { WheelPDFData, WheelScore } from './types.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

type TelegramSendResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      code?: string;
      action?: 'set_telegram_profile' | 'open_telegram_bot';
      botLink?: string;
    };

const getBotLink = () => {
  // fix code_x: requested default bot handle for onboarding flow.
  const username = process.env.TELEGRAM_BOT_USERNAME || 'Starway_byNadya_Bot';
  return `https://t.me/${username}`;
};

const getAppUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

async function sendWelcomeMessage(chatId: string) {
  const appUrl = getAppUrl();

  await bot.telegram.sendMessage(
    chatId,
    [
      'Привіт. Це Starway Mentor Bot.',
      'Ти тут, щоб щодня рухатись по системі: Стан -> Ціль -> Вибір -> Рішення -> Дія.',
      '',
      'Що буде далі:',
      '1) Починаємо з Колеса балансу.',
      '2) Щодня: ранкове та вечірнє питання.',
      '3) Щотижневі/місячні звіти, нагадування, мініапка, підтримка.',
      '',
      'Що доступно прямо зараз у меню нижче:',
      '- Кабінет',
      '- Колесо балансу',
      '- Звіти PDF',
      '- Підписки',
      '- AI Ментор',
      '- Статистика',
      '',
      'Бонус: найближчим часом додамо розширені сценарії воронок, Zoom-сесії та менторські пакети.',
    ].join('\n'),
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'ВІДКРИТИ', url: `${appUrl}/dashboard` },
          ],
          [
            { text: 'Кабінет', url: `${appUrl}/dashboard/profile` },
            { text: 'Колесо', url: `${appUrl}/dashboard/wheel` },
          ],
          [
            { text: 'Звіти PDF', url: `${appUrl}/dashboard/wheel` },
            { text: 'Підписки', url: `${appUrl}/dashboard/subscription` },
          ],
          [
            { text: 'AI Ментор', url: `${appUrl}/dashboard/ai-mentor` },
            { text: 'Статистика', url: `${appUrl}/dashboard/progress` },
          ],
        ],
      },
    },
  );
}

// ========== SEND WHEEL NOTIFICATION ==========
export async function sendWheelNotification(
  userId: string,
  wheelId: string,
): Promise<TelegramSendResult> {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return { ok: false, reason: 'TELEGRAM_BOT_TOKEN is not configured' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramChatId: true,
        telegramUserName: true,
      },
    });

    if (!user?.telegramChatId) {
      if (!user?.telegramUserName) {
        return {
          ok: false,
          code: 'telegram_username_missing',
          reason: 'Telegram ще не підключено. Вкажіть username, відкрийте @Starway_byNadya_Bot і натисніть Start.',
          action: 'set_telegram_profile',
          botLink: getBotLink(),
        };
      }

        return {
          ok: false,
          code: 'telegram_chat_not_linked',
          reason: 'Telegram username збережено, але чат ще не підтверджено. Відкрийте @Starway_byNadya_Bot і натисніть Start.',
          action: 'open_telegram_bot',
          botLink: getBotLink(),
        };
      }

    await bot.telegram.sendMessage(
      user.telegramChatId,
      '🎡 Твоє колесо балансу готове!\n\nНатисни кнопку, щоб отримати PDF-звіт з аналізом.',
      {
        reply_markup: {
          inline_keyboard: [[{ text: '📄 Отримати PDF', callback_data: `wheel_pdf_${wheelId}` }]],
        },
      },
    );

    console.log('✅ Telegram notification sent:', user.telegramChatId);
    return { ok: true };
  } catch (error) {
    console.error('❌ Telegram notification error:', error);
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Unknown telegram error',
    };
  }
}

// ========== /START HANDLER ==========
bot.start(async (ctx: Context) => {
  try {
    if (!ctx.from || !ctx.chat) return;

    const telegramChatId = String(ctx.chat.id);
    const telegramUserName = ctx.from.username ?? null;
    const payload = 'payload' in ctx ? String((ctx as any).payload || '') : '';

    let userId: string | null = null;

    // fix code_x: first trigger from any flow can link user by one-time code.
    if (payload.startsWith('link_')) {
      userId = await verifyTelegramLinkCode(payload);
    }

    if (!userId && telegramUserName) {
      const userByUsername = await prisma.user.findFirst({
        where: { telegramUserName },
        select: { id: true },
      });
      userId = userByUsername?.id || null;
    }

    if (!userId) {
      await ctx.reply(
        [
          'Щоб підключити Telegram, спочатку відкрий @Starway_byNadya_Bot і натисни Start.',
          'Потім повернись у кабінет та збережи свій @username у профілі.',
        ].join('\n'),
        {
          reply_markup: {
            inline_keyboard: [[{ text: 'ВІДКРИТИ', url: `${getAppUrl()}/dashboard` }]],
          },
        },
      );
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId,
        ...(telegramUserName ? { telegramUserName } : {}),
      },
    });

    await sendWelcomeMessage(telegramChatId);
  } catch (error) {
    console.error('❌ Telegram /start error:', error);
    await ctx.reply('Не вдалося завершити підключення Telegram. Спробуйте ще раз.');
  }
});

// ========== CALLBACK HANDLER ==========
bot.on('callback_query', async (ctx: Context) => {
  try {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const data = callbackQuery.data;
    if (!data.startsWith('wheel_pdf_')) return;

    const wheelId = data.replace('wheel_pdf_', '');

    const wheel = await prisma.wheelAssessment.findUnique({
      where: { id: wheelId },
      include: { user: true },
    });

    if (!wheel) {
      await ctx.answerCbQuery('❌ Колесо не знайдено');
      return;
    }

    // Parse scores
    let scores: WheelScore[] = [];
    if (Array.isArray(wheel.scores)) {
      scores = wheel.scores.map((s: any) => ({
        categoryId: s.categoryId,
        score: s.score,
        comment: s.comment ?? null,
      }));
    }

    const pdfData: WheelPDFData = {
      userName: wheel.user.firstName || wheel.user.name || wheel.user.email || 'Користувач',
      scores,
      weakestSphere: wheel.weakestSphere,
      focusSphere: wheel.focusSphere,
      analysis: wheel.analysis,
      createdAt: wheel.createdAt.toISOString(),
    };

    const pdfBuffer = await createWheelPDF(pdfData);

    await ctx.telegram.sendDocument(
      ctx.from!.id,
      { source: pdfBuffer, filename: `wheel-${wheel.id}.pdf` },
      { caption: '🎡 Твоє колесо балансу!\n\n📊 Використовуй цей аналіз для планування.' },
    );

    await ctx.answerCbQuery('✅ PDF надіслано!');
  } catch (error) {
    console.error('❌ Telegram callback error:', error);
    await ctx.answerCbQuery('❌ Помилка генерації PDF');
  }
});

export { bot };
