// frontend/src/features/products/services/products.api.ts
import {  Product} from '@/features/products/types/product.types';
import { api } from '../../../services/api';
import { Lesson, Module, Quiz, Task } from '@/features/products/types/product.education';
// import type { Product, Module, Lesson, Quiz, Task, Block } from '../types/products.types';

export const productsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Products
    getProducts: builder.query<Product[], { funnelId?: string }>({
      query: ({ funnelId }) => ({ url: '/products', params: { funnelId } }),
      providesTags: ['Product'],
    }),
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<Product, Partial<Product>>({
      query: (data) => ({ url: '/products', method: 'POST', body: data }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<Product, { id: string; data: Partial<Product> }>({
      query: ({ id, data }) => ({ url: `/products/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }, 'Product'],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),

    // Public / User products
    getUserProducts: builder.query<Product[], void>({
      query: () => ({ url: '/products/public' }),
      providesTags: ['Product'],
    }),
    getMyProducts: builder.query<Product[], void>({
      query: () => ({ url: '/products/my' }),
      providesTags: ['Product'],
    }),

    // Modules
    createModule: builder.mutation<Module, { productId: string; data: Partial<Module> }>({
      query: ({ productId, data }) => ({ url: `/products/${productId}/modules`, method: 'POST', body: data }),
      invalidatesTags: ['Module', 'Product'],
    }),
    updateModule: builder.mutation<Module, { id: string; data: Partial<Module> }>({
      query: ({ id, data }) => ({ url: `/modules/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Module', 'Product'],
    }),
    deleteModule: builder.mutation<void, string>({
      query: (id) => ({ url: `/modules/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Module', 'Product'],
    }),

    // Lessons
    createLesson: builder.mutation<Lesson, { moduleId: string; data: Partial<Lesson> }>({
      query: ({ moduleId, data }) => ({ url: `/modules/${moduleId}/lessons`, method: 'POST', body: data }),
      invalidatesTags: ['Lesson', 'Module'],
    }),
    updateLesson: builder.mutation<Lesson, { id: string; data: Partial<Lesson> }>({
      query: ({ id, data }) => ({ url: `/lessons/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Lesson', 'Module'],
    }),
    deleteLesson: builder.mutation<void, string>({
      query: (id) => ({ url: `/lessons/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Lesson', 'Module'],
    }),

    // Quizzes
    createQuiz: builder.mutation<Quiz, { lessonId: string; data: Partial<Quiz> }>({
      query: ({ lessonId, data }) => ({ url: `/lessons/${lessonId}/quizzes`, method: 'POST', body: data }),
      invalidatesTags: ['Quiz'],
    }),
    submitQuiz: builder.mutation<{ score: number; passed: boolean }, { quizId: string; answers: any }>({
      query: ({ quizId, answers }) => ({ url: `/quizzes/${quizId}/submit`, method: 'POST', body: { answers } }),
      invalidatesTags: ['Quiz', 'LessonProgress', 'Points', 'Achievement'],
    }),

    // Tasks
    createTask: builder.mutation<Task, { lessonId: string; data: Partial<Task> }>({
      query: ({ lessonId, data }) => ({ url: `/lessons/${lessonId}/tasks`, method: 'POST', body: data }),
      invalidatesTags: ['Task'],
    }),
    submitTask: builder.mutation<void, { taskId: string; submission: any }>({
      query: ({ taskId, submission }) => ({ url: `/tasks/${taskId}/submit`, method: 'POST', body: { submission } }),
      invalidatesTags: ['Task', 'LessonProgress'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useDeleteModuleMutation,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useCreateQuizMutation,
  useSubmitQuizMutation,
  useCreateTaskMutation,
  useSubmitTaskMutation,
  useGetUserProductsQuery,
  useGetMyProductsQuery,
} = productsApi;
