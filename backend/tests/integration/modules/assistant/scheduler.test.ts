import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

type ScheduleEntry = {
  key: string
  expression: string
}

function loadSchedulerSource(): string {
  const filePath = path.resolve(process.cwd(), 'backend/src/services/scheduler/index.ts')
  return fs.readFileSync(filePath, 'utf8')
}

function loadActiveSchedules(): ScheduleEntry[] {
  const source = loadSchedulerSource()
  const entries: ScheduleEntry[] = []

  for (const match of source.matchAll(/key:\s*'([^']+)',\s*expression:\s*'([^']+)'/gm)) {
    entries.push({
      key: match[1],
      expression: match[2],
    })
  }

  return entries
}

function loadSchedulerConcurrencyLimit(): number {
  const source = loadSchedulerSource()
  const match = source.match(/const SCHEDULER_CONCURRENCY_LIMIT = (\d+)/)
  if (!match) {
    throw new Error('failed to read SCHEDULER_CONCURRENCY_LIMIT from scheduler source')
  }
  return Number(match[1])
}

function countDirectCronRegistrationsOutsideCanonicalRegistry(): Array<{ filePath: string; count: number }> {
  const root = path.resolve(process.cwd(), 'backend/src')
  const ignoredSuffixes = new Set([
    'services/scheduler/index.ts',
  ])
  const results: Array<{ filePath: string; count: number }> = []

  function walk(directoryPath: string) {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const entryPath = path.join(directoryPath, entry.name)
      if (entry.isDirectory()) {
        walk(entryPath)
        continue
      }
      if (!entry.isFile() || !entryPath.endsWith('.ts')) continue
      const relativePath = path.relative(root, entryPath).replaceAll(path.sep, '/')
      if (ignoredSuffixes.has(relativePath)) continue
      const source = fs.readFileSync(entryPath, 'utf8')
      const matches = source.match(/\bcron\.schedule\(/g) ?? []
      if (matches.length > 0) {
        results.push({ filePath: relativePath, count: matches.length })
      }
    }
  }

  walk(root)
  return results
}

function partMatches(part: string, value: number): boolean {
  if (part === '*') return true

  if (part.includes(',')) {
    return part.split(',').some((item) => partMatches(item, value))
  }

  if (part.includes('/')) {
    const [base, stepValue] = part.split('/')
    const step = Number(stepValue)
    if (base === '*') {
      return value % step === 0
    }
    if (base.includes('-')) {
      const [start, end] = base.split('-').map(Number)
      return value >= start && value <= end && (value - start) % step === 0
    }
    const start = Number(base)
    return value >= start && (value - start) % step === 0
  }

  if (part.includes('-')) {
    const [start, end] = part.split('-').map(Number)
    return value >= start && value <= end
  }

  return Number(part) === value
}

function isDue(
  expression: string,
  minute: number,
  hour: number,
  dayOfMonth: number,
  month: number,
  dayOfWeek: number,
): boolean {
  const [minutePart, hourPart, dayPart, monthPart, weekPart] = expression.split(/\s+/)
  return partMatches(minutePart, minute)
    && partMatches(hourPart, hour)
    && partMatches(dayPart, dayOfMonth)
    && partMatches(monthPart, month)
    && partMatches(weekPart, dayOfWeek)
}

describe('assistant scheduler audit', () => {
  it('keeps simultaneous cron bursts at or below the scheduler concurrency limit', () => {
    const schedules = loadActiveSchedules()
    const concurrencyLimit = loadSchedulerConcurrencyLimit()
    let maxConcurrent = 0
    let worstSlot: { minute: number; hour: number; keys: string[] } | null = null

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth += 1) {
        for (let hour = 0; hour < 24; hour += 1) {
          for (let minute = 0; minute < 60; minute += 1) {
            const due = schedules.filter((schedule) =>
              isDue(schedule.expression, minute, hour, dayOfMonth, 1, dayOfWeek),
            )

            if (due.length > maxConcurrent) {
              maxConcurrent = due.length
              worstSlot = {
                minute,
                hour,
                keys: due.map((schedule) => schedule.key),
              }
            }
          }
        }
      }
    }

    expect(maxConcurrent, JSON.stringify(worstSlot)).toBeLessThanOrEqual(concurrencyLimit)
  }, 15_000)

  it('keeps all runtime cron registrations inside the canonical scheduler registry', () => {
    const directRegistrations = countDirectCronRegistrationsOutsideCanonicalRegistry()
    expect(directRegistrations).toEqual([])
  })
})
