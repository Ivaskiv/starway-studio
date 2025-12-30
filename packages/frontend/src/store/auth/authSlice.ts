// packages/frontend/src/store/auth/authSlice.ts

import { createSlice } from '@reduxjs/toolkit';
import { signUp, signIn, logOut, refreshUser } from './authOperations';
import type { User } from '../../../../shared/src/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoggedIn: false,
  isRefreshing: false,
  error: null,
};

console.log('🎯 [authSlice] Initial state created:', initialState);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      console.log('🧹 [authSlice] Clearing error');
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign Up
      .addCase(signUp.pending, (state) => {
        console.log('⏳ [authSlice] Sign up pending...');
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        console.log('✅ [authSlice] Sign up fulfilled:', action.payload);
        state.user = action.payload.user;
        state.token = action.payload.tokens.accessToken;
        state.isLoggedIn = true;
        state.error = null;
      })
      .addCase(signUp.rejected, (state, action) => {
        console.error('❌ [authSlice] Sign up rejected:', action.payload);
        state.error = action.payload as string;
      })

      // Sign In
      .addCase(signIn.pending, (state) => {
        console.log('⏳ [authSlice] Sign in pending...');
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        console.log('✅ [authSlice] Sign in fulfilled:', action.payload);
        state.user = action.payload.user;
        state.token = action.payload.tokens.accessToken;
        state.isLoggedIn = true;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        console.error('❌ [authSlice] Sign in rejected:', action.payload);
        state.error = action.payload as string;
      })

      // Log Out
      .addCase(logOut.pending, (state) => {
        console.log('⏳ [authSlice] Log out pending...');
      })
      .addCase(logOut.fulfilled, (state) => {
        console.log('✅ [authSlice] Log out fulfilled');
        state.user = null;
        state.token = null;
        state.isLoggedIn = false;
        state.error = null;
      })
      .addCase(logOut.rejected, (state, action) => {
        console.error('❌ [authSlice] Log out rejected:', action.payload);
      })

      // Refresh User
      .addCase(refreshUser.pending, (state) => {
        console.log('⏳ [authSlice] Refresh user pending...');
        state.isRefreshing = true;
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        console.log('✅ [authSlice] Refresh user fulfilled:', action.payload);
        state.user = action.payload;
        state.isLoggedIn = true;
        state.isRefreshing = false;
        state.error = null;
      })
      .addCase(refreshUser.rejected, (state, action) => {
        console.error('❌ [authSlice] Refresh user rejected:', action.payload);
        state.isRefreshing = false;
        state.isLoggedIn = false;
        state.token = null;
        state.user = null;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = authSlice.actions;
export const authReducer = authSlice.reducer;