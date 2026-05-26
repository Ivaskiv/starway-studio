import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'src')
const EXTS = new Set(['.css', '.scss', '.tsx', '.ts', '.jsx', '.js'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue
      walk(full, out)
    } else {
      const ext = name.slice(name.lastIndexOf('.'))
      if (EXTS.has(ext)) out.push(full)
    }
  }
  return out
}

const files = walk(ROOT)
const rgbDefs = new Map()
const rgbaUses = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')

  const defRe = /--([a-zA-Z0-9_-]+-rgb)\s*:\s*([^;]+);/g
  let d
  while ((d = defRe.exec(text))) {
    rgbDefs.set(d[1], { value: d[2].trim(), file })
  }

  const useRe = /rgba\(\s*var\(\s*--([a-zA-Z0-9_-]+)\s*\)\s*,/g
  let u
  while ((u = useRe.exec(text))) {
    rgbaUses.push({ token: u[1], file })
  }
}

const errors = []

for (const { token, file } of rgbaUses) {
  if (!token.endsWith('-rgb')) {
    errors.push(`Invalid rgba(var(--${token}), ...): token must end with -rgb :: ${file}`)
  }
}

const rgbValueRe = /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/
for (const [token, meta] of rgbDefs.entries()) {
  if (!rgbValueRe.test(meta.value)) {
    errors.push(`Invalid --${token}: "${meta.value}" :: ${meta.file}`)
  }
}

if (errors.length) {
  console.error('Color RGB guard failed:\n' + errors.join('\n'))
  process.exit(1)
}

console.log(`Color RGB guard passed (${files.length} files scanned)`)
