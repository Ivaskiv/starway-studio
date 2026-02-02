import api from '@/services/api';
import { Message } from 'react-hook-form';

export const messagesApi = api.injectEndpoints({
  endpoints: builder => ({
    getConversations: builder.query<Conversations[], void>({
      query: () => '/messages/conversations',
      providesTags: ['Message'],
    }),

    getMessages: builder.query<Message[], { conversationId: string }>({
      query: ({ conversationId }) => `/messages/conversations/${conversationId}`,
      providesTags: (_, __, { conversationId }) => [{ type: 'Message', id: conversationId }],
    }),
  }),
});
