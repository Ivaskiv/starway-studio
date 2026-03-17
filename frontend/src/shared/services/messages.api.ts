import api from '@/services/api';
import { Message } from 'react-hook-form';

export interface Conversation {
  id: string;
  title?: string;
  lastMessage?: string;
  participants: Array<{ id: string; name?: string }>;
  updatedAt: string;
}

export const messagesApi = api.injectEndpoints({
  endpoints: builder => ({
    getConversations: builder.query<Conversation[], void>({
      query: () => '/messages/conversations',
      providesTags: ['Message'],
    }),

    getMessages: builder.query<Message[], { conversationId: string }>({
      query: ({ conversationId }) => `/messages/conversations/${conversationId}`,
      providesTags: (_, __, { conversationId }) => [{ type: 'Message', id: conversationId }],
    }),
  }),
});
