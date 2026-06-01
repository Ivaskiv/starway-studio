import type {
  AbTestAnswerKey,
  AbTestQuestionId,
} from '../content/abTest.questions.js'

export type AbTestCallbackAction =
  | { kind: 'entry' }
  | { kind: 'intro' }
  | { kind: 'resume' }
  | { kind: 'restart' }
  | { kind: 'show_result' }
  | { kind: 'start' }
  | { kind: 'email_continue' }
  | { kind: 'email_skip' }
  | { kind: 'restore' }
  | { kind: 'menu' }
  | { kind: 'subscription' }
  | { kind: 'edit'; questionId: AbTestQuestionId }
  | {
      kind: 'answer'
      questionId: AbTestQuestionId
      answerId: AbTestAnswerKey
      revision: number | null
    }

export function parseAbTestCallback(
  action: string,
): AbTestCallbackAction | null {
  if (action === 'ab_test:entry') return { kind: 'entry' }
  if (action === 'ab_test:intro') return { kind: 'intro' }
  if (action === 'ab_test:resume') return { kind: 'resume' }
  if (action === 'ab_test:restart') return { kind: 'restart' }
  if (action === 'ab_test:show_result') return { kind: 'show_result' }
  if (action === 'ab_test:start') return { kind: 'start' }
  if (action === 'ab_test:email_continue') return { kind: 'email_continue' }
  if (action === 'ab_test:email_skip') return { kind: 'email_skip' }
  if (action === 'ab_test:restore') return { kind: 'restore' }
  if (action === 'ab_test:menu') return { kind: 'menu' }
  if (action === 'ab_test:subscription') return { kind: 'subscription' }

  const editMatch = action.match(/^ab_test_edit:(q[1-8])$/)
  if (editMatch) {
    return { kind: 'edit', questionId: editMatch[1] as AbTestQuestionId }
  }

  const match = action.match(/^ab_test_answer:([^:]+):([^:]+):?(\d+)?$/)
  if (!match) return null

  const revision = match[3] ? Number(match[3]) : null
  return {
    kind: 'answer',
    questionId: match[1] as AbTestQuestionId,
    answerId: match[2] as AbTestAnswerKey,
    revision: Number.isFinite(revision ?? NaN) ? revision : null,
  }
}
