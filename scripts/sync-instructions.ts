import { promises as fs } from 'node:fs'
import path from 'node:path'
import chokidar from 'chokidar'

const PROJECT_ID = '019e7028-1e4d-701e-a353-66d70c440565'
const PROJECT_URL = 'https://claude.ai/project/019e7028-1e4d-701e-a353-66d70c440565'
const WATCH_GLOB = 'docs/instructions/**/*'
const STATE_PATH = path.resolve('scripts/.instructions-sync-state.json')
const ALLOWED_EXTENSIONS = new Set(['.md', '.txt', '.ts', '.json'])
const DEBOUNCE_MS = 800

type SyncState = Partial<Record<string, string>>

type ClaudeDocument = {
  id?: string
  uuid?: string
  filename?: string
  file_name?: string
  title?: string
  name?: string
  metadata?: Record<string, unknown>
}

type CliOptions = {
  watch: boolean
}

function parseOptions(argv: string[]): CliOptions {
  return { watch: argv.includes('--watch') }
}

async function loadEnvFromDotenvFile(filePath: string): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex <= 0) continue
      const key = trimmed.slice(0, eqIndex).trim()
      if (!key || process.env[key] !== undefined) continue
      const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '')
      process.env[key] = value
    }
  } catch {
    // No .env file is valid; runtime env vars can still provide auth.
  }
}

async function loadState(): Promise<SyncState> {
  try {
    const data = await fs.readFile(STATE_PATH, 'utf8')
    return JSON.parse(data) as SyncState
  } catch {
    return {}
  }
}

async function saveState(state: SyncState): Promise<void> {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true })
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
}

async function isLikelyBinary(filePath: string): Promise<boolean> {
  const handle = await fs.open(filePath, 'r')
  try {
    const sample = Buffer.alloc(1024)
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0)
    for (let i = 0; i < bytesRead; i += 1) {
      if (sample[i] === 0) return true
    }
    return false
  } finally {
    await handle.close()
  }
}

function getApiConfig() {
  const sessionKey = process.env.CLAUDE_SESSION_KEY
  if (!sessionKey) {
    throw new Error('Missing CLAUDE_SESSION_KEY. Add it to root .env or shell environment.')
  }
  const baseUrl = (process.env.CLAUDE_API_BASE_URL ?? 'https://claude.ai/api').replace(/\/$/, '')
  const documentsPath = process.env.CLAUDE_PROJECT_DOCS_PATH ?? `/projects/${PROJECT_ID}/documents`
  return {
    baseUrl,
    documentsUrl: `${baseUrl}${documentsPath}`,
    sessionKey,
  }
}

function requestHeaders(sessionKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Cookie: `sessionKey=${sessionKey}`,
    Referer: PROJECT_URL,
    Origin: 'https://claude.ai',
  }
}

function extractDocumentId(doc: ClaudeDocument): string | undefined {
  return doc.id ?? doc.uuid
}

function extractDocumentFilename(doc: ClaudeDocument): string | undefined {
  const fromMeta = doc.metadata?.filename
  if (typeof fromMeta === 'string' && fromMeta.length > 0) return fromMeta
  return doc.filename ?? doc.file_name ?? doc.title ?? doc.name
}

async function listDocuments(documentsUrl: string, sessionKey: string): Promise<ClaudeDocument[]> {
  const res = await fetch(documentsUrl, {
    method: 'GET',
    headers: requestHeaders(sessionKey),
  })
  if (!res.ok) {
    throw new Error(`List documents failed (${res.status})`)
  }
  const data = (await res.json()) as unknown
  if (Array.isArray(data)) return data as ClaudeDocument[]
  if (data && typeof data === 'object') {
    const maybeDocs = (data as { documents?: unknown; data?: unknown }).documents ?? (data as { data?: unknown }).data
    if (Array.isArray(maybeDocs)) return maybeDocs as ClaudeDocument[]
  }
  return []
}

async function createDocument(
  documentsUrl: string,
  sessionKey: string,
  filename: string,
  content: string
): Promise<string> {
  const res = await fetch(documentsUrl, {
    method: 'POST',
    headers: requestHeaders(sessionKey),
    body: JSON.stringify({
      filename,
      title: filename,
      content,
      metadata: { filename },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Create failed (${res.status}): ${body.slice(0, 400)}`)
  }
  const json = (await res.json()) as ClaudeDocument
  const id = extractDocumentId(json)
  if (!id) throw new Error('Create succeeded but response did not include a document id')
  return id
}

async function updateDocument(
  documentsUrl: string,
  sessionKey: string,
  documentId: string,
  filename: string,
  content: string
): Promise<void> {
  const res = await fetch(`${documentsUrl}/${documentId}`, {
    method: 'PUT',
    headers: requestHeaders(sessionKey),
    body: JSON.stringify({
      filename,
      title: filename,
      content,
      metadata: { filename },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Update failed (${res.status}): ${body.slice(0, 400)}`)
  }
}

async function resolveDocumentIdByFilename(
  documentsUrl: string,
  sessionKey: string,
  filename: string
): Promise<string | undefined> {
  const docs = await listDocuments(documentsUrl, sessionKey)
  const match = docs.find((doc) => extractDocumentFilename(doc) === filename)
  if (!match) return undefined
  return extractDocumentId(match)
}

async function syncFile(filePath: string, state: SyncState): Promise<void> {
  const ext = path.extname(filePath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) return

  if (await isLikelyBinary(filePath)) {
    console.log(`[SKIP] ${filePath} (binary)`)
    return
  }

  const content = await fs.readFile(filePath, 'utf8')
  const { documentsUrl, sessionKey } = getApiConfig()
  const filename = path.relative(process.cwd(), filePath)

  let documentId = state[filename]
  if (!documentId) {
    documentId = await resolveDocumentIdByFilename(documentsUrl, sessionKey, filename)
  }

  if (documentId) {
    await updateDocument(documentsUrl, sessionKey, documentId, filename, content)
    state[filename] = documentId
    await saveState(state)
    console.log(`[UPDATE] ${filename} -> ${documentId}`)
    return
  }

  const newId = await createDocument(documentsUrl, sessionKey, filename, content)
  state[filename] = newId
  await saveState(state)
  console.log(`[ADD] ${filename} -> ${newId}`)
}

function debounceByFile<T extends string>(fn: (key: T) => Promise<void>, delayMs: number) {
  const timers = new Map<T, NodeJS.Timeout>()
  return (key: T) => {
    const existing = timers.get(key)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      timers.delete(key)
      fn(key).catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(`[ERROR] ${key}: ${msg}`)
      })
    }, delayMs)
    timers.set(key, timer)
  }
}

async function runOnce(state: SyncState): Promise<void> {
  const root = path.resolve('docs/instructions')
  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(abs)
        continue
      }
      if (entry.isFile()) {
        await syncFile(abs, state)
      }
    }
  }
  await walk(root)
}

async function runWatch(state: SyncState): Promise<void> {
  const enqueue = debounceByFile<string>((filePath) => syncFile(filePath, state), DEBOUNCE_MS)
  const watcher = chokidar.watch(WATCH_GLOB, {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 50 },
  })

  watcher.on('add', (filePath: string) => enqueue(path.resolve(filePath)))
  watcher.on('change', (filePath: string) => enqueue(path.resolve(filePath)))
  watcher.on('error', (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[WATCHER ERROR] ${msg}`)
  })

  console.log(`[WATCH] ${WATCH_GLOB}`)
}

async function main(): Promise<void> {
  await loadEnvFromDotenvFile(path.resolve('.env'))
  const options = parseOptions(process.argv.slice(2))
  const state = await loadState()
  if (options.watch) {
    await runWatch(state)
    return
  }
  await runOnce(state)
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.stack ?? error.message : String(error)
  console.error(msg)
  process.exit(1)
})
