// packages/frontend/src/app/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { api } from '@/services/api';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    // ui: uiReducer, // Якщо потрібен локальний UI state
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;