// /features/questionsScheduler/services/questions.api.ts
import api from '@/services/api';
import { Question, Answer, MicroTask } from '../types/questions.types';

export const questionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getQuestions: builder.query<Question[], string>({ // userId
      query: (userId) => ({ url: `/questions?userId=${userId}`, method: 'GET' }),
      providesTags: ['Questions'],
    }),
    answerQuestion: builder.mutation<Answer, { questionId: string; userId: string; answer: string }>({
      query: (body) => ({ url: '/answers', method: 'POST', body }),
      invalidatesTags: ['Answers'],
    }),
    createMicroTask: builder.mutation<MicroTask, Partial<MicroTask>>({
      query: (body) => ({ url: '/microTasks', method: 'POST', body }),
      invalidatesTags: ['MicroTasks'],
    }),
    createQuestion: builder.mutation<Question, Partial<Question>>({
      query: (body) => ({ url: '/questions', method: 'POST', body }),
      invalidatesTags: ['Questions'],
    }),
    getAdminProducts: builder.query<any[], string>({ // userId
      query: (userId) => ({ url: `/admin/products?userId=${userId}`, method: 'GET' }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetQuestionsQuery,
  useAnswerQuestionMutation,
  useCreateMicroTaskMutation,
  useCreateQuestionMutation,  
  useGetAdminProductsQuery,
} = questionsApi;
