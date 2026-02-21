// backend/src/modules/ai-mentor/services/context.ts

/**
 * 🎯 CONTEXT SERVICE
 * Build AI context for mentor sessions
 */

import { prisma } from '@/db/client.js';
import type { 
  MentorContext, 
  OnboardingStage, 
  SessionContext, 
  MentorRuleSet 
} from '../types.js';
import { STAGE_CONFIGS } from '../types.js';

/**
 * Build context for AI mentor
 */
export async function buildContext(
  userId: string,
  stage?: OnboardingStage
): Promise<{ context: MentorContext; systemPrompt: string }> {
  console.log('🔨 [Context] Building context for user:', userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      firstName: true,
      onboardingStage: true
    }
  });

  if (!user) {
    console.log('❌ [Context] User not found');
    throw new Error('User not found');
  }

  const context: MentorContext = {
    userName: user.name || user.firstName || 'Користувач'
  };

  // Determine stage
  const currentStage = (stage || user.onboardingStage || 'ENTRY') as OnboardingStage;
  
  // Get prompt for stage
  const stageConfig = STAGE_CONFIGS[currentStage];
  const systemPrompt = stageConfig?.prompt || STAGE_CONFIGS.ENTRY.prompt;

  console.log('✅ [Context] Context built:', {
    userName: context.userName,
    stage: currentStage
  });

  return { context, systemPrompt };
}

/**
 * Get user context (basic info)
 */
export async function getUserContext(userId: string) {
  console.log('👤 [Context] Getting user context for:', userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      firstName: true,
      email: true
    }
  });

  if (!user) {
    console.log('❌ [Context] User not found');
    throw new Error('User not found');
  }

  const userName = user.name || user.firstName || 'Користувач';

  console.log('✅ [Context] User context retrieved:', {
    userName,
    email: user.email
  });

  return {
    name: userName,
    email: user.email
  };
}

/**
 * Build session context with mentor rules
 */
export async function buildSessionContext(
  userId: string,
  userName: string
): Promise<SessionContext> {
  console.log('📋 [Context] Building session context for:', userId);

  const mentor = await ensureMentor(userId);
  const rules = (mentor.rules || {}) as MentorRuleSet;

  const context: SessionContext = {
    userName,
    tone: rules.tone || 'friendly',
    goals: rules.goals || [],
    morningQuestions: rules.morningQuestions || [],
    eveningQuestions: rules.eveningQuestions || []
  };

  console.log('✅ [Context] Session context built:', {
    userName: context.userName,
    tone: context.tone,
    goalsCount: context.goals.length
  });

  return context;
}

/**
 * Build AI context for generation
 */
export async function buildAIContext(
  userId: string,
  systemPrompt: string,
  chatHistory: Array<{ role: string; text: string }>
) {
  console.log('🤖 [Context] Building AI context for:', userId);

  const userContext = await getUserContext(userId);
  
  const context = {
    systemPrompt,
    userName: userContext.name,
    chatHistory
  };

  console.log('✅ [Context] AI context built:', {
    userName: context.userName,
    historyLength: chatHistory.length
  });

  return context;
}

/**
 * Ensure mentor exists for user (create if not exists)
 */
async function ensureMentor(userId: string) {
  console.log('🔍 [Context] Ensuring mentor exists for:', userId);

  const mentor = await prisma.mentor.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      rules: {},
      summary: {},
      meta: {}
    }
  });

  console.log('✅ [Context] Mentor ensured:', mentor.id);

  return mentor;
}