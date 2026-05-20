import { resolveCanonicalTestResult } from './testFoundation.js'
import { runCoreTests } from './selfTest.core.js'
import { runFlowTests } from './selfTest.flow.js'
import { runTiebreakerTests } from './selfTest.tiebreaker.js'

export async function runStateMachineSelfTest(): Promise<true> {
  await runFlowTests()
  await runCoreTests()
  await runTiebreakerTests()

  // Chain priority: state=3, action=3 → STATE
  const chainTest1 = resolveCanonicalTestResult([
    { questionId: 'q1', answerId: 'state' },
    { questionId: 'q2', answerId: 'goal' },
    { questionId: 'q3', answerId: 'state' },
    { questionId: 'q4', answerId: 'goal' },
    { questionId: 'q5', answerId: 'state' },
    { questionId: 'q6', answerId: 'action' },
    { questionId: 'q7', answerId: 'action' },
    { questionId: 'q8', answerId: 'action' },
  ])
  console.assert(chainTest1.type === 'STATE',
    `Chain1 FAIL: state=3 vs action=3 → expected STATE, got ${chainTest1.type}`)

  // Chain priority: choice=4, decision=4 → CHOICE
  const chainTest2 = resolveCanonicalTestResult([
    { questionId: 'q1', answerId: 'choice' },
    { questionId: 'q2', answerId: 'decision' },
    { questionId: 'q3', answerId: 'choice' },
    { questionId: 'q4', answerId: 'decision' },
    { questionId: 'q5', answerId: 'choice' },
    { questionId: 'q6', answerId: 'choice' },
    { questionId: 'q7', answerId: 'decision' },
    { questionId: 'q8', answerId: 'decision' },
  ])
  console.assert(chainTest2.type === 'CHOICE',
    `Chain2 FAIL: choice=4 vs decision=4 → expected CHOICE, got ${chainTest2.type}`)

  // Clear winner still works: all state → STATE
  const chainTest3 = resolveCanonicalTestResult([
    { questionId: 'q1', answerId: 'state' },
    { questionId: 'q2', answerId: 'state' },
    { questionId: 'q3', answerId: 'state' },
    { questionId: 'q4', answerId: 'state' },
    { questionId: 'q5', answerId: 'state' },
    { questionId: 'q6', answerId: 'action' },
    { questionId: 'q7', answerId: 'action' },
    { questionId: 'q8', answerId: 'action' },
  ])
  console.assert(chainTest3.type === 'STATE',
    `Chain3 FAIL: state=5 vs action=3 → expected STATE, got ${chainTest3.type}`)

  console.log('Chain priority tests: OK')

  return true
}

runStateMachineSelfTest().catch(err => {
  console.error(err)
  process.exit(1)
})
