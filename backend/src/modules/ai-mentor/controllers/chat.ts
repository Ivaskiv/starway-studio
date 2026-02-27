/**
 * 📡 Chat Controller
 */

import { prisma } from '@/db/client.js';
import type { SendMessageDto, ChatResponse } from '../types.js';
import { buildSessionContext } from '@/modules/ai-mentor/services/context.js';
import { getOrCreateSession, saveMessage, updateSessionActivity } from '@/modules/ai-mentor/services/session.js';
import { generateResponse } from '@/modules/ai-mentor/services/ai.js';
import type { Request, Response } from 'express';

// ----------------------------
// Надсилає повідомлення
// ----------------------------
export async function sendMessage(req: Request, res: Response) {
  const dto: SendMessageDto = req.body;

  const session = await getOrCreateSession(dto.userId, dto.sessionId);

  const user = await prisma.user.findUnique({ where: { id: dto.userId } });
  const userName = user?.name ?? 'User';

  const sessionContext = await buildSessionContext(dto.userId, userName);

  const userMessage = await saveMessage({
    sessionId: session.id,
    userId: dto.userId,
    role: 'USER',
    text: dto.message,
    metadata: dto.context
  });

  const aiText = await generateResponse(
    [{ role: 'user', content: dto.message }],
    `Tone: ${sessionContext.tone}`
  );

  const mentorMessage = await saveMessage({
    sessionId: session.id,
    userId: dto.userId,
    role: 'MENTOR',
    text: aiText
  });

  await updateSessionActivity(session.id);

  return res.json({ session, userMessage, mentorMessage } as ChatResponse);
}

// ----------------------------
// Повертає сесію по ID
// ----------------------------
export async function getSession(req: Request, res: Response) {
  const sessionId = req.params.sessionId;

  if (!sessionId) return res.status(400).json({ error: 'SessionId is required' });

  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    include: { messages: true }
  });

  if (!session) return res.status(404).json({ error: 'Session not found' });

  return res.json(session);
}

// ----------------------------
// Повертає історію чату для користувача
// ----------------------------
export async function getChatHistory(req: Request, res: Response) {
  const userId = req.query.userId as string;

  if (!userId) return res.status(400).json({ error: 'UserId is required' });

  const messages = await prisma.mentorMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  });

  return res.json(messages);
}