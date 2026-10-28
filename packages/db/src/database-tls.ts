const INSECURE_SSL_MODES = new Set(['disable', 'allow', 'prefer', 'no-verify'])

type RuntimeEnvironment = {
  NODE_ENV?: string
  NODE_TLS_REJECT_UNAUTHORIZED?: string
}

/** Keeps database connections on Prisma's required TLS path. */
export function requireVerifiedDatabaseTls(
  input: string | undefined,
  environment: RuntimeEnvironment = process.env,
): string | undefined {
  const raw = String(input ?? '').trim()
  if (!raw) return undefined

  if (environment.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new Error('Database startup refused: global TLS certificate verification is disabled')
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Database startup refused: connection URL is invalid')
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('Database startup refused: connection URL must use PostgreSQL')
  }

  const allowLocalInvalidCertificate = environment.NODE_ENV === 'development'

  const sslmode = url.searchParams.get('sslmode')?.toLowerCase()
  if (sslmode && INSECURE_SSL_MODES.has(sslmode)) {
    throw new Error('Database startup refused: insecure TLS mode is not permitted')
  }
  if (sslmode && sslmode !== 'require') {
    throw new Error('Database startup refused: unsupported TLS mode')
  }

  const sslaccept = url.searchParams.get('sslaccept')?.toLowerCase()
  if (
    sslaccept &&
    sslaccept !== 'strict' &&
    !(allowLocalInvalidCertificate && sslaccept === 'accept_invalid_certs')
  ) {
    throw new Error('Database startup refused: certificate validation must be strict')
  }

  url.searchParams.set('sslmode', 'require')
  return url.toString()
}
