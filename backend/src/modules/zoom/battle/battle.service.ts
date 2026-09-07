// backend/src/modules/zoom/battle.service.ts
// Battle mechanics: stored as ZoomSession with type='battle_review'
// All battle metadata lives in requests Json field

import { prisma } from '../../../db/client.js';
import { ZoomStatus, Prisma } from '@starway/db/prisma-client';
import type { ZoomSession } from '@starway/db/prisma-client';
import { FOCUS_PRODUCT_CODE } from '@/products/focus/config/focus.constants.js';
import { notificationService } from '@/services/notifications/NotificationService.js';
import { NotificationEvent } from '@/services/notifications/NotificationEvent.js';
import {
  applyBattleSharedReward,
  applyBattleWinReward,
} from '@/modules/gamification/service.js';

export type BattleStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type BattleOutcome = 'challenger' | 'opponent' | 'both' | 'none';
type BattleDbClient = Pick<Prisma.TransactionClient, 'zoomSession' | 'zoomSessionAttendee'>;
type BattleRecipientRole = 'challenger' | 'opponent' | 'participant' | 'coach';

export interface BattleMeta {
  type: 'battle_review';
  battleStatus: BattleStatus;
  challengerId: string;
  opponentId: string;
  winnerId?: string | null;
  outcome?: BattleOutcome;
  entryFee?: number;
  notify24h?: boolean;
  notify2h?: boolean;
  notifiedAt24h?: string | null;
  notifiedAt2h?: string | null;
  zoomLink?: string;
  paymentOrderReference?: string | null;
}

function toJson(obj: BattleMeta): Prisma.InputJsonValue {
  return obj as unknown as Prisma.InputJsonValue;
}

function toProgressJson(entries: BattleProgressEntry[]): Prisma.InputJsonValue {
  return entries as unknown as Prisma.InputJsonValue;
}

function asBattleMeta(raw: unknown): BattleMeta {
  return raw as unknown as BattleMeta;
}

function assertBattle(session: ZoomSession): BattleMeta {
  const meta = asBattleMeta(session.requests);
  if (!meta || meta.type !== 'battle_review') throw new Error('Not a battle session');
  return meta;
}

function withoutParticipantState(meta: BattleMeta): BattleMeta {
  const legacyMeta = meta as BattleMeta & {
    goalA?: unknown;
    goalB?: unknown;
    progress?: unknown;
  };
  const { goalA: _goalA, goalB: _goalB, progress: _progress, ...sessionMeta } = legacyMeta;
  return sessionMeta;
}

function assertDistinctBattleParticipants(challengerId: string, opponentId: string): void {
  if (challengerId === opponentId) {
    throw new Error('battle_participants_distinct_required');
  }
}

function buildBattleNotificationPayload(
  session: Pick<ZoomSession, 'id' | 'expertId' | 'scheduledAt' | 'topic'>,
  meta: BattleMeta,
  recipientRole: BattleRecipientRole,
) {
  return {
    sessionId: session.id,
    expertId: session.expertId,
    topic: session.topic,
    scheduledAt: session.scheduledAt.toISOString(),
    challengerId: meta.challengerId,
    opponentId: meta.opponentId,
    battleStatus: meta.battleStatus,
    winnerId: meta.winnerId ?? null,
    recipientRole,
    request_fingerprint: `battle:${session.id}:${meta.battleStatus}:${recipientRole}:${meta.winnerId ?? 'none'}`,
  };
}

async function getCoachRecipientUserIds(expertId: string | null | undefined): Promise<string[]> {
  if (!expertId) return [];

  const coaches = await prisma.user.findMany({
    where: {
      deletedAt: null,
      expertId,
      role: { in: ['EXPERT', 'SUPERADMIN'] },
      telegramLinks: {
        some: {
          isActive: true,
          chatId: { not: null },
        },
      },
    },
    select: { id: true },
  });

  return coaches.map((coach) => coach.id);
}

async function emitBattleNotification(
  event: NotificationEvent,
  userId: string,
  session: Pick<ZoomSession, 'id' | 'expertId' | 'scheduledAt' | 'topic'>,
  meta: BattleMeta,
  recipientRole: BattleRecipientRole,
): Promise<void> {
  await notificationService.emit(
    event,
    userId,
    buildBattleNotificationPayload(session, meta, recipientRole),
  );
}

async function emitBattleEvent(
  event: NotificationEvent,
  session: ZoomSession,
  recipients: Array<{ userId: string; role: BattleRecipientRole }>,
): Promise<void> {
  const meta = assertBattle(session);
  const emitted = new Set<string>();

  await Promise.all(recipients
    .filter(({ userId, role }) => {
      const key = `${userId}:${role}`;
      if (emitted.has(key)) return false;
      emitted.add(key);
      return true;
    })
    .map(({ userId, role }) => emitBattleNotification(event, userId, session, meta, role)));
}

async function emitBattleEventWithCoaches(
  event: NotificationEvent,
  session: ZoomSession,
  recipients: Array<{ userId: string; role: BattleRecipientRole }>,
): Promise<void> {
  const coachUserIds = await getCoachRecipientUserIds(session.expertId);
  await emitBattleEvent(event, session, [
    ...recipients,
    ...coachUserIds.map((userId) => ({ userId, role: 'coach' as const })),
  ]);
}

function isSameBattleMeta(meta: BattleMeta, args: {
  challengerId: string;
  opponentId: string;
  paymentOrderReference?: string | null;
}): boolean {
  if (args.paymentOrderReference && meta.paymentOrderReference === args.paymentOrderReference) {
    return true;
  }

  return meta.challengerId === args.challengerId && meta.opponentId === args.opponentId;
}

async function findExistingOpenBattle(client: BattleDbClient, args: {
  expertId: string;
  challengerId: string;
  opponentId: string;
  paymentOrderReference?: string | null;
}): Promise<ZoomSession | null> {
  const sessions = await client.zoomSession.findMany({
    where: {
      expertId: args.expertId,
      status: { in: [ZoomStatus.SCHEDULED, ZoomStatus.ACTIVE] },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sessions.find((session) => {
    const meta = asBattleMeta(session.requests);
    return (
      meta?.type === 'battle_review' &&
      meta.battleStatus !== 'completed' &&
      meta.battleStatus !== 'cancelled' &&
      isSameBattleMeta(meta, args)
    );
  }) ?? null;
}

async function ensureBattleAttendees(
  client: BattleDbClient,
  sessionId: string,
  participants: Array<{ userId: string; goalText?: string | null }>,
): Promise<void> {
  for (const participant of participants) {
    await client.zoomSessionAttendee.upsert({
      where: { sessionId_userId: { sessionId, userId: participant.userId } },
      create: {
        sessionId,
        userId: participant.userId,
        goalText: participant.goalText ?? null,
      },
      update: {},
    });
  }
}

type BattleProgressEntry = { day: number; text: string; createdAt: string };

function normalizeBattleProgress(raw: unknown): BattleProgressEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter((entry): entry is BattleProgressEntry => (
    Boolean(entry) &&
    typeof entry === 'object' &&
    typeof (entry as BattleProgressEntry).day === 'number' &&
    typeof (entry as BattleProgressEntry).text === 'string' &&
    typeof (entry as BattleProgressEntry).createdAt === 'string'
  ));
}

function upsertBattleProgressEntry(
  entries: BattleProgressEntry[],
  nextEntry: BattleProgressEntry,
): BattleProgressEntry[] {
  const existingIndex = entries.findIndex((entry) => entry.day === nextEntry.day);
  if (existingIndex === -1) {
    return [...entries, nextEntry];
  }

  return entries.map((entry, index) => index === existingIndex ? nextEntry : entry);
}

async function createBattleWithClient(client: BattleDbClient, args: {
  expertId: string;
  challengerId: string;
  opponentId: string;
  goalA?: string;
  goalB?: string;
  entryFee?: number;
  scheduledAt?: Date;
  paymentOrderReference?: string | null;
}): Promise<{ session: ZoomSession; created: boolean }> {
  const {
    expertId,
    challengerId,
    opponentId,
    goalA,
    goalB,
    entryFee,
    scheduledAt,
    paymentOrderReference,
  } = args;

  assertDistinctBattleParticipants(challengerId, opponentId);

  const existingBattle = await findExistingOpenBattle(client, {
    expertId,
    challengerId,
    opponentId,
    paymentOrderReference,
  });
  if (existingBattle) {
    await ensureBattleAttendees(client, existingBattle.id, [
      { userId: challengerId, goalText: goalA },
      { userId: opponentId, goalText: goalB },
    ]);
    return { session: existingBattle, created: false };
  }

  const battleMeta: BattleMeta = {
    type: 'battle_review',
    battleStatus: 'pending',
    challengerId,
    opponentId,
    winnerId: null,
    entryFee,
    notify24h: true,
    notify2h: true,
    notifiedAt24h: null,
    notifiedAt2h: null,
    paymentOrderReference: paymentOrderReference ?? null,
  };

  const session = await client.zoomSession.create({
    data: {
      expertId,
      scheduledAt: scheduledAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      topic: `Battle: ${challengerId} vs ${opponentId}`,
      status: ZoomStatus.SCHEDULED,
      requests: toJson(battleMeta),
    },
  });

  await ensureBattleAttendees(client, session.id, [
    { userId: challengerId, goalText: goalA },
    { userId: opponentId, goalText: goalB },
  ]);

  return { session, created: true };
}

export async function initiateBattle(args: {
  expertId: string;
  challengerId: string;
  opponentId: string;
  goalA?: string;
  goalB?: string;
  entryFee?: number;
  scheduledAt?: Date;
  paymentOrderReference?: string | null;
  dbClient?: BattleDbClient;
}): Promise<ZoomSession> {
  if (args.dbClient) {
    const result = await createBattleWithClient(args.dbClient, args);
    return result.session;
  }

  const result = await prisma.$transaction((tx) => createBattleWithClient(tx, args));
  if (result.created) {
    await emitBattleEventWithCoaches(NotificationEvent.BATTLE_CREATED_BY_USER, result.session, [
      { userId: args.opponentId, role: 'opponent' },
      { userId: args.challengerId, role: 'challenger' },
    ]);
  }
  return result.session;
}

export async function notifyBattleCreatedByCoach(session: ZoomSession): Promise<void> {
  const meta = assertBattle(session);
  await emitBattleEvent(NotificationEvent.BATTLE_CREATED_BY_COACH, session, [
    { userId: meta.challengerId, role: 'participant' },
    { userId: meta.opponentId, role: 'participant' },
  ]);
}

export async function acceptBattle(args: {
  sessionId: string;
  userId: string;
}): Promise<ZoomSession> {
  const { sessionId, userId } = args;
  const session = await prisma.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });
  const meta = assertBattle(session);
  if (meta.opponentId !== userId) {
    throw new Error('battle_acceptance_opponent_required');
  }

  if (meta.battleStatus === 'active') return session;
  if (meta.battleStatus !== 'pending') {
    throw new Error('battle_not_pending');
  }

  const updated = await prisma.zoomSession.update({
    where: { id: sessionId },
    data: { requests: toJson({ ...withoutParticipantState(meta), battleStatus: 'active' }) },
  });
  await emitBattleEventWithCoaches(NotificationEvent.BATTLE_ACCEPTED, updated, [
    { userId: meta.challengerId, role: 'challenger' },
    { userId: meta.opponentId, role: 'opponent' },
  ]);
  return updated;
}

export async function declineBattle(args: {
  sessionId: string;
  userId: string;
}): Promise<ZoomSession> {
  const { sessionId, userId } = args;
  const session = await prisma.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });
  const meta = assertBattle(session);
  if (meta.opponentId !== userId) {
    throw new Error('battle_acceptance_opponent_required');
  }

  if (meta.battleStatus === 'cancelled') return session;
  if (meta.battleStatus !== 'pending') {
    throw new Error('battle_not_pending');
  }

  const updated = await prisma.zoomSession.update({
    where: { id: sessionId },
    data: {
      status: ZoomStatus.CANCELLED,
      requests: toJson({ ...withoutParticipantState(meta), battleStatus: 'cancelled' }),
    },
  });
  await emitBattleEventWithCoaches(NotificationEvent.BATTLE_DECLINED, updated, [
    { userId: meta.challengerId, role: 'challenger' },
  ]);
  return updated;
}

export async function logBattleProgress(args: {
  sessionId: string;
  userId: string;
  day: number;
  text: string;
}): Promise<ZoomSession> {
  const { sessionId, userId, day, text } = args;
  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    include: { session: true },
  });
  if (!attendee) {
    throw new Error('battle_attendee_required');
  }
  assertBattle(attendee.session);

  const progress = upsertBattleProgressEntry(
    normalizeBattleProgress(attendee.progress),
    { day, text, createdAt: new Date().toISOString() },
  );

  const updated = await prisma.zoomSessionAttendee.update({
    where: { id: attendee.id },
    data: { progress: toProgressJson(progress) },
    include: { session: true },
  });

  return updated.session;
}

export async function setBattleGoal(args: {
  sessionId: string;
  userId: string;
  goalText: string | null;
}): Promise<ZoomSession> {
  const { sessionId, userId, goalText } = args;
  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    include: { session: true },
  });
  if (!attendee) {
    throw new Error('battle_attendee_required');
  }
  assertBattle(attendee.session);

  const updated = await prisma.zoomSessionAttendee.update({
    where: { id: attendee.id },
    data: { goalText },
    include: { session: true },
  });

  return updated.session;
}

export async function recordBattleResult(args: {
  sessionId: string;
  outcome: BattleOutcome;
}): Promise<ZoomSession> {
  const { sessionId, outcome } = args;

  const { updated, completedNow } = await prisma.$transaction(async (tx) => {
    const session = await tx.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });
    const meta = assertBattle(session);

    if (meta.battleStatus === 'completed' || session.status === ZoomStatus.COMPLETED) {
      return { updated: session, completedNow: false };
    }

    const winnerId =
      outcome === 'challenger'
        ? meta.challengerId
        : outcome === 'opponent'
          ? meta.opponentId
          : null;

    const resultMeta: BattleMeta = {
      ...withoutParticipantState(meta),
      battleStatus: 'completed',
      outcome,
      winnerId,
    };

    const result = await tx.zoomSession.updateMany({
      where: {
        id: sessionId,
        status: { not: ZoomStatus.COMPLETED },
      },
      data: {
        status: ZoomStatus.COMPLETED,
        requests: toJson(resultMeta),
      },
    });

    if (result.count !== 1) {
      const current = await tx.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });
      return { updated: current, completedNow: false };
    }

    const current = await tx.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });

    if (outcome !== 'none') {
      if (!current.expertId) {
        throw new Error('battle_expert_required_for_reward');
      }

      const at = new Date();

      if (outcome === 'challenger') {
        await applyBattleWinReward(tx, {
          userId: meta.challengerId,
          expertId: current.expertId,
          at,
        });
      } else if (outcome === 'opponent') {
        await applyBattleWinReward(tx, {
          userId: meta.opponentId,
          expertId: current.expertId,
          at,
        });
      } else {
        await applyBattleSharedReward(tx, {
          userId: meta.challengerId,
          at,
        });
        await applyBattleSharedReward(tx, {
          userId: meta.opponentId,
          at,
        });
      }
    }

    return { updated: current, completedNow: true };
  });

  if (completedNow) {
    const meta = assertBattle(updated);

    await emitBattleEventWithCoaches(NotificationEvent.BATTLE_RESULT, updated, [
      { userId: meta.challengerId, role: 'participant' },
      { userId: meta.opponentId, role: 'participant' },
    ]);
  }

  return updated;
}

export async function getActiveBattles(expertId: string): Promise<ZoomSession[]> {
  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId,
      status: { in: [ZoomStatus.SCHEDULED, ZoomStatus.ACTIVE] },
    },
    orderBy: { scheduledAt: 'asc' },
  });
  return sessions.filter(s => {
    const m = asBattleMeta(s.requests);
    return m?.type === 'battle_review' && m?.battleStatus === 'active';
  });
}

export async function getEligibleBattleOpponents(args: {
  userId: string;
  expertId: string;
}): Promise<{ id: string; firstName: string | null; lastName: string | null; email: string }[]> {
  const { userId, expertId } = args;
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      expertId,
      deletedAt: null,
      productSubscriptions: {
        some: {
          status: 'ACTIVE',
          product: { code: FOCUS_PRODUCT_CODE },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      },
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    take: 50,
  });
  return users;
}

export async function cancelStaleBattles(olderThanHours = 48): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const stale = await prisma.zoomSession.findMany({
    where: {
      status: { in: [ZoomStatus.SCHEDULED, ZoomStatus.ACTIVE] },
      scheduledAt: { lte: cutoff },
    },
  });

  const pendingBattles = stale.filter(s => {
    const m = asBattleMeta(s.requests);
    return m?.type === 'battle_review' && m?.battleStatus === 'pending';
  });

  for (const session of pendingBattles) {
    const meta = assertBattle(session);
    const updated = await prisma.zoomSession.update({
      where: { id: session.id },
      data: {
        status: ZoomStatus.CANCELLED,
        requests: toJson({ ...withoutParticipantState(meta), battleStatus: 'cancelled' }),
      },
    });
    await emitBattleEventWithCoaches(NotificationEvent.BATTLE_EXPIRED, updated, [
      { userId: meta.challengerId, role: 'participant' },
      { userId: meta.opponentId, role: 'participant' },
    ]);
  }

  return pendingBattles.length;
}
