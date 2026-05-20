export function isLocalTelegramSmokeTest(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function isLmOnlyModeEnabled(): boolean {
  if (isLocalTelegramSmokeTest()) {
    return false
  }

  return process.env.APP_MODE === 'LM_ONLY'
}

