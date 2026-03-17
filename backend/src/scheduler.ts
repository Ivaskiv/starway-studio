import { prisma } from './db/client.js';
import { generateWeeklyReport } from './modules/ai-mentor/services.js';
import type { Telegraf } from 'telegraf';

const THROTTLE_MS = 3000;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function runWeeklyReports(): Promise<void> {
  console.log('[Scheduler] Starting weekly reports...');

  const owners = await prisma.user.findMany({
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
  });

  console.log(`[Scheduler] ${owners.length} owners to process`);
  let success = 0;
  let failed = 0;

  for (const owner of owners) {
    const product = owner.ownedProducts[0];
    if (!product) continue;

    try {
      await generateWeeklyReport(owner.id, product.id);
      success++;

      const telegramId = owner.telegramUserId;
      if (telegramId && product.botConfig?.botToken) {
        try {
          const { Telegraf: TelegrafCtor } = await import('telegraf');
          const bot: Telegraf = new TelegrafCtor(product.botConfig.botToken);
          await bot.telegram.sendMessage(
            telegramId,
            '✅ Твій щотижневий AI-звіт готовий → Dashboard / Content'
          );
        } catch (tgErr) {
          console.error(`[Scheduler] Telegram failed for ${owner.id}:`, tgErr);
        }
      }
    } catch (err) {
      failed++;
      console.error(`[Scheduler] Failed for owner ${owner.id}:`, err);
    }

    await sleep(THROTTLE_MS);
  }

  console.log(`[Scheduler] Done. success=${success} failed=${failed}`);
}

export function startScheduler(): void {
  function msUntilNextMonday9am(): number {
    const now = new Date();
    const kyiv = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const day = kyiv.getDay();
    const daysUntilMonday = (1 - day + 7) % 7 || 7;
    const next = new Date(kyiv);
    next.setDate(kyiv.getDate() + daysUntilMonday);
    next.setHours(9, 0, 0, 0);
    return next.getTime() - kyiv.getTime();
  }

  function scheduleNext() {
    const delay = msUntilNextMonday9am();
    console.log(`[Scheduler] Next run in ${Math.round(delay / 1000 / 60)} min`);
    setTimeout(() => {
      runWeeklyReports()
        .catch(err => console.error('[Scheduler] Error:', err))
        .finally(scheduleNext);
    }, delay);
  }

  scheduleNext();
  console.log('[Scheduler] Registered: Mon 09:00 Kyiv');
}
