// frontend/src/features/chat/services/chat.api.ts
import { ChatMessage } from '@/shared/types/modules.types';
import { api } from '../../../services/api';

export const chatApi = api.injectEndpoints({
  endpoints: builder => ({
    getMessages: builder.query<ChatMessage[], { userId: string }>({
      query: ({ userId }) => `/chat/${userId}`,
      providesTags: result =>
        result
          ? [
              ...result.map(msg => ({ type: 'Chat' as const, id: msg.id })),
              { type: 'Chat' as const, id: 'LIST' },
            ]
          : [{ type: 'Chat' as const, id: 'LIST' }],
      async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
        const ws = new WebSocket(`${wsUrl}/chat/${arg.userId}`);

        ws.onmessage = event => {
          try {
            const message: ChatMessage = JSON.parse(event.data);
            updateCachedData(draft => {
              draft.push(message);
            });
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = error => {
          console.error('WebSocket error:', error);
        };

        try {
          await cacheDataLoaded;
        } catch (error) {
          console.error('Cache load error:', error);
        }

        await cacheEntryRemoved;
        ws.close();
      },
    }),

    sendMessage: builder.mutation<void, { userId: string; text: string }>({
      query: ({ userId, text }) => ({
        url: `/chat/${userId}/send`,
        method: 'POST',
        body: { text },
      }),
      invalidatesTags: [{ type: 'Chat' as const, id: 'LIST' }],
    }),
  }),
});

export const { useGetMessagesQuery, useSendMessageMutation } = chatApi;
