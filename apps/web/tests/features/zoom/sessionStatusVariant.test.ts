import { describe, expect, it } from 'vitest'

import { getZoomPaymentBadgeLabel, sessionStatusVariant } from '@/features/zoom/zoom.utils'

describe('sessionStatusVariant', () => {
  it('maps session statuses to existing design tokens', () => {
    expect(sessionStatusVariant('SCHEDULED')).toMatchObject({
      label: 'Заплановано',
      surfaceClass: expect.stringContaining('var(--glass-bg)'),
      badgeClass: expect.stringContaining('var(--border-primary)'),
    })

    expect(sessionStatusVariant('ACTIVE')).toMatchObject({
      label: 'Активний',
      surfaceClass: expect.stringContaining('var(--accent-rgb)'),
      badgeClass: expect.stringContaining('var(--accent-soft-rgb)'),
    })

    expect(sessionStatusVariant('COMPLETED')).toMatchObject({
      label: 'Завершено',
      surfaceClass: expect.stringContaining('var(--semantic-success-rgb)'),
      badgeClass: expect.stringContaining('var(--semantic-success)'),
    })

    expect(sessionStatusVariant('CANCELLED')).toMatchObject({
      label: 'Пропущено',
      surfaceClass: expect.stringContaining('var(--semantic-warning-rgb)'),
      textClass: expect.stringContaining('var(--text-muted)'),
    })
  })
})

describe('getZoomPaymentBadgeLabel commerce projection', () => {
  it.each([
    'Очікує підтвердження коуча',
    'Підтверджено · Очікує оплату',
    'Оплачено · Заброньовано',
    'Потребує підтвердження',
    'Очікує оплату користувачем',
    'Оплачено',
  ])('renders the canonical calendar label %s', commerceLabel => {
    expect(getZoomPaymentBadgeLabel({ type: 'individual', commerceLabel })).toBe(commerceLabel)
  })
})
