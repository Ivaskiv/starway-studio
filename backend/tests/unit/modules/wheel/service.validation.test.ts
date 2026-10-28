import { describe, expect, it } from 'vitest'

import { validateScores } from '@/modules/wheel/service.ts'
import { WHEEL_SPHERES, type WheelScore } from '@/modules/wheel/types.ts'

const validScores: WheelScore[] = WHEEL_SPHERES.map((categoryId) => ({
  categoryId,
  score: 5,
}))

describe('validateScores', () => {
  it.each([11, -1, Number.NaN])('rejects %s before workflow side effects', (invalidScore) => {
    const scores = validScores.map((score, index) => (
      index === 0 ? { ...score, score: invalidScore } : score
    ))

    expect(() => validateScores(scores)).toThrow('wheel_invalid_score')
  })
})
