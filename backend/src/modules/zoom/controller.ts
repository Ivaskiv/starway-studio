// backend/src/modules/zoom/controller.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/db/client.js';
import {
  createZoomSession,
  getUpcomingZoom,
  registerAttendee,
  markAttended,
  savePostSessionReport,
  getSessionAttendees,
} from './service.js';
import { AuthenticatedRequest } from '@/types/globalTypes.js';

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
    next(err);
  }
}

// решта ендпоінтів без змін
export async function getUpcoming(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getUpcomingZoom();
    return res.status(200).json(session ?? null);
  } catch (err) {
    next(err);
  }
}

export async function register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const attendee = await registerAttendee(userId, sessionId);
    return res.status(201).json(attendee);
  } catch (err) {
    next(err);
  }
}

export async function markAttendedHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { attendeeId } = req.body;
    if (!attendeeId) return res.status(400).json({ error: 'attendeeId required' });

    const attendee = await markAttended(attendeeId);
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