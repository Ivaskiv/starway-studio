// apps/web/src/features/zoom/zoom.utils.ts

import type { ZoomCalendarSession, ZoomSessionType } from './zoom.types';

export function isZoomLinkActive(scheduledAt: string): boolean {
  const sessionTime = new Date(scheduledAt).getTime();
  return sessionTime <= Date.now() + 2 * 60 * 60 * 1000;
}

export function getSessionDotClass(type: ZoomSessionType, isPast: boolean): string {
  if (isPast) return 'bg-gray-400';
  switch (type) {
    case 'group_practice': return 'bg-purple-500';
    case 'battle_review':  return 'bg-amber-500';
    case 'individual':     return 'bg-teal-500';
    case 'intensive':      return 'bg-blue-500';
  }

  return 'bg-blue-500';
}

export function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = 0 offset, Sunday = 6
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d.setDate(d.getDate() + diff));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

export function getMonthGrid(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based week: Mon=0..Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = 42;

  const grid: (Date | null)[] = [];

  for (let i = 0; i < startOffset; i++) grid.push(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    grid.push(new Date(year, month, d));
  }

  while (grid.length < totalCells) grid.push(null);

  return grid;
}

const UK_MONTHS = [
  'січня','лютого','березня','квітня','травня','червня',
  'липня','серпня','вересня','жовтня','листопада','грудня',
];

export function formatUkrDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = UK_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date | null): boolean {
  if (!d) return false;
  return isSameDay(d, new Date());
}

export function isPastDate(iso: string): boolean {
  return new Date(iso) < new Date();
}

export function getSlotDotClass(session: ZoomCalendarSession, isUser: boolean): string {
  const past = isPastDate(session.scheduledAt);
  if (past) return 'bg-gray-400';
  if (session.type === 'group_practice') return 'bg-purple-500';
  if (session.type === 'battle_review') return 'bg-amber-500';
  if (session.type === 'individual') {
    if (isUser) {
      if (session.isMyBooking) return 'bg-amber-500';
      return session.slotStatus === 'booked' ? 'bg-gray-400' : 'bg-teal-500';
    }
    return 'bg-teal-500';
  }
  return 'bg-blue-500';
}

export function formatPrice(priceCents: number, isSubscriber: boolean): string {
  if (priceCents === 0 || isSubscriber) return 'Безкоштовно';
  return `${priceCents / 100} грн`;
}

export function getRemainingLabel(remaining: number, max: number): string {
  return `${remaining} з ${max} місць`;
}
