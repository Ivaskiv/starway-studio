export type IndividualSessionState =
  | 'PENDING_CONFIRMATION'
  | 'PENDING_PAYMENT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'PAYMENT_UNVERIFIED'
  | 'UNKNOWN'

export type IndividualCommerceStatus =
  | 'REQUESTED'
  | 'APPROVED_PENDING_PAYMENT'
  | 'PAID'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | null
  | undefined

export type IndividualLifecycleInput = {
  sessionStatus: string | null | undefined
  commerceStatus?: IndividualCommerceStatus
}

export function resolveIndividualSessionState(
  input: IndividualLifecycleInput,
): IndividualSessionState {
  const sessionStatus = String(input.sessionStatus ?? '').toUpperCase()
  const commerceStatus = input.commerceStatus ?? null

  // Session outcome has priority over historical payment state.
  if (sessionStatus === 'CANCELLED') return 'CANCELLED'
  if (sessionStatus === 'COMPLETED') return 'COMPLETED'
  if (sessionStatus === 'ACTIVE') return 'ACTIVE'

  // Commerce controls a not-yet-started Individual booking.
  if (commerceStatus === 'CANCELLED') return 'CANCELLED'
  if (commerceStatus === 'REJECTED') return 'REJECTED'
  if (commerceStatus === 'EXPIRED') return 'EXPIRED'
  if (commerceStatus === 'REQUESTED') return 'PENDING_CONFIRMATION'
  if (commerceStatus === 'APPROVED_PENDING_PAYMENT') return 'PENDING_PAYMENT'

  if (sessionStatus === 'SCHEDULED' && commerceStatus === 'PAID') {
    return 'SCHEDULED'
  }

  // Preserve legacy safety: a scheduled Individual without canonical
  // commerce evidence must never be presented as paid/booked.
  if (sessionStatus === 'SCHEDULED' && !commerceStatus) {
    return 'PAYMENT_UNVERIFIED'
  }

  return 'UNKNOWN'
}

const LABELS: Record<
  'user' | 'coach',
  Record<IndividualSessionState, string>
> = {
  user: {
    PENDING_CONFIRMATION: '🟡 Очікує підтвердження',
    PENDING_PAYMENT: '🟠 Очікує оплати',
    SCHEDULED: '🔵 Заплановано',
    ACTIVE: '🔵 Триває',
    COMPLETED: '🟢 Проведено',
    CANCELLED: '🔴 Скасовано',
    REJECTED: '🔴 Відхилено',
    EXPIRED: '⚪️ Час оплати вичерпано',
    PAYMENT_UNVERIFIED: '⚪️ Оплату не підтверджено',
    UNKNOWN: 'Статус недоступний',
  },

  coach: {
    PENDING_CONFIRMATION: '🟡 Очікує підтвердження',
    PENDING_PAYMENT: '🟠 Очікує оплати',
    SCHEDULED: '🔵 Заплановано',
    ACTIVE: '🔵 Триває',
    COMPLETED: '🟢 Проведено',
    CANCELLED: '🔴 Скасовано',
    REJECTED: '🔴 Відхилено',
    EXPIRED: '⚪️ Час оплати вичерпано',
    PAYMENT_UNVERIFIED: '⚪️ Оплату не підтверджено',
    UNKNOWN: 'Статус недоступний',
  },
}

export function getIndividualSessionStatusLabel(input: {
  role: 'user' | 'coach'
  sessionStatus: string | null | undefined
  commerceStatus?: IndividualCommerceStatus
}): string {
  return LABELS[input.role][resolveIndividualSessionState(input)]
}
