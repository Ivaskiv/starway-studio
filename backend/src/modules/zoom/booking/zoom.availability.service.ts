// backend/src/modules/zoom/zoom.availability.service.ts
// Recurring availability slots + session generation for Expert

import { Prisma, ZoomSessionType as PrismaZoomSessionType, ZoomStatus } from '@starway/db/prisma-client';
import { prisma } from '../../../db/client.js';
import {
  createFullSession,
  findCanonicalMondayGroupPractice,
} from '../core/zoom.session.service.js';
import { rescheduleGroupPracticeNotifications } from '../notifications/zoom.reminders.service.js';
import { getKyivDateKey, isKyivMonday, resolveRequestedSessionType } from '../shared/zoom.session-selection.js';

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

function individualWindowForDate(slot: AvailabilitySlot, date: string, ignoreWeekday = false, includeAllTypes = false): { start: Date; end: Date } | null {
  if (!slot.active || (!includeAllTypes && slot.sessionType !== 'individual')) return null;
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

function windowsForDate(slots: AvailabilitySlot[], date: string, source: 'recurring' | 'override', includeAllTypes = false) {
  return slots
    .map((slot) => individualWindowForDate(slot, date, source === 'override', includeAllTypes))
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
        id: true,
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
        status: { in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT', 'PAID'] },
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
  const sessionLimit = input.scheduledAt.getTime() - 30 * MINUTE;
  const rawDeadline = Math.min(input.approvedAt.getTime() + HOUR, sessionLimit);
  const roundedDeadline = Math.ceil(rawDeadline / (5 * MINUTE)) * 5 * MINUTE;

  return new Date(Math.min(roundedDeadline, sessionLimit));
}

function commerceBlocksIndividualInventory(entry: {
  status: string;
  approvedAt: Date | null;
  scheduledAt: Date;
}, now: Date): boolean {
  if (entry.status === 'REQUESTED' || entry.status === 'PAID') return true;
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
  excludeSessionId?: string;
}): Promise<IndividualAvailabilityCandidate[]> {
  const db = input.db ?? prisma;
  const effective = await loadEffectiveAvailabilityForDate(db, input.expertId, input.date);
  const candidateStarts = individualCandidateStarts(effective.slots, input.date, effective.source);
  if (candidateStarts.length === 0) return [];
  const latestCandidateEnd = new Date(candidateStarts[candidateStarts.length - 1] + INDIVIDUAL_DURATION_MINUTES * 60_000);
  const blocking = await getBlockingCalendarEntries(db, input.expertId, latestCandidateEnd);
  return evaluateIndividualCandidates(
    candidateStarts,
    blocking,
    input.excludeCommerceRequestId,
    input.excludeSessionId,
  );
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
  excludeSessionId?: string,
): IndividualAvailabilityCandidate[] {
  const now = new Date();
  return candidateStarts.map((time) => {
    const start = new Date(time);
    const end = new Date(time + INDIVIDUAL_DURATION_MINUTES * 60_000);
    const session = blocking.sessions.find((entry) => (excludeSessionId === undefined || entry.id !== excludeSessionId)
      && sessionBlocksIndividualInventory(entry, now, excludeCommerceRequestId)
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
  const dates = Array.from({ length: rangeDays }, (_, index) => addDays(input.from, index));
  const [slots, overrides] = await Promise.all([
    loadAvailability(db, input.expertId),
    db.zoomAvailabilityOverride.findMany({
      where: {
        expertId: input.expertId,
        date: { gte: dateForStorage(input.from), lte: dateForStorage(input.to) },
      },
      select: { date: true, windows: true },
    }),
  ]);
  const overridesByDate = new Map(overrides.map((override) => [
    dateKeyInTimeZone(override.date, 'UTC'),
    override.windows as unknown as AvailabilitySlot[],
  ]));
  const candidateStartsByDate = new Map(dates.map((date) => {
    const override = overridesByDate.get(date);
    return [date, individualCandidateStarts(override ?? slots, date, override === undefined ? 'recurring' : 'override')];
  }));
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
      hasIndividualWindow: individualWindowsForDate(
        overridesByDate.get(date) ?? slots,
        date,
        overridesByDate.has(date) ? 'override' : 'recurring',
      ).length > 0,
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
  excludeSessionId?: string;
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
    excludeSessionId: input.excludeSessionId,
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

export type CoachRescheduleResult = {
  session: {
    id: string;
    expertId: string | null;
    scheduledAt: Date;
    topic: string;
    status: ZoomStatus;
    type: PrismaZoomSessionType;
    capacity: number;
    requests: Prisma.JsonValue;
    postSessionReport: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  };
  idempotent: boolean;
};

function isIndividualSession(session: {
  type: PrismaZoomSessionType;
  requests: Prisma.JsonValue;
}): boolean {
  return session.type === PrismaZoomSessionType.INDIVIDUAL
    || session.type === PrismaZoomSessionType.PRIVATE
    || resolveRequestedSessionType(session.requests) === 'individual';
}

function isGroupPracticeSession(session: {
  type: PrismaZoomSessionType;
  requests: Prisma.JsonValue;
}): boolean {
  return session.type === PrismaZoomSessionType.GROUP
    && resolveRequestedSessionType(session.requests) === 'group_practice';
}

function withRescheduleHistory(
  requests: Prisma.JsonValue,
  oldScheduledAt: Date,
  newScheduledAt: Date,
  actorUserId: string | null,
): Prisma.InputJsonValue {
  const current = requests && !Array.isArray(requests) && typeof requests === 'object'
    ? requests as Prisma.JsonObject
    : {}
  const history = Array.isArray(current.rescheduleHistory)
    ? current.rescheduleHistory
    : []

  return {
    ...current,
    previousScheduledAt: oldScheduledAt.toISOString(),
    rescheduleHistory: [
      ...history,
      {
        oldScheduledAt: oldScheduledAt.toISOString(),
        newScheduledAt: newScheduledAt.toISOString(),
        actorUserId,
        occurredAt: new Date().toISOString(),
      },
    ],
  } as Prisma.InputJsonValue
}

function rescheduleLockKeys(expertId: string, dates: Date[]): string[] {
  return [...new Set(dates.map((date) => (
    // Existing individual-request creation serializes by this exact identity.
    `zoom-calendar:INDIVIDUAL:${expertId}:${date.toISOString().slice(0, 10)}`
  )))].sort();
}

function rescheduleError(code: string): Error {
  return new Error(code);
}

/**
 * Canonical coach command for moving disposable individual inventory and a
 * future Group Practice in place. Commerce, reports and swaps remain
 * immutable; Group Practice keeps its existing attendee records atomically.
 */
export async function rescheduleCoachManagedSession(input: {
  sessionId: string;
  expertId: string;
  scheduledAt: Date;
  actorUserId?: string | null;
}): Promise<CoachRescheduleResult> {
  if (!Number.isFinite(input.scheduledAt.getTime()) || input.scheduledAt <= new Date()) {
    throw rescheduleError('RESCHEDULE_INVALID_TIME');
  }

  try {
    let groupPracticeNotification: {
      session: { id: string; scheduledAt: Date; topic: string; requests: unknown }
      attendeeUserIds: string[]
      oldScheduledAt: Date
    } | null = null
    const result = await prisma.$transaction(async (tx) => {
      const original = await tx.zoomSession.findUnique({
        where: { id: input.sessionId },
        select: { scheduledAt: true },
      });
      if (!original) throw rescheduleError('RESCHEDULE_SESSION_NOT_FOUND');

      for (const key of rescheduleLockKeys(input.expertId, [original.scheduledAt, input.scheduledAt])) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      }
      // The availability definition and the moving row are protected in the
      // same order used by commerce approval: coach first, then session.
      await tx.$queryRaw`SELECT id FROM "Expert" WHERE id = ${input.expertId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "ZoomSession" WHERE id = ${input.sessionId} FOR UPDATE`;

      const session = await tx.zoomSession.findUnique({
        where: { id: input.sessionId },
        include: {
          attendees: { select: { id: true, userId: true, attended: true } },
          commerceRequests: { select: { id: true, status: true } },
          swapRequestsFrom: { select: { id: true } },
        },
      });
      if (!session) throw rescheduleError('RESCHEDULE_SESSION_NOT_FOUND');
      if (session.expertId !== input.expertId) throw rescheduleError('RESCHEDULE_FORBIDDEN');

      if (session.scheduledAt.getTime() === input.scheduledAt.getTime()) {
        return { session, idempotent: true };
      }
      if (session.status !== ZoomStatus.SCHEDULED
        || session.postSessionReport !== null) {
        throw rescheduleError('RESCHEDULE_SESSION_IMMUTABLE');
      }
      if (isIndividualSession(session)) {
        if (session.attendees.length > 0 || session.attendees.some((attendee) => attendee.attended)) {
          throw rescheduleError('RESCHEDULE_ATTENDEES_LOCKED');
        }
        if (session.commerceRequests.length > 0) {
          throw rescheduleError('RESCHEDULE_COMMERCE_LOCKED');
        }
        if (session.swapRequestsFrom.length > 0) {
          throw rescheduleError('RESCHEDULE_SWAP_LOCKED');
        }
        if (sessionDurationMinutes(session.requests) !== INDIVIDUAL_DURATION_MINUTES) {
          throw rescheduleError('RESCHEDULE_DURATION_UNSUPPORTED');
        }

        const availability = await getIndividualAvailabilityForScheduledAt({
          expertId: input.expertId,
          scheduledAt: input.scheduledAt,
          db: tx,
          excludeSessionId: session.id,
        });
        if (!availability.candidate.available) {
          throw rescheduleError('RESCHEDULE_TARGET_UNAVAILABLE');
        }

        const updated = await tx.zoomSession.update({
          where: { id: session.id },
          data: { scheduledAt: input.scheduledAt },
        });
        return { session: updated, idempotent: false };
      }

      if (!isGroupPracticeSession(session)) {
        throw rescheduleError('RESCHEDULE_SESSION_IMMUTABLE');
      }
      if (session.scheduledAt <= new Date()) {
        throw rescheduleError('RESCHEDULE_SESSION_IMMUTABLE');
      }
      if (session.attendees.some((attendee) => attendee.attended)) {
        throw rescheduleError('RESCHEDULE_ATTENDEES_LOCKED');
      }
      if (session.commerceRequests.length > 0) {
        throw rescheduleError('RESCHEDULE_COMMERCE_LOCKED');
      }
      if (session.swapRequestsFrom.length > 0) {
        throw rescheduleError('RESCHEDULE_SWAP_LOCKED');
      }

      const targetEnd = new Date(input.scheduledAt.getTime() + sessionDurationMinutes(session.requests) * 60_000);
      const date = getKyivDateKey(input.scheduledAt);
      const effectiveAvailability = await loadEffectiveAvailabilityForDate(tx, input.expertId, date);
      const workingWindows = windowsForDate(effectiveAvailability.slots, date, effectiveAvailability.source, true);
      if (!workingWindows.some((window) => input.scheduledAt >= window.start && targetEnd <= window.end)) {
        throw rescheduleError('RESCHEDULE_TARGET_UNAVAILABLE');
      }
      const conflicts = await tx.zoomSession.findMany({
        where: {
          expertId: input.expertId,
          id: { not: session.id },
          status: { not: ZoomStatus.CANCELLED },
          scheduledAt: { lt: targetEnd },
        },
        select: { scheduledAt: true, requests: true },
      });
      if (conflicts.some((candidate) => intervalOverlaps(
        input.scheduledAt,
        targetEnd,
        candidate.scheduledAt,
        new Date(candidate.scheduledAt.getTime() + sessionDurationMinutes(candidate.requests) * 60_000),
      ))) {
        throw rescheduleError('RESCHEDULE_TARGET_UNAVAILABLE');
      }

      const updated = await tx.zoomSession.update({
        where: { id: session.id },
        data: {
          scheduledAt: input.scheduledAt,
          requests: withRescheduleHistory(
            session.requests,
            session.scheduledAt,
            input.scheduledAt,
            input.actorUserId ?? null,
          ),
        },
      });
      await tx.event.create({
        data: {
          id: `zoom-group-practice-rescheduled:${session.id}:${session.scheduledAt.getTime()}:${input.scheduledAt.getTime()}`,
          userId: input.actorUserId ?? null,
          type: 'ZOOM_GROUP_PRACTICE_RESCHEDULED',
          source: 'zoom',
          state: 'COMPLETED',
          payload: {
            actorUserId: input.actorUserId ?? null,
            sessionId: session.id,
            oldScheduledAt: session.scheduledAt.toISOString(),
            newScheduledAt: input.scheduledAt.toISOString(),
            attendeesCount: session.attendees.length,
          },
        },
      });
      groupPracticeNotification = {
        session: updated,
        attendeeUserIds: session.attendees.map((attendee) => attendee.userId),
        oldScheduledAt: session.scheduledAt,
      }
      return { session: updated, idempotent: false };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    if (groupPracticeNotification) {
      await rescheduleGroupPracticeNotifications(groupPracticeNotification)
    }
    return result
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw rescheduleError('RESCHEDULE_CONCURRENT_MODIFICATION');
    }
    throw error;
  }
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

const DEFAULT_GROUP_PRACTICE_SLOT: AvailabilitySlot = {
  id: 'mon-focus',
  dayOfWeek: 1,
  hour: 19,
  minute: 0,
  timezone: DEFAULT_ZOOM_TIMEZONE,
  sessionType: 'group_practice',
  maxSlots: 50,
  priceCents: 0,
  durationMinutes: 60,
  active: true,
  defaultTopic: 'ФОКУС · Zoom-практика',
}

export async function generateSessionsFromAvailability(
  expertId: string,
  weeksAhead = 4,
  now = new Date(),
  sessionTypes?: readonly ZoomSessionType[],
): Promise<{ created: number; skipped: number }> {
  const slots = await getAvailability(expertId);
  let created = 0;
  let skipped = 0;
  const materializedMondayGroupPracticeDates = new Set<string>();

  for (const slot of slots) {
    if (!slot.active) continue;
    if (sessionTypes && !sessionTypes.includes(slot.sessionType)) continue;

    const dates = nextOccurrences(
      slot.dayOfWeek,
      slot.hour,
      slot.minute,
      weeksAhead,
      slot.timezone || DEFAULT_ZOOM_TIMEZONE,
      now,
    );

    for (const date of dates) {
      const mondayGroupPracticeDate = slot.sessionType === 'group_practice' && isKyivMonday(date)
        ? getKyivDateKey(date)
        : null;
      if (mondayGroupPracticeDate) {
        if (materializedMondayGroupPracticeDates.has(mondayGroupPracticeDate)) {
          skipped++;
          continue;
        }

        const existingCanonicalPractice = await findCanonicalMondayGroupPractice({
          expertId,
          scheduledAt: date,
        });
        if (existingCanonicalPractice) {
          materializedMondayGroupPracticeDates.add(mondayGroupPracticeDate);
          skipped++;
          continue;
        }
      }

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
      }, {
      // Materialization creates future calendar inventory only. The existing
      // reminder/notification policy delivers messages when they are due.
      suppressAutomation: true,
      suppressSessionNotification: true,
      });
      if (mondayGroupPracticeDate) {
        materializedMondayGroupPracticeDates.add(mondayGroupPracticeDate);
      }
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
  if (slots.some((slot) => slot.sessionType === 'group_practice')) {
    return {
      seeded: false,
      created: 0,
      skipped: 0,
    }
  }

  await saveAvailability(expertId, [...slots, DEFAULT_GROUP_PRACTICE_SLOT]);

  const result = await generateSessionsFromAvailability(
    expertId,
    4,
    new Date(),
    ['group_practice'],
  );

  return {
    seeded: true,
    created: result.created,
    skipped: result.skipped,
  }
}
