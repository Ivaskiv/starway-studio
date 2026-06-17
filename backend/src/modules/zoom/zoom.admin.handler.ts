// backend/src/modules/zoom/zoom.admin.handler.ts
// Coach/admin-only handlers: finalize battle result, update session

import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/globalTypes.js';
import { recordBattleResult } from './battle.service.js';
import {
  updateSession,
  cancelSession,
  createFullSession,
  getCalendarSessions,
  bookSlot,
  unbookSlot,
  getAvailablePrivateSlots,
  bookPrivateSlot,
  cancelPrivateBooking,
  getAvailableSlotsForUser,
  createSwapRequest,
  acceptSwapRequest,
  declineSwapRequest,
  toggleCoachSlotStatus,
  initiateZoomSwap,
  isActiveFocusSubscriber,
} from './service.js';
import { getZoomLeaderboard } from './zoom.leaderboard.js';
import {
  getAvailability,
  saveAvailability,
  generateSessionsFromAvailability,
} from './zoom.availability.service.js';
import type { AvailabilitySlot } from './zoom.availability.service.js';
import { prisma } from '../../db/client.js';
import { sendOpsTelegramMessage } from '../../lib/telegram.js';
import { SwapStatus, ZoomSlotStatus, ZoomStatus } from '@starway/db/prisma-client';

type BattleOutcome = 'challenger' | 'opponent' | 'both' | 'none';

async function requireActiveFocusSubscription(userId: string, res: Response): Promise<boolean> {
  const isSubscriber = await isActiveFocusSubscriber(userId)
  if (!isSubscriber) {
    res.status(403).json({ error: 'focus_subscription_required' })
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

    const meta = session.requests as { challengerId?: string; opponentId?: string };
    const winnerId =
      outcome === 'challenger' ? (meta.challengerId ?? null)
      : outcome === 'opponent' ? (meta.opponentId ?? null)
      : null;

    const updated = await recordBattleResult({ sessionId, winnerId });
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

    if (!scheduledAt || !topic) {
      return res.status(400).json({ error: 'scheduledAt and topic required' });
    }

    const parsedAt = new Date(scheduledAt);
    if (isNaN(parsedAt.getTime())) return res.status(400).json({ error: 'Invalid scheduledAt' });

    const requests = {
      type: type ?? 'group_practice',
      zoomLink: zoomLink ?? '',
      productId: productId ?? null,
      maxAttendees: maxAttendees ?? null,
      notify24h: notify24h !== false,
      notify2h: notify2h !== false,
      notifiedAt24h: null,
      notifiedAt2h: null,
    };

    const session = await createFullSession({
      expertId: user.expertId,
      scheduledAt: parsedAt,
      topic,
      requests,
    });
    console.log('[zoom/POST sessions] created session:', session.id);
    return res.status(201).json(session);
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
    const { scheduledAt, topic, zoomLink, type } = req.body;

    const existing = await prisma.zoomSession.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const patch: Record<string, unknown> = {};
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid scheduledAt' });
      patch.scheduledAt = d;
    }
    if (topic) patch.topic = topic;

    if (zoomLink !== undefined || type !== undefined) {
      const meta = (existing.requests as Record<string, unknown>) ?? {};
      if (zoomLink !== undefined) meta.zoomLink = zoomLink;
      if (type !== undefined) meta.type = type;
      patch.requests = meta;
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

    type SessionRow = typeof sessions[number];
    const result = sessions.map((s: SessionRow) => {
      const meta = (s.requests as Record<string, unknown>) ?? {};
      const isArray = Array.isArray(meta);
      const attendeesCount = (s as { _count?: { attendees?: number } })._count?.attendees ?? 0;
      const maxSlots = isArray ? 50 : typeof meta.maxSlots === 'number' ? meta.maxSlots : 50;
      return {
        id: s.id,
        scheduledAt: s.scheduledAt.toISOString(),
        topic: s.topic,
        status: s.status,
        type: isArray ? 'group_practice' : (meta.type ?? 'group_practice'),
        zoomLink: isArray ? '' : (meta.zoomLink ?? ''),
        attendeesCount,
        notifiedAt24h: isArray ? null : ((meta.notifiedAt24h as string | null) ?? null),
        notifiedAt2h: isArray ? null : ((meta.notifiedAt2h as string | null) ?? null),
        goalText: isArray ? null : ((meta.goalA as string | null) ?? null),
        canEdit: role === 'coach',
        slotStatus: isArray ? 'available' : ((meta.slotStatus as string) ?? 'available'),
        remainingSlots: maxSlots - attendeesCount,
        isMyBooking: (s as { isMyBooking?: boolean }).isMyBooking ?? false,
        priceCents: isArray ? 0 : typeof meta.priceCents === 'number' ? meta.priceCents : 0,
        durationMinutes: isArray ? 60 : typeof meta.durationMinutes === 'number' ? meta.durationMinutes : 60,
      };
    });

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
      const orderReference = `battle_entry_99_${userId}_${Date.now()}`
      const { buildPaymentRequest } = await import('../subscriptions/payments/wayforpay.js')
      const { buildShortWayForPayCheckoutUrl } = await import('../subscriptions/payments/wayforpay.checkout.js')
      const backendBaseUrl = (
        process.env.PUBLIC_API_URL?.trim()
        || process.env.APP_URL?.trim()
        || process.env.TELEGRAM_WEBHOOK_URL?.trim()
        || process.env.INTERNAL_API_URL?.trim()?.replace(/\/api$/, '')
        || (process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : 'http://127.0.0.1:3001')
      ).replace(/\/$/, '')

      const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const payment = buildPaymentRequest({
        userId,
        productId: 'battle_entry',
        amount: 99,
        currency: 'UAH',
        payRef: orderReference,
        product_name: [`Zoom Battle vs ${opponent.firstName ?? opponent.id}`],
        product_count: [1],
        product_price: [99],
      }) as Record<string, unknown>

      payment.battleEntryMeta = {
        expertId: user.expertId,
        challengerId: userId,
        opponentId,
        goalA: goalA ?? null,
        goalB: goalB ?? null,
        scheduledAt: scheduledAt.toISOString(),
      }

      const checkoutUrl = await buildShortWayForPayCheckoutUrl(backendBaseUrl, payment, {
        product: 'battle_entry',
        opponentId,
      })

      return res.status(200).json({
        type: 'non_subscriber',
        costUAH: 99,
        orderReference,
        checkoutUrl,
        message: 'Оплатіть 99 грн, і battle буде створено автоматично після підтвердження платежу.',
      })
    }

    const { initiateBattle } = await import('./battle.service.js');
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
    const { userId, day, text } = req.body;
    if (!userId || !day || !text) {
      return res.status(400).json({ error: 'userId, day, text required' });
    }

    const { logBattleProgress } = await import('./battle.service.js');
    const session = await logBattleProgress({ sessionId, userId, day, text });
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

    const { getEligibleBattleOpponents } = await import('./battle.service.js');
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

    const slots = await getAvailableSlotsForUser(userId)
    return res.status(200).json(slots)
  } catch (err) {
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
    if (!(await requireActiveFocusSubscription(userId, res))) return
    const { id } = req.params
    const result = await bookPrivateSlot(userId, id)
    return res.status(200).json(result)
  } catch (err) {
    if (err instanceof Error) {
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
    const { sessionIdFrom, targetUserIds } = req.body as { sessionIdFrom?: string; targetUserIds?: string[] }
    if (!sessionIdFrom) return res.status(400).json({ error: 'sessionIdFrom required' })
    const result = await createSwapRequest(userId, sessionIdFrom, targetUserIds)
    return res.status(200).json(result)
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
