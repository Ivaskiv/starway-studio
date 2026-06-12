import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const ROOT = resolve(process.cwd(), 'src')
const STYLE_ROOT = resolve(ROOT, 'styles')
const SCSS_EXTS = new Set(['.scss', '.sass'])
const LOCAL_EXTS = ['.scss', '.sass', '.css']

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walk(full, out)
      continue
    }

    if (SCSS_EXTS.has(extname(name))) {
      out.push(full)
    }
  }
  return out
}

function fileExists(candidate) {
  try {
    return statSync(candidate).isFile()
  } catch {
    return false
  }
}

function dirExists(candidate) {
  try {
    return statSync(candidate).isDirectory()
  } catch {
    return false
  }
}

function pushUnique(list, seen, value) {
  if (!seen.has(value)) {
    seen.add(value)
    list.push(value)
  }
}

function buildCandidates(baseDir, importPath) {
  const normalized = importPath.trim().replace(/\\/g, '/')
  const candidates = []
  const seen = new Set()
  const direct = resolve(baseDir, normalized)

  pushUnique(candidates, seen, direct)

  const directExt = extname(direct)
  const hasExt = Boolean(extname(normalized))

  if (!hasExt) {
    for (const ext of LOCAL_EXTS) {
      pushUnique(candidates, seen, `${direct}${ext}`)
      pushUnique(candidates, seen, resolve(baseDir, `${normalized}${ext}`))
    }
  }

  const directDir = directExt ? resolve(direct, '..') : resolve(direct, '..')
  const leaf = (directExt ? direct.slice(0, -directExt.length) : direct).split('/').pop() ?? normalized
  const leafWithoutExt = leaf.replace(/\.[^.]+$/, '')

  for (const ext of LOCAL_EXTS) {
    pushUnique(candidates, seen, resolve(directDir, `_${leafWithoutExt}${ext}`))
    pushUnique(candidates, seen, resolve(directDir, `${leafWithoutExt}${ext}`))
  }

  if (dirExists(direct)) {
    for (const ext of LOCAL_EXTS) {
      pushUnique(candidates, seen, resolve(direct, `index${ext}`))
      pushUnique(candidates, seen, resolve(direct, `_index${ext}`))
    }
  }

  return candidates
}

function resolveImport(baseDir, importPath) {
  if (/^(sass:|https?:\/\/|data:)/i.test(importPath)) {
    return true
  }

  const normalized = importPath.trim()
  const searchBases = [baseDir, STYLE_ROOT]

  for (const searchBase of searchBases) {
    for (const candidate of buildCandidates(searchBase, normalized)) {
      if (fileExists(candidate)) {
        return true
      }
    }
  }

  return false
}

const files = walk(ROOT)
const importRe = /@(use|import)\s+(?:url\()?['"]([^'"]+)['"]\)?/g
const errors = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  let match

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) {
      continue
    }

    importRe.lastIndex = 0
    while ((match = importRe.exec(line))) {
      const importPath = match[2]
      if (!resolveImport(resolve(file, '..'), importPath)) {
        errors.push(`${file}: cannot resolve "${importPath}"`)
      }
    }
  }
}

if (errors.length) {
  console.error('SASS import guard failed:\n' + errors.join('\n'))
  process.exit(1)
}

console.log(`SASS import guard passed (${files.length} files scanned)`)
