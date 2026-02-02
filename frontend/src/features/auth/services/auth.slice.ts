// frontend/src/features/auth/services/auth.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getToken, removeToken, saveToken } from '@/services/api';
import type { User } from '@/shared/types/user.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
}

const initialState: AuthState = {
  user: null,
  accessToken: getToken() || null, // завантажуємо з localStorage при старті
  status: getToken() ? 'authenticated' : 'unauthenticated', // одразу визначаємо статус
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Установка повних credentials (логін/реєстрація)
    setCredentials: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
      saveToken(action.payload.accessToken);
    },

    // Оновлення тільки користувача (наприклад після getMe)
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      // статус не змінюється, бо користувач уже авторизований
    },

    // Початок завантаження (якщо потрібен loading-стан)
    setLoading: (state) => {
      state.status = 'loading';
    },

    // Повне очищення авторизації
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.status = 'unauthenticated';
      removeToken();
    },
  },
});

// Селектори (оптимізовано)
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
export const selectAuthStatus = (state: { auth: AuthState }) => state.auth.status;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'authenticated';
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.status === 'loading';

export const { setCredentials, updateUser, setLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;