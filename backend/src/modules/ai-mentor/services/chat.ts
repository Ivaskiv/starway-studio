// backend/src/modules/ai-mentor/services/chat.ts

/**
 * Chat Service - Main chat logic
 */

import { prisma } from '@/db/client.js';
import { generateResponse } from './ai.js';
import { getOrCreateSession, saveMessage, updateSessionActivity } from './session.js';
import { buildContext } from './context.js';
import type { SendMessageDto, ChatResponse } from '../types.js';

export async function sendMessage(dto: SendMessageDto): Promise<ChatResponse> {
  const session = await getOrCreateSession(dto.userId, dto.sessionId);

  const { context, systemPrompt } = await buildContext(dto.userId);

  const userMessage = await saveMessage({
    sessionId: session.id,
    userId: dto.userId,
    role: 'USER',
    text: dto.message,
    metadata: dto.context
  });

  const aiText = await generateResponse(
    [{ role: 'user', content: dto.message }],
    systemPrompt
  );

  const mentorMessage = await saveMessage({
    sessionId: session.id,
    userId: dto.userId,
    role: 'MENTOR',
    text: aiText
  });

  await updateSessionActivity(session.id);

  return {
    session,
    userMessage,
    mentorMessage
  };
}