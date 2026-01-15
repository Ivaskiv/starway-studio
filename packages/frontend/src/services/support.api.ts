// packages/frontend/src/services/support.api.ts
import { api } from './api';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'general' | 'bug' | 'feature';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  assignedTo?: string;
  messages: SupportMessage[];
  attachments?: {
    name: string;
    url: string;
    size: number;
  }[];
  created_at: string;
  updated_at?: string;
  resolvedAt?: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  user_id: string;
  user_name: string;
  isStaff: boolean;
  content: string;
  attachments?: {
    name: string;
    url: string;
  }[];
  created_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  views: number;
  helpful: number;
  notHelpful: number;
  order: number;
  isPublished: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FAQCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
  faqCount: number;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  tags?: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  views: number;
  helpful: number;
  relatedArticles?: string[];
  isPublished: boolean;
  created_at: string;
  updated_at?: string;
}

export const supportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Support Tickets
    getTickets: builder.query<SupportTicket[], { status?: string; category?: string }>({
      query: ({ status, category }) => ({
        url: '/support/tickets',
        params: { status, category },
      }),
      providesTags: ['Support'],
    }),

    getTicketById: builder.query<SupportTicket, string>({
      query: (id) => `/support/tickets/${id}`,
      providesTags: (result, error, id) => [{ type: 'Support', id }],
    }),

    createTicket: builder.mutation<SupportTicket, { subject: string; description: string; category: string; priority?: string }>({
      query: ({ subject, description, category, priority = 'medium' }) => ({
        url: '/support/tickets',
        method: 'POST',
        body: { subject, description, category, priority },
      }),
      invalidatesTags: ['Support'],
    }),

    updateTicket: builder.mutation<SupportTicket, { id: string; data: Partial<SupportTicket> }>({
      query: ({ id, data }) => ({
        url: `/support/tickets/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Support', id }, 'Support'],
    }),

    closeTicket: builder.mutation<void, string>({
      query: (id) => ({
        url: `/support/tickets/${id}/close`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Support', id }],
    }),

    reopenTicket: builder.mutation<void, string>({
      query: (id) => ({
        url: `/support/tickets/${id}/reopen`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Support', id }],
    }),

    addTicketMessage: builder.mutation<SupportMessage, { ticketId: string; content: string; attachments?: File[] }>({
      query: ({ ticketId, content, attachments }) => {
        const formData = new FormData();
        formData.append('content', content);
        if (attachments) {
          attachments.forEach((file) => formData.append('attachments', file));
        }
        return {
          url: `/support/tickets/${ticketId}/messages`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { ticketId }) => [{ type: 'Support', id: ticketId }],
    }),

    // FAQ
    getFAQCategories: builder.query<FAQCategory[], void>({
      query: () => '/support/faq/categories',
      providesTags: ['FAQ'],
    }),

    getFAQs: builder.query<FAQ[], { category?: string; search?: string }>({
      query: ({ category, search }) => ({
        url: '/support/faq',
        params: { category, search },
      }),
      providesTags: ['FAQ'],
    }),

    getFAQById: builder.query<FAQ, string>({
      query: (id) => `/support/faq/${id}`,
      providesTags: (result, error, id) => [{ type: 'FAQ', id }],
    }),

    markFAQHelpful: builder.mutation<void, { id: string; helpful: boolean }>({
      query: ({ id, helpful }) => ({
        url: `/support/faq/${id}/helpful`,
        method: 'POST',
        body: { helpful },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'FAQ', id }],
    }),

    // Knowledge Base
    getKnowledgeBaseArticles: builder.query<KnowledgeBaseArticle[], { category?: string; search?: string }>({
      query: ({ category, search }) => ({
        url: '/support/knowledge-base',
        params: { category, search },
      }),
      providesTags: ['Support'],
    }),

    getArticleById: builder.query<KnowledgeBaseArticle, string>({
      query: (id) => `/support/knowledge-base/${id}`,
      providesTags: (result, error, id) => [{ type: 'Support', id }],
    }),

    searchSupport: builder.query<{
      tickets: SupportTicket[];
      faqs: FAQ[];
      articles: KnowledgeBaseArticle[];
    }, string>({
      query: (query) => ({
        url: '/support/search',
        params: { q: query },
      }),
    }),

    // Contact Support
    contactSupport: builder.mutation<{ success: boolean; message: string }, { name: string; email: string; subject: string; message: string }>({
      query: (data) => ({
        url: '/support/contact',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useGetTicketByIdQuery,
  useCreateTicketMutation,
  useUpdateTicketMutation,
  useCloseTicketMutation,
  useReopenTicketMutation,
  useAddTicketMessageMutation,
  useGetFAQCategoriesQuery,
  useGetFAQsQuery,
  useGetFAQByIdQuery,
  useMarkFAQHelpfulMutation,
  useGetKnowledgeBaseArticlesQuery,
  useGetArticleByIdQuery,
  useSearchSupportQuery,
  useContactSupportMutation,
} = supportApi;