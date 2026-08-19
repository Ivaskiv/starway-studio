export const KYIV_TIME_ZONE = 'Europe/Kyiv'

export function getKyivNow(now = new Date()): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: KYIV_TIME_ZONE }))
}

export function startOfKyivWeek(now = new Date()): Date {
  const date = getKyivNow(now)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function endOfKyivWeek(now = new Date()): Date {
  const date = startOfKyivWeek(now)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

export function startOfKyivDay(now = new Date()): Date {
  const date = getKyivNow(now)
  date.setHours(0, 0, 0, 0)
  return date
}

export function endOfRollingKyivWindow(now = new Date(), days = 14): Date {
  const date = startOfKyivDay(now)
  date.setDate(date.getDate() + days)
  return date
}
