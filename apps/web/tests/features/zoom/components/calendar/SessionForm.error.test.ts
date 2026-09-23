import { describe, expect, it, vi } from 'vitest'

vi.mock('@/features/zoom/services/zoom.api', () => ({
  useGetAttendeesQuery: () => ({ data: [], isFetching: false }),
}))

import {
  getSessionFormSubmitErrorClassName,
  getSessionFormSubmitErrorMessage,
  isSessionSchedulingConflictError,
} from '@/features/zoom/components/calendar/SessionForm'

describe('SessionForm submit errors', () => {
  it('normalizes structured conflict errors from the create mutation', () => {
    const coachConflict = {
      status: 409,
      data: {
        error: 'coach_session_conflict',
        message: 'На цей час уже запланована інша Zoom-сесія. Оберіть інший час.',
      },
    }
    const userConflict = {
      status: 409,
      data: {
        error: 'user_session_conflict',
        message: 'Цей учасник уже має Zoom-сесію на вибраний час. Оберіть інший час.',
      },
    }

    expect(getSessionFormSubmitErrorMessage(coachConflict)).toBe(
      'На цей час уже запланована інша Zoom-сесія. Оберіть інший час.',
    )
    expect(getSessionFormSubmitErrorMessage(userConflict)).toBe(
      'Цей учасник уже має Zoom-сесію на вибраний час. Оберіть інший час.',
    )
    expect(getSessionFormSubmitErrorMessage(userConflict)).not.toBe('[object Object]')
    expect(isSessionSchedulingConflictError(coachConflict)).toBe(true)
    expect(isSessionSchedulingConflictError(userConflict)).toBe(true)
    expect(getSessionFormSubmitErrorClassName(true)).toContain('var(--semantic-warning-rgb)')
    expect(getSessionFormSubmitErrorClassName(true)).toContain('var(--semantic-warning)')
  })
})
