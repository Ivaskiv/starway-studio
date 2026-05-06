import type { Request, Response } from 'express'
import { runOrchestrator } from '../../core/orchestrator/marketplaceOrchestrator.js'

function normalizePatterns(patterns: unknown) {
  if (!Array.isArray(patterns)) return []

  return patterns
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)
}

function normalizeScore(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

export async function testOrchestrator(req: Request, res: Response) {
  try {
    const body = req.body ?? {}
    const input = {
      userId: typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : 'test_user',
      patterns: normalizePatterns(body.patterns),
      scores: {
        engagement: normalizeScore(body.scores?.engagement),
        procrastination: normalizeScore(body.scores?.procrastination),
        avoidance: normalizeScore(body.scores?.avoidance),
      },
      context: body.context && typeof body.context === 'object' ? body.context : null,
      conversion: body.conversion && typeof body.conversion === 'object' ? body.conversion : null,
      subscription: body.subscription && typeof body.subscription === 'object' ? body.subscription : null,
    }

    const output = await runOrchestrator(input)

    res.json({
      success: true,
      input,
      output,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
