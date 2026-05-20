import { resolveCanonicalTestResult } from './testFoundation.js'

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

export async function runTiebreakerTests() {
  const canonicalTestResult = resolveCanonicalTestResult([
    { questionId: 'q1', answerId: 'goal' },
    { questionId: 'q2', answerId: 'goal' },
    { questionId: 'q3', answerId: 'decision' },
    { questionId: 'q4', answerId: 'decision' },
    { questionId: 'q5', answerId: 'state' },
    { questionId: 'q6', answerId: 'action' },
    { questionId: 'q7', answerId: 'action' },
    { questionId: 'q8', answerId: 'state' },
  ])
  assert(
    canonicalTestResult.type === 'ACTION',
    'canonical test result tiebreak failed'
  )
  assert(
    canonicalTestResult.dominantScore === 2,
    'canonical test dominant score failed'
  )

  // ── Tiebreaker tests ────────────────────────────────────────
  // Test A: Real user failure case (state=3 vs action=3) -> Must be STATE
  const testA = resolveCanonicalTestResult([
    { questionId: 'q1', answerId: 'state' }, // А
    { questionId: 'q2', answerId: 'goal' }, // Б
    { questionId: 'q3', answerId: 'state' }, // А
    { questionId: 'q4', answerId: 'goal' }, // Б
    { questionId: 'q5', answerId: 'state' }, // А
    { questionId: 'q6', answerId: 'action' }, // Д
    { questionId: 'q7', answerId: 'action' }, // Д
    { questionId: 'q8', answerId: 'action' }, // Д
  ])
  assert(testA.type === 'STATE', `Expected STATE, got ${testA.type}`)

  // Test B: goal=4 vs action=4 -> Must be GOAL
  const testB = resolveCanonicalTestResult([
    { questionId: 'q1', answerId: 'goal' },
    { questionId: 'q2', answerId: 'action' },
    { questionId: 'q3', answerId: 'goal' },
    { questionId: 'q4', answerId: 'action' },
    { questionId: 'q5', answerId: 'goal' },
    { questionId: 'q6', answerId: 'goal' },
    { questionId: 'q7', answerId: 'action' },
    { questionId: 'q8', answerId: 'action' },
  ])
  assert(testB.type === 'GOAL', `Expected GOAL, got ${testB.type}`)

  const testChainD = resolveCanonicalTestResult([
    { questionId: 'q1', answerId: 'state' },
    { questionId: 'q2', answerId: 'state' },
    { questionId: 'q3', answerId: 'state' },
    { questionId: 'q4', answerId: 'state' },
    { questionId: 'q5', answerId: 'state' },
    { questionId: 'q6', answerId: 'action' },
    { questionId: 'q7', answerId: 'action' },
    { questionId: 'q8', answerId: 'action' },
  ])
  assert(
    testChainD.type === 'STATE',
    `Clear winner: state=5 vs action=3 → expected STATE got ${testChainD.type}`
  )
}
