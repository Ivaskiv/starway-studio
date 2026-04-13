// frontend/src/features/auth/services/auth.slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, UserRole } from '@/features/user/types/user.types';
import type { AuthState } from '@/features/auth/types/auth.types';
import { getStoredUser, getToken, saveStoredUser, saveToken, removeToken } from './token';

const token = getToken();
const storedUser = getStoredUser<User>();
const initialState: AuthState = {
  user: storedUser,
  role: storedUser?.role ?? null,
  accessToken: token,
  status: token && storedUser ? 'authenticated' : token ? 'loading' : 'guest',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Після логіну / restore — повний об'єкт
    setCredentials: (state, { payload }: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user        = payload.user;
      state.role        = payload.user.role;
      state.accessToken = payload.accessToken;
      state.status      = 'authenticated';
      saveToken(payload.accessToken);
      saveStoredUser(payload.user);
    },

    // Оновлення user без зміни токена (getMe, profile edit)
    updateUser: (state, { payload }: PayloadAction<User>) => {
      state.user   = { ...state.user, ...payload };
      state.role   = payload.role ?? state.role;
      state.status = 'authenticated';
      if (state.user) saveStoredUser(state.user);
    },

    // ✅ Оновлення тільки settings — НЕ торкається role/id/email
    // Використовувати після PATCH /api/auth/settings
    updateUserSettings: (
      state,
      { payload }: PayloadAction<{
        accentColor?: string
        language?: string
        theme?: string
        notifications?: {
          enabled?: boolean
          morningTime?: string | null
          eveningTime?: string | null
          types?: {
            dailyMorning?: boolean
            dailyEvening?: boolean
            weeklySummary?: boolean
            streakAlert?: boolean
            streakBroken?: boolean
            levelUp?: boolean
            subscription?: boolean
            aiReminders?: boolean
          }
        }
      }>,
    ) => {
      if (!state.user) return;
      state.user.settings = { ...state.user?.settings, ...payload };
      saveStoredUser(state.user);
    },

    setUserRole: (state, { payload }: PayloadAction<UserRole>) => {
      if (state.user) state.user.role = payload;
      state.role = payload;
      if (state.user) saveStoredUser(state.user);
    },

    setLoading: (state) => { state.status = 'loading'; },

    clearAuth: (state) => {
      state.user        = null;
      state.role        = null;
      state.accessToken = null;
      state.status      = 'guest';
      removeToken();
    },

    restoreToken: (state, { payload }: PayloadAction<string>) => {
      state.accessToken = payload;
      state.status      = 'loading';
    },
  },
});

export const {
  setCredentials,
  updateUser,
  updateUserSettings,
  setUserRole,
  setLoading,
  clearAuth,
  restoreToken,
} = authSlice.actions;

export default authSlice.reducer;

// ── Selectors ──────────────────────────────────────────────────────────────────
export const selectCurrentUser       = (s: { auth: AuthState }) => s.auth.user;
export const selectAccessToken       = (s: { auth: AuthState }) => s.auth.accessToken;
export const selectAuthStatus        = (s: { auth: AuthState }) => s.auth.status;
export const selectUserRole          = (s: { auth: AuthState }) => s.auth.role;
export const selectIsAuthenticated   = (s: { auth: AuthState }) => s.auth.status === 'authenticated';
export const selectIsLoading         = (s: { auth: AuthState }) => s.auth.status === 'loading';
export const selectIsGuest           = (s: { auth: AuthState }) => s.auth.status === 'guest';
export const selectIsUnauthenticated = selectIsGuest;
