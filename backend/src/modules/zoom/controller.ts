// backend/src/modules/zoom/controller.ts
/**
 * Zoom Controller
 */

import { Request, Response, NextFunction } from 'express';
import { createZoomSession, getUpcomingZoom, registerAttendee, saveZoomDecision, getSessionAttendees } from './service.js';

export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { scheduledAt, topic } = req.body;
    if (!scheduledAt || !topic) {
      return res.status(400).json({ error: 'scheduledAt and topic required' });
    }

    const session = await createZoomSession(new Date(scheduledAt), topic);
    return res.status(200).json(session);
  } catch (error: any) {
    console.error('[ZoomController] createSession error:', error);
    next(error);
  }
}

export async function getUpcoming(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await getUpcomingZoom();
    return res.status(200).json(session);
  } catch (error: any) {
    console.error('[ZoomController] getUpcoming error:', error);
    next(error);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { sessionId, requestTopic } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId required' });
    }

    const attendee = await registerAttendee(userId, sessionId, requestTopic);
    return res.status(200).json(attendee);
  } catch (error: any) {
    console.error('[ZoomController] register error:', error);
    next(error);
  }
}

export async function saveDecision(req: Request, res: Response, next: NextFunction) {
  try {
    const { attendeeId, decision } = req.body;
    if (!attendeeId || !decision) {
      return res.status(400).json({ error: 'attendeeId and decision required' });
    }

    const attendee = await saveZoomDecision(attendeeId, decision);
    return res.status(200).json(attendee);
  } catch (error: any) {
    console.error('[ZoomController] saveDecision error:', error);
    next(error);
  }
}

export async function getAttendees(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params;
    const attendees = await getSessionAttendees(sessionId);
    return res.status(200).json(attendees);
  } catch (error: any) {
    console.error('[ZoomController] getAttendees error:', error);
    next(error);
  }
}