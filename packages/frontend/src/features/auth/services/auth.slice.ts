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
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
            console.log('✅ Auth credentials set:', action.payload.user.email);

      saveAuth(action.payload)
    },
    logout(state) {
      state.user = null
      state.accessToken = null
      clearAuth()
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
