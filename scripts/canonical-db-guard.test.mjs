import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  assertCanonicalDbOperationAllowed,
  assertPrismaCommandAllowed,
} from './canonical-db-guard.mjs'

const guardPath = fileURLToPath(new URL('./canonical-db-guard.mjs', import.meta.url))
const canonicalEnv = { CANONICAL_DB: 'true' }

test('canonical DB blocks every destructive Prisma operation before execution', () => {
  for (const operation of ['migrate-dev', 'migrate-reset', 'db-push', 'seed', 'reset-user']) {
    assert.throws(() => assertCanonicalDbOperationAllowed(operation, canonicalEnv), /\[CANONICAL_DB\] Blocked/)
  }

  for (const args of [
    ['migrate', 'dev'],
    ['migrate', 'reset'],
    ['db', 'push'],
    ['db', 'seed'],
  ]) {
    assert.throws(() => assertPrismaCommandAllowed(args, canonicalEnv), /\[CANONICAL_DB\] Blocked/)
  }
})

test('canonical DB permits normal runtime and reviewed migrate deploy', () => {
  assert.doesNotThrow(() => assertCanonicalDbOperationAllowed('runtime', canonicalEnv))
  assert.doesNotThrow(() => assertPrismaCommandAllowed(['migrate', 'deploy'], canonicalEnv))
  assert.doesNotThrow(() => assertPrismaCommandAllowed(['generate'], canonicalEnv))
})

test('isolated local mode keeps destructive development commands available', async () => {
  const isolatedRoot = mkdtempSync(join(tmpdir(), 'canonical-db-guard-'))
  const isolatedGuardPath = join(isolatedRoot, 'scripts', 'canonical-db-guard.mjs')

  try {
    mkdirSync(dirname(isolatedGuardPath), { recursive: true })
    copyFileSync(guardPath, isolatedGuardPath)
    const { assertCanonicalDbOperationAllowed: assertIsolatedOperationAllowed } = await import(
      pathToFileURL(isolatedGuardPath).href,
    )

    for (const operation of ['migrate-dev', 'migrate-reset', 'db-push', 'seed', 'reset-user']) {
      assert.doesNotThrow(() => assertIsolatedOperationAllowed(operation, { CANONICAL_DB: 'false' }))
    }
  } finally {
    rmSync(isolatedRoot, { recursive: true, force: true })
  }
})

test('CLI fails closed before a forbidden command can reach Prisma', () => {
  const result = spawnSync(process.execPath, [guardPath, 'prisma', '--', 'migrate', 'reset'], {
    env: { ...process.env, CANONICAL_DB: 'true' },
    encoding: 'utf8',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /\[CANONICAL_DB\] Blocked migrate-reset/)
})
