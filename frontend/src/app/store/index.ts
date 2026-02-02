// frontend/src/app/store/index.ts
// ✅ ЕКСПОРТ HOOKS

import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export { store } from './store';
export type { RootState, AppDispatch };

// Типізовані hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;