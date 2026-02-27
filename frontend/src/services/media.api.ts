// frontend/src/services/media.api.ts
import { useEffect, useState } from 'react';
import { api } from './api';

export interface Media {
  id: string;
  userId: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'archive';
  name: string;
  url: string;
  thumbnailUrl?: string;
  size: number; // bytes
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number; // seconds for video/audio
  folder?: string;
  tags?: string[];
  is_public: boolean;
  createdAt: string;
}

export interface UploadProgress {
  id: string;
  progress: number;
  status: 'uploading' | 'processing' | 'COMPLETED' | 'failed';
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  filesCount: number;
  size: number;
  createdAt: string;
}

export const mediaApi = api.injectEndpoints({
  endpoints: builder => ({
    // Media Files
    getMediaFiles: builder.query<Media[], { folder?: string; type?: string; limit?: number }>({
      query: ({ folder, type, limit = 100 }) => ({
        url: '/media/files',
        params: { folder, type, limit },
      }),
      providesTags: ['Media'],
    }),

    uploadMedia: builder.mutation<Media, FormData>({
      query: formData => ({
        url: '/media/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Media'],
    }),

    updateMedia: builder.mutation<Media, { id: string; data: Partial<Media> }>({
      query: ({ id, data }) => ({
        url: `/media/files/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Media'],
    }),

    deleteMedia: builder.mutation<void, string>({
      query: id => ({
        url: `/media/files/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Media'],
    }),

    bulkDeleteMedia: builder.mutation<void, string[]>({
      query: ids => ({
        url: '/media/files/bulk-delete',
        method: 'DELETE',
        body: { ids },
      }),
      invalidatesTags: ['Media'],
    }),

    // Folders
    getFolders: builder.query<Folder[], { parentId?: string }>({
      query: ({ parentId }) => ({
        url: '/media/folders',
        params: { parentId },
      }),
      providesTags: ['Media'],
    }),

    createFolder: builder.mutation<Folder, { name: string; parentId?: string }>({
      query: ({ name, parentId }) => ({
        url: '/media/folders',
        method: 'POST',
        body: { name, parentId },
      }),
      invalidatesTags: ['Media'],
    }),

    updateFolder: builder.mutation<Folder, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: `/media/folders/${id}`,
        method: 'PUT',
        body: { name },
      }),
      invalidatesTags: ['Media'],
    }),

    deleteFolder: builder.mutation<void, string>({
      query: id => ({
        url: `/media/folders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Media'],
    }),

    // Avatars
    uploadAvatar: builder.mutation<{ url: string }, FormData>({
      query: formData => ({
        url: '/media/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Avatar', 'User'],
    }),

    deleteAvatar: builder.mutation<void, void>({
      query: () => ({
        url: '/media/avatar',
        method: 'DELETE',
      }),
      invalidatesTags: ['Avatar', 'User'],
    }),

    // Utils
    getStorageStats: builder.query<{ used: number; limit: number; percentage: number }, void>({
      query: () => '/media/stats',
    }),
  }),
});

export const {
  useGetMediaFilesQuery,
  useUploadMediaMutation,
  useUpdateMediaMutation,
  useDeleteMediaMutation,
  useBulkDeleteMediaMutation,
  useGetFoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  useGetStorageStatsQuery,
} = mediaApi;

// Re-exported helper hook for responsive layout; placed here for shared usage.
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener
      ? media.addEventListener('change', handleChange)
      : media.addListener(handleChange);
    setMatches(media.matches);
    return () => {
      media.removeEventListener
        ? media.removeEventListener('change', handleChange)
        : media.removeListener(handleChange);
    };
  }, [query]);

  return matches;
}
