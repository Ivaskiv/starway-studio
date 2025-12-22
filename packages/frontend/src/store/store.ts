import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'

import funnelReducer from '../features/funnel/funnelSlice'
import authReducer from '../features/auth/authSlice'
// import demoReducer from '@/features/demo/demoSlice'
// import { uiReducer } from '@/features/ui/uiSlice'

import {
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from 'react-redux'
import { uiReducer } from '@frontend/features/ui/uiSlice'

// ───────────────────────────────────────────────
// Root reducer
// ───────────────────────────────────────────────

const rootReducer = combineReducers({
  funnel: funnelReducer,
  auth: authReducer,
  ui: uiReducer,
  demo: demoReducer,
})

export type RootState = ReturnType<typeof rootReducer>

// ───────────────────────────────────────────────
// Persist config
// ───────────────────────────────────────────────

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['funnel', 'auth'],
}

const persistedReducer = persistReducer<RootState>(
  persistConfig,
  rootReducer
)

// ───────────────────────────────────────────────
// Store
// ───────────────────────────────────────────────

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.MODE === 'development',
})

export const persistor = persistStore(store)

// ───────────────────────────────────────────────
// Typed hooks
// ───────────────────────────────────────────────

export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
