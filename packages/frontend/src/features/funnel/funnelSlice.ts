// packages/frontend/src/features/funnel/funnelSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Block } from '@starway/shared'
import { FunnelDraft } from '@starway/shared/src/types/ai'


interface FunnelState {
  draft: FunnelDraft
  availableGenerations: number
}

const initialFunnelState: FunnelState = {
  draft: {
    name: '',
    audience: '',
    niche: '',
    productType: undefined,
    structure: '[]',
  },
  availableGenerations: 3
}

export const funnelSlice = createSlice({
  name: 'funnel',
  initialState: initialFunnelState,
  reducers: {
    setDraft: (state, action: PayloadAction<Partial<typeof initialFunnelState>>) => {
  Object.assign(state, action.payload)
},
    setAvailableGenerations: (state, action: PayloadAction<number>) => {
      state.availableGenerations = action.payload
    },
    useGeneration: (state) => {
      state.availableGenerations = Math.max(0, state.availableGenerations - 1)
    },
    setStructure: (state, action: PayloadAction<Block[]>) => {
      state.draft.structure = JSON.stringify(action.payload)
    }

  }
})

export const {
  setDraft,
  setAvailableGenerations,
  useGeneration,
  setStructure
} = funnelSlice.actions

// ✅ СЕЛЕКТОРИ (ОСЬ ЧОГО НЕ ВИСТАЧАЛО)
export const selectDraft = (state: RootState) => state.funnel.draft
export const selectAvailableGenerations = (state: RootState) =>
  state.funnel.availableGenerations

export default funnelSlice.reducer
