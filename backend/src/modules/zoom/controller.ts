// backend/src/modules/zoom/controller.ts
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../db/client.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';
import { resolveTelegramProductSummary } from '../telegram-mentor/services/productSummary.service.js';
import { markAbTestZoomAttended, markAbTestZoomRegistered } from '@/products/ab-system/telegram/abTest.service.js';
import { schedulePostZoomBridge, scheduleUpgradeOffer } from '@/modules/subscriptions/payments/business.js';
import { resolveUserLifecycle } from '@/modules/users/runtime/resolveUserLifecycle.js';
import { notificationService } from '../../services/notifications/NotificationService.js';
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js';
import {
  sendDedupedTelegramMessage,
  sendOpsTelegramMessage,
} from '../../lib/telegram.js';
import {
  assertCanBookGroupPracticeSession,
  createZoomSession,
  getCurrentWeekZoomOverview,
  getPublicCurrentWeekZoomOverview,
  getUserLatestWeeklyReportSummary,
  getSessionById,
  getSessionAttendees,
  getUpcomingZoom,
  getUpcomingZoomBookingView,
  getZoomBookingNotificationContext,
  getUserPreviousZoomSessionRecap,
  markAttended,
  registerAttendee,
  saveBookingPreparationForAttendee,
  saveBookingQuestionForAttendee,
  savePostSessionReport,
} from './service.js';
import { ZoomSessionWithAttendance } from './types.js';
import { EXCHANGE_PRICE, getZoomExchangeAccessPolicy } from '../subscriptions/payments/focus.access.js';

async function notifyCoachAboutZoomBooking(
  userId: string,
  sessionId: string,
  kind: 'booking' | 'question'
): Promise<void> {
  try {
    const context = await getZoomBookingNotificationContext(userId, sessionId)
    if (!context) return

    const scheduledLabel = context.session.scheduledAt.toLocaleString('uk-UA', {
      timeZone: 'Europe/Kyiv',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })

    const usernameLine = context.username ? `\n@${context.username}` : ''

    const text =
      kind === 'question' && context.myQuestion
        ? [
            'НОВЕ ПИТАННЯ ДО ZOOM',
            '',
            `${context.displayName}${usernameLine}`,
            '',
            scheduledLabel,
            `Питання №${context.myQuestion.position} у черзі`,
            '',
            `«${context.myQuestion.text}»`,
            '',
            `Учасників: ${context.attendeesCount}`,
          ].join('\n')
        : [
            'НОВИЙ ЗАПИС НА ZOOM',
            '',
            `${context.displayName}${usernameLine}`,
            '',
            scheduledLabel,
            '',
            `Учасників: ${context.attendeesCount}`,
          ].join('\n')

    await sendOpsTelegramMessage(text, undefined, {
      messageType:
        kind === 'question'
          ? 'zoom_booking_question'
          : 'zoom_booking_registered',
      source: 'zoom.controller',
    })
  } catch (error) {
    console.error('[ZOOM_COACH_NOTIFY_ERROR]', {
      userId,
      sessionId,
      kind,
      error,
    })
  }
}

// Отримуємо expertId з бази по userId (найнадійніше)
const getCurrentExpertId = async (userId: string | undefined): Promise<string> => {
  if (!userId) throw new Error('Unauthorized: no user ID');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expertId: true },
  });

  if (!user?.expertId) throw new Error('Expert ID not found for this user');
  return user.expertId;
};

const getTelegramChatId = async (userId: string): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  });

  return user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null;
};

export async function syncZoomRegistrationLifecycle(userId: string, sessionId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lifecycleState: 'ZOOM_MEMBER',
    },
  });
  const state = await resolveUserState(userId).catch(() => null);
  await trackEvent({
    userId,
    type: 'ZOOM_REGISTERED',
    source: 'web',
    state,
    payload: {
      sessionId,
      attended_live: false,
      zoom_index: 1,
    },
  });
  await markAbTestZoomRegistered(userId, sessionId).catch(() => undefined)
}

export async function createSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { scheduledAt, topic, requests } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt required' });
    }

    // Парсимо дату (body часто приходить як string)
    const parsedScheduledAt = new Date(scheduledAt);
    if (isNaN(parsedScheduledAt.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledAt format' });
    }

    // Topic — з body або дефолт
    const finalTopic = topic?.trim() || 'Щотижнева сесія балансу';

    // Отримуємо expertId з бази (єдиний надійний спосіб)
    const expertId = await getCurrentExpertId(userId);

    const session = await createZoomSession(
      expertId,
      parsedScheduledAt,
      finalTopic,
      requests ?? [],
    );

    return res.status(201).json(session);
  } catch (err) {
    if (err instanceof Error && err.message === 'Цього тижня всі слоти зайняті. Запропонувати наступний тиждень?') {
      return res.status(409).json({
        error: err.message,
        cta: 'Наступний тиждень',
      })
    }
    next(err);
  }
}

// решта ендпоінтів без змін
export async function getUpcoming(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const session = req.user?.id
      ? await getUpcomingZoomBookingView(req.user.id)
      : await getUpcomingZoom()

    if (req.user?.id) {
      console.info('[ZOOM_UPCOMING_LIVE]', {
        userId: req.user.id,
        sessionId: session?.id ?? null,
        attendeesCount:
          session && 'attendeesCount' in session
            ? session.attendeesCount
            : null,
        isMyBooking:
          session && 'isMyBooking' in session
            ? session.isMyBooking
            : null,
        myQuestion:
          session && 'myQuestion' in session
            ? session.myQuestion
            : null,
        questionPreviews:
          session && 'questionPreviews' in session
            ? session.questionPreviews
            : null,
        questionsCount:
          session && 'questionsCount' in session
            ? session.questionsCount
            : null,
      })
    }

    return res.status(200).json(session ?? null);
  } catch (err) {
    next(err);
  }
}

export async function register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId, questionText } = req.body as {
      sessionId?: string
      questionText?: string
    }
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const session = await getSessionById(sessionId)
    if (!session) return res.status(404).json({ error: 'session_not_found' })

    const sessionMeta =
      session.requests && typeof session.requests === 'object' && !Array.isArray(session.requests)
        ? session.requests as Record<string, unknown>
        : {}
    const sessionType = typeof sessionMeta.type === 'string' ? sessionMeta.type : session.type

    if (sessionType === 'group_practice') {
      try {
        await assertCanBookGroupPracticeSession({ userId, sessionId })
      } catch (error) {
        if (error instanceof Error && error.message === 'NO_ACTIVE_SUBSCRIPTION') {
          return res.status(403).json({ error: 'NO_ACTIVE_SUBSCRIPTION' })
        }
        if (error instanceof Error && error.message === 'slot_full') {
          return res.status(409).json({ error: 'slot_full' })
        }
        if (error instanceof Error && error.message === 'session_unavailable') {
          return res.status(409).json({ error: 'session_unavailable' })
        }
        if (error instanceof Error && error.message === 'session_not_found') {
          return res.status(404).json({ error: 'session_not_found' })
        }
        throw error
      }
    }

    const attendee = await registerAttendee(userId, sessionId);
    const normalizedQuestionText = String(questionText ?? '').trim()
    if (normalizedQuestionText) {
      await saveBookingQuestionForAttendee(userId, sessionId, normalizedQuestionText)
    }
    await syncZoomRegistrationLifecycle(userId, sessionId)

    void notifyCoachAboutZoomBooking(userId, sessionId, 'booking')

    if (normalizedQuestionText) {
      void notifyCoachAboutZoomBooking(userId, sessionId, 'question')
    }

    return res.status(201).json(attendee);
  } catch (err) {
    next(err);
  }
}

export async function saveBookingQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { sessionId, questionText } = req.body as {
      sessionId?: string
      questionText?: string
    }

    const normalizedSessionId = String(sessionId ?? '').trim()
    const normalizedQuestionText = String(questionText ?? '').trim()

    if (!normalizedSessionId) {
      return res.status(400).json({ error: 'sessionId required' })
    }

    if (!normalizedQuestionText) {
      return res.status(400).json({ error: 'questionText required' })
    }

    const event = await saveBookingQuestionForAttendee(
      userId,
      normalizedSessionId,
      normalizedQuestionText,
    )

    void notifyCoachAboutZoomBooking(
      userId,
      normalizedSessionId,
      'question',
    )

    return res.status(201).json({
      ok: true,
      id: event.id,
      createdAt: event.createdAt,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'booking_not_found') {
      return res.status(404).json({ error: 'booking_not_found' })
    }
    if (err instanceof Error && err.message === 'questionText required') {
      return res.status(400).json({ error: 'questionText required' })
    }
    next(err)
  }
}

export async function saveBookingPreparation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { sessionId, preparationAnswer } = req.body as {
      sessionId?: string
      preparationAnswer?: string
    }

    const normalizedSessionId = String(sessionId ?? '').trim()
    const normalizedPreparationAnswer = String(preparationAnswer ?? '').trim()

    if (!normalizedSessionId) {
      return res.status(400).json({ error: 'sessionId required' })
    }

    if (!normalizedPreparationAnswer) {
      return res.status(400).json({ error: 'preparationAnswer required' })
    }

    const event = await saveBookingPreparationForAttendee(
      userId,
      normalizedSessionId,
      normalizedPreparationAnswer,
    )

    return res.status(201).json({
      ok: true,
      id: event.id,
      createdAt: event.createdAt,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'booking_not_found') {
      return res.status(404).json({ error: 'booking_not_found' })
    }
    if (err instanceof Error && err.message === 'preparationAnswer required') {
      return res.status(400).json({ error: 'preparationAnswer required' })
    }
    next(err)
  }
}

export async function exchangeRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { sessionIdFrom, sessionIdTo } = req.body as {
      sessionIdFrom?: string
      sessionIdTo?: string
    }

    if (!String(sessionIdFrom ?? '').trim()) {
      return res.status(400).json({ error: 'sessionIdFrom required' })
    }

    if (!String(sessionIdTo ?? '').trim()) {
      return res.status(400).json({ error: 'sessionIdTo required' })
    }

    const policy = await getZoomExchangeAccessPolicy(userId)

    if (policy.state !== 'FOCUS_ACTIVE') {
      return res.status(402).json({
        error: 'PAID_REQUIRED',
        message: 'Обмін доступний для учасників ФОКУС або за оплату',
        price: EXCHANGE_PRICE,
        accessState: policy.state,
        upsell: {
          title: policy.promo.title,
          body: policy.promo.body,
          benefits: policy.promo.benefits,
          paymentLabel: 'Оплатити',
          focusLabel: 'Вступити у ФОКУС',
        },
      })
    }

    return res.status(200).json({
      ok: true,
      accessState: policy.state,
      isFree: true,
      message: 'Обмін доступний безкоштовно для учасників ФОКУС',
      nextAction: 'retry_exchange',
    })
  } catch (err) {
    next(err)
  }
}

export async function markAttendedHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { attendeeId } = req.body;
    if (!attendeeId) return res.status(400).json({ error: 'attendeeId required' });

    const attendee = await markAttended(attendeeId);
    const state = await resolveUserState(attendee.userId).catch(() => null);
    await trackEvent({
      userId: attendee.userId,
      type: 'ZOOM_ATTENDED',
      source: 'web',
      state,
      payload: {
        sessionId: attendee.sessionId,
        attended_live: true,
        zoom_index: 1,
      },
    });
    const productSummary = await resolveTelegramProductSummary(attendee.userId).catch(() => null)
    const primaryProductKey = productSummary?.primary?.key ?? null
    if (primaryProductKey === 'STANKEY') {
      // STANKEY: isolated product — not ecosystem
      return res.status(200).json(attendee);
    }

    await markAbTestZoomAttended(attendee.userId, attendee.sessionId).catch(() => undefined)

    const user = await prisma.user.findUnique({
      where: { id: attendee.userId },
      select: {
        lifecycleState: true,
        currentState: true,
        currentStep: true,
        funnelStage: true,
        settings: true,
      },
    })
    const settings = user?.settings && typeof user.settings === 'object' && !Array.isArray(user.settings)
      ? user.settings as Record<string, unknown>
      : {}
    const hardBridgeSentAt = typeof settings.hardBridgeSentAt === 'string' ? settings.hardBridgeSentAt : null
    const zoomCount = await prisma.zoomSessionAttendee.count({
      where: {
        userId: attendee.userId,
        attended: true,
      },
    })

    if (zoomCount === 1 && (user?.lifecycleState === 'FOCUS_PAID' || user?.lifecycleState === 'ZOOM_MEMBER')) {
      await prisma.user.update({
        where: { id: attendee.userId },
        data: { lifecycleState: 'POST_ZOOM_1' },
      })
    }

    const resolvedLifecycle = resolveUserLifecycle(user ?? {}).value
    const bridge = schedulePostZoomBridge(attendee.userId, {
      zoomCount,
      lifecycle: resolvedLifecycle,
      bridgeSentAt: typeof settings.bridgeSentAt === 'string' ? settings.bridgeSentAt : null,
      productKey: primaryProductKey,
    })

    if (bridge.scheduled) {
      try {
        const bridgeSentAt = new Date().toISOString()
        await prisma.user.update({
          where: { id: attendee.userId },
          data: {
            settings: {
              ...settings,
              bridgeSentAt,
            },
          },
        })

        await notificationService.schedule(NotificationEvent.AB_TEST_FOLLOWUP, attendee.userId, new Date(Date.now() + bridge.delayMs), {
          flow_timer_id: 'PLATFORM_INVITE_AFTER_ZOOM_1',
          lifecycle_stage: 'S7_PLATFORM_INVITE',
          delay_ms: bridge.delayMs,
          message_key: 'PLATFORM_INVITE_AFTER_ZOOM',
          result_key: null,
          payment_url: bridge.paymentUrl,
        }).catch(() => undefined)
      } catch (bridgeError) {
        console.warn('⚠️ Post-Zoom bridge scheduling skipped', {
          userId: attendee.userId,
          error: bridgeError instanceof Error ? bridgeError.message : 'unknown_error',
        })
      }
    }

    const upgradeOffer = scheduleUpgradeOffer(attendee.userId, {
      zoomCount,
      lifecycle: resolvedLifecycle,
      bridgeSentAt: typeof settings.bridgeSentAt === 'string' ? settings.bridgeSentAt : null,
      hardBridgeSentAt,
      productKey: primaryProductKey,
    })

    if (upgradeOffer.scheduled) {
      const chatId = await getTelegramChatId(attendee.userId)
      if (chatId) {
        try {
          await sendDedupedTelegramMessage(chatId, upgradeOffer.text, {
            reply_markup: {
              inline_keyboard: [
                [{ text: upgradeOffer.ctaText, url: upgradeOffer.paymentUrl }],
              ],
            },
          })

          await prisma.user.update({
            where: { id: attendee.userId },
            data: {
              settings: {
                ...settings,
                hardBridgeSentAt: new Date().toISOString(),
              },
            },
          }).catch(() => undefined)
        } catch (error) {
          console.warn('⚠️ Hard bridge scheduling skipped', {
            userId: attendee.userId,
            error: error instanceof Error ? error.message : 'unknown_error',
          })
        }
      }
    }

    return res.status(200).json(attendee);
  } catch (err) {
    next(err);
  }
}

export async function postSessionReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    const { report } = req.body;
    if (!report) return res.status(400).json({ error: 'report required' });

    const session = await savePostSessionReport(sessionId, report);
    return res.status(200).json(session);
  } catch (err) {
    next(err);
  }
}

export async function getAttendees(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    const attendees = await getSessionAttendees(sessionId);
    return res.status(200).json(attendees);
  } catch (err) {
    next(err);
  }
}
export async function getMySessions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Знаходимо всі attendee записи юзера
    const attendees = await prisma.zoomSessionAttendee.findMany({
      where:   { userId },
      include: { session: true },
      orderBy: { session: { scheduledAt: 'desc' } },
    });

    const result: ZoomSessionWithAttendance[] = attendees.map(a => ({
      ...a.session,
      scheduledAt:        a.session.scheduledAt.toISOString(),
      createdAt:          a.session.createdAt.toISOString(),
      updatedAt:          a.session.updatedAt.toISOString(),
      requests:           (a.session.requests as any[]) ?? [],
      postSessionReport:  a.session.postSessionReport as any ?? null,
      isRegistered:       true,
      attendeeId:         a.id,
    }));

    const previousSessionRecap = await getUserPreviousZoomSessionRecap(userId)
    const latestWeeklyReport = await getUserLatestWeeklyReportSummary(userId)

    return res.status(200).json({
      sessions: result,
      previousSessionRecap,
      latestWeeklyReport,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentWeekSessions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user
    if (!user?.id) return res.status(401).json({ error: 'Unauthorized' })

    const role = user.role === 'EXPERT' || user.role === 'SUPERADMIN' ? 'coach' : 'user'
    const overview = await getCurrentWeekZoomOverview({
      userId: user.id,
      role,
      expertId: user.expertId ?? undefined,
    })

    return res.status(200).json(overview)
  } catch (err) {
    next(err)
  }
}

export async function getPublicCurrentWeekSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const overview = await getPublicCurrentWeekZoomOverview()
    return res.status(200).json(overview)
  } catch (err) {
    next(err)
  }
}

export async function getPublicCalendarSessionsCompat(req: Request, res: Response, next: NextFunction) {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : 'public'
    if (type !== 'public') {
      return res.status(200).json({ sessions: [] })
    }

    const overview = await getPublicCurrentWeekZoomOverview()
    return res.status(200).json({
      sessions: overview.sessions.map((session) => ({
        id: session.id,
        title: session.topic,
        startTime: session.scheduledAt,
      })),
    })
  } catch (err) {
    next(err)
  }
}
