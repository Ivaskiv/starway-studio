import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

// FIX(18.05.2026): auto-sync ngrok envs — Codex

const ROOT_DIR = findRepoRoot(process.env.INIT_CWD ?? process.cwd())

const BACKEND_ENV_PATH = resolve(ROOT_DIR, 'backend/.env')

const BACKEND_PORT = 3001

const NGROK_API_URL = 'http://127.0.0.1:4040/api/tunnels'

const TELEGRAM_WEBHOOK_PATH = '/api/telegram/webhook'

const WAYFORPAY_CALLBACK_PATH =
  '/api/subscriptions/payments/wayforpay/callback'

const TUNNEL_TIMEOUT_MS = 30_000
const TUNNEL_POLL_MS = 800

type EnvValues = Record<string, string>

type NgrokTunnel = {
  public_url?: string
  proto?: string
}

type NgrokTunnelsResponse = {
  tunnels?: NgrokTunnel[]
}

const children = new Set<ChildProcess>()

let shuttingDown = false

function findRepoRoot(startDir: string) {
  let currentDir = resolve(startDir)

  while (true) {
    if (
      existsSync(resolve(currentDir, 'package.json')) &&
      existsSync(resolve(currentDir, 'backend/package.json')) &&
      existsSync(resolve(currentDir, 'apps/web/package.json'))
    ) {
      return currentDir
    }

    const parentDir = dirname(currentDir)

    if (parentDir === currentDir) {
      throw new Error(`Could not find repo root from ${startDir}`)
    }

    currentDir = parentDir
  }
}

function sleep(ms: number) {
  return new Promise(resolveSleep => setTimeout(resolveSleep, ms))
}

function spawnProcess(
  name: string,
  command: string,
  args: string[],
  options: { cwd?: string } = {},
) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? ROOT_DIR,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  })

  children.add(child)

  child.once('exit', (code, signal) => {
    children.delete(child)

    if (!shuttingDown && code !== 0) {
      console.error(
        `[${name}] exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`,
      )

      shutdown(code ?? 1)
    }
  })

  child.once('error', error => {
    children.delete(child)

    console.error(`[${name}] failed to start: ${error.message}`)

    shutdown(1)
  })

  return child
}

function shutdown(code = 0) {
  if (shuttingDown) return

  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT')
    }
  }

  setTimeout(() => process.exit(code), 300).unref()
}

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '')
}

function parseEnv(content: string): EnvValues {
  const values: EnvValues = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const match = rawLine.match(
      /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/,
    )

    if (!match) continue

    values[match[1]] = unquoteEnvValue(match[2].trim())
  }

  return values
}

function unquoteEnvValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }

  return value
}

function updateEnvContent(
  content: string,
  updates: EnvValues,
) {
  const keys = new Set(Object.keys(updates))

  const seen = new Set<string>()

  const hasTrailingNewline = content.endsWith('\n')

  const lines = content.split(/\r?\n/)

  const nextLines = lines.map(line => {
    const match = line.match(
      /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/,
    )

    if (!match) return line

    const [, prefix, key, separator] = match

    if (!keys.has(key) || seen.has(key)) return line

    seen.add(key)

    return `${prefix}${key}${separator}${updates[key]}`
  })

  const missingKeys = [...keys].filter(key => !seen.has(key))

  if (missingKeys.length > 0) {
    const insertAt =
      hasTrailingNewline &&
      nextLines[nextLines.length - 1] === ''
        ? nextLines.length - 1
        : nextLines.length

    const appended = [
      '',
      '# AUTO-SYNCED LOCAL TUNNEL URLS',
      ...missingKeys.map(
        key => `${key}=${updates[key]}`,
      ),
    ]

    nextLines.splice(insertAt, 0, ...appended)
  }

  const nextContent = nextLines.join('\n')

  return hasTrailingNewline &&
    !nextContent.endsWith('\n')
    ? `${nextContent}\n`
    : nextContent
}

async function updateBackendEnv(publicUrl: string) {
  const envContent = await readFile(
    BACKEND_ENV_PATH,
    'utf8',
  )

  const updates = {
    PUBLIC_API_URL: publicUrl,
    TELEGRAM_WEBHOOK_URL: publicUrl,
    TELEGRAM_DELIVERY_MODE: 'webhook',
    TELEGRAM_WEBAPP_BASE_URL: '',
    WAYFORPAY_CALLBACK_URL: `${publicUrl}${WAYFORPAY_CALLBACK_PATH}`,
  }

  const nextContent = updateEnvContent(
    envContent,
    updates,
  )

  if (nextContent !== envContent) {
    await writeFile(BACKEND_ENV_PATH, nextContent)
  }

  return {
    ...parseEnv(nextContent),
    ...updates,
  }
}

async function readNgrokPublicUrl() {
  const startedAt = Date.now()

  while (
    Date.now() - startedAt <
    TUNNEL_TIMEOUT_MS
  ) {
    try {
      const response = await fetch(NGROK_API_URL)

      if (response.ok) {
        const data =
          (await response.json()) as NgrokTunnelsResponse

        const tunnel = data.tunnels?.find(
          item =>
            item.proto === 'https' &&
            item.public_url?.startsWith('https://'),
        )

        if (tunnel?.public_url) {
          return normalizeBaseUrl(tunnel.public_url)
        }
      }
    } catch {
      // ngrok API not ready
    }

    await sleep(TUNNEL_POLL_MS)
  }

  throw new Error(
    `Timed out waiting for ngrok public URL from ${NGROK_API_URL}`,
  )
}

async function syncTelegramWebhook(
  env: EnvValues,
  publicUrl: string,
) {
  const token = env.TELEGRAM_BOT_TOKEN?.trim()

  if (!token) {
    return
  }

  const webhookUrl =
    `${publicUrl}${TELEGRAM_WEBHOOK_PATH}`

  const infoResponse = await fetch(
    `https://api.telegram.org/bot${token}/getWebhookInfo`,
  )
  const infoBody = (await infoResponse
    .json()
    .catch(() => null)) as
    | {
        ok?: boolean
        result?: { url?: string }
        description?: string
      }
    | null

  const currentWebhookUrl = infoBody?.result?.url?.trim() ?? ''
  if (currentWebhookUrl === webhookUrl) {
    return
  }

  // FIX 2025-05-25 B2: retry setWebhook when Telegram returns rate limit (429)
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
        }),
      },
    )

    const body = (await response
      .json()
      .catch(() => null)) as
      | {
          ok?: boolean
          error_code?: number
          description?: string
          parameters?: { retry_after?: number }
        }
      | null

    if (response.ok && body?.ok !== false) {
      return
    }

    if (body?.error_code === 429 && attempt < 5) {
      const retryAfterMs = Math.max(1, Number(body.parameters?.retry_after ?? 3)) * 1000
      await sleep(retryAfterMs)
      continue
    }

    throw new Error(
      body?.description ??
        `Telegram setWebhook failed with HTTP ${response.status}`,
    )
  }
}

async function main() {
  process.once('SIGINT', () => shutdown(0))

  process.once('SIGTERM', () => shutdown(0))

  spawnProcess('NGROK', 'ngrok', [
    'http',
    String(BACKEND_PORT),
  ])

  const publicUrl = await readNgrokPublicUrl()

  const env = await updateBackendEnv(publicUrl)

  try {
    await syncTelegramWebhook(env, publicUrl)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error)

    console.error(`[TELEGRAM] setWebhook failed: ${message}`)
  }

  await new Promise(() => undefined)
}

main().catch(error => {
  const message =
    error instanceof Error
      ? error.message
      : String(error)

  console.error(`[NGROK] ${message}`)

  shutdown(1)
})
