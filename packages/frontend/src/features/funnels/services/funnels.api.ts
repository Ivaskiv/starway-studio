// packages/frontend/src/services/funnels.api.ts   (або де в тебе цей файл зараз)

import { Funnel } from '@/features/funnels/types/funnel.types'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const funnelsApi = createApi({
  reducerPath: 'funnelsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: headers => {
      const token = localStorage.getItem('starway_auth_token')
      if (token) headers.set('authorization', `Bearer ${token}`)
      return headers
    }
  }),
  tagTypes: ['Funnel'],
  endpoints: builder => ({
    // === CRUD воронок ===
    getFunnels: builder.query<Funnel[], void>({
      query: () => '/funnels',
      providesTags: ['Funnel']
    }),

    getFunnelById: builder.query<Funnel, string>({
      query: id => `/funnels/${id}`,
      providesTags: (_, __, id) => [{ type: 'Funnel', id }]
    }),

    createFunnel: builder.mutation<Funnel, Partial<Funnel>>({
      query: body => ({
        url: '/funnels',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Funnel']
    }),

    updateFunnel: builder.mutation<Funnel, Partial<Funnel> & { id: string }>({
      query: ({ id, ...body }) => ({
        url: `/funnels/${id}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: (_, __, arg) => [{ type: 'Funnel', id: arg.id }]
    }),

    deleteFunnel: builder.mutation<void, string>({
      query: id => ({
        url: `/funnels/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Funnel']
    }),

    // === НОВА МУТАЦІЯ: генерація варіантів кроку воронки ===
    generateFunnelVariants: builder.mutation<
      { variants: string[] },
      { stepNumber: number; userInput: string; context?: Record<string, string> }
    >({
      query: body => ({
        url: '/funnels/generate-variants',
        method: 'POST',
        body
      }),
      // Не інвалідуємо Funnel, бо це тимчасова генерація
    }),
  })
})

// Експортуємо ВСІ хуки
export const {
  useGetFunnelsQuery,
  useGetFunnelByIdQuery,
  useCreateFunnelMutation,
  useUpdateFunnelMutation,
  useDeleteFunnelMutation,
  useGenerateFunnelVariantsMutation, 
} = funnelsApi