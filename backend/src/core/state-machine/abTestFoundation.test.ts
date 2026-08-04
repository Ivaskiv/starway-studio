import { describe, expect, it } from 'vitest'

import {
  buildAbTestProgressPatch,
  createAbTestProgress,
  repairAbTestProgress,
  validateAbTestProgress,
} from './abTestFoundation.js'

describe('abTestFoundation question progress validation', () => {
  it('keeps the canonical q1-opened state resumable before the first answer', () => {
    const current = createAbTestProgress(new Date('2026-07-30T18:00:00.000Z'))
    const started = buildAbTestProgressPatch(current, {
      status: 'active',
      stage: 'S2_TEST_QUESTIONS',
      current_question_id: 'q1',
      revision: 1,
      started_at: '2026-07-30T18:00:00.000Z',
      last_event_at: '2026-07-30T18:00:01.000Z',
    })

    const validation = validateAbTestProgress(started)
    const repaired = repairAbTestProgress(started, new Date('2026-07-30T18:00:02.000Z'))

    expect(validation).toEqual({
      valid: true,
      resumable: true,
      reasons: [],
    })
    expect(repaired.repaired).toBe(false)
    expect(repaired.progress.current_question_id).toBe('q1')
    expect(repaired.progress.status).toBe('active')
    expect(repaired.progress.stage).toBe('S2_TEST_QUESTIONS')
    expect(repaired.progress.answers).toEqual([])
  })
})
