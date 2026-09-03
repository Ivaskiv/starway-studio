import { execFile, spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const envPath = resolve(rootDir, 'backend/.env.local')

const localBackendOrigin = 'http://127.0.0.1:3001'
const localWebOrigin = 'http://127.0.0.1:5173'
const wayforpayCallbackPath = '/api/subscriptions/payments/wayforpay/callback'
const adminStudioProofPath = '/app/dashboard/admin/studio?tab=agents&item=agents.overview'

const tunnelUrlTimeoutMs = 30_000
const healthTimeoutMs = 120_000
const healthPollMs = 1_000
const shutdownGraceMs = 2_000
const proofPasses = 3

let tunnel = null
let dev = null
let stopping = false
let tunnelOutput = ''
let tunnelUrl = null
let readyPublished = false
let tunnelFailureCount = 0

const managedEnvKeys = [
  'PUBLIC_API_URL',
  'PUBLIC_FRONTEND_URL',
  'TELEGRAM_PUBLIC_FRONTEND_URL',
  'TELEGRAM_WEBAPP_BASE_URL',
  'WAYFORPAY_CALLBACK_URL',
]

function sleep(ms) {
  return new Promise(resolveSleep => setTimeout(resolveSleep, ms))
}

function normalizeUrl(value) {
  return String(value).trim().replace(/\/+$/, '')
}

export function buildCloudflareDevEnvUpdates(publicUrl) {
  const normalized = normalizeUrl(publicUrl)

  return {
    PUBLIC_API_URL: normalized,
    PUBLIC_FRONTEND_URL: normalized,
    TELEGRAM_WEBAPP_BASE_URL: normalized,
    WAYFORPAY_CALLBACK_URL: `${normalized}${wayforpayCallbackPath}`,
  }
}

async function updateLocalEnv(publicUrl) {
  let content = await readFile(envPath, 'utf8').catch(() => '')
  const updates = buildCloudflareDevEnvUpdates(publicUrl)

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`
    const pattern = new RegExp(`^${key}=.*$`, 'm')

    content = pattern.test(content)
      ? content.replace(pattern, line)
      : `${content.trimEnd()}\n${line}\n`
  }

  await writeFile(envPath, content)
}

export function buildCloudflareDevChildEnv(publicUrl, currentEnv = process.env) {
  const nextEnv = { ...currentEnv }

  for (const key of managedEnvKeys) {
    delete nextEnv[key]
  }

  return {
    ...nextEnv,
    ...buildCloudflareDevEnvUpdates(publicUrl),
  }
}

export function extractPublicUrl(text) {
  const matches = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi) ?? []
  return matches.find(url => !url.includes('https://api.trycloudflare.com')) ?? null
}

function isTunnelFailureLine(line) {
  return (
    line.includes('failed to serve tunnel connection') ||
    line.includes('Serve tunnel error') ||
    line.includes('Connection terminated') ||
    line.includes('control stream') ||
    line.includes('no more connections active and exiting')
  )
}

export function classifyCloudflareProcessExit({ stopping, readyPublished }) {
  if (stopping) {
    return 'ignore'
  }

  return readyPublished ? 'preserve-dev-runtime' : 'shutdown'
}

async function runCommand(command, args, { allowNonZero = false } = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: rootDir,
      encoding: 'utf8',
    })

    return {
      code: 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    }
  } catch (error) {
    const code = typeof error?.code === 'number' ? error.code : 1
    if (allowNonZero) {
      return {
        code,
        stdout: typeof error?.stdout === 'string' ? error.stdout : '',
        stderr: typeof error?.stderr === 'string' ? error.stderr : '',
      }
    }

    throw error
  }
}

async function listPortPids(port) {
  const result = await runCommand('lsof', ['-ti', `:${port}`], { allowNonZero: true })
  if (result.code !== 0 && result.code !== 1) {
    throw new Error(`lsof failed for :${port}`)
  }

  return result.stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

async function killPids(signal, pids) {
  if (pids.length === 0) return
  await runCommand('kill', [`-${signal}`, ...pids], { allowNonZero: true })
}

async function cleanupStaleProcesses() {
  const stalePortPids = Array.from(new Set([
    ...(await listPortPids(3001)),
    ...(await listPortPids(5173)),
  ]))

  if (stalePortPids.length > 0) {
    await killPids('TERM', stalePortPids)
    await sleep(shutdownGraceMs)

    const remainingPortPids = Array.from(new Set([
      ...(await listPortPids(3001)),
      ...(await listPortPids(5173)),
    ]))

    if (remainingPortPids.length > 0) {
      await killPids('KILL', remainingPortPids)
    }
  }

  await runCommand('pkill', ['-TERM', 'cloudflared'], { allowNonZero: true })
  await sleep(500)
  await runCommand('pkill', ['-KILL', 'cloudflared'], { allowNonZero: true })
}

function shutdown(code) {
  if (stopping) return
  stopping = true

  dev?.kill('SIGTERM')
  tunnel?.kill('SIGTERM')

  setTimeout(() => process.exit(code), 500)
}

process.once('SIGINT', () => shutdown(0))
process.once('SIGTERM', () => shutdown(0))

function startDev(publicUrl) {
  dev = spawn('pnpm', ['dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: buildCloudflareDevChildEnv(publicUrl),
  })

  dev.once('exit', code => shutdown(code ?? 0))
  dev.once('error', error => {
    console.error(`[DEV] failed to start: ${error.message}`)
    shutdown(1)
  })
}

async function waitForHttpOk(url, label, options = {}) {
  const timeoutMs = options.timeoutMs ?? healthTimeoutMs
  const passes = options.passes ?? 1
  const startedAt = Date.now()

  for (let successCount = 0; successCount < passes;) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`${label} did not become healthy at ${url}`)
    }

    try {
      const response = await fetch(url, {
        redirect: 'manual',
      })

      if (response.ok || response.status === 304) {
        successCount += 1
        if (successCount >= passes) {
          return
        }
        await sleep(500)
        continue
      }
    } catch {
      // keep polling
    }

    successCount = 0
    await sleep(healthPollMs)
  }
}

function handleTunnelOutput(chunk, destination) {
  const text = String(chunk)
  tunnelOutput = `${tunnelOutput}${text}`.slice(-20_000)

  const lines = text.split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    const publicUrlFromLine = extractPublicUrl(line)
    if (publicUrlFromLine) {
      const normalized = normalizeUrl(publicUrlFromLine)
      if (tunnelUrl && tunnelUrl !== normalized) {
        console.error('[CLOUDFLARE] tunnel URL changed unexpectedly', {
          previous: tunnelUrl,
          next: normalized,
        })
        shutdown(1)
        return
      }
      tunnelUrl = normalized
      continue
    }

    if (!stopping && isTunnelFailureLine(line)) {
      tunnelFailureCount += 1
      destination.write(`${line}\n`)

      if (!readyPublished && tunnelFailureCount >= 3) {
        console.error('[CLOUDFLARE] repeated tunnel instability detected before readiness')
        shutdown(1)
      }
      continue
    }

    if (!stopping && /(ERR |WARN )/.test(line)) {
      destination.write(`${line}\n`)
    }
  }
}

async function waitForTunnelUrl() {
  const startedAt = Date.now()

  while (Date.now() - startedAt < tunnelUrlTimeoutMs) {
    if (tunnelUrl) {
      return tunnelUrl
    }

    if (tunnel?.exitCode != null) {
      throw new Error('cloudflared exited before publishing a tunnel URL')
    }

    await sleep(250)
  }

  throw new Error('cloudflared did not publish a tunnel URL within 30s')
}

function startTunnel() {
  tunnel = spawn(
    'cloudflared',
    ['tunnel', '--url', localBackendOrigin, '--no-autoupdate'],
    {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  tunnel.stdout.on('data', chunk => handleTunnelOutput(chunk, process.stdout))
  tunnel.stderr.on('data', chunk => handleTunnelOutput(chunk, process.stderr))
  tunnel.once('exit', code => {
    const action = classifyCloudflareProcessExit({ stopping, readyPublished })
    if (action === 'ignore') return

    if (action === 'shutdown') {
      console.error(`[CLOUDFLARE] exited before readiness with code=${code ?? 'null'}`)
      shutdown(code ?? 1)
      return
    }

    tunnel = null
    console.warn(
      `[CLOUDFLARE] exited after readiness with code=${code ?? 'null'}; backend/web stay alive`,
    )
  })
  tunnel.once('error', error => {
    console.error(`[CLOUDFLARE] failed to start: ${error.message}`)
    shutdown(1)
  })
}

async function publishReady(publicUrl) {
  await waitForHttpOk(`${localBackendOrigin}/health`, 'backend health')
  await waitForHttpOk(`${localWebOrigin}/`, 'web health')
  await waitForHttpOk(`${publicUrl}/`, 'tunnel root', { passes: proofPasses })
  await waitForHttpOk(`${publicUrl}${adminStudioProofPath}`, 'tunnel admin studio', { passes: proofPasses })

  readyPublished = true
  console.info('[CLOUDFLARE] Ready', {
    publicUrl,
    backend: `${localBackendOrigin}/health`,
    web: `${localWebOrigin}/`,
    proofs: ['/', adminStudioProofPath],
  })
}

export async function main() {
  await cleanupStaleProcesses()
  startTunnel()

  const publicUrl = await waitForTunnelUrl()
  await updateLocalEnv(publicUrl)
  startDev(publicUrl)
  await publishReady(publicUrl)

  await new Promise(() => undefined)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[CLOUDFLARE] ${message}`)
    shutdown(1)
  })
}
