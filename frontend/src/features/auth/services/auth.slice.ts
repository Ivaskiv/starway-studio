import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/shared/types/user.types'
import { saveToken, removeToken, getToken } from '@/services/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: getToken(),
  isAuthenticated: false,
  isLoading: true,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.isAuthenticated = true
      state.isLoading = false
      saveToken(action.payload.accessToken)
      console.log('✅ [Auth] Credentials set:', action.payload.user.email)
    },
    updateUser: (state, action: PayloadAction<User>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        console.log('✅ [Auth] User updated:', action.payload.email)
      }
    },
    clearAuth: (state) => {
      state.user = null
      state.accessToken = null
      state.isAuthenticated = false
      state.isLoading = false
      removeToken()
      console.log('🔓 [Auth] Cleared')
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    hydrateAuth: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user
      state.isAuthenticated = true
      state.isLoading = false
      console.log('💧 [Auth] Hydrated:', action.payload.user.email)
    },
  },
})

export const { setCredentials, updateUser, clearAuth, setLoading, hydrateAuth } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken
