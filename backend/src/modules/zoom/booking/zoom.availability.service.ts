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
  endHour?: number;
  endMinute?: number;
  active: boolean;
  defaultTopic?: string;
}

export const INDIVIDUAL_DURATION_MINUTES = 60;
export const INDIVIDUAL_SLOT_INCREMENT_MINUTES = 15;

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

export type IndividualAvailabilityCandidate = {
  scheduledAt: string;
  available: boolean;
  reason: string | null;
};

export type IndividualAvailabilitySummaryDay = {
  date: string;
  hasIndividualWindow: boolean;
  availableCount: number;
  hasAvailableIndividual: boolean;
};

type AvailabilityDb = Pick<Prisma.TransactionClient, 'expert' | 'zoomSession' | 'zoomCommerceRequest' | 'zoomAvailabilityOverride'>;

export type AvailabilityWeekDay = {
  date: string;
  source: 'recurring' | 'override';
  hasOverride: boolean;
  windows: AvailabilitySlot[];
};

export type AvailabilityWeekChange = {
  date: string;
  windows?: AvailabilitySlot[];
  reset?: boolean;
};

function intervalOverlaps(
  candidateStart: Date,
  candidateEnd: Date,
  existingStart: Date,
  existingEnd: Date,
): boolean {
  return candidateStart < existingEnd && candidateEnd > existingStart;
}

export function intervalsOverlap(
  candidateStart: Date,
  candidateEnd: Date,
  existingStart: Date,
  existingEnd: Date,
): boolean {
  return intervalOverlaps(candidateStart, candidateEnd, existingStart, existingEnd);
}

function sessionDurationMinutes(requests: unknown): number {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object') {
    return INDIVIDUAL_DURATION_MINUTES;
  }
  const duration = (requests as Record<string, unknown>).durationMinutes;
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0
    ? duration
    : INDIVIDUAL_DURATION_MINUTES;
}

function datePartsFromKey(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? { year, month, day }
    : null;
}

function dateForStorage(date: string): Date {
  const parts = datePartsFromKey(date);
  if (!parts) throw new Error('invalid_date');
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = getTimeZoneDateParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function weekdayInTimeZone(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

function individualWindowForDate(slot: AvailabilitySlot, date: string, ignoreWeekday = false): { start: Date; end: Date } | null {
  if (!slot.active || slot.sessionType !== 'individual') return null;
  const dateParts = datePartsFromKey(date);
  if (!dateParts) return null;
  const timeZone = slot.timezone || DEFAULT_ZOOM_TIMEZONE;
  const localNoon = createUtcDateForTimeZone({ ...dateParts, hour: 12, minute: 0, timeZone });
  if (!ignoreWeekday && weekdayInTimeZone(localNoon, timeZone) !== slot.dayOfWeek) return null;

  const start = createUtcDateForTimeZone({ ...dateParts, hour: slot.hour, minute: slot.minute, timeZone });
  const hasExplicitEnd = Number.isInteger(slot.endHour) && Number.isInteger(slot.endMinute);
  const end = hasExplicitEnd
    ? createUtcDateForTimeZone({ ...dateParts, hour: slot.endHour!, minute: slot.endMinute!, timeZone })
    : new Date(start.getTime() + slot.durationMinutes * 60_000);
  return end > start ? { start, end } : null;
}

async function loadAvailability(db: AvailabilityDb, expertId: string): Promise<AvailabilitySlot[]> {
  const expert = await db.expert.findUnique({ where: { id: expertId }, select: { zoomAvailability: true } });
  return expert && Array.isArray(expert.zoomAvailability)
    ? expert.zoomAvailability as unknown as AvailabilitySlot[]
    : [];
}

function windowsForDate(slots: AvailabilitySlot[], date: string, source: 'recurring' | 'override') {
  return slots
    .map((slot) => individualWindowForDate(slot, date, source === 'override'))
    .filter((window): window is { start: Date; end: Date } => Boolean(window));
}

function weekdayForDateKey(date: string): number {
  const parts = datePartsFromKey(date);
  if (!parts) throw new Error('invalid_date');
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function normalizeOverrideWindows(date: string, windows: AvailabilitySlot[]): AvailabilitySlot[] {
  const dayOfWeek = weekdayForDateKey(date);
  const normalized = windows.map((window) => ({ ...window, dayOfWeek, sessionType: 'individual' as const, durationMinutes: INDIVIDUAL_DURATION_MINUTES, active: true }));
  const intervals = normalized.map((window) => {
    const start = window.hour * 60 + window.minute;
    const end = (window.endHour ?? window.hour + 1) * 60 + (window.endMinute ?? window.minute);
    if (!Number.isInteger(window.hour) || !Number.isInteger(window.minute) || !Number.isInteger(window.endHour) || !Number.isInteger(window.endMinute)
      || window.hour < 0 || window.hour > 23 || window.endHour! < 0 || window.endHour! > 23
      || window.minute < 0 || window.minute > 59 || window.endMinute! < 0 || window.endMinute! > 59
      || window.minute % INDIVIDUAL_SLOT_INCREMENT_MINUTES !== 0 || window.endMinute! % INDIVIDUAL_SLOT_INCREMENT_MINUTES !== 0
      || start >= end || end - start < INDIVIDUAL_DURATION_MINUTES) throw new Error('invalid_availability_window');
    return { start, end };
  }).sort((left, right) => left.start - right.start);
  if (intervals.some((interval, index) => index > 0 && interval.start < intervals[index - 1]!.end)) {
    throw new Error('overlapping_availability_windows');
  }
  return normalized;
}

function overrideTimeZone(windows: AvailabilitySlot[]): string {
  const timezone = windows[0]?.timezone || DEFAULT_ZOOM_TIMEZONE;
  if (windows.some((window) => (window.timezone || DEFAULT_ZOOM_TIMEZONE) !== timezone)) {
    throw new Error('invalid_availability_window');
  }
  return timezone;
}

function weekDateKeys(from: string): string[] {
  const start = datePartsFromKey(from);
  if (!start) throw new Error('invalid_date');
  const monday = new Date(Date.UTC(start.year, start.month - 1, start.day));
  if (monday.getUTCDay() !== 1) throw new Error('week_must_start_monday');
  return Array.from({ length: 7 }, (_, index) => addDays(from, index));
}

export async function getAvailabilityWeek(expertId: string, from: string): Promise<AvailabilityWeekDay[]> {
  const dates = weekDateKeys(from);
  const [slots, overrides] = await Promise.all([
    getAvailability(expertId),
    prisma.zoomAvailabilityOverride.findMany({
      where: { expertId, date: { gte: dateForStorage(dates[0]!), lte: dateForStorage(dates[6]!) } },
      select: { date: true, windows: true },
    }),
  ]);
  const byDate = new Map(overrides.map((override) => [dateKeyInTimeZone(override.date, 'UTC'), override.windows as unknown as AvailabilitySlot[]]));
  return dates.map((date) => {
    const override = byDate.get(date);
    const source = override === undefined ? 'recurring' : 'override';
    const sourceSlots = override ?? slots;
    return { date, source, hasOverride: override !== undefined, windows: sourceSlots.filter((slot) => source === 'override' || slot.dayOfWeek === weekdayForDateKey(date)).map((slot) => ({ ...slot, dayOfWeek: weekdayForDateKey(date) })) };
  });
}

export async function saveAvailabilityWeek(input: { expertId: string; from: string; days: AvailabilityWeekChange[] }): Promise<void> {
  const allowedDates = new Set(weekDateKeys(input.from));
  if (input.days.length > 7 || new Set(input.days.map((day) => day.date)).size !== input.days.length || input.days.some((day) => !allowedDates.has(day.date) || (day.reset !== true && !Array.isArray(day.windows)))) {
    throw new Error('invalid_availability_week');
  }
  const changes = input.days.map((day) => {
    const windows = day.reset ? undefined : normalizeOverrideWindows(day.date, day.windows!);
    return { ...day, windows, timezone: windows ? overrideTimeZone(windows) : undefined };
  });
  await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      const where = { expertId_date: { expertId: input.expertId, date: dateForStorage(change.date) } };
      if (change.reset) await tx.zoomAvailabilityOverride.delete({ where }).catch((error: unknown) => {
        if ((error as { code?: string }).code !== 'P2025') throw error;
      });
      else await tx.zoomAvailabilityOverride.upsert({ where, update: { timezone: change.timezone!, windows: toAvailabilityJson(change.windows!) }, create: { expertId: input.expertId, date: dateForStorage(change.date), timezone: change.timezone!, windows: toAvailabilityJson(change.windows!) } });
    }
  });
}

async function loadEffectiveAvailabilityForDate(db: AvailabilityDb, expertId: string, date: string) {
  const [slots, override] = await Promise.all([
    loadAvailability(db, expertId),
    db.zoomAvailabilityOverride.findUnique({ where: { expertId_date: { expertId, date: dateForStorage(date) } }, select: { windows: true } }),
  ]);
  return override === null ? { slots, source: 'recurring' as const } : { slots: override.windows as unknown as AvailabilitySlot[], source: 'override' as const };
}

async function getBlockingCalendarEntries(db: AvailabilityDb, expertId: string, candidateEnd: Date) {
  const [sessions, requests] = await Promise.all([
    db.zoomSession.findMany({
      where: { expertId, status: { not: 'CANCELLED' }, scheduledAt: { lt: candidateEnd } },
      select: {
        scheduledAt: true,
        requests: true,
        type: true,
        commerceRequests: { select: { id: true, kind: true, status: true, approvedAt: true, scheduledAt: true } },
      },
    }),
    db.zoomCommerceRequest.findMany({
      where: {
        expertId,
        kind: 'INDIVIDUAL',
        scheduledAt: { lt: candidateEnd },
      },
      select: { id: true, scheduledAt: true, status: true, approvedAt: true },
    }),
  ]);
  return { sessions, requests };
}

export function resolveIndividualPaymentDeadline(input: {
  approvedAt: Date;
  scheduledAt: Date;
}): Date {
  const HOUR = 60 * 60 * 1000;
  const MINUTE = 60 * 1000;
  return new Date(Math.min(
    input.approvedAt.getTime() + HOUR,
    input.scheduledAt.getTime() - 30 * MINUTE,
  ));
}

function commerceBlocksIndividualInventory(entry: {
  status: string;
  approvedAt: Date | null;
  scheduledAt: Date;
}, now: Date): boolean {
  if (entry.status === 'PAID') return true;
  return entry.status === 'APPROVED_PENDING_PAYMENT'
    && entry.approvedAt !== null
    && resolveIndividualPaymentDeadline({
      approvedAt: entry.approvedAt,
      scheduledAt: entry.scheduledAt,
    }) > now;
}

function sessionBlocksIndividualInventory(entry: {
  type: string;
  commerceRequests?: Array<{ id: string; kind: string; status: string; approvedAt: Date | null; scheduledAt: Date }>;
}, now: Date, excludeCommerceRequestId?: string): boolean {
  const individualCommerce = entry.commerceRequests?.filter((request) => request.kind === 'INDIVIDUAL') ?? [];
  if (individualCommerce.length === 0) return true;
  return individualCommerce.some((request) =>
    request.id !== excludeCommerceRequestId && commerceBlocksIndividualInventory(request, now),
  );
}

function sessionConflictReason(): string {
  return 'Зайнято';
}

export async function getIndividualAvailabilityForDate(input: {
  expertId: string;
  date: string;
  db?: AvailabilityDb;
  excludeCommerceRequestId?: string;
}): Promise<IndividualAvailabilityCandidate[]> {
  const db = input.db ?? prisma;
  const effective = await loadEffectiveAvailabilityForDate(db, input.expertId, input.date);
  const candidateStarts = individualCandidateStarts(effective.slots, input.date, effective.source);
  if (candidateStarts.length === 0) return [];
  const latestCandidateEnd = new Date(candidateStarts[candidateStarts.length - 1] + INDIVIDUAL_DURATION_MINUTES * 60_000);
  const blocking = await getBlockingCalendarEntries(db, input.expertId, latestCandidateEnd);
  return evaluateIndividualCandidates(candidateStarts, blocking, input.excludeCommerceRequestId);
}

function individualWindowsForDate(slots: AvailabilitySlot[], date: string, source: 'recurring' | 'override' = 'recurring') {
  return windowsForDate(slots, date, source);
}

function individualCandidateStarts(slots: AvailabilitySlot[], date: string, source: 'recurring' | 'override' = 'recurring'): number[] {
  const windows = individualWindowsForDate(slots, date, source);
  return [...new Set(windows.flatMap(({ start, end }) => {
    const candidates: number[] = [];
    for (let time = start.getTime(); time + INDIVIDUAL_DURATION_MINUTES * 60_000 <= end.getTime(); time += INDIVIDUAL_SLOT_INCREMENT_MINUTES * 60_000) {
      candidates.push(time);
    }
    return candidates;
  }))].sort((left, right) => left - right);
}

function evaluateIndividualCandidates(
  candidateStarts: number[],
  blocking: Awaited<ReturnType<typeof getBlockingCalendarEntries>>,
  excludeCommerceRequestId?: string,
): IndividualAvailabilityCandidate[] {
  const now = new Date();
  return candidateStarts.map((time) => {
    const start = new Date(time);
    const end = new Date(time + INDIVIDUAL_DURATION_MINUTES * 60_000);
    const session = blocking.sessions.find((entry) => sessionBlocksIndividualInventory(entry, now, excludeCommerceRequestId)
      && intervalOverlaps(
        start,
        end,
        entry.scheduledAt,
        new Date(entry.scheduledAt.getTime() + sessionDurationMinutes(entry.requests) * 60_000),
      ));
    if (session) return { scheduledAt: start.toISOString(), available: false, reason: sessionConflictReason() };
    const request = blocking.requests.find((entry) =>
      (excludeCommerceRequestId === undefined || entry.id !== excludeCommerceRequestId)
      && commerceBlocksIndividualInventory(entry, now)
      && intervalOverlaps(
        start,
        end,
        entry.scheduledAt,
        new Date(entry.scheduledAt.getTime() + INDIVIDUAL_DURATION_MINUTES * 60_000),
      ));
    return request
      ? { scheduledAt: start.toISOString(), available: false, reason: 'Зайнято' }
      : { scheduledAt: start.toISOString(), available: true, reason: null };
  });
}

function addDays(date: string, offset: number): string {
  const parts = datePartsFromKey(date);
  if (!parts) throw new Error('invalid_date');
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

export async function getIndividualAvailabilitySummary(input: {
  expertId: string;
  from: string;
  to: string;
  db?: AvailabilityDb;
}): Promise<IndividualAvailabilitySummaryDay[]> {
  const from = datePartsFromKey(input.from);
  const to = datePartsFromKey(input.to);
  if (!from || !to) throw new Error('invalid_date');
  const rangeDays = Math.floor((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000) + 1;
  if (rangeDays < 1 || rangeDays > 42) throw new Error('invalid_date_range');

  const db = input.db ?? prisma;
  const slots = await loadAvailability(db, input.expertId);
  const dates = Array.from({ length: rangeDays }, (_, index) => addDays(input.from, index));
  const candidateStartsByDate = new Map(dates.map((date) => [date, individualCandidateStarts(slots, date)]));
  const latestCandidateStart = Math.max(...[...candidateStartsByDate.values()].flat(), Number.NEGATIVE_INFINITY);
  const blocking = Number.isFinite(latestCandidateStart)
    ? await getBlockingCalendarEntries(
      db,
      input.expertId,
      new Date(latestCandidateStart + INDIVIDUAL_DURATION_MINUTES * 60_000),
    )
    : { sessions: [], requests: [] };

  return dates.map((date) => {
    const candidates = candidateStartsByDate.get(date) ?? [];
    const availability = evaluateIndividualCandidates(candidates, blocking);
    const availableCount = availability.filter((candidate) => candidate.available).length;
    return {
      date,
      hasIndividualWindow: individualWindowsForDate(slots, date).length > 0,
      availableCount,
      hasAvailableIndividual: availableCount > 0,
    };
  });
}

export async function getIndividualAvailabilityForScheduledAt(input: {
  expertId: string;
  scheduledAt: Date;
  db?: AvailabilityDb;
  excludeCommerceRequestId?: string;
}) {
  const db = input.db ?? prisma;
  const slots = await loadAvailability(db, input.expertId);
  const timeZone = slots.find((slot) => slot.active && slot.sessionType === 'individual')?.timezone || DEFAULT_ZOOM_TIMEZONE;
  const date = dateKeyInTimeZone(input.scheduledAt, timeZone);
  const candidates = await getIndividualAvailabilityForDate({
    expertId: input.expertId,
    date,
    db,
    excludeCommerceRequestId: input.excludeCommerceRequestId,
  });
  const candidate = candidates.find((item) => item.scheduledAt === input.scheduledAt.toISOString());
  return {
    candidate: candidate ?? { scheduledAt: input.scheduledAt.toISOString(), available: false, reason: 'Час недоступний у розкладі коуча' },
    alternatives: candidates.filter((item) => item.available).slice(0, 4),
  };
}

export async function hasCoachCalendarConflict(input: {
  expertId: string;
  scheduledAt: Date;
  durationMinutes: number;
  db?: Pick<Prisma.TransactionClient, 'zoomSession'>;
  excludeSessionId?: string;
}): Promise<boolean> {
  const db = input.db ?? prisma;
  const endsAt = new Date(input.scheduledAt.getTime() + input.durationMinutes * 60_000);
  const sessions = await db.zoomSession.findMany({
    where: {
      expertId: input.expertId,
      id: input.excludeSessionId ? { not: input.excludeSessionId } : undefined,
      status: { not: 'CANCELLED' },
      scheduledAt: { lt: endsAt },
    },
    select: { scheduledAt: true, requests: true },
  });
  return sessions.some((session) => intervalOverlaps(
    input.scheduledAt,
    endsAt,
    session.scheduledAt,
    new Date(session.scheduledAt.getTime() + sessionDurationMinutes(session.requests) * 60_000),
  ));
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
