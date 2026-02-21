import { AiAnalysisResult } from '@/features/ai-engine/decisions/types/decisions.types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePDFReport = (userId: string, data: AiAnalysisResult) => {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(`Звіт користувача ${userId}`, 10, 10);

  if (data.microTasks?.length) {
    data.microTasks.forEach((task, i) => {
      doc.text(`${i + 1}. ${task.title}: ${task.description}`, 10, 20 + i * 10);
    });
  }

  if (data.stats) {
    doc.text('Статистика:', 10, 20 + (data.microTasks?.length ?? 0) * 10 + 10);
    Object.entries(data.stats).forEach(([k, v], i) => {
      doc.text(`${k}: ${v}`, 10, 30 + (data.microTasks?.length ?? 0 + i) * 10);
    });
  }

  return doc;
};
