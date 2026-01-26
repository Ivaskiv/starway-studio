// frontend/src/features/modules/modules.api.ts
import { Module } from "@/features/modules/module.types";
import { api } from "@/services";

export const modulesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getModules: builder.query<Module[], void>({
      query: () => '/modules',
      providesTags: ['Module'],
    }),

    toggleModule: builder.mutation<
      Module,
      { moduleId: string; isLocked: boolean }
    >({
      query: ({ moduleId, isLocked }) => ({
        url: `/modules/${moduleId}`,
        method: 'PATCH',
        body: { isLocked },
      }),
      invalidatesTags: ['Module'],
    }),
  }),
})

export const {
  useGetModulesQuery,
  useToggleModuleMutation,
} = modulesApi
