// packages/frontend/src/store/funnels/funnelsSelectors.ts

import type { RootState } from '../store';

export const selectFunnels = (state: RootState) => state.funnels.funnels;
export const selectCurrentFunnel = (state: RootState) => state.funnels.currentFunnel;
export const selectFunnelsLoading = (state: RootState) => state.funnels.loading;
export const selectFunnelsError = (state: RootState) => state.funnels.error;