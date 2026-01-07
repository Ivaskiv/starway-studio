// packages/backend/src/services/generations.ts

import { sql } from '../db/client.js';

interface GenerationResult {
  canGenerate: boolean;
  remaining: number;
}

export async function checkGenerationLimit(userId: string): Promise<GenerationResult> {
  try {
    const [user] = await sql`
      SELECT 
        COALESCE(generations_used, 0) as generations_used,
        COALESCE(generations_limit, 33) as generations_limit,
        COALESCE(plan, 'free') as plan
      FROM users 
      WHERE id = ${userId}
    `;

    if (!user) {
      throw new Error('User not found');
    }

    const maxGens = user.plan === 'free' ? 33 : user.plan === 'pro' ? 333 : 999999;
    const used = user.generations_used || 0;
    const remaining = Math.max(0, maxGens - used);

    console.log(`🔍 [Generations] User ${userId}: ${used}/${maxGens} (${remaining} remaining)`);

    return {
      canGenerate: remaining > 0,
      remaining,
    };
  } catch (error: any) {
    console.error('❌ [Generations] Check limit error:', error);
    // ✅ Fallback: дозволяємо генерацію якщо помилка БД
    return {
      canGenerate: true,
      remaining: 33,
    };
  }
}

export async function incrementGenerations(
  userId: string,
  field: string,
  result: string
): Promise<void> {
  try {
    await sql`
      UPDATE users
      SET 
        generations_used = COALESCE(generations_used, 0) + 1,
        updated_at = NOW()
      WHERE id = ${userId}
    `;

    console.log(`✅ [Generations] Incremented for user ${userId}: ${field}`);
  } catch (error: any) {
    console.error('❌ [Generations] Increment error:', error);
    // Не кидаємо помилку - генерація вже відбулась
  }
}

export async function getGenerationsStats(userId: string) {
  try {
    const [user] = await sql`
      SELECT 
        COALESCE(plan, 'free') as plan,
        COALESCE(generations_used, 0) as generations_used,
        COALESCE(generations_limit, 33) as generations_limit
      FROM users 
      WHERE id = ${userId}
    `;

    if (!user) {
      throw new Error('User not found');
    }

    const maxGens = user.plan === 'free' ? 33 : user.plan === 'pro' ? 333 : 999999;

    return {
      total: maxGens,
      used: user.generations_used || 0,
      remaining: Math.max(0, maxGens - (user.generations_used || 0)),
      plan: user.plan,
    };
  } catch (error: any) {
    console.error('❌ [Generations] Stats error:', error);
    return {
      total: 33,
      used: 0,
      remaining: 33,
      plan: 'free',
    };
  }
}