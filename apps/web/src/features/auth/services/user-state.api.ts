import { api } from '@/services/api'

export type UserState =
  | 'NEW'
  | 'TELEGRAM_LINKED'
  | 'TRIAL_DAY_1'
  | 'TRIAL_DAY_2'
  | 'TRIAL_DAY_3'
  | 'TRIAL_DAY_4'
  | 'TRIAL_DAY_5'
  | 'TRIAL_DAY_6'
  | 'TRIAL_DAY_7'
  | 'PAID_ONBOARDING'
  | 'ACTIVE'
  | 'INACTIVE'

export type UserStep =
  | 'NONE'
  | 'LINK_TELEGRAM'
  | 'START_FLOW'
  | 'WHEEL'
  | 'DAILY_MORNING'
  | 'DAILY_EVENING'
  | 'TRIAL_MIRROR'
  | 'TRIAL_FINAL'
  | 'PAYWALL'

export interface UserStateResponse {
  state: UserState
  step: UserStep
}

export const userStateApi = api.injectEndpoints({
  endpoints: builder => ({
    getUserState: builder.query<UserStateResponse, void>({
      query: () => '/user/state',
      providesTags: ['MentorAccess'],
    }),
    startFlow: builder.mutation<UserStateResponse, void>({
      query: () => ({
        url: '/start-flow',
        method: 'POST',
      }),
      invalidatesTags: ['MentorAccess'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetUserStateQuery,
  useStartFlowMutation,
} = userStateApi
