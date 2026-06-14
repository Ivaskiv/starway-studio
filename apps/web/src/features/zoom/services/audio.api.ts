import { api } from '@/services/api'

export type CloudinaryAudioItem = {
  folder: string
  publicId: string
  assetId: string
  secureUrl: string
  fileName: string
  format: string | null
  bytes: number | null
  duration: number | null
  createdAt: string | null
}

export type AudioListResponse = {
  ok: boolean
  month: string | null
  count: number
  items: CloudinaryAudioItem[]
}

export const audioApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAudioList: build.query<AudioListResponse, string>({
      query: (month) => `/audio/list?month=${encodeURIComponent(month)}`,
      providesTags: ['ZoomSession'],
    }),
  }),
  overrideExisting: false,
})

export const { useGetAudioListQuery } = audioApi
