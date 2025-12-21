// src/features/auth/types.ts
  id: string
  name: string
  email?: string
  token?: string
  demo?: boolean
}

export interface AuthState {
  isAuthenticated: boolean
}

export interface LoginPayload {
  token: string
}
