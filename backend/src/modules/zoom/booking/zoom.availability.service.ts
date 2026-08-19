// backend/src/modules/zoom/zoom.availability.service.ts
// Recurring availability slots + session generation for Expert

import { Prisma } from '@starway/db/prisma-client';
import { prisma } from '../../../db/client.js';
import { createFullSession } from '../index.js';

export type ZoomSessionType = 'group_practice' | 'individual' | 'intensive' | 'battle_review';
const DEFAULT_ZOOM_TIMEZONE = 'Europe/Kyiv';

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

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneDateParts(date, timeZone);
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return utcTimestamp - date.getTime();
}

function createUtcDateForTimeZone(input: {
  year: number
  month: number
  day: number
  hour?: number
  minute?: number
  second?: number
  millisecond?: number
  timeZone: string
}) {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour ?? 0,
    input.minute ?? 0,
    input.second ?? 0,
    input.millisecond ?? 0,
  );
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), input.timeZone);
  return new Date(utcGuess - offset);
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

// Compute next `weeksAhead` dates for a recurring slot in the slot timezone.
function nextOccurrences(
  dayOfWeek: number,
  hour: number,
  minute: number,
  weeksAhead: number,
  timeZone = DEFAULT_ZOOM_TIMEZONE,
  now = new Date(),
): Date[] {
  const localNow = getTimeZoneDateParts(now, timeZone);
  const localReferenceDate = createUtcDateForTimeZone({
    year: localNow.year,
    month: localNow.month,
    day: localNow.day,
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone,
  });
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(localReferenceDate);
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  let daysUntilFirst = (dayOfWeek - Math.max(weekdayIndex, 0) + 7) % 7;

  const first = createUtcDateForTimeZone({
    year: localNow.year,
    month: localNow.month,
    day: localNow.day + daysUntilFirst,
    hour,
    minute,
    second: 0,
    millisecond: 0,
    timeZone,
  });

  if (first <= now) {
    daysUntilFirst += 7;
  }

  return Array.from({ length: weeksAhead }, (_, w) => {
    return createUtcDateForTimeZone({
      year: localNow.year,
      month: localNow.month,
      day: localNow.day + daysUntilFirst + w * 7,
      hour,
      minute,
      second: 0,
      millisecond: 0,
      timeZone,
    });
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
const DEFAULT_GROUP_PRACTICE_QUESTIONS = [
  'Як не зриватись на вихідних',
  'Планування тижня з дітьми',
  'Повернення після відпустки',
] as const

export async function generateSessionsFromAvailability(
  expertId: string,
  weeksAhead = 4,
  now = new Date(),
): Promise<{ created: number; skipped: number }> {
  const slots = await getAvailability(expertId);
  let created = 0;
  let skipped = 0;

  for (const slot of slots) {
    if (!slot.active) continue;

    const dates = nextOccurrences(
      slot.dayOfWeek,
      slot.hour,
      slot.minute,
      weeksAhead,
      slot.timezone || DEFAULT_ZOOM_TIMEZONE,
      now,
    );

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

        starterQuestions:
          slot.sessionType === 'group_practice'
            ? [...DEFAULT_GROUP_PRACTICE_QUESTIONS]
            : [],

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

export async function seedDefaultAvailability(expertId: string): Promise<{
  seeded: boolean
  created: number
  skipped: number
}> {
  const slots = await getAvailability(expertId);
  if (slots.length > 0) {
    return {
      seeded: false,
      created: 0,
      skipped: 0,
    }
  }

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

  const result = await generateSessionsFromAvailability(expertId, 4);

  return {
    seeded: true,
    created: result.created,
    skipped: result.skipped,
  }
}
