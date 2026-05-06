import { stripTaskPrefix, toDateKey } from '@/features/journal/utils'
import type { JournalDayState, JournalEvent } from '@/features/journal/types'
import { getJournalBadgeMeta } from '@/features/journal/eventPresentation'

export type JournalFeedSection = {
  id: string
  label: string
  dateKey: string
  events: JournalEvent[]
}

export function getSectionLabel(dateKey: string, todayKey: string, yesterdayKey: string) {
  const date = new Date(`${dateKey}T12:00:00`)
  const pretty = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
  if (dateKey === todayKey) return `СЬОГОДНІ · ${pretty.toUpperCase()}`
  if (dateKey === yesterdayKey) return `ВЧОРА · ${pretty.toUpperCase()}`
  return pretty.toUpperCase()
}

export function getFeedSections(dayStatesByDate: Record<string, JournalDayState>, selectedDay: string) {
  const todayKey = toDateKey(new Date())
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toDateKey(yesterday)
  const ordered = Object.values(dayStatesByDate).sort((left, right) => right.dateKey.localeCompare(left.dateKey))
  const selected = ordered.find((day) => day.dateKey === selectedDay) ?? ordered[0] ?? null

  if (!selected) return []

  const previous = ordered.find((day) => day.dateKey < selected.dateKey) ?? null
  const visibleDays = [selected, previous].filter(Boolean) as JournalDayState[]

  return visibleDays
    .filter((day) => day.events.length > 0)
    .map((day) => ({
      id: day.dateKey,
      label: getSectionLabel(day.dateKey, todayKey, yesterdayKey),
      dateKey: day.dateKey,
      events: [...day.events].sort((left, right) => left.date.localeCompare(right.date)),
    })) satisfies JournalFeedSection[]
}

export function getJournalEventTitle(event: JournalEvent) {
  return event.type === 'TASK' ? stripTaskPrefix(event.title) : event.title
}

export function getJournalEventSubtitle(event: JournalEvent) {
  const meta = event.meta ?? {}
  if (typeof meta.subtitle === 'string' && meta.subtitle.trim()) return meta.subtitle.trim()
  if (event.type === 'REFLECTION') {
    return typeof meta.period === 'string' && meta.period === 'evening'
      ? 'Підсумок дня збережено.'
      : 'Стан зафіксовано. День стартував.'
  }
  if (event.type === 'TASK') {
    if (meta.completed === true) return 'Дію виконано і зафіксовано.'
    if (meta.skipped === true) return 'Дію пропущено цього дня.'
    if (meta.expired === true) return 'Задача залишилась простроченою.'
    return 'AI-завдання на сьогодні.'
  }
  if (event.type === 'ZOOM') return 'Запланована або завершена жива сесія.'
  if (event.type === 'AI') return 'Сигнал і висновок від ABsystem.'
  if (event.type === 'SUBSCRIPTION') return 'Подія доступу або оновлення підписки.'
  if (event.type === 'TG_REMINDER') return 'Нагадування з Telegram або застосунку.'
  return 'Подія дня зафіксована у журналі.'
}

export function getJournalEventChips(event: JournalEvent) {
  const chips: string[] = []
  const badgeMeta = getJournalBadgeMeta(event)
  chips.push(badgeMeta.label)

  if (event.type === 'TASK') {
    if (event.meta?.completed === true) chips.push('Виконано')
    else if (event.meta?.skipped === true) chips.push('Пропущено')
    else if (event.meta?.expired === true) chips.push('Прострочено')
  }

  if (typeof event.meta?.sphere === 'string' && event.meta.sphere.trim()) {
    chips.push(event.meta.sphere.trim())
  }

  return chips
}

export function getJournalEventXp(event: JournalEvent) {
  return typeof event.meta?.xp === 'number' ? event.meta.xp : 0
}
