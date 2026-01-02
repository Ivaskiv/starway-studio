// packages/frontend/src/store/funnels/funnelsSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Funnel } from '@starway/shared';
import { 
  fetchFunnels, 
  fetchFunnelById, 
  createFunnel, 
  updateFunnel, 
  deleteFunnel 
} from './funnelsOperations';

interface FunnelsState {
  funnels: Funnel[];
  currentFunnel: Funnel | null;
  loading: boolean;
  error: string | null;
}

const initialState: FunnelsState = {
  funnels: [],
  currentFunnel: null,
  loading: false,
  error: null,
};

const funnelsSlice = createSlice({
  name: 'funnels',
  initialState,
  reducers: {
    clearCurrentFunnel: (state) => {
      state.currentFunnel = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all funnels
      .addCase(fetchFunnels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFunnels.fulfilled, (state, action) => {
        state.loading = false;
        state.funnels = action.payload;
      })
      .addCase(fetchFunnels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch funnel by ID
      .addCase(fetchFunnelById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFunnelById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentFunnel = action.payload;
      })
      .addCase(fetchFunnelById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create funnel
      .addCase(createFunnel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFunnel.fulfilled, (state, action) => {
        state.loading = false;
        state.funnels.unshift(action.payload);
      })
      .addCase(createFunnel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update funnel
      .addCase(updateFunnel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFunnel.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.funnels.findIndex(f => f.id === action.payload.id);
        if (index !== -1) {
          state.funnels[index] = action.payload;
        }
        if (state.currentFunnel?.id === action.payload.id) {
          state.currentFunnel = action.payload;
        }
      })
      .addCase(updateFunnel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete funnel
      .addCase(deleteFunnel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFunnel.fulfilled, (state, action) => {
        state.loading = false;
        state.funnels = state.funnels.filter(f => f.id !== action.payload);
        if (state.currentFunnel?.id === action.payload) {
          state.currentFunnel = null;
        }
      })
      .addCase(deleteFunnel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentFunnel, clearError } = funnelsSlice.actions;
export default funnelsSlice.reducer;