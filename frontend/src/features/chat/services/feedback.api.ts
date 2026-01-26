// frontend/src/features/chat/services/feedback.api.ts
import { api } from '../../../services/api';

export interface Review {
  id: string;
  product_id?: string;
  funnelId?: string;
  user_id: string;
  user_name: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  isVerified: boolean;
  helpful: number;
  notHelpful: number;
  replies?: ReviewReply[];
  created_at: string;
  updated_at?: string;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  user_id: string;
  user_name: string;
  userAvatar?: string;
  comment: string;
  isAuthor: boolean;
  created_at: string;
}

export interface Rating {
  overall: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  averageByCategory?: {
    content: number;
    support: number;
    value: number;
    easeOfUse: number;
  };
}

export interface Comment {
  id: string;
  lessonId?: string;
  postId?: string;
  user_id: string;
  user_name: string;
  userAvatar?: string;
  content: string;
  likes: number;
  liked: boolean;
  replies?: Comment[];
  isPinned: boolean;
  isEdited: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Testimonial {
  id: string;
  user_id: string;
  user_name: string;
  userTitle?: string;
  userAvatar?: string;
  content: string;
  rating: number;
  isFeatured: boolean;
  isApproved: boolean;
  product_id?: string;
  created_at: string;
}

export const feedbackApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Reviews
    getReviews: builder.query<Review[], { product_id?: string; funnelId?: string; rating?: number }>({
      query: ({ product_id, funnelId, rating }) => ({
        url: '/feedback/reviews',
        params: { product_id, funnelId, rating },
      }),
      providesTags: ['Review'],
    }),

    createReview: builder.mutation<Review, { entityId: string; entityType: 'product' | 'funnel'; rating: number; comment: string; title?: string }>({
      query: ({ entityId, entityType, rating, comment, title }) => ({
        url: '/feedback/reviews',
        method: 'POST',
        body: { entityId, entityType, rating, comment, title },
      }),
      invalidatesTags: ['Review', 'Rating'],
    }),

    updateReview: builder.mutation<Review, { id: string; data: Partial<Review> }>({
      query: ({ id, data }) => ({
        url: `/feedback/reviews/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Review'],
    }),

    deleteReview: builder.mutation<void, string>({
      query: (id) => ({
        url: `/feedback/reviews/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Review', 'Rating'],
    }),

    markReviewHelpful: builder.mutation<void, { id: string; helpful: boolean }>({
      query: ({ id, helpful }) => ({
        url: `/feedback/reviews/${id}/helpful`,
        method: 'POST',
        body: { helpful },
      }),
      invalidatesTags: ['Review'],
    }),

    replyToReview: builder.mutation<ReviewReply, { reviewId: string; comment: string }>({
      query: ({ reviewId, comment }) => ({
        url: `/feedback/reviews/${reviewId}/reply`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: ['Review'],
    }),

    // Ratings
    getRating: builder.query<Rating, { product_id?: string; funnelId?: string }>({
      query: ({ product_id, funnelId }) => ({
        url: '/feedback/ratings',
        params: { product_id, funnelId },
      }),
      providesTags: ['Rating'],
    }),

    // Comments
    getComments: builder.query<Comment[], { lessonId?: string; postId?: string }>({
      query: ({ lessonId, postId }) => ({
        url: '/feedback/comments',
        params: { lessonId, postId },
      }),
      providesTags: ['Comment'],
    }),

    createComment: builder.mutation<Comment, { entityId: string; entityType: 'lesson' | 'post'; content: string; parentId?: string }>({
      query: ({ entityId, entityType, content, parentId }) => ({
        url: '/feedback/comments',
        method: 'POST',
        body: { entityId, entityType, content, parentId },
      }),
      invalidatesTags: ['Comment'],
    }),

    updateComment: builder.mutation<Comment, { id: string; content: string }>({
      query: ({ id, content }) => ({
        url: `/feedback/comments/${id}`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: ['Comment'],
    }),

    deleteComment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/feedback/comments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Comment'],
    }),

    likeComment: builder.mutation<void, { id: string; liked: boolean }>({
      query: ({ id, liked }) => ({
        url: `/feedback/comments/${id}/like`,
        method: 'POST',
        body: { liked },
      }),
      invalidatesTags: ['Comment'],
    }),

    pinComment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/feedback/comments/${id}/pin`,
        method: 'POST',
      }),
      invalidatesTags: ['Comment'],
    }),

    // Testimonials
    getTestimonials: builder.query<Testimonial[], { featured?: boolean; product_id?: string }>({
      query: ({ featured, product_id }) => ({
        url: '/feedback/testimonials',
        params: { featured, product_id },
      }),
      providesTags: ['Review'],
    }),

    createTestimonial: builder.mutation<Testimonial, { content: string; rating: number; product_id?: string }>({
      query: ({ content, rating, product_id }) => ({
        url: '/feedback/testimonials',
        method: 'POST',
        body: { content, rating, product_id },
      }),
      invalidatesTags: ['Review'],
    }),

    approveTestimonial: builder.mutation<void, string>({
      query: (id) => ({
        url: `/feedback/testimonials/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Review'],
    }),

    featureTestimonial: builder.mutation<void, { id: string; featured: boolean }>({
      query: ({ id, featured }) => ({
        url: `/feedback/testimonials/${id}/feature`,
        method: 'POST',
        body: { featured },
      }),
      invalidatesTags: ['Review'],
    }),
  }),
});

export const {
  useGetReviewsQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  useMarkReviewHelpfulMutation,
  useReplyToReviewMutation,
  useGetRatingQuery,
  useGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useLikeCommentMutation,
  usePinCommentMutation,
  useGetTestimonialsQuery,
  useCreateTestimonialMutation,
  useApproveTestimonialMutation,
  useFeatureTestimonialMutation,
} = feedbackApi;