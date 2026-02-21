// backend/src/modules/ai-mentor/controllers/chat.ts

import { NextFunction, Request, Response } from 'express';
import {
  getChatHistory as mentorGetChatHistory,
  getSession as mentorGetSession,
  sendMessage as mentorSendMessage,
} from '../services/index.js';
import { SendMessageDto } from '../types.js';

// ==========================================
// CHAT ENDPOINTS
// ==========================================

/**
 * POST /api/mentor/chat
 * Send message to AI mentor
 */
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, sessionId, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const dto: SendMessageDto = {
      userId,
      message,
      sessionId,
      context,
    };

    const response = await mentorSendMessage(dto);
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[ChatController] sendMessage error:', error);
    next(error);
  }
}

/**
 * GET /api/mentor/session/:sessionId?
 * Get current or specific session
 */
export async function getSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;
    const session = await mentorGetSession(userId, sessionId);

    return res.status(200).json(session);
  } catch (error: any) {
    console.error('[ChatController] getSession error:', error);
    next(error);
  }
}

/**
 * GET /api/mentor/history
 * Get chat history
 */
export async function getChatHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const history = await mentorGetChatHistory(userId, limit);

    return res.status(200).json(history);
  } catch (error: any) {
    console.error('[ChatController] getChatHistory error:', error);
    next(error);
  }
}
