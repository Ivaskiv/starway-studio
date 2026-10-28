import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
}

function parseEnvFile(path) {
  const values = {}

  for (const line of readFileSync(resolve(repositoryRoot, path), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }

  return values
}

function isIgnored(path) {
  return spawnSync('git', ['check-ignore', '--no-index', '-q', path], {
    cwd: repositoryRoot,
    stdio: 'ignore',
  }).status === 0
}

function isObviousFixture(value) {
  return /^(?:test|dummy|example|mock|dev|local|postgres|password)(?:[-_a-z0-9]*)$/i.test(value)
}

test('only reviewed non-secret dotenv files are tracked', () => {
  const allowed = new Set([
    '.env.example',
    'apps/web/.env.example',
    'apps/web/.env.production',
    'backend/.env.example',
    'backend/.env.test',
    'packages/db/.env.example',
  ])
  const trackedDotenvFiles = trackedFiles().filter((path) => /(^|\/)\.env(?:\.|$)/.test(path))
  const unexpected = trackedDotenvFiles.filter((path) => !allowed.has(path))

  assert.deepEqual(unexpected, [], 'tracked dotenv files must be explicitly reviewed')
})

test('local dotenv snapshots are ignored before they can be added', () => {
  for (const path of [
    'backend/.env.backup-before-url-fix',
    'backend/.env.env.backup-before-current-tunnel-sync',
    'backend/.env.env.backup-before-webapp-sync',
    'backend/.env.wayforpay-backup',
    'backend/.env.test.backup',
  ]) {
    assert.ok(isIgnored(path), `${path} must be ignored`)
  }
})

test('tracked web production config remains public and the test fixture remains local-only', () => {
  const webProduction = parseEnvFile('apps/web/.env.production')
  for (const key of Object.keys(webProduction)) {
    assert.ok(key.startsWith('VITE_'), 'web production config must only contain public VITE_* keys')
    assert.doesNotMatch(key, /(?:secret|token|password|private|api[_-]?key|credential)/i)
  }

  const testEnv = parseEnvFile('backend/.env.test')
  assert.deepEqual(Object.keys(testEnv).sort(), [
    'DATABASE_URL',
    'DISABLE_SCHEDULERS',
    'NODE_ENV',
    'START_TELEGRAM_BOT',
    'TELEGRAM_WEBHOOK_URL',
    'WAYFORPAY_MERCHANT_ACCOUNT',
    'WAYFORPAY_SECRET_KEY',
  ])

  const databaseUrl = new URL(testEnv.DATABASE_URL)
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname))
  assert.ok(isObviousFixture(databaseUrl.username))
  assert.ok(isObviousFixture(databaseUrl.password))
  assert.ok(isObviousFixture(testEnv.WAYFORPAY_SECRET_KEY))
})
