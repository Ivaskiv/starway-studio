// backend/src/modules/ai-generator/products-generator/wheel.ts

import { prisma } from '../../../db/client.js'
import { openai } from '../../../lib/openai.js'
import { Context } from 'telegraf'
import { bot } from '../../../lib/telegram.js'
import PdfPrinter from 'pdfmake'
import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces'

// ── Типи ─────────────────────────────────────────────────────────────────────

export interface WheelScore {
  categoryId: string
  score: number
  comment?: string | null
}

export interface WheelUserContext {
  name: string
  email: string | null
  phone: string | null
  gender?: 'male' | 'female' | null
  age: number | null
}

export interface WheelPDFData {
  userName: string
  scores: WheelScore[]
  weakestSphere: string
  focusSphere: string
  analysis: string
  createdAt: string
}

export interface WheelAnalytics {
  totalAssessments: number
  averageScores: Record<string, number>
  mostCommonWeakest: string
  mostCommonFocus: string
  trend: 'improving' | 'declining' | 'stable'
}

// ── Константи ────────────────────────────────────────────────────────────────

export const SPHERE_LABELS: Record<string, string> = {
  money:             'Гроші',
  realization:       'Реалізація',
  relationships:     'Відносини',
  energy_body:       'Енергія/Тіло',
  freedom_time:      'Свобода/Час',
  inner_support:     'Внутрішня опора',
  environment:       'Оточення',
  meaning_direction: 'Сенс/Напрямок',
}

export const FIXED_SPHERES = [
  'money', 'realization', 'relationships', 'energy_body',
  'freedom_time', 'inner_support', 'environment', 'meaning_direction',
] as const
export type FixedSphere = typeof FIXED_SPHERES[number]

// ── Helpers ──────────────────────────────────────────────────────────────────

export const findWeakest   = (scores: WheelScore[]) => scores.reduce((min, s) => s.score < min.score ? s : min)
export const findStrongest = (scores: WheelScore[]) => scores.reduce((max, s) => s.score > max.score ? s : max)
export const calculateImbalance = (scores: WheelScore[]) =>
  findStrongest(scores).score - findWeakest(scores).score

export function findFocus(scores: WheelScore[], weakest: WheelScore): WheelScore {
  const alternatives = scores.filter(s => s.categoryId !== weakest.categoryId && s.score < 7)
  return alternatives.length > 0 ? alternatives[0] : weakest
}

export function scoresToMap(scores: WheelScore[]): Record<string, number> {
  return Object.fromEntries(scores.map(s => [s.categoryId, s.score]))
}

export function scoresFromMap(map: unknown): WheelScore[] {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return []
  return Object.entries(map as Record<string, number>).map(
    ([categoryId, score]) => ({ categoryId, score }),
  )
}

// ── AI-аналіз ────────────────────────────────────────────────────────────────

export async function generateWheelAnalysis(
  scores: WheelScore[],
  user: WheelUserContext,
): Promise<string> {
  const weakest   = findWeakest(scores)
  const strongest = findStrongest(scores)
  const imbalance = strongest.score - weakest.score

  const scoresText = scores
    .map(s => `${SPHERE_LABELS[s.categoryId] ?? s.categoryId}: ${s.score}/10${s.comment ? ` ("${s.comment}")` : ''}`)
    .join('\n')

  const prompt = `
Ти — AI-коуч жіночого менторського проєкту "Зоряний шлях".

Користувач: ${user.name || 'Анонім'}

Оцінки сфер (1–10):
${scoresText}

Найслабша: ${SPHERE_LABELS[weakest.categoryId] ?? weakest.categoryId} (${weakest.score}/10)
Найсильніша: ${SPHERE_LABELS[strongest.categoryId] ?? strongest.categoryId} (${strongest.score}/10)
Дисбаланс: ${imbalance} балів

Завдання (2–3 речення, українською, тон — підтримка + дія):
1. Перекіс між сферами
2. Системний вплив слабкої сфери
3. 1–2 конкретні кроки для щоденного циклу
  `.trim()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content?.trim() || 'Аналіз недоступний'
}

// ── CRUD / Сервіс ────────────────────────────────────────────────────────────

export async function createWheel(
  userId: string,
  balanceConfigId: string,
  scores: WheelScore[],
): Promise<any> {
  if (scores.length !== FIXED_SPHERES.length) throw new Error('Необхідно 8 сфер')

  const ids = new Set(scores.map(s => s.categoryId))
  const isValidSet = FIXED_SPHERES.every(id => ids.has(id)) && ids.size === FIXED_SPHERES.length
  if (!isValidSet) throw new Error('Сфери не відповідають фіксованому набору')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, email: true, expertId: true },
  })
  if (!user) throw new Error('User not found')
  if (!user.expertId) throw new Error('User has no expertId')

  const weakest     = findWeakest(scores)
  const focus       = findFocus(scores, weakest)
  const userContext: WheelUserContext = {
    name:  user.firstName ?? user.email ?? 'Користувач',
    email: user.email,
    phone: null,
    age:   null,
  }

  const analysis = await generateWheelAnalysis(scores, userContext)
  const note = `Слабка: ${weakest.categoryId} (${weakest.score}/10). Фокус: ${focus.categoryId}. ${analysis}`

  return prisma.userBalanceEntry.create({
    data: {
      userId,
      expertId: user.expertId,
      balanceConfigId,
      scores: scoresToMap(scores),
      note,
    },
  })
}

// ── PDF через pdfmake ────────────────────────────────────────────────────────

// pdfmake потребує шрифти — використовуємо стандартний Roboto що йде з пакетом
// або підключаємо кирилічний шрифт (рекомендовано для українського тексту)
const fonts = {
  Roboto: {
    normal:      'node_modules/pdfmake/build/vfs_fonts.js',
    bold:        'node_modules/pdfmake/build/vfs_fonts.js',
    italics:     'node_modules/pdfmake/build/vfs_fonts.js',
    bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js',
  },
}

const printer = new PdfPrinter(fonts)

const ACCENT  = '#1a56db'
const DARK    = '#1A1A2E'
const MUTED   = '#6B7280'

const styles: StyleDictionary = {
  header: {
    fontSize: 22,
    bold:     true,
    color:    ACCENT,
    margin:   [0, 0, 0, 4],
  },
  subheader: {
    fontSize: 14,
    bold:     true,
    color:    DARK,
    margin:   [0, 16, 0, 6],
  },
  label: {
    fontSize: 10,
    color:    MUTED,
  },
  value: {
    fontSize: 11,
    bold:     true,
    color:    DARK,
  },
  analysis: {
    fontSize:   11,
    color:      DARK,
    lineHeight: 1.5,
  },
  tableHeader: {
    fontSize:  10,
    bold:      true,
    color:     '#FFFFFF',
    fillColor: ACCENT,
    margin:    [4, 6, 4, 6],
  },
  tableCell: {
    fontSize: 10,
    color:    DARK,
    margin:   [4, 5, 4, 5],
  },
}

export async function createWheelPDF(data: WheelPDFData): Promise<Buffer> {
  const weakestLabel = SPHERE_LABELS[data.weakestSphere] ?? data.weakestSphere
  const focusLabel   = SPHERE_LABELS[data.focusSphere]   ?? data.focusSphere
  const dateStr      = new Date(data.createdAt).toLocaleDateString('uk-UA', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // Рядки таблиці оцінок
  const scoreRows = data.scores.map(s => {
    const label = SPHERE_LABELS[s.categoryId] ?? s.categoryId
    const bar   = '█'.repeat(s.score) + '░'.repeat(10 - s.score)
    return [
      { text: label,          style: 'tableCell' },
      { text: String(s.score), style: 'tableCell', alignment: 'center' as const },
      { text: bar,             style: 'tableCell', font: 'Roboto' },
    ]
  })

  const docDefinition: TDocumentDefinitions = {
    pageSize:    'A4',
    pageMargins: [40, 50, 40, 50],
    defaultStyle: { font: 'Roboto' },

    content: [
      // Хедер
      {
        columns: [
          { text: 'Starway Studio', style: 'header', width: '*' },
          { text: dateStr, style: 'label', alignment: 'right', width: 'auto', margin: [0, 6, 0, 0] },
        ],
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: ACCENT }] },
      { text: '\n' },

      // Ім'я та тип звіту
      { text: 'Колесо балансу', style: 'subheader' },
      {
        columns: [
          { text: 'Користувач:', style: 'label', width: 100 },
          { text: data.userName, style: 'value' },
        ],
        margin: [0, 2, 0, 2],
      },

      // Ключові показники
      { text: 'Ключові показники', style: 'subheader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Найслабша сфера', style: 'label' },
              { text: weakestLabel, style: 'value', color: '#EF4444', margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'Фокус розвитку', style: 'label' },
              { text: focusLabel, style: 'value', color: ACCENT, margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 16],
      },

      // Таблиця оцінок
      { text: 'Оцінки по сферах', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths:     ['*', 40, '*'],
          body: [
            [
              { text: 'Сфера',  style: 'tableHeader' },
              { text: 'Бал',    style: 'tableHeader', alignment: 'center' },
              { text: 'Рівень', style: 'tableHeader' },
            ],
            ...scoreRows,
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => rowIndex === 0 ? null : rowIndex % 2 === 0 ? '#F9FAFB' : null,
          hLineColor: () => '#E5E7EB',
          vLineColor: () => '#E5E7EB',
        },
        margin: [0, 0, 0, 16],
      },

      // AI аналіз
      { text: 'Аналіз AI-ментора', style: 'subheader' },
      {
        text:         data.analysis,
        style:        'analysis',
        margin:       [0, 0, 0, 16],
      },

      // Футер
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#E5E7EB' }] },
      {
        text:       'Starway Studio — AI-ментор для особистого зростання',
        style:      'label',
        alignment:  'center',
        margin:     [0, 8, 0, 0],
      },
    ],

    styles,

    footer: (currentPage: number, pageCount: number) => ({
      text:      `${currentPage} / ${pageCount}`,
      alignment: 'center',
      style:     'label',
      margin:    [0, 10, 0, 0],
    }),
  }

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition)
      const chunks: Buffer[] = []
      pdfDoc.on('data',  (chunk: Buffer) => chunks.push(chunk))
      pdfDoc.on('end',   () => resolve(Buffer.concat(chunks)))
      pdfDoc.on('error', reject)
      pdfDoc.end()
    } catch (err) {
      reject(err)
    }
  })
}

// ── Telegram ─────────────────────────────────────────────────────────────────

let wheelPdfCallbackRegistered = false

export async function sendWheelNotification(userId: string, entryId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramUserId: true, telegramUserName: true },
  })
  if (!user?.telegramUserId) return { ok: false, reason: 'Telegram not linked' }

  await bot.telegram.sendMessage(
    user.telegramUserId,
    '🎡 Колесо балансу збережено!',
    {
      reply_markup: {
        inline_keyboard: [[{ text: '📄 PDF', callback_data: `wheel_pdf_${entryId}` }]],
      },
    },
  )
  return { ok: true }
}

if (!wheelPdfCallbackRegistered) {
  wheelPdfCallbackRegistered = true

  bot.on('callback_query', async (ctx: Context) => {
    const cq = ctx.callbackQuery as { data?: string }
    if (!cq?.data?.startsWith('wheel_pdf_')) return

    const entryId = cq.data.replace('wheel_pdf_', '')
    const entry   = await prisma.userBalanceEntry.findUnique({
      where:   { id: entryId },
      include: { user: true },
    })

    if (!entry) {
      await ctx.answerCbQuery('❌ Не знайдено')
      return
    }

    const scores  = scoresFromMap(entry.scores)
    const weakest = findWeakest(scores)
    const focus   = findFocus(scores, weakest)

    const pdfData: WheelPDFData = {
      userName:     entry.user?.firstName ?? entry.user?.email ?? 'Користувач',
      scores,
      weakestSphere: weakest.categoryId,
      focusSphere:   focus.categoryId,
      analysis:      entry.note ?? '',
      createdAt:     entry.createdAt.toISOString(),
    }

    const buffer = await createWheelPDF(pdfData)
    await ctx.telegram.sendDocument(
      ctx.from!.id,
      { source: buffer, filename: `wheel-${entryId}.pdf` },
    )
    await ctx.answerCbQuery('✅ PDF надіслано!')
  })
}
