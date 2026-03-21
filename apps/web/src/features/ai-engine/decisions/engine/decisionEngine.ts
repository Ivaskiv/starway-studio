// frontend/src/features/aiDecisionEngine/engine/decisionEngine.ts

import { DecisionContext, DecisionResult, MicroTask } from '@/features/ai-engine/decisions/types/decisions.types';
import { useGetQuestionsQuery, useSubmitAnswersMutation } from '@/features/daily-cycle/questions';
import {
  AnswerInput,
  Decision,
  UseQuestionsOptions,
} from '@/features/daily-cycle/questions/types/questions.types';
import { createMentorReportPdf } from '@/features/reportsPdf/services/createMentorReportPdf';
import { sendTelegramMessage } from '@/features/social/services/telegram.service';
import { useCallback } from 'react';

/**
 * 🔄 Decision Engine — фільтрація конфліктів + сортування
 */
export const runDecisionEngine = (decisions: Decision[]): Decision[] => {
  const filtered = decisions.filter(d => {
    if (!d.conflictsWith || d.conflictsWith.length === 0) return true;

    return !d.conflictsWith.some(conflictId => {
      const conflictDecision = decisions.find(cd => cd.id === conflictId);
      return conflictDecision && conflictDecision.priority > d.priority;
    });
  });

  filtered.sort((a, b) => b.priority - a.priority);

  return filtered;
};

export const evaluateDecisionContext = (ctx: DecisionContext): DecisionResult => {
  const microTasks: MicroTask[] = [];

  if (ctx.metrics.consistency < 50) {
    microTasks.push({
      title: 'Маленький крок',
      description: 'Виконай просте завдання для регулярності',
      type: 'actionable',
      persist: true,
      source: ctx.source,
      reason: 'stagnation',
      status: 'PENDING',
    });
  }

  if (ctx.metrics.drains > 6) {
    microTasks.push({
      title: 'Відновлення енергії',
      description: 'Зроби 5 хвилинні вправи для зняття напруги',
      type: 'actionable',
      persist: true,
      source: ctx.source,
      reason: 'instability',
      status: 'PENDING',
    });
  }

  const supportMessage = `Стійкість ${ctx.metrics.stability}/10, регулярність ${ctx.metrics.consistency}/10`;

  return {
    supportMessage,
    microTasks: microTasks.length ? microTasks : undefined,
    recommendations: ctx.metrics.stability < 4 ? { enabled: true, reason: 'Потрібна додаткова підтримка' } : { enabled: false },
  };
};

export const useQuestions = (options: UseQuestionsOptions) => {
  const { userId, context, contextId, telegramChatId } = options;

  const { data: questions, isLoading } = useGetQuestionsQuery({
    userId,
    context,
    contextId,
  });

  const [submitAnswersMutation, { isLoading: isSubmitting }] = useSubmitAnswersMutation();

  const submitAnswersWithReport = useCallback(
    async (answers: AnswerInput[]): Promise<Decision[]> => {
      // 1️⃣ Відправка на сервер
      // ✅ ВИПРАВЛЕНО: додали явний тип для response
      const response = await submitAnswersMutation({
        userId,
        context,
        contextId,
        answers,
      }).unwrap();

      // response має тип SubmitAnswersResponse = { decisions: Decision[] }
      const decisions: Decision[] = response.decisions;

      // 2️⃣ Decision Engine
      const resolvedDecisions: Decision[] = runDecisionEngine(decisions);

      // 3️⃣ Перевірка чи потрібен PDF
      // ✅ ВИПРАВЛЕНО: використовуємо правильне порівняння
      const needsReport = resolvedDecisions.some(
        d => d.type === 'pdf' || d.generateReport === true,
      );

      if (needsReport) {
        // 🎨 Генеруємо PDF
        const pdfBlob = await createMentorReportPdf({
          userId,
          answers,
          decisions: resolvedDecisions,
          metrics: {
            stability: 7,
            drains: 3,
            consistency: 8,
          },
          wheelData: [
            { area: 'Гроші', score: 6 },
            { area: 'Реалізація', score: 4 },
            { area: 'Відносини', score: 8 },
            { area: 'Енергія', score: 7 },
            { area: 'Свобода', score: 5 },
            { area: 'Внутрішня опора', score: 6 },
          ],
        });

        // 📥 Скачування
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-mentor-report-${new Date().getTime()}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }

      // 4️⃣ Telegram
      if (telegramChatId) {
        resolvedDecisions.forEach(d => {
          if (d.supportMessage) {
            sendTelegramMessage({
              chatId: telegramChatId,
              text: `💡 ${d.supportMessage}`,
              parseMode: 'MarkdownV2',
              meta: { source: context, entityId: d.id },
            });
          }
        });
      }

      return resolvedDecisions;
    },
    [userId, context, contextId, telegramChatId, submitAnswersMutation],
  );

  return {
    questions,
    isLoading,
    submitAnswers: submitAnswersWithReport,
    isSubmitting,
  };
};
