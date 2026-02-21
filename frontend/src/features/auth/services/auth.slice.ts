// frontend/src/features/auth/services/auth.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getToken, removeToken, saveToken } from '@/features/auth/services/token';
import { AuthState } from '@/features/auth/types/auth.types';
import type { User, UserRole } from '@/features/user/types/user.types';

const initialState: AuthState = {
  user: null,
  role: null,
  accessToken: getToken(),
  status: getToken() ? 'loading' : 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Повна установка після логіну / реєстрації
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
      state.role = action.payload.user.role;
      saveToken(action.payload.accessToken);
    },

    // Оновлення даних користувача (наприклад після /me або редагування профілю)
    updateUser: (state, action: PayloadAction<User>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      } else {
        state.user = action.payload;
      }
      state.role = action.payload.role;
      state.status = 'authenticated';
    },

    // Зміна ролі (рідко використовується, але може бути корисно)
    setUserRole: (state, action: PayloadAction<UserRole>) => {
      if (state.user) {
        state.user.role = action.payload;
      }
      state.role = action.payload;
    },

    // Початок завантаження (наприклад під час запиту /me)
    setLoading: (state) => {
      state.status = 'loading';
    },

    // Очистка авторизації (вихід)
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.role = null;
      state.status = 'unauthenticated';
      removeToken();
    },

    // Відновлення тільки токена (для AuthRestore)
    restoreToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      state.status = 'loading';
    },
  },
});

export const {
  setCredentials,
  updateUser,
  setUserRole,
  setLoading,
  clearAuth,
  restoreToken,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
export const selectAuthStatus = (state: { auth: AuthState }) => state.auth.status;
export const selectUserRole = (state: { auth: AuthState }) => state.auth.role;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'authenticated';
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.status === 'loading';
export const selectIsUnauthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'unauthenticated';