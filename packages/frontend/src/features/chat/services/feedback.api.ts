// packages/frontend/src/features/chat/services/feedback.api.ts
import { api } from '../../../services/api';

export interface Review {
  id: string;
  productId?: string;
  funnelId?: string;
  userId: string;
  userName: string;
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
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  comment: string;
  isAuthor: boolean;
  createdAt: string;
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
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: number;
  liked: boolean;
  replies?: Comment[];
  isPinned: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Testimonial {
  id: string;
  userId: string;
  userName: string;
  userTitle?: string;
  userAvatar?: string;
  content: string;
  rating: number;
  isFeatured: boolean;
  isApproved: boolean;
  productId?: string;
  createdAt: string;
}

export const feedbackApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Reviews
    getReviews: builder.query<Review[], { productId?: string; funnelId?: string; rating?: number }>({
      query: ({ productId, funnelId, rating }) => ({
        url: '/feedback/reviews',
        params: { productId, funnelId, rating },
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
    getRating: builder.query<Rating, { productId?: string; funnelId?: string }>({
      query: ({ productId, funnelId }) => ({
        url: '/feedback/ratings',
        params: { productId, funnelId },
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
    getTestimonials: builder.query<Testimonial[], { featured?: boolean; productId?: string }>({
      query: ({ featured, productId }) => ({
        url: '/feedback/testimonials',
        params: { featured, productId },
      }),
      providesTags: ['Review'],
    }),

    createTestimonial: builder.mutation<Testimonial, { content: string; rating: number; productId?: string }>({
      query: ({ content, rating, productId }) => ({
        url: '/feedback/testimonials',
        method: 'POST',
        body: { content, rating, productId },
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