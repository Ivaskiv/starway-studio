import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'

vi.mock('../../../src/features/zoom/zoom.api', () => ({
  useGetAvailabilityQuery: () => ({ data: [] }),
  useGetAvailabilityWeekQuery: () => ({ data: [] }),
  useSaveAvailabilityWeekMutation: () => [vi.fn(), { isLoading: false }],
  useSaveAvailabilityMutation: () => [vi.fn(), { isLoading: false }],
}))

import {
  createIndividualWindow,
  getWeekDateKeys,
  timeValue,
  validateIndividualWindow,
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
})
