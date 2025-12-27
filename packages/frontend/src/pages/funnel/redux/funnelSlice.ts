// packages/frontend/src/store/funnelSlice.ts

// import { createSlice, PayloadAction } from '@reduxjs/toolkit'
// import type { RootState } from './store'
// import type { Block, FunnelDraft } from '../types'

// interface FunnelState {
//   draft: FunnelDraft
//   availableGenerations: number
// }

// const initialDraft: FunnelDraft = {
//   name: '',
//   audience: '',
//   niche: '',
//   productType: null,
//   blocks: [] 
// }

// const initialState: FunnelState = {
//   draft: initialDraft,
//   availableGenerations: 3
// }

// const funnelSlice = createSlice({
//   name: 'funnel',
//   initialState,
//   reducers: {
//     setDraft: (state, action: PayloadAction<Partial<FunnelDraft>>) => {
//       state.draft = { ...state.draft, ...action.payload }
//     },

//     setBlocks: (state, action: PayloadAction<Block[]>) => {
//       state.draft.blocks = action.payload
//     },

//     addBlock: (state, action: PayloadAction<Block>) => {
//       state.draft.blocks.push(action.payload)
//     },

//     updateBlock: (state, action: PayloadAction<{ id: string; data: Partial<Block> }>) => {
//       const index = state.draft.blocks.findIndex(b => b.id === action.payload.id)
//       if (index !== -1) {
//         state.draft.blocks[index] = { ...state.draft.blocks[index], ...action.payload.data }
//       }
//     },

//     removeBlock: (state, action: PayloadAction<string>) => {
//       state.draft.blocks = state.draft.blocks.filter(b => b.id !== action.payload)
//     },

//     setAvailableGenerations: (state, action: PayloadAction<number>) => {
//       state.availableGenerations = action.payload
//     },

//     useGeneration: (state) => {
//       state.availableGenerations = Math.max(0, state.availableGenerations - 1)
//     },

//     resetDraft: (state) => {
//       state.draft = initialDraft
//       state.availableGenerations = 3
//     }
//   }
// })

// export const {
//   setDraft,
//   setBlocks,
//   addBlock,
//   updateBlock,
//   removeBlock,
//   setAvailableGenerations,
//   useGeneration,
//   resetDraft
// } = funnelSlice.actions

// export const selectDraft = (state: RootState) => state.funnel.draft
// export const selectBlocks = (state: RootState) => state.funnel.draft.blocks
// export const selectAvailableGenerations = (state: RootState) => state.funnel.availableGenerations

// export default funnelSlice.reducer