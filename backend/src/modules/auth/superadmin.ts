export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.toLowerCase().trim()
  const list = (process.env.SUPERADMIN_EMAILS || 'viraivaskiv@gmail.com')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(normalized)
}

/**
 * Перевіряє, чи є запит від супер-адміна.
 * Очікує, що req.user.email доступний (наприклад після auth middleware)
 */
export function isSuperAdminRequest(req: { user?: { email?: string | null } }): boolean {
  return isSuperAdminEmail(req.user?.email ?? null)
}