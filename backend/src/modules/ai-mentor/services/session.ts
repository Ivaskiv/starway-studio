// backend/src/modules/ai-mentor/services/session.ts

/**
 * Session Service
 */

import { prisma } from '@/db/client.js';
import type { MentorSession, MentorMessage } from '../types.js';

export async function getOrCreateSession(
  userId: string,
  sessionId?: string
): Promise<MentorSession> {
  // Find existing session
  if (sessionId) {
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId }
    });
    if (session) return session as MentorSession;
  }

  // Get latest session
  const latest = await prisma.mentorSession.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  // Use if recent (last 24h)
  if (latest && (Date.now() - latest.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
    return latest as MentorSession;
  }

  // Create new session
  const session = await prisma.mentorSession.create({
    data: {
      userId,
      startedAt: new Date(),
      lastMessageAt: new Date()
    }
  });

  return session as MentorSession;
}

export async function getSession(userId: string, sessionId?: string): Promise<MentorSession> {
  if (sessionId) {
    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } }
    });
    if (!session) throw new Error('Session not found');
    return session as any;
  }

  const latest = await prisma.mentorSession.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } }
  });

  if (!latest) throw new Error('No session found');
  return latest as any;
}

export async function getSessionMessages(sessionId: string): Promise<MentorMessage[]> {
  const messages = await prisma.mentorMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 50
  });
  return messages as MentorMessage[];
}

export async function getChatHistory(userId: string, limit: number = 50): Promise<MentorMessage[]> {
  const messages = await prisma.mentorMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  return messages as MentorMessage[];
}

export async function saveMessage(data: {
  sessionId: string;
  userId: string;
  role: string;
  text: string;
  metadata?: Record<string, any>;
}): Promise<MentorMessage> {
  const message = await prisma.mentorMessage.create({
    data: {
      sessionId: data.sessionId,
      userId: data.userId,
      role: data.role.toUpperCase() as any,
      text: data.text,
      metadata: data.metadata || {}
    }
  });
  return message as MentorMessage;
}

export async function updateSessionActivity(
  sessionId: string,
  onboardingStage?: string
): Promise<void> {
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      lastMessageAt: new Date(),
      ...(onboardingStage && { onboardingStage })
    }
  });
}