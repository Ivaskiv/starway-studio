// packages/frontend/src/features/auth/services/auth.slice.ts

import { clearAuth, saveAuth } from '@/features/auth/services/auth.persist'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { User } from '../../../types/user.types'

interface AuthState {
  accessToken: string | null
  user: User | null
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; user: User }>
    ) {
      state.accessToken = action.payload.accessToken
      state.user = action.payload.user
      saveAuth(action.payload)
    },
    logout(state) {
      state.accessToken = null
      state.user = null
      clearAuth()
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
