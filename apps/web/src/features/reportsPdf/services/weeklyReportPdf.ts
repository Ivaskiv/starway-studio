import type { TDocumentDefinitions } from 'pdfmake/interfaces'

import type { WeeklyReportFull } from '@/features/ai-mentor/services/mentor.api'

import { getPdfAsBlob } from './pdfClient'

function normalizeList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => String(item ?? '').trim()).filter(Boolean)
    : []
}

function formatShortDate(value: string | Date) {
  return new Date(value).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

function formatFullDate(value: string | Date) {
  return new Date(value).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildStats(report: WeeklyReportFull) {
  const tasksDone = report.metrics?.tasksDone ?? 0
  const tasksTotal = report.metrics?.tasksTotal ?? 0
  const tasksSkipped = Math.max(tasksTotal - tasksDone, 0)
  const streak = report.streakDays ?? report.metrics?.streakDays ?? 0
  const score = report.overallScore ?? 0

  const chips = [
    { label: 'виконано', value: tasksDone },
    { label: 'не завершено', value: tasksSkipped },
    { label: 'стрік', value: streak },
    { label: 'бал', value: score },
  ].filter(item => item.value > 0)

  return chips.length > 0
    ? chips
    : [{ label: 'Завдань цього тижня не було', value: null }]
}

function buildWheelSnapshot(report: WeeklyReportFull) {
  const strong = normalizeList(report.growthAreas)[0] ?? normalizeList(report.topInsights)[0] ?? '—'
  const weak = normalizeList(report.struggleAreas)[0] ?? report.nextWeekFocus ?? '—'
  const refDate = new Date(report.weekEnd)
  refDate.setDate(refDate.getDate() + 30)

  return {
    strong,
    weak,
    nextUpdate: formatFullDate(refDate),
  }
}

export async function generateWeeklyReportPdf(report: WeeklyReportFull): Promise<Blob> {
  const insights = normalizeList(report.topInsights)
  const nextSteps = normalizeList(report.nextWeekTasks)
  const stats = buildStats(report)
  const wheel = buildWheelSnapshot(report)
  const weekRange = `${formatShortDate(report.weekStart)} — ${formatShortDate(report.weekEnd)}`

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    footer: () => ({
      margin: [40, 0, 40, 24] as [number, number, number, number],
      columns: [
        {
          text: `Підготовлено Starway Mentor · ${formatFullDate(new Date())}`,
          alignment: 'center',
          fontSize: 9,
          color: '#6b6b6b',
        },
      ],
    }),
    content: [
      {
        columns: [
          { text: 'Starway · Тижневий звіт', fontSize: 11, color: '#6b6b6b' },
          { text: weekRange, alignment: 'right', fontSize: 11, color: '#6b6b6b' },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 0.5,
          lineColor: '#e0e0e0',
        }],
        margin: [0, 0, 0, 16] as [number, number, number, number],
      },
      {
        text: 'ФОКУС НАСТУПНОГО ТИЖНЯ',
        fontSize: 9,
        bold: true,
        color: '#555555',
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      {
        text: report.nextWeekFocus || 'Утримати ритм і посилити одну ключову дію.',
        fontSize: 16,
        bold: false,
        color: '#111111',
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      {
        text: 'ЩО ВІДБУЛОСЬ',
        fontSize: 9,
        bold: true,
        color: '#555555',
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      {
        text: report.summaryText || 'Тиждень показує, де ритм уже тримається, а де ще потрібна мікрокорекція.',
        fontSize: 12,
        color: '#1f1f1f',
        lineHeight: 1.6,
        margin: [0, 0, 0, 16] as [number, number, number, number],
      },
      {
        columns: stats.map(item => (
          item.value == null
            ? {
                stack: [
                  { text: item.label, fontSize: 18, bold: true, color: '#111111' },
                ],
                width: '*',
              }
            : {
                stack: [
                  { text: String(item.value), fontSize: 18, bold: true, color: '#111111' },
                  { text: item.label, fontSize: 9, color: '#4f4f4f', margin: [0, 2, 0, 0] as [number, number, number, number] },
                ],
                width: '*',
              }
        )),
        columnGap: 24,
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      {
        text: 'ІНСАЙТИ',
        fontSize: 9,
        bold: true,
        color: '#555555',
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      {
        stack: insights.length > 0
          ? insights.slice(0, 3).map(item => ({
              columns: [
                { text: '●', color: '#1D9E75', width: 12, fontSize: 10 },
                { text: item, fontSize: 12, color: '#1a1a1a', lineHeight: 1.5 },
              ],
              columnGap: 8,
              margin: [0, 0, 0, 8] as [number, number, number, number],
            }))
          : [
              {
                text: 'Ще немає достатньо даних для інсайтів.',
                fontSize: 12,
                color: '#4f4f4f',
                margin: [0, 0, 0, 8] as [number, number, number, number],
              },
            ],
        margin: [0, 0, 0, 16] as [number, number, number, number],
      },
      ...(nextSteps.length > 0
        ? [
            {
              text: 'НА НАСТУПНИЙ ТИЖДЕНЬ',
              fontSize: 9,
              bold: true,
              color: '#555555',
              margin: [0, 0, 0, 6] as [number, number, number, number],
            },
            {
              stack: nextSteps.slice(0, 2).map(item => ({
                columns: [
                  { text: '→', color: '#4f4f4f', width: 12, fontSize: 11 },
                  { text: item, fontSize: 12, color: '#1a1a1a', lineHeight: 1.5 },
                ],
                columnGap: 8,
                margin: [0, 0, 0, 8] as [number, number, number, number],
              })),
              margin: [0, 0, 0, 16] as [number, number, number, number],
            },
          ]
        : []),
      {
        text: 'КОЛЕСО БАЛАНСУ',
        fontSize: 9,
        bold: true,
        color: '#555555',
        margin: [0, 6, 0, 6] as [number, number, number, number],
      },
      {
        columns: [
          {
            text: `Сильна сфера · ${wheel.strong}`,
            fontSize: 11,
            color: '#1f1f1f',
          },
          {
            text: `В фокусі · ${wheel.weak}`,
            fontSize: 11,
            color: '#1f1f1f',
          },
        ],
        columnGap: 18,
      },
      {
        text: `Наступне оновлення: ${wheel.nextUpdate}`,
        fontSize: 11,
        color: '#1f1f1f',
        margin: [0, 6, 0, 0] as [number, number, number, number],
      },
    ],
    styles: {},
    defaultStyle: {
      font: 'Helvetica',
    },
  }

  return getPdfAsBlob(docDefinition)
}
