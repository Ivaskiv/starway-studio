import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { getPdfAsBlob } from '@/features/reportsPdf/services/pdfClient';
import { UserAnswer } from '@/features/daily-cycle/questions/types/questions.types';

export const generatePDFReport = async (userId: string, answers: UserAnswer[]): Promise<Blob> => {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    content: [
      { text: `Звіт користувача ${userId}`, style: 'reportHeader' },
      { text: 'Відповіді на запитання', margin: [0, 16, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 'auto'],
          body: [
            [
              { text: 'Питання', bold: true },
              { text: 'Відповідь', bold: true },
              { text: 'Дата', bold: true },
            ],
            ...answers.map(answer => [
              { text: answer.questionText, style: 'bodyText' },
              { text: String(answer.value), style: 'bodyText' },
              { text: new Date(answer.answeredAt).toLocaleString(), style: 'bodyText' },
            ]),
          ],
        },
      },
    ],
    styles: {
      reportHeader: { fontSize: 18, bold: true, color: 'var(--accent)', margin: [0, 0, 0, 12] },
      bodyText: { fontSize: 11, color: '#1A1A2E' },
    },
  };

  return getPdfAsBlob(docDefinition);
};
