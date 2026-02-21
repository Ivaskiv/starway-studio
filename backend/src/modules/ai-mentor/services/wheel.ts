// backend/src/modules/ai-mentor/services/wheel.ts

/**
 * 🎡 WHEEL INTEGRATION SERVICE
 * Process wheel assessments and generate mentor insights
 */

import { prisma } from '@/db/client.js';
import { calculateImbalance, findFocus, findWeakest } from '@/modules/wheel/service.js';
import { getOrCreateSession, saveMessage, updateSessionActivity } from './session.js';

/**
 * Process wheel assessment and generate mentor response
 */
export async function processWheel(
  userId: string,
  scores: { categoryId: string; score: number }[],
) {
  console.log('🎡 [Wheel] Processing wheel for user:', userId);
  console.log('📊 [Wheel] Scores:', scores);

  // 1️⃣ Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true }
  });

  if (!user) {
    console.log('❌ [Wheel] User not found:', userId);
    throw new Error('User not found');
  }

  console.log('✅ [Wheel] User found:', user.name || user.id);

  // 2️⃣ Get or create mentor session
  const session = await getOrCreateSession(userId);
  console.log('✅ [Wheel] Session retrieved:', session.id);

  // 3️⃣ Calculate wheel metrics
  const weakest = findWeakest(scores);
  const focus = findFocus(scores, weakest);
  const imbalance = calculateImbalance(scores);

  console.log('📈 [Wheel] Analysis:', {
    weakest: weakest.categoryId,
    focus: focus.categoryId,
    imbalance
  });

  // 4️⃣ Generate analysis text
  const analysis = `
Аналіз Колеса Балансу:
• Найслабша сфера: ${weakest.categoryId} (${weakest.score}/10)
• Рекомендований фокус: ${focus.categoryId}
• Рівень дисбалансу: ${imbalance.toFixed(1)}

Рекомендую зосередитись на покращенні сфери "${weakest.categoryId}". 
Почни з малих кроків - навіть +1 бал буде значним прогресом!
  `.trim();

  // 5️⃣ Save mentor message
  const mentorMessage = await saveMessage({
    sessionId: session.id,
    userId,
    role: 'mentor',
    text: analysis,
    metadata: {
      type: 'wheelBalance',
      scores,
      weakest: weakest.categoryId,
      focus: focus.categoryId,
      imbalance
    },
  });

  console.log('✅ [Wheel] Mentor message saved:', mentorMessage.id);

  // 6️⃣ Add micro-tasks based on weakest sphere
  await addWheelMicroTasks(userId, weakest);

  // 7️⃣ Update session activity
  await updateSessionActivity(session.id);

  console.log('✅ [Wheel] Processing complete');

  return { session, mentorMessage };
}

/**
 * Check if monthly wheel assessment is due
 */
export async function monthlyWheelCheck(userId: string): Promise<boolean> {
  console.log('📅 [Wheel] Checking if monthly assessment is due for:', userId);

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!user) {
    console.log('❌ [Wheel] User not found:', userId);
    return false;
  }

  // Get last wheel assessment
  const lastWheel = await prisma.wheelAssessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastWheel) {
    console.log('✅ [Wheel] No previous assessment - should create');
    return true; // No wheel yet, should create
  }

  const daysSince = Math.floor(
    (Date.now() - lastWheel.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const isDue = daysSince >= 30;

  console.log('📊 [Wheel] Days since last assessment:', daysSince);
  console.log(isDue ? '✅ [Wheel] Assessment is due' : 'ℹ️  [Wheel] Assessment not due yet');

  return isDue;
}

/**
 * Add micro-tasks based on weakest sphere
 */
async function addWheelMicroTasks(
  userId: string, 
  weakest: { categoryId: string; score: number }
) {
  console.log('📝 [Wheel] Adding micro-tasks for sphere:', weakest.categoryId);

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      console.log('❌ [Wheel] User not found, skipping micro-task creation');
      return;
    }

    // Create micro-task
    const microTask = await prisma.microTask.create({
      data: {
        userId,
        title: `Покращити сферу: ${weakest.categoryId}`,
        description: `Фокус на підвищенні балу з ${weakest.score} до ${weakest.score + 1}. Почни з малих дій!`,
        source: 'wheel',
        completed: false,
      },
    });

    console.log('✅ [Wheel] Micro-task created:', microTask.id);

  } catch (error: any) {
    console.error('❌ [Wheel] Error creating micro-task:', error.message);
    // Don't throw - this is non-critical
  }
}