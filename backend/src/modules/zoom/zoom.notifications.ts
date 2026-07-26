// backend/src/modules/zoom/zoom.notifications.ts
// Canonical scheduler handlers for Zoom reminders and maintenance.
import { Prisma } from '@starway/db/prisma-client';
import { prisma } from '../../db/client.js';
import { bot, sendDedupedTelegramMessage } from '../../lib/telegram.js';
import { FOCUS_PRODUCT_CODES } from '../subscriptions/payments/focus.access.js';
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

async function getCoachRecipientTelegramIds(expertId: string | null | undefined): Promise<{ userId: string; chatId: string | null }[]> {
  if (!expertId) return []

  const coaches = await prisma.user.findMany({
    where: {
      expertId,
      deletedAt: null,
      role: { in: ['EXPERT', 'SUPERADMIN'] },
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
  })

  return coaches.map((coach) => ({
    userId: coach.id,
    chatId: coach.telegramChatId ?? coach.telegramLinks[0]?.chatId ?? null,
  }))
}

function mergeRecipients(...groups: Array<Array<{ userId: string; chatId: string | null }>>): Array<{ userId: string; chatId: string | null }> {
  const deduped = new Map<string, { userId: string; chatId: string | null }>()

  for (const group of groups) {
    for (const recipient of group) {
      const key = recipient.chatId?.trim() || `user:${recipient.userId}`
      if (!deduped.has(key)) {
        deduped.set(key, recipient)
      }
    }
  }

  return [...deduped.values()]
}

async function getGroupPracticeRecipientTelegramIds(): Promise<{ userId: string; chatId: string | null }[]> {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      telegramEnabled: { not: false },
      productSubscriptions: {
        some: {
          status: 'ACTIVE',
          product: {
            is: {
              code: { in: [...FOCUS_PRODUCT_CODES] },
            },
          },
        },
      },
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
      const coachRecipients = await getCoachRecipientTelegramIds(session.expertId)
      const recipients = mergeRecipients(attendees, coachRecipients)
      const time = scheduledAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      const dateStr = scheduledAt.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
      for (const { chatId } of recipients) {
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
      const coachRecipients = await getCoachRecipientTelegramIds(session.expertId)
      const recipients = mergeRecipients(attendees, coachRecipients)
      const time = scheduledAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      for (const { chatId } of recipients) {
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

export async function syncZoomWeeklyChannelPostCron(): Promise<void> {
  await syncChannelPost(bot)
}

export async function expireZoomSwapRequestsCron(): Promise<void> {
  const { expired } = await expireStaleSwapRequests()
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
}

export async function generateZoomSessionsFromAvailabilityCron(): Promise<void> {
  const experts = await prisma.expert.findMany({
    select: { id: true, zoomAvailability: true },
  })

  await Promise.all(
    experts.map(async (expert) => {
      const slots = expert.zoomAvailability
      if (!Array.isArray(slots) || slots.length === 0) return
      await generateSessionsFromAvailability(expert.id, 4)
    }),
  )
}
