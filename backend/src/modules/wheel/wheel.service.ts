import { WheelScore, WheelUserContext } from './wheel.types.js'
import { generateWheelAnalysis } from './wheel.ai.js'

export function findWeakest(scores: WheelScore[]): WheelScore {
  return scores.reduce((min, s) =>
    s.score < min.score ? s : min,
  )
}

export function findFocus(
  scores: WheelScore[],
  weakest: WheelScore,
): WheelScore {
  return (
    scores.find(
      s => s.categoryId !== weakest.categoryId && s.score < 7,
    ) ?? weakest
  )
}

export async function analyzeWheel(
  scores: WheelScore[],
  user: WheelUserContext,
) {
  return generateWheelAnalysis(scores, user)
}
