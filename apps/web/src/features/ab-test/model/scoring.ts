import {
  ANSWER_TO_RESULT,
  RESULT_ORDER,
  ZERO_BREAKDOWN,
} from './config'
import type {
  AbTestAnswerId,
  AbTestQuestion,
  AbTestResultType,
  ResultScoreRow,
  AbTestResult,
} from './types'

export function resolveScoreRows(
  questions: AbTestQuestion[],
  answers: Record<string, string>
): ResultScoreRow[] {
  return questions.flatMap((question) => {
    const answerId = answers[question.id]
    if (!answerId) return []

    const answerIndex = question.answers.findIndex(
      (answer) => answer.id === answerId
    )
    if (answerIndex < 0) return []

    const answer = question.answers[answerIndex]
    return [
      {
        questionId: question.id,
        answerId: answer.id as AbTestAnswerId,
        answerText: answer.text,
        score: 5 - answerIndex,
        category: answer.id as ResultScoreRow['category'],
      },
    ]
  })
}

export function chooseWinner(
  categoryBreakdown: Record<AbTestResultType, number>,
  tieBreakBreakdown: Record<AbTestResultType, number>,
  tiebreakerAnswersReversed: Array<{ type: AbTestResultType }>
): AbTestResultType {
  const highestScore = Math.max(
    ...RESULT_ORDER.map((type) => categoryBreakdown[type])
  )
  const topCandidates = RESULT_ORDER.filter(
    (type) => categoryBreakdown[type] === highestScore
  )

  if (topCandidates.length === 1) {
    return topCandidates[0]
  }

  const highestTieBreakScore = Math.max(
    ...topCandidates.map((type) => tieBreakBreakdown[type])
  )
  const tieBreakCandidates = topCandidates.filter(
    (type) => tieBreakBreakdown[type] === highestTieBreakScore
  )

  if (tieBreakCandidates.length === 1) {
    return tieBreakCandidates[0]
  }

  for (const answer of tiebreakerAnswersReversed) {
    if (tieBreakCandidates.includes(answer.type)) {
      return answer.type
    }
  }

  return topCandidates[0] ?? 'STATE'
}

export function resolveCanonicalTestResultLocal(
  questions: AbTestQuestion[],
  answers: Record<string, string>
) {
  const scoredAnswers = resolveScoreRows(questions, answers)
  const categoryBreakdown: Record<AbTestResultType, number> = {
    ...ZERO_BREAKDOWN,
  }
  const tieBreakBreakdown: Record<AbTestResultType, number> = {
    ...ZERO_BREAKDOWN,
  }
  const tieBreakQuestionIds = new Set(['q6', 'q7', 'q8'])

  for (const answer of scoredAnswers) {
    const resultType = ANSWER_TO_RESULT[answer.answerId]
    categoryBreakdown[resultType] += 1
    if (tieBreakQuestionIds.has(answer.questionId)) {
      tieBreakBreakdown[resultType] += 1
    }
  }

  const tiebreakerAnswersReversed = [...scoredAnswers]
    .filter((answer) => tieBreakQuestionIds.has(answer.questionId))
    .sort((left, right) => right.questionId.localeCompare(left.questionId, undefined, { numeric: true }))
    .map((answer) => ({ type: ANSWER_TO_RESULT[answer.answerId] }))

  const type = chooseWinner(
    categoryBreakdown,
    tieBreakBreakdown,
    tiebreakerAnswersReversed
  )

  return {
    type,
    dominantScore: categoryBreakdown[type],
    categoryBreakdown,
    scoredAnswers,
  }
}

export function buildInactivityDays(scoredAnswers: ResultScoreRow[]): number {
  if (!scoredAnswers.length) return 0

  const totalScore = scoredAnswers.reduce(
    (sum, answer) => sum + answer.score,
    0
  )
  return Math.max(
    0,
    Math.min(30, Math.round((scoredAnswers.length * 5 - totalScore) / 2))
  )
}
