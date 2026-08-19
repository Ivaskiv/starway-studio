import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import {
  addKyivDays,
  getKyivDateKey,
  KYIV_TIMEZONE,
} from './zoomDateTime.utils'

export type BookingRegistrationStatus =
  | 'booked'
  | 'already_booked'
  | 'no_active_subscription'
  | 'error'

export const MINIAPP_ACCENT_BUTTON_CLASSNAME =
  'rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-60'

export const ZOOM_BOUNDARY_REFRESH_BUFFER_MS = 1000

export function isCoachRole(role: string | null | undefined): boolean {
  const normalizedRole = String(role ?? '').trim().toUpperCase()

  return (
    normalizedRole === 'EXPERT' ||
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'SUPERADMIN'
  )
}

export function resolveNearestSessionDateLabel(
  scheduledAt: string,
  now = new Date(),
) {
  const sessionDate = new Date(scheduledAt)
  const sessionDateKey = getKyivDateKey(sessionDate)
  const todayKey = getKyivDateKey(now)
  const tomorrowKey = addKyivDays(todayKey, 1)

  const timeLabel = sessionDate.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIMEZONE,
  })

  if (sessionDateKey === todayKey) {
    return `Сьогодні · ${timeLabel}`
  }

  if (sessionDateKey === tomorrowKey) {
    return `Завтра · ${timeLabel}`
  }

  const dateLabel = sessionDate.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    timeZone: KYIV_TIMEZONE,
  })

  return `${dateLabel} · ${timeLabel}`
}

export async function performBookingScreenRegistration(input: {
  sessionId: string
  registerAttendee: (payload: { sessionId: string }) => {
    unwrap: () => Promise<unknown>
  }
  refetchCurrentWeek: () => Promise<unknown> | unknown
  refetchUpcoming: () => Promise<unknown> | unknown
  refetchMySessions: () => Promise<unknown> | unknown
}): Promise<BookingRegistrationStatus> {
  try {
    await input.registerAttendee({ sessionId: input.sessionId }).unwrap()

    await Promise.all([
      input.refetchCurrentWeek(),
      input.refetchUpcoming(),
      input.refetchMySessions(),
    ])

    return 'booked'
  } catch (error) {
    const normalizedError =
      typeof error === 'object' && error && 'data' in error
        ? (error as { data?: { error?: string } }).data?.error
        : null

    if (normalizedError === 'ALREADY_BOOKED') {
      return 'already_booked'
    }

    if (normalizedError === 'NO_ACTIVE_SUBSCRIPTION') {
      return 'no_active_subscription'
    }

    return 'error'
  }
}
