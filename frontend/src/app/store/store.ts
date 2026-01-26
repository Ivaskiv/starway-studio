// frontend/src/app/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { api } from '../../services/api';
import uiReducer from './uiSlice';
import authReducer from '../../features/auth/services/auth.slice';
import aiMentorReducer from '../../templates/ai-mentor/services/aiMentorSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    ui: uiReducer,
    auth: authReducer,
    aiMentor: aiMentorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(api.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;