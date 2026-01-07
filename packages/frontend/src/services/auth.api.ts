// packages/frontend/src/services/auth.api.ts
import { UserLevel } from '@/services/gamification.api';
import { api } from './api';

// ============ TYPES ============

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'funnel_admin' | 'user' | 'guest';
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  phone?: string;
  timezone?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  tokens: Tokens;
  message?: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'funnel_admin' | 'user';
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  funnelId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  permissions: string[];
  invitedBy: string;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  funnelId?: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface MeResponse {
  user: User & UserLevel & {
    id: string;
    firstName: string;
    lastName?: string;
    role: 'super_admin' | 'funnel_admin' | 'user';
  };
}
// ============ API ============

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
            /**
     * Отримання поточного користувача
     */
    // getMe: builder.query<{ user: User }, void>({
    //   query: () => '/auth/me',
    //   providesTags: ['User'],
    //   transformErrorResponse: (error: any) => {
    //     console.error('❌ [Auth] Get user error:', error);
    //     return error;
    //   },
    // }),

    getMe: builder.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    // ============ AUTHENTICATION ============
    /**
     * Реєстрація нового користувача
     */
    signUp: builder.mutation<AuthResponse, SignUpRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: AuthResponse) => {
        // Зберігаємо токен в localStorage
        localStorage.setItem('starway_auth_token', response.tokens.accessToken);
        console.log('✅ [Auth] User registered:', response.user.email);
        return response;
      },
      invalidatesTags: ['User'],
    }),

    /**
     * Вхід користувача
     */
    signIn: builder.mutation<AuthResponse, SignInRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: AuthResponse) => {
        // Зберігаємо токен в localStorage
        localStorage.setItem('starway_auth_token', response.tokens.accessToken);
        console.log('✅ [Auth] User logged in:', response.user.email);
        return response;
      },
      invalidatesTags: ['User'],
    }),

    /**
     * Вихід користувача
     */
    logOut: builder.mutation<void, void>({
      queryFn: () => {
        // Видаляємо токен з localStorage
        localStorage.removeItem('starway_auth_token');
        console.log('✅ [Auth] User logged out');
        return { data: undefined };
      },
      invalidatesTags: ['User', 'Funnel', 'Product', 'Analytics'],
    }),


    /**
     * Оновлення токена
     */
    refreshToken: builder.mutation<{ tokens: Tokens }, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      transformResponse: (response: { tokens: Tokens }) => {
        localStorage.setItem('starway_auth_token', response.tokens.accessToken);
        console.log('✅ [Auth] Token refreshed');
        return response;
      },
    }),

    // ============ PROFILE ============

    /**
     * Оновлення профілю користувача
     */
    updateProfile: builder.mutation<User, UpdateProfileRequest>({
      query: (data) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * Зміна пароля
     */
    changePassword: builder.mutation<{ success: boolean }, ChangePasswordRequest>({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: data,
      }),
    }),

    /**
     * Завантаження аватара
     */
    uploadAvatar: builder.mutation<{ url: string }, FormData>({
      query: (formData) => ({
        url: '/auth/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User', 'Avatar'],
    }),

    /**
     * Видалення аватара
     */
    deleteAvatar: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/avatar',
        method: 'DELETE',
      }),
      invalidatesTags: ['User', 'Avatar'],
    }),

    // ============ PASSWORD RESET ============

    /**
     * Запит на скидання пароля
     */
    requestPasswordReset: builder.mutation<{ success: boolean; message: string }, ResetPasswordRequest>({
      query: ({ email }) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),

    /**
     * Підтвердження скидання пароля
     */
    confirmPasswordReset: builder.mutation<{ success: boolean }, ConfirmResetPasswordRequest>({
      query: ({ token, newPassword }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: { token, newPassword },
      }),
    }),

    // ============ EMAIL VERIFICATION ============

    /**
     * Відправка email верифікації
     */
    sendVerificationEmail: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/send-verification',
        method: 'POST',
      }),
    }),

    /**
     * Підтвердження email
     */
    verifyEmail: builder.mutation<{ success: boolean }, { token: string }>({
      query: ({ token }) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body: { token },
      }),
      invalidatesTags: ['User'],
    }),

    // ============ TEAM MANAGEMENT ============

    /**
     * Отримання команди воронки
     */
    getTeamMembers: builder.query<TeamMember[], string>({
      query: (funnelId) => `/auth/team/${funnelId}`,
      providesTags: ['Team'],
    }),

    /**
     * Запрошення користувача в команду
     */
    inviteTeamMember: builder.mutation<Invitation, { funnelId: string; email: string; role: string }>({
      query: ({ funnelId, email, role }) => ({
        url: `/auth/team/${funnelId}/invite`,
        method: 'POST',
        body: { email, role },
      }),
      invalidatesTags: ['Team', 'Invitation'],
    }),

    /**
     * Видалення користувача з команди
     */
    removeTeamMember: builder.mutation<void, { funnelId: string; userId: string }>({
      query: ({ funnelId, userId }) => ({
        url: `/auth/team/${funnelId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Team'],
    }),

    /**
     * Оновлення ролі користувача
     */
    updateTeamMemberRole: builder.mutation<TeamMember, { funnelId: string; userId: string; role: string }>({
      query: ({ funnelId, userId, role }) => ({
        url: `/auth/team/${funnelId}/members/${userId}/role`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: ['Team'],
    }),

    /**
     * Отримання запрошень
     */
    getInvitations: builder.query<Invitation[], void>({
      query: () => '/auth/invitations',
      providesTags: ['Invitation'],
    }),

    /**
     * Прийняття запрошення
     */
    acceptInvitation: builder.mutation<void, string>({
      query: (invitationId) => ({
        url: `/auth/invitations/${invitationId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['Invitation', 'Team'],
    }),

    /**
     * Відхилення запрошення
     */
    declineInvitation: builder.mutation<void, string>({
      query: (invitationId) => ({
        url: `/auth/invitations/${invitationId}/decline`,
        method: 'POST',
      }),
      invalidatesTags: ['Invitation'],
    }),

    // ============ SOCIAL AUTH ============

    /**
     * Вхід через Google
     */
    signInWithGoogle: builder.mutation<AuthResponse, { credential: string }>({
      query: ({ credential }) => ({
        url: '/auth/google',
        method: 'POST',
        body: { credential },
      }),
      transformResponse: (response: AuthResponse) => {
        localStorage.setItem('starway_auth_token', response.tokens.accessToken);
        console.log('✅ [Auth] Google sign in:', response.user.email);
        return response;
      },
      invalidatesTags: ['User'],
    }),

    // ============ ACCOUNT MANAGEMENT ============

    /**
     * Деактивація акаунту
     */
    deactivateAccount: builder.mutation<void, { password: string }>({
      query: ({ password }) => ({
        url: '/auth/deactivate',
        method: 'POST',
        body: { password },
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * Видалення акаунту
     */
    deleteAccount: builder.mutation<void, { password: string; reason?: string }>({
      query: ({ password, reason }) => ({
        url: '/auth/delete',
        method: 'DELETE',
        body: { password, reason },
      }),
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          localStorage.removeItem('starway_auth_token');
          window.location.href = '/';
        } catch (error) {
          console.error('❌ [Auth] Delete account error:', error);
        }
      },
    }),
  }),
  
});


// ============ HOOKS ============

export const {
  // Authentication
  useSignUpMutation,
  useSignInMutation,
  useLogOutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useRefreshTokenMutation,
  
  // Profile
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  
  // Password Reset
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
  
  // Email Verification
  useSendVerificationEmailMutation,
  useVerifyEmailMutation,
  
  // Team Management
  useGetTeamMembersQuery,
  useInviteTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useUpdateTeamMemberRoleMutation,
  useGetInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  
  // Social Auth
  useSignInWithGoogleMutation,
  
  // Account Management
  useDeactivateAccountMutation,
  useDeleteAccountMutation,
} = authApi;