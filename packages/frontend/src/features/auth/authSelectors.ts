// packages/frontend/src/store/auth/authSelectors.ts

import type { RootState } from '../store';

export const selectIsLoggedIn = (state: RootState) => {
  console.log('🔓 [authSelectors] selectIsLoggedIn:', state.auth.isLoggedIn);
  return state.auth.isLoggedIn;
};

export const selectUser = (state: RootState) => {
  console.log('👤 [authSelectors] selectUser:', state.auth.user);
  return state.auth.user;
};

export const selectIsRefreshing = (state: RootState) => {
  console.log('🔄 [authSelectors] selectIsRefreshing:', state.auth.isRefreshing);
  return state.auth.isRefreshing;
};

export const selectAuthError = (state: RootState) => {
  console.log('❌ [authSelectors] selectAuthError:', state.auth.error);
  return state.auth.error;
};

export const selectToken = (state: RootState) => {
  console.log('🔑 [authSelectors] selectToken:', state.auth.token ? 'TOKEN EXISTS' : 'NO TOKEN');
  return state.auth.token;
};