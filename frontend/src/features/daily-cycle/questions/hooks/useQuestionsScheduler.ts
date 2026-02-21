// frontend/src/features/questionsScheduler/hooks/useQuestionsScheduler.ts
// once / twice daily + Telegram

// Запуск питань для користувача 1–2 рази на день + відправка Telegram
// Вхід: userId, час (once / twice daily), context + contextId, telegramChatId
// Вихід: масив Questions, при сабміті → Decision

import { useQuestions } from '@/features/daily-cycle/questions/hooks/useQuestion';
import {
  AnswerInput,
  Decision,
  QuestionContext,
} from '@/features/daily-cycle/questions/types/questions.types';
import { sendTelegramMessage } from '@/services/telegram.service';
import { useEffect, useState } from 'react';

interface UseQuestionsSchedulerOptions {
  userId: string;
  context: QuestionContext;
  contextId?: string;
  telegramChatId?: string;
  schedule: 'once' | 'twice';
}

export const useQuestionsScheduler = ({
  userId,
  context,
  contextId,
  telegramChatId,
  schedule,
}: UseQuestionsSchedulerOptions) => {
  const { questions, isLoading, submitAnswers, isSubmitting, refetch } = useQuestions({
    userId,
    context,
    contextId,
    telegramChatId,
  });

  const [readyToAsk, setReadyToAsk] = useState(false);

  useEffect(() => {
    if (!questions.length) return;
    const hour = new Date().getHours();
    if (schedule === 'once' && hour === 9) setReadyToAsk(true);
    if (schedule === 'twice' && (hour === 9 || hour === 18)) setReadyToAsk(true);
  }, [questions, schedule]);

  useEffect(() => {
    if (!readyToAsk || !telegramChatId) return;
    questions.forEach(q => {
      sendTelegramMessage({
        chatId: telegramChatId,
        text: `📝 ${q.text}`,
        parseMode: 'MarkdownV2',
        meta: { source: 'questions', entityId: q.id },
      });
    });
  }, [readyToAsk, questions, telegramChatId]);

  const submit = async (answers: AnswerInput[]): Promise<Decision[]> => {
    return submitAnswers(answers);
  };

  return {
    questions,
    isLoading,
    readyToAsk,
    submit,
    isSubmitting,
    refetch,
  };
};
