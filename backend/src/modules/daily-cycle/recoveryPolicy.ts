export type DailyRecoveryPolicy = {
  todayKey: string
  yesterdayKey: string
  targetKey: string
  isToday: boolean
  isYesterday: boolean
  isRecoverable: boolean
  isHistoricalLocked: boolean
}

function toDateKeyPart(value: number) {
  return String(value).padStart(2, '0')
}

export function toDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getUTCFullYear()}-${toDateKeyPart(date.getUTCMonth() + 1)}-${toDateKeyPart(date.getUTCDate())}`
}

export function getRecoveryPolicy(input: Date | string, now = new Date()): DailyRecoveryPolicy {
  const target = typeof input === 'string' ? new Date(input) : input
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)

  const targetKey = toDateKey(target)
  const todayKey = toDateKey(today)
  const yesterdayKey = toDateKey(yesterday)

  const isToday = targetKey === todayKey
  const isYesterday = targetKey === yesterdayKey

  return {
    todayKey,
    yesterdayKey,
    targetKey,
    isToday,
    isYesterday,
    isRecoverable: isToday || isYesterday,
    isHistoricalLocked: targetKey < yesterdayKey,
  }
}

export function assertRecoverableDate(input: Date | string, now = new Date()) {
  const policy = getRecoveryPolicy(input, now)
  if (!policy.isRecoverable) {
    throw new Error('daily_recovery_forbidden')
  }
  return policy
}

export function isLateCompletionDay(entryDate: Date | string, completedAt: Date | string | null | undefined) {
  if (!completedAt) return false
  const entryKey = toDateKey(entryDate)
  const completedKey = toDateKey(completedAt)
  return entryKey !== completedKey
}
