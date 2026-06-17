// backend/src/modules/zoom/zoom.notifications.ts
// Cron: sends 24h and 2h pre-session Telegram alerts to registered attendees

import cron from 'node-cron';
import { Prisma } from '@starway/db/prisma-client';
import { prisma } from '../../db/client.js';
import { bot, sendDedupedTelegramMessage } from '../../lib/telegram.js';
import {
  getAllUpcomingSessionsForNotification,
  patchSessionRequests,
  expireStaleSwapRequests,
  syncChannelPost,
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

function formatWeeklySchedule(sessions: Array<{ scheduledAt: Date; topic: string }>): string {
  if (sessions.length === 0) return '📅 На цьому тижні групових Zoom-практик поки не заплановано.'
  const lines = sessions.map((session) => {
    const day = session.scheduledAt.toLocaleDateString('uk-UA', { weekday: 'short' })
    const date = session.scheduledAt.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })
    const time = session.scheduledAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    return `${day} ${date} о ${time} — ${session.topic}`
  })
  return `📅 Розклад Zoom на тиждень:\n${lines.join('\n')}`
}

export async function notifySwapProposal(targetTelegramId: string, swapDetails: {
  requesterName: string
  fromSlot: string
  toSlot: string
  swapId: string
  sessionIdTo: string
}) {
  const text =
    `💱 ${swapDetails.requesterName} пропонує обмін слотом\n`
    + `Їхній слот: ${swapDetails.fromSlot}\n`
    + `Твій слот: ${swapDetails.toSlot}`
  await sendDedupedTelegramMessage(targetTelegramId, text, {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Погодитись', callback_data: `zoom:swap:accept:${swapDetails.swapId}:${swapDetails.sessionIdTo}` },
        { text: '❌ Відхилити', callback_data: `zoom:swap:decline:${swapDetails.swapId}` },
      ]],
    },
  }).catch(() => undefined)
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

async function getGroupPracticeRecipientTelegramIds(): Promise<{ userId: string; chatId: string | null }[]> {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      telegramEnabled: { not: false },
    },
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
  });

  return users.map((user) => ({
    userId: user.id,
    chatId: user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null,
  }));
}

async function runNotificationCheck() {
  const now = new Date();
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const sessions = await getAllUpcomingSessionsForNotification(in25h);

  for (const session of sessions) {
    const meta = parseMeta(session.requests);
    const sessionType = typeof meta.type === 'string' ? meta.type : '';
    const scheduledAt = new Date(session.scheduledAt);
    const msUntil = scheduledAt.getTime() - now.getTime();
    const hoursUntil = msUntil / (60 * 60 * 1000);

    let changed = false;

    // 24h alert
    if (meta.notify24h && !meta.notifiedAt24h && hoursUntil <= 25 && hoursUntil > 1.5) {
      const attendees =
        sessionType === 'group_practice'
          ? await getGroupPracticeRecipientTelegramIds()
          : await getAttendeeTelegramIds(session.id);
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
      const attendees =
        sessionType === 'group_practice'
          ? await getGroupPracticeRecipientTelegramIds()
          : await getAttendeeTelegramIds(session.id);
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

  // Every Sunday 18:00 — keep pinned channel schedule post up-to-date.
  cron.schedule('0 18 * * 0', () => {
    syncChannelPost(bot).catch((err) =>
      console.error('[zoom-notifications] weekly channel sync error', err),
    );
  });

  // Every 30 minutes — expire stale swap requests and notify requesters.
  cron.schedule('*/30 * * * *', () => {
    expireStaleSwapRequests()
      .then(async ({ expired }) => {
        if (expired.length === 0) return
        const users = await prisma.user.findMany({
          where: { id: { in: expired.map((item) => item.requesterId) } },
          select: { id: true, telegramChatId: true },
        })
        const byId = new Map(users.map((user) => [user.id, user.telegramChatId]))
        await Promise.all(
          expired.map((item) => {
            const chatId = byId.get(item.requesterId)
            if (!chatId) return Promise.resolve()
            return sendDedupedTelegramMessage(chatId, '⏱ Час обміну вийшов. Ніхто не відповів.').catch(() => undefined)
          }),
        )
      })
      .catch((err) => console.error('[zoom-notifications] swap expiry cron error', err))
  })

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
