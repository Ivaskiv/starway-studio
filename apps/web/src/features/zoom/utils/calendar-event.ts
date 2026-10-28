import type { ZoomCalendarSession } from '../zoom.types'
import { isZoomLinkActive } from '../zoom.utils'
import { DEFAULT_ZOOM_SESSION_DURATION_MINUTES, KYIV_TIME_LABEL, KYIV_TIMEZONE } from './zoomDateTime.utils'

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildCalendarEvent(session: ZoomCalendarSession): string {
  const startDate = new Date(session.scheduledAt);
  const endDate = new Date(startDate.getTime() + (session.durationMinutes ?? 60) * 60 * 1000);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'SUMMARY:ФОКУС Zoom-практика',
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    'DESCRIPTION:Zoom-практика ФОКУС',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
}

function formatGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Returns a non-mutating Google Calendar template only for a current USER
 * booking. The instant dates plus `ctz` keep the Europe/Kyiv display correct
 * across daylight-saving changes.
 */
export function buildGoogleCalendarTemplateUrl(
  session: ZoomCalendarSession,
  now = new Date(),
): string | null {
  const startAt = new Date(session.scheduledAt)
  const isFutureBooking = session.isMyBooking === true
    && Number.isFinite(startAt.getTime())
    && startAt.getTime() > now.getTime()
    && session.status === 'SCHEDULED'
    && session.commerceStatus !== 'EXPIRED'
    && session.commerceStatus !== 'CANCELLED'
    && session.commerceStatus !== 'REJECTED'
  const title = session.topic.trim()

  if (!isFutureBooking || !title) return null

  const durationMinutes = typeof session.durationMinutes === 'number' && session.durationMinutes > 0
    ? session.durationMinutes
    : DEFAULT_ZOOM_SESSION_DURATION_MINUTES
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000)
  const details = [`${KYIV_TIME_LABEL}: ${KYIV_TIMEZONE}`]
  const canIncludeZoomLink = Boolean(session.zoomLink)
    && /^https:\/\//i.test(session.zoomLink)
    && isZoomLinkActive(session.scheduledAt)

  if (canIncludeZoomLink) details.push(`Zoom: ${session.zoomLink}`)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleCalendarDate(startAt)}/${formatGoogleCalendarDate(endAt)}`,
    details: details.join('\n'),
    ctz: KYIV_TIMEZONE,
  })

  if (canIncludeZoomLink) params.set('location', 'Zoom')

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
