const DEFAULT_SUPERADMIN_EMAILS = [
  'viraivaskiv@gmail.com',
  'nadyastarway@gmail.com',
]

const SUPERADMIN_EMAIL_SET = new Set(
  [
    ...DEFAULT_SUPERADMIN_EMAILS,
    ...(process.env.SUPERADMIN_EMAILS ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  ]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
)

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false
  return SUPERADMIN_EMAIL_SET.has(email.toLowerCase().trim())
}

/**
 * Runtime authority uses the canonical role only.
 * Email allowlist stays as a bootstrap helper for account provisioning.
 */
export function isSuperAdminRequest(req: { user?: { role?: string | null } }): boolean {
  return String(req.user?.role ?? '').toUpperCase() === 'SUPERADMIN'
}
