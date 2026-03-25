export const TRIAL_TOTAL_DAYS = 7

export function clampTrialDay(value?: number | null) {
  const day = Number(value ?? 0)
  if (!Number.isFinite(day) || day <= 0) return 0
  return Math.min(TRIAL_TOTAL_DAYS, Math.max(1, Math.floor(day)))
}

export function getTrialCompletionPercent(value?: number | null) {
  const currentDay = clampTrialDay(value)
  if (!currentDay) return 0
  return Math.min(100, Math.round((currentDay / TRIAL_TOTAL_DAYS) * 100))
}

export function getTrialDaysLeft(value?: number | null) {
  const currentDay = clampTrialDay(value)
  if (!currentDay) return 0
  return Math.max(0, TRIAL_TOTAL_DAYS - currentDay)
}
