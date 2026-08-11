import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  ALLOWED_FOCUS_PLACEHOLDERS,
  FOCUS_FOLLOWUP_WAVES,
  FOCUS_RESULT_SEGMENTS,
  type FocusContentContract,
  type FocusFollowupMessage,
  type FocusFollowupWave,
  type FocusReminderRule,
  type FocusResultSegment,
} from './focusContent.contract.js'

type ParsedDoc = {
  results: Record<FocusResultSegment, string[]>
  followups: Record<FocusResultSegment, Record<FocusFollowupWave, string[]>>
  reminders: FocusReminderRule[]
}

export class FocusContentSyncError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'STRUCTURE_ERROR'
      | 'MISSING_FIELD'
      | 'DUPLICATE_FIELD'
      | 'UNKNOWN_PLACEHOLDER'
      | 'MALFORMED_PRICING_BLOCK'
      | 'PRICE_CONFIG_MISMATCH',
  ) {
    super(message)
    this.name = 'FocusContentSyncError'
  }
}

export type FocusPriceConfigSnapshot = {
  businessCatalog: {
    oneMonthAmount: number
    threeMonthAmount: number
  }
  paymentCatalog: {
    focusMonthlyAmount: number
    focusQuarterlyAmount: number
  }
}

export type FocusSyncValidationResult = {
  sourcePath: string
  generatedPath: string
  changed: boolean
  summary: {
    resultSegments: number
    followups: number
    reminders: number
  }
}

const RESULT_LABELS: Record<FocusResultSegment, string> = {
  state: 'СТАН',
  goal: 'ЦІЛЬ',
  choice: 'ВИБІР',
  decision: 'РІШЕННЯ',
  action: 'ДІЯ',
}

const RESULT_SECTION_HEADINGS: Record<FocusResultSegment, string> = {
  state: 'РЕЗУЛЬТАТ · СТАН',
  goal: 'РЕЗУЛЬТАТ · ЦІЛЬ',
  choice: 'РЕЗУЛЬТАТ · ВИБІР',
  decision: 'РЕЗУЛЬТАТ · РІШЕННЯ',
  action: 'РЕЗУЛЬТАТ · ДІЯ',
}

const FOLLOWUP_SECTION_HEADINGS: Record<FocusResultSegment, string> = {
  state: 'ДОЖИМИ · СТАН',
  goal: 'ДОЖИМИ · ЦІЛЬ',
  choice: 'ДОЖИМИ · ВИБІР',
  decision: 'ДОЖИМИ · РІШЕННЯ',
  action: 'ДОЖИМИ · ДІЯ',
}

const FOLLOWUP_WAVE_HEADINGS: Record<FocusFollowupWave, string> = {
  '24h': '— Дожим 1 · через 24 год · впізнавання',
  '48h': '— Дожим 2 · через 48 год · ціна бездіяльності',
  '72h': '— Дожим 3 · через 72 год · кейс',
  '5d': '— Дожим 4 · через 5 днів · заперечення',
  '7d': '— Дожим 5 · через 7 днів · доказ',
}

const REQUIRED_SHARED_VALUES = {
  title: 'ФОКУС | живі Zoom-розбори AB System',
  weeklyText: 'ФОКУС — це раз на тиждень живий Zoom-розбір.',
  zoomCasesText: 'Саме такі ситуації ми розбираємо на Zoom-розборах.',
  resultCta: 'СПРОБУВАТИ ПЕРШИЙ МІСЯЦЬ →',
  resultCtaMultiline: 'СПРОБУВАТИ\nПЕРШИЙ МІСЯЦЬ →',
  followupJoinCta: 'ХОЧУ У ФОКУС →',
  followupPayCta: 'ОПЛАТИТИ ФОКУС →',
  showInsideCta: 'Як це виглядає зсередини?',
  paymentCta1m: 'ОПЛАТИТИ 1 МІСЯЦЬ — 33 €',
  paymentCta3m: 'ОПЛАТИТИ 3 МІСЯЦІ — 69 €',
  oneMonth: '1 місяць — 33 €',
  threeMonths: '3 місяці — 69 € (23 € / місяць)',
  oneYear: '1 рік — 229 € (19 € / місяць)',
  guaranteeLine: '↩ Якщо після першого Zoom-розбору зрозумієш, що тобі не підходить, я поверну гроші.',
} as const

function normalizeSourceText(raw: string): string {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

function linesOf(text: string): string[] {
  return normalizeSourceText(text).split('\n')
}

function nextHeadingIndex(lines: string[], start: number, headings: string[]): number {
  for (let i = start; i < lines.length; i += 1) {
    if (headings.includes(lines[i].trim())) return i
  }
  return lines.length
}

function extractSection(lines: string[], heading: string, nextHeadings: string[]): string[] {
  const start = lines.findIndex((line) => line.trim() === heading)
  if (start < 0) {
    throw new FocusContentSyncError(`Missing section: ${heading}`, 'MISSING_FIELD')
  }

  const end = nextHeadingIndex(lines, start + 1, nextHeadings)
  return lines.slice(start + 1, end)
}

function compactParagraphs(rawLines: string[]): string[] {
  const paragraphs: string[] = []
  let current: string[] = []

  const flush = () => {
    if (current.length === 0) return
    paragraphs.push(current.join('\n').trim())
    current = []
  }

  for (const rawLine of rawLines) {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      flush()
      continue
    }
    current.push(line.trim())
  }

  flush()
  return paragraphs
}

function parseResultMessages(sectionLines: string[], segment: FocusResultSegment): string[] {
  const messages = new Map<number, string>()

  for (let index = 0; index < sectionLines.length; index += 1) {
    const line = sectionLines[index].trim()
    if (!/^[1-9]$/.test(line)) continue

    const stepNumber = Number(line)
    let cursor = index + 1
    while (cursor < sectionLines.length && !sectionLines[cursor].trim()) cursor += 1
    if (sectionLines[cursor]?.trim() !== 'Повідомлення') continue

    cursor += 1
    const captured: string[] = []
    while (cursor < sectionLines.length) {
      const current = sectionLines[cursor].trim()
      if (
        current === '—' ||
        current.startsWith('typing ·') ||
        current.startsWith('пауза ·') ||
        current === 'ГОЛОСОВЕ' ||
        current === 'Чекаємо кліку' ||
        current === '⬇ КНОПКА' ||
        current === 'РЕЗУЛЬТАТ · СТАН' ||
        current === 'РЕЗУЛЬТАТ · ЦІЛЬ' ||
        current === 'РЕЗУЛЬТАТ · ВИБІР' ||
        current === 'РЕЗУЛЬТАТ · РІШЕННЯ' ||
        current === 'РЕЗУЛЬТАТ · ДІЯ' ||
        /^[1-9]$/.test(current)
      ) {
        break
      }
      captured.push(sectionLines[cursor])
      cursor += 1
    }

    if (messages.has(stepNumber)) {
      throw new FocusContentSyncError(`Duplicate result message ${segment}:${stepNumber}`, 'DUPLICATE_FIELD')
    }

    messages.set(stepNumber, compactParagraphs(captured).join('\n'))
  }

  const ordered = Array.from({ length: 9 }, (_, idx) => {
    const step = idx + 1
    const message = messages.get(step)
    if (!message) {
      throw new FocusContentSyncError(`Missing result message ${segment}:${step}`, 'MISSING_FIELD')
    }
    return message
  })

  return ordered
}

function parseFollowupSection(sectionLines: string[], segment: FocusResultSegment): Record<FocusFollowupWave, string[]> {
  const output = {} as Record<FocusFollowupWave, string[]>
  const headingEntries = Object.entries(FOLLOWUP_WAVE_HEADINGS) as Array<[FocusFollowupWave, string]>

  for (let waveIndex = 0; waveIndex < headingEntries.length; waveIndex += 1) {
    const [wave, heading] = headingEntries[waveIndex]
    const nextHeadings = headingEntries.slice(waveIndex + 1).map(([, value]) => value)
    const start = sectionLines.findIndex((line) => line.trim() === heading)
    if (start < 0) {
      throw new FocusContentSyncError(`Missing followup heading ${segment}:${wave}`, 'MISSING_FIELD')
    }
    const end = nextHeadingIndex(sectionLines, start + 1, nextHeadings)
    output[wave] = compactParagraphs(sectionLines.slice(start + 1, end))
  }

  return output
}

function extractQuotedLine(line: string): string | undefined {
  const match = line.match(/[«"](.+)[»"]\]?$/u)
  return match?.[1]?.trim()
}

function ensureKnownPlaceholders(contract: FocusContentContract) {
  const strings = JSON.stringify(contract).match(/\{([A-Za-z0-9_]+)\}/g) ?? []
  for (const placeholder of strings) {
    const key = placeholder.slice(1, -1)
    if (!ALLOWED_FOCUS_PLACEHOLDERS.has(key)) {
      throw new FocusContentSyncError(`Unknown placeholder: ${placeholder}`, 'UNKNOWN_PLACEHOLDER')
    }
  }
}

function parsePricingBlock(step9: string) {
  const lines = step9.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length < 5) {
    throw new FocusContentSyncError('Malformed pricing block: too few lines', 'MALFORMED_PRICING_BLOCK')
  }

  const [title, oneMonth, threeMonths, oneYear, guaranteeLine] = lines
  if (
    title !== 'Найближчий Zoom-розбір уже цього тижня.' ||
    !oneMonth.includes('33 €') ||
    !threeMonths.includes('69 €') ||
    !oneYear.includes('229 €') ||
    !guaranteeLine.startsWith('↩')
  ) {
    throw new FocusContentSyncError('Malformed pricing block content', 'MALFORMED_PRICING_BLOCK')
  }

  return { title, oneMonth, threeMonths, oneYear, guaranteeLine }
}

export function parseFocusContentSource(sourceText: string, sourcePath: string): FocusContentContract {
  const lines = linesOf(sourceText)
  const parsed: ParsedDoc = {
    results: {} as Record<FocusResultSegment, string[]>,
    followups: {} as Record<FocusResultSegment, Record<FocusFollowupWave, string[]>>,
    reminders: [],
  }

  for (let index = 0; index < FOCUS_RESULT_SEGMENTS.length; index += 1) {
    const segment = FOCUS_RESULT_SEGMENTS[index]
    const nextHeadings = FOCUS_RESULT_SEGMENTS.slice(index + 1).map((key) => RESULT_SECTION_HEADINGS[key])
      .concat(['РОЗДІЛ 2 · ДОЖИМИ · ТАЙМІНГ'])
    parsed.results[segment] = parseResultMessages(
      extractSection(lines, RESULT_SECTION_HEADINGS[segment], nextHeadings),
      segment,
    )
  }

  for (let index = 0; index < FOCUS_RESULT_SEGMENTS.length; index += 1) {
    const segment = FOCUS_RESULT_SEGMENTS[index]
    const nextHeadings = FOCUS_RESULT_SEGMENTS.slice(index + 1).map((key) => FOLLOWUP_SECTION_HEADINGS[key])
      .concat(['РОЗДІЛ 4 · ЗВЕДЕНА ТАБЛИЦЯ ПАУЗ'])
    parsed.followups[segment] = parseFollowupSection(
      extractSection(lines, FOLLOWUP_SECTION_HEADINGS[segment], nextHeadings),
      segment,
    )
  }

  parsed.reminders = [
    {
      id: 'after_voice_without_click',
      schedule: [{ offset: '+24h', description: 'Відправляємо Дожим 1 відповідного сегменту' }],
    },
    {
      id: 'after_offer_without_payment',
      schedule: [
        { offset: '+24h', description: 'Дожим 1 — впізнавання' },
        { offset: '+4d', description: 'Дожим 2 — ціна бездіяльності' },
        { offset: '+7d', description: 'Дожим 3 — кейс' },
        { offset: '+12d', description: 'Дожим 4 — заперечення' },
        { offset: '+18d', description: 'Дожим 5 — доказ' },
      ],
    },
  ]

  const pricing = parsePricingBlock(parsed.results.state[8])

  const results = Object.fromEntries(
    FOCUS_RESULT_SEGMENTS.map((segment) => {
      const messages = parsed.results[segment]
      const step8Lines = messages[7].split('\n').filter(Boolean)
      const reviewHeader = step8Lines.filter((line) => !line.startsWith('📸')).join('\n')
      const sourceLine = step8Lines.find((line) => line.startsWith('📸')) ?? ''

      return [segment, {
        label: RESULT_LABELS[segment],
        messages: {
          step1: messages[0],
          step2: messages[1],
          step3: messages[2],
          step4: messages[3],
          step5: messages[4],
          step6: messages[5],
          step7: messages[6],
          step8: messages[7],
          step9: messages[8],
        },
        review: {
          header: reviewHeader,
          sourceLine,
        },
      }]
    }),
  ) as FocusContentContract['results']

  const followups = Object.fromEntries(
    FOCUS_RESULT_SEGMENTS.map((segment) => {
      const byWave = parsed.followups[segment]
      return [segment, Object.fromEntries(
        FOCUS_FOLLOWUP_WAVES.map((wave) => {
          const paragraphs = [...byWave[wave]]
          const buttonLine = paragraphs.find((paragraph) => paragraph.includes('[КНОПКА:') || paragraph.includes('КНОПКА:'))
          if (!buttonLine) {
            throw new FocusContentSyncError(`Missing CTA for followup ${segment}:${wave}`, 'MISSING_FIELD')
          }

          const ctaMatch = buttonLine.match(/(Хочу у ФОКУС →|Оплатити ФОКУС →)/u)
          const ctaLabel = ctaMatch?.[1]?.trim()
          if (!ctaLabel) {
            throw new FocusContentSyncError(`Empty CTA for followup ${segment}:${wave}`, 'MISSING_FIELD')
          }

          const pricingTitle = paragraphs.find((paragraph) => paragraph === REQUIRED_SHARED_VALUES.title)
          const reviewSourceLine = paragraphs.find((paragraph) => paragraph.startsWith('📸 [СКРІН'))
          const reviewQuote = reviewSourceLine ? extractQuotedLine(reviewSourceLine) : undefined

          const filteredParagraphs = paragraphs.filter((paragraph) => {
            if (paragraph === buttonLine) return false
            if (paragraph === REQUIRED_SHARED_VALUES.oneMonth) return false
            if (paragraph === REQUIRED_SHARED_VALUES.threeMonths) return false
            if (paragraph === REQUIRED_SHARED_VALUES.oneYear) return false
            if (paragraph === `${REQUIRED_SHARED_VALUES.oneMonth} ${REQUIRED_SHARED_VALUES.threeMonths} ${REQUIRED_SHARED_VALUES.oneYear}`) return false
            if (paragraph === REQUIRED_SHARED_VALUES.title) return false
            return true
          })

          const message: FocusFollowupMessage = {
            wave,
            heading: FOLLOWUP_WAVE_HEADINGS[wave],
            paragraphs: filteredParagraphs,
            ctaLabel,
            ...(pricingTitle ? { pricingTitle } : {}),
            ...(reviewQuote ? { reviewQuote } : {}),
            ...(reviewSourceLine ? { reviewSourceLine } : {}),
          }

          return [wave, message]
        }),
      )]
    }),
  ) as FocusContentContract['followups']

  const contract: FocusContentContract = {
    source: {
      adapter: 'local_markdown',
      path: sourcePath,
      generatedAt: new Date().toISOString(),
    },
    shared: {
      title: REQUIRED_SHARED_VALUES.title,
      weeklyText: REQUIRED_SHARED_VALUES.weeklyText,
      includedStandardText: results.goal.messages.step7,
      zoomCasesText: REQUIRED_SHARED_VALUES.zoomCasesText,
    },
    pricing: {
      oneMonth: REQUIRED_SHARED_VALUES.oneMonth,
      threeMonths: REQUIRED_SHARED_VALUES.threeMonths,
      oneYear: REQUIRED_SHARED_VALUES.oneYear,
      resultOffer: results.state.messages.step9,
      title: REQUIRED_SHARED_VALUES.title,
      guaranteeLine: pricing.guaranteeLine,
      paymentCta1m: REQUIRED_SHARED_VALUES.paymentCta1m,
      paymentCta3m: REQUIRED_SHARED_VALUES.paymentCta3m,
    },
    buttons: {
      resultCta: REQUIRED_SHARED_VALUES.resultCta,
      resultCtaMultiline: REQUIRED_SHARED_VALUES.resultCtaMultiline,
      followupJoinCta: REQUIRED_SHARED_VALUES.followupJoinCta,
      followupPayCta: REQUIRED_SHARED_VALUES.followupPayCta,
      showInsideCta: REQUIRED_SHARED_VALUES.showInsideCta,
    },
    results,
    followups,
    reminders: parsed.reminders,
  }

  ensureKnownPlaceholders(contract)
  validateFocusContentContract(contract)
  return contract
}

export function validateFocusContentContract(contract: FocusContentContract) {
  for (const segment of FOCUS_RESULT_SEGMENTS) {
    const result = contract.results[segment]
    if (!result) {
      throw new FocusContentSyncError(`Missing result segment ${segment}`, 'MISSING_FIELD')
    }

    for (const [key, value] of Object.entries(result.messages)) {
      if (!value?.trim()) {
        throw new FocusContentSyncError(`Empty result message ${segment}:${key}`, 'MISSING_FIELD')
      }
    }
  }

  for (const segment of FOCUS_RESULT_SEGMENTS) {
    for (const wave of FOCUS_FOLLOWUP_WAVES) {
      const followup = contract.followups[segment]?.[wave]
      if (!followup) {
        throw new FocusContentSyncError(`Missing followup ${segment}:${wave}`, 'MISSING_FIELD')
      }
      if (followup.paragraphs.length === 0) {
        throw new FocusContentSyncError(`Empty followup body ${segment}:${wave}`, 'MISSING_FIELD')
      }
      if (!followup.ctaLabel.trim()) {
        throw new FocusContentSyncError(`Empty followup CTA ${segment}:${wave}`, 'MISSING_FIELD')
      }
    }
  }

  if (
    contract.pricing.oneMonth !== REQUIRED_SHARED_VALUES.oneMonth ||
    contract.pricing.threeMonths !== REQUIRED_SHARED_VALUES.threeMonths ||
    contract.pricing.oneYear !== REQUIRED_SHARED_VALUES.oneYear
  ) {
    throw new FocusContentSyncError('Malformed pricing copy', 'MALFORMED_PRICING_BLOCK')
  }

  ensureKnownPlaceholders(contract)
}

export function validateFocusPriceConfig(
  contract: FocusContentContract,
  config: FocusPriceConfigSnapshot,
) {
  const expectedDisplay = [contract.pricing.oneMonth, contract.pricing.threeMonths]
  const containsLegacyUahConfig =
    config.businessCatalog.oneMonthAmount !== 33 ||
    config.businessCatalog.threeMonthAmount !== 69 ||
    config.paymentCatalog.focusMonthlyAmount !== 33 ||
    config.paymentCatalog.focusQuarterlyAmount !== 69

  if (containsLegacyUahConfig) {
    throw new FocusContentSyncError(
      `PRICE_CONFIG_MISMATCH: display=${expectedDisplay.join(' | ')} businessCatalog=${config.businessCatalog.oneMonthAmount}/${config.businessCatalog.threeMonthAmount} paymentCatalog=${config.paymentCatalog.focusMonthlyAmount}/${config.paymentCatalog.focusQuarterlyAmount}`,
      'PRICE_CONFIG_MISMATCH',
    )
  }
}

export function renderGeneratedFocusContentSource(contract: FocusContentContract): string {
  const stableContract = {
    ...contract,
    source: {
      ...contract.source,
      generatedAt: 'AUTO_GENERATED',
    },
  }

  return [
    '// AUTO-GENERATED — DO NOT EDIT.',
    `// Source: ${contract.source.path}`,
    '',
    "import type { FocusContentContract } from './focusContent.contract.js'",
    '',
    `export const GENERATED_FOCUS_CONTENT = ${JSON.stringify(stableContract, null, 2)} as const satisfies FocusContentContract`,
    '',
  ].join('\n')
}

export async function writeGeneratedFocusContentAtomic(
  generatedPath: string,
  sourceText: string,
): Promise<boolean> {
  const tempPath = `${generatedPath}.tmp`
  let previous = ''
  try {
    previous = await readFile(generatedPath, 'utf8')
  } catch {
    previous = ''
  }

  if (previous === sourceText) {
    return false
  }

  await writeFile(tempPath, sourceText, 'utf8')
  await rename(tempPath, generatedPath)
  return true
}

export async function runFocusContentSync(options: {
  sourcePath: string
  generatedPath: string
  priceConfig: FocusPriceConfigSnapshot
  allowPriceConfigMismatch?: boolean
}): Promise<FocusSyncValidationResult> {
  const raw = await readFile(options.sourcePath, 'utf8')
  const contract = parseFocusContentSource(raw, options.sourcePath)
  if (!options.allowPriceConfigMismatch) {
    validateFocusPriceConfig(contract, options.priceConfig)
  }

  const generatedSource = renderGeneratedFocusContentSource(contract)
  const changed = await writeGeneratedFocusContentAtomic(options.generatedPath, generatedSource)

  return {
    sourcePath: options.sourcePath,
    generatedPath: options.generatedPath,
    changed,
    summary: {
      resultSegments: FOCUS_RESULT_SEGMENTS.length,
      followups: FOCUS_RESULT_SEGMENTS.length * FOCUS_FOLLOWUP_WAVES.length,
      reminders: contract.reminders.length,
    },
  }
}

export function resolveDefaultFocusSourcePath() {
  return path.resolve(process.cwd(), 'docs/Копія файлу _fokus_tayming_dlya_teh.docx_.md')
}

export function resolveDefaultGeneratedPath() {
  return path.resolve(process.cwd(), 'backend/src/products/ab-system/content/focusContent.generated.ts')
}
