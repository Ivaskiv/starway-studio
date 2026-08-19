import type { ZoomCalendarSession } from '../zoom.types'

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
