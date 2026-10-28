import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const renderBlueprint = readFileSync(resolve(process.cwd(), 'render.yaml'), 'utf8')
const backendPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'backend/package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}
const rootPackage = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
}

describe('background runtime deployment composition', () => {
  it('deploys the existing background entrypoint beside the interactive webhook service', () => {
    expect(renderBlueprint).toMatch(/name: starway-api[\s\S]*startCommand: cd backend && node dist\/src\/index\.js/)
    expect(renderBlueprint).toMatch(/type: worker[\s\S]*name: starway-background[\s\S]*startCommand: cd backend && node dist\/src\/background\/index\.js/)
    expect(backendPackage.scripts?.['start:background']).toBe('node dist/src/background/index.js')
  })

  it('starts exactly one canonical background runtime through the local dev supervisor', () => {
    const dev = rootPackage.scripts?.dev ?? ''

    expect(dev).toContain('concurrently -k')
    expect(dev.match(/pnpm -s --dir backend dev:background/g)).toHaveLength(1)
    expect(dev).toContain('backend,background,web')
  })
})
