export type SalesAssistantAccessSnapshot = {
  role?: string | null
  salesAssistantAccess?: boolean | null
  hasActiveSubscription?: boolean | null
  trialEndsAt?: string | Date | null
}

export const SALES_ASSISTANT_ACCESS_DENIED_MESSAGE = 'Активуй доступ у кабінеті STARWAY.'

export function hasSalesAssistantAccess(snapshot: SalesAssistantAccessSnapshot | null | undefined): boolean {
  if (!snapshot) return false

  const role = String(snapshot.role ?? '').toUpperCase()
  const isAdminRole = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'ADMIN'
  const hasDirectAccess = snapshot.salesAssistantAccess === true
  const hasActiveTrial = snapshot.trialEndsAt
    ? new Date(snapshot.trialEndsAt).getTime() > Date.now()
    : false

  return Boolean(isAdminRole || hasDirectAccess || snapshot.hasActiveSubscription || hasActiveTrial)
}
