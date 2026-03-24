// frontend/src/app/store/store.ts
// ВИПРАВЛЕНО: zoomApi більше не окремий createApi — він api.injectEndpoints
// Тому zoomApi.reducer і zoomApi.middleware — дублікати api → видалено
import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import authReducer     from '@/features/auth/services/auth.slice'
import { microTaskApi } from '@/features/microTask/services/microTask.api'
import { api }         from '@/services/api'
import themeReducer    from '@/theme/theme.slice'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,   // єдиний RTK Query reducer
    [microTaskApi.reducerPath]: microTaskApi.reducer,
    auth:     authReducer,
    theme:    themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(api.middleware).concat(microTaskApi.middleware),        // єдиний RTK Query middleware
  devTools: import.meta.env.NODE_ENV !== 'production',
})

setupListeners(store.dispatch)

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
