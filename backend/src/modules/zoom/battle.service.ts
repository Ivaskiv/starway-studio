// backend/src/modules/zoom/battle.service.ts
// Battle mechanics: stored as ZoomSession with type='battle_review'
// All battle metadata lives in requests Json field

import { prisma } from '../../db/client.js';
import { ZoomStatus, Prisma } from '@starway/db/prisma-client';
import type { ZoomSession } from '@starway/db/prisma-client';
import { FOCUS_PRODUCT_CODE } from '@/products/focus/config/focus.constants.js';

export type BattleStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export interface BattleMeta {
  type: 'battle_review';
  battleStatus: BattleStatus;
  challengerId: string;
  opponentId: string;
  goalA?: string | null;
  goalB?: string | null;
  winnerId?: string | null;
  entryFee?: number;
  progress?: Record<string, { day: number; text: string; createdAt: string }[]>;
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

function asBattleMeta(raw: unknown): BattleMeta {
  return raw as unknown as BattleMeta;
}

function assertBattle(session: ZoomSession): BattleMeta {
  const meta = asBattleMeta(session.requests);
  if (!meta || meta.type !== 'battle_review') throw new Error('Not a battle session');
  return meta;
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
  dbClient?: Pick<typeof prisma, 'zoomSession'>;
}): Promise<ZoomSession> {
  const {
    expertId,
    challengerId,
    opponentId,
    goalA,
    goalB,
    entryFee,
    scheduledAt,
    paymentOrderReference,
    dbClient,
  } = args;
  const battleMeta: BattleMeta = {
    type: 'battle_review',
    battleStatus: 'active',
    challengerId,
    opponentId,
    goalA: goalA ?? null,
    goalB: goalB ?? null,
    winnerId: null,
    entryFee,
    progress: {},
    notify24h: true,
    notify2h: true,
    notifiedAt24h: null,
    notifiedAt2h: null,
    paymentOrderReference: paymentOrderReference ?? null,
  };

  const client = dbClient ?? prisma

  return client.zoomSession.create({
    data: {
      expertId,
      scheduledAt: scheduledAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      topic: `Battle: ${challengerId} vs ${opponentId}`,
      status: ZoomStatus.SCHEDULED,
      requests: toJson(battleMeta),
    },
  });
}

export async function logBattleProgress(args: {
  sessionId: string;
  userId: string;
  day: number;
  text: string;
}): Promise<ZoomSession> {
  const { sessionId, userId, day, text } = args;
  const session = await prisma.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });
  const meta = assertBattle(session);

  const progress = meta.progress ?? {};
  const userProgress = progress[userId] ?? [];
  userProgress.push({ day, text, createdAt: new Date().toISOString() });
  progress[userId] = userProgress;

  return prisma.zoomSession.update({
    where: { id: sessionId },
    data: { requests: toJson({ ...meta, progress }) },
  });
}

export async function recordBattleResult(args: {
  sessionId: string;
  winnerId: string | null;
}): Promise<ZoomSession> {
  const { sessionId, winnerId } = args;
  const session = await prisma.zoomSession.findUniqueOrThrow({ where: { id: sessionId } });
  const meta = assertBattle(session);

  return prisma.zoomSession.update({
    where: { id: sessionId },
    data: {
      status: ZoomStatus.COMPLETED,
      requests: toJson({ ...meta, battleStatus: 'completed', winnerId }),
    },
  });
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

export async function cancelStaleBattles(olderThanDays = 8): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const stale = await prisma.zoomSession.findMany({
    where: {
      status: { in: [ZoomStatus.SCHEDULED, ZoomStatus.ACTIVE] },
      scheduledAt: { lte: cutoff },
    },
  });

  const staleIds = stale
    .filter(s => {
      const m = asBattleMeta(s.requests);
      return m?.type === 'battle_review' && m?.battleStatus === 'active';
    })
    .map(s => s.id);

  if (staleIds.length === 0) return 0;

  const { count } = await prisma.zoomSession.updateMany({
    where: { id: { in: staleIds } },
    data: { status: ZoomStatus.CANCELLED },
  });
  return count;
}
