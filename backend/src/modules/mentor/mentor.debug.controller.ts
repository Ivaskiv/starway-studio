import type { Request, Response } from 'express'
import { handleConversion } from '../../core/growth/conversionHandler.js'
import { evaluateConversionTiming } from '../../core/growth/conversionTimingEngine.js'
import { runMentor } from '../../core/mentor/mentorEngine.js'
import type { BehaviorInput, MentorChannel } from '../../core/mentor/types.js'
import { validateMentorOutput } from './mentor.debug.validator.js'

type RawScores = Partial<BehaviorInput['scores']> | null | undefined

function isMentorChannel(value: unknown): value is MentorChannel {
  return value === 'web' || value === 'telegram' || value === 'miniapp'
}

function normalizeScore(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

function validateScores(scores: RawScores) {
  return {
    procrastination: normalizeScore(scores?.procrastination),
    avoidance: normalizeScore(scores?.avoidance),
    engagement: normalizeScore(scores?.engagement),
    consistency: normalizeScore(scores?.consistency),
  }
}

function validatePatterns(patterns: unknown) {
  if (!Array.isArray(patterns)) return []

  return patterns
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)
}

export async function testMentor(req: Request, res: Response) {
  try {
    const { patterns, scores, channel } = req.body ?? {}

    const input = {
      userId: 'test_user',
      patterns: validatePatterns(patterns),
      scores: validateScores(scores),
    }

    const output = runMentor(
      input,
      isMentorChannel(channel) ? { channel } : {},
    )
    const validation = validateMentorOutput(input, output)
    const conversionDecision = evaluateConversionTiming({
      userId: input.userId,
      patterns: input.patterns as Array<
        'procrastination' | 'avoidance' | 'high_engagement' | 'drop_off' | 'inconsistency'
      >,
      scores: input.scores,
      lastActivityAt: Date.now(),
    })
    const conversion = conversionDecision.shouldOffer
      ? {
          triggered: true,
          ...handleConversion({
            type: 'conversion_opportunity',
            userId: input.userId,
            triggered: true,
            timingScore: conversionDecision.timingScore,
            offerType: conversionDecision.offerType,
            reason: conversionDecision.reason,
            timestamp: Date.now(),
          }),
        }
      : {
          triggered: false,
          offerType: conversionDecision.offerType,
          reason: conversionDecision.reason,
        }

    if (!validation.passed) {
      res.status(422).json({
        success: false,
        input: {
          ...input,
          channel: isMentorChannel(channel) ? channel : undefined,
        },
        output,
        validation,
        conversion,
      })
      return
    }

    res.json({
      success: true,
      input: {
        ...input,
        channel: isMentorChannel(channel) ? channel : undefined,
      },
      output,
      validation,
      conversion,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
