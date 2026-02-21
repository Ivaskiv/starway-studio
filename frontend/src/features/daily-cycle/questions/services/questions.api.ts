// frontend/src/features/questions/services/questions.api.ts

// Для отримання питань + сабміту відповідей → отримання Decision
// Вхід (query): userId + context + contextId
// Вихід (query): Question[]
// Вхід (mutation): userId + answers[]
// Вихід (mutation): Decision[] (support / upsell / task)
// DB: questions, answers, decisions, decision_products

import api from '@/services/api';
import { Decision, Question } from '../types/questions.types';

export const questionsApi = api.injectEndpoints({
  endpoints: builder => ({
    // ===== GET QUESTIONS =====
    getQuestions: builder.query<
      Question[],
      {
        userId: string;
        context: string;
        contextId?: string;
      }
    >({
      query: params => ({
        url: '/questions',
        params,
      }),
      providesTags: ['Questions'],
    }),

    // ===== SUBMIT ANSWERS =====
    submitAnswers: builder.mutation<
      { decisions: Decision[] }, // повертаємо об’єкт
      {
        userId: string;
        context: string;
        contextId?: string;
        answers: { questionId: string; value: string | number | boolean }[];
      }
    >({
      query: body => ({
        url: '/answers/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Questions'],
    }),
  }),
});

export const { useGetQuestionsQuery, useSubmitAnswersMutation } = questionsApi;
