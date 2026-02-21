// frontend/src/features/questions/hooks/useQuestions.ts

import { useCallback } from 'react';
import {
  AnswerInput,
  Decision,
  UseQuestionsOptions,
  normalizeDecisions,
} from '../types/questions.types';
import {
  useGetQuestionsQuery,
  useSubmitAnswersMutation,
} from '../services/questions.api';
import { runDecisionEngine } from '@/features/aiDecisionEngine/engine/decisionEngine';
import { sendTelegramMessage } from '@/services/telegram.service';

/**
 * 📤 Головний хук для роботи з питаннями → відповідями → рішеннями
 */
export const useQuestions = ({
  userId,
  context,
  contextId,
  telegramChatId,
}: UseQuestionsOptions) => {
  // 1. Отримуємо список питань
  const { data: questions = [], isLoading, refetch } = useGetQuestionsQuery(
    { userId, context, contextId },
    { skip: !userId }
  );

  // 2. Мутація для відправки відповідей
  const [submitAnswersMutation, { isLoading: isSubmitting }] = useSubmitAnswersMutation();

  /**
   * 📤 Відправка відповідей → обробка на сервері → рішення
   */
  const submitAnswers = useCallback(
    async (answers: AnswerInput[]): Promise<Decision[]> => {
      // 1. Валідація
      if (!answers?.length) {
        throw new Error('Немає відповідей для обробки');
      }

      try {
        // 2. Формуємо мінімальний payload
        const payload = {
          userId,
          context,
          contextId,
          answers,
        };

        // 3. Відправляємо запит і отримуємо масив рішень
        const rawDecisions = await submitAnswersMutation(payload).unwrap();

        // 4. Нормалізуємо масив рішень
        const normalizedDecisions = normalizeDecisions(rawDecisions);

        // 5. Пропускаємо через Decision Engine
        const filteredDecisions = runDecisionEngine(normalizedDecisions);

        // 6. Відправка підтримки в Telegram
        if (telegramChatId) {
          filteredDecisions.forEach(decision => {
            if (decision.supportMessage) {
              sendTelegramMessage({
                chatId: telegramChatId,
                text: `*${decision.supportMessage}*`,
                parseMode: 'MarkdownV2',
                meta: { source: context, entityId: decision.id },
              });
            }
          });
        }

        // 7. Повертаємо готовий результат
        return filteredDecisions;
      } catch (error: any) {
        console.error('Помилка обробки відповідей:', error);

        if (telegramChatId) {
          sendTelegramMessage({
            chatId: telegramChatId,
            text: '⚠️ Щось пішло не так при обробці відповідей. Спробуй ще раз.',
            parseMode: 'MarkdownV2',
          });
        }

        throw error;
      }
    },
    [userId, context, contextId, telegramChatId, submitAnswersMutation]
  );

  return {
    questions,
    isLoading,
    submitAnswers,
    isSubmitting,
    refetch,
  };
};