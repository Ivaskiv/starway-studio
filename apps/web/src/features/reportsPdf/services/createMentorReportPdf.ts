import type { TDocumentDefinitions } from 'pdfmake/interfaces'

import type { AnswerInput, Decision } from '@/features/daily-cycle/questions/types/questions.types'

import { getPdfAsBlob } from './pdfClient'

interface MentorReportInput {
  userId: string
  answers: AnswerInput[]
  decisions: Decision[]
  metrics: {
    stability: number
    drains: number
    consistency: number
  }
  wheelData?: Array<{
    area: string
    score: number
  }>
}

export const createMentorReportPdf = async (input: MentorReportInput): Promise<Blob> => {
  const { userId, answers, decisions, metrics, wheelData } = input

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [24, 22, 24, 22],
    content: [
      { text: 'Звіт ABsystem', style: 'title' },
      {
        columns: [
          { text: `Користувач: ${userId}`, style: 'meta' },
          { text: `Дата: ${new Date().toLocaleDateString('uk-UA')}`, alignment: 'right', style: 'meta' },
        ],
      },
      {
        margin: [0, 18, 0, 0],
        table: {
          widths: ['*', '*', '*'],
          body: [[
            { stack: [{ text: String(metrics.stability), style: 'metricValue' }, { text: 'Стабільність', style: 'metricLabel' }], style: 'metricBox' },
            { stack: [{ text: String(metrics.drains), style: 'metricValue' }, { text: 'Злив енергії', style: 'metricLabel' }], style: 'metricBox' },
            { stack: [{ text: String(metrics.consistency), style: 'metricValue' }, { text: 'Послідовність', style: 'metricLabel' }], style: 'metricBox' },
          ]],
        },
        layout: 'noBorders',
      },
      ...(wheelData?.length
        ? [
            { text: 'Колесо балансу', style: 'sectionTitle', margin: [0, 18, 0, 8] as [number, number, number, number] },
            {
              table: {
                widths: ['*', 'auto'],
                body: wheelData.map(item => [
                  { text: item.area, style: 'body' },
                  { text: `${item.score}/10`, style: 'bodyStrong' },
                ]),
              },
              layout: {
                hLineColor: () => '#E4E7EC',
                vLineColor: () => '#E4E7EC',
                paddingLeft: () => 10,
                paddingRight: () => 10,
                paddingTop: () => 8,
                paddingBottom: () => 8,
              },
            },
          ]
        : []),
      { text: 'Відповіді', style: 'sectionTitle', margin: [0, 18, 0, 8] as [number, number, number, number] },
      {
        table: {
          widths: ['auto', '*'],
          body: answers.length > 0
            ? answers.map(answer => [
                { text: answer.questionId, style: 'bodyMuted' },
                { text: String(answer.value ?? '—'), style: 'body' },
              ])
            : [[{ text: 'Немає відповідей', colSpan: 2, style: 'bodyMuted' }, {}]],
        },
        layout: {
          hLineColor: () => '#E4E7EC',
          vLineColor: () => '#E4E7EC',
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },
      { text: 'Рішення системи', style: 'sectionTitle', margin: [0, 18, 0, 8] as [number, number, number, number] },
      {
        ul: decisions.length > 0
          ? decisions.map(decision => ({
              text: `[${decision.type}] ${decision.supportMessage ?? `Рішення #${decision.id.slice(0, 8)}`}`,
              style: 'body',
            }))
          : [{ text: 'Рішень для звіту поки немає.', style: 'bodyMuted' }],
      },
    ],
    pageBreakBefore: () => false,
    styles: {
      title: { fontSize: 22, bold: true, color: '#101828' },
      meta: { fontSize: 10.5, color: '#667085' },
      sectionTitle: { fontSize: 13, bold: true, color: '#111827' },
      metricBox: { fillColor: '#F8FAFC' },
      metricValue: { fontSize: 18, bold: true, color: '#101828' },
      metricLabel: { margin: [0, 4, 0, 0], fontSize: 10, color: '#667085' },
      body: { fontSize: 10.5, color: '#344054', lineHeight: 1.35 },
      bodyStrong: { fontSize: 10.5, bold: true, color: '#101828' },
      bodyMuted: { fontSize: 10.5, color: '#667085' },
    },
    defaultStyle: {
      fontSize: 10.5,
      color: '#344054',
    },
  }

  return getPdfAsBlob(docDefinition)
}
