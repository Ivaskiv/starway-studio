const RAW_SUPERADMIN_EMAILS = process.env.SUPERADMIN_EMAILS ?? 'viraivaskiv@gmail.com'
const SUPERADMIN_EMAIL_SET = new Set(
  RAW_SUPERADMIN_EMAILS
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
)

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return SUPERADMIN_EMAIL_SET.has(email.toLowerCase().trim())
}

/**
 * Перевіряє, чи є запит від супер-адміна.
 * Очікує, що req.user.email доступний (наприклад після auth middleware)
 */
export function isSuperAdminRequest(req: { user?: { email?: string | null } }): boolean {
  return isSuperAdminEmail(req.user?.email ?? null)
}
