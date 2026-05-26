// backend/src/modules/zoom/zoom.availability.service.ts
// Recurring availability slots + session generation for Expert

import { Prisma } from '@starway/db/prisma-client';
import { prisma } from '../../db/client.js';
import { createFullSession } from './service.js';

export type ZoomSessionType = 'group_practice' | 'individual' | 'intensive' | 'battle_review';

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;       // 0=Sun, 1=Mon … 6=Sat
  hour: number;
  minute: number;
  timezone: string;
  sessionType: ZoomSessionType;
  maxSlots: number;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
  defaultTopic?: string;
}

function toAvailabilityJson(slots: AvailabilitySlot[]): Prisma.InputJsonValue {
  return slots as unknown as Prisma.InputJsonValue;
}

export async function getAvailability(expertId: string): Promise<AvailabilitySlot[]> {
  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    select: { zoomAvailability: true },
  });
  if (!expert) return [];
  const raw = expert.zoomAvailability;
  if (!Array.isArray(raw)) return [];
  return raw as unknown as AvailabilitySlot[];
}

export async function saveAvailability(
  expertId: string,
  slots: AvailabilitySlot[],
): Promise<void> {
  await prisma.expert.update({
    where: { id: expertId },
    data: { zoomAvailability: toAvailabilityJson(slots) },
  });
}

// Compute next `weeksAhead` dates for a given dayOfWeek/hour/minute.
// Timezone is always treated as Europe/Kyiv = UTC+3 (hard-coded offset).
function nextOccurrences(
  dayOfWeek: number,
  hour: number,
  minute: number,
  weeksAhead: number,
): Date[] {
  // Kyiv = UTC+3: convert local hour to UTC
  let utcHour = hour - 3;
  let dayAdj = 0;
  if (utcHour < 0) {
    utcHour += 24;
    dayAdj = -1; // slot crosses midnight when converted to UTC
  }

  const now = new Date();
  const todayUtcDay = now.getUTCDay(); // 0=Sun … 6=Sat

  // Days until next occurrence of dayOfWeek (in UTC; dayAdj shifts which UTC day the slot falls on)
  const targetUtcDay = ((dayOfWeek + dayAdj) % 7 + 7) % 7;
  let daysUntilFirst = (targetUtcDay - todayUtcDay + 7) % 7;

  // Build first candidate
  const first = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilFirst,
    utcHour,
    minute,
    0, 0,
  ));

  // If it's already passed, advance one week
  if (first <= now) {
    first.setUTCDate(first.getUTCDate() + 7);
  }

  return Array.from({ length: weeksAhead }, (_, w) => {
    const d = new Date(first);
    d.setUTCDate(first.getUTCDate() + w * 7);
    return d;
  });
}

function defaultTopicByType(type: ZoomSessionType): string {
  switch (type) {
    case 'group_practice': return 'ФОКУС · Zoom-практика';
    case 'individual':     return 'Індивідуальна стратегічна сесія';
    case 'intensive':      return 'Інтенсив AB System';
    case 'battle_review':  return 'Battle Review';
  }
}

export async function generateSessionsFromAvailability(
  expertId: string,
  weeksAhead = 4,
): Promise<{ created: number; skipped: number }> {
  const slots = await getAvailability(expertId);
  let created = 0;
  let skipped = 0;

  for (const slot of slots) {
    if (!slot.active) continue;

    const dates = nextOccurrences(slot.dayOfWeek, slot.hour, slot.minute, weeksAhead);

    for (const date of dates) {
      const windowStart = new Date(date.getTime() - 5 * 60 * 1000);
      const windowEnd   = new Date(date.getTime() + 5 * 60 * 1000);

      const existing = await prisma.zoomSession.findFirst({
        where: {
          expertId,
          scheduledAt: { gte: windowStart, lte: windowEnd },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await createFullSession({
        expertId,
        scheduledAt: date,
        topic: slot.defaultTopic ?? defaultTopicByType(slot.sessionType),
        requests: {
          type: slot.sessionType,
          maxSlots: slot.maxSlots,
          priceCents: slot.priceCents,
          durationMinutes: slot.durationMinutes,
          slotStatus: 'available',
          notify24h: true,
          notify2h: true,
          notifiedAt24h: null,
          notifiedAt2h: null,
        } as unknown as Prisma.InputJsonValue,
      });
      created++;
    }
  }

  return { created, skipped };
}

export async function seedDefaultAvailability(expertId: string): Promise<void> {
  const slots = await getAvailability(expertId);
  if (slots.length > 0) return;

  await saveAvailability(expertId, [
    {
      id: 'mon-focus',
      dayOfWeek: 1,
      hour: 19,
      minute: 0,
      timezone: 'Europe/Kyiv',
      sessionType: 'group_practice',
      maxSlots: 50,
      priceCents: 0,
      durationMinutes: 60,
      active: true,
      defaultTopic: 'ФОКУС · Zoom-практика',
    },
  ]);

  await generateSessionsFromAvailability(expertId, 4);
}
