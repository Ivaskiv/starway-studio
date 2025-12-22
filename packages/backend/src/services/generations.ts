// packages/backend/src/services/generations.ts

import { sql } from '../db/client.js'

interface GenerationResult {
  canGenerate: boolean
  remaining: number
}

export async function checkGenerationLimit(userId: string): Promise<GenerationResult> {
  const [result] = await sql`
    SELECT * FROM check_generation_limit(${userId})
  `
  return result as GenerationResult
}

export async function incrementGenerations(
  userId: string, 
  field: string, 
  result: string
): Promise<void> {
  await sql`
    UPDATE users
    SET 
      generations_used = generations_used + 1,
      generations_history = generations_history || ${JSON.stringify([{
        field,
        result: result.slice(0, 200), 
        timestamp: new Date().toISOString()
      }])}::jsonb
    WHERE id = ${userId}
  `
}

export async function getGenerationsStats(userId: string) {
  const [user] = await sql`
    SELECT 
      plan,
      generations_used,
      generations_history,
      limits
    FROM users 
    WHERE id = ${userId}
  `
  
  const maxGens = user.plan === 'free' ? 33 : 999999
  
  return {
    total: maxGens,
    used: user.generations_used || 0,
    remaining: maxGens - (user.generations_used || 0),
    history: user.generations_history || []
  }
}