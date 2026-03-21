// frontend/src/features/reportsPdf/services/createMentorReportPdf.ts
// Генерує PDF звіту AI-ментора (БЕЗ КЛАСІВ, БЕЗ THIS)

import { AnswerInput, Decision } from '@/features/daily-cycle/questions/types/questions.types';
import { loadPdfFromUrl, savePdfAsBlob } from './pdfClient';

/**
 * 🎨 Генерація PDF звіту AI-ментора
 *
 * АСОЦІАЦІЯ: Як заповнити бланк у банку
 * - Береш порожній бланк (шаблон)
 * - Заповнюєш свої дані (answers, decisions)
 * - Віддаєш готовий документ
 *
 * КРОК 1: Завантажуємо шаблон PDF
 * КРОК 2: Додаємо текст на сторінки
 * КРОК 3: Зберігаємо як Blob
 */

interface MentorReportInput {
  userId: string;
  answers: AnswerInput[];
  decisions: Decision[];
  metrics: {
    stability: number; // 0-10
    drains: number; // 0-10
    consistency: number; // 0-10
  };
  wheelData?: Array<{
    area: string;
    score: number;
  }>;
}

export const createMentorReportPdf = async (input: MentorReportInput): Promise<Blob> => {
  const { userId, answers, decisions, metrics, wheelData } = input;

  // 1️⃣ Завантажуємо шаблон PDF
  const doc = await loadPdfFromUrl('/pdfs/mentor-report-template.pdf');

  // Отримуємо сторінки
  const pages = doc.getPages();
  const coverPage = pages[0]; // Обкладинка
  const contentPage = pages[1]; // Контент

  // 2️⃣ COVER PAGE (сторінка 1)
  let y = 700;

  coverPage.drawText('AI-МЕНТОР', {
    x: 50,
    y,
    size: 32,
  });

  y -= 50;

  coverPage.drawText(`Користувач: ${userId}`, {
    x: 50,
    y,
    size: 14,
  });

  y -= 30;

  coverPage.drawText(`Дата: ${new Date().toLocaleDateString('uk-UA')}`, {
    x: 50,
    y,
    size: 12,
  });

  // 3️⃣ CONTENT PAGE (сторінка 2)
  y = 750;

  /* ═══════════════════════════════════════════════════════════
     БЛОК: МЕТРИКИ
  ═══════════════════════════════════════════════════════════ */
  contentPage.drawText('📊 МЕТРИКИ', {
    x: 50,
    y,
    size: 18,
  });

  y -= 30;

  contentPage.drawText(`Стабільність: ${metrics.stability}/10`, {
    x: 60,
    y,
    size: 12,
  });

  y -= 20;

  contentPage.drawText(`Злив енергії: ${metrics.drains}/10`, {
    x: 60,
    y,
    size: 12,
  });

  y -= 20;

  contentPage.drawText(`Послідовність: ${metrics.consistency}/10`, {
    x: 60,
    y,
    size: 12,
  });

  /* ═══════════════════════════════════════════════════════════
     БЛОК: КОЛЕСО БАЛАНСУ
  ═══════════════════════════════════════════════════════════ */
  if (wheelData && wheelData.length > 0) {
    y -= 40;

    contentPage.drawText('🎯 КОЛЕСО БАЛАНСУ', {
      x: 50,
      y,
      size: 18,
    });

    y -= 30;

    wheelData.forEach(item => {
      contentPage.drawText(`• ${item.area}: ${item.score}/10`, {
        x: 60,
        y,
        size: 11,
      });
      y -= 18;
    });
  }

  /* ═══════════════════════════════════════════════════════════
     БЛОК: ВІДПОВІДІ
  ═══════════════════════════════════════════════════════════ */
  y -= 30;

  contentPage.drawText('📝 ТВОЇ ВІДПОВІДІ', {
    x: 50,
    y,
    size: 18,
  });

  y -= 30;

  answers.forEach(answer => {
    const text = `• ${answer.questionId}: ${String(answer.value)}`;
    contentPage.drawText(text, {
      x: 60,
      y,
      size: 11,
    });
    y -= 18;

    // Якщо виходить за межі — додати нову сторінку
    if (y < 100) {
      doc.addPage();
      y = 750;
    }
  });

  /* ═══════════════════════════════════════════════════════════
     БЛОК: РІШЕННЯ СИСТЕМИ
  ═══════════════════════════════════════════════════════════ */
  y -= 30;

  contentPage.drawText('⚡ РІШЕННЯ СИСТЕМИ', {
    x: 50,
    y,
    size: 18,
  });

  y -= 30;

  decisions.forEach(decision => {
    const text = `→ [${decision.type.toUpperCase()}] ${
      decision.supportMessage ?? `Рішення #${decision.id.slice(0, 8)}`
    }`;

    contentPage.drawText(text, {
      x: 60,
      y,
      size: 11,
    });
    y -= 20;
  });

  // 4️⃣ Зберігаємо як Blob
  const blob = await savePdfAsBlob(doc);

  return blob;
};
