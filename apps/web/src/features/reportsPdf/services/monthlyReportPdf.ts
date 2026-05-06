import type { TDocumentDefinitions } from 'pdfmake/interfaces'

import type { DailyCycleEntry } from '@/features/daily-cycle/types/daily.types'
import type { MonthlyConversationSummary } from '@/features/ai-mentor/services/mentor.api'
import type { WheelAssessment } from '@/features/wheel/types/wheel.types'

import { getPdfAsBlob } from './pdfClient'
import { buildWheelReportSvg } from './wheelReportSvg'

type MonthlyReportPdfInput = {
  periodLabel: string
  morningCount: number
  eveningCount: number
  completedTasks: number
  missedTasks: number
  trendPoints: Array<{ date: string; value: number }>
  latestWheel: WheelAssessment | null
  strongestLabel: string
  weakestLabel: string
  wheelNarrative: string
  conversationSummary: MonthlyConversationSummary | null
  recentReports: Array<{
    period: string
    focus: string
    overallScore: number | null
  }>
  entries: DailyCycleEntry[]
  goals?: Array<{ text: string; isPrimary: boolean }>
  subscription?: {
    status: string
    planCode: string
    trialEndsAt: string | null
    currentPeriodEnd: string | null
    autoRenew: boolean
  } | null
  zoomSummary?: Array<{
    topic: string
    scheduledAt: string
    status: string
    attended: boolean
    note: unknown
  }>
}

const STATE_LABEL_MAP: Record<number, string> = {
  1: 'Напруга',
  2: 'Страх',
  3: 'Стабільність',
  4: 'Духовність',
}

function buildStateTrendSvg(points: MonthlyReportPdfInput['trendPoints']) {
  const width = 480
  const height = 180
  const paddingX = 28
  const paddingY = 20
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2

  if (points.length < 2) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#F8FAFC" stroke="#D7DFEA"/>
        <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#5B6472" font-size="14">
          Ще замало даних для графіка динаміки стану
        </text>
      </svg>
    `
  }

  const polylinePoints = points
    .map((point, index) => {
      const x = paddingX + (innerWidth * index) / Math.max(points.length - 1, 1)
      const normalized = (point.value - 1) / 3
      const y = height - paddingY - normalized * innerHeight
      return `${x},${y}`
    })
    .join(' ')

  const labels = points
    .map((point, index) => {
      if (!(index === 0 || index === points.length - 1 || index % 5 === 0)) return ''
      const x = paddingX + (innerWidth * index) / Math.max(points.length - 1, 1)
      const label = new Date(point.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'numeric' })
      return `<text x="${x}" y="${height - 4}" text-anchor="middle" fill="#6B7280" font-size="10">${label}</text>`
    })
    .join('')

  const gridLines = [1, 2, 3, 4]
    .map(level => {
      const y = height - paddingY - ((level - 1) / 3) * innerHeight
      return `
        <line x1="${paddingX}" x2="${width - paddingX}" y1="${y}" y2="${y}" stroke="#D6DEE8" stroke-dasharray="4 6"/>
        <text x="8" y="${y + 4}" fill="#6B7280" font-size="10">${STATE_LABEL_MAP[level]}</text>
      `
    })
    .join('')

  const dots = points
    .map((point, index) => {
      const x = paddingX + (innerWidth * index) / Math.max(points.length - 1, 1)
      const normalized = (point.value - 1) / 3
      const y = height - paddingY - normalized * innerHeight
      return `<circle cx="${x}" cy="${y}" r="4" fill="#2F6FED"/>`
    })
    .join('')

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#F8FAFC" stroke="#D7DFEA"/>
      ${gridLines}
      <polyline fill="none" stroke="#2F6FED" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />
      ${dots}
      ${labels}
    </svg>
  `
}

function buildTopRepeatingSignals(entries: DailyCycleEntry[]) {
  const signals = new Map<string, number>()

  for (const entry of entries) {
    const content = entry.content
    if (!content || typeof content !== 'object' || Array.isArray(content)) continue

    for (const key of ['morning', 'evening']) {
      const block = content[key]
      if (!block || typeof block !== 'object' || Array.isArray(block)) continue

      for (const value of Object.values(block)) {
        if (!value) continue
        const normalized = String(value).trim()
        if (normalized.length < 12) continue
        signals.set(normalized, (signals.get(normalized) ?? 0) + 1)
      }
    }
  }

  return Array.from(signals.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([text, count]) => `${text.slice(0, 110)}${text.length > 110 ? '…' : ''} (${count})`)
}

export async function generateMonthlySummaryPdf(input: MonthlyReportPdfInput): Promise<Blob> {
  const repeatingSignals = buildTopRepeatingSignals(input.entries)
  const primaryGoal = input.goals?.find(goal => goal.isPrimary)?.text ?? input.goals?.[0]?.text ?? null
  const suggestedCourse = input.missedTasks >= 3
    ? 'Тренінг “Система 21” · 33 €'
    : input.weakestLabel.toLowerCase().includes('опора') || input.weakestLabel.toLowerCase().includes('свобода')
      ? 'Міні-курс “Стан — ключ до успіху” · 10 €'
      : input.weakestLabel.toLowerCase().includes('страх') || input.conversationSummary?.topThemes.some(theme => theme.includes('страх'))
        ? 'Марафон “Страхи” · 33 €'
        : primaryGoal
          ? 'Міні-курс “Код змін” · 33 €'
          : 'Курс “Сила свідомості” · 33 €'

  const subscriptionLabel = input.subscription
    ? `План: ${input.subscription.planCode} · статус: ${input.subscription.status}${input.subscription.currentPeriodEnd ? ` · діє до ${new Date(input.subscription.currentPeriodEnd).toLocaleDateString('uk-UA')}` : ''}`
    : 'Підписка ще не визначена в даних звіту.'

  const recentReports = input.recentReports.filter(report => report.focus || report.overallScore != null).slice(0, 4)
  const zoomRows = (input.zoomSummary ?? []).slice(0, 3)

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [24, 22, 24, 22],
    content: [
      {
        columns: [
          [
            { text: 'Місячний звіт Starway', style: 'title' },
            { text: input.periodLabel, style: 'subtitle' },
          ],
          [
            { text: 'Стан → ціль → вибір → дія', style: 'eyebrow', alignment: 'right' },
            { text: 'Короткий зріз по щоденному циклу, колесу, задачах і бесідах.', style: 'meta', alignment: 'right' },
          ],
        ],
      },
      {
        margin: [0, 12, 0, 0],
        table: {
          widths: ['*', '*', '*', '*'],
          body: [[
            { stack: [{ text: String(input.morningCount), style: 'metricValue' }, { text: 'Ранкових сесій', style: 'metricLabel' }], style: 'metricBox' },
            { stack: [{ text: String(input.eveningCount), style: 'metricValue' }, { text: 'Вечірніх сесій', style: 'metricLabel' }], style: 'metricBox' },
            { stack: [{ text: String(input.completedTasks), style: 'metricValue' }, { text: 'Виконано задач', style: 'metricLabel' }], style: 'metricBox' },
            { stack: [{ text: String(input.missedTasks), style: 'metricValue' }, { text: 'Не завершено', style: 'metricLabel' }], style: 'metricBox' },
          ]],
        },
        layout: 'noBorders',
      },
      {
        margin: [0, 12, 0, 0],
        columns: [
          {
            stack: [
            { text: 'Динаміка стану', style: 'sectionTitle' },
            { svg: buildStateTrendSvg(input.trendPoints), width: 255, margin: [0, 8, 0, 0] as [number, number, number, number] },
            ],
          },
          {
            stack: [
            { text: 'Колесо балансу', style: 'sectionTitle' },
            { svg: buildWheelReportSvg(input.latestWheel, { size: 210 }), width: 250, margin: [0, 8, 0, 0] as [number, number, number, number] },
            { text: `Сильна сфера: ${input.strongestLabel}\nСфера фокусу: ${input.weakestLabel}`, style: 'meta', margin: [0, 8, 0, 0] as [number, number, number, number] },
            ],
          },
        ],
        columnGap: 16,
      },
      {
        margin: [0, 12, 0, 0],
        columns: [
          {
            stack: [
            { text: 'Короткий аналіз', style: 'sectionTitle' },
            { text: input.wheelNarrative, style: 'body' },
            ...(repeatingSignals.length > 0
              ? [
                  { text: 'Що найчастіше повторювалося', style: 'subTitle', margin: [0, 10, 0, 0] as [number, number, number, number] },
                  { ul: repeatingSignals.map(item => ({ text: item, style: 'listItem' })) },
                ]
              : []),
            ],
          },
          {
            stack: [
            { text: 'Бесіди з асистентом', style: 'sectionTitle' },
            { text: input.conversationSummary
              ? `${input.conversationSummary.totalConversations} діалогів · ${input.conversationSummary.totalMessages} повідомлень`
              : 'За цей період бесіди ще не накопичилися.', style: 'body' },
            ...(input.conversationSummary?.topThemes?.length
              ? [
                  { text: 'Теми, що звучали найчастіше', style: 'subTitle', margin: [0, 10, 0, 0] as [number, number, number, number] },
                  { ul: input.conversationSummary.topThemes.map(item => ({ text: item, style: 'listItem' })) },
                ]
              : []),
            ],
          },
        ],
        columnGap: 16,
      },
      {
        margin: [0, 12, 0, 0],
        columns: [
          {
            stack: [
            { text: 'Останні тижні', style: 'sectionTitle' },
            {
              ul: recentReports.length > 0
                ? recentReports.map(report => ({
                    text: `${report.period}: ${report.focus}${report.overallScore != null ? ` · бал ${report.overallScore}` : ''}`,
                    style: 'listItem',
                  }))
                : [{ text: 'Ще немає готових тижневих звітів.', style: 'listItem' }],
            },
            ],
          },
          {
            stack: [
            { text: 'Дата генерації', style: 'sectionTitle' },
            { text: new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }), style: 'body' },
            ],
          },
        ],
        columnGap: 16,
      },
      {
        margin: [0, 12, 0, 0],
        columns: [
          {
            stack: [
              { text: 'Стратегія цілей', style: 'sectionTitle' },
              { text: primaryGoal ? `Ключова ціль: ${primaryGoal}` : 'Ключова ціль ще не зафіксована.', style: 'body' },
              {
                ul: primaryGoal
                  ? [
                      { text: `Місяць: один фокусний рух навколо цілі "${primaryGoal}".`, style: 'listItem' },
                      { text: '3 місяці: закріпити повторювані мікродії та проміжні milestones.', style: 'listItem' },
                      { text: 'Рік: перевести ціль у систему рішень, а не в разовий ривок.', style: 'listItem' },
                    ]
                  : [{ text: 'Додай 10 цілей, щоб система могла побудувати річну траєкторію.', style: 'listItem' }],
              },
            ],
          },
          {
            stack: [
              { text: 'Zoom і щомісячний аудит', style: 'sectionTitle' },
              ...(zoomRows.length
                ? zoomRows.map(item => ({
                    text: `${new Date(item.scheduledAt).toLocaleDateString('uk-UA')}: ${item.topic} · ${item.attended ? 'відвідано' : 'заплановано'}`,
                    style: 'body',
                    margin: [0, 0, 0, 6] as [number, number, number, number],
                  }))
                : [{ text: 'Zoom-сесії за цей місяць ще не зафіксовані.', style: 'body' }]),
            ],
          },
        ],
        columnGap: 16,
      },
      {
        margin: [0, 12, 0, 0],
        columns: [
          {
            stack: [
              { text: 'Рекомендація курсу', style: 'sectionTitle' },
              { text: suggestedCourse, style: 'body' },
              { text: 'Пропозиції мають з’являтися точково, не щодня, а коли дані реально показують вузол проблеми.', style: 'meta', margin: [0, 8, 0, 0] as [number, number, number, number] },
            ],
          },
          {
            stack: [
              { text: 'Підписка і продовження', style: 'sectionTitle' },
              { text: subscriptionLabel, style: 'body' },
              { text: 'Нагадування про закінчення варто надсилати за 3 дні до кінця періоду.', style: 'meta', margin: [0, 8, 0, 0] as [number, number, number, number] },
            ],
          },
        ],
        columnGap: 16,
      },
      {
        margin: [0, 12, 0, 0],
        text: 'Кожне рішення прокачує рішучість. Впевненість і сила вибору ростуть не від наміру, а від систематичної мікродії.',
        style: 'quote',
      },
    ],
    pageBreakBefore: () => false,
    styles: {
      title: { fontSize: 22, bold: true, color: '#101828' },
      subtitle: { margin: [0, 4, 0, 0], fontSize: 11, color: '#667085' },
      eyebrow: { fontSize: 10, bold: true, color: '#2F6FED', characterSpacing: 1.2 },
      meta: { fontSize: 10, color: '#667085', lineHeight: 1.3 },
      metricBox: {
        margin: [0, 0, 8, 0],
        fillColor: '#F8FAFC',
        color: '#101828',
      },
      metricValue: { fontSize: 18, bold: true, color: '#101828' },
      metricLabel: { margin: [0, 4, 0, 0], fontSize: 10, color: '#667085' },
      sectionTitle: { fontSize: 13, bold: true, color: '#111827' },
      subTitle: { fontSize: 11, bold: true, color: '#344054' },
      body: { fontSize: 10, color: '#344054', lineHeight: 1.22 },
      listItem: { fontSize: 10, color: '#344054', lineHeight: 1.18 },
      quote: { fontSize: 10.2, italics: true, color: '#1D4ED8', lineHeight: 1.25 },
    },
    defaultStyle: {
      fontSize: 10,
      color: '#344054',
    },
  }

  return getPdfAsBlob(docDefinition)
}
