// // frontend/src/features/products/services/products.api.ts
// import { Lesson, Module, Quiz, Task } from '@/features/modules/module.types'
// import { api } from '@/services/api'
// import { Product } from '../types/product.types'

// export const productsApi = api.injectEndpoints({
//   endpoints: (builder) => ({
//     // ===== PRODUCTS =====
//     getProducts: builder.query<Product[], { funnelId?: string }>({
//       query: (params) => ({ url: '/products', params }),
//       providesTags: ['Product'],
//     }),

//     getProductById: builder.query<Product, string>({
//       query: (id) => `/products/${id}`,
//       providesTags: (_, __, id) => [{ type: 'Product', id }],
//     }),

//     createProduct: builder.mutation<Product, Partial<Product>>({
//       query: (body) => ({ url: '/products', method: 'POST', body }),
//       invalidatesTags: ['Product'],
//     }),

//     updateProduct: builder.mutation<Product, { id: string; data: Partial<Product> }>({
//       query: ({ id, data }) => ({
//         url: `/products/${id}`,
//         method: 'PUT',
//         body: data,
//       }),
//       invalidatesTags: (_, __, { id }) => [{ type: 'Product', id }],
//     }),

//     deleteProduct: builder.mutation<void, string>({
//       query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
//       invalidatesTags: ['Product'],
//     }),

//     getMyProducts: builder.query<Product[], void>({
//       query: () => '/products/my',
//       providesTags: ['Product'],
//     }),

//     getPublicProducts: builder.query<Product[], void>({
//       query: () => '/products/public',
//       providesTags: ['Product'],
//     }),

//     // ===== MODULES =====
//     createModule: builder.mutation<Module, { product_id: string; data: Partial<Module> }>({
//       query: ({ product_id, data }) => ({
//         url: `/products/${product_id}/modules`,
//         method: 'POST',
//         body: data,
//       }),
//       invalidatesTags: ['Module', 'Product'],
//     }),

//     updateModule: builder.mutation<Module, { id: string; data: Partial<Module> }>({
//       query: ({ id, data }) => ({
//         url: `/modules/${id}`,
//         method: 'PUT',
//         body: data,
//       }),
//       invalidatesTags: ['Module', 'Product'],
//     }),

//     deleteModule: builder.mutation<void, string>({
//       query: (id) => ({ url: `/modules/${id}`, method: 'DELETE' }),
//       invalidatesTags: ['Module', 'Product'],
//     }),

//     // ===== LESSONS =====
//     createLesson: builder.mutation<Lesson, { moduleId: string; data: Partial<Lesson> }>({
//       query: ({ moduleId, data }) => ({
//         url: `/modules/${moduleId}/lessons`,
//         method: 'POST',
//         body: data,
//       }),
//       invalidatesTags: ['Lesson', 'Module'],
//     }),

//     updateLesson: builder.mutation<Lesson, { id: string; data: Partial<Lesson> }>({
//       query: ({ id, data }) => ({
//         url: `/lessons/${id}`,
//         method: 'PUT',
//         body: data,
//       }),
//       invalidatesTags: ['Lesson'],
//     }),

//     deleteLesson: builder.mutation<void, string>({
//       query: (id) => ({ url: `/lessons/${id}`, method: 'DELETE' }),
//       invalidatesTags: ['Lesson'],
//     }),

//     // ===== QUIZZES =====
//     createQuiz: builder.mutation<Quiz, { lessonId: string; data: Partial<Quiz> }>({
//       query: ({ lessonId, data }) => ({
//         url: `/lessons/${lessonId}/quizzes`,
//         method: 'POST',
//         body: data,
//       }),
//       invalidatesTags: ['Quiz'],
//     }),

//     submitQuiz: builder.mutation<
//       { score: number; passed: boolean },
//       { quizId: string; answers: unknown }
//     >({
//       query: ({ quizId, answers }) => ({
//         url: `/quizzes/${quizId}/submit`,
//         method: 'POST',
//         body: { answers },
//       }),
//       invalidatesTags: ['Quiz', 'LessonProgress'],
//     }),

//     // ===== TASKS =====
//     createTask: builder.mutation<Task, { lessonId: string; data: Partial<Task> }>({
//       query: ({ lessonId, data }) => ({
//         url: `/lessons/${lessonId}/tasks`,
//         method: 'POST',
//         body: data,
//       }),
//       invalidatesTags: ['Task'],
//     }),

//     submitTask: builder.mutation<void, { taskId: string; submission: unknown }>({
//       query: ({ taskId, submission }) => ({
//         url: `/tasks/${taskId}/submit`,
//         method: 'POST',
//         body: { submission },
//       }),
//       invalidatesTags: ['Task', 'LessonProgress'],
//     }),
//   }),
// })

// export const {
//   useGetProductsQuery,
//   useGetProductByIdQuery,
//   useCreateProductMutation,
//   useUpdateProductMutation,
//   useDeleteProductMutation,
//   useGetMyProductsQuery,
//   useGetPublicProductsQuery,

//   useCreateModuleMutation,
//   useUpdateModuleMutation,
//   useDeleteModuleMutation,

//   useCreateLessonMutation,
//   useUpdateLessonMutation,
//   useDeleteLessonMutation,

//   useCreateQuizMutation,
//   useSubmitQuizMutation,

//   useCreateTaskMutation,
//   useSubmitTaskMutation,
// } = productsApi
