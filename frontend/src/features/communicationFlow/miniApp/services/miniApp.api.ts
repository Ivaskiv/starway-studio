import { api } from '@/services';

export const miniAppApi = api.injectEndpoints({
  endpoints: (builder) => ({
    duplicateMiniAppItem: builder.mutation<any, { userId: string; payload: any; type: string }>({
      query: ({ payload, type, userId }) => ({
        url: `/miniApp/duplicate`,
        method: 'POST',
        body: { payload, type, userId },
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useDuplicateMiniAppItemMutation } = miniAppApi;
