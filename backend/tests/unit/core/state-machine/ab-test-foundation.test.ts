import { describe, expect, it } from 'vitest'

import {
  buildAbTestProgressPatch,
  createAbTestProgress,
  repairAbTestProgress,
  resolveAbTestFlowTimerIdsForStage,
  resolveAbTestResultKey,
  validateAbTestProgress,
} from '../../../../src/core/state-machine/abTestFoundation.ts'
import { CANONICAL_FLOW_TIMER_REGISTRY } from '../../../../src/core/state-machine/flowTimingFoundation.ts'
import {
  AB_TEST_ANSWER_KEYS,
  AB_TEST_QUESTION_IDS,
  AB_TEST_QUESTION_ORDER,
  AB_TEST_QUESTIONS,
} from '../../../../src/products/ab-system/content/abTest.questions.ts'
import { AB_TEST_RESULTS } from '../../../../src/products/ab-system/content/abTest.results.ts'
import { buildCanonicalResultKeyboard } from '../../../../src/products/ab-system/telegram/keyboard-policy.ts'

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

  it('keeps the eight-question, five-outcome flow mapped to the canonical Focus CTA', () => {
    expect(AB_TEST_QUESTION_ORDER).toEqual([
      'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8',
    ])
    expect(AB_TEST_QUESTION_IDS).toEqual(AB_TEST_QUESTION_ORDER)
    expect(Object.keys(AB_TEST_RESULTS)).toEqual([
      'state', 'goal', 'choice', 'decision', 'action',
    ])

    for (const questionId of AB_TEST_QUESTION_ORDER) {
      expect(AB_TEST_QUESTIONS[questionId].answers.map((answer) => answer.id)).toEqual(
        AB_TEST_ANSWER_KEYS,
      )
    }

    for (const answerId of AB_TEST_ANSWER_KEYS) {
      expect(resolveAbTestResultKey(AB_TEST_QUESTION_ORDER.map((question_id) => ({
        question_id,
        answer_id: answerId,
        score: 1,
        category: answerId,
        behavioral_type: AB_TEST_QUESTIONS[question_id].behavioral_type,
        analytics_hooks: [],
        answered_at: '2026-10-18T00:00:00.000Z',
        latency_ms: null,
      })))).toBe(answerId)
    }

    expect(buildCanonicalResultKeyboard({
      resultKey: 'state',
      hasFocus: false,
      isMyBooking: false,
      zoomCalendarUrl: 'https://example.test/zoom-calendar',
    }).inline_keyboard).toContainEqual([
      { text: 'ОБРАТИ ФОРМАТ У ФОКУСІ', callback_data: 'open_focus_payment' },
    ])
  })
})
