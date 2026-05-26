// backend/src/modules/zoom/zoom.notifications.ts
// Cron: sends 24h and 2h pre-session Telegram alerts to registered attendees

import cron from 'node-cron';
import { Prisma } from '@starway/db/prisma-client';
import { prisma } from '../../db/client.js';
import { sendDedupedTelegramMessage } from '../../lib/telegram.js';
import {
  getAllUpcomingSessionsForNotification,
  patchSessionRequests,
} from './service.js';
import { generateSessionsFromAvailability } from './zoom.availability.service.js';

type SessionRequestsMeta = {
  type?: string;
  zoomLink?: string;
  notify24h?: boolean;
  notify2h?: boolean;
  notifiedAt24h?: string | null;
  notifiedAt2h?: string | null;
  [key: string]: unknown;
};

function parseMeta(raw: unknown): SessionRequestsMeta {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return {};
  return raw as SessionRequestsMeta;
}

async function getAttendeeTelegramIds(sessionId: string): Promise<{ userId: string; chatId: string | null }[]> {
  const attendees = await prisma.zoomSessionAttendee.findMany({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          telegramChatId: true,
          telegramLinks: {
            where: { isActive: true, chatId: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { chatId: true },
          },
        },
      },
    },
  });
  return attendees.map(a => ({
    userId: a.userId,
    chatId: a.user.telegramChatId ?? a.user.telegramLinks[0]?.chatId ?? null,
  }));
}

async function runNotificationCheck() {
  const now = new Date();
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const sessions = await getAllUpcomingSessionsForNotification(in25h);

  for (const session of sessions) {
    const meta = parseMeta(session.requests);
    const scheduledAt = new Date(session.scheduledAt);
    const msUntil = scheduledAt.getTime() - now.getTime();
    const hoursUntil = msUntil / (60 * 60 * 1000);

    let changed = false;

    // 24h alert
    if (meta.notify24h && !meta.notifiedAt24h && hoursUntil <= 25 && hoursUntil > 1.5) {
      const attendees = await getAttendeeTelegramIds(session.id);
      const time = scheduledAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      const dateStr = scheduledAt.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
      for (const { chatId } of attendees) {
        if (!chatId) continue;
        await sendDedupedTelegramMessage(
          chatId,
          `🔔 Нагадування: завтра о ${time} (${dateStr}) — Zoom-сесія "${session.topic}"\n\nГотуйся 💪`,
        ).catch(() => undefined);
      }
      meta.notifiedAt24h = now.toISOString();
      changed = true;
    }

    // 2h alert
    if (meta.notify2h && !meta.notifiedAt2h && hoursUntil <= 2.5 && hoursUntil > 0) {
      const attendees = await getAttendeeTelegramIds(session.id);
      const time = scheduledAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      for (const { chatId } of attendees) {
        if (!chatId) continue;
        await sendDedupedTelegramMessage(
          chatId,
          `⏰ Через 2 години — Zoom-сесія "${session.topic}" о ${time}\n\n${meta.zoomLink ? `Посилання: ${meta.zoomLink}` : 'Посилання буде в особистому кабінеті'}`,
        ).catch(() => undefined);
      }
      meta.notifiedAt2h = now.toISOString();
      changed = true;
    }

    if (changed) {
      await patchSessionRequests(session.id, meta as unknown as Prisma.InputJsonValue).catch(() => undefined);
    }
  }
}

export function startZoomNotificationsCron(): void {
  cron.schedule('*/15 * * * *', () => {
    runNotificationCheck().catch(err =>
      console.error('[zoom-notifications] cron error', err),
    );
  });

  // Every Sunday at 00:00 — generate sessions for the next 4 weeks
  cron.schedule('0 0 * * 0', () => {
    prisma.expert.findMany({ select: { id: true, zoomAvailability: true } })
      .then(experts => {
        for (const expert of experts) {
          const slots = expert.zoomAvailability;
          if (!Array.isArray(slots) || slots.length === 0) continue;
          generateSessionsFromAvailability(expert.id, 4).catch(err =>
            console.error('[zoom-notifications] weekly generate error', expert.id, err),
          );
        }
      })
      .catch(err => console.error('[zoom-notifications] Sunday cron error', err));
  });

  console.info('[zoom-notifications] cron started');
}
