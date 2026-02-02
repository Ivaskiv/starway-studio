// frontend/src/features/auth/services/auth.slice.ts
import { getToken, removeToken, saveToken } from '@/services/api';
import type { User } from '@/shared/types/user.types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
}

const initialState: AuthState = {
  user: null,
  accessToken: getToken(),
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
      saveToken(action.payload.accessToken);
    },
    hydrateAuth: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.status = 'authenticated';
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setLoading: state => {
      state.status = 'loading';
    },
    clearAuth: state => {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
      removeToken();
    },
  },
});

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
export const selectAuthStatus = (state: { auth: AuthState }) => state.auth.status;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'authenticated';
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.status === 'loading';

export const { setCredentials, hydrateAuth, updateUser, setLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
