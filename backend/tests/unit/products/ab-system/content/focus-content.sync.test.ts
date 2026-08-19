import { mkdtemp, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FocusContentSyncError,
  parseFocusContentSource,
  renderGeneratedFocusContentSource,
  resolveDefaultFocusSourcePath,
  runFocusContentSync,
  validateFocusContentContract,
} from '../focusContent.sync.ts'

async function readFixture() {
  const sourcePath = resolveDefaultFocusSourcePath()
  const raw = await readFile(sourcePath, 'utf8')
  return { sourcePath, raw }
}

describe('focus content sync pipeline', () => {
  it('parses the canonical local spec into structured result and followup content', async () => {
    const { sourcePath, raw } = await readFixture()
    const contract = parseFocusContentSource(raw, sourcePath)

    expect(contract.results.state.messages.step1).toContain('Зараз ти живеш більше на автоматі')
    expect(contract.results.goal.messages.step5).toContain('ФОКУС — це раз на тиждень живий Zoom-розбір.')
    expect(contract.followups.choice['72h'].paragraphs[0]).toContain('Валентина')
    expect(contract.followups.action['7d'].ctaLabel).toBe('Оплатити ФОКУС →')
  })

  it('validates the parsed contract and renders a deterministic generated artifact', async () => {
    const { sourcePath, raw } = await readFixture()
    const contract = parseFocusContentSource(raw, sourcePath)

    expect(() => validateFocusContentContract(contract)).not.toThrow()
    const rendered = renderGeneratedFocusContentSource(contract)
    expect(rendered).toContain('AUTO-GENERATED — DO NOT EDIT.')
    expect(rendered).toContain('"weeklyText": "ФОКУС — це раз на тиждень живий Zoom-розбір."')
  })

  it('is idempotent across two runs when price config matches the display copy', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'focus-content-sync-'))
    const generatedPath = path.join(tempDir, 'focusContent.generated.ts')
    const sourcePath = resolveDefaultFocusSourcePath()

    const first = await runFocusContentSync({
      sourcePath,
      generatedPath,
      priceConfig: {
        businessCatalog: {
          oneMonthAmount: 33,
          threeMonthAmount: 69,
        },
        paymentCatalog: {
          focusMonthlyAmount: 33,
          focusQuarterlyAmount: 69,
        },
      },
    })

    const second = await runFocusContentSync({
      sourcePath,
      generatedPath,
      priceConfig: {
        businessCatalog: {
          oneMonthAmount: 33,
          threeMonthAmount: 69,
        },
        paymentCatalog: {
          focusMonthlyAmount: 33,
          focusQuarterlyAmount: 69,
        },
      },
    })

    expect(first.changed).toBe(true)
    expect(second.changed).toBe(false)
  })

  it('rejects a missing result message', async () => {
    const { sourcePath, raw } = await readFixture()
    const malformed = raw.replace('Найближчий Zoom-розбір уже цього тижня.', '')

    expect(() => parseFocusContentSource(malformed, sourcePath)).toThrowError(FocusContentSyncError)
    expect(() => parseFocusContentSource(malformed, sourcePath)).toThrowError(/Missing result message state:9|Malformed pricing block/)
  })

  it('rejects duplicate result message ids', async () => {
    const { sourcePath, raw } = await readFixture()
    const marker = 'РЕЗУЛЬТАТ · СТАН'
    const duplicated = raw.replace(
      marker,
      `${marker}\n1\n\tПовідомлення\n\tДублікат повідомлення.\n`,
    )

    expect(() => parseFocusContentSource(duplicated, sourcePath)).toThrowError(/Duplicate result message state:1/)
  })

  it('rejects unknown placeholders', async () => {
    const { sourcePath, raw } = await readFixture()
    const malformed = raw.replace('Зараз ти живеш більше на автоматі.', 'Зараз ти живеш більше на автоматі, {unknown}.')

    expect(() => parseFocusContentSource(malformed, sourcePath)).toThrowError(/Unknown placeholder/)
  })

  it('rejects price config mismatch without overwriting the target artifact', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'focus-content-sync-'))
    const generatedPath = path.join(tempDir, 'focusContent.generated.ts')
    const sourcePath = resolveDefaultFocusSourcePath()

    await expect(() => runFocusContentSync({
      sourcePath,
      generatedPath,
      priceConfig: {
        businessCatalog: {
          oneMonthAmount: 780,
          threeMonthAmount: 1990,
        },
        paymentCatalog: {
          focusMonthlyAmount: 1,
          focusQuarterlyAmount: 1,
        },
      },
    })).rejects.toMatchObject({ code: 'PRICE_CONFIG_MISMATCH' })
  })
})
