import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function resolvePublicDeliverablesPath(baseDir: string): string {
  const candidates = [
    resolve(baseDir, '../../public/deliverables'),
    resolve(baseDir, '../../../public/deliverables'),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

export function resolvePublicDeliverableUrl(relativePath: string): string {
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  const base = (
    process.env.PUBLIC_API_URL?.trim()
    || process.env.APP_URL?.trim()
    || process.env.TELEGRAM_WEBHOOK_URL?.trim()
  )?.replace(/\/$/, '')

  return base ? `${base}${normalizedPath}` : normalizedPath
}
