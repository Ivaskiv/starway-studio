// frontend/src/features/wheel/hooks/useWheelAssessment.ts
import { sendTelegramMessage } from '@/features/social/services/telegram.service';
import {
  useCreateWheelAssessmentMutation,
  useGetLatestWheelAssessmentQuery,
} from '@/features/wheel/api';
import { useCallback } from 'react';
import type { WheelAssessment, WheelScore } from '../types/wheel.types';

interface UseWheelAssessmentOptions {
  userId: string;
  telegramChatId?: string;
}

export const useWheelAssessment = ({ userId, telegramChatId }: UseWheelAssessmentOptions) => {
  const {
    data: assessment,
    isLoading,
    isError,
    refetch,
  } = useGetLatestWheelAssessmentQuery(userId, {
    skip: !userId,
  });

  const [createAssessment, { isLoading: isCreating }] = useCreateWheelAssessmentMutation();

  const submitAssessment = useCallback(
    async (scores: WheelScore[]) => {
      const created: WheelAssessment = await createAssessment({
        userId,
        scores,
      }).unwrap();

      if (telegramChatId) {
        await sendTelegramMessage({
          chatId: telegramChatId,
          text: `🌀 *Колесо балансу оновлено*\nСередній бал: *${created.averageScore.toFixed(
            1,
          )}/10*`,
          parseMode: 'MarkdownV2',
          meta: {
            source: 'wheel',
            entityId: created.id,
          },
        });
      }

      return created;
    },
    [createAssessment, userId, telegramChatId],
  );

  return {
    assessment,
    isLoading,
    isError,
    refetch,
    submitAssessment,
    isCreating,
  };
};
