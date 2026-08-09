export const KYIV_TIMEZONE = 'Europe/Kyiv'
export const DEFAULT_ZOOM_SESSION_DURATION_MINUTES = 60

export function getKyivDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KYIV_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  }
}

export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getTimeZoneDateParts(date, timeZone)

  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return utcTimestamp - date.getTime()
}

export function createUtcDateForTimeZone(input: {
  year: number
  month: number
  day: number
  hour?: number
  minute?: number
  second?: number
  millisecond?: number
  timeZone: string
}): Date {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour ?? 0,
    input.minute ?? 0,
    input.second ?? 0,
    input.millisecond ?? 0
  )

  const offset = getTimeZoneOffsetMs(
    new Date(utcGuess),
    input.timeZone
  )

  return new Date(utcGuess - offset)
}

export function addKyivDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)

  const base = createUtcDateForTimeZone({
    year,
    month,
    day,
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: KYIV_TIMEZONE,
  })

  const shifted = new Date(
    base.getTime() + days * 24 * 60 * 60 * 1000
  )

  return getKyivDateKey(shifted)
}

export type KyivWeekRange = {
  from: string
  to: string
  timezone: typeof KYIV_TIMEZONE
}

export function getKyivWeekRange(now = new Date()): KyivWeekRange {
  const kyivNow = getTimeZoneDateParts(now, KYIV_TIMEZONE)

  const kyivNoonUtc = createUtcDateForTimeZone({
    ...kyivNow,
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: KYIV_TIMEZONE,
  })

  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: KYIV_TIMEZONE,
    weekday: 'short',
  }).format(kyivNoonUtc)

  const weekdayIndex = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ].indexOf(weekday)

  const mondayNoonUtc = new Date(
    kyivNoonUtc.getTime() -
      Math.max(weekdayIndex, 0) * 24 * 60 * 60 * 1000
  )

  const mondayKyiv = getTimeZoneDateParts(
    mondayNoonUtc,
    KYIV_TIMEZONE
  )

  const fromDate = createUtcDateForTimeZone({
    ...mondayKyiv,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: KYIV_TIMEZONE,
  })

  return {
    from: fromDate.toISOString(),
    to: new Date(
      fromDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1
    ).toISOString(),
    timezone: KYIV_TIMEZONE,
  }
}
