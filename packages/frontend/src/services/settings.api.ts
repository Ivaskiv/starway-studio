// packages/frontend/src/services/settings.api.ts
import { api } from './api';

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'uk' | 'en' | 'ru';
  notifications: {
    email: boolean;
    push: boolean;
    telegram: boolean;
    achievements: boolean;
    updates: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showProgress: boolean;
    showAchievements: boolean;
  };
  preferences: {
    autoplay: boolean;
    quality: 'auto' | '720p' | '1080p';
    speed: number;
  };
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  isDefault: boolean;
  isCustom: boolean;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category: 'education' | 'marketing' | 'sales' | 'onboarding';
  thumbnail?: string;
  structure: any;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
}

export interface Blueprint {
  id: string;
  name: string;
  description?: string;
  industry: string;
  funnelTemplate: any;
  productTemplate: any;
  price?: number;
  isPremium: boolean;
  rating?: number;
  reviews?: number;
  createdAt: string;
}

export interface WhiteLabelConfig {
  id: string;
  brandName: string;
  logo?: string;
  favicon?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  domain?: string;
  customCSS?: string;
  footerText?: string;
  supportEmail?: string;
  isActive: boolean;
}

export const settingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // User Settings
    getUserSettings: builder.query<UserSettings, void>({
      query: () => '/settings/user',
      providesTags: ['Setting'],
    }),

    updateUserSettings: builder.mutation<UserSettings, Partial<UserSettings>>({
      query: (data) => ({
        url: '/settings/user',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Setting'],
    }),

    // Themes
    getThemes: builder.query<Theme[], void>({
      query: () => '/settings/themes',
      providesTags: ['Theme'],
    }),

    createTheme: builder.mutation<Theme, Partial<Theme>>({
      query: (data) => ({
        url: '/settings/themes',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Theme'],
    }),

    updateTheme: builder.mutation<Theme, { id: string; data: Partial<Theme> }>({
      query: ({ id, data }) => ({
        url: `/settings/themes/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Theme'],
    }),

    deleteTheme: builder.mutation<void, string>({
      query: (id) => ({
        url: `/settings/themes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Theme'],
    }),

    // Templates
    getTemplates: builder.query<Template[], { category?: string }>({
      query: ({ category }) => ({
        url: '/settings/templates',
        params: { category },
      }),
      providesTags: ['Template'],
    }),

    createTemplate: builder.mutation<Template, Partial<Template>>({
      query: (data) => ({
        url: '/settings/templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Template'],
    }),

    useTemplate: builder.mutation<{ funnelId: string }, string>({
      query: (templateId) => ({
        url: `/settings/templates/${templateId}/use`,
        method: 'POST',
      }),
      invalidatesTags: ['Funnel'],
    }),

    deleteTemplate: builder.mutation<void, string>({
      query: (id) => ({
        url: `/settings/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Template'],
    }),

    // Blueprints
    getBlueprints: builder.query<Blueprint[], { industry?: string }>({
      query: ({ industry }) => ({
        url: '/settings/blueprints',
        params: { industry },
      }),
      providesTags: ['Blueprint'],
    }),

    getBlueprintById: builder.query<Blueprint, string>({
      query: (id) => `/settings/blueprints/${id}`,
      providesTags: (result, error, id) => [{ type: 'Blueprint', id }],
    }),

    purchaseBlueprint: builder.mutation<{ funnelId: string; productId: string }, string>({
      query: (blueprintId) => ({
        url: `/settings/blueprints/${blueprintId}/purchase`,
        method: 'POST',
      }),
      invalidatesTags: ['Funnel', 'Product', 'Transaction'],
    }),

    // White Label
    getWhiteLabelConfig: builder.query<WhiteLabelConfig, void>({
      query: () => '/settings/white-label',
      providesTags: ['WhiteLabel'],
    }),

    updateWhiteLabelConfig: builder.mutation<WhiteLabelConfig, Partial<WhiteLabelConfig>>({
      query: (data) => ({
        url: '/settings/white-label',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['WhiteLabel'],
    }),

    uploadWhiteLabelAsset: builder.mutation<{ url: string }, { type: 'logo' | 'favicon'; file: FormData }>({
      query: ({ type, file }) => ({
        url: `/settings/white-label/${type}`,
        method: 'POST',
        body: file,
      }),
      invalidatesTags: ['WhiteLabel'],
    }),
  }),
});

export const {
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  useGetThemesQuery,
  useCreateThemeMutation,
  useUpdateThemeMutation,
  useDeleteThemeMutation,
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useUseTemplateMutation,
  useDeleteTemplateMutation,
  useGetBlueprintsQuery,
  useGetBlueprintByIdQuery,
  usePurchaseBlueprintMutation,
  useGetWhiteLabelConfigQuery,
  useUpdateWhiteLabelConfigMutation,
  useUploadWhiteLabelAssetMutation,
} = settingsApi;