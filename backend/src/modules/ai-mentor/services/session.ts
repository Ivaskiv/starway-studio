// backend/src/modules/ai-mentor/services/session.ts

/**
 * Session Service
 */

import { prisma } from '@/db/client.js';
import type { MentorMessage, MentorSession } from '../types.js';

async function getOrCreateMentorId(userId: string): Promise<string> {
  const existing = await prisma.mentor.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const expert = await prisma.user.findUnique({
    where: { id: userId },
    select: { expertId: true },
  });
  const expertId = expert?.expertId ?? process.env.DEFAULT_AI_EXPERT_ID;
  if (!expertId) {
    throw new Error('Cannot create AI mentor: missing expertId');
  }

  const created = await prisma.mentor.create({
    data: {
      userId,
      expertId,
      name: 'AI Mentor',
      slug: `ai-mentor-${userId}`,
      onboardingStage: 'ENTRY',
      rules: {},
      summary: {},
      meta: {},
      isActive: true,
    },
    select: { id: true },
  });

  return created.id;
}

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
  const mentorId = await getOrCreateMentorId(userId);
  const session = await prisma.mentorSession.create({
    data: {
      mentorId, 
      userId,
      date: new Date(),
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
  const mentorId = await getOrCreateMentorId(data.userId);
  const message = await prisma.mentorMessage.create({
    data: {
      mentorId,
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
  const normalizedStage =
    onboardingStage &&
    ['ENTRY', 'VISION', 'GOAL', 'CHOICE', 'ACTIONS', 'COMPLETED'].includes(onboardingStage)
      ? (onboardingStage as 'ENTRY' | 'VISION' | 'GOAL' | 'CHOICE' | 'ACTIONS' | 'COMPLETED')
      : undefined;

  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: {
      lastMessageAt: new Date(),
      ...(normalizedStage && { onboardingStage: normalizedStage })
    }
  });
}
