import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const envPath = resolve('backend/.env.local')
const origin = 'http://127.0.0.1:3001'

let tunnel
let dev
let started = false
let stopping = false
let output = ''

async function updateLocalEnv(publicUrl) {
  let content = await readFile(envPath, 'utf8').catch(() => '')

  const updates = {
    PUBLIC_API_URL: publicUrl,
    TELEGRAM_WEBAPP_BASE_URL: publicUrl,
    WAYFORPAY_CALLBACK_URL:
      `${publicUrl}/api/subscriptions/payments/wayforpay/callback`,
  }

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`
    const pattern = new RegExp(`^${key}=.*$`, 'm')

    content = pattern.test(content)
      ? content.replace(pattern, line)
      : `${content.trimEnd()}\n${line}\n`
  }

  await writeFile(envPath, content)
}

async function startDev(publicUrl) {
  if (started) return
  started = true

  await updateLocalEnv(publicUrl)
  console.info(`[CLOUDFLARE] Mini App URL: ${publicUrl}`)

  dev = spawn('pnpm', ['dev'], {
    stdio: 'inherit',
    env: process.env,
  })

  dev.once('exit', code => shutdown(code ?? 0))
}

function extractPublicUrl(text) {
  const matches = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi) ?? []
  return matches.find(url => !url.includes('https://api.trycloudflare.com')) ?? null
}

function consume(chunk, destination, options = {}) {
  const text = String(chunk)
  output = `${output}${text}`.slice(-12000)

  const publicUrl = extractPublicUrl(output)
  if (publicUrl) {
    void startDev(publicUrl)
  }

  if (!options.forward) {
    return
  }

  const filtered = text
    .split(/\r?\n/)
    .filter(line => {
      if (!line.trim()) {
        return false
      }

      if (line.includes('trycloudflare.com')) {
        return false
      }

      if (stopping) {
        if (line.includes('context canceled')) {
          return false
        }

        if (
          line.includes('failed to serve tunnel connection')
          || line.includes('Serve tunnel error')
          || line.includes('Connection terminated')
          || line.includes('no more connections active and exiting')
        ) {
          return false
        }
      }

      return line.includes(' ERR ') || line.startsWith('ERR ')
    })
    .join('\n')

  if (filtered.trim().length > 0) {
    destination.write(text.endsWith('\n') ? `${filtered}\n` : filtered)
  }
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

tunnel = spawn(
  'cloudflared',
  ['tunnel', '--url', origin, '--no-autoupdate'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)

tunnel.stdout.on('data', chunk => consume(chunk, process.stdout, { forward: false }))
tunnel.stderr.on('data', chunk => consume(chunk, process.stderr, { forward: true }))
tunnel.once('exit', code => {
  if (!stopping) shutdown(code ?? 1)
})

setTimeout(() => {
  if (!started && tunnel?.exitCode == null) {
    console.error('[CLOUDFLARE] URL was not received within 20s, still waiting...')
    return
  }

  if (!started) {
    console.error('[CLOUDFLARE] URL was not received')
    shutdown(1)
  }
}, 20000)
