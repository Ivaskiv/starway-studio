import { describe, expect, it } from 'vitest'

import {
  buildAbTestProgressPatch,
  createAbTestProgress,
  repairAbTestProgress,
  resolveAbTestFlowTimerIdsForStage,
  validateAbTestProgress,
} from '../../../../src/core/state-machine/abTestFoundation.ts'
import { CANONICAL_FLOW_TIMER_REGISTRY } from '../../../../src/core/state-machine/flowTimingFoundation.ts'

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

  it('keeps the canonical STATE dojim wave delays aligned with 24h/48h/72h/5d/7d', () => {
    const timerIds = resolveAbTestFlowTimerIdsForStage('S4_FOCUS_INVITE')
    const delays = timerIds.map((timerId) => CANONICAL_FLOW_TIMER_REGISTRY[timerId].delay_ms)

    expect(timerIds).toEqual([
      'RESULT_DOJIM_24H',
      'RESULT_DOJIM_48H',
      'RESULT_DOJIM_72H',
      'RESULT_DOJIM_5D',
      'RESULT_DOJIM_7D',
    ])
    expect(delays).toEqual([
      24 * 60 * 60 * 1000,
      48 * 60 * 60 * 1000,
      72 * 60 * 60 * 1000,
      5 * 24 * 60 * 60 * 1000,
      7 * 24 * 60 * 60 * 1000,
    ])
  })
})
