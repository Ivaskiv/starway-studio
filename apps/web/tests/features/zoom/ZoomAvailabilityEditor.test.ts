import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const { weekDays } = vi.hoisted(() => {
  const window = (dayOfWeek: number, hour: number, endHour: number) => ({
    id: `window-${dayOfWeek}`, dayOfWeek, hour, minute: 0, endHour, endMinute: 0,
    timezone: 'Europe/Kyiv', sessionType: 'individual', maxSlots: 1,
    priceCents: 0, durationMinutes: 60, active: true,
  })
  return {
    weekDays: [
      { date: '2026-09-21', source: 'recurring', hasOverride: false, windows: [window(1, 9, 16)] },
      { date: '2026-09-22', source: 'override', hasOverride: true, windows: [window(2, 16, 20)] },
      { date: '2026-09-23', source: 'recurring', hasOverride: false, windows: [window(3, 10, 14)] },
      { date: '2026-09-24', source: 'recurring', hasOverride: false, windows: [] },
      { date: '2026-09-25', source: 'recurring', hasOverride: false, windows: [] },
      { date: '2026-09-26', source: 'recurring', hasOverride: false, windows: [] },
      { date: '2026-09-27', source: 'recurring', hasOverride: false, windows: [] },
    ],
  }
})

vi.mock('../../../src/features/zoom/zoom.api', () => ({
  useGetAvailabilityQuery: () => ({ data: [], refetch: vi.fn() }),
  useGetAvailabilityWeekQuery: () => ({ data: weekDays, refetch: vi.fn() }),
  useSaveAvailabilityWeekMutation: () => [vi.fn(), { isLoading: false }],
  useSaveAvailabilityMutation: () => [vi.fn(), { isLoading: false }],
}))

import {
  createIndividualWindow,
  buildDayToggleChange,
  buildWeekOverrideResets,
  getWeekDateKeys,
  timeValue,
  validateIndividualWindow,
  ZoomAvailabilityEditor,
} from '../../../src/features/zoom/ZoomAvailabilityEditor'

describe('ZoomAvailabilityEditor recurring-window contract', () => {
  it('creates an active 60-minute individual window on the 15-minute grid', () => {
    const window = createIndividualWindow(3)

    expect(window).toMatchObject({
      dayOfWeek: 3,
      sessionType: 'individual',
      active: true,
      durationMinutes: 60,
      timezone: 'Europe/Kyiv',
    })
    expect(timeValue(window.hour, window.minute)).toBe('09:00')
    expect(timeValue(window.endHour!, window.endMinute!)).toBe('18:00')
  })

  it('rejects a window shorter than one individual session and accepts a 60-minute window', () => {
    const window = createIndividualWindow(1)

    expect(validateIndividualWindow({ ...window, endHour: 9, endMinute: 45 })).toBe(
      'Вікно має вміщувати щонайменше одну 60-хвилинну сесію.',
    )
    expect(validateIndividualWindow({ ...window, endHour: 10, endMinute: 0 })).toBeNull()
  })

  it('derives valid Monday-Sunday preview keys from the ISO week range for previous, current, and next weeks', () => {
    const current = new Date('2026-09-23T12:00:00.000Z')
    const formatter = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', weekday: 'short', day: 'numeric' })

    expect(getWeekDateKeys(current)).toEqual([
      '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24',
      '2026-09-25', '2026-09-26', '2026-09-27',
    ])
    expect(() => getWeekDateKeys(new Date(current.getTime() - 7 * 86_400_000)).forEach((key) => formatter.formatToParts(new Date(key)))).not.toThrow()
    expect(() => getWeekDateKeys(new Date(current.getTime() + 7 * 86_400_000)).forEach((key) => formatter.formatToParts(new Date(key)))).not.toThrow()
  })

  it('keeps an explicit weekday off when no recurring individual window exists', () => {
    const monday = createIndividualWindow(1)
    const sundayWindows = [monday].filter((slot) => slot.dayOfWeek === 0)

    expect(sundayWindows).toEqual([])
  })

  it('persists a working day as an explicit empty override in one toggle action', () => {
    const change = buildDayToggleChange({
      date: '2026-09-21', source: 'recurring', hasOverride: false,
      windows: [createIndividualWindow(1)],
    })

    expect(change).toEqual({ date: '2026-09-21', windows: [] })
  })

  it('restores inheritance only by deleting an existing empty override', () => {
    const explicitOff = buildDayToggleChange({ date: '2026-09-22', source: 'override', hasOverride: true, windows: [] })
    const recurringOff = buildDayToggleChange({ date: '2026-09-23', source: 'recurring', hasOverride: false, windows: [] })

    expect(explicitOff).toEqual({ date: '2026-09-22', reset: true })
    expect(recurringOff).toBeNull()
  })

  it('applies the recurring schedule by resetting only existing date overrides', () => {
    const changes = buildWeekOverrideResets([
      { date: '2026-09-21', source: 'recurring', hasOverride: false, windows: [createIndividualWindow(1)] },
      { date: '2026-09-22', source: 'override', hasOverride: true, windows: [] },
      { date: '2026-09-23', source: 'override', hasOverride: true, windows: [createIndividualWindow(3)] },
    ])

    expect(changes).toEqual([
      { date: '2026-09-22', reset: true },
      { date: '2026-09-23', reset: true },
    ])
  })

  it('renders exactly seven compact canonical week rows without opening date editors', () => {
    const markup = renderToStaticMarkup(createElement(ZoomAvailabilityEditor, {
      weekAnchor: new Date('2026-09-23T12:00:00.000Z'), sessions: [],
      onPreviousWeek: vi.fn(), onNextWeek: vi.fn(), onCurrentWeek: vi.fn(),
    }))

    expect(markup.match(/data-availability-week-row/g)).toHaveLength(7)
    expect(markup).toContain('Пн, 21.09')
    expect(markup).toContain('09:00–16:00')
    expect(markup).toContain('ВИХІДНИЙ')
    expect(markup).not.toContain('Доступний час')
    expect(markup).not.toContain('ЗБЕРЕГТИ ТИЖДЕНЬ')
  })
})
