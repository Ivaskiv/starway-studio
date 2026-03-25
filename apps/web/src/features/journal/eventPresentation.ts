import type { JournalEvent, JournalEventType } from './types'

export type JournalDisplayType =
  | 'AI'
  | 'ZOOM'
  | 'TASK'
  | 'STREAK'
  | 'SUBSCRIPTION'
  | 'TG_REMINDER'

export const JOURNAL_DISPLAY_META: Record<JournalDisplayType, {
  dotClassName: string
  badgeClassName: string
  label: string
}> = {
  AI: {
    dotClassName: 'bg-emerald-400',
    badgeClassName: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/20',
    label: 'AI сесія',
  },
  ZOOM: {
    dotClassName: 'bg-violet-400',
    badgeClassName: 'bg-violet-500/12 text-violet-300 border-violet-400/20',
    label: 'Zoom-сесія',
  },
  TASK: {
    dotClassName: 'bg-sky-400',
    badgeClassName: 'bg-sky-500/12 text-sky-300 border-sky-400/20',
    label: 'Практика',
  },
  STREAK: {
    dotClassName: 'bg-red-400',
    badgeClassName: 'bg-red-500/12 text-red-300 border-red-400/20',
    label: 'Стрік',
  },
  SUBSCRIPTION: {
    dotClassName: 'bg-orange-400',
    badgeClassName: 'bg-orange-500/12 text-orange-300 border-orange-400/20',
    label: 'Підписка',
  },
  TG_REMINDER: {
    dotClassName: 'bg-cyan-400',
    badgeClassName: 'bg-cyan-500/12 text-cyan-300 border-cyan-400/20',
    label: 'TG нагадування',
  },
}

export function getJournalDisplayType(event: Pick<JournalEvent, 'type'>): JournalDisplayType {
  switch (event.type) {
    case 'REFLECTION':
    case 'TASK':
      return 'TASK'
    case 'AI':
      return 'AI'
    case 'ZOOM':
      return 'ZOOM'
    case 'STREAK':
      return 'STREAK'
    case 'SUBSCRIPTION':
      return 'SUBSCRIPTION'
    case 'TG_REMINDER':
      return 'TG_REMINDER'
    default:
      return event.type as Exclude<JournalEventType, 'REFLECTION'>
  }
}

export function getJournalBadgeMeta(event: JournalEvent) {
  const displayType = getJournalDisplayType(event)

  if (event.type === 'REFLECTION') {
    const period = typeof event.meta?.period === 'string' ? event.meta.period : null
    return {
      ...JOURNAL_DISPLAY_META[displayType],
      label: period === 'evening' ? 'Вечірня рефлексія' : 'Ранкова рефлексія',
    }
  }

  return JOURNAL_DISPLAY_META[displayType]
}
