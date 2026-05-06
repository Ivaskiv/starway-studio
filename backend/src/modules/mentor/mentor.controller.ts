import type { Request, Response } from 'express'
import { runMentor } from '../../core/mentor/mentorEngine.js'
import type { MentorChannel } from '../../core/mentor/types.js'

function isMentorChannel(value: unknown): value is MentorChannel {
  return value === 'web' || value === 'telegram' || value === 'miniapp'
}

export async function testMentor(req: Request, res: Response) {
  try {
    const { patterns, scores, channel } = req.body ?? {}

    const result = runMentor(
      {
        userId: 'test_user',
        patterns: Array.isArray(patterns) ? patterns : [],
        scores: {
          procrastination: Number(scores?.procrastination ?? 0),
          avoidance: Number(scores?.avoidance ?? 0),
          engagement: Number(scores?.engagement ?? 0),
          consistency: Number(scores?.consistency ?? 0),
        },
      },
      isMentorChannel(channel) ? { channel } : {},
    )

    res.json({
      success: true,
      input: {
        patterns: Array.isArray(patterns) ? patterns : [],
        scores: {
          procrastination: Number(scores?.procrastination ?? 0),
          avoidance: Number(scores?.avoidance ?? 0),
          engagement: Number(scores?.engagement ?? 0),
          consistency: Number(scores?.consistency ?? 0),
        },
        channel: isMentorChannel(channel) ? channel : undefined,
      },
      output: result,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
