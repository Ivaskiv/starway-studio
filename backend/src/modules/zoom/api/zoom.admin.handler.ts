import { isLegacyIndividualSession } from '../commerce/zoom.commerce-request.service.js'
// backend/src/modules/zoom/zoom.admin.handler.ts
// Coach/admin-only handlers: finalize battle result, update session

import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../types/globalTypes.js';
import {
  acceptBattle,
  declineBattle,
  notifyBattleCreatedByCoach,
  recordBattleResult,
  setBattleGoal,
} from '../battle/battle.service.js';
import type { BattleOutcome } from '../battle/battle.service.js';
import {
  approveRequest as approveZoomCommerceRequest,
  createRequest as createZoomCommerceRequest,
  createUserIndividualRequest,
  getCalendarRequests as getZoomCommerceCalendarRequests,
  getUserCalendarRequestsForWindow,
  getCommerceCheckoutUrl,
  resolveZoomIndividualPaymentTerms,
  getRequestById as getZoomCommerceRequestById,
  rejectRequest as rejectZoomCommerceRequest,
} from '../commerce/zoom.commerce-request.service.js';
import { afterZoomOperation } from '../core/zoom.operations.service.js';
import {
  updateSession,
  completeZoomSession,
  cancelSession,
  createFullSession,
  registerAttendee,
  getCalendarSessions,
  bookSlot,
  unbookSlot,
  getAvailablePrivateSlots,
  bookPrivateSlot,
  cancelPrivateBooking,
  getAvailableSlotsForUser,
  createSwapRequest,
  getSwapCandidates,
  acceptSwapRequest,
  declineSwapRequest,
  toggleCoachSlotStatus,
  initiateZoomSwap,
  isActiveFocusSubscriber,
} from '../index.js';
import { getZoomLeaderboard } from '../battle/zoom.leaderboard.js';
import {
  getAvailability,
  getAvailabilityWeek,
  type AvailabilityWeekChange,
  getIndividualAvailabilityForDate,
  getIndividualAvailabilitySummary,
  getIndividualAvailabilityForScheduledAt,
  hasCoachCalendarConflict,
  intervalsOverlap,
  saveAvailability,
  saveAvailabilityWeek,
  generateSessionsFromAvailability,
} from '../booking/zoom.availability.service.js';
import type { AvailabilitySlot } from '../booking/zoom.availability.service.js';
import { getQuestionSummariesBySessionId } from '../reports/zoom.reports.service.js';
import { getZoomCompletionDraft } from '../reports/zoomCompletionDraft.service.js';
import { parseZoomPostReport } from '../reports/zoomPostReport.types.js';
import { notifyAssignedPrivateSession, notifyPrivateSessionRequest } from '../private/zoom.private-booking.service.js';
import { getIndividualSessionStatusLabel } from '../domain/individual-session-lifecycle.js';
import { prisma } from '../../../db/client.js';
import { enqueueRuntimeOutboxItem } from '../../../core/runtime/outbox.js';
import { bot, sendOpsTelegramMessage } from '../../../lib/telegram.js';
import { Prisma, SwapStatus, ZoomSlotStatus, ZoomStatus } from '@starway/db/prisma-client';
import { syncZoomRegistrationLifecycle } from './controller.js';
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js';
import { getCoachParticipants } from '../participants/coach-participants.service.js';

const BATTLE_PARTICIPANTS_REQUIRED = 2;
const DEFAULT_SESSION_DURATION_MINUTES = 60;
const USER_SESSION_CONFLICT_ERROR =
  'Цей учасник уже має Zoom-сесію на вибраний час. Оберіть інший час.';
const COACH_SESSION_CONFLICT_ERROR =
  'На цей час уже запланована інша Zoom-сесія. Оберіть інший час.';

const COMMERCE_STATUS_LABELS = {
  user: {
    REQUESTED: 'Очікує підтвердження коуча',
    APPROVED_PENDING_PAYMENT: 'Очікує оплату · 60 €',
    PAID: 'Оплачено · Заброньовано',
    REJECTED: 'ВІДХИЛЕНО', EXPIRED: 'ТЕРМІН ОПЛАТИ МИНУВ', CANCELLED: 'СКАСОВАНО',
  },
  coach: {
    REQUESTED: 'Потребує підтвердження',
    APPROVED_PENDING_PAYMENT: 'Очікує оплату користувачем',
    PAID: 'Оплачено',
    REJECTED: 'ВІДХИЛЕНО', EXPIRED: 'ТЕРМІН ОПЛАТИ МИНУВ', CANCELLED: 'СКАСОВАНО',
  },
} as const;

function normalizeParticipantUserIds(input: unknown): string[] {
  if (Array.isArray(input)) {
    return [...new Set(input
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0))]
  }

  if (typeof input === 'string') {
    const normalized = input.trim()
    return normalized ? [normalized] : []
  }

  return []
}

function buildIndividualRequests(requests: {
  [key: string]: unknown
  type: string
  zoomLink: string
  productId: string | null
  maxAttendees: number | null
  notify24h: boolean
  notify2h: boolean
  notifiedAt24h: string | null
  notifiedAt2h: string | null
}) {
  if (requests.type !== 'individual') {
    return requests
  }

  return {
    ...requests,
    maxAttendees: 1,
  }
}

function buildBattleRequests(requests: {
  [key: string]: unknown
  type: string
  zoomLink: string
  productId: string | null
  maxAttendees: number | null
  notify24h: boolean
  notify2h: boolean
  notifiedAt24h: string | null
  notifiedAt2h: string | null
}, participantUserIds: string[]) {
  if (requests.type !== 'battle_review') {
    return requests
  }

  const { goalA: _goalA, goalB: _goalB, progress: _progress, ...sessionRequests } = requests

  return {
    ...sessionRequests,
    battleStatus: typeof requests.battleStatus === 'string' ? requests.battleStatus : 'active',
    challengerId: participantUserIds[0],
    opponentId: participantUserIds[1],
    winnerId: requests.winnerId ?? null,
  }
}

function validateParticipantCount(type: string, participantUserIds: string[]): string | null {
  if (type === 'individual') {
    if (participantUserIds.length !== 1) {
      return participantUserIds.length === 0
        ? 'participant_required'
        : 'participant_single_required'
    }
  }

  if (type === 'battle_review' && participantUserIds.length !== BATTLE_PARTICIPANTS_REQUIRED) {
    return 'battle_participants_two_required'
  }

  return null
}

async function findMissingParticipantUserId(participantUserIds: string[]): Promise<string | null> {
  for (const participantUserId of participantUserIds) {
    const participant = await prisma.user.findUnique({
      where: { id: participantUserId },
      select: { id: true },
    })
    if (!participant) {
      return participantUserId
    }
  }

  return null
}

function resolveDurationMinutes(requests: unknown): number {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object') {
    return DEFAULT_SESSION_DURATION_MINUTES
  }

  const value = (requests as Record<string, unknown>).durationMinutes
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_SESSION_DURATION_MINUTES
}

async function findParticipantSessionConflict(args: {
  participantUserIds: string[]
  scheduledAt: Date
  durationMinutes: number
  excludeSessionId?: string
}): Promise<boolean> {
  if (args.participantUserIds.length === 0) return false

  const endsAt = new Date(args.scheduledAt.getTime() + args.durationMinutes * 60 * 1000)
  const sessions = await prisma.zoomSession.findMany({
    where: {
      id: args.excludeSessionId ? { not: args.excludeSessionId } : undefined,
      status: { in: [ZoomStatus.SCHEDULED, ZoomStatus.ACTIVE] },
      scheduledAt: { lt: endsAt },
      attendees: { some: { userId: { in: args.participantUserIds } } },
    },
    select: { scheduledAt: true, requests: true },
  })

  return sessions.some((session) => intervalsOverlap(
    args.scheduledAt,
    endsAt,
    session.scheduledAt,
    new Date(session.scheduledAt.getTime() + resolveDurationMinutes(session.requests) * 60_000),
  ))
}

async function rejectSessionConflictIfAny(args: {
  expertId: string
  scheduledAt: Date
  participantUserIds: string[]
  durationMinutes: number
  res: Response
  excludeSessionId?: string
}): Promise<boolean> {
  if (await findParticipantSessionConflict(args)) {
    args.res.status(409).json({ error: 'user_session_conflict', message: USER_SESSION_CONFLICT_ERROR })
    return true
  }

  if (await hasCoachCalendarConflict(args)) {
    args.res.status(409).json({ error: 'coach_session_conflict', message: COACH_SESSION_CONFLICT_ERROR })
    return true
  }

  return false
}

async function requireActiveFocusSubscription(userId: string, res: Response): Promise<boolean> {
  const accessState = await getUserAccessState(userId)
  if (!accessState.hasFocus) {
    res.status(403).json({ error: 'NO_ACTIVE_SUBSCRIPTION' })
    return false
  }

  return true
}

export async function finalizeBattleResult(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { sessionId } = req.params;
    const { outcome } = req.body as { outcome: BattleOutcome };

    const session = await prisma.zoomSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!['challenger', 'opponent', 'both', 'none'].includes(outcome)) {
      return res.status(400).json({ error: 'INVALID_BATTLE_OUTCOME' });
    }

    const updated = await recordBattleResult({ sessionId, outcome });
    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function handleAcceptBattle(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId } = req.params;
    const updated = await acceptBattle({ sessionId, userId });
    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function handleDeclineBattle(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId } = req.params;
    const updated = await declineBattle({ sessionId, userId });
    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

export async function handleCreateSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    console.log('[zoom/POST sessions] body:', JSON.stringify(req.body));
    console.log('[zoom/POST sessions] user:', req.user?.id ?? null);
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' });

    const { scheduledAt, topic, type, zoomLink, productId, maxAttendees, notify24h, notify2h } =
      req.body;
    const participantUserIds = normalizeParticipantUserIds(
      req.body.participantUserIds ?? req.body.participantUserId,
    )

    if (!scheduledAt || !topic) {
      return res.status(400).json({ error: 'scheduledAt and topic required' });
    }

    const parsedAt = new Date(scheduledAt);
    if (isNaN(parsedAt.getTime())) return res.status(400).json({ error: 'Invalid scheduledAt' });

    const nextType = type ?? 'group_practice'
    const participantCountError = validateParticipantCount(nextType, participantUserIds)
    if (participantCountError) {
      return res.status(400).json({ error: participantCountError })
    }

    const missingParticipantUserId = await findMissingParticipantUserId(participantUserIds)
    if (missingParticipantUserId) {
      return res.status(404).json({ error: 'participant_not_found' })
    }

    const durationMinutes =
      typeof req.body.durationMinutes === 'number' && Number.isFinite(req.body.durationMinutes) && req.body.durationMinutes > 0
        ? req.body.durationMinutes
        : DEFAULT_SESSION_DURATION_MINUTES
    if (nextType === 'individual') {
      const availability = await getIndividualAvailabilityForScheduledAt({
        expertId: user.expertId,
        scheduledAt: parsedAt,
      })
      if (!availability.candidate.available) {
        return res.status(409).json({
          error: 'COMMERCE_SLOT_UNAVAILABLE',
          message: 'Цей час уже зайнятий. Обери інший доступний час.',
          alternatives: availability.alternatives,
        })
      }
    }
    if (await rejectSessionConflictIfAny({
      expertId: user.expertId,
      scheduledAt: parsedAt,
      participantUserIds,
      durationMinutes,
      res,
    })) {
      return
    }

    const requests = buildBattleRequests(buildIndividualRequests({
      type: nextType,
      zoomLink: zoomLink ?? '',
      productId: productId ?? null,
      maxAttendees: maxAttendees ?? null,
      notify24h: notify24h !== false,
      notify2h: notify2h !== false,
      notifiedAt24h: null,
      notifiedAt2h: null,
      durationMinutes,
    }), participantUserIds);

    const session = await createFullSession(
      {
        expertId: user.expertId,
        scheduledAt: parsedAt,
        topic,
        requests: requests as Prisma.InputJsonValue,
      },
      nextType === 'individual' || nextType === 'battle_review'
        ? { suppressAutomation: true }
        : undefined,
    );

    let commerceResult: Record<string, unknown> | null = null
    if (nextType === 'individual') {
      const participantUserId = participantUserIds[0]
      if (!participantUserId) {
        throw new Error('individual_participant_required')
      }

      const individualPayment = resolveZoomIndividualPaymentTerms()
      const commerceRequest = await createZoomCommerceRequest({
        kind: 'INDIVIDUAL',
        requesterUserId: participantUserId,
        expertId: user.expertId,
        zoomSessionId: session.id,
        scheduledAt: parsedAt,
        amount: individualPayment.amount,
        currency: individualPayment.currency,
      })

      const approval = await approveZoomCommerceRequest(
        commerceRequest.id,
        user.expertId,
      )

      if (!approval.checkoutUrl) {
        throw new Error('individual_checkout_missing_after_approval')
      }

      commerceResult = { request: approval.request, checkoutUrl: approval.checkoutUrl }
      await notifyAssignedPrivateSession({
        commerceRequestId: approval.request.id,
        sessionId: session.id,
        userId: participantUserId,
        checkoutUrl: approval.checkoutUrl,
        origin: 'coach_created',
      }).catch((error: unknown) => {
        console.error('[zoom/POST sessions] individual approval notification failed', {
          sessionId: session.id,
          commerceRequestId: approval.request.id,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    } else {
      for (const participantUserId of participantUserIds) {
        await registerAttendee(participantUserId, session.id)
      }
    }
    if (nextType === 'battle_review') {
      await notifyBattleCreatedByCoach(session as Parameters<typeof notifyBattleCreatedByCoach>[0])
    }
    console.log('[zoom/POST sessions] created session:', session.id);
    return res.status(201).json(commerceResult ? { ...session, commerce: commerceResult } : session);
  } catch (err) {
    console.error('[zoom/POST sessions] ERROR:', err);
    next(err);
  }
}

export async function handleUpdateSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const { scheduledAt, topic, zoomLink, type, durationMinutes } = req.body;
    const participantUserIds = normalizeParticipantUserIds(
      req.body.participantUserIds ?? req.body.participantUserId,
    )

    const existing = await prisma.zoomSession.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const existingMeta = (existing.requests as Record<string, unknown>) ?? {}

    const patch: Record<string, unknown> = {};
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid scheduledAt' });
      patch.scheduledAt = d;
    }
    if (topic) patch.topic = topic;

    if (zoomLink !== undefined || type !== undefined || durationMinutes !== undefined) {
      const meta = { ...existingMeta };
      if (zoomLink !== undefined) meta.zoomLink = zoomLink;
      if (type !== undefined) meta.type = type;
      if (typeof durationMinutes === 'number' && Number.isFinite(durationMinutes) && durationMinutes > 0) {
        meta.durationMinutes = durationMinutes;
      }
      patch.requests = {
        ...meta,
      };
    }

    const nextRequests =
      (patch.requests as Record<string, unknown> | undefined) ?? existingMeta
    const nextType = String(
      nextRequests.type ?? existingMeta.type ?? existing.type ?? 'group_practice',
    )

    const isManagedParticipantSession = nextType === 'individual' || nextType === 'battle_review'
    let nextParticipantUserIds: string[] = []

    if (isManagedParticipantSession) {
      const existingAttendees = await prisma.zoomSessionAttendee.findMany({
        where: { sessionId: id },
        select: { userId: true },
      })
      nextParticipantUserIds =
        participantUserIds.length > 0
          ? participantUserIds
          : existingAttendees.map((attendee) => attendee.userId)
      const participantCountError = validateParticipantCount(nextType, nextParticipantUserIds)
      if (participantCountError) {
        return res.status(400).json({ error: participantCountError })
      }

      const missingParticipantUserId = await findMissingParticipantUserId(nextParticipantUserIds)
      if (missingParticipantUserId) {
        return res.status(404).json({ error: 'participant_not_found' })
      }

      const baseRequests = {
        ...nextRequests,
        type: nextType,
        zoomLink: String(nextRequests.zoomLink ?? ''),
        productId: typeof nextRequests.productId === 'string' ? nextRequests.productId : null,
        maxAttendees: typeof nextRequests.maxAttendees === 'number' ? nextRequests.maxAttendees : null,
        notify24h: nextRequests.notify24h !== false,
        notify2h: nextRequests.notify2h !== false,
        notifiedAt24h: (nextRequests.notifiedAt24h as string | null) ?? null,
        notifiedAt2h: (nextRequests.notifiedAt2h as string | null) ?? null,
      }

      patch.requests = buildBattleRequests(buildIndividualRequests(baseRequests), nextParticipantUserIds);

      const nextScheduledAt = patch.scheduledAt instanceof Date ? patch.scheduledAt : existing.scheduledAt
      const nextDurationMinutes = resolveDurationMinutes(patch.requests)
      if (await rejectSessionConflictIfAny({
        expertId: existing.expertId ?? '',
        scheduledAt: nextScheduledAt,
        participantUserIds: nextParticipantUserIds,
        durationMinutes: nextDurationMinutes,
        res,
        excludeSessionId: id,
      })) {
        return
      }

      const existingParticipantKey = existingAttendees.map((attendee) => attendee.userId).sort().join('|')
      const nextParticipantKey = [...nextParticipantUserIds].sort().join('|')

      if (existingParticipantKey !== nextParticipantKey) {
        await prisma.zoomSessionAttendee.deleteMany({ where: { sessionId: id } })
        for (const participantUserId of nextParticipantUserIds) {
          await registerAttendee(participantUserId, id)
        }
      }
    }

    if (!isManagedParticipantSession) {
      const nextScheduledAt = patch.scheduledAt instanceof Date ? patch.scheduledAt : existing.scheduledAt
      const nextDurationMinutes = resolveDurationMinutes(nextRequests)
      if (await rejectSessionConflictIfAny({
        expertId: existing.expertId ?? '',
        scheduledAt: nextScheduledAt,
        participantUserIds: nextParticipantUserIds,
        durationMinutes: nextDurationMinutes,
        res,
        excludeSessionId: id,
      })) {
        return
      }
    }

    const updated = await updateSession(id, patch as Parameters<typeof updateSession>[1]);
    const panelBase = process.env.PUBLIC_FRONTEND_URL?.trim() ?? '';
    const panelUrl = panelBase ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom` : '';
    void sendOpsTelegramMessage(
      `ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n`
      + `Тип події: Редагування сесії\n`
      + `Сесія: ${updated.topic}\n`
      + `Зміна: ${scheduledAt ? 'Час' : zoomLink !== undefined ? 'Zoom-посилання' : topic ? 'Тема' : 'Параметри'}\n`
      + `Нове значення: ${scheduledAt ?? zoomLink ?? topic ?? 'оновлено'}`,
      panelUrl
        ? { reply_markup: { inline_keyboard: [[{ text: 'Панель керування', url: panelUrl }]] } }
        : undefined,
    ).catch((err) => console.error('[zoom.admin] ops update report:', err));
    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}



export async function handleGetCompletionDraft(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, expertId: true },
    })
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const draft = await getZoomCompletionDraft({
      sessionId: id,
      actor: {
        userId,
        role: user.role,
        expertId: user.expertId,
      },
    })

    if (!draft.available && draft.reason === 'session_not_found') {
      return res.status(404).json(draft)
    }
    if (!draft.available && draft.reason === 'forbidden') {
      return res.status(403).json(draft)
    }

    return res.status(200).json(draft)
  } catch (err) {
    next(err)
  }
}

export async function handleCompleteSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, expertId: true },
    })
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const completed = await completeZoomSession({
      sessionId: id,
      actor: {
        userId,
        role: user.role,
        expertId: user.expertId,
      },
      source: 'manual',
      actualParticipantUserIds: Array.isArray(req.body.actualParticipantUserIds)
        ? req.body.actualParticipantUserIds
        : undefined,
      attendeeCount: typeof req.body.attendeeCount === 'number'
        ? req.body.attendeeCount
        : undefined,
      topic: typeof req.body.topic === 'string' ? req.body.topic : null,
      summary: typeof req.body.summary === 'string' ? req.body.summary : null,
      recordingRef: typeof req.body.recordingRef === 'string' ? req.body.recordingRef : null,
      startedAt: typeof req.body.startedAt === 'string' ? req.body.startedAt : null,
      endedAt: typeof req.body.endedAt === 'string' ? req.body.endedAt : null,
    })

    const recordingRef = typeof req.body.recordingRef === 'string' ? req.body.recordingRef.trim() : ''
    if (recordingRef && completed.type === 'GROUP') {
      await enqueueRuntimeOutboxItem({
        scope: 'zoom_audio_ingest',
        type: 'ZOOM_AUDIO_UPLOADED',
        source: 'cloudinary',
        userId,
        state: 'uploaded',
        tenantId: id,
        runtime: {
          requestFingerprint: `${id}:${recordingRef}`,
          orchestrationPath: ['zoom_session_completion', id],
        },
        payload: {
          zoomSessionId: id,
          fileId: recordingRef,
          fileUniqueId: null,
          mediaType: 'audio',
          fileName: 'zoom-recording',
          mimeType: null,
          caption: null,
          source: 'cloudinary',
          observedAt: new Date().toISOString(),
          uploadedAt: new Date().toISOString(),
          cloudinaryUrl: recordingRef,
          downloadUrl: recordingRef,
        },
      })
    }

    return res.status(200).json(completed)
  } catch (err) {
    if (err instanceof Error && err.message === 'SESSION_NOT_FOUND') {
      return res.status(404).json({ error: 'session_not_found' })
    }
    if (err instanceof Error && err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'forbidden' })
    }
    if (err instanceof Error && err.message === 'SESSION_CANCELLED') {
      return res.status(409).json({ error: 'session_cancelled' })
    }
    next(err)
  }
}

export async function handleCancelSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const existing = await prisma.zoomSession.findUnique({
      where: { id },
      select: { topic: true, scheduledAt: true, attendees: { select: { id: true } } },
    });
    const session = await cancelSession(id);
    const panelBase = process.env.PUBLIC_FRONTEND_URL?.trim() ?? '';
    const panelUrl = panelBase ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom` : '';
    void sendOpsTelegramMessage(
      `ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n`
      + `Тип події: Скасування сесії коучем\n`
      + `Сесія: ${session.topic}\n`
      + `Дата: ${(existing?.scheduledAt ?? session.scheduledAt).toLocaleString('uk-UA')}\n`
      + `Причетних учасників: ${existing?.attendees.length ?? 0}`,
      panelUrl
        ? { reply_markup: { inline_keyboard: [[{ text: 'Панель керування', url: panelUrl }]] } }
        : undefined,
    ).catch((err) => console.error('[zoom.admin] ops cancel report:', err));
    return res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function handleGetCalendarSessions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { from, to, role } = req.query as { from: string; to: string; role: string };
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    });

    const sessions = await getCalendarSessions({
      from: fromDate,
      to: toDate,
      role: (role as 'coach' | 'user') ?? 'user',
      userId,
      expertId: user?.expertId ?? undefined,
    });

    const calendarRole = role === 'coach' ? 'coach' : 'user';
    const commerceRequests = calendarRole === 'user'
      ? await getUserCalendarRequestsForWindow({
          requesterUserId: userId,
          from: fromDate,
          to: toDate,
          includeInactive: true,
        })
      : await getZoomCommerceCalendarRequests({
          zoomSessionIds: sessions.map((session) => session.id),
          includeInactive: true,
        });
    const commercePriority = { REQUESTED: 1, APPROVED_PENDING_PAYMENT: 2, PAID: 3, REJECTED: 0, EXPIRED: 0, CANCELLED: 0 } as const;
    type CalendarCommerceStatus = keyof typeof commercePriority;
    type CalendarCommerceRequest = typeof commerceRequests[number] & { status: CalendarCommerceStatus };
    const commerceBySessionId = new Map<string, CalendarCommerceRequest>();
    for (const request of commerceRequests) {
      if (!request.zoomSessionId || !(request.status in commercePriority)) continue;
      const calendarRequest = request as CalendarCommerceRequest;
      const current = commerceBySessionId.get(request.zoomSessionId);
      if (!current) {
        commerceBySessionId.set(request.zoomSessionId, calendarRequest);
      }
    }

    const questionSummaries = await getQuestionSummariesBySessionId(sessions.map((session) => session.id));

    type SessionRow = typeof sessions[number];
    const getAttendeeName = (attendee: {
      userId: string
      user?: { firstName: string | null; lastName: string | null; email: string | null }
    } | undefined) => {
      if (!attendee) return null;
      return [attendee.user?.firstName, attendee.user?.lastName].filter(Boolean).join(' ').trim()
        || attendee.user?.email
        || null;
    };
    const result = await Promise.all(sessions.map(async (s: SessionRow) => {
      const meta = (s.requests as Record<string, unknown>) ?? {};
      const isArray = Array.isArray(meta);
      const attendeesCount = (s as { _count?: { attendees?: number } })._count?.attendees ?? 0;
      const maxSlots = isArray ? 50 : typeof meta.maxSlots === 'number' ? meta.maxSlots : 50;
      const isIndividual = isLegacyIndividualSession(s)
      const commerceRequest = commerceBySessionId.get(s.id);
      const commerceBlocksSlot = commerceRequest?.status === 'APPROVED_PENDING_PAYMENT'
        || commerceRequest?.status === 'PAID';
      const attendees = (s as {
        attendees?: Array<{
          userId: string
          goalText: string | null
          progress: unknown
          attended?: boolean
          user?: { firstName: string | null; lastName: string | null; email: string | null }
        }>
      }).attendees ?? [];
      const challenger = attendees.find((attendee) => attendee.userId === meta.challengerId);
      const opponent = attendees.find((attendee) => attendee.userId === meta.opponentId);
      const ownAttendee = attendees.find((attendee) => attendee.userId === userId);
      const ownProgress = Array.isArray(ownAttendee?.progress) ? ownAttendee.progress : [];
      const challengerProgress = Array.isArray(challenger?.progress) ? challenger.progress : [];
      const opponentProgress = Array.isArray(opponent?.progress) ? opponent.progress : [];
      const questionSummary = questionSummaries.get(s.id);
      const report = parseZoomPostReport(s.postSessionReport);
      const actualAttendeeCount = attendees.filter((attendee) => attendee.attended === true).length;
      const recordingUrl = report?.audioUrl?.trim() || null;
      const individualPaid = !(isIndividual || commerceRequest?.kind === 'BATTLE') || (commerceRequest?.requesterUserId === userId && commerceRequest.status === 'PAID');
      const canViewRecording = (role === 'coach' || individualPaid) && Boolean(recordingUrl) && (role === 'coach' || Boolean((s as { isMyBooking?: boolean }).isMyBooking));
      return {
        id: s.id,
        scheduledAt: s.scheduledAt.toISOString(),
        topic: s.topic,
        status: s.status,
        type: isArray ? 'group_practice' : (meta.type ?? 'group_practice'),
        zoomLink: isArray || (role !== 'coach' && !individualPaid) ? '' : (meta.zoomLink ?? ''),
        attendeesCount,
        notifiedAt24h: isArray ? null : ((meta.notifiedAt24h as string | null) ?? null),
        notifiedAt2h: isArray ? null : ((meta.notifiedAt2h as string | null) ?? null),
        goalText: isArray ? null : (ownAttendee?.goalText ?? null),
        battleProgress: isArray ? [] : ownProgress,
        goalA: isArray ? null : (challenger?.goalText ?? null),
        goalB: isArray ? null : (opponent?.goalText ?? null),
        participantNames: attendees.map((attendee) => getAttendeeName(attendee)).filter(Boolean),
        attendees: attendees.map((attendee) => ({
          userId: attendee.userId,
          name: getAttendeeName(attendee),
          attended: attendee.attended === true,
        })),
        actualAttendeeCount: report?.actualAttendeeCount ?? actualAttendeeCount,
        completedAt: report?.completedAt ?? null,
        completionSource: report?.source ?? null,
        actualStartedAt: report?.actualStartedAt ?? null,
        actualEndedAt: report?.actualEndedAt ?? null,
        outcomeTopic: report?.topic ?? null,
        summary: report?.summary?.trim() || null,
        recordingUrl,
        recordingAvailable: report?.recordingAvailable ?? Boolean(recordingUrl),
        canViewRecording,
        challengerName: getAttendeeName(challenger),
        opponentName: getAttendeeName(opponent),
        progressA: isArray ? 0 : challengerProgress.length,
        progressB: isArray ? 0 : opponentProgress.length,
        battleStatus: isArray ? null : ((meta.battleStatus as string | null) ?? null),
        challengerId: isArray ? null : ((meta.challengerId as string | null) ?? null),
        opponentId: isArray ? null : ((meta.opponentId as string | null) ?? null),
        winnerId: isArray ? null : ((meta.winnerId as string | null) ?? null),
        questionPreviews: questionSummary?.questionPreviews ?? [],
        questionsCount: questionSummary?.questionsCount ?? 0,
        remainingQuestionsCount: questionSummary?.remainingQuestionsCount ?? 0,
        canEdit: role === 'coach',
        checkoutUrl: calendarRole === 'user'
          && commerceRequest?.requesterUserId === userId
          && commerceRequest.status === 'APPROVED_PENDING_PAYMENT'
          ? await getCommerceCheckoutUrl(commerceRequest.id, userId)
          : null,
        paymentDeadline: calendarRole === 'user'
          && commerceRequest?.requesterUserId === userId
          && commerceRequest.status === 'APPROVED_PENDING_PAYMENT'
          && commerceRequest.checkoutOrderReference
          ? (await prisma.checkoutSession.findFirst({
              where: { orderReference: commerceRequest.checkoutOrderReference },
              select: { expiresAt: true },
            }))?.expiresAt.toISOString() ?? null
          : null,
        commerceRequestId: commerceRequest?.id ?? null,
        commerceStatus: commerceRequest?.status ?? null,
        commerceLabel: isIndividual
          ? getIndividualSessionStatusLabel({
              role: calendarRole,
              sessionStatus: s.status,
              commerceStatus: commerceRequest?.status,
            })
          : commerceRequest
            ? COMMERCE_STATUS_LABELS[calendarRole][commerceRequest.status]
            : null,
        slotStatus: isIndividual && (attendeesCount >= 1 || commerceBlocksSlot)
          ? 'booked'
          : isArray ? 'available' : ((meta.slotStatus as string) ?? 'available'),
        remainingSlots: isIndividual && (attendeesCount >= 1 || commerceBlocksSlot) ? 0 : maxSlots - attendeesCount,
        isMyBooking: individualPaid && ((s as { isMyBooking?: boolean }).isMyBooking ?? false),
        isMyPendingPayment: commerceRequest?.requesterUserId === userId
          && commerceRequest.status === 'APPROVED_PENDING_PAYMENT',
        priceCents: isIndividual
          ? Math.round(Number(commerceRequest?.amount ?? 60) * 100)
          : isArray ? 0 : typeof meta.priceCents === 'number' ? meta.priceCents : 0,
        currency: isIndividual ? commerceRequest?.currency ?? 'EUR' : undefined,
        durationMinutes: isArray ? 60 : typeof meta.durationMinutes === 'number' ? meta.durationMinutes : 60,
      };
    }));

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetLeaderboard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await requireActiveFocusSubscription(userId, res))) return

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert context required' });

    const entries = await getZoomLeaderboard(user.expertId);
    return res.status(200).json(entries);
  } catch (err) {
    next(err);
  }
}

export async function handleInitiateBattle(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true, firstName: true, email: true, phone: true },
    });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert context required' });

    const { challengerId, opponentId, goalA, goalB, entryFee } = req.body;
    if (!challengerId || !opponentId) {
      return res.status(400).json({ error: 'challengerId and opponentId required' });
    }

    if (challengerId !== userId) {
      return res.status(403).json({ error: 'forbidden_challenger_mismatch' })
    }

    const opponent = await prisma.user.findFirst({
      where: {
        id: opponentId,
        expertId: user.expertId,
        deletedAt: null,
      },
      select: { id: true, firstName: true },
    })
    if (!opponent) {
      return res.status(404).json({ error: 'opponent_not_found' })
    }

    const challengerIsSubscriber = await isActiveFocusSubscriber(userId)
    if (!challengerIsSubscriber) {
      const existing = await prisma.zoomCommerceRequest.findFirst({
        where: { kind: 'BATTLE', requesterUserId: userId, expertId: user.expertId,
          scheduledAt: { gt: new Date() }, status: { in: ['REQUESTED', 'APPROVED_PENDING_PAYMENT', 'PAID'] } },
        include: { zoomSession: true }, orderBy: { createdAt: 'desc' },
      })
      if (existing) {
        const { sendCommerceTicket } = await import('../commerce/zoom.commerce-telegram.js')
        await sendCommerceTicket(existing.id)
        return res.status(200).json({ type: 'non_subscriber', costUAH: Number(existing.amount),
          request: existing, battle: existing.zoomSession,
          checkoutUrl: await getCommerceCheckoutUrl(existing.id, userId),
          message: 'Запит на Zoom Battle надіслано коучу.' })
      }
      const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const session = await createFullSession({
        expertId: user.expertId,
        scheduledAt,
        topic: `Battle: ${userId} vs ${opponent.id}`,
        requests: {
          type: 'battle_review',
          battleStatus: 'pending',
          challengerId: userId,
          opponentId: opponent.id,
          goalA: goalA ?? null,
          goalB: goalB ?? null,
          entryFee: 99,
          paymentOrderReference: null,
        },
      }, { suppressAutomation: true })
      const commerceRequest = await createZoomCommerceRequest({
        kind: 'BATTLE',
        requesterUserId: userId,
        expertId: user.expertId,
        zoomSessionId: session.id,
        scheduledAt,
        amount: 99,
        currency: 'UAH',
      })

      if (commerceRequest.zoomSessionId !== session.id) {
        await prisma.zoomSession.update({ where: { id: session.id }, data: { status: 'CANCELLED' } })
      }
      const { sendCommerceTicket } = await import('../commerce/zoom.commerce-telegram.js')
      await sendCommerceTicket(commerceRequest.id)
      return res.status(201).json({
        type: 'non_subscriber',
        costUAH: 99,
        request: commerceRequest,
        battle: commerceRequest.zoomSessionId === session.id ? session
          : await prisma.zoomSession.findUnique({ where: { id: commerceRequest.zoomSessionId! } }),
        message: 'Запит на Zoom Battle надіслано коучу.',
      })
    }

    const { initiateBattle } = await import('../battle/battle.service.js');
    const session = await initiateBattle({
      expertId: user.expertId,
      challengerId,
      opponentId,
      goalA,
      goalB,
      entryFee,
    });
    return res.status(201).json({
      type: 'subscriber',
      costUAH: 0,
      battle: session,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleLogBattleProgress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { day, text } = req.body;
    if (!day || !text) {
      return res.status(400).json({ error: 'day, text required' });
    }

    const { logBattleProgress } = await import('../battle/battle.service.js');
    const session = await logBattleProgress({ sessionId, userId, day, text });
    return res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function handleSetBattleGoal(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const goalText = typeof req.body.goalText === 'string'
      ? req.body.goalText.trim()
      : null;
    const session = await setBattleGoal({
      sessionId,
      userId,
      goalText: goalText && goalText.length > 0 ? goalText : null,
    });
    return res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function handleGetEligibleOpponents(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert context required' });

    const { getEligibleBattleOpponents } = await import('../battle/battle.service.js');
    const opponents = await getEligibleBattleOpponents({
      userId,
      expertId: user.expertId,
    });
    return res.status(200).json(opponents);
  } catch (err) {
    next(err);
  }
}

// ── Availability handlers ─────────────────────────────────────────────────────

export async function handleGetAvailability(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' });
    const slots = await getAvailability(user.expertId);
    return res.status(200).json(slots);
  } catch (err) {
    next(err);
  }
}

export async function handleGetCoachParticipants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { expertId: true } });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' });
    return res.status(200).json(await getCoachParticipants(user.expertId));
  } catch (error) { next(error); }
}

export async function handleGetAvailabilityWeek(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' });
    return res.status(200).json(await getAvailabilityWeek(user.expertId, from));
  } catch (error) {
    if (error instanceof Error && ['invalid_date', 'week_must_start_monday'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function handleGetIndividualAvailability(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'invalid_date' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } });
    if (!user?.expertId) return res.status(409).json({ error: 'COMMERCE_EXPERT_CONTEXT_REQUIRED' });
    return res.status(200).json(await getIndividualAvailabilityForDate({ expertId: user.expertId, date }));
  } catch (err) {
    next(err);
  }
}

export async function handleGetIndividualAvailabilitySummary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'invalid_date' });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } });
    if (!user?.expertId) return res.status(409).json({ error: 'COMMERCE_EXPERT_CONTEXT_REQUIRED' });
    return res.status(200).json(await getIndividualAvailabilitySummary({ expertId: user.expertId, from, to }));
  } catch (err) {
    if (err instanceof Error && err.message === 'invalid_date_range') {
      return res.status(400).json({ error: 'invalid_date_range' });
    }
    next(err);
  }
}

export async function handleSaveAvailability(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' });
    const slots = req.body as AvailabilitySlot[];
    if (!Array.isArray(slots)) return res.status(400).json({ error: 'Expected array of slots' });
    await saveAvailability(user.expertId, slots);
    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function handleSaveAvailabilityWeek(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    const body = req.body as { from?: unknown; days?: unknown };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (typeof body.from !== 'string' || !Array.isArray(body.days)) return res.status(400).json({ error: 'invalid_availability_week' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' });
    await saveAvailabilityWeek({ expertId: user.expertId, from: body.from, days: body.days as AvailabilityWeekChange[] });
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof Error && ['invalid_date', 'week_must_start_monday', 'invalid_availability_week', 'invalid_availability_window', 'overlapping_availability_windows'].includes(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
}

export async function handleGenerateSessions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } });
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' });
    const result = await generateSessionsFromAvailability(user.expertId, 4);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleBookSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const result = await bookSlot(id, userId);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && (err.message === 'slot_full' || err.message === 'deadline_passed')) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
}

export async function handleUnbookSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    await unbookSlot(id, userId);
    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'too_late') {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
}

export async function handleGetAvailablePrivateSlots(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!(await requireActiveFocusSubscription(userId, res))) return

    const { expertId, from, to } = req.query as { expertId?: string; from?: string; to?: string }
    if (!expertId || !from || !to) return res.status(400).json({ error: 'expertId, from, to required' })

    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return res.status(400).json({ error: 'Invalid date range' })

    const rows = await getAvailablePrivateSlots(expertId, fromDate, toDate)
    return res.status(200).json(rows)
  } catch (err) {
    next(err)
  }
}

export async function getAvailableSlots(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!(await requireActiveFocusSubscription(userId, res))) return

    const slots = await getAvailableSlotsForUser(userId)
    return res.status(200).json(slots)
  } catch (err) {
    next(err)
  }
}

export async function handleGetCommerceRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const request = await getZoomCommerceRequestById(req.params.id)
    if (!request) return res.status(404).json({ error: 'commerce_request_not_found' })
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } })
    if (request.requesterUserId !== userId && request.expertId !== user?.expertId) {
      return res.status(403).json({ error: 'commerce_request_forbidden' })
    }
    return res.status(200).json({ request })
  } catch (err) {
    next(err)
  }
}

export async function handleApproveCommerceRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } })
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' })
    const approval = await approveZoomCommerceRequest(req.params.id, user.expertId)
    if (
      approval.request.kind === 'INDIVIDUAL'
      && approval.request.status === 'APPROVED_PENDING_PAYMENT'
      && approval.request.zoomSessionId
      && approval.checkoutUrl
    ) {
      await notifyAssignedPrivateSession({
        commerceRequestId: approval.request.id,
        sessionId: approval.request.zoomSessionId,
        userId: approval.request.requesterUserId,
        checkoutUrl: approval.checkoutUrl,
        origin: 'user_approved',
      }).catch((error: unknown) => {
        console.error('[zoom/commerce approve] individual approval notification failed', {
          commerceRequestId: approval.request.id,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
    return res.status(200).json(approval)
  } catch (err) {
    if (err instanceof Error) return res.status(409).json({ error: err.message })
    next(err)
  }
}

export async function handleRejectCommerceRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } })
    if (!user?.expertId) return res.status(403).json({ error: 'Expert only' })
    return res.status(200).json({ request: await rejectZoomCommerceRequest(req.params.id, user.expertId) })
  } catch (err) {
    if (err instanceof Error) return res.status(409).json({ error: err.message })
    next(err)
  }
}

export async function handleBookPrivateSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const { id } = req.params
    const result = await bookPrivateSlot(userId, id, typeof req.body?.questionText === 'string' ? req.body.questionText : undefined)
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof Error) {
      return res.status(409).json({ error: err.message })
    }
    next(err)
  }
}

export async function handleCreateUserIndividualRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    if (process.env.NODE_ENV !== 'production') {
      console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
        phase: 'handler_enter',
        userId,
        scheduledAt: typeof req.body?.scheduledAt === 'string' ? req.body.scheduledAt : null,
        hasQuestion: typeof req.body?.questionText === 'string' && req.body.questionText.trim().length > 0,
      })
    }
    const scheduledAt = new Date(req.body?.scheduledAt)
    const questionText = typeof req.body?.questionText === 'string' ? req.body.questionText : ''
    const result = await createUserIndividualRequest({
      requesterUserId: userId,
      scheduledAt,
      questionText,
    })
    if (!result.duplicate) {
      await notifyPrivateSessionRequest({
        commerceRequestId: result.request.id,
        sessionId: result.session.id,
        userId,
      }).catch((error: unknown) => {
        console.error('[zoom/user individual request] notification failed', {
          commerceRequestId: result.request.id,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
    return res.status(201).json(result)
  } catch (err) {
    if (err instanceof Error) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[USER_INDIVIDUAL_REQUEST_TRACE]', {
          phase: 'backend_rejected',
          errorName: err.name,
          errorCode: err.message,
          message: err.message,
        })
      }
      if (err.message === 'COMMERCE_SLOT_UNAVAILABLE') {
        const availabilityError = err as Error & { alternatives?: unknown }
        return res.status(409).json({
          error: err.message,
          message: 'Цей час уже зайнятий. Обери інший доступний час.',
          alternatives: availabilityError.alternatives ?? [],
        })
      }
      return res.status(409).json({ error: err.message })
    }
    next(err)
  }
}

export async function handleCancelPrivateSlotBooking(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const { id } = req.params
    const result = await cancelPrivateBooking(userId, id)
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof Error) {
      return res.status(409).json({ error: err.message })
    }
    next(err)
  }
}

export async function handleCreateSwapRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!(await requireActiveFocusSubscription(userId, res))) return
    const { sessionIdFrom, targetUserId, sessionIdTo, targetUserIds } = req.body as {
      sessionIdFrom?: string
      targetUserId?: string
      sessionIdTo?: string
      targetUserIds?: string[]
    }
    if (!sessionIdFrom) return res.status(400).json({ error: 'sessionIdFrom required' })
    const result = await createSwapRequest(userId, sessionIdFrom, {
      targetUserId,
      sessionIdTo,
      targetUserIds,
    })
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof Error) return res.status(409).json({ error: err.message })
    next(err)
  }
}

export async function handleGetSwapCandidates(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!(await requireActiveFocusSubscription(userId, res))) return

    const sessionIdFrom = String(req.query.sessionIdFrom ?? '').trim()
    if (!sessionIdFrom) return res.status(400).json({ error: 'sessionIdFrom required' })

    const candidates = await getSwapCandidates(userId, sessionIdFrom)
    return res.status(200).json(candidates)
  } catch (err) {
    if (err instanceof Error) return res.status(409).json({ error: err.message })
    next(err)
  }
}

export async function handleAcceptSwapRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!(await requireActiveFocusSubscription(userId, res))) return
    const { swapId } = req.params
    const { sessionIdTo } = req.body as { sessionIdTo?: string }
    if (!sessionIdTo) return res.status(400).json({ error: 'sessionIdTo required' })
    const result = await acceptSwapRequest(swapId, userId, sessionIdTo)
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof Error) return res.status(409).json({ error: err.message })
    next(err)
  }
}

export async function handleDeclineSwapRequest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!(await requireActiveFocusSubscription(userId, res))) return
    const { swapId } = req.params
    const result = await declineSwapRequest(swapId, userId)
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof Error) return res.status(409).json({ error: err.message })
    next(err)
  }
}

export async function handleGetPendingSwapRequests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!(await requireActiveFocusSubscription(userId, res))) return
    const pending = await prisma.zoomSlotSwapRequest.findMany({
      where: {
        status: SwapStatus.PENDING,
        OR: [{ targetUserId: userId }, { requesterId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.status(200).json(pending)
  } catch (err) {
    next(err)
  }
}

export async function handleToggleCoachSlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { slotId, status } = req.body as { slotId?: string; status?: string }
    if (!slotId || !status) return res.status(400).json({ error: 'slotId and status required' })
    if (status !== 'OPEN' && status !== 'CLOSED') return res.status(400).json({ error: 'invalid_status' })

    const slot = await prisma.zoomSlot.findUnique({
      where: { id: slotId },
      select: { coachId: true },
    })
    if (!slot) return res.status(404).json({ error: 'slot_not_found' })
    if (slot.coachId !== userId) return res.status(403).json({ error: 'forbidden' })

    const updated = await toggleCoachSlotStatus({
      slotId,
      coachId: userId,
      status: status as ZoomSlotStatus,
    })
    return res.status(200).json(updated)
  } catch (err) {
    next(err)
  }
}

export async function handleInitiateZoomSwap(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    if (!(await requireActiveFocusSubscription(userId, res))) return
    const { targetSlotId } = req.body as { targetSlotId?: string }
    if (!targetSlotId) return res.status(400).json({ error: 'targetSlotId required' })
    const result = await initiateZoomSwap(userId, targetSlotId)
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof Error) return res.status(409).json({ error: err.message })
    next(err)
  }
}
