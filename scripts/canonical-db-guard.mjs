import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const forbiddenOperations = new Set([
  'migrate-dev',
  'migrate-reset',
  'db-push',
  'seed',
  'reset-user',
  'wipe-test-user',
  'reset-ab-test',
  'reset-guest-user',
  'schema-repair',
  'user-consolidation-apply',
])

function readCanonicalDbFlag(path) {
  if (!existsSync(path)) return undefined

  const match = readFileSync(path, 'utf8').match(/^\s*CANONICAL_DB\s*=\s*(?:["']?)([^\s#"']+)(?:["']?)\s*$/m)
  return match?.[1]
}

export function isCanonicalDatabase(env = process.env) {
  if (env.CANONICAL_DB === 'true') return true

  return [
    resolve(repoRoot, '.env'),
    resolve(repoRoot, '.env.local'),
    resolve(repoRoot, 'backend/.env'),
    resolve(repoRoot, 'backend/.env.local'),
    resolve(repoRoot, 'packages/db/.env'),
  ].some((path) => readCanonicalDbFlag(path) === 'true')
}

export function assertCanonicalDbOperationAllowed(operation, env = process.env) {
  if (!isCanonicalDatabase(env) || !forbiddenOperations.has(operation)) return

  throw new Error(
    `[CANONICAL_DB] Blocked ${operation}. Repository-managed destructive Prisma commands, seeds, resets, and schema repairs are forbidden when CANONICAL_DB=true. Use only an intentionally reviewed prisma migrate deploy workflow.`,
  )
}

export function assertPrismaCommandAllowed(args, env = process.env) {
  const [group, command] = args
  if (group === 'migrate' && command === 'dev') return assertCanonicalDbOperationAllowed('migrate-dev', env)
  if (group === 'migrate' && command === 'reset') return assertCanonicalDbOperationAllowed('migrate-reset', env)
  if (group === 'db' && command === 'push') return assertCanonicalDbOperationAllowed('db-push', env)
  if (group === 'db' && command === 'seed') return assertCanonicalDbOperationAllowed('seed', env)
}

function runPrisma(args) {
  const prismaArgs = args[0] === '--' ? args.slice(1) : args
  assertPrismaCommandAllowed(prismaArgs)
  const result = spawnSync(
    'pnpm',
    ['--filter', '@starway/db', 'exec', 'prisma', ...prismaArgs],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  )
  process.exitCode = result.status ?? 1
}

function main() {
  const [mode, ...args] = process.argv.slice(2)
  if (mode === 'check') {
    assertCanonicalDbOperationAllowed(args[0])
    return
  }
  if (mode === 'prisma') {
    runPrisma(args)
    return
  }
  throw new Error('Usage: canonical-db-guard.mjs <check|prisma> ...')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
