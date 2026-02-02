//
import { Question, UserAnswer } from '../types//questions.types';

export const generatePDFReport = async (userId: string, answers: UserAnswer[]) => {
  // Псевдо-генерація PDF
  const content = answers.map(a => `Питання: ${a.questionId}\nВідповідь: ${a.answer}\n`).join('\n');
  const blob = new Blob([content], { type: 'application/pdf' });
  return blob;
};
