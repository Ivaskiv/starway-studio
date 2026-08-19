import type {
  ProgressBallState,
} from './types'

export function getProgressLabel(currentIndex: number, total: number) {
  return `${Math.min(currentIndex + 1, total)} / ${total}`
}

export function getBallState(
  ballIndex: number,
  currentIndex: number,
  isComplete: boolean
): ProgressBallState {
  if (isComplete) return 'done'
  if (ballIndex < currentIndex) return 'done'
  if (ballIndex === currentIndex) return 'active'
  return 'pending'
}
