// frontend/src/store/hooks.ts

import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Типізований dispatch
export const useAppDispatch: () => AppDispatch = useDispatch;

// Типізований selector
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;