// packages/frontend/src/features/auth/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User, AuthState, LoginPayload } from './types'
import { DEMO_STUDENT } from '@/features/demo/demoUsers'

const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false
}

export const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      state.user = { ...action.payload.user, token: action.payload.token }
      state.isAuthenticated = true
    },
    loginDemo: (state) => {
        state.user = {
        id: DEMO_STUDENT.id,
        name: DEMO_STUDENT.name,
        email: DEMO_STUDENT.email,
        token: 'demo-real-token',
        demo: true
      }
      state.isAuthenticated = true
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) Object.assign(state.user, action.payload)
    }
  }
})

export const { login, logout, updateUser, loginDemo } = authSlice.actions
export default authSlice.reducer
