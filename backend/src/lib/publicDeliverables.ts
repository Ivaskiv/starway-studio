import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function resolvePublicDeliverablesPath(baseDir: string): string {
  const candidates = [
    resolve(baseDir, '../../public/deliverables'),
    resolve(baseDir, '../../../public/deliverables'),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}
