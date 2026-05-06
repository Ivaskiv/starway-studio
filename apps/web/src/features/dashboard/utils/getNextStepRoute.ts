import { ROUTES } from '@/config/routes'

type Progress = {
  wheelDone: boolean
  goalsDone: boolean
  visionDone: boolean
}

export function getNextStepRoute(progress: Progress) {
  if (!progress.wheelDone) {
    return ROUTES.WHEEL_START
  }

  if (!progress.goalsDone) {
    return ROUTES.GOALS
  }

  if (!progress.visionDone) {
    return ROUTES.VISION
  }

  return ROUTES.CYCLE
}

export default getNextStepRoute
